import { useAuth } from "../../lib/AuthProvider";
import { logger } from "../../lib/logger";
import { API_URL } from "../../lib/api";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { fireConfetti } from "@/components/magicui/confetti";

const AEONIK_FONT_FAMILY =
  '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

export default function BillingSuccessPage() {
  const { session, refreshUserInfo } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

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

  // Trigger rainbow confetti when payment is successful
  useEffect(() => {
    if (synced) {
      fireConfetti({
        particleCount: 150,
        angle: 90,
        spread: 70,
        startVelocity: 45,
        decay: 0.9,
        gravity: 1,
        origin: { x: 0.5, y: 0.6 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
        shapes: ['circle', 'square', 'star'],
        zIndex: 9999,
        disableForReducedMotion: true,
        scalar: 1.2,
      });
    }
  }, [synced]);

  return (
    <div
      className="fixed inset-0 top-16 flex items-start justify-center overflow-hidden pt-20"
      style={{ fontFamily: AEONIK_FONT_FAMILY }}
    >
      <div className="bg-white rounded-lg p-10 max-w-2xl w-full">
        <div className="text-center space-y-4">
        {!synced && !error && (
          <>
            <div className="animate-spin h-12 w-12 border-4 border-green-200 border-t-green-600 rounded-full mx-auto" />
            <h1 className="text-2xl font-bold text-green-800" style={{ fontFamily: 'Consolas, monospace' }}>PROCESSING PAYMENT</h1>
            <p className="text-base text-green-700">
              Finalizing your purchase...
            </p>
          </>
        )}

        {synced && !error && (
          <>
            <div>
              <svg
                className="mx-auto h-20 w-20 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-green-800" style={{ fontFamily: 'Consolas, monospace' }}>PAYMENT SUCCESSFUL</h1>
            <p className="text-lg text-green-700">Credits added</p>
            <p className="text-base text-green-600">Redirecting...</p>
          </>
        )}

        {error && (
          <>
            <div>
              <svg
                className="mx-auto h-20 w-20 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-green-800" style={{ fontFamily: 'Consolas, monospace' }}>PAYMENT RECEIVED</h1>
            <p className="text-base text-green-700">
              Payment successful, but sync issue occurred.
            </p>
            <p className="text-sm text-green-600">
              {error}. Credits will be available shortly. Redirecting...
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

BillingSuccessPage.disableWhiteCard = true;