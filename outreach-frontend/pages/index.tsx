"use client";

import { useAuth } from "../lib/AuthProvider";
import { buyCredits } from "../lib/api";
import { CreditCard } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";

export default function Home() {
  const { session, loading, userInfo } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
      <InlineLoader />
    </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-lg font-medium text-gray-700">
          Please log in to continue
        </h1>
      </div>
    );
  }

  const handleBuyCredits = async (addon: string) => {
    try {
      const token = session.access_token;
      const data = await buyCredits(token, addon);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error("Error buying credits:", err);
      alert("Failed to start credit purchase");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to AuthorityPoint
        </h1>
        <p className="text-gray-600">Hello, {session.user.email}</p>
      </div>

      {/* Account Overview */}
      {userInfo && (
        <section className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Account Overview
            </h2>
            <div className="grid grid-cols-2 gap-y-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">Plan:</span>{" "}
                {userInfo?.user && userInfo.user.plan_type
                  ? userInfo.user.plan_type
                  : "No plan"}
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                {userInfo?.user && userInfo.user.subscription_status
                  ? userInfo.user.subscription_status
                  : "inactive"}
              </p>
              <p>
                <span className="font-medium">Credits Remaining:</span>{" "}
                {userInfo?.credits_remaining ?? 0}
              </p>
              <p>
                <span className="font-medium">Renewal Date:</span>{" "}
                {userInfo?.user && userInfo.user.renewal_date
                  ? new Date(
                      userInfo.user.renewal_date * 1000
                    ).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>

            {/* Buy Credits */}
            {(userInfo?.credits_remaining ?? 0) <= 0 && (
              <div className="mt-6">
                <button
                  onClick={() => handleBuyCredits("addon_1000")}
                  className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto rounded-full bg-gradient-to-b from-gray-100 to-gray-800 text-white font-medium shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <CreditCard className="w-4 h-4" />
                  Buy +1000 Credits ($10)
                </button>
              </div>
            )}
          </div>

          {/* Transactions */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">
              Recent Transactions
            </h3>
            <div className="space-y-2">
              {userInfo?.ledger && userInfo.ledger.length > 0 ? (
                userInfo.ledger.map((entry: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm text-gray-700 border-b last:border-0 py-2"
                  >
                    <span>
                      {entry.change > 0 ? "+" : ""}
                      {entry.change} credits — {entry.reason}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(entry.ts * 1000).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No recent transactions
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
