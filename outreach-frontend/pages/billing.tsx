"use client";

import { useAuth } from "../lib/AuthProvider";
import AddonSection from "./AddonSection";

export default function BillingPage() {
  const { session, userInfo } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const plans = [
    {
      name: "Starter",
      price: "$10",
      period: "/month",
      quota: "2,000 lines / month",
      description:
        "Effortless start for professionals running consistent outreach.",
      additional: "$8 per additional 1000 lines",
      popular: true,
    },
    {
      name: "Growth",
      price: "$50",
      period: "/month",
      quota: "10,000 lines / month",
      description:
        "Scale with confidence. Built for growing teams accelerating campaigns.",
      additional: "$6 per additional 1000 lines",
    },
    {
      name: "Pro",
      price: "$100",
      period: "/month",
      quota: "25,000 lines / month",
      description:
        "Power at full scale. For agencies and heavy users managing serious volume.",
      additional: "$5 per additional 1000 lines",
    },
  ];

  const handleCheckout = async (plan: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${API_URL}/create_checkout_session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ plan: plan.toLowerCase() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (err) {
      console.error("Checkout error", err);
      alert("Something went wrong starting checkout");
    }
  };

  // Current plan info from backend
  const currentPlan =
    userInfo?.user?.plan_type || userInfo?.plan_type || "free";
  const credits = userInfo?.credits_remaining ?? 0;
  const maxCredits = userInfo?.max_credits ?? 5000;
  const renewalTimestamp = userInfo?.next_renewal;
  const renewalDate = renewalTimestamp
    ? new Date(renewalTimestamp * 1000).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="px-8 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Choose your plan
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Upgrade your workflow with simple, scalable plans. Designed for
          professionals, teams, and agencies.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="relative rounded-2xl border border-gray-200 bg-white/70 p-8 shadow-sm backdrop-blur-sm transition-all"
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium rounded-full bg-gray-900 text-white shadow-sm">
                Most Popular
              </div>
            )}

            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>

            <div className="mt-4 flex items-baseline gap-x-1">
              <span className="text-3xl font-bold text-gray-900">
                {plan.price}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {plan.period}
              </span>
            </div>

            <p className="mt-3 text-sm font-medium text-gray-900">
              {plan.quota}
            </p>
            <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
            <p className="mt-4 text-xs text-gray-500">{plan.additional}</p>

            <button
              onClick={() => handleCheckout(plan.name)}
              className="
                mt-8 w-full px-6 py-3
                rounded-md
                bg-gradient-to-b from-[#3a3a3a] to-[#1f1f1f]
                text-white font-medium
                shadow-sm
                transition-all duration-300
                hover:shadow-lg hover:shadow-[rgba(0,0,0,0.25)]
                active:scale-[0.99]
              "
            >
              Get {plan.name}
            </button>
          </div>
        ))}
      </div>

      {/* Current Plan */}
      <div className="mt-16 max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-white/70 p-8 text-center shadow-sm backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-gray-900">
          You’re on the{" "}
          {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          This plan includes {maxCredits.toLocaleString()} lines each month.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {credits.toLocaleString()} lines remaining
        </p>
        {renewalDate && (
          <p className="mt-2 text-xs text-gray-500">
            Renews on {renewalDate}
          </p>
        )}
        <button
          disabled
          className="
            mt-6 px-6 py-3
            rounded-md
            bg-gray-200
            text-gray-600 font-medium
            cursor-not-allowed
          "
        >
          Current Plan
        </button>
      </div>

      {/* Add-on Section with corrected planType */}
      <AddonSection
        planType={userInfo?.user?.plan_type || "free"}
        session={session}
        apiUrl={API_URL}
      />
    </div>
  );
}
