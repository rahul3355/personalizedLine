import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, X, Minus, Plus } from "lucide-react";

import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";
import { Button } from "../components/ui/button";

const AEONIK_FONT_FAMILY =
  '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

// Initialize Stripe with publishable key from env
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

// Pricing configuration from billing page
const PRICING = {
  starter: {
    addonPricePer1000: 15,
  },
  growth: {
    addonPricePer1000: 13,
  },
  pro: {
    addonPricePer1000: 11,
  },
} as const;

export default function AddOnCreditsPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [addonCount, setAddonCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const currentPlan = useMemo(
    () => userInfo?.user?.plan_type || userInfo?.plan_type || "free",
    [userInfo?.plan_type, userInfo?.user?.plan_type]
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const closePage = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  useEffect(() => {
    if (!mounted) return;

    const { body } = document;
    const originalOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    dialogRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePage();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [mounted]);

  const handleBuyAddons = async () => {
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
          quantity: addonCount,
          user_id: userInfo.id,
        }),
      });

      const data = await res.json();
      if (data.id) {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error(
            "Stripe failed to initialize. Please check that NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is configured correctly."
          );
        }
        await stripe.redirectToCheckout({ sessionId: data.id });
      } else {
        console.error("Add-on checkout error", data);
        alert("Failed to start add-on purchase");
        setLoading(false);
      }
    } catch (err) {
      console.error("Add-on purchase error", err);
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      alert(errorMsg);
      setLoading(false);
    }
  };

  const handleIncrement = () => {
    setAddonCount(prev => Math.min(prev + 1, 500));
  };

  const handleDecrement = () => {
    setAddonCount(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value > 500) setAddonCount(500);
    else if (value < 1) setAddonCount(1);
    else setAddonCount(value);
  };

  const normalizedPlan = currentPlan.toLowerCase().replace("_annual", "") as keyof typeof PRICING;
  const pricePerUnit = PRICING[normalizedPlan]?.addonPricePer1000 || 15;
  const totalLines = addonCount * 1000;
  const totalPrice = addonCount * pricePerUnit;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-white" style={{ fontFamily: AEONIK_FONT_FAMILY }}>
      <div className="h-full overflow-y-auto">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="relative mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-6 pt-16 pb-24 text-center md:px-12 md:pt-24"
        >
          {/* Back Button */}
          <button
            onClick={closePage}
            className="fixed top-6 left-6 flex items-center gap-2 text-sm font-semibold text-black transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back
          </button>

          {/* Close Button */}
          <button
            onClick={closePage}
            className="fixed top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Main Content */}
          <div className="mx-auto max-w-xl space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl"
            >
              Buy Add-on Credits
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-neutral-500 text-lg"
            >
              Scale your outreach with more capacity.
            </motion.p>
          </div>

          <div className="mt-12 mx-auto w-full max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="rounded-3xl border border-neutral-200 bg-white p-8 text-left shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="text-left">
                  <p className="text-sm font-medium text-neutral-500 mb-1">Quantity</p>
                  <p className="text-2xl font-semibold text-neutral-900">
                    {addonCount} <span className="text-neutral-400 text-lg font-normal">× 1k credits</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white rounded-full p-1.5 shadow-sm border border-neutral-100">
                  <button
                    onClick={handleDecrement}
                    disabled={addonCount <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={addonCount}
                    onChange={handleInputChange}
                    className="w-12 text-center font-medium text-neutral-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={handleIncrement}
                    disabled={addonCount >= 500}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-neutral-200/60">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Price per 1,000 lines</span>
                  <span className="font-medium text-neutral-900">${pricePerUnit}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600">Total lines</span>
                  <span className="font-medium text-neutral-900">{totalLines.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-medium text-neutral-900">Total due today</span>
                  <span className="text-xl font-semibold text-neutral-900">${totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <Button
                onClick={handleBuyAddons}
                disabled={loading}
                className="mt-8 w-full h-12 rounded-full bg-neutral-900 hover:bg-black text-white font-medium text-base shadow-lg shadow-neutral-900/10 hover:shadow-neutral-900/20 transition-all transform active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Purchase Credits</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-semibold">
                      ${totalPrice}
                    </span>
                  </div>
                )}
              </Button>

              <p className="mt-4 text-center text-xs text-neutral-400">
                Secure payment powered by Stripe. One-time payment.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
