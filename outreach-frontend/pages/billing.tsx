"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
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
  Sparkles,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { TbHelpCircle } from "react-icons/tb";
import { Switch } from "@headlessui/react";

import { useAuth } from "../lib/AuthProvider";

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
    monthlyPrice: 44,
    yearlyPrice: 96,
    yearlySavings: "Save 20%",
    currency: "USD",
    ctaLabel: "Upgrade to Starter",
    features: [
      "2000 credits/month",
      "$11 per 1000 credits",
    ],
    includes: "Everything in Free",
    monthlyCredits: 2000,
    pricePerThousandCredits: 19,
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "",
    monthlyPrice: 84,
    yearlyPrice: 528,
    yearlySavings: "Save 12%",
    currency: "USD",
    badge: "Popular",
    popular: true,
    ctaLabel: "Upgrade to Growth",
    features: [
      "10000 credits/month",
      "$9 per 1000 credits",
    ],
    includes: "Everything in Starter",
    monthlyCredits: 10000,
    pricePerThousandCredits: 19,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "",
    monthlyPrice: 264,
    yearlyPrice: 1056,
    yearlySavings: "Save 12%",
    currency: "USD",
    ctaLabel: "Upgrade to Pro",
    features: [
      "25000 credits/month",
      "$7 per 1000 credits",
    ],
    includes: "Everything in Growth",
    monthlyCredits: 25000,
    pricePerThousandCredits: 7,
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
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function BillingPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeSegment, setActiveSegment] = useState<AudienceSegment>("individual");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    () => planConfigurations.find((plan) => plan.popular)?.id ?? planConfigurations[0]?.id ?? ""
  );
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const closeBilling = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
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
    try {
      const res = await fetch(`${API_URL}/create_checkout_session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planId.toLowerCase(),
          addon: false,
          quantity: 1,
          user_id: userInfo.id,
        }),
      });

      const data = await res.json();
      if (data.id) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to initialize");
        await stripe.redirectToCheckout({ sessionId: data.id });
      } else {
        console.error("Plan checkout error", data);
        alert("Failed to create checkout session");
      }
    } catch (err) {
      console.error("Checkout error", err);
      alert("Something went wrong starting checkout");
    }
  };

  const plans = planConfigurations;
  const isYearly = billingCycle === "yearly";

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

          <div className="mx-auto max-w-xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
              Prices at a glance
            </h1>

          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm text-neutral-600">
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

          <LayoutGroup>
            <div className="mt-12 grid grid-cols-1 gap-6 text-left md:grid-cols-2 xl:grid-cols-3 md:gap-8">
              {plans.map((plan) => {
                const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                const cadence = isYearly ? "/year" : "/month";
                const { currencySymbol } = formatCurrencyParts(price, plan.currency);
                const isSelected = plan.id === selectedPlanId;
                const creditsForCycle = isYearly
                  ? plan.monthlyCredits * 12
                  : plan.monthlyCredits;
                const perCreditRate = creditsForCycle > 0 ? price / creditsForCycle : 0;
                const bulkPerCredit = plan.pricePerThousandCredits / 1000;
                const cycleDescriptor = isYearly ? "yearly plan" : "monthly plan";
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
                    className="relative flex h-full min-h-[290px] cursor-pointer flex-col rounded-3xl border border-transparent bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="planHighlight"
                        className="pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] border-black z-10"
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      />
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
                      {plan.badge && (
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
                                key={plan.yearlySavings}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.2 }}
                                className="text-sm font-medium text-[#ff7a00]"
                              >
                                saving {plan.yearlySavings.replace("Save ", "").toLowerCase()}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                    <br />
                    <button
                      type="button"
                      onClick={() => handleCheckout(plan.id)}
                      className={`mt-auto w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black hover:scale-105 hover:bg-neutral-700 active:bg-neutral-600 ${plan.popular ? "bg-black" : "bg-neutral-900"
                        }`}
                    >
                      {plan.ctaLabel}
                    </button>

                    <ul className="mt-6 space-y-3 text-left text-sm text-neutral-700">
                      {plan.features.map((feature, index) => (
                        <li key={feature} className="flex items-start gap-2 font-medium">
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
              <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center  lg:justify-between">
                <ul className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 text-sm text-neutral-700 sm:grid-cols-2">
                  {enterpriseFeatures.map(({ label, Icon }) => (
                    <li key={label} className="flex items-start gap-2 font-medium">
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-900" aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:founders@personalizedline.com"
                  className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black sm:self-start lg:self-auto lg:flex-shrink-0"
                >
                  Talk to us
                </a>
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
