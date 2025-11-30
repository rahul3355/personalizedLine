import { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import {
  PiArrowLeft,
  PiMinus,
  PiPlus,
  PiCheck,
  PiCoinsDuotone
} from "react-icons/pi";

import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";

const AEONIK_FONT_FAMILY =
  '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

// Initialize Stripe
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

// Pricing configuration
const PRICING = {
  starter: { addonPricePer1000: 15 },
  growth: { addonPricePer1000: 13 },
  pro: { addonPricePer1000: 11 },
} as const;

export default function AddOnCreditsPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1); // 1 unit = 1000 credits
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Manual input state
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPlan = useMemo(
    () => userInfo?.user?.plan_type || userInfo?.plan_type || "free",
    [userInfo?.plan_type, userInfo?.user?.plan_type]
  );

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const closePage = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePage();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBuy = async () => {
    if (!session || !userInfo?.id) return;
    setLoading(true);
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
          quantity: quantity,
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
        console.error("Checkout error", data);
        alert("Failed to start purchase");
        setLoading(false);
      }
    } catch (err) {
      console.error("Purchase error", err);
      alert("Something went wrong");
      setLoading(false);
    }
  };

  // Input handlers
  const handleInputBlur = () => {
    setIsEditing(false);
    let val = parseInt(inputValue.replace(/,/g, ""), 10);
    if (isNaN(val) || val < 1000) val = 1000;

    // Round to nearest 1000
    const units = Math.ceil(val / 1000);
    setQuantity(Math.min(units, 1000)); // Cap at 1M credits (1000 units) for safety
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  const startEditing = () => {
    setInputValue((quantity * 1000).toString());
    setIsEditing(true);
  };

  // Calculations
  const normalizedPlan = currentPlan.toLowerCase().replace("_annual", "") as keyof typeof PRICING;
  const pricePerUnit = PRICING[normalizedPlan]?.addonPricePer1000 || 15;
  const totalCredits = quantity * 1000;
  const totalPrice = quantity * pricePerUnit;

  // Quick select options (in units of 1000)
  const quickOptions = [
    { label: "+10k", value: 10 },
    { label: "+50k", value: 50 },
    { label: "+100k", value: 100 },
    { label: "+200k", value: 200 },
  ];

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-white flex flex-col"
      style={{ fontFamily: AEONIK_FONT_FAMILY }}
    >
      {/* Top Navigation */}
      <header className="absolute top-0 left-0 w-full flex items-center justify-between px-6 py-6 md:px-12 z-10">
        <button
          onClick={closePage}
          className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
            <PiArrowLeft className="h-4 w-4" />
          </div>
          <span>Back</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px]"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-yellow-50 mb-4">
              <PiCoinsDuotone className="h-5 w-5 text-yellow-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight mb-2">
              Add Credits
            </h1>
            <p className="text-gray-500 text-base">
              Top up your account to keep outreach moving.
            </p>
          </div>

          {/* Credit Controller Card */}
          <div className="bg-white rounded-[28px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6">
            {/* Counter */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={quantity <= 1}
              >
                <PiMinus className="h-4 w-4" />
              </button>

              <div className="flex-1 flex flex-col items-center">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleInputBlur}
                    onKeyDown={handleKeyDown}
                    className="text-3xl font-semibold text-gray-900 text-center w-full bg-transparent border-b-2 border-black focus:outline-none p-0 m-0 tabular-nums tracking-tight"
                    placeholder="Enter amount"
                  />
                ) : (
                  <div
                    onClick={startEditing}
                    className="text-3xl font-semibold text-gray-900 tabular-nums tracking-tight cursor-text hover:text-gray-700 transition-colors border-b-2 border-transparent hover:border-gray-200"
                    title="Click to edit amount"
                  >
                    {totalCredits.toLocaleString()}
                  </div>
                )}
                <div className="text-xs font-medium text-gray-400 mt-1">credits</div>
              </div>

              <button
                onClick={() => setQuantity(Math.min(1000, quantity + 1))}
                className="h-10 w-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95"
              >
                <PiPlus className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Select Pills */}
            <div className="flex justify-center gap-2 mb-8 flex-wrap">
              {quickOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQuantity(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${quantity === opt.value
                      ? "bg-black text-white shadow-md"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Rate ({currentPlan})</span>
                <span className="font-medium text-gray-900">${pricePerUnit} / 1k</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                <span className="text-base font-medium text-gray-900">Total</span>
                <span className="text-lg font-semibold text-gray-900">${totalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleBuy}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-black text-white text-base font-medium shadow-lg shadow-black/5 hover:bg-gray-900 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Purchase for ${totalPrice.toLocaleString()}</span>
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-gray-400 mt-4 flex items-center justify-center gap-1">
              <PiCheck className="h-3 w-3" />
              Secure payment via Stripe
            </p>
          </div>
        </motion.div>
      </main>
    </div>,
    document.body
  );
}
