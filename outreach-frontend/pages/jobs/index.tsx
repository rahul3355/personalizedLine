"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

import InlineLoader from "../../components/InlineLoader";
import ThinkingIndicator from "../../components/ThinkingIndicator";
import { API_URL } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import { useRouter } from "next/router";

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
      const cleaned = match[1].replace(/\d+(?:\.\d+)?\s*%/g, "").replace(/\s{2,}/g, " ").trim();
      return cleaned;
    }
  }
  const cleaned = message.replace(/\d+(?:\.\d+)?\s*%/g, "").replace(/\s{2,}/g, " ").trim();
  return cleaned;
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

function jobToDetail(job: Job): JobDetail {
  return {
    ...job,
    result_path: null,
  };
}

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

function StatusPill({ status }: { status: JobStatus }) {
  const config = getStatusVisuals(status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${config.pillBg} ${config.pillColor}`}
    >
      {config.label}
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

function JobsPage() {
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
  const [downloadingJobs, setDownloadingJobs] = useState<Record<string, boolean>>({});

  const jobsRef = useRef<Job[]>([]);
  const historyHasDrawer = useRef(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const firstGroupRef = useRef<HTMLUListElement | null>(null);
  const jobRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [drawerTop, setDrawerTop] = useState<number>(96);
  const [drawerHeight, setDrawerHeight] = useState<number | null>(null);

  const setJobRef = useCallback(
    (id: string) => (element: HTMLDivElement | null) => {
      if (element) {
        jobRefs.current[id] = element;
      } else {
        delete jobRefs.current[id];
      }
    },
    []
  );


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

  useLayoutEffect(() => {
    const update = () => {
      if (!layoutRef.current) {
        setDrawerHeight(null);
        return;
      }

      const layoutRect = layoutRef.current.getBoundingClientRect();

      if (selectedJobId) {
        const jobElement = jobRefs.current[selectedJobId];
        if (jobElement) {
          const jobRect = jobElement.getBoundingClientRect();
          setDrawerTop(jobRect.top - layoutRect.top);
          setDrawerHeight(jobRect.height);
          return;
        }
      }

      if (firstGroupRef.current) {
        const groupRect = firstGroupRef.current.getBoundingClientRect();
        setDrawerTop(groupRect.top - layoutRect.top);
        setDrawerHeight(groupRect.height);
      } else {
        setDrawerHeight(null);
      }
    };

    let frame: number | null = null;

    const scheduleUpdate = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(() => {
        frame = null;
        update();
      });
    };

    scheduleUpdate();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, [groupedJobs, selectedJobId]);

  const openJob = useCallback(
    (id: string) => {
      if (selectedJobIdRef.current === id) return;

      const hadDrawerOpen = Boolean(selectedJobIdRef.current);

      selectedJobIdRef.current = id;
      setSelectedJobId(id);
      setDetailError(null);
      setDetailLoading(true);
      setSelectedJob((prev) => {
        if (prev?.id === id) {
          return prev;
        }
        const preview = jobsRef.current.find((job) => job.id === id);
        return preview ? jobToDetail(preview) : null;
      });

      if (!router.isReady) return;

      const query = { ...router.query, id };
      if (hadDrawerOpen) {
        router.replace({ pathname: "/jobs", query }, undefined, { shallow: true });
      } else {
        historyHasDrawer.current = true;
        router.push({ pathname: "/jobs", query }, undefined, { shallow: true });
      }
    },
    [router]
  );

  const closeDrawer = useCallback(() => {
    const query = { ...router.query };
    delete (query as Record<string, unknown>).id;

    setSelectedJob(null);
    setSelectedJobId(null);
    selectedJobIdRef.current = null;
    setDetailError(null);
    setDetailLoading(false);

    if (historyHasDrawer.current) {
      historyHasDrawer.current = false;

    }
    router.replace({ pathname: "/jobs", query }, undefined, { shallow: true });
  }, [router]);

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        closeDrawer();
      }
    },
    [closeDrawer]
  );

  const handleRetry = useCallback(() => {
    if (selectedJobId) {
      loadJobDetail(selectedJobId);
    }
  }, [selectedJobId, loadJobDetail]);

  const downloadJobFile = useCallback(
    async (jobId: string, filename: string) => {
      if (!session) {
        throw new Error("Missing session");
      }
      const res = await fetch(`${API_URL}/jobs/${jobId}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        throw new Error("Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "result.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    },
    [session]
  );

  const handleDownload = useCallback(async () => {
    if (!selectedJob || downloading) return;
    try {
      setDownloading(true);
      await downloadJobFile(selectedJob.id, selectedJob.filename || "result.xlsx");
    } catch (error) {
      console.error("Download error:", error);
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  }, [selectedJob, downloading, downloadJobFile]);

  const handleDownloadFromList = useCallback(
    async (job: Job) => {
      let alreadyDownloading = false;
      setDownloadingJobs((prev) => {
        if (prev[job.id]) {
          alreadyDownloading = true;
          return prev;
        }
        return { ...prev, [job.id]: true };
      });
      if (alreadyDownloading) {
        return;
      }
      try {
        await downloadJobFile(job.id, job.filename || "result.xlsx");
      } catch (error) {
        console.error("Download error:", error);
        alert("Download failed");
      } finally {
        setDownloadingJobs((prev) => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
      }
    },
    [downloadJobFile]
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchJobs(offset, { limit: PAGE_SIZE });
  }, [hasMore, loadingMore, fetchJobs, offset]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white md:bg-[#F7F7F7]">
        <InlineLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-[#F7F7F7] bg-none">
      <div ref={layoutRef} className="relative w-full px-4 sm:px-8 md:px-10 lg:px-12 pt-6 pb-16">
        <div
          className={`transition-all duration-300 ${selectedJobId ? "md:pr-[344px] lg:pr-[422px]" : ""}`}
        >

          <div className="space-y-10">

            {groupedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-[#D8DAE6] bg-white/70 px-6 py-12 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <FileText className="h-10 w-10 text-[#8B8DA1]" />
                <h2 className="mt-4 text-lg font-semibold text-[#101225]">No jobs yet</h2>
                <p className="mt-2 max-w-xs text-sm text-[#8B8DA1]">
                  Upload a CSV to see your personalization jobs appear here in a Revolut-style timeline.
                </p>
              </div>
            ) : (
              <div className="space-y-12">


                {groupedJobs.map((group, groupIdx) => {
                  const showHeader = group.label !== "Today";
                  return (
                    <section
                      key={group.key}
                      className={`space-y-3 ${groupIdx === 0 ? "mt-0" : ""}`}
                    >

                      <div className={showHeader ? "space-y-3" : ""}>
                        {showHeader && (
                          <div
                            className="px-1 text-[15px] font-semibold tracking-[-0.01em] text-[#0E0F12]"
                            style={{ fontFamily: '"Aeonik Pro","Inter",sans-serif' }}
                          >
                            {group.label}
                          </div>
                        )}

                        <ul
                          ref={groupIdx === 0 ? firstGroupRef : undefined}
                          className="w-full max-w-none overflow-hidden rounded-[18px] bg-white shadow-none"
                        >

                          {group.jobs.map((job, idx) => {
                            const isActive = job.id === selectedJobId;
                            const isFirst = idx === 0;
                            const isLast = idx === group.jobs.length - 1;
                            const indicatorMessage =
                              formatJobMessage(job.message) || job.message || undefined;
                            const radius =
                              isFirst && isLast
                                ? "rounded-[18px]"
                                : isFirst
                                  ? "rounded-t-[18px]"
                                  : isLast
                                    ? "rounded-b-[18px]"
                                    : "";

                            return (
                              <li key={job.id} className={idx > 0 ? "border-t border-[#EFF0F6]" : ""}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  ref={setJobRef(job.id)}
                                  onClick={() => openJob(job.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openJob(job.id);
                                    }
                                  }}
                                  data-active={isActive}
                                  className={[
                                    "group relative z-0 flex w-full cursor-pointer items-center gap-5 px-6 py-[14px] text-left transition-colors",
                                    "hover:bg-white/70",
                                    radius,
                                    "data-[active=true]:ring-1 data-[active=true]:ring-[#4F55F1] data-[active=true]:bg-white data-[active=true]:z-[1]"
                                  ].join(" ")}
                                >
                                  <StatusIcon status={job.status} />

                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                      <p className="flex-1 truncate text-[15px] font-semibold text-[#101225]">
                                        {job.filename}
                                      </p>
                                      <span
                                        className="text-[12px] font-medium tracking-[-0.01em] text-[#0E0F12]"
                                        style={{ fontFamily: '"Aeonik Pro","Inter",sans-serif' }}
                                      >
                                        {formatTime(new Date(job.created_at))}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B8DA1]">
                                      <StatusPill status={job.status} />
                                      <span>{job.rows.toLocaleString()} rows</span>
                                      <div className="hidden md:block">
                                        <ThinkingIndicator
                                          status={job.status}
                                          progress={job.progress}
                                          message={indicatorMessage}
                                        />
                                      </div>
                                      {job.status === "failed" && job.error ? (
                                        <span className="text-[#DC2F2F]">{job.error}</span>
                                      ) : null}
                                    </div>

                                    {(job.status === "pending" || job.status === "in_progress") && (
                                      <div className="pt-1">
                                        <ProgressBar value={job.progress ?? 0} />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {job.status === "succeeded" && (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          event.preventDefault();
                                          handleDownloadFromList(job);
                                        }}
                                        disabled={Boolean(downloadingJobs[job.id])}
                                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8DAE6] text-[#4F55F1] transition-colors hover:bg-[#4F55F1] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                                        aria-label="Download results"
                                      >
                                        {downloadingJobs[job.id] ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Download className="h-4 w-4" />
                                        )}
                                      </button>
                                    )}
                                    <ArrowRight
                                      className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? "text-[#4F55F1]" : "text-[#C1C3D6] group-hover:text-[#4F55F1]"}`}
                                    />
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </section>
                  );
                })}

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="rounded-full px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #4F55F1 0%, #8186FF 100%)" }}
                    >
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {selectedJobId && (
            <>
              {/* Mobile: full-screen overlay + slide-in */}
              <motion.div
                key="drawer-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
                onClick={handleOverlayClick}
              >
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
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

              {/* Desktop: overlay + floating card aligned with selected job */}
              <motion.div
                key="drawer-desktop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 hidden md:block"
                onClick={handleOverlayClick}
              >
                <motion.div
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 60 }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="absolute right-0 w-full max-w-xs md:max-w-sm lg:max-w-md"
                  style={{ top: drawerTop, minHeight: drawerHeight ?? undefined }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mr-4 sm:mr-8 md:mr-10 lg:mr-12">
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
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div >
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
  const radiusClass = isMobile ? "rounded-l-3xl" : "rounded-[24px]";
  const loadingBarRadius = isMobile ? "rounded-tl-3xl" : "rounded-t-[24px]";
  const config = job ? getStatusVisuals(job.status) : null;
  const CreatedDate = job ? new Date(job.created_at) : null;
  const FinishedDate = job?.finished_at ? new Date(job.finished_at) : null;

  return (
    <div
      className={`relative flex flex-col ${radiusClass} bg-[#FCFCFC] shadow-[0_12px_30px_rgba(0,0,0,0.08)]`}
    >
      {isLoading ? (
        <div
          className={`pointer-events-none absolute left-0 right-0 top-0 h-1 overflow-hidden ${loadingBarRadius}`}
        >
          <motion.div
            className="h-full w-1/2 bg-gradient-to-r from-[#4F55F1] via-[#8F94FF] to-[#4F55F1]"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          />
        </div>
      ) : null}

      {/* Floating close button (like Revolut, sitting a bit above the content) */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={`absolute left-2 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 ${isMobile ? 'top-16' : 'top-5 -translate-y-1/2'}`}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Title + status icon */}
      <div className="px-6 pt-6 pb-2">
        <div className="mt-9 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold leading-tight text-gray-900">
              {job?.filename ?? "—"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {job?.created_at ? `${getDayLabel(new Date(job.created_at))}, ${formatTime(new Date(job.created_at))}` : "—"}
            </p>
          </div>

          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${config?.iconBg ?? "bg-gray-100"}`}>
            {config ? <config.icon className="h-6 w-6" style={{ color: config.iconColor }} /> : null}
          </div>
        </div>
      </div>


      {/* Info box (white card inside a light surface) */}
      <div className="px-5 pb-3">
        <div className="rounded-2xl bg-[#F6F7F9] p-1">
          <div className="rounded-xl bg-white">
            {isLoading ? (
              <DetailSkeleton />
            ) : (
              <>
                <InfoRow label="Status" value={config?.label ?? "—"} />
                {typeof job?.rows === "number" && <InfoRow label="Rows" value={job.rows.toLocaleString()} />}
                <InfoRow
                  label="Created"
                  value={CreatedDate ? `${getDayLabel(CreatedDate)} · ${formatTime(CreatedDate)}` : "—"}
                />
                <InfoRow
                  label="Finished"
                  value={FinishedDate ? `${getDayLabel(FinishedDate)} · ${formatTime(FinishedDate)}` : "—"}
                />
                <InfoRow label="Job ID" value={job?.id ?? "—"} mono />

                {/* Statement / Download like Revolut */}
                {job?.status === "succeeded" && (
                  <>
                    <InfoRow
                      label="Statement"
                      value={
                        <button
                          type="button"
                          onClick={onDownload}
                          disabled={downloading}
                          className="inline-flex items-center gap-1 font-medium text-[#4F55F1] hover:underline disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                          {downloading ? "Preparing…" : "Download"}
                        </button>
                      }
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom "Get help" card */}
      <div className="px-5 pb-4">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 text-[15px] font-medium text-gray-900 ring-1 ring-black/[0.06] hover:bg-gray-50"
        >
          <span>Get help</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Error / loading states (centered) */}
      {!job && (isLoading || error) && (
        <div className="flex flex-1 items-center justify-center px-6 pb-8">
          {isLoading ? (
            <InlineLoader />
          ) : (
            <div className="text-center">
              <XCircle className="mx-auto h-10 w-10 text-red-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Something went wrong</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-500">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-6 rounded-full bg-[#4F55F1] px-5 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-[15px] text-gray-500">{label}</span>
      <div
        className={`ml-4 max-w-[60%] text-right text-[15px] text-gray-900 ${mono ? "font-mono break-all" : ""
          }`}
      >
        {value}
      </div>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-3 rounded-full bg-gray-200/80 ${className ?? ""}`} />;
}

function DetailSkeleton() {
  const rows = [
    { labelWidth: "w-16", valueWidth: "w-20" },
    { labelWidth: "w-14", valueWidth: "w-16" },
    { labelWidth: "w-20", valueWidth: "w-24" },
    { labelWidth: "w-20", valueWidth: "w-24" },
    { labelWidth: "w-14", valueWidth: "w-28" },
  ];

  return (
    <div className="animate-pulse px-4 py-2">
      {rows.map((row, index) => (
        <div key={`detail-skeleton-${index}`} className="flex items-center justify-between py-2">
          <SkeletonLine className={row.labelWidth} />
          <SkeletonLine className={`ml-4 ${row.valueWidth}`} />
        </div>
      ))}
    </div>
  );
}


const JobsPageWithLayout = JobsPage as typeof JobsPage & {
  disableWhiteCard?: boolean;
  backgroundClassName?: string;
};

JobsPageWithLayout.disableWhiteCard = true;
JobsPageWithLayout.backgroundClassName = "bg-[#F7F7F7]";

export default JobsPageWithLayout;
