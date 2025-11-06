"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  XCircle,
} from "lucide-react";
import InlineLoader from "../../components/InlineLoader";
import { API_URL } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";

/**
 * ---------------------------------------------------------------------
 * Revolut visual tokens (color, radii, spacing, type)
 * ---------------------------------------------------------------------
 * Canvas: #F7F7F7
 * Brand:  #4F55F1
 * Neutral text: #111 (titles), #717173 (secondary)
 * Divider: #E2E2E7
 * Corner: 16px
 * Grid: 8px
 * Type: Aeonik Pro system with 400/500/600
 */
const BRAND = "#4F55F1";
const CANVAS = "#F7F7F7";
const DIVIDER = "#E2E2E7";
const SECONDARY = "#717173";
const RADIUS = "16px";

type JobStatus = "pending" | "in_progress" | "succeeded" | "failed";

interface Job {
  id: string;
  status: JobStatus;
  filename: string;
  rows: number;
  created_at: number;
  finished_at: number | null;
  error: string | null;
  progress?: number;
  message?: string | null;
}

function formatJobMessage(message?: string | null) {
  if (!message) return "";
  if (message.toLowerCase().startsWith("global progress")) {
    const match = message.match(/\(([^)]+)\)\s*$/);
    if (match) {
      return match[1];
    }
  }
  return message;
}

type JobDetail = Job & {
  result_path: string | null;
};

interface JobProgressPayload {
  percent: number;
  message: string;
  status: JobStatus;
}

interface MonthTab {
  value: string;
  label: string;
}

interface GroupedJobs {
  key: string;
  label: string;
  jobs: Job[];
  sortKey: number;
}

interface DetailPanelProps {
  job: JobDetail | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onDownload: () => void;
  downloading: boolean;
  isMobile?: boolean;
}

const PAGE_SIZE = 20;

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});
const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getDayLabel(date: Date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffInMs = today.getTime() - thatDay.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  return DAY_FORMATTER.format(date);
}

function formatTime(date: Date) {
  return TIME_FORMATTER.format(date);
}

/**
 * Status visuals: subdued, flat, monochrome with light chips
 */
type StatusVisual = {
  label: string;
  icon: typeof CheckCircle2;
  iconColor: string;
  chipBorder: string;
  chipBg: string;
  chipText: string;
};

function getStatusVisuals(status: JobStatus): StatusVisual {
  switch (status) {
    case "succeeded":
      return {
        label: "Completed",
        icon: CheckCircle2,
        iconColor: BRAND,
        chipBorder: "1px solid #DEE0EA",
        chipBg: "#F7F7FF",
        chipText: BRAND,
      };
    case "failed":
      return {
        label: "Failed",
        icon: XCircle,
        iconColor: "#B42318",
        chipBorder: "1px solid #F3D2D0",
        chipBg: "#FFF5F5",
        chipText: "#B42318",
      };
    case "in_progress":
    case "pending":
    default:
      return {
        label: "In progress",
        icon: Clock3,
        iconColor: SECONDARY,
        chipBorder: `1px solid ${DIVIDER}`,
        chipBg: "#FAFAFB",
        chipText: SECONDARY,
      };
  }
}

/**
 * Compact, monochrome status icon (no colored container)
 */
function StatusIcon({ status }: { status: JobStatus }) {
  const config = getStatusVisuals(status);
  const Icon = config.icon;
  return (
    <Icon
      className="h-5 w-5 flex-shrink-0"
      style={{ color: config.iconColor }}
      aria-hidden
    />
  );
}

/**
 * Quiet chip used for status
 */
function StatusChip({ status, progress }: { status: JobStatus; progress?: number }) {
  const config = getStatusVisuals(status);
  const text =
    (status === "pending" || status === "in_progress") && typeof progress === "number"
      ? `${Math.round(progress)}%`
      : config.label;
  return (
    <span
      className="inline-flex items-center rounded-[12px] px-2.5 py-1 text-xs font-medium"
      style={{
        border: config.chipBorder,
        background: config.chipBg,
        color: config.chipText,
      }}
    >
      {text}
    </span>
  );
}

/**
 * Slim progress bar with no gradient
 */
function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="w-full h-[2px] rounded-[1px] overflow-hidden"
      style={{ background: DIVIDER }}
    >
      <motion.div
        className="h-full"
        style={{ background: BRAND }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const selectedJobIdRef = useRef<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const jobsRef = useRef<Job[]>([]);
  const historyHasDrawer = useRef(false);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  const updateJobInList = useCallback((jobId: string, updates: Partial<Job>) => {
    setJobs((prev) => {
      const next = prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job));
      jobsRef.current = next;
      return next;
    });
  }, []);

  const fetchJobDetailById = useCallback(
    async (jobId: string) => {
      if (!session) throw new Error("Missing session");
      const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch job");
      const data: JobDetail = await res.json();
      return data;
    },
    [session]
  );

  const loadJobDetail = useCallback(
    async (jobId: string, options: { silent?: boolean } = {}) => {
      if (!session) return;
      const { silent = false } = options;
      if (!silent) {
        setDetailLoading(true);
        setDetailError(null);
      }
      try {
        const data = await fetchJobDetailById(jobId);
        if (selectedJobIdRef.current !== jobId) return;
        setSelectedJob(data);
        setDetailError(null);
        updateJobInList(jobId, {
          status: data.status,
          finished_at: data.finished_at,
          error: data.error,
          rows: data.rows,
          filename: data.filename,
          progress: data.progress,
          message: data.message ?? null,
        });
      } catch (error) {
        if (selectedJobIdRef.current !== jobId) return;
        setDetailError("We couldn't load this job. Please try again.");
      } finally {
        if (!silent && selectedJobIdRef.current === jobId) {
          setDetailLoading(false);
        }
      }
    },
    [session, fetchJobDetailById, updateJobInList]
  );

  const fetchJobs = useCallback(
    async (
      offsetParam: number,
      options: { reset?: boolean; silent?: boolean; limit?: number } = {}
    ) => {
      if (!session) return;
      const { reset = false, silent = false } = options;
      const limit = options.limit ?? PAGE_SIZE;
      const showFullLoader = reset && offsetParam === 0 && !silent && jobsRef.current.length === 0;

      if (showFullLoader) {
        setLoading(true);
      } else if (!reset) {
        setLoadingMore(true);
      }

      try {
        const res = await fetch(`${API_URL}/jobs?offset=${offsetParam}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data: Job[] = await res.json();

        setJobs((prev) => {
          let next: Job[];
          if (reset) {
            next = data;
          } else {
            const map = new Map<string, Job>();
            prev.forEach((job) => map.set(job.id, job));
            data.forEach((job) => {
              const existing = map.get(job.id);
              map.set(job.id, { ...existing, ...job });
            });
            next = Array.from(map.values());
          }
          jobsRef.current = next;
          return next;
        });

        setHasMore(data.length === limit);
        setOffset(reset ? data.length : offsetParam + data.length);
      } catch {
        // silent
      } finally {
        if (showFullLoader || (reset && offsetParam === 0 && !silent)) {
          setLoading(false);
        }
        setLoadingMore(false);
      }
    },
    [session]
  );

  const refreshJobs = useCallback(() => {
    const currentCount = jobsRef.current.length;
    fetchJobs(0, {
      reset: true,
      silent: true,
      limit: Math.max(currentCount, PAGE_SIZE),
    });
  }, [fetchJobs]);

  useEffect(() => {
    if (!session) return;
    fetchJobs(0, { reset: true });
  }, [session, fetchJobs]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      refreshJobs();
    }, 2000);
    return () => clearInterval(interval);
  }, [session, refreshJobs]);

  const routerId = router.query?.id;

  useEffect(() => {
    if (!router.isReady) return;

    if (!routerId) {
      setSelectedJobId(null);
      setSelectedJob(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const idValue = Array.isArray(routerId) ? routerId[0] : routerId;
    setSelectedJobId(idValue);
  }, [router.isReady, routerId]);

  useEffect(() => {
    if (!selectedJobId) return;
    loadJobDetail(selectedJobId);
  }, [selectedJobId, loadJobDetail]);

  useEffect(() => {
    if (!session || !selectedJobId || !selectedJob) return;
    if (selectedJob.status === "succeeded" || selectedJob.status === "failed") return;

    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`${API_URL}/jobs/${selectedJobId}/progress`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data: JobProgressPayload = await res.json();
        if (cancelled) return;

        setSelectedJob((prev) =>
          prev
            ? {
                ...prev,
                status: data.status,
                progress: data.percent,
                message: data.message,
              }
            : prev
        );
        updateJobInList(selectedJobId, {
          status: data.status,
          progress: data.percent,
          message: data.message,
        });

        if (data.status === "succeeded" || data.status === "failed") {
          clearInterval(interval);
          await loadJobDetail(selectedJobId, { silent: true });
        }
      } catch {
        // silent
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, selectedJobId, selectedJob, loadJobDetail, updateJobInList]);

  useEffect(() => {
    if (!selectedJobId) return;
    const matching = jobs.find((job) => job.id === selectedJobId);
    if (matching) {
      setSelectedJob((prev) => (prev ? { ...prev, ...matching } : prev));
    }
  }, [jobs, selectedJobId]);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => b.created_at - a.created_at);
  }, [jobs]);

  const monthTabs = useMemo<MonthTab[]>(() => {
    const seen = new Map<string, string>();
    sortedJobs.forEach((job) => {
      const date = new Date(job.created_at);
      const key = getMonthKey(date);
      if (!seen.has(key)) {
        seen.set(key, MONTH_FORMATTER.format(date));
      }
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [sortedJobs]);

  useEffect(() => {
    if (monthTabs.length === 0) {
      setActiveMonth(null);
      return;
    }
    setActiveMonth((prev) => {
      if (prev && monthTabs.some((tab) => tab.value === prev)) {
        return prev;
      }
      return monthTabs[0]?.value ?? null;
    });
  }, [monthTabs]);

  useEffect(() => {
    if (!selectedJobId) return;
    const match = sortedJobs.find((job) => job.id === selectedJobId);
    if (!match) return;
    const monthKey = getMonthKey(new Date(match.created_at));
    setActiveMonth((prev) => (prev === monthKey ? prev : monthKey));
  }, [sortedJobs, selectedJobId]);

  const filteredJobs = useMemo(() => {
    if (!activeMonth) return sortedJobs;
    return sortedJobs.filter((job) => {
      const date = new Date(job.created_at);
      return getMonthKey(date) === activeMonth;
    });
  }, [sortedJobs, activeMonth]);

  const groupedJobs = useMemo<GroupedJobs[]>(() => {
    const map = new Map<string, GroupedJobs>();
    filteredJobs.forEach((job) => {
      const date = new Date(job.created_at);
      const key = getDayKey(date);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: getDayLabel(date),
          jobs: [],
          sortKey: date.getTime(),
        });
      }
      map.get(key)?.jobs.push(job);
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        jobs: group.jobs.sort((a, b) => b.created_at - a.created_at),
      }))
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [filteredJobs]);

  const openJob = useCallback(
    (id: string) => {
      if (!router.isReady || id === selectedJobId) return;
      const query = { ...router.query, id };
      if (selectedJobId) {
        router.replace({ pathname: "/jobs", query }, undefined, { shallow: true });
      } else {
        historyHasDrawer.current = true;
        router.push({ pathname: "/jobs", query }, undefined, { shallow: true });
      }
    },
    [router, selectedJobId]
  );

  const closeDrawer = useCallback(() => {
    const query = { ...router.query };
    delete (query as Record<string, unknown>).id;

    setSelectedJob(null);
    setSelectedJobId(null);
    setDetailError(null);
    setDetailLoading(false);

    if (historyHasDrawer.current) {
      historyHasDrawer.current = false;
      router.back();
    } else {
      router.replace({ pathname: "/jobs", query }, undefined, { shallow: true });
    }
  }, [router]);

  const handleRetry = useCallback(() => {
    if (selectedJobId) {
      loadJobDetail(selectedJobId);
    }
  }, [selectedJobId, loadJobDetail]);

  const handleDownload = useCallback(async () => {
    if (!session || !selectedJob || downloading) return;
    try {
      setDownloading(true);
      const res = await fetch(`${API_URL}/jobs/${selectedJob.id}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedJob.filename || "result.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  }, [session, selectedJob, downloading]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchJobs(offset, { limit: PAGE_SIZE });
  }, [hasMore, loadingMore, fetchJobs, offset]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: CANVAS }}>
        <InlineLoader />
        <FontAndTokens />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: CANVAS }}>
      <FontAndTokens />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 md:px-8">
        <div className={`transition-[padding] duration-200 ${selectedJobId ? "md:pr-[380px] lg:pr-[420px]" : ""}`}>
          {/* Page header */}
          <header className="mb-4">
            <h1 className="text-[22px] md:text-2xl font-semibold leading-tight text-[#111111]">Transactions</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Browse every personalization job in a clean timeline.
            </p>
          </header>

          {/* Month scroller */}
          {monthTabs.length > 0 && (
            <div className="relative mt-4">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {monthTabs.map((tab) => {
                  const isActive = tab.value === activeMonth;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveMonth(tab.value)}
                      className="relative whitespace-nowrap text-sm font-medium px-0 py-1 text-[#111111]"
                      style={{ opacity: isActive ? 1 : 0.55 }}
                    >
                      {tab.label}
                      {isActive && (
                        <span
                          className="absolute left-0 right-0 -bottom-[10px] block h-[2px]"
                          style={{ background: BRAND, borderRadius: "1px" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="h-px w-full" style={{ background: DIVIDER }} />
            </div>
          )}

          {/* Groups */}
          <main className="mt-6">
            {groupedJobs.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-[16px] border px-6 py-10 text-center"
                style={{ borderColor: DIVIDER, background: "#FFFFFF" }}
              >
                <FileText className="h-8 w-8" style={{ color: SECONDARY }} />
                <h2 className="mt-3 text-base font-semibold text-[#111111]">No jobs yet</h2>
                <p className="mt-1 text-sm" style={{ color: SECONDARY }}>
                  Upload a CSV to see your jobs here.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedJobs.map((group) => (
                  <section key={group.key}>
                    <div className="mb-2 flex items-center gap-3 px-1">
                      <span className="text-xs font-medium" style={{ color: SECONDARY }}>
                        {group.label}
                      </span>
                      <span className="h-px flex-1" style={{ background: DIVIDER }} />
                    </div>

                    <div className="divide-y rounded-[16px] border" style={{ borderColor: DIVIDER, background: "#FFFFFF" }}>
                      {group.jobs.map((job) => {
                        const isActive = job.id === selectedJobId;
                        const formattedMessage = formatJobMessage(job.message);
                        return (
                          <button
                            key={job.id}
                            type="button"
                            onClick={() => openJob(job.id)}
                            className="group grid w-full grid-cols-[20px_1fr_auto] items-center gap-3 px-4 py-3 text-left transition-colors"
                            style={{
                              background: isActive ? "#FAFAFF" : "#FFFFFF",
                            }}
                          >
                            <StatusIcon status={job.status} />

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#111111]">
                                  {job.filename}
                                </p>
                                <span className="hidden md:block text-xs tabular-nums" style={{ color: SECONDARY }}>
                                  {formatTime(new Date(job.created_at))}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: SECONDARY }}>
                                <StatusChip status={job.status} progress={job.progress} />
                                <span>{job.rows.toLocaleString()} rows</span>
                                {job.status === "failed" && job.error ? (
                                  <span style={{ color: "#B42318" }}>{job.error}</span>
                                ) : null}
                              </div>

                              {formattedMessage && job.status !== "failed" && (
                                <p className="mt-1 truncate text-xs" style={{ color: SECONDARY }}>
                                  {formattedMessage}
                                </p>
                              )}

                              {(job.status === "pending" || job.status === "in_progress") && (
                                <div className="mt-2">
                                  <ProgressBar value={job.progress ?? 0} />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="md:hidden text-xs tabular-nums" style={{ color: SECONDARY }}>
                                {formatTime(new Date(job.created_at))}
                              </span>
                              <ArrowRight
                                className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100"
                                style={{ color: SECONDARY }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="rounded-[12px] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      style={{ background: BRAND }}
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Right detail panel */}
        <AnimatePresence>
          {selectedJobId && (
            <>
              {/* Mobile sheet */}
              <motion.div
                key="drawer-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/30 md:hidden"
                onClick={closeDrawer}
              >
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                  className="absolute inset-y-0 right-0 w-full max-w-md bg-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DetailPanel
                    job={selectedJob}
                    isLoading={detailLoading}
                    error={detailError}
                    onClose={closeDrawer}
                    onRetry={handleRetry}
                    onDownload={handleDownload}
                    downloading={downloading}
                    isMobile
                  />
                </motion.div>
              </motion.div>

              {/* Desktop thin panel */}
              <motion.div
                key="drawer-desktop"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-full md:flex md:max-w-sm lg:max-w-md"
              >
                <div
                  className="pointer-events-auto h-full border-l bg-white"
                  style={{ borderColor: DIVIDER }}
                >
                  <DetailPanel
                    job={selectedJob}
                    isLoading={detailLoading && Boolean(selectedJobId)}
                    error={detailError}
                    onClose={closeDrawer}
                    onRetry={handleRetry}
                    onDownload={handleDownload}
                    downloading={downloading}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Detail panel: thin, flat, subdued copy. No glass, no glow.
 */
function DetailPanel({
  job,
  isLoading,
  error,
  onClose,
  onRetry,
  onDownload,
  downloading,
  isMobile = false,
}: DetailPanelProps) {
  const config = job ? getStatusVisuals(job.status) : null;
  const CreatedDate = job ? new Date(job.created_at) : null;
  const FinishedDate = job?.finished_at ? new Date(job.finished_at) : null;
  const formattedMessage = formatJobMessage(job?.message);

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: DIVIDER }}
      >
        <div>
          <p className="text-xs font-medium" style={{ color: SECONDARY }}>
            Details
          </p>
          <h2 className="text-base font-semibold text-[#111111]">Job overview</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[12px] px-3 py-1 text-sm font-medium"
          style={{ border: `1px solid ${DIVIDER}`, color: "#111111" }}
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
        {isLoading ? (
          <div className="flex justify-center pt-12">
            <InlineLoader />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <XCircle className="h-8 w-8" style={{ color: "#B42318" }} />
            <h3 className="mt-3 text-base font-semibold text-[#111111]">Something went wrong</h3>
            <p className="mt-1 text-sm" style={{ color: SECONDARY }}>
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 rounded-[12px] px-4 py-2 text-sm font-medium text-white"
              style={{ background: BRAND }}
            >
              Try again
            </button>
          </div>
        ) : job ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              {config && (
                <config.icon className="h-6 w-6" style={{ color: config.iconColor }} />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-[#111111]">{job.filename}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm" style={{ color: SECONDARY }}>
                  {config && (
                    <span
                      className="inline-flex items-center rounded-[12px] px-2.5 py-1 text-xs font-medium"
                      style={{ border: config.chipBorder, background: config.chipBg, color: config.chipText }}
                    >
                      {config.label}
                    </span>
                  )}
                  <span>{job.rows.toLocaleString()} rows</span>
                </div>
              </div>
            </div>

            <div
              className="space-y-2 rounded-[16px] p-4"
              style={{ background: "#FAFAFB", border: `1px solid ${DIVIDER}` }}
            >
              <DetailRow
                icon={<Calendar className="h-4 w-4" style={{ color: SECONDARY }} />}
                label="Created"
                value={CreatedDate ? `${getDayLabel(CreatedDate)} · ${formatTime(CreatedDate)}` : "—"}
              />
              {FinishedDate && (
                <DetailRow
                  icon={<CheckCircle2 className="h-4 w-4" style={{ color: BRAND }} />}
                  label="Finished"
                  value={`${getDayLabel(FinishedDate)} · ${formatTime(FinishedDate)}`}
                />
              )}
              <DetailRow
                icon={<FileText className="h-4 w-4" style={{ color: SECONDARY }} />}
                label="Job ID"
                value={job.id}
              />
            </div>

            {(job.status === "pending" || job.status === "in_progress") && (
              <div
                className="rounded-[16px] p-4"
                style={{ background: "#FFFFFF", border: `1px solid ${DIVIDER}` }}
              >
                <h4 className="text-sm font-semibold text-[#111111]">Generating your file</h4>
                <p className="mt-1 text-xs" style={{ color: SECONDARY }}>
                  {formattedMessage || "Preparing personalized lines."}
                </p>
                <div className="mt-3">
                  <ProgressBar value={job.progress ?? 0} />
                  <p className="mt-2 text-xs font-medium" style={{ color: BRAND }}>
                    {Math.round(job.progress ?? 0)}% complete
                  </p>
                </div>
              </div>
            )}

            {job.status === "failed" && (
              <div
                className="rounded-[16px] p-4 text-sm"
                style={{ background: "#FFF5F5", border: "1px solid #F3D2D0", color: "#B42318" }}
              >
                <h4 className="text-sm font-semibold">Job failed</h4>
                <p className="mt-1 text-xs">{job.error || "Unknown error"}</p>
              </div>
            )}

            {job.status === "succeeded" && (
              <div
                className="rounded-[16px] p-4"
                style={{ background: "#FFFFFF", border: `1px solid ${DIVIDER}` }}
              >
                <h4 className="text-sm font-semibold text-[#111111]">Ready to download</h4>
                <p className="mt-1 text-xs" style={{ color: SECONDARY }}>
                  Your personalized file is ready.
                </p>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={downloading}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ background: BRAND }}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing…" : "Download file"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileText className="h-10 w-10" style={{ color: SECONDARY }} />
            <h3 className="mt-3 text-base font-semibold text-[#111111]">Pick a job</h3>
            <p className="mt-1 max-w-xs text-sm" style={{ color: SECONDARY }}>
              Select a job to see its progress and metadata.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] px-3 py-2" style={{ background: "#FFFFFF", border: `1px solid ${DIVIDER}` }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: "#F5F5F6" }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: SECONDARY }}>{label}</p>
        <p className="truncate text-sm font-medium text-[#111111]">{value}</p>
      </div>
    </div>
  );
}

/**
 * Global font + CSS variables injected here so this single file is drop-in.
 * Provide Aeonik Pro files at /public/fonts/AeonikPro-*.woff2 for full parity.
 */
function FontAndTokens() {
  return (
    <style jsx global>{`
      :root {
        --brand: ${BRAND};
        --canvas: ${CANVAS};
        --divider: ${DIVIDER};
        --muted: ${SECONDARY};
        --radius: ${RADIUS};
      }
      @font-face {
        font-family: "Aeonik Pro";
        src:
          url("/fonts/AeonikPro-Regular.woff2") format("woff2"),
          url("/fonts/AeonikPro-Regular.woff") format("woff");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "Aeonik Pro";
        src:
          url("/fonts/AeonikPro-Medium.woff2") format("woff2"),
          url("/fonts/AeonikPro-Medium.woff") format("woff");
        font-weight: 500;
        font-style: normal;
        font-display: swap;
      }
      @font-face {
        font-family: "Aeonik Pro";
        src:
          url("/fonts/AeonikPro-Semibold.woff2") format("woff2"),
          url("/fonts/AeonikPro-Semibold.woff") format("woff");
        font-weight: 600;
        font-style: normal;
        font-display: swap;
      }
      html, body, #__next {
        height: 100%;
        background: var(--canvas);
      }
      body {
        font-family: "Aeonik Pro", -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji",
          "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif;
        color: #111111;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      * {
        border-radius: 0; /* reset */
      }
      .rounded-\\[16px\\], .rounded-\\[12px\\] { border-radius: ${RADIUS}; }
      .rounded-\\[10px\\] { border-radius: 10px; }
      .rounded-\\[12px\\] { border-radius: 12px; }
    `}</style>
  );
}
