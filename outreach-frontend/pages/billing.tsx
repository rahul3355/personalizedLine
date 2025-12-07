import { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import SendItFastSpinner from "../components/SendItFastSpinner";
import { UpgradeConfirmModal, ResultModal } from "../components/UpgradeModal";

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
  billing_frequency?: "monthly" | "annual";
  credits_remaining: number;
  addon_credits: number;
  max_credits: number;
  cancel_at_period_end: boolean;
  current_period_end: number | null;
  pending_plan_change?: string;
  pending_plan_change_date?: number;  // Unix timestamp of when downgrade takes effect
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
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Modal state
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    planId: string;
    planName: string;
    price: number;
    credits: number;
    bonusCredits: number;
    isAnnual: boolean;
  } | null>(null);
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
    details?: { plan?: string; credits?: number; amountCharged?: number };
  } | null>(null);

  const closeBilling = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // Fetch subscription info
  useEffect(() => {
    if (session) {
      fetchSubscriptionInfo();
    } else if (!session && !userInfo) {
      // If no session and no userInfo, we might be loading auth or not logged in.
      // But if we are here, we probably want to stop loading if we are sure there is no session.
      // However, useAuth handles initial loading.
      // Let's just set loadingSubscription to false after a short timeout if no session appears,
      // or rely on the fact that if session is null, we show default.
      // But to be safe and avoid infinite loading for non-logged in users (if any):
      const timer = setTimeout(() => setLoadingSubscription(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [session, userInfo]);

  const fetchSubscriptionInfo = async () => {
    if (!session) return;
    setLoadingSubscription(true);
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
    } finally {
      setLoadingSubscription(false);
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

    const handlePageShow = () => {
      setLoadingPlanId(null);
      setLoadingAction(null);
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset loading state if redirected back from Stripe with canceled=true
  useEffect(() => {
    if (router.isReady && router.query.canceled) {
      setLoadingPlanId(null);
      setLoadingAction(null);
    }
  }, [router.isReady, router.query.canceled]);

  if (!mounted) return null;

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

      if (!res.ok) {
        // Handle backend validation errors (e.g., "You are already subscribed...")
        const errorMessage = data.detail || data.error || "Failed to create checkout session";
        alert(errorMessage); // Simple alert for now, can be replaced with a toast
        setLoadingPlanId(null);
        return;
      }

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
      alert("An unexpected error occurred. Please try again.");
      setLoadingPlanId(null);
    }
  };

  // Show upgrade confirmation modal
  const showUpgradeConfirmation = (planId: string, isAnnual: boolean = false) => {
    console.log("[DEBUG] showUpgradeConfirmation called", { planId, isAnnual, subscriptionInfo });

    const plan = planConfigurations.find(p => p.id === planId);
    if (!plan) {
      console.log("[DEBUG] Plan not found:", planId);
      return;
    }

    const price = isAnnual ? plan.yearlyPrice : plan.monthlyPrice;
    const credits = isAnnual ? plan.monthlyCredits * 12 : plan.monthlyCredits;

    // Calculate estimated bonus credits (prorated from current plan)
    let bonusCredits = 0;
    if (subscriptionInfo?.current_period_end) {
      const currentPlanConfig = planConfigurations.find(
        p => p.id === (subscriptionInfo.plan_type || "free")
      );
      if (currentPlanConfig) {
        const now = Date.now() / 1000; // Current time in seconds
        const periodEnd = subscriptionInfo.current_period_end;
        const remainingSeconds = Math.max(0, periodEnd - now);
        const remainingDays = remainingSeconds / 86400;
        const totalDays = 30; // Assume 30-day billing cycle
        const unusedRatio = Math.min(remainingDays / totalDays, 1);
        const oldPlanCredits = currentPlanConfig.monthlyCredits;
        bonusCredits = Math.floor(oldPlanCredits * unusedRatio);
        // Cap bonus at new plan credits
        bonusCredits = Math.min(bonusCredits, credits);
        console.log("[DEBUG] Bonus calculation", { remainingDays, unusedRatio, oldPlanCredits, bonusCredits });
      }
    }

    console.log("[DEBUG] Setting upgradeModal", { planId, planName: plan.name, price, credits, bonusCredits, isAnnual });

    setUpgradeModal({
      isOpen: true,
      planId: isAnnual ? `${planId}_annual` : planId,
      planName: plan.name,
      price,
      credits,
      bonusCredits,
      isAnnual,
    });
  };

  // Execute the actual upgrade API call
  const executeUpgrade = async (planId: string) => {
    if (!session || !userInfo?.id) return;

    setLoadingAction(`upgrade-${planId}`);

    try {
      const res = await fetch(`${API_URL}/subscription/upgrade?plan=${planId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      // Close confirmation modal
      setUpgradeModal(null);
      setLoadingAction(null);

      if (!res.ok) {
        const errorMessage = data.detail || data.error || "Failed to upgrade subscription";
        setResultModal({
          isOpen: true,
          type: "error",
          title: "Upgrade Failed",
          message: errorMessage,
        });
        return;
      }

      if (data.status === "success") {
        setResultModal({
          isOpen: true,
          type: "success",
          title: "Upgrade Successful!",
          message: data.bonus_credits > 0
            ? `You received ${data.credits?.toLocaleString()} credits (including ${data.bonus_credits?.toLocaleString()} bonus credits for upgrading early)!`
            : `You received ${data.credits?.toLocaleString() || 'your new'} credits!`,
          details: {
            plan: data.new_plan,
            credits: data.credits,
            amountCharged: data.amount_charged,
          },
        });
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      setUpgradeModal(null);
      setLoadingAction(null);
      setResultModal({
        isOpen: true,
        type: "error",
        title: "Upgrade Failed",
        message: "An unexpected error occurred. Please try again.",
      });
    }
  };

  // Legacy handleUpgrade for backward compatibility
  const handleUpgrade = (planId: string) => {
    showUpgradeConfirmation(planId, false);
  };

  // Switch from monthly to annual billing (same plan)
  const handleSwitchToAnnual = (planId: string) => {
    showUpgradeConfirmation(planId, true);
  };

  const handleDowngrade = async (planId: string) => {
    if (!session || !userInfo?.id) return;

    // Confirm downgrade with user
    const confirmed = confirm(
      `Downgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan?\n\n` +
      `Your current plan will remain active until the end of this billing period.\n` +
      `After that, you'll be charged the new lower rate and your credits will reset.`
    );

    if (!confirmed) return;

    setLoadingAction(`downgrade-${planId}`);

    try {
      const res = await fetch(`${API_URL}/subscription/downgrade?plan=${planId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.detail || data.error || "Failed to downgrade subscription";
        alert(errorMessage);
        setLoadingAction(null);
        return;
      }

      if (data.status === "success") {
        alert(`Downgrade scheduled! You'll switch to ${data.new_plan} plan at the end of your current billing period.`);
        window.location.reload();
      }
    } catch (err) {
      console.error("Downgrade error:", err);
      alert("An unexpected error occurred during downgrade. Please try again.");
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
  // Prioritize subscriptionInfo.plan_type as it is freshly fetched from the backend
  const currentPlan = subscriptionInfo?.plan_type || userInfo?.plan_type || "free";
  // hasActiveSub: ONLY true if subscription_status is explicitly 'active'
  const hasActiveSub = subscriptionInfo?.subscription_status === "active";

  const portalContent = createPortal(
    <div className="fixed inset-0 z-[9999] bg-white" style={{ fontFamily: AEONIK_FONT_FAMILY }}>
      <div className="h-full overflow-y-auto">
        {loadingSubscription ? (
          <div className="flex h-full items-center justify-center">
            <SendItFastSpinner />
          </div>
        ) : (
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

                  // Normalize current plan name: remove annual/monthly suffix and convert to lowercase
                  const normalizePlanId = (id: string) =>
                    id.toLowerCase().replace(/(_annual|_monthly)$/, "");

                  const normalizedCurrentPlan = normalizePlanId(currentPlan);
                  const isCurrentPlan = plan.id === normalizedCurrentPlan && hasActiveSub;
                  // User was on this plan but subscription is now canceled (they can still use remaining credits)
                  const isCanceledPlan = plan.id === normalizedCurrentPlan &&
                    subscriptionInfo?.subscription_status === "canceled" &&
                    currentPlan !== "free";
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
                      className="relative flex min-h-[290px] cursor-pointer flex-col rounded-3xl border border-transparent bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
                      {/* Show canceled badge if user was on this plan but subscription ended */}
                      {isCanceledPlan && (
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-red-500 text-white text-xs font-semibold uppercase tracking-wide">
                          Canceled
                        </div>
                      )}
                      {/* Show scheduled badge if this plan is the pending downgrade target */}
                      {subscriptionInfo?.pending_plan_change === plan.id && (
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-amber-500 text-white text-xs font-semibold uppercase tracking-wide">
                          Scheduled
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
                        <div className="flex items-end justify-between gap-4 flex-wrap">
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
                      {isCurrentPlan ? (
                        // Check if user can switch to annual (on monthly, viewing yearly)
                        isYearly && subscriptionInfo?.billing_frequency === "monthly" ? (
                          <button
                            type="button"
                            onClick={() => handleSwitchToAnnual(plan.id)}
                            disabled={loadingAction === `switch-annual-${plan.id}`}
                            className="group relative mt-auto w-full overflow-visible rounded-full px-6 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 rounded-full bg-green-600 transition-all duration-200 ease-out group-hover:-inset-1 group-hover:bg-green-500 group-active:-inset-0.5"
                            />
                            <span className="relative">
                              {loadingAction === `switch-annual-${plan.id}` ? "Processing..." : "Switch to Annual - Save 20%"}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="group relative mt-auto w-full overflow-visible rounded-full border border-neutral-200 bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-400 cursor-default"
                          >
                            Current Plan
                          </button>
                        )
                      ) : isCanceledPlan ? (
                        <button
                          type="button"
                          onClick={() => handleCheckout(plan.id)}
                          disabled={loadingPlanId === plan.id}
                          className="group relative mt-auto w-full overflow-visible rounded-full px-6 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 rounded-full bg-green-600 transition-all duration-200 ease-out group-hover:-inset-1 group-hover:bg-green-500 group-active:-inset-0.5"
                          />
                          <span className="relative">
                            {loadingPlanId === plan.id ? "Processing..." : "Resubscribe"}
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
                            className={`pointer-events-none absolute inset-0 rounded-full transition-all duration-200 ease-out ${loadingPlanId === plan.id
                              ? "bg-neutral-400"
                              : plan.popular
                                ? "bg-black"
                                : "bg-neutral-900"
                              } ${loadingPlanId !== plan.id ? "group-hover:-inset-1 group-hover:bg-neutral-800 group-active:-inset-0.5" : ""}`}
                          />
                          <span className="relative">
                            {loadingPlanId === plan.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" opacity="0.25" />
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15.7 47.1" strokeDashoffset="15.7" strokeLinecap="round" />
                                </svg>
                                Processing...
                              </span>
                            ) : (
                              plan.ctaLabel
                            )}
                          </span>
                        </button>
                      ) : (
                        (() => {
                          // Check if this plan is already scheduled
                          const isPendingDowngrade = subscriptionInfo?.pending_plan_change === plan.id;

                          if (isPendingDowngrade) {
                            return (
                              <button
                                type="button"
                                disabled
                                className="group relative mt-auto w-full overflow-visible rounded-full border border-amber-300 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-700 cursor-default"
                              >
                                Scheduled for Next Billing Cycle
                              </button>
                            );
                          }

                          // Determine if this is an upgrade or downgrade
                          const currentPlanCredits = plans.find(p => p.id === normalizedCurrentPlan)?.monthlyCredits ?? 0;
                          const isDowngrade = plan.monthlyCredits < currentPlanCredits;

                          // For downgrades: show disabled greyed out button
                          if (isDowngrade) {
                            return (
                              <button
                                type="button"
                                disabled
                                className="group relative mt-auto w-full overflow-visible rounded-full border border-neutral-200 bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-400 cursor-not-allowed"
                              >
                                Downgrade to {plan.name}
                              </button>
                            );
                          }

                          // For upgrades: normal upgrade button
                          return (
                            <button
                              type="button"
                              onClick={() => handleUpgrade(plan.id)}
                              disabled={loadingAction === `upgrade-${plan.id}`}
                              className="group relative mt-auto w-full overflow-visible rounded-full px-6 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 rounded-full bg-neutral-900 transition-all duration-200 ease-out group-hover:-inset-1 group-hover:bg-neutral-800 group-active:-inset-0.5"
                              />
                              <span className="relative">
                                {loadingAction === `upgrade-${plan.id}` ? "Processing..." : `Upgrade to ${plan.name}`}
                              </span>
                            </button>
                          );
                        })()
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
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
                  <ul className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm text-neutral-700 sm:grid-cols-2">
                    {enterpriseFeatures.map(({ label, Icon }) => (
                      <li key={label} className="flex items-start gap-2 font-medium">
                        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-900" aria-hidden="true" />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex w-full flex-col justify-between gap-4 lg:w-80">
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
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {portalContent}

      {/* Upgrade Confirmation Modal */}
      {upgradeModal && (
        <UpgradeConfirmModal
          isOpen={upgradeModal.isOpen}
          onClose={() => setUpgradeModal(null)}
          onConfirm={() => executeUpgrade(upgradeModal.planId)}
          isLoading={loadingAction?.startsWith("upgrade-") || false}
          currentPlan={subscriptionInfo?.plan_type || "free"}
          newPlan={upgradeModal.planName}
          currentCredits={subscriptionInfo?.credits_remaining || 0}
          newCredits={upgradeModal.credits}
          bonusCredits={upgradeModal.bonusCredits}
          price={upgradeModal.price}
          billingCycle={upgradeModal.isAnnual ? "annual" : "monthly"}
        />
      )}

      {/* Result Modal */}
      {resultModal && (
        <ResultModal
          isOpen={resultModal.isOpen}
          onClose={() => {
            setResultModal(null);
            if (resultModal.type === "success") {
              window.location.reload();
            }
          }}
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          details={resultModal.details}
        />
      )}
    </>
  );
}
