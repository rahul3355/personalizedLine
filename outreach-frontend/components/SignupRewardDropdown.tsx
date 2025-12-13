"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Gift, Check, X, Coins, Loader2 } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";

interface SignupReward {
  has_reward: boolean;
  status: "active" | "unlocked" | "claimed" | "expired";
  credits_used: number;
  credits_goal: number;
  credits_remaining_to_goal: number;
  reward_credits: number;
  progress_percent: number;
  deadline_at: string | null;
  started_at: string | null;
  time_remaining_seconds: number | null;
  unlocked_at: string | null;
  claimed_at: string | null;
  message?: string;
}

interface SignupRewardDropdownProps {
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupRewardDropdown({ onClose }: SignupRewardDropdownProps) {
  const [reward, setReward] = useState<SignupReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, refreshUserInfo } = useAuth();

  const fetchReward = useCallback(async () => {
    if (!session?.access_token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/signup-reward`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch reward status (${response.status})`);
      }

      const data = await response.json();
      console.log("[SignupReward] Fetched reward data:", data);
      setReward(data);
    } catch (err) {
      console.error("[SignupReward] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load reward");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchReward();
  }, [fetchReward]);

  const handleClaim = async () => {
    if (!reward || reward.status !== "unlocked" || claiming || !session?.access_token) return;

    try {
      setClaiming(true);
      setError(null);

      const response = await fetch(`${API_URL}/signup-reward/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to claim reward");
      }

      await fetchReward();
      await refreshUserInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim reward");
    } finally {
      setClaiming(false);
    }
  };

  const formatDeadline = (deadlineAt: string | null): string => {
    if (!deadlineAt) return "";
    try {
      const date = new Date(deadlineAt);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return deadlineAt;
    }
  };

  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return "Expired";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const dropdownClasses = "absolute right-0 mt-2 w-[300px] rounded-2xl bg-white border border-neutral-200 shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-5";

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className={dropdownClasses}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
        </div>
      </motion.div>
    );
  }

  // Error state or no reward
  if (error || !reward || !reward.has_reward) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className={dropdownClasses}
      >
        <div className="text-center py-4">
          {error ? (
            <p className="text-red-500 text-sm mb-3">{error}</p>
          ) : (
            <p className="text-neutral-500 text-sm">No active reward</p>
          )}
          <button
            onClick={() => (window.location.href = "/billing")}
            className="text-neutral-900 text-xs font-medium hover:underline"
          >
            View billing & plans →
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={dropdownClasses}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          reward.status === "claimed" ? "bg-green-50" :
          reward.status === "unlocked" ? "bg-amber-50" :
          reward.status === "expired" ? "bg-red-50" :
          "bg-neutral-100"
        }`}>
          {reward.status === "claimed" ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : reward.status === "expired" ? (
            <X className="w-4 h-4 text-red-500" />
          ) : (
            <Gift className="w-4 h-4 text-neutral-700" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900">
            {reward.status === "claimed"
              ? "Reward Claimed!"
              : reward.status === "unlocked"
              ? "Reward Ready!"
              : reward.status === "expired"
              ? "Offer Expired"
              : "Welcome Bonus"}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {reward.status === "claimed"
              ? `You earned ${reward.reward_credits} bonus credits`
              : reward.status === "unlocked"
              ? `Claim your ${reward.reward_credits} free credits`
              : reward.status === "expired"
              ? "This offer has ended"
              : `Use ${reward.credits_goal} credits to unlock ${reward.reward_credits}`}
          </p>
        </div>
      </div>

      {/* Progress bar - for active and unlocked */}
      {(reward.status === "active" || reward.status === "unlocked") && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-neutral-700">
              {reward.credits_used.toLocaleString()} / {reward.credits_goal.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-400">{reward.progress_percent}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, reward.progress_percent)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                reward.status === "unlocked" ? "bg-green-500" : "bg-neutral-900"
              }`}
            />
          </div>
        </div>
      )}

      {/* Credits remaining - active only */}
      {reward.status === "active" && (
        <div className="bg-neutral-50 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Credits to go</span>
            <span className="text-sm font-semibold text-neutral-900">
              {reward.credits_remaining_to_goal.toLocaleString()}
            </span>
          </div>
          {reward.time_remaining_seconds && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-neutral-100">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-neutral-400">
                {formatTimeRemaining(reward.time_remaining_seconds)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Unlocked message */}
      {reward.status === "unlocked" && (
        <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-100">
          <div className="flex items-start gap-2">
            <Coins className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800">
                Goal reached! You used {reward.credits_used.toLocaleString()} credits
              </p>
              {reward.unlocked_at && (
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {formatDeadline(reward.unlocked_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claimed message */}
      {reward.status === "claimed" && (
        <div className="bg-green-50 rounded-xl p-3 mb-4 border border-green-100">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-green-800">
                +{reward.reward_credits.toLocaleString()} credits added
              </p>
              {reward.claimed_at && (
                <p className="text-[10px] text-green-600 mt-0.5">
                  {formatDeadline(reward.claimed_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expired message */}
      {reward.status === "expired" && (
        <div className="bg-red-50 rounded-xl p-3 mb-4 border border-red-100">
          <div className="flex items-start gap-2">
            <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">
              Used {reward.credits_used}/{reward.credits_goal} credits before deadline
            </p>
          </div>
        </div>
      )}

      {/* Action Button */}
      {reward.status === "active" && (
        <button
          disabled
          className="w-full py-2.5 rounded-full bg-neutral-100 text-neutral-400 text-xs font-medium cursor-not-allowed"
        >
          Use {reward.credits_remaining_to_goal.toLocaleString()} more to unlock
        </button>
      )}

      {reward.status === "unlocked" && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full py-2.5 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {claiming ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Coins className="w-3.5 h-3.5" />
              Claim {reward.reward_credits.toLocaleString()} Credits
            </>
          )}
        </button>
      )}

      {reward.status === "claimed" && (
        <button
          disabled
          className="w-full py-2.5 rounded-full bg-green-50 text-green-600 text-xs font-medium border border-green-100 flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Claimed
        </button>
      )}

      {reward.status === "expired" && (
        <button
          disabled
          className="w-full py-2.5 rounded-full bg-red-50 text-red-500 text-xs font-medium border border-red-100 flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Expired
        </button>
      )}

      {/* Link to billing */}
      <button
        onClick={() => (window.location.href = "/billing")}
        className="w-full mt-3 text-neutral-500 text-[11px] font-medium hover:text-neutral-900 transition-colors text-center"
      >
        View billing & plans →
      </button>
    </motion.div>
  );
}
