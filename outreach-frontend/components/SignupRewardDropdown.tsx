"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PiCoinsDuotone, PiGift, PiCheckCircle, PiXCircle } from "react-icons/pi";
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

      // Refresh reward status and user info (to update credits)
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
      const options: Intl.DateTimeFormatOptions = {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      };
      return date.toLocaleString(undefined, options);
    } catch {
      return deadlineAt;
    }
  };

  const formatTimeRemaining = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return "Expired";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16 }}
        className="absolute right-0 mt-2 w-[320px] rounded-2xl bg-white ring-1 ring-[#EEF0F4] shadow-[0_20px_60px_rgba(16,24,40,0.08),0_2px_8px_rgba(16,24,40,0.06)] p-4"
      >
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#4F55F1] border-t-transparent rounded-full animate-spin" />
        </div>
      </motion.div>
    );
  }

  // Error state or no reward
  if (error || !reward || !reward.has_reward) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16 }}
        className="absolute right-0 mt-2 w-[320px] rounded-2xl bg-white ring-1 ring-[#EEF0F4] shadow-[0_20px_60px_rgba(16,24,40,0.08),0_2px_8px_rgba(16,24,40,0.06)] p-4"
      >
        <div className="text-center py-4">
          {error ? (
            <p className="text-[#EF4444] text-sm mb-2">{error}</p>
          ) : (
            <p className="text-[#717173] text-sm">No active reward offer</p>
          )}
          <button
            onClick={() => (window.location.href = "/billing")}
            className="mt-3 text-[#4F55F1] text-sm font-medium hover:underline"
          >
            View billing & plans
          </button>
        </div>
      </motion.div>
    );
  }

  // Main render based on status
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16 }}
      className="absolute right-0 mt-2 w-[320px] rounded-2xl bg-white ring-1 ring-[#EEF0F4] shadow-[0_20px_60px_rgba(16,24,40,0.08),0_2px_8px_rgba(16,24,40,0.06)] p-4"
      style={{
        fontFamily:
          '"Aeonik Pro","Aeonik",-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center shadow-sm">
          <PiGift className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-[16px] font-semibold text-[#111827]">
            {reward.status === "claimed"
              ? "Reward Claimed!"
              : reward.status === "unlocked"
              ? "Reward Unlocked!"
              : reward.status === "expired"
              ? "Offer Expired"
              : "Welcome Bonus"}
          </h3>
          <p className="text-[13px] text-[#717173]">
            {reward.status === "claimed"
              ? `You earned ${reward.reward_credits} bonus credits`
              : reward.status === "unlocked"
              ? "Claim your free credits now!"
              : reward.status === "expired"
              ? "This offer has ended"
              : `Use ${reward.credits_goal} credits to unlock ${reward.reward_credits} free`}
          </p>
        </div>
      </div>

      {/* Progress bar - show for active and unlocked */}
      {(reward.status === "active" || reward.status === "unlocked") && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-medium text-[#111827]">
              {reward.credits_used} / {reward.credits_goal}
            </span>
            <span className="text-[13px] text-[#717173]">{reward.progress_percent}%</span>
          </div>
          <div className="h-2.5 bg-[#E9ECF2] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, reward.progress_percent)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                reward.status === "unlocked"
                  ? "bg-gradient-to-r from-[#10B981] to-[#059669]"
                  : "bg-gradient-to-r from-[#4F55F1] to-[#7C3AED]"
              }`}
            />
          </div>
        </div>
      )}

      {/* Credits remaining info - only for active */}
      {reward.status === "active" && (
        <div className="bg-[#F7F7F7] rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#717173]">Credits to go</span>
            <span className="text-[16px] font-bold text-[#111827]">
              {reward.credits_remaining_to_goal}
            </span>
          </div>
        </div>
      )}

      {/* Deadline info - for active status */}
      {reward.status === "active" && reward.deadline_at && (
        <>
          <div className="flex items-center justify-between text-[12px] mb-2 px-1">
            <span className="text-[#717173]">Expires on</span>
            <span className="text-[#111827] font-medium">{formatDeadline(reward.deadline_at)}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#717173] mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {formatTimeRemaining(reward.time_remaining_seconds)}
          </div>
        </>
      )}

      {/* Unlocked success message */}
      {reward.status === "unlocked" && (
        <div className="bg-gradient-to-br from-[#FFF9E6] to-[#FFF3CD] rounded-xl p-3 mb-4 border border-[#FFE082]">
          <div className="flex items-center gap-2">
            <PiCheckCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-[#92400E]">
                Goal reached! You used {reward.credits_used} credits
              </p>
              {reward.unlocked_at && (
                <p className="text-[11px] text-[#B45309]">
                  Unlocked on {formatDeadline(reward.unlocked_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claimed success message */}
      {reward.status === "claimed" && (
        <div className="bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] rounded-xl p-3 mb-4 border border-[#6EE7B7]">
          <div className="flex items-center gap-2">
            <PiCheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-[#065F46]">
                +{reward.reward_credits} credits added to your account
              </p>
              {reward.claimed_at && (
                <p className="text-[11px] text-[#047857]">
                  Claimed on {formatDeadline(reward.claimed_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expired message */}
      {reward.status === "expired" && (
        <div className="bg-[#FEF2F2] rounded-xl p-3 mb-4 border border-[#FECACA]">
          <div className="flex items-center gap-2">
            <PiXCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
            <p className="text-[13px] text-[#991B1B]">
              You used {reward.credits_used}/{reward.credits_goal} credits before the deadline
            </p>
          </div>
        </div>
      )}

      {/* Action Button */}
      {reward.status === "active" && (
        <button
          disabled
          className="w-full h-12 rounded-full bg-[#E9ECF2] text-[#9CA3AF] font-medium text-[14px] flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <PiCoinsDuotone className="w-5 h-5" />
          Claim {reward.reward_credits} Credits
        </button>
      )}

      {reward.status === "unlocked" && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full h-12 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8960C] hover:from-[#C9A227] hover:to-[#A68508] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {claiming ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <PiCoinsDuotone className="w-5 h-5 text-white" />
              Claim {reward.reward_credits} Credits
            </>
          )}
        </button>
      )}

      {reward.status === "claimed" && (
        <button
          disabled
          className="w-full h-12 rounded-full bg-[#ECFDF5] text-[#10B981] font-semibold text-[14px] flex items-center justify-center gap-2 cursor-default border border-[#6EE7B7]"
        >
          <PiCheckCircle className="w-5 h-5" />
          Claimed
        </button>
      )}

      {reward.status === "expired" && (
        <button
          disabled
          className="w-full h-12 rounded-full bg-[#FEF2F2] text-[#EF4444] font-medium text-[14px] flex items-center justify-center gap-2 cursor-default border border-[#FECACA]"
        >
          <PiXCircle className="w-5 h-5" />
          Expired
        </button>
      )}

      {/* Link to billing */}
      <button
        onClick={() => (window.location.href = "/billing")}
        className="w-full mt-3 text-[#4F55F1] text-[12px] font-medium hover:underline text-center"
      >
        View billing & plans
      </button>
    </motion.div>
  );
}
