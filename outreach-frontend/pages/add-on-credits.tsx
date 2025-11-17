import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, X } from "lucide-react";

import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";

const AEONIK_FONT_FAMILY =
  '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

// Initialize Stripe with publishable key from env
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;


const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

export default function AddOnCreditsPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [addonCount, setAddonCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const currentPlan = useMemo(
    () => userInfo?.user?.plan_type || userInfo?.plan_type || "free",
    [userInfo?.plan_type, userInfo?.user?.plan_type]
  );

  const closePage = () => {
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
        closePage();
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

  const credits = userInfo?.credits_remaining ?? 0;
  const maxCredits = userInfo?.max_credits ?? 25000;

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
            onClick={closePage}
            aria-label="Go back"
            className="fixed top-6 left-6 flex items-center gap-2 text-sm font-semibold text-black transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back
          </button>

          <button
            type="button"
            onClick={closePage}
            aria-label="Close"
            className="fixed top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-500 transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="mx-auto max-w-xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
              Buy Add-on Credits
            </h1>
            <p className="text-lg text-neutral-600">
              Increase your outreach capacity with additional credits
            </p>
          </div>

          <div className="mt-12 mx-auto w-full max-w-xl">
            <section className="rounded-3xl border border-neutral-200 bg-white p-7 text-left shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-semibold text-neutral-900">
                Current plan overview
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                You're on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan.
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
              </dl>
            </section>

            <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-7 text-left shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
              <h2 className="text-xl font-semibold text-neutral-900">
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
                disabled={loading}
                className="mt-6 w-full rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
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
                  </span>
                ) : (
                  "Purchase add-ons"
                )}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
