import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Transaction {
  id: string | number;
  change: number;
  amount: number;
  reason: string;
  ts: string;
}

export default function AccountPage() {
  const { session, userInfo } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    fetchLedger();
  }, [session, offset]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/account/ledger?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch ledger");

      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getCategoryFromReason = (reason: string) => {
    const lower = reason.toLowerCase();
    if (lower.includes("purchase")) return "purchase";
    if (lower.includes("renewal")) return "renewal";
    if (lower.includes("refund")) return "refund";
    if (lower.includes("deduction") || lower.includes("job")) return "usage";
    if (lower.includes("upgrade") || lower.includes("downgrade") || lower.includes("change")) return "plan_change";
    if (lower.includes("addon")) return "addon";
    return "other";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      purchase: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      renewal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      refund: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      usage: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      plan_change: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      addon: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      purchase: "Purchase",
      renewal: "Renewal",
      refund: "Refund",
      usage: "Usage",
      plan_change: "Plan Change",
      addon: "Add-on",
      other: "Other",
    };
    return labels[category as keyof typeof labels] || "Transaction";
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const monthlyCredits = userInfo?.credits_remaining ?? 0;
  const addonCredits = userInfo?.addon_credits ?? 0;
  const totalCredits = monthlyCredits + addonCredits;

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-white/60">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Account</h1>
              <p className="text-white/60 mt-2">
                View your credit history and transactions
              </p>
            </div>

            {/* Credit Summary Cards */}
            <div className="flex gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-xs text-white/50 mb-1">Total Credits</p>
                <p className="text-2xl font-bold tabular-nums">
                  {totalCredits.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-xs text-white/50 mb-1">Monthly</p>
                <p className="text-2xl font-bold tabular-nums text-blue-400">
                  {monthlyCredits.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 hover:bg-white/[0.07] transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-xs text-white/50 mb-1">Add-ons</p>
                <p className="text-2xl font-bold tabular-nums text-cyan-400">
                  {addonCredits.toLocaleString()}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02] backdrop-blur-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 bg-white/5">
            <div className="col-span-1 text-xs font-medium text-white/50 uppercase tracking-wider">
              Type
            </div>
            <div className="col-span-4 text-xs font-medium text-white/50 uppercase tracking-wider">
              Description
            </div>
            <div className="col-span-2 text-xs font-medium text-white/50 uppercase tracking-wider">
              Credits
            </div>
            <div className="col-span-2 text-xs font-medium text-white/50 uppercase tracking-wider">
              Amount
            </div>
            <div className="col-span-3 text-xs font-medium text-white/50 uppercase tracking-wider text-right">
              Date
            </div>
          </div>

          {/* Table Body */}
          <AnimatePresence mode="wait">
            {transactions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-16 text-center"
              >
                <p className="text-white/40">No transactions yet</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((txn, index) => {
                  const category = getCategoryFromReason(txn.reason);
                  const isPositive = txn.change > 0;

                  return (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="grid grid-cols-12 gap-4 px-6 py-4 group hover:bg-white/[0.03] transition-all duration-200"
                    >
                      {/* Category Badge */}
                      <div className="col-span-1 flex items-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(
                            category
                          )} group-hover:scale-105 transition-transform`}
                        >
                          {getCategoryLabel(category)}
                        </span>
                      </div>

                      {/* Description */}
                      <div className="col-span-4 flex items-center">
                        <p className="text-sm text-white/90 group-hover:text-white transition-colors">
                          {txn.reason}
                        </p>
                      </div>

                      {/* Credits Change */}
                      <div className="col-span-2 flex items-center">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-rose-400" />
                          )}
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isPositive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {txn.change.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* USD Amount */}
                      <div className="col-span-2 flex items-center">
                        {txn.amount > 0 && (
                          <div className="flex items-center gap-1.5 text-white/60">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span className="text-sm tabular-nums">
                              {txn.amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div className="col-span-3 flex items-center justify-end">
                        <div className="text-right">
                          <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                            {formatDate(txn.ts)}
                          </p>
                          <p className="text-xs text-white/30 mt-0.5">
                            {formatFullDate(txn.ts)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/50">
                  Showing {offset + 1} to {Math.min(offset + limit, total)} of{" "}
                  {total} transactions
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="px-3 py-1.5 text-sm text-white/80">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
