
import { useAuth } from "../../lib/AuthProvider";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

const AEONIK_FONT_FAMILY =
  '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif';

export default function BillingSuccessPage() {
  const { session, refreshUserInfo } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!session) {
        await router.replace("/billing");
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
      } catch (err) {
        if (!cancelled) {
          console.error("Stripe sync failed", err);
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        await refreshUserInfo();
        if (!cancelled) {
          router.replace("/billing");
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [refreshUserInfo, router, session]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
      style={{ fontFamily: AEONIK_FONT_FAMILY }}
    >
      <div className="max-w-md w-full text-center">
        <div className="animate-spin h-12 w-12 border-4 border-gray-300 border-t-gray-900 rounded-full mx-auto mb-6" />
        <h1 className="text-xl font-semibold text-gray-900">Finalizing your subscription…</h1>
        <p className="mt-2 text-sm text-gray-600">
          We&apos;re synchronizing your subscription details with Stripe. You&apos;ll be
          redirected back to the billing page in a moment.
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}. You can safely return to the billing page.
          </p>
        )}
      </div>
    </div>
  );
}
