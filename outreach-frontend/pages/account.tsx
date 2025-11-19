import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/AuthProvider";
import { API_URL } from "../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDescription = (reason: string, change: number): string => {
    const lower = reason.toLowerCase();

    // Remove job UUIDs (pattern: job-XXXXX or similar)
    let cleaned = reason.replace(/job-[a-zA-Z0-9-]+/gi, "").trim();

    // Format standard billing statements
    if (lower.includes("deduction") && lower.includes("monthly")) {
      return "Monthly credits deducted for job processing";
    }
    if (lower.includes("deduction") && lower.includes("addon")) {
      return "Add-on credits deducted for job processing";
    }
    if (lower.includes("deduction")) {
      return "Credits deducted for job processing";
    }
    if (lower.includes("renewal") || lower.includes("subscription_cycle")) {
      return "Monthly subscription renewal";
    }
    if (lower.includes("purchase") && lower.includes("addon")) {
      return "Add-on credits purchase";
    }
    if (lower.includes("purchase") || lower.includes("checkout")) {
      return "Subscription plan purchase";
    }
    if (lower.includes("refund")) {
      return "Refund processed";
    }
    if (lower.includes("upgrade")) {
      return "Plan upgrade";
    }
    if (lower.includes("downgrade")) {
      return "Plan downgrade";
    }

    // Capitalize first letter if it's a custom reason
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const monthlyCredits = userInfo?.credits_remaining ?? 0;
  const addonCredits = userInfo?.addon_credits ?? 0;
  const totalCredits = monthlyCredits + addonCredits;

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 animate-spin" />
          <p className="text-sm text-gray-500">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
                Transactions
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Complete transaction history for your account
              </p>
            </div>

            {/* Credit Summary Cards */}
            <div className="flex gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 bg-gray-50 p-4 min-w-[140px]"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                  Total Credits
                </p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {totalCredits.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="border border-gray-200 bg-gray-50 p-4 min-w-[140px]"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                  Monthly
                </p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {monthlyCredits.toLocaleString()}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="border border-gray-200 bg-gray-50 p-4 min-w-[140px]"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                  Add-ons
                </p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">
                  {addonCredits.toLocaleString()}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3.5 border-b border-gray-200 bg-gray-50">
            <div className="col-span-5 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Description
            </div>
            <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Credits
            </div>
            <div className="col-span-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Amount
            </div>
            <div className="col-span-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
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
                className="px-6 py-16 text-center border-b border-gray-100"
              >
                <p className="text-gray-400">No transactions found</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transactions.map((txn, index) => {
                  const isPositive = txn.change > 0;
                  const description = formatDescription(txn.reason, txn.change);

                  return (
                    <motion.div
                      key={txn.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                    >
                      {/* Description */}
                      <div className="col-span-5 flex items-center">
                        <p className="text-sm text-gray-900 font-medium">
                          {description}
                        </p>
                      </div>

                      {/* Credits Change */}
                      <div className="col-span-2 flex items-center">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            isPositive ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {txn.change.toLocaleString()}
                        </span>
                      </div>

                      {/* USD Amount */}
                      <div className="col-span-2 flex items-center">
                        {txn.amount > 0 ? (
                          <span className="text-sm text-gray-700 tabular-nums font-medium">
                            ${txn.amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="col-span-3 flex items-center justify-end">
                        <div className="text-right">
                          <p className="text-sm text-gray-900 font-medium">
                            {formatDate(txn.ts)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatTime(txn.ts)}
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
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {offset + 1} to {Math.min(offset + limit, total)} of{" "}
                  {total} transactions
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <span className="px-4 py-2 text-sm text-gray-700 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="inline-flex items-center gap-1 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
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
