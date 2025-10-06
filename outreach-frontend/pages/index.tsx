"use client";

import { useMemo } from "react";
import { useAuth } from "../lib/AuthProvider";
import { buyCredits } from "../lib/api";
import { loadStripe } from "@stripe/stripe-js";
import { CreditCard } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function Home() {
  const { session, loading, userInfo } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <InlineLoader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] px-6 text-center">
        <h1 className="text-base font-medium text-[#717173]">
          Please log in to continue
        </h1>
      </div>
    );
  }

  const months = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), 0, 1);
    return Array.from({ length: 12 }, (_, index) => {
      const current = new Date(base);
      current.setMonth(index);
      return {
        label: current.toLocaleString("en-US", { month: "long" }),
        value: index,
      };
    });
  }, []);

  const activeMonth = new Date().getMonth();

  const ledgerGroups = useMemo(() => {
    if (!userInfo?.ledger || userInfo.ledger.length === 0) {
      return [];
    }

    const groups: Record<string, { entries: any[] } & { date: Date }> = {};

    userInfo.ledger.forEach((entry: any) => {
      const timestamp = (entry.ts ?? 0) * 1000;
      const date = timestamp ? new Date(timestamp) : new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;

      if (!groups[key]) {
        groups[key] = { date, entries: [] };
      }

      groups[key].entries.push(entry);
    });

    const sortedKeys = Object.keys(groups).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedKeys.map((key) => {
      const value = groups[key];
      const entries = [...value.entries].sort(
        (a, b) => (b.ts ?? 0) - (a.ts ?? 0)
      );

      return {
        key,
        date: value.date,
        entries,
      };
    });
  }, [userInfo?.ledger]);

  const plan = userInfo?.user?.plan_type ?? "No plan";
  const statusRaw = userInfo?.user?.subscription_status ?? "inactive";
  const statusLabel = statusRaw.replace(/_/g, " ");
  const statusDisplay = statusLabel.replace(/\b\w/g, (char) => char.toUpperCase());
  const statusBadgeClass =
    statusRaw.toLowerCase() === "active"
      ? "bg-[#4F55F1]/10 text-[#4F55F1]"
      : "bg-[#E2E2E7] text-[#717173]";
  const creditsRemaining = userInfo?.credits_remaining ?? 0;
  const renewalDate = userInfo?.user?.renewal_date
    ? new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(userInfo.user.renewal_date * 1000))
    : "N/A";

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "long",
      }),
    []
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  const formatDayHeading = (date: Date) => dayFormatter.format(date);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) {
      return "Pending";
    }

    return timeFormatter.format(new Date(timestamp * 1000));
  };

  const formatAmount = (value: number) =>
    `${value > 0 ? "+" : ""}${value} credits`;

  const handleBuyCredits = async () => {
    try {
      if (!session) {
        throw new Error("No active session");
      }

      const plan = (userInfo?.user?.plan_type || "free").toLowerCase();
      const token = session.access_token;
      const data = await buyCredits(token, {
        plan,
        addon: true,
        quantity: 1,
        user_id: userInfo?.id,
      });

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.id,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Error buying credits:", err);
      alert("Failed to start credit purchase");
    }
  };

  return (
    <div className="flex flex-col gap-10 text-[#111827]">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-[#717173]">
              Overview
            </p>
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-[#111827]">
                Transactions
              </h1>
              <p className="text-sm text-[#717173]">
                Hello, {session.user.email}
              </p>
            </div>
          </div>
          {(userInfo?.credits_remaining ?? 0) <= 0 && (
            <button
              onClick={handleBuyCredits}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4F55F1] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(79,85,241,0.32)] transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_16px_30px_rgba(79,85,241,0.4)] active:translate-y-[1px]"
            >
              <CreditCard className="h-4 w-4" />
              Buy +1000 Credits ($10)
            </button>
          )}
        </div>

        <div className="-mx-2 flex gap-2 overflow-x-auto pb-1">
          {months.map((month) => (
            <button
              key={month.value}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                month.value === activeMonth
                  ? "bg-[#4F55F1] text-white shadow-[0_10px_20px_rgba(79,85,241,0.25)]"
                  : "bg-transparent text-[#717173] hover:bg-[#E2E2E7]"
              }`}
              type="button"
            >
              {month.label}
            </button>
          ))}
        </div>
      </header>

      {userInfo && (
        <section className="rounded-[32px] border border-[#E2E2E7] bg-white p-8 shadow-[0_32px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#717173]">
                Active plan
              </p>
              <div>
                <h2 className="text-2xl font-semibold text-[#111827]">
                  {plan}
                </h2>
                <p className="text-sm text-[#717173]">
                  {session.user.email}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${statusBadgeClass}`}
            >
              {statusDisplay.toUpperCase()}
            </span>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-[#717173]">
                Credits remaining
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-[#111827]">
                {creditsRemaining}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[#717173]">
                Renewal date
              </p>
              <p className="mt-3 text-lg font-medium text-[#111827]">
                {renewalDate}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[#717173]">
                Plan status
              </p>
              <p className="mt-3 text-lg font-medium text-[#111827]">
                {statusDisplay}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-[32px] border border-[#E2E2E7] bg-white p-6 sm:p-8 shadow-[0_28px_60px_rgba(15,23,42,0.05)]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#111827]">
            Recent transactions
          </h3>
          <span className="text-xs font-medium uppercase tracking-[0.24em] text-[#717173]">
            Ledger
          </span>
        </div>

        {ledgerGroups.length > 0 ? (
          <div className="space-y-10">
            {ledgerGroups.map((group) => (
              <div key={group.key} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#717173]">
                    {formatDayHeading(group.date)}
                  </span>
                  <span className="h-px flex-1 bg-[#E2E2E7]" />
                </div>
                <div className="space-y-2">
                  {group.entries.map((entry: any, idx: number) => (
                    <div
                      key={`${group.key}-${idx}`}
                      className="flex items-center justify-between rounded-2xl px-4 py-4 transition-colors duration-150 hover:bg-[#F7F7F7]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F7F7F7] text-base font-semibold text-[#4F55F1]">
                          {entry.change > 0 ? "CR" : "DR"}
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-medium text-[#111827]">
                            {entry.reason}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-[#717173]">
                            <span>{formatTime(entry.ts)}</span>
                            <span className="inline-flex items-center rounded-full bg-[#E2E2E7] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#717173]">
                              {entry.change > 0 ? "Completed" : "Debited"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-semibold ${
                            entry.change > 0 ? "text-[#111827]" : "text-[#717173]"
                          }`}
                        >
                          {formatAmount(entry.change)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E2E2E7] bg-[#F7F7F7]/40 px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
              <span className="text-sm font-semibold text-[#4F55F1]">AP</span>
            </div>
            <h4 className="text-lg font-semibold text-[#111827]">
              No recent transactions
            </h4>
            <p className="mt-2 max-w-xs text-sm text-[#717173]">
              New credits and debits will appear here in a clean, Revolut-style ledger as soon as they happen.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
