"use client";

import { useAuth } from "../../lib/AuthProvider";
import { useEffect, useState } from "react";

export default function RewardsPage() {
  const { userInfo, loading } = useAuth();
  const credits = userInfo?.credits_remaining ?? 0;

  const [rewards, setRewards] = useState<any>(null);
  const [claimable, setClaimable] = useState<string[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!userInfo?.id) return;

    fetch(`http://127.0.0.1:8000/rewards/status?user_id=${userInfo.id}`)
      .then(res => res.json())
      .then(data => {
        setRewards(data.rewards);
        setClaimable(data.claimable || []);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [userInfo?.id]);

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Rewards</h1>

      {/* Current Credits */}
      <div className="mb-8">
        <p className="text-gray-700 text-lg">
          You currently have{" "}
          <span className="font-semibold text-gray-900">
            {loading ? "..." : credits.toLocaleString()}
          </span>{" "}
          units available.
        </p>
      </div>

      {fetching ? (
        <div>Loading rewards...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(rewards || {}).map(([key, info]: any) => (
            <div
              key={key}
              className="p-4 rounded-lg border border-gray-200 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-800 capitalize">
                {key}
              </h2>
              <p className="text-gray-600 text-sm">{info.requirement}</p>
              <p className="text-gray-500 text-sm">
                Progress: {info.progress} / {info.target}
              </p>

              {info.claimed ? (
                <span className="text-green-600 font-medium">Claimed</span>
              ) : info.eligible ? (
                <button
                  onClick={() => alert("Trigger /claim")}
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Claim Reward
                </button>
              ) : (
                <span className="text-gray-400">Not Eligible</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
