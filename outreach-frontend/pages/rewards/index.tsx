"use client";

import { useAuth } from "../../lib/AuthProvider";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Milestone = {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: number;
  expiresAt: string; // ISO date
  status: "locked" | "active" | "unlocked" | "claimed" | "expired";
};

export default function RewardsPage() {
  const { userInfo, loading } = useAuth();
  const credits = userInfo?.credits_remaining ?? 0;

  // --- Fake milestones for frontend demo ---
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: "m1",
      title: "Milestone 1.0",
      target: 500,
      progress: 188,
      reward: 500,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
    {
      id: "m2",
      title: "Milestone 2.0",
      target: 1000,
      progress: 0,
      reward: 1000,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "locked",
    },
    {
      id: "m3",
      title: "Milestone 3.0",
      target: 2000,
      progress: 0,
      reward: 2000,
      expiresAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      status: "locked",
    },
  ]);

  const [selected, setSelected] = useState<Milestone | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  // Format countdown
  function formatCountdown(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${d}d ${h}h left`;
  }

  // Claim reward
  function claimReward(m: Milestone) {
    setCelebrate(true);
    setMilestones((prev) =>
      prev.map((ms) =>
        ms.id === m.id ? { ...ms, status: "claimed" } : ms
      )
    );
    setTimeout(() => setCelebrate(false), 4000);
  }

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Rewards</h1>

      {/* Current Credits */}
      <div className="mb-12">
        <p className="text-gray-700 text-lg">
          You currently have{" "}
          <span className="font-semibold text-gray-900">
            {loading ? "..." : credits.toLocaleString()}
          </span>{" "}
          units available.
        </p>
      </div>

      {/* Milestone Coins Grid */}
      <div className="grid grid-cols-3 gap-10">
        {milestones.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            className="flex flex-col items-center space-y-3 focus:outline-none"
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                m.status === "claimed"
                  ? "bg-yellow-500 text-white ring-2 ring-yellow-600"
                  : m.status === "unlocked"
                  ? "bg-yellow-400 text-white"
                  : m.status === "active"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-300 text-gray-500"
              }`}
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
              }}
            >
              🪙
            </div>
            <span className="text-sm font-medium text-gray-700">{m.title}</span>
          </button>
        ))}
      </div>

      {/* Modal for Selected Milestone */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {selected.title}
              </h2>
              <p className="text-gray-600 text-sm mb-2">
                Reward: <span className="font-semibold">+{selected.reward}</span>{" "}
                units
              </p>
              <p className="text-gray-600 text-sm mb-4">
                Progress: {selected.progress} / {selected.target}
              </p>

              {selected.status === "active" && (
                <p className="text-gray-500 text-sm mb-4">
                  Expires {new Date(selected.expiresAt).toLocaleString()} (
                  {formatCountdown(selected.expiresAt)})
                </p>
              )}

              {selected.status === "locked" && (
                <p className="text-gray-400 text-sm">
                  This milestone is locked. Complete earlier rewards first.
                </p>
              )}

              {selected.status === "active" && (
                <p className="text-gray-700 text-sm">
                  Spend {selected.target} units to unlock +{selected.reward}.
                </p>
              )}

              {selected.status === "unlocked" && (
                <button
                  onClick={() => claimReward(selected)}
                  className="mt-4 w-full py-3 rounded-xl bg-black text-white font-medium shadow hover:bg-gray-900 transition"
                >
                  Open Reward
                </button>
              )}

              {selected.status === "claimed" && (
                <p className="text-green-600 font-medium mt-4">
                  Reward claimed!
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="text-6xl animate-bounce">🎉🎉🎉</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
