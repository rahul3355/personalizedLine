import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";
import { ChevronLeft, ChevronRight, CreditCard, Calendar, AlertTriangle, X, Check } from "lucide-react";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

interface Transaction {
  id: string | number;
  change: number;
  amount: number;
  reason: string;
  ts: string;
}

interface SubscriptionInfo {
  plan_type: string;
  subscription_status: string;
  cancel_at_period_end: boolean;
  current_period_end: number | null;
  subscription_id?: string;
  stripe_price_id?: string;
}

export default function AccountPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Subscription management state
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    fetchLedger();
    fetchSubscriptionInfo();
  }, [session, offset]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/account/ledger?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch ledger");

      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/subscription/info`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSubscriptionInfo(data);
      }
    } catch (err) {
      console.error("Failed to fetch subscription info:", err);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    setShowCancelModal(false);

    try {
      const res = await fetch(`${API_URL}/subscription/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      // Always refresh the page after attempting cancellation
      window.location.reload();
    } catch (err) {
      console.error("Error canceling subscription:", err);
      window.location.reload();
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/subscription/reactivate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      // Refresh page to show updated status
      window.location.reload();
    } catch (err) {
      console.error("Error reactivating subscription:", err);
      window.location.reload();
    }
  };

  const handleChangePlan = async (newPlan: string) => {
    if (!session || !userInfo?.id) return;

    const currentPlan = userInfo?.plan_type || "free";

    // Check if user is on annual plan - silently return
    if (currentPlan.includes("annual")) {
      return;
    }

    setActionLoading(true);
    setShowPlanModal(false);

    try {
      // Create checkout session for the new plan
      const res = await fetch(`${API_URL}/create_checkout_session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: newPlan,
          addon: false,
          quantity: 1,
          user_id: userInfo.id,
        }),
      });

      const data = await res.json();

      if (data.id) {
        // Redirect to Stripe checkout
        const stripe = await stripePromise;
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: data.id });
        }
      }
    } catch (err) {
      console.error("Error upgrading plan:", err);
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDescription = (reason: string, change: number): string => {
    const lower = reason.toLowerCase();

    // Remove job UUIDs (pattern: job-XXXXX or similar)
    let cleaned = reason.replace(/job-[a-zA-Z0-9-]+/gi, "").trim();

    // Format standard billing statements
    if (lower.includes("deduction") && lower.includes("monthly")) {
      return "Monthly credits deducted for job processing";
    }
    if (lower.includes("deduction") && lower.includes("addon")) {
      return "Add-on credits deducted for job processing";
    }
    if (lower.includes("deduction")) {
      return "Credits deducted for job processing";
    }
    if (lower.includes("renewal") || lower.includes("subscription_cycle")) {
      return "Monthly subscription renewal";
    }
    if (lower.includes("purchase") && lower.includes("addon")) {
      return "Add-on credits purchase";
    }
    if (lower.includes("purchase") || lower.includes("checkout")) {
      return "Subscription plan purchase";
    }
    if (lower.includes("refund")) {
      return "Refund processed";
    }
    if (lower.includes("upgrade")) {
      return "Plan upgrade";
    }
    if (lower.includes("downgrade")) {
      return "Plan downgrade";
    }

    // Capitalize first letter if it's a custom reason
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const monthlyCredits = userInfo?.credits_remaining ?? 0;
  const addonCredits = userInfo?.addon_credits ?? 0;
  const totalCredits = monthlyCredits + addonCredits;

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 animate-spin" />
          <p className="text-sm text-gray-500">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                Transactions
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Complete transaction history for your account
              </p>
            </div>

            {/* Credit Summary Cards */}
            <div className="flex gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 bg-gray-50 p-4 min-w-[140px]"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                  Total Credits
                </p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {totalCredits.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="border border-gray-200 bg-gray-50 p-4 min-w-[140px]"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                  Monthly
                </p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {monthlyCredits.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border border-gray-200 bg-gray-50 p-4 min-w-[140px]"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                  Add-ons
                </p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {addonCredits.toLocaleString()}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-gray-200 bg-gray-50">
            <div className="col-span-5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Description
            </div>
            <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Credits
            </div>
            <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Amount
            </div>
            <div className="col-span-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
              Date
            </div>
          </div>

          {/* Table Body */}
          <AnimatePresence mode="wait">
            {transactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-16 text-center border-b border-gray-100"
              >
                <p className="text-gray-400">No transactions found</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((txn, index) => {
                  const isPositive = txn.change > 0;
                  const description = formatDescription(txn.reason, txn.change);

                  return (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                    >
                      {/* Description */}
                      <div className="col-span-5 flex items-center">
                        <p className="text-sm text-gray-900 font-medium">
                          {description}
                        </p>
                      </div>

                      {/* Credits Change */}
                      <div className="col-span-2 flex items-center">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            isPositive ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {txn.change.toLocaleString()}
                        </span>
                      </div>

                      {/* USD Amount */}
                      <div className="col-span-2 flex items-center">
                        {txn.amount > 0 ? (
                          <span className="text-sm text-gray-700 tabular-nums font-medium">
                            ${txn.amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="col-span-3 flex items-center justify-end">
                        <div className="text-right">
                          <p className="text-sm text-gray-900 font-medium">
                            {formatDate(txn.ts)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatTime(txn.ts)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {offset + 1} to {Math.min(offset + limit, total)} of{" "}
                  {total} transactions
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="px-4 py-2 text-sm text-gray-700 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Subscription Management Section */}
        {subscriptionInfo && subscriptionInfo.plan_type !== "free" && subscriptionInfo.subscription_status === "active" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Subscription Management</h2>
              <p className="text-sm text-gray-500 mt-1">Manage your plan and billing settings</p>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Current Plan */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Current Plan</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5 capitalize">
                      {subscriptionInfo.plan_type}
                    </p>
                  </div>
                </div>

                {/* Next Billing Date */}
                {subscriptionInfo.current_period_end && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                        {subscriptionInfo.cancel_at_period_end ? "Cancels On" : "Renews On"}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 mt-0.5">
                        {new Date(subscriptionInfo.current_period_end * 1000).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5 capitalize">
                      {subscriptionInfo.cancel_at_period_end ? (
                        <span className="text-orange-600">Canceling</span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning if canceling */}
              {subscriptionInfo.cancel_at_period_end && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Subscription Scheduled for Cancellation</p>
                    <p className="text-sm text-orange-700 mt-1">
                      Your subscription will remain active until{" "}
                      {subscriptionInfo.current_period_end &&
                        new Date(subscriptionInfo.current_period_end * 1000).toLocaleDateString()}
                      . You won't be charged again.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-3">
                {subscriptionInfo.cancel_at_period_end ? (
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Reactivate Subscription"}
                  </button>
                ) : (
                  <>
                    {/* Show plan change button only for monthly plans */}
                    {!subscriptionInfo.plan_type.includes("annual") ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowPlanModal(true)}
                          className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 transition-colors"
                        >
                          Change Plan
                        </button>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                          Cancel Subscription
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                          Cancel Subscription
                        </button>
                        <p className="text-sm text-gray-600 italic">
                          To change your annual plan, please contact support at founders@personalizedline.com
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Cancel Subscription Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white max-w-lg w-full p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cancel Your Subscription</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your subscription will be canceled at the end of your billing period
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">What happens when you cancel:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>You keep access to your plan until your billing period ends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>All features and credits remain available until then</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>You won't be charged again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>You can reactivate anytime before it expires</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? "Processing..." : "Confirm Cancellation"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Plan Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upgrade Your Plan</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Select a higher tier to get more credits
                  </p>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Plan Options - Only show higher tier plans (upgrades only) */}
              <div className="space-y-3 mb-6">
                {["starter", "growth", "pro"].map((plan) => {
                  // Normalize current plan name: remove annual suffix and convert to lowercase
                  const currentPlan = (userInfo?.plan_type || "free")
                    .toLowerCase()
                    .replace("_annual", "");

                  const planDetails: Record<string, { credits: number; price: number }> = {
                    starter: { credits: 2000, price: 49 },
                    growth: { credits: 10000, price: 149 },
                    pro: { credits: 40000, price: 499 },
                  };

                  const details = planDetails[plan];
                  const currentPlanCredits = planDetails[currentPlan]?.credits || 0;

                  // Skip current plan and lower tier plans (only show upgrades)
                  if (plan === currentPlan || details.credits <= currentPlanCredits) {
                    return null;
                  }

                  return (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left p-4 border-2 transition-all ${
                        selectedPlan === plan
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-semibold text-gray-900 capitalize">{plan}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {details.credits.toLocaleString()} credits/month • ${details.price}/month
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Upgrade takes effect immediately with prorated billing
                          </p>
                        </div>

                        <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedPlan === plan ? "border-black bg-black" : "border-gray-300"
                        }`}>
                          {selectedPlan === plan && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedPlan && handleChangePlan(selectedPlan)}
                  disabled={!selectedPlan || actionLoading}
                  className="flex-1 px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? "Processing..." : "Upgrade Plan"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
