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

export default function SignupRewardDropdown({ onClose }: SignupRewardDropdownProps) {
  const [reward, setReward] = useState<SignupReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshUserInfo } = useAuth();

  const fetchReward = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup-reward`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reward status");
      }

      const data = await response.json();
      setReward(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reward");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReward();
  }, [fetchReward]);

  const handleClaim = async () => {
    if (!reward || reward.status !== "unlocked" || claiming) return;

    try {
      setClaiming(true);
      setError(null);

      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup-reward/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
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

  // No reward available
  if (!reward || !reward.has_reward) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16 }}
        className="absolute right-0 mt-2 w-[320px] rounded-2xl bg-white ring-1 ring-[#EEF0F4] shadow-[0_20px_60px_rgba(16,24,40,0.08),0_2px_8px_rgba(16,24,40,0.06)] p-4"
      >
        <div className="text-center py-4">
          <p className="text-[#717173] text-sm">No active reward offer</p>
          <button
            onClick={() => window.location.href = '/billing'}
            className="mt-3 text-[#4F55F1] text-sm font-medium hover:underline"
          >
            View billing & plans
          </button>
        </div>
      </motion.div>
    );
  }

  // Render based on status
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
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
          <PiGift className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-[#111827]">
            {reward.status === "claimed"
              ? "Reward Claimed!"
              : reward.status === "unlocked"
              ? "Reward Unlocked!"
              : reward.status === "expired"
              ? "Offer Expired"
              : "Welcome Bonus"}
          </h3>
          <p className="text-[12px] text-[#717173]">
            {reward.status === "claimed"
              ? `You earned ${reward.reward_credits} bonus credits`
              : reward.status === "unlocked"
              ? "Claim your free credits now"
              : reward.status === "expired"
              ? "This offer has ended"
              : `Use ${reward.credits_goal} credits to unlock ${reward.reward_credits} free`}
          </p>
        </div>
      </div>

      {/* Progress section - only show for active status */}
      {reward.status === "active" && (
        <>
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[12px] font-medium text-[#111827]">
                {reward.credits_used} / {reward.credits_goal} credits used
              </span>
              <span className="text-[12px] text-[#717173]">
                {reward.progress_percent}%
              </span>
            </div>
            <div className="h-2 bg-[#E9ECF2] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${reward.progress_percent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#4F55F1] to-[#7C3AED] rounded-full"
              />
            </div>
          </div>

          {/* Credits remaining */}
          <div className="bg-[#F7F7F7] rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#717173]">Credits to go</span>
              <span className="text-[15px] font-semibold text-[#111827]">
                {reward.credits_remaining_to_goal}
              </span>
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center justify-between text-[12px] mb-3">
            <span className="text-[#717173]">Expires</span>
            <span className="text-[#111827] font-medium">
              {formatDeadline(reward.deadline_at)}
            </span>
          </div>

          {/* Time remaining */}
          <div className="flex items-center justify-center gap-1 text-[12px] text-[#717173] mb-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {formatTimeRemaining(reward.time_remaining_seconds)}
          </div>
        </>
      )}

      {/* Unlocked status - show claim info */}
      {reward.status === "unlocked" && (
        <div className="bg-gradient-to-br from-[#FFF9E6] to-[#FFF3CD] rounded-xl p-3 mb-3 border border-[#FFE082]">
          <div className="flex items-center gap-2">
            <PiCheckCircle className="w-5 h-5 text-[#F59E0B]" />
            <div>
              <p className="text-[13px] font-medium text-[#92400E]">
                Goal reached! You used {reward.credits_used} credits
              </p>
              <p className="text-[11px] text-[#B45309]">
                Unlocked on {formatDeadline(reward.unlocked_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Claimed status - show success */}
      {reward.status === "claimed" && (
        <div className="bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] rounded-xl p-3 mb-3 border border-[#6EE7B7]">
          <div className="flex items-center gap-2">
            <PiCheckCircle className="w-5 h-5 text-[#10B981]" />
            <div>
              <p className="text-[13px] font-medium text-[#065F46]">
                +{reward.reward_credits} credits added to your account
              </p>
              <p className="text-[11px] text-[#047857]">
                Claimed on {formatDeadline(reward.claimed_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expired status */}
      {reward.status === "expired" && (
        <div className="bg-[#FEF2F2] rounded-xl p-3 mb-3 border border-[#FECACA]">
          <div className="flex items-center gap-2">
            <PiXCircle className="w-5 h-5 text-[#EF4444]" />
            <p className="text-[13px] text-[#991B1B]">
              You used {reward.credits_used}/{reward.credits_goal} credits before the deadline
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-[#FEF2F2] rounded-lg p-2 mb-3">
          <p className="text-[12px] text-[#DC2626]">{error}</p>
        </div>
      )}

      {/* Claim button - only for unlocked status */}
      {reward.status === "unlocked" && (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full h-11 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8960C] hover:from-[#C9A227] hover:to-[#A68508] text-white font-medium text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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

      {/* Disabled button for active status */}
      {reward.status === "active" && (
        <button
          disabled
          className="w-full h-11 rounded-full bg-[#E9ECF2] text-[#9CA3AF] font-medium text-[14px] flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <PiCoinsDuotone className="w-5 h-5" />
          Claim {reward.reward_credits} Credits
        </button>
      )}

      {/* Claimed button */}
      {reward.status === "claimed" && (
        <button
          disabled
          className="w-full h-11 rounded-full bg-[#ECFDF5] text-[#10B981] font-medium text-[14px] flex items-center justify-center gap-2 cursor-default border border-[#6EE7B7]"
        >
          <PiCheckCircle className="w-5 h-5" />
          Claimed
        </button>
      )}

      {/* Link to billing */}
      <button
        onClick={() => window.location.href = '/billing'}
        className="w-full mt-2 text-[#4F55F1] text-[12px] font-medium hover:underline text-center"
      >
        View billing & plans
      </button>
    </motion.div>
  );
}
