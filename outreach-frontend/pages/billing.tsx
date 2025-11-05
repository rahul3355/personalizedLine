"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, X } from "lucide-react";
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

const planConfigurations: Record<AudienceSegment, PlanConfig[]> = {
  individual: [
    {
      id: "starter",
      name: "Starter",
      tagline: "Launch personalized outreach with confident basics.",
      monthlyPrice: 10,
      yearlyPrice: 96,
      yearlySavings: "Save 20%",
      currency: "USD",
      ctaLabel: "Upgrade to Starter",
      features: [
        "2,000 outreach lines each month",
        "Dynamic inbox personalization",
        "Live deliverability checks",
        "2 team seats included",
        "Email + chat support",
      ],
      includes: "Everything in Free",
    },
    {
      id: "growth",
      name: "Growth",
      tagline: "Scale campaigns with advanced automations and insights.",
      monthlyPrice: 50,
      yearlyPrice: 528,
      yearlySavings: "Save 12%",
      currency: "USD",
      badge: "Popular",
      popular: true,
      ctaLabel: "Upgrade to Growth",
      features: [
        "10,000 outreach lines each month",
        "AI-assisted brief builder",
        "Shared template library",
        "Advanced analytics dashboard",
        "Priority support",
      ],
      includes: "Everything in Starter",
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "Heavy-duty capacity for agencies running nonstop outreach.",
      monthlyPrice: 100,
      yearlyPrice: 1056,
      yearlySavings: "Save 12%",
      currency: "USD",
      ctaLabel: "Upgrade to Pro",
      features: [
        "25,000 outreach lines each month",
        "Dedicated success manager",
        "Multi-workspace administration",
        "Custom API access",
        "Quarterly strategy reviews",
      ],
      includes: "Everything in Growth",
    },
  ],
  business: [
    {
      id: "starter",
      name: "Starter Business",
      tagline: "Onboard teams fast with guided setup and governance.",
      monthlyPrice: 150,
      yearlyPrice: 1620,
      yearlySavings: "Save 10%",
      currency: "USD",
      ctaLabel: "Talk to sales",
      features: [
        "Team-wide onboarding concierge",
        "Centralized billing and admin controls",
        "Shared template permissions",
        "Role-based access controls",
        "Standard SLA support",
      ],
      includes: "Everything in Individual Pro",
    },
    {
      id: "growth",
      name: "Growth Business",
      tagline: "Layer personalization across multiple brands at scale.",
      monthlyPrice: 320,
      yearlyPrice: 3400,
      yearlySavings: "Save 11%",
      currency: "USD",
      badge: "Popular",
      popular: true,
      ctaLabel: "Chat with sales",
      features: [
        "Unlimited workspaces and seats",
        "Realtime performance benchmarks",
        "Salesforce + HubSpot integrations",
        "Single sign-on (SAML)",
        "24/5 priority support",
      ],
      includes: "Everything in Starter Business",
    },
    {
      id: "pro",
      name: "Enterprise",
      tagline: "Personalized go-to-market operations for global orgs.",
      monthlyPrice: 520,
      yearlyPrice: 5500,
      yearlySavings: "Save 12%",
      currency: "USD",
      ctaLabel: "Book enterprise demo",
      features: [
        "Unlimited outreach volume",
        "Custom security reviews & DPA",
        "Dedicated solutions architect",
        "Advanced governance reporting",
        "24/7 white-glove support",
      ],
      includes: "Everything in Growth Business",
    },
  ],
};

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

  const plans = planConfigurations[activeSegment];
  const isYearly = billingCycle === "yearly";

  const featureEmojis = ["🚀", "✨", "📈", "🛡️", "🤝", "⚙️", "🧠", "🌐", "📊", "💬"];

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

          <div className="mt-12 flex justify-center">
            <div className="relative flex w-fit items-center overflow-hidden rounded-full bg-neutral-900/5 p-1 text-sm font-medium">
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 h-full w-1/2 rounded-full bg-black transition-transform duration-200 ease-out ${
                  activeSegment === "individual" ? "translate-x-0" : "translate-x-full"
                }`}
              />
              {["individual", "business"].map((segment) => {
                const isActive = activeSegment === segment;
                return (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => setActiveSegment(segment as AudienceSegment)}
                    className={`relative z-10 w-1/2 rounded-full px-5 py-2 text-center transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      isActive ? "text-white" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                    aria-pressed={isActive}
                  >
                    {segment === "individual" ? "Individual" : "Business"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-neutral-600">
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
            {isYearly && (
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
                Showing yearly pricing
              </span>
            )}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 text-left md:grid-cols-2 xl:grid-cols-3 md:gap-8">
            {plans.map((plan) => {
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const cadence = isYearly ? "/year" : "/month";
              const { currencySymbol, number } = formatCurrencyParts(price, plan.currency);

              return (
                <article
                  key={`${activeSegment}-${plan.id}`}
                  className={`flex h-full flex-col rounded-3xl border bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${
                    plan.popular ? "border-black md:scale-[1.02]" : "border-neutral-200"
                  }`}
                >
                  <header className="flex items-start gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                        {plan.name}
                      </p>
                      <p className="mt-1 text-base text-neutral-600">
                        {plan.tagline}
                      </p>
                    </div>
                    {plan.badge && (
                      <span className="ml-auto inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                        {plan.badge}
                      </span>
                    )}
                  </header>

                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-lg text-neutral-500">{currencySymbol}</span>
                    <span className="text-5xl font-semibold leading-none text-neutral-900">
                      {number}
                    </span>
                    <span className="mb-1 text-sm text-neutral-500">{cadence}</span>
                  </div>
                  {isYearly && plan.yearlySavings && (
                    <div className="mt-3 inline-flex items-center rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
                      {plan.yearlySavings}
                    </div>
                  )}

                  <ul className="mt-6 space-y-3 text-left text-sm text-neutral-700">
                    {plan.features.map((feature, index) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-0.5 text-base">
                          {featureEmojis[index % featureEmojis.length]}
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.includes && (
                      <li className="flex items-start gap-2 text-neutral-500">
                        <span aria-hidden="true" className="mt-0.5 text-base">
                          ➕
                        </span>
                        <span>{plan.includes}</span>
                      </li>
                    )}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.id)}
                    className={`mt-auto w-full rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                      plan.popular
                        ? "bg-black text-white hover:bg-neutral-900"
                        : "bg-neutral-900 text-white hover:bg-black"
                    }`}
                  >
                    {plan.ctaLabel}
                  </button>
                </article>
              );
            })}
          </div>

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
