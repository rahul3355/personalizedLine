"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, X, Coins, Plus } from "lucide-react";
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
};

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
  },
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

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
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
    <span className={className} aria-live="polite">
      {displayValue}
    </span>
  );
}

function AnimatedText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
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

// Initialize Stripe with publishable key from env
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function BillingPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [addonCount, setAddonCount] = useState(1);
  const [activeSegment, setActiveSegment] = useState<AudienceSegment>("individual");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    () => planConfigurations.find((plan) => plan.popular)?.id ?? planConfigurations[0]?.id ?? ""
  );
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const currentPlan = useMemo(
    () => userInfo?.user?.plan_type || userInfo?.plan_type || "free",
    [userInfo?.plan_type, userInfo?.user?.plan_type]
  );

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

  const handleBuyAddons = async () => {
    if (!session || !userInfo?.id) return;
    try {
      const res = await fetch(`${API_URL}/create_checkout_session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: currentPlan.toLowerCase(),
          addon: true,
          quantity: addonCount,
          user_id: userInfo.id,
        }),
      });

      const data = await res.json();
      if (data.id) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error("Stripe failed to initialize");
        await stripe.redirectToCheckout({ sessionId: data.id });
      } else {
        console.error("Add-on checkout error", data);
        alert("Failed to start add-on purchase");
      }
    } catch (err) {
      console.error("Add-on purchase error", err);
      alert("Something went wrong");
    }
  };

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

  const credits = userInfo?.credits_remaining ?? 0;
  const maxCredits = userInfo?.max_credits ?? 25000;
  const renewalTimestamp = userInfo?.next_renewal;
  const renewalDate = renewalTimestamp
    ? new Date(renewalTimestamp * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const plans = planConfigurations;
  const isYearly = billingCycle === "yearly";

  return (
    <div className="fixed inset-0 z-50 bg-white">
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
              className={`${
                isYearly ? "bg-black" : "bg-neutral-200"
              } relative inline-flex h-7 w-12 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black`}
            >
              <span className="sr-only">Save with yearly billing</span>
              <span
                aria-hidden="true"
                className={`${
                  isYearly ? "translate-x-6" : "translate-x-1"
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
                    className={`relative flex h-full min-h-[290px] cursor-pointer flex-col rounded-3xl border bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      isSelected
                        ? "border-transparent"
                        : "border-neutral-200/60"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="planHighlight"
                        className="pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] border-black"
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
                      <div className="flex items-end justify-between">
                        <div className="flex items-end gap-1">
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={currencySymbol}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.2 }}
                              className="text-5xl font-semibold text-neutral-900 font-['Nunito',_'Aeonik_Pro',_sans-serif]"
                            >
                              {currencySymbol}
                            </motion.span>
                          </AnimatePresence>
                          <AnimatedNumber
                            value={price}
                            className="text-5xl font-semibold leading-none text-neutral-900 font-['Nunito',_'Aeonik_Pro',_sans-serif]"
                          />
                          <AnimatedText text={cadence} className="text-sm font-medium text-neutral-400" />
                        </div>
                        {isYearly && plan.yearlySavings && (
                          <span className="text-sm font-medium text-[#ff7a00]">
                            saving {plan.yearlySavings.replace('Save ', '').toLowerCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <br />
                    <button
                      type="button"
                      onClick={() => handleCheckout(plan.id)}
                      className={`mt-auto w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black hover:scale-105 hover:bg-neutral-700 active:bg-neutral-600 ${
                        plan.popular ? "bg-black" : "bg-neutral-900"
                      }`}
                    >
                      {plan.ctaLabel}
                    </button>

                  <ul className="mt-6 space-y-3 text-left text-sm text-neutral-700">
                    {plan.features.map((feature, index) => (
                      <li key={feature} className="flex items-start gap-2">
                        {index === 0 ? (
                          <Coins className="h-4 w-4 mt-0.5 text-neutral-600" />
                        ) : index === 1 ? (
                          <Plus className="h-4 w-4 mt-0.5 text-neutral-600" />
                        ) : null}
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <br /><br />

                  
                  </article>
                );
              })}
            </div>
          </LayoutGroup>

          <div className="mt-16 grid grid-cols-1 gap-6 text-left md:grid-cols-2">
            <section className="rounded-3xl border border-neutral-200 bg-white p-7 text-left shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <h2 className="text-base font-semibold text-neutral-900">
                Current plan overview
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                You’re on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan.
              </p>
              <dl className="mt-6 space-y-3 text-sm text-neutral-700">
                <div className="flex items-center justify-between">
                  <dt>Included monthly lines</dt>
                  <dd className="font-semibold text-neutral-900">
                    {maxCredits.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Lines remaining</dt>
                  <dd className="font-semibold text-neutral-900">
                    {credits.toLocaleString()}
                  </dd>
                </div>
                {renewalDate && (
                  <div className="flex items-center justify-between">
                    <dt>Renews on</dt>
                    <dd className="font-semibold text-neutral-900">{renewalDate}</dd>
                  </div>
                )}
              </dl>
              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-full border border-neutral-200 bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-500"
              >
                Current plan
              </button>
            </section>

            <section className="rounded-3xl border border-neutral-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <h2 className="text-base font-semibold text-neutral-900">
                Add more outreach lines
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                For the {currentPlan} plan —
                <span className="ml-1 font-semibold text-neutral-900">
                  ${userInfo?.addon_price || 5}
                </span>{" "}
                per additional 1,000 lines.
              </p>

              <label className="mt-6 block text-sm font-medium text-neutral-700" htmlFor="addon-select">
                Select add-on packs
              </label>
              <select
                id="addon-select"
                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
                onChange={(event) => setAddonCount(Number(event.target.value))}
                value={addonCount}
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} × 1,000 lines
                  </option>
                ))}
              </select>

              <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                <div className="flex items-center justify-between">
                  <span>Total lines</span>
                  <span className="font-semibold text-neutral-900">
                    {(addonCount * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>One-time total</span>
                  <span className="font-semibold text-neutral-900">
                    ${(addonCount * (userInfo?.addon_price || 5)).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBuyAddons}
                className="mt-6 w-full rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                Purchase add-ons
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
