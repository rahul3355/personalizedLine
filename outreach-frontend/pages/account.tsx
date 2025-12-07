import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Calendar,
  AlertTriangle,
  X,
  Check,
  ArrowUpRight,
  Clock,
  Receipt,
  Download,
  FileText
} from "lucide-react";
import SendItFastSpinner from "../components/SendItFastSpinner";

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

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  pdf_url: string | null;
  hosted_url: string | null;
  date: number;
  description: string;
}

export default function AccountPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);

  // Subscription management state
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    fetchLedger();
    fetchSubscriptionInfo();
    fetchInvoices();
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

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const res = await fetch(`${API_URL}/billing/invoices`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setInvoicesLoading(false);
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
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDescription = (reason: string, change: number): string => {
    const lower = reason.toLowerCase();

    // Remove job UUIDs (pattern: job-XXXXX or similar)
    let cleaned = reason.replace(/job-[a-zA-Z0-9-]+/gi, "").trim();

    // Format standard billing statements
    if (lower.includes("deduction") && lower.includes("monthly")) {
      return "Monthly credits used";
    }
    if (lower.includes("deduction") && lower.includes("addon")) {
      return "Add-on credits used";
    }
    if (lower.includes("deduction")) {
      return "Credits used";
    }
    if (lower.includes("renewal") || lower.includes("subscription_cycle")) {
      return "Subscription renewal";
    }
    if (lower.includes("purchase") && lower.includes("addon")) {
      return "Add-on credits purchase";
    }
    if (lower.includes("purchase") || lower.includes("checkout")) {
      return "Plan purchase";
    }
    if (lower.includes("refund")) {
      return "Refund";
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
        <SendItFastSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">

        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-medium tracking-tight text-gray-900 mb-3">
            Account
          </h1>
          <p className="text-lg text-gray-500 font-light">
            Manage your subscription, credits, and billing history.
          </p>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Credits</span>
            <span className="text-3xl font-medium tracking-tight">{totalCredits.toLocaleString()}</span>
            <div className="flex gap-3 mt-1 text-sm text-gray-500">
              <span>{monthlyCredits.toLocaleString()} Monthly</span>
              <span className="text-gray-300">•</span>
              <span>{addonCredits.toLocaleString()} Add-on</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">Current Plan</span>
            <span className="text-3xl font-medium tracking-tight capitalize">
              {subscriptionInfo?.plan_type || "Free"}
            </span>
            <span className="text-sm text-gray-500 mt-1">
              {subscriptionInfo?.subscription_status === "active" ? "Active subscription" : "No active subscription"}
            </span>
          </div>

          {subscriptionInfo?.current_period_end && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                {subscriptionInfo.cancel_at_period_end ? "Expires On" : "Renews On"}
              </span>
              <span className="text-3xl font-medium tracking-tight">
                {new Date(subscriptionInfo.current_period_end * 1000).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric"
                })}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                {new Date(subscriptionInfo.current_period_end * 1000).getFullYear()}
              </span>
            </div>
          )}
        </div>

        {/* Subscription Management */}
        {subscriptionInfo && subscriptionInfo.plan_type !== "free" && subscriptionInfo.subscription_status === "active" && (
          <section className="mb-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium tracking-tight">Subscription</h2>
            </div>

            <div className="border border-gray-100 rounded-2xl p-8 bg-white shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium capitalize">{subscriptionInfo.plan_type} Plan</h3>
                    {subscriptionInfo.cancel_at_period_end && (
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium">
                        Canceling
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 font-light max-w-md">
                    {subscriptionInfo.cancel_at_period_end
                      ? "Your access will continue until the end of the billing period."
                      : "Your plan renews automatically. You can upgrade or cancel at any time."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {subscriptionInfo.cancel_at_period_end ? (
                    <button
                      onClick={handleReactivateSubscription}
                      disabled={actionLoading}
                      className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all"
                    >
                      {actionLoading ? "Processing..." : "Reactivate"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        Cancel
                      </button>
                      {!subscriptionInfo.plan_type.includes("annual") && (
                        <button
                          onClick={() => setShowPlanModal(true)}
                          className="px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
                        >
                          Upgrade Plan
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Invoices */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium tracking-tight">Invoices</h2>
          </div>

          <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
            {invoicesLoading ? (
              <div className="py-12 flex items-center justify-center">
                <SendItFastSpinner size={24} />
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-light">No invoices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {invoices.map((invoice, index) => (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {invoice.description || `Invoice ${invoice.number}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(invoice.date * 1000).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${invoice.status === "paid"
                          ? "bg-emerald-50 text-emerald-600"
                          : invoice.status === "open"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                        {invoice.status === "paid" ? "Paid" : invoice.status === "open" ? "Pending" : invoice.status}
                      </span>

                      {invoice.pdf_url && (
                        <a
                          href={invoice.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Transactions */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-medium tracking-tight">History</h2>
          </div>

          <div className="border-t border-gray-100">
            <AnimatePresence mode="wait">
              {transactions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center"
                >
                  <p className="text-gray-400 font-light">No transactions yet</p>
                </motion.div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {transactions.map((txn, index) => {
                    const isPositive = txn.change > 0;
                    const description = formatDescription(txn.reason, txn.change);

                    return (
                      <motion.div
                        key={txn.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.3 }}
                        className="py-5 grid grid-cols-12 gap-4 items-center group hover:bg-gray-50/50 transition-colors -mx-4 px-4 rounded-xl"
                      >
                        <div className="col-span-6 md:col-span-5">
                          <p className="text-sm font-medium text-gray-900">{description}</p>
                          <p className="text-xs text-gray-400 mt-0.5 md:hidden">
                            {formatDate(txn.ts)}
                          </p>
                        </div>

                        <div className="col-span-3 md:col-span-2 text-right md:text-left">
                          <span className={`text-sm font-medium ${isPositive ? "text-emerald-600" : "text-gray-600"}`}>
                            {isPositive ? "+" : ""}{txn.change.toLocaleString()}
                          </span>
                        </div>

                        <div className="hidden md:block md:col-span-2">
                          {txn.amount > 0 && (
                            <span className="text-sm text-gray-500">
                              ${txn.amount.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="col-span-3 md:col-span-3 text-right">
                          <span className="text-sm text-gray-400 font-light">
                            {formatDate(txn.ts)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-between border-t border-gray-100 pt-8">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <span className="text-sm text-gray-400 font-light">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-sm"
              onClick={() => setShowCancelModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">Cancel Subscription?</h3>
                <p className="text-gray-500 mb-8 font-light leading-relaxed">
                  Your plan will remain active until the end of the billing period. You won't be charged again.
                </p>

                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                    className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Confirm Cancellation"}
                  </button>
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="w-full py-3 text-gray-500 font-medium hover:text-gray-900 transition-colors"
                  >
                    Keep Subscription
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 backdrop-blur-sm"
              onClick={() => setShowPlanModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-medium text-gray-900">Upgrade Plan</h3>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                {["starter", "growth", "pro"].map((plan) => {
                  const currentPlan = (userInfo?.plan_type || "free").toLowerCase().replace("_annual", "");
                  const planDetails: Record<string, { credits: number; price: number }> = {
                    starter: { credits: 2000, price: 49 },
                    growth: { credits: 10000, price: 149 },
                    pro: { credits: 40000, price: 499 },
                  };

                  const details = planDetails[plan];
                  const currentPlanCredits = planDetails[currentPlan]?.credits || 0;

                  if (plan === currentPlan || details.credits <= currentPlanCredits) {
                    return null;
                  }

                  return (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left p-6 rounded-xl border transition-all duration-200 ${selectedPlan === plan
                        ? "border-black bg-gray-50 ring-1 ring-black/5"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 capitalize mb-1">{plan}</h4>
                          <p className="text-gray-500 font-light">
                            {details.credits.toLocaleString()} credits • ${details.price}/mo
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${selectedPlan === plan ? "border-black bg-black text-white" : "border-gray-300"
                          }`}>
                          {selectedPlan === plan && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => selectedPlan && handleChangePlan(selectedPlan)}
                  disabled={!selectedPlan || actionLoading}
                  className="flex-1 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
                >
                  {actionLoading ? "Processing..." : "Upgrade Now"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
