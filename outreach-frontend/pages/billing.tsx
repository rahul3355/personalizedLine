import { CSSProperties, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useSpring } from "framer-motion";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import {
  ArrowLeft,
  X,
  CreditCard,
  Plus,
  Infinity,
  Gauge,
  Puzzle,
  Handshake,
  ShieldCheck,
  LifeBuoy,
  Users,
  Brain,
  CheckCircle2,
  Star,
  AlertCircle,
} from "lucide-react";
import { TbHelpCircle } from "react-icons/tb";
import { Switch } from "@headlessui/react";

import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";

type BillingCycle = "monthly" | "yearly";
type AudienceSegment = "individual" | "business";

type PlanConfig = {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlySavings?: string;
  currency?: string;
  badge?: string;
  popular?: boolean;
  ctaLabel: string;
  features: string[];
  includes?: string;
  monthlyCredits: number;
  pricePerThousandCredits: number;
};

type SubscriptionInfo = {
  plan_type: string;
  subscription_status: string;
  credits_remaining: number;
  addon_credits: number;
  max_credits: number;
  cancel_at_period_end: boolean;
  current_period_end: number | null;
  pending_plan_change?: string;
};

// ============================================================================
// PRICING CONFIGURATION - Update monthly prices here
// Annual prices are automatically calculated with 20% off
// ============================================================================

const PRICING = {
  starter: {
    monthlyPrice: 49,
    credits: 2000,
    addonPricePer1000: 15,
  },
  growth: {
    monthlyPrice: 149,
    credits: 10000,
    addonPricePer1000: 13,
  },
  pro: {
    monthlyPrice: 499,
    credits: 40000,
    addonPricePer1000: 11,
  },
} as const;

// Helper function to calculate annual price with 20% off
function calculateAnnualPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * 0.8);
}

// ============================================================================

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPerCredit(amount: number) {
  return `$${amount.toFixed(4)}`;
}

const planConfigurations: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "",
    monthlyPrice: PRICING.starter.monthlyPrice,
    yearlyPrice: calculateAnnualPrice(PRICING.starter.monthlyPrice),
    yearlySavings: "saving 20%",
    currency: "USD",
    ctaLabel: "Upgrade to Starter",
    features: [
      `${PRICING.starter.credits.toLocaleString()} credits/month`,
      `$${PRICING.starter.addonPricePer1000} per 1000 credits`,
    ],
    includes: "Everything in Free",
    monthlyCredits: PRICING.starter.credits,
    pricePerThousandCredits: PRICING.starter.addonPricePer1000,
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "",
    monthlyPrice: PRICING.growth.monthlyPrice,
    yearlyPrice: calculateAnnualPrice(PRICING.growth.monthlyPrice),
    yearlySavings: "saving 20%",
    currency: "USD",
    badge: "Popular",
    popular: true,
    ctaLabel: "Upgrade to Growth",
    features: [
      `${PRICING.growth.credits.toLocaleString()} credits/month`,
      `$${PRICING.growth.addonPricePer1000} per 1000 credits`,
    ],
    includes: "Everything in Starter",
    monthlyCredits: PRICING.growth.credits,
    pricePerThousandCredits: PRICING.growth.addonPricePer1000,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "",
    monthlyPrice: PRICING.pro.monthlyPrice,
    yearlyPrice: calculateAnnualPrice(PRICING.pro.monthlyPrice),
    yearlySavings: "saving 20%",
    currency: "USD",
    ctaLabel: "Upgrade to Pro",
    features: [
      `${PRICING.pro.credits.toLocaleString()} credits/month`,
      `$${PRICING.pro.addonPricePer1000} per 1000 credits`,
    ],
    includes: "Everything in Growth",
    monthlyCredits: PRICING.pro.credits,
    pricePerThousandCredits: PRICING.pro.addonPricePer1000,
  },
];

const enterpriseFeatures = [
  { label: "Unlimited Credits", Icon: Infinity },
  { label: "Priority Queueing", Icon: Gauge },
  { label: "CRM Integrations", Icon: Puzzle },
  { label: "Founder-led Onboarding", Icon: Handshake },
  { label: "Compliance", Icon: ShieldCheck },
  { label: "24x7x365 Premium Support", Icon: LifeBuoy },
  { label: "Additional Seats + Team Management", Icon: Users },
  { label: "Customized Email Scripts", Icon: Brain },
];

const enterpriseCtaHighlights = [
  { label: "Dedicated Account Strategist", Icon: Star },
  { label: "Quarterly Success Reviews", Icon: CheckCircle2 },
];

type CurrencyParts = {
  currencySymbol: string;
  number: string;
};

function formatCurrencyParts(amount: number, currency = "USD"): CurrencyParts {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  const parts = formatter.formatToParts(amount);
  const currencySymbol = parts.find((part) => part.type === "currency")?.value ?? "";
  const number = parts
    .filter((part) => part.type === "integer" || part.type === "group")
    .map((part) => part.value)
    .join("");

  return { currencySymbol, number };
}

const AEONIK_FONT_FAMILY =
  '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

type AnimatedNumberProps = {
  value: number;
  className?: string;
  style?: CSSProperties;
};

function AnimatedNumber({ value, className, style }: AnimatedNumberProps) {
  const springValue = useSpring(value, {
    stiffness: 140,
    damping: 18,
    mass: 0.6,
  });
  const [displayValue, setDisplayValue] = useState(value.toLocaleString());

  useEffect(() => {
    springValue.set(value);
  }, [springValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest).toLocaleString());
    });

    return () => unsubscribe();
  }, [springValue]);

  return (
    <span className={className} style={style} aria-live="polite">
      {displayValue}
    </span>
  );
}

function AnimatedText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={className} style={style}>
      <AnimatePresence mode="sync" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: "easeInOut" }}
          className="inline-block"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function DiscordTooltip({ message }: { message: string }) {
  return (
    <span className="relative inline-block group">
      <button
        type="button"
        aria-label={message}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-transparent bg-transparent text-sm leading-none text-neutral-400 transition-colors hover:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865f2]"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <TbHelpCircle aria-hidden="true" className="h-3.5 w-3.5 mt-px -ml-px" />
      </button>
      <span className="absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 group-hover:flex group-focus-within:flex">
        <span className="relative rounded-md border border-[#2b2d31] bg-[#1e1f22] px-3 py-1.5 text-[10px] font-medium text-[#dbdee1] shadow-[0_20px_45px_rgba(0,0,0,0.55)] whitespace-nowrap">
          {message}
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-[#2b2d31] border-b-0 border-r-0 bg-[#1e1f22]" />
        </span>
      </span>
    </span>
  );
}

// Initialize Stripe with publishable key from env
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

export default function BillingPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeSegment, setActiveSegment] = useState<AudienceSegment>("individual");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    () => planConfigurations.find((plan) => plan.popular)?.id ?? planConfigurations[0]?.id ?? ""
  );
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const closeBilling = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // Fetch subscription info
  useEffect(() => {
    if (session && userInfo?.user?.plan_type && userInfo.user.plan_type !== "free") {
      fetchSubscriptionInfo();
    }
  }, [session, userInfo?.user?.plan_type]);

  const fetchSubscriptionInfo = async () => {
    if (!session) return;
    try {
      const res = await fetch(`${API_URL}/subscription/info`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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

  useEffect(() => {
    const { body } = document;
    const originalOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    dialogRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeBilling();
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleCheckout = async (planId: string) => {
    if (!session || !userInfo?.id) return;
    setLoadingPlanId(planId);
    try {
      // Append "_annual" suffix if yearly billing cycle is selected
      const planName = billingCycle === "yearly"
        ? `${planId.toLowerCase()}_annual`
        : planId.toLowerCase();

      const res = await fetch(`${API_URL}/create_checkout_session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planName,
          addon: false,
          quantity: 1,
          user_id: userInfo.id,
        }),
      });

      const data = await res.json();
      if (data.id) {
        const stripe = await stripePromise;
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: data.id });
        }
      } else {
        console.error("Plan checkout error", data);
        setLoadingPlanId(null);
      }
    } catch (err) {
      console.error("Checkout error", err);
      setLoadingPlanId(null);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!session || !userInfo?.id) return;
    setLoadingAction(`upgrade-${planId}`);

    try {
      // Create checkout session for upgrade
      const res = await fetch(`${API_URL}/create_checkout_session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planId,
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
      console.error("Upgrade error:", err);
      setLoadingAction(null);
    }
  };


  const handleCancel = async () => {
    if (!session) return;
    if (!confirm("Cancel your subscription? You'll keep access until the end of your current billing period.")) {
      return;
    }
    setLoadingAction("cancel");

    try {
      const res = await fetch(`${API_URL}/subscription/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Refresh page to show updated status
      window.location.reload();
    } catch (err) {
      console.error("Cancel error:", err);
      window.location.reload();
    }
  };

  const handleReactivate = async () => {
    if (!session) return;
    setLoadingAction("reactivate");

    try {
      const res = await fetch(`${API_URL}/subscription/reactivate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Refresh page to show updated status
      window.location.reload();
    } catch (err) {
      console.error("Reactivate error:", err);
      window.location.reload();
    }
  };

  const plans = planConfigurations;
  const isYearly = billingCycle === "yearly";
  const currentPlan = userInfo?.user?.plan_type || "free";
  // Use userInfo directly to avoid async timing issues with subscriptionInfo
  const hasActiveSub = userInfo && userInfo.user?.plan_type && userInfo.user.plan_type !== "free";

  // Debug logging
  console.log("[Billing Debug] currentPlan:", currentPlan);
  console.log("[Billing Debug] hasActiveSub:", hasActiveSub);
  console.log("[Billing Debug] userInfo:", userInfo);
  console.log("[Billing Debug] userInfo.user?.plan_type:", userInfo?.user?.plan_type);
  console.log("[Billing Debug] subscriptionInfo:", subscriptionInfo);

  return (
    <div className="fixed inset-0 z-50 bg-white" style={{ fontFamily: AEONIK_FONT_FAMILY }}>
      <div className="h-full overflow-y-auto">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="relative mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-6 pt-16 pb-24 text-center md:px-12 md:pt-24"
        >
          <button
            type="button"
            onClick={closeBilling}
            aria-label="Go back"
            className="fixed top-6 left-6 flex items-center gap-2 text-sm font-semibold text-black transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back
          </button>

          <button
            type="button"
            onClick={closeBilling}
            aria-label="Close"
            className="fixed top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Current Subscription Section */}
          {hasActiveSub && (
            <div className="mb-12 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-left">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>

              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="text-2xl font-semibold text-gray-900 capitalize mt-1">{currentPlan}</p>
                  {subscriptionInfo.pending_plan_change && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Downgrading to {subscriptionInfo.pending_plan_change} at period end
                    </div>
                  )}
                  {subscriptionInfo.cancel_at_period_end && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Cancels at period end
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm text-gray-500">Credits</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {(subscriptionInfo.credits_remaining + subscriptionInfo.addon_credits).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {subscriptionInfo.credits_remaining.toLocaleString()} monthly + {subscriptionInfo.addon_credits.toLocaleString()} add-on
                  </p>
                </div>

                {subscriptionInfo.current_period_end && (
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm text-gray-500">Next billing</p>
                    <p className="text-base font-medium text-gray-900 mt-1">
                      {new Date(subscriptionInfo.current_period_end * 1000).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                {/* Only show plan changes for monthly subscriptions */}
                {!currentPlan.includes("annual") ? (
                  <div className="flex flex-wrap gap-3">
                    {plans.map((plan) => {
                      const planCredits = plan.monthlyCredits;
                      // Normalize current plan name: remove annual suffix and convert to lowercase
                      const normalizedCurrentPlan = currentPlan
                        .toLowerCase()
                        .replace("_annual", "");
                      const currentCredits = PRICING[normalizedCurrentPlan as keyof typeof PRICING]?.credits || 0;
                      const isCurrentPlan = plan.id === normalizedCurrentPlan;
                      const isUpgrade = planCredits > currentCredits;

                      // Only show upgrade options, skip current plan and lower tier plans
                      if (isCurrentPlan || !isUpgrade) return null;

                      return (
                        <button
                          key={plan.id}
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={loadingAction === `upgrade-${plan.id}`}
                          className="px-4 py-2 border border-gray-900 bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingAction === `upgrade-${plan.id}` ? (
                            <span className="inline-flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" opacity="0.25"/>
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15.7 47.1" strokeDashoffset="15.7" strokeLinecap="round"/>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            `Upgrade to ${plan.name}`
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 italic">
                    To change your annual plan, please contact support at founders@personalizedline.com
                  </p>
                )}

                {subscriptionInfo.cancel_at_period_end ? (
                  <button
                    onClick={handleReactivate}
                    disabled={loadingAction === "reactivate"}
                    className="px-4 py-2 border border-green-600 bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAction === "reactivate" ? "Processing..." : "Reactivate Subscription"}
                  </button>
                ) : (
                  <button
                    onClick={handleCancel}
                    disabled={loadingAction === "cancel"}
                    className="px-4 py-2 border border-red-600 text-red-600 font-medium text-sm hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAction === "cancel" ? "Processing..." : "Cancel Subscription"}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mx-auto max-w-xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
              {hasActiveSub ? "All Plans" : "Prices at a glance"}
            </h1>

          </div>

          <div className="relative mt-12 flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-neutral-600">
              <span>Save with yearly billing</span>
              <Switch
                checked={isYearly}
                onChange={(value: boolean) => setBillingCycle(value ? "yearly" : "monthly")}
                className={`${isYearly ? "bg-black" : "bg-neutral-200"
                  } relative inline-flex h-7 w-12 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
              >
                <span className="sr-only">Save with yearly billing</span>
                <span
                  aria-hidden="true"
                  className={`${isYearly ? "translate-x-6" : "translate-x-1"
                    } inline-block h-5 w-5 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>
          </div>

          <LayoutGroup>
            <div className="mt-12 grid grid-cols-1 gap-6 text-left md:grid-cols-2 xl:grid-cols-3 md:gap-8">
              {plans.map((plan) => {
                const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                const cadence = isYearly ? "/year" : "/month";
                const { currencySymbol } = formatCurrencyParts(price, plan.currency);
                const isSelected = plan.id === selectedPlanId;
                // Normalize current plan name for comparison (remove _annual suffix)
                const normalizedCurrentPlan = currentPlan.toLowerCase().replace("_annual", "");
                const isCurrentPlan = plan.id === normalizedCurrentPlan && hasActiveSub;
                const creditsForCycle = isYearly
                  ? plan.monthlyCredits * 12
                  : plan.monthlyCredits;
                const perCreditRate = creditsForCycle > 0 ? price / creditsForCycle : 0;
                const bulkPerCredit = plan.pricePerThousandCredits / 1000;
                const cycleUnit = isYearly ? "year" : "month";
                const cycleDescriptor = isYearly ? "yearly plan" : "monthly plan";
                const savingsText = plan.yearlySavings ?? "";
                const featureLabels = [
                  `${creditsForCycle.toLocaleString()} credits/${cycleUnit}`,
                  `$${plan.pricePerThousandCredits} per 1000 credits`,
                ];
                const featureDetails = [
                  `${formatPerCredit(perCreditRate)} per credit`,
                  `${formatPerCredit(bulkPerCredit)} per credit`,
                ];

                // Filter logic: Hide lower tier plans for active subscribers
                if (hasActiveSub) {
                  const currentPlanCredits = PRICING[normalizedCurrentPlan as keyof typeof PRICING]?.credits || 0;
                  const planCredits = plan.monthlyCredits;
                  const isDowngrade = planCredits < currentPlanCredits;

                  console.log(`[Billing Debug] Plan: ${plan.id}`, {
                    normalizedCurrentPlan,
                    currentPlanCredits,
                    planCredits,
                    isDowngrade,
                    isCurrentPlan,
                  });

                  // Don't render cards for lower tier plans
                  if (isDowngrade) {
                    console.log(`[Billing Debug] Hiding ${plan.id} card (downgrade)`);
                    return null;
                  }
                }

                return (
                  <article
                    key={plan.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPlanId(plan.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPlanId(plan.id);
                      }
                    }}
                    aria-pressed={isSelected}
                    className="relative flex h-full min-h-[290px] cursor-pointer flex-col rounded-3xl border border-transparent bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="planHighlight"
                        className="pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] border-black z-10"
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      />
                    )}
                    {isCurrentPlan && (
                      <div className="absolute top-4 right-4 px-2.5 py-1 bg-black text-white text-xs font-semibold uppercase tracking-wide">
                        Current
                      </div>
                    )}
                    <header className="relative flex items-start gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                          {plan.name}
                        </p>
                        <p className="mt-1 text-base text-neutral-600">
                          {plan.tagline}
                        </p>
                      </div>
                      {plan.badge && !isCurrentPlan && (
                        <span className="ml-auto inline-flex items-center rounded-full border border-yellow-500 bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-900">
                          {plan.badge}
                        </span>
                      )}
                    </header>

                    <div className="mt-6">
                      <div className="flex items-end justify-between gap-4">
                        <div className="flex items-end gap-1">
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={currencySymbol}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.2 }}
                              className="text-5xl font-semibold text-neutral-900"
                              style={{ fontFamily: AEONIK_FONT_FAMILY }}
                            >
                              {currencySymbol}
                            </motion.span>
                          </AnimatePresence>
                          <AnimatedNumber
                            value={price}
                            className="text-5xl font-semibold leading-none text-neutral-900"
                            style={{ fontFamily: AEONIK_FONT_FAMILY }}
                          />
                          <AnimatedText
                            text={cadence}
                            className="text-sm font-medium text-neutral-400"
                            style={{ fontFamily: AEONIK_FONT_FAMILY }}
                          />
                        </div>
                        <div className="flex min-h-[20px] flex-shrink-0 items-center justify-end text-right">
                          <AnimatePresence mode="wait" initial={false}>
                            {isYearly && plan.yearlySavings && (
                              <motion.span
                                key={savingsText}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.2 }}
                                className="text-sm font-medium text-[#ff7a00]"
                              >
                                {savingsText}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                    <br />
                    {(() => {
                      console.log(`[Billing Debug] Button for ${plan.id}:`, {
                        isCurrentPlan,
                        hasActiveSub,
                        buttonType: isCurrentPlan ? "Current Plan" : !hasActiveSub ? "Checkout" : "Upgrade",
                      });
                      return null;
                    })()}
                    {isCurrentPlan ? (
                      <button
                        type="button"
                        disabled
                        className="group relative mt-auto w-full overflow-visible rounded-full px-6 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-full bg-neutral-900"
                        />
                        <span className="relative z-10 inline-flex items-center justify-center w-full gap-2">
                          Current Plan
                        </span>
                      </button>
                    ) : !hasActiveSub ? (
                      <button
                        type="button"
                        onClick={() => handleCheckout(plan.id)}
                        disabled={loadingPlanId === plan.id}
                        className="group relative mt-auto w-full overflow-visible rounded-full px-6 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 rounded-full transition-all duration-200 ease-out ${
                            loadingPlanId === plan.id
                              ? "bg-neutral-400"
                              : plan.popular
                              ? "bg-black"
                              : "bg-neutral-900"
                          } ${loadingPlanId !== plan.id ? "group-hover:-inset-1 group-hover:bg-neutral-800 group-active:-inset-0.5" : ""}`}
                        />
                        <span className="relative z-10 inline-flex items-center justify-center w-full gap-2">
                          {loadingPlanId === plan.id ? (
                            <>
                              <svg
                                className="animate-spin h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="white"
                                  strokeWidth="3"
                                  strokeDasharray="31.4 31.4"
                                  strokeLinecap="round"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="white"
                                  strokeWidth="1"
                                  strokeDasharray="15.7 47.1"
                                  strokeDashoffset="15.7"
                                  strokeLinecap="round"
                                />
                              </svg>
                              Processing...
                            </>
                          ) : (
                            plan.ctaLabel
                          )}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={loadingAction === `upgrade-${plan.id}`}
                        className="group relative mt-auto w-full overflow-visible rounded-full px-6 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 rounded-full transition-all duration-200 ease-out ${
                            loadingAction === `upgrade-${plan.id}`
                              ? "bg-neutral-400"
                              : plan.popular
                              ? "bg-black"
                              : "bg-neutral-900"
                          } ${loadingAction !== `upgrade-${plan.id}` ? "group-hover:-inset-1 group-hover:bg-neutral-800 group-active:-inset-0.5" : ""}`}
                        />
                        <span className="relative z-10 inline-flex items-center justify-center w-full gap-2">
                          {loadingAction === `upgrade-${plan.id}` ? (
                            <>
                              <svg
                                className="animate-spin h-5 w-5"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="white"
                                  strokeWidth="3"
                                  strokeDasharray="31.4 31.4"
                                  strokeLinecap="round"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="white"
                                  strokeWidth="1"
                                  strokeDasharray="15.7 47.1"
                                  strokeDashoffset="15.7"
                                  strokeLinecap="round"
                                />
                              </svg>
                              Processing...
                            </>
                          ) : (
                            `Upgrade to ${plan.name}`
                          )}
                        </span>
                      </button>
                    )}

                    <ul className="mt-6 space-y-3 text-left text-sm text-neutral-700">
                      {featureLabels.map((feature, index) => (
                        <li key={`${plan.id}-feature-${index}`} className="flex items-start gap-2 font-medium">
                          {index === 0 ? (
                            <CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-900" />
                          ) : index === 1 ? (
                            <Plus className="h-4 w-4 mt-0.5 flex-shrink-0 text-neutral-900" />
                          ) : null}
                          <div className="flex flex-col">
                            <span className="flex items-center gap-2">
                              {feature}
                              {index === 0 ? (
                                <DiscordTooltip message="1 credit = 1 email (research + personalized email + icebreaker)" />
                              ) : null}
                            </span>
                            <ul className="mt-1 space-y-1 text-xs font-normal text-neutral-400">
                              <li className="flex items-start gap-2">

                                <span>{featureDetails[index] ?? ""}</span>
                              </li>
                            </ul>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <br /><br />


                  </article>
                );
              })}
            </div>
          </LayoutGroup>

          <section className="mt-10 w-full text-left">
            <article className="flex min-h-[220px] flex-col rounded-3xl border border-neutral-200/60 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <header>
                <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Enterprise</p>
              </header>
              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
                <ul className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 text-sm text-neutral-700 sm:grid-cols-2">
                  {enterpriseFeatures.map(({ label, Icon }) => (
                    <li key={label} className="flex items-start gap-2 font-medium">
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-900" aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex w-full flex-col justify-between gap-4 sm:max-w-sm lg:max-w-xs lg:self-stretch">
                  <ul className="space-y-3 text-sm text-neutral-700">
                    {enterpriseCtaHighlights.map(({ label, Icon }) => (
                      <li key={label} className="flex items-start gap-2 font-medium">
                        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-900" aria-hidden="true" />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="mailto:founders@personalizedline.com"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    Talk to us
                  </a>
                </div>
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
