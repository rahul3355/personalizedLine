"use client";

import { useAuth } from "../lib/AuthProvider";
import AddonSection from "./AddonSection";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";

// ✅ Initialize Stripe with publishable key from env
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function BillingPage() {
  const { session, userInfo, refreshUserInfo } = useAuth();
  const [addonCount, setAddonCount] = useState(1);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const router = useRouter();

  // ✅ Plans displayed in UI
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

// ✅ Handle Add-ons
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
        plan: currentPlan.toLowerCase(), // important for price map
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

// ✅ Handle Plan Checkout
const handleCheckout = async (plan: string) => {
  if (!session || !userInfo?.id) return;
  try {
    const res = await fetch(`${API_URL}/create_checkout_session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan: plan.toLowerCase(),
        addon: false,       // always explicit
        quantity: 1,        // always explicit
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


  // ✅ Refresh user info after successful Stripe checkout
  useEffect(() => {
    if (router.query.success === "true") {
      refreshUserInfo();
      const { success, ...rest } = router.query;
      router.replace(
        { pathname: router.pathname, query: rest },
        undefined,
        { shallow: true }
      );
    }
  }, [router.query.success]);

  // ✅ Current Plan Info
  const currentPlan =
    userInfo?.user?.plan_type || userInfo?.plan_type || "free";
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

  return (
    <>
      {/* ---------------- Desktop Billing Page ---------------- */}
      <div className="hidden md:block px-8 py-12">
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
                className="mt-8 w-full px-6 py-3 rounded-md bg-gradient-to-b from-[#3a3a3a] to-[#1f1f1f] text-white font-medium shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-[rgba(0,0,0,0.25)] active:scale-[0.99]"
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
            <p className="mt-2 text-xs text-gray-500">Renews on {renewalDate}</p>
          )}
          <button
            disabled
            className="mt-6 px-6 py-3 rounded-md bg-gray-200 text-gray-600 font-medium cursor-not-allowed"
          >
            Current Plan
          </button>
        </div>

        {/* Add-ons */}
        <div className="relative mt-10 border border-gray-200 bg-white p-6 shadow-md rounded-lg z-10">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            Add-on Pricing
          </h3>
          <p className="mt-1 text-sm text-gray-500 text-center">
            For <span className="font-medium text-gray-700">{currentPlan} Plan</span> —{" "}
            <span className="text-green-600 font-medium">
              ${userInfo?.addon_price || 5}
            </span>{" "}
            per 1000 lines
          </p>

          <div className="mt-6 text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select additional packs
            </label>
            <select
              className="w-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition"
              onChange={(e) => setAddonCount(Number(e.target.value))}
              value={addonCount}
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} × 1000 lines
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-gray-700">
              ={" "}
              <span className="font-semibold text-gray-900">
                {(addonCount * 1000).toLocaleString()}
              </span>{" "}
              lines
            </p>
            <p className="mt-1 text-sm text-gray-700">
              Total:{" "}
              <span className="font-bold text-green-600">
                ${(addonCount * (userInfo?.addon_price || 5)).toLocaleString()}
              </span>
            </p>
          </div>

          <button
            onClick={handleBuyAddons}
            className="mt-6 w-full py-3 font-semibold text-white bg-black border border-black text-[15px] tracking-tight rounded-lg relative overflow-hidden transition-transform duration-150 active:scale-95 hover:shadow-lg"
          >
            <span className="relative z-10">Buy Add-ons</span>
            <span className="absolute inset-0 bg-white/20 opacity-0 active:opacity-100 transition-opacity duration-150"></span>
          </button>
        </div>
      

        

        
      </div>

      {/* ---------------- Mobile Billing Page ---------------- */}
      <div className="block md:hidden px-5 pt-6 pb-12 font-sans">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Choose your plan
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Simple, scalable plans designed for professionals, teams, and agencies.
          </p>
        </div>

        {/* Plans */}
        <div className="space-y-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="relative rounded-3xl border border-gray-200 bg-white/90 backdrop-blur-md shadow-sm p-6 text-center"
            >
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>

              <div className="mt-3 flex items-baseline justify-center gap-x-1">
                <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-sm font-medium text-gray-500">{plan.period}</span>
              </div>
              <br />

              <p className="mt-3 text-sm font-medium text-gray-900">{plan.quota}</p>
              <p className="mt-1 text-xs text-gray-500">+ {plan.additional}</p>

              <button
                onClick={() => handleCheckout(plan.name)}
                className="mt-6 w-full py-3 rounded-xl font-medium text-white text-[15px] tracking-tight bg-gradient-to-b from-[#3a3a3a] to-[#1f1f1f] relative overflow-hidden transition-transform duration-150 active:scale-95 hover:shadow-lg"
              >
                <span className="relative z-10">Get {plan.name}</span>
                <span className="absolute inset-0 bg-white/10 opacity-0 active:opacity-100 transition-opacity duration-150"></span>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Current Plan */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center"
        >
          <h3 className="text-sm font-semibold text-gray-800">
            You’re on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
          </h3>
          <p className="mt-2 text-xs text-gray-500">
            {maxCredits.toLocaleString()} lines each month · {credits.toLocaleString()} remaining
          </p>
          {renewalDate && (
            <p className="mt-1 text-xs text-gray-400">Renews on {renewalDate}</p>
          )}
        </motion.div>

        {/* Add-ons */}
        <div className="relative mt-10 border border-gray-200 bg-white p-6 shadow-md rounded-lg z-10">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            Add-on Pricing
          </h3>
          <p className="mt-1 text-sm text-gray-500 text-center">
            For <span className="font-medium text-gray-700">{currentPlan} Plan</span> —{" "}
            <span className="text-green-600 font-medium">
              ${userInfo?.addon_price || 5}
            </span>{" "}
            per 1000 lines
          </p>

          <div className="mt-6 text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select additional packs
            </label>
            <select
              className="w-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition"
              onChange={(e) => setAddonCount(Number(e.target.value))}
              value={addonCount}
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} × 1000 lines
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-gray-700">
              ={" "}
              <span className="font-semibold text-gray-900">
                {(addonCount * 1000).toLocaleString()}
              </span>{" "}
              lines
            </p>
            <p className="mt-1 text-sm text-gray-700">
              Total:{" "}
              <span className="font-bold text-green-600">
                ${(addonCount * (userInfo?.addon_price || 5)).toLocaleString()}
              </span>
            </p>
          </div>

          <button
            onClick={handleBuyAddons}
            className="mt-6 w-full py-3 font-semibold text-white bg-black border border-black text-[15px] tracking-tight rounded-lg relative overflow-hidden transition-transform duration-150 active:scale-95 hover:shadow-lg"
          >
            <span className="relative z-10">Buy Add-ons</span>
            <span className="absolute inset-0 bg-white/20 opacity-0 active:opacity-100 transition-opacity duration-150"></span>
          </button>
        </div>
      </div>
    </>
  );
}
