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

type StatusVisual = {
  label: string;
  icon: typeof CheckCircle2;
  iconBg: string;
  iconColor: string;
  pillBg: string;
  pillColor: string;
};

function getStatusVisuals(status: JobStatus): StatusVisual {
  switch (status) {
    case "succeeded":
      return {
        label: "Completed",
        icon: CheckCircle2,
        iconBg: "bg-[#E4E5FF]",
        iconColor: "#4F55F1",
        pillBg: "bg-[#E4E5FF]",
        pillColor: "text-[#4F55F1]",
      };
    case "failed":
      return {
        label: "Failed",
        icon: XCircle,
        iconBg: "bg-[#FFE8E8]",
        iconColor: "#DC2F2F",
        pillBg: "bg-[#FFE8E8]",
        pillColor: "text-[#DC2F2F]",
      };
    case "in_progress":
    case "pending":
    default:
      return {
        label: "In progress",
        icon: Clock3,
        iconBg: "bg-[#EFEFF2]",
        iconColor: "#717173",
        pillBg: "bg-[#EFEFF2]",
        pillColor: "text-[#54545b]",
      };
  }
}

function StatusIcon({ status }: { status: JobStatus }) {
  const config = getStatusVisuals(status);
  const Icon = config.icon;
  return (
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${config.iconBg}`}>
      <Icon className="h-6 w-6" style={{ color: config.iconColor }} />
    </div>
  );
}

function StatusPill({ status, progress }: { status: JobStatus; progress?: number }) {
  const config = getStatusVisuals(status);
  let label = config.label;

  if ((status === "pending" || status === "in_progress") && typeof progress === "number") {
    label = `${Math.round(progress)}%`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${config.pillBg} ${config.pillColor}`}
    >
      {label}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#E2E2E7]">
      <motion.div
        className="absolute left-0 top-0 h-full rounded-full"
        style={{ background: "linear-gradient(135deg, #4F55F1 0%, #8F94FF 100%)" }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
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
        console.error("Error fetching job detail:", error);
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
      } catch (error) {
        console.error("Error fetching jobs:", error);
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
      } catch (error) {
        console.error("Error fetching progress:", error);
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
      if (!res.ok) {
        throw new Error("Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedJob.filename || "result.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  }, [session, selectedJob, downloading]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchJobs(offset, { limit: PAGE_SIZE });
  }, [hasMore, loadingMore, fetchJobs, offset]);

  const isDrawerOpen = Boolean(selectedJobId);
  const containerBaseClasses =
    "mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-12 md:px-8";
  const containerClasses = isDrawerOpen
    ? `${containerBaseClasses} md:grid md:grid-cols-[minmax(0,1fr)_360px] md:gap-10`
    : containerBaseClasses;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
        <InlineLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className={containerClasses}>
        <div className="min-w-0">
          <header className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-[#717173]">
              Timeline
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900">Jobs</h1>
            <p className="text-sm text-[#717173]">
              Review and revisit every personalized outreach file you have generated.
            </p>
          </header>

          {monthTabs.length > 0 && (
            <div className="mt-8 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
              {monthTabs.map((tab) => {
                const isActive = tab.value === activeMonth;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveMonth(tab.value)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition-colors ${
                      isActive
                        ? "bg-[#4F55F1] text-white shadow-[0_12px_24px_rgba(79,85,241,0.3)]"
                        : "bg-white/70 text-[#717173] hover:bg-[#E2E2E7]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}

          {groupedJobs.length === 0 ? (
            <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#D8D8DE] bg-white/70 p-12 text-center shadow-sm">
              <FileText className="h-10 w-10 text-[#717173]" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">No jobs yet</h2>
              <p className="mt-2 max-w-xs text-sm text-[#717173]">
                Upload a CSV to see your personalization jobs appear here in a Revolut-style timeline.
              </p>
            </div>
          ) : (
            <div className="mt-10 space-y-8">
              {groupedJobs.map((group) => (
                <section key={group.key} className="space-y-3">
                  <div className="flex items-center gap-3 px-1 text-xs font-semibold uppercase tracking-[0.26em] text-[#717173]">
                    <span>{group.label}</span>
                    <span className="h-px flex-1 bg-[#E2E2E7]" />
                  </div>
                  <div className="space-y-2">
                    {group.jobs.map((job) => {
                      const isActive = job.id === selectedJobId;
                      return (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => openJob(job.id)}
                          className={`relative w-full rounded-3xl border border-transparent bg-white/80 px-5 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#E2E2E7] ${
                            isActive
                              ? "border-[#4F55F1] bg-white shadow-[0_20px_45px_rgba(79,85,241,0.16)]"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <StatusIcon status={job.status} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3">
                                <p className="flex-1 truncate text-[15px] font-semibold text-gray-900">
                                  {job.filename}
                                </p>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#717173]">
                                  {formatTime(new Date(job.created_at))}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#717173]">
                                <StatusPill status={job.status} progress={job.progress} />
                                <span>{job.rows.toLocaleString()} rows</span>
                                {job.status === "failed" && job.error ? (
                                  <span className="text-[#DC2F2F]">{job.error}</span>
                                ) : null}
                              </div>
                              {job.message && job.status !== "failed" && (
                                <p className="mt-1 truncate text-xs text-[#717173]">{job.message}</p>
                              )}
                              {(job.status === "pending" || job.status === "in_progress") && (
                                <div className="mt-3">
                                  <ProgressBar value={job.progress ?? 0} />
                                </div>
                              )}
                            </div>
                            <ArrowRight
                              className={`h-5 w-5 flex-shrink-0 transition-colors ${
                                isActive ? "text-[#4F55F1]" : "text-[#717173]"
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_26px_rgba(79,85,241,0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #4F55F1 0%, #8186FF 100%)" }}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isDrawerOpen && (
          <aside className="hidden md:block">
            <DetailPanel
              job={selectedJob}
              isLoading={detailLoading && Boolean(selectedJobId)}
              error={detailError}
              onClose={closeDrawer}
              onRetry={handleRetry}
              onDownload={handleDownload}
              downloading={downloading}
            />
          </aside>
        )}
      </div>

      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={closeDrawer}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="absolute inset-y-0 right-0 w-full max-w-md bg-white"
              onClick={(event) => event.stopPropagation()}
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
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const radiusClass = isMobile ? "rounded-l-3xl" : "rounded-3xl";
  const config = job ? getStatusVisuals(job.status) : null;
  const CreatedDate = job ? new Date(job.created_at) : null;
  const FinishedDate = job?.finished_at ? new Date(job.finished_at) : null;

  return (
    <div
      className={`flex h-full flex-col ${radiusClass} bg-white/90 shadow-[0_30px_60px_rgba(15,23,42,0.12)] backdrop-blur`}
    >
      <div className="flex items-center justify-between border-b border-[#ECECF3] px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#717173]">Details</p>
          <h2 className="text-lg font-semibold text-gray-900">Job overview</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#717173] transition-colors hover:bg-[#E2E2E7]"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
        {isLoading ? (
          <div className="flex justify-center pt-16">
            <InlineLoader />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <XCircle className="h-10 w-10 text-[#DC2F2F]" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Something went wrong</h3>
            <p className="mt-2 max-w-sm text-sm text-[#717173]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,85,241,0.3)]"
              style={{ background: "linear-gradient(135deg, #4F55F1 0%, #8186FF 100%)" }}
            >
              Try again
            </button>
          </div>
        ) : job ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              {config && (
                <div className={`flex h-14 w-14 items-center justify-center rounded-3xl ${config.iconBg}`}>
                  <config.icon className="h-7 w-7" style={{ color: config.iconColor }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{job.filename}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#717173]">
                  {config && (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.pillBg} ${config.pillColor}`}
                    >
                      {config.label}
                    </span>
                  )}
                  <span>{job.rows.toLocaleString()} rows</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-3xl bg-[#F4F4F8] p-5">
              <DetailRow
                icon={<Calendar className="h-5 w-5 text-[#717173]" />}
                label="Created"
                value={
                  CreatedDate
                    ? `${getDayLabel(CreatedDate)} · ${formatTime(CreatedDate)}`
                    : "—"
                }
              />
              {FinishedDate && (
                <DetailRow
                  icon={<CheckCircle2 className="h-5 w-5 text-[#4F55F1]" />}
                  label="Finished"
                  value={`${getDayLabel(FinishedDate)} · ${formatTime(FinishedDate)}`}
                />
              )}
              <DetailRow icon={<FileText className="h-5 w-5 text-[#717173]" />} label="Job ID" value={job.id} />
            </div>

            {(job.status === "pending" || job.status === "in_progress") && (
              <div className="rounded-3xl border border-[#E2E2E7] bg-white/80 p-5">
                <h4 className="text-sm font-semibold text-gray-900">Generating your file</h4>
                <p className="mt-1 text-xs text-[#717173]">
                  {job.message || "We’re preparing your personalized lines."}
                </p>
                <div className="mt-4">
                  <ProgressBar value={job.progress ?? 0} />
                  <p className="mt-2 text-xs font-semibold text-[#4F55F1]">
                    {Math.round(job.progress ?? 0)}% complete
                  </p>
                </div>
              </div>
            )}

            {job.status === "failed" && (
              <div className="rounded-3xl border border-red-200 bg-red-50/80 p-5 text-sm text-[#B42318]">
                <h4 className="text-sm font-semibold text-[#B42318]">Job failed</h4>
                <p className="mt-2 text-xs text-[#B42318]">
                  {job.error || "Unknown error"}
                </p>
              </div>
            )}

            {job.status === "succeeded" && (
              <div className="rounded-3xl border border-[#E2E2E7] bg-white/90 p-5">
                <h4 className="text-sm font-semibold text-gray-900">Ready to download</h4>
                <p className="mt-1 text-xs text-[#717173]">
                  Your personalized outreach file is ready to export.
                </p>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={downloading}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(79,85,241,0.4)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #4F55F1 0%, #8186FF 100%)" }}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Preparing…" : "Download file"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-[#717173]" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Pick a job</h3>
            <p className="mt-2 max-w-xs text-sm text-[#717173]">
              Select a job from the timeline to see its progress, metadata, and download options.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0F0F3]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#717173]">{label}</p>
        <p className="truncate text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
