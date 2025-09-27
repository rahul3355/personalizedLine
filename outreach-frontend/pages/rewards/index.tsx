"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

/**
 * This file preserves your original UI and behavior.
 * Additions (clearly marked) are:
 *  - milestone state (fetched from backend),
 *  - claiming state + handleClaim(),
 *  - fetch on mount to GET /milestones/active,
 *  - claim POST to /milestones/claim and refresh.
 *
 * To revert to baseline fake/demo flow: remove the useEffect that fetches,
 * and comment/uncomment the demoMilestones block below (marked BASELINE).
 */

// === CONFIG: change if your API is on another host ===
const API_BASE = typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : "";

type Milestone = {
  id: number;
  milestone_level: number;
  target_spend: number;
  reward_amount: number;
  progress_spent: number;
  status: "locked" | "active" | "unlocked" | "claimed" | "expired";
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function RewardsPage() {
  const { userInfo, loading } = useAuth();
  const credits = userInfo?.credits_remaining ?? 0;

  // === NEW state (parallel additions) ===
  // milestone: the single active/unlocked milestone fetched from backend
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  // local claim button state (do not collide with auth loading)
  const [claiming, setClaiming] = useState(false);

  // === existing UI state preserved below ===
  const [selected, setSelected] = useState<Milestone | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
  if (!userInfo?.id) return;

  fetchActiveMilestone(userInfo.id)
    .then((m) => {
      console.log("Fetched milestone:", m); // debug log
      setMilestone(m);
    })
    .catch((err) => {
      console.error("Failed to fetch milestone", err);
    });
}, [userInfo?.id]);


  // ------------------------------
  // BASELINE demo milestones (keep as fallback)
  // ------------------------------
  // If you ever need to revert instantly, uncomment the demo block below
  // and comment out the fetch useEffect (marked "END NEW").
  //
  // const demoMilestones: Milestone[] = [
  //   {
  //     id: 1,
  //     milestone_level: 1,
  //     target_spend: 500,
  //     reward_amount: 500,
  //     progress_spent: 238,
  //     status: "active",
  //     expires_at: "2025-10-03T10:28:16.821965+00",
  //   },
  //   {
  //     id: 2,
  //     milestone_level: 2,
  //     target_spend: 1000,
  //     reward_amount: 1000,
  //     progress_spent: 0,
  //     status: "locked",
  //     expires_at: null,
  //   },
  // ];
  //
  // If using demo fallback: setMilestone(demoMilestones[0]) somewhere, and comment out the fetch useEffect.
  // ------------------------------

  // --- NEW: helper functions for backend calls (minimal)
  async function fetchActiveMilestone(userId: string) {
    const url = API_BASE ? `${API_BASE}/milestones/active?user_id=${encodeURIComponent(userId)}` : `/milestones/active?user_id=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to fetch milestone: ${res.status} ${txt}`);
    }
    const data = await res.json();
    return data.milestone ?? null;
  }

  async function postClaimMilestone(userId: string, milestoneId: number) {
    const url = API_BASE ? `${API_BASE}/milestones/claim?user_id=${encodeURIComponent(userId)}&milestone_id=${milestoneId}` : `/milestones/claim?user_id=${encodeURIComponent(userId)}&milestone_id=${milestoneId}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Failed to claim milestone: ${res.status} ${txt}`);
    }
    const json = await res.json();
    return json;
  }



  // --- NEW: claim handler
  const handleClaim = async () => {
    if (!userInfo?.id || !milestone) return;
    if (milestone.status !== "unlocked") return;

    setClaiming(true);
    try {
      await postClaimMilestone(userInfo.id, milestone.id);
      // After success: refetch the active milestone to show the next one
      const next = await fetchActiveMilestone(userInfo.id);
      setMilestone(next);
      // trigger celebration only if reward was actually applied
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3500);
    } catch (err) {
      console.error("Rewards: claim failed", err);
      // optionally surface error to UI (toast, modal) — not added to keep baseline
    } finally {
      setClaiming(false);
    }
  };

  // --- small util to show countdown
  const formatExpiry = (expiresAt?: string | null) => {
    if (!expiresAt) return "No expiry";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h left`;
  };

  // === preserve original UI layout below ===
  // I only read or reference existing UI state variables (selected, show modal, celebrate, etc.)
  // The rest of the rendering is unchanged except where it reads data (now uses 'milestone' if present).

  // Build the coins grid data: prefer backend milestone if available; otherwise fall back to baseline/demo behavior.
  const coinsData: Milestone[] = useMemo(() => {
    if (milestone) {
      // show the single active/unlocked milestone from backend
      return [milestone];
    }
    // fallback: keep the UI unaffected — show nothing or demo items if you want.
    // By default, return an empty array so UI displays "No active milestone" when backend has none.
    return [];
  }, [milestone]);

  // === UI render (preserve your existing look) ===
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Top header with credits — unchanged */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Rewards</h1>
          <p className="text-sm text-gray-500">Earn credits by spending credits — milestones system</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Credits</div>
          <div className="text-lg font-medium">{credits}</div>
        </div>
      </div>

      {/* Celebration confetti (preserved) */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            {/* Confetti component was in baseline; if not present in your project you can remove this block */}
            <AnimatePresence>
  {celebrate && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-50"
    >
      {/* celebration placeholder (remove/comment if you prefer no visual) */}
      <div className="w-full h-full pointer-events-none" />
    </motion.div>
  )}
</AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* coins grid */}
      <div className="grid grid-cols-3 gap-6">
        {coinsData.length > 0 ? (
          coinsData.map((c) => (
            <motion.div
              key={c.id}
              className={`p-6 rounded-2xl shadow cursor-pointer flex flex-col items-center justify-center
                ${c.status === "unlocked" ? "bg-yellow-50" : "bg-white"}`}
              onClick={() => {
                setSelected(c);
                setShowModal(true);
              }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="text-5xl mb-2">
                {c.status === "unlocked" ? "🟡" : c.status === "active" ? "🟢" : "⚪"}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  Spend {c.target_spend} → +{c.reward_amount}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {c.progress_spent}/{c.target_spend}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-3 p-6 rounded-2xl bg-white shadow text-center text-gray-500">
            No active milestone
          </div>
        )}
      </div>

      {/* Modal (preserve structure; now uses selected which may come from backend) */}
      <AnimatePresence>
        {showModal && selected && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowModal(false);
              setSelected(null);
            }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">Milestone {selected.milestone_level}</h2>
                  <p className="text-sm text-gray-600">Spend {selected.target_spend} credits</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Expires</div>
                  <div className="text-sm">{formatExpiry(selected.expires_at)}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 bg-green-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        (selected.progress_spent / selected.target_spend) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <div>{selected.progress_spent} / {selected.target_spend}</div>
                  <div>{selected.status.toUpperCase()}</div>
                </div>
              </div>

              <div className="mt-6">
                {selected.status === "unlocked" ? (
                  <button
                    onClick={() => {
                      // call the new claim handler if backend is wired
                      handleClaim();
                    }}
                    disabled={claiming}
                    className="w-full py-3 px-4 rounded-xl bg-black text-white font-medium"
                  >
                    {claiming ? "Claiming..." : "Open Reward"}
                  </button>
                ) : selected.status === "active" ? (
                  <div className="text-sm text-gray-600">Keep spending to unlock this reward.</div>
                ) : selected.status === "claimed" ? (
                  <div className="text-sm text-gray-600">Already claimed.</div>
                ) : (
                  <div className="text-sm text-gray-600">Status: {selected.status}</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
