
import { useAuth } from "../../lib/AuthProvider";
import { logger } from "../../lib/logger";
import { API_URL } from "../../lib/api";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import useWindowSize from "react-use/lib/useWindowSize";

const AEONIK_FONT_FAMILY =
  '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

export default function BillingSuccessPage() {
  const { session, refreshUserInfo } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [synced, setSynced] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    let cancelled = false;
    let redirectTimeout: NodeJS.Timeout;

    const run = async () => {
      if (!session) {
        await router.replace("/");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/stripe/sync`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.detail || "Failed to sync Stripe data");
        }

        // Sync successful!
        if (!cancelled) {
          await refreshUserInfo();
          setSynced(true);
          setShowConfetti(true);

          // Redirect to home after 3 seconds
          redirectTimeout = setTimeout(() => {
            if (!cancelled) {
              router.replace("/");
            }
          }, 3000);
        }
      } catch (err) {
        if (!cancelled) {
          logger.error("Stripe sync failed", err);
          setError("We encountered an issue processing your payment. Please contact support if this persists.");
          // Still redirect to home after error
          redirectTimeout = setTimeout(() => {
            if (!cancelled) {
              router.replace("/");
            }
          }, 3000);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [API_URL, refreshUserInfo, router, session]);

  return (
    <div
      className="h-[calc(100vh-68px)] flex items-center justify-center bg-white px-4 overflow-hidden"
      style={{ fontFamily: AEONIK_FONT_FAMILY }}
    >
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          colors={["#4f55f1", "#6c72ff", "#8a8fff", "#a8adff", "#c6caff"]}
          numberOfPieces={synced ? 200 : 0}
          recycle={false}
          gravity={0.3}
        />
      )}
      <div className="max-w-md w-full text-center space-y-4">
        {!synced && !error && (
          <>
            <div className="animate-spin h-12 w-12 border-4 border-gray-300 border-t-[#4f55f1] rounded-full mx-auto" />
            <h1 className="text-xl font-semibold text-gray-900">Processing your payment…</h1>
            <p className="text-sm text-gray-600">
              We&apos;re finalizing your purchase. This will only take a moment.
            </p>
          </>
        )}

        {synced && !error && (
          <>
            <div>
              <svg
                className="mx-auto h-14 w-14 text-[#4f55f1]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Payment Successful!</h1>
            <p className="text-sm text-gray-600">
              Your credits have been added to your account. Redirecting you to the dashboard…
            </p>
          </>
        )}

        {error && (
          <>
            <div>
              <svg
                className="mx-auto h-14 w-14 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Payment Received</h1>
            <p className="text-sm text-gray-600">
              Your payment was successful, but we encountered an issue syncing your account.
            </p>
            <p className="text-xs text-gray-500">
              {error}. Your credits will be available shortly. Redirecting you home…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
