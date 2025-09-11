"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_URL } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import { Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Job {
  id: string;
  status: string;
  filename: string;
  rows: number;
  created_at: number;
  finished_at: number | null;
  error: string | null;
  progress?: number;
  message?: string;
}

export default function JobsPage() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    fetchJobs(0, true); // initial load
  }, [session]);

  // ⬇️ add this right below your first useEffect in JobsPage
 useEffect(() => {
  if (!session) return;
  const interval = setInterval(() => {
    refreshJobs(); // silent refresh, no flicker
  }, 2000);
  return () => clearInterval(interval);
}, [session]);



  async function fetchJobs(offsetParam: number, reset = false) {
    if (!session) return;
    try {
      // Only show the big "Loading your past files…" screen on very first load
      if (reset && offsetParam === 0 && jobs.length === 0) {
        setLoading(true);
      }

      const res = await fetch(
        `${API_URL}/jobs?offset=${offsetParam}&limit=5`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data: Job[] = await res.json();

      if (reset) {
        setJobs(data);   // silent refresh, don’t blank screen
      } else {
        setJobs((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === 5);
      setOffset(offsetParam + data.length);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      if (reset && offsetParam === 0 && jobs.length === 0) {
        setLoading(false);
      }
      setLoadingMore(false);
    }
  }

  async function refreshJobs() {
  if (!session) return;
  try {
    const res = await fetch(`${API_URL}/jobs?offset=0&limit=5`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) throw new Error("Failed to refresh jobs");
    const data: Job[] = await res.json();
    setJobs(data); // update without touching loading state
  } catch (err) {
    console.error("Error refreshing jobs:", err);
  }
}

  async function handleDownload(job: Job, e: React.MouseEvent) {
    e.stopPropagation();
    if (!session) return;
    try {
      const res = await fetch(`${API_URL}/jobs/${job.id}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        alert("Download failed");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = job.filename || "result.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed");
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400 animate-pulse text-lg font-sans">
        Loading your past files...
      </div>
    );
  }

  return (
    <>
      <div className="hidden md:block p-12 font-sans max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-10 text-gray-900 tracking-tight">
          Past Files
        </h1>

        {jobs.length === 0 ? (
          <div className="text-gray-500 text-center text-lg">
            No past files found.
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="flex items-center justify-between rounded-2xl bg-gray-50 shadow-sm hover:shadow-lg hover:bg-white cursor-pointer transition-all duration-300 px-8 py-6"
              >
                {/* Filename */}
                <div className="flex-[2]">
                  <span className="text-gray-900 font-semibold text-base hover:text-blue-600 transition-colors">
                    {job.filename}
                  </span>
                </div>

                {/* Status */}
                <div className="flex-[2] flex justify-center">
                  {job.status === "succeeded" ? (
                    <span className="px-3 py-1 rounded-full bg-green-50 text-emerald-600 font-semibold text-sm">
                      Done
                    </span>
                  ) : job.status === "failed" ? (
                    <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 font-semibold text-sm">
                      Failed
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2 items-center w-full max-w-sm">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden relative">
                          <ProgressBar target={job.progress ?? 0} />
                        </div>
                        <span className="text-xs text-gray-500 font-medium min-w-[3rem] text-right">
                          {job.progress && job.progress > 0
                            ? `${job.progress}%`
                            : "Starting…"}
                        </span>
                      </div>
                      {job.message && (
                        <span className="text-xs text-gray-400 font-sans">
                          {job.message}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-[1] flex justify-end">
                  {job.status === "succeeded" ? (
                    <button
                      onClick={(e) => handleDownload(job, e)}
                      className="flex items-center gap-2 px-6 py-2 rounded-full font-medium text-white text-sm shadow-sm transition-all duration-300"
                      style={{
                        background: "linear-gradient(#5a5a5a, #1c1c1c)",
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 0 12px rgba(0,0,0,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => {
                    setLoadingMore(true);
                    fetchJobs(offset, false);
                  }}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(#444, #1c1c1c)",
                  }}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- Mobile Jobs Page ---------------- */}
      {/* ---------------- Mobile Layout ---------------- */}
      <div className="block md:hidden px-4 pt-4 pb-16 font-sans">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-6">
          Past Files
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Your recent file generations
        </p>

        {jobs.length === 0 ? (
          <div className="text-gray-500 text-center text-sm">
            No past files found.
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="rounded-xl bg-white border shadow-sm p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  {/* Filename */}
                  <span className="text-gray-900 font-medium text-sm truncate">
                    {job.filename}
                  </span>

                  {/* Status + Button */}
                  <div className="flex items-center justify-between">
                    {job.status === "succeeded" ? (
                      <span className="px-2 py-1 rounded-full bg-green-50 text-emerald-600 font-medium text-xs">
                        Done
                      </span>
                    ) : job.status === "failed" ? (
                      <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 font-medium text-xs">
                        Failed
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Processing…</span>
                    )}

                    {job.status === "succeeded" ? (
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={(e) => handleDownload(job, e)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all duration-200"
                        style={{
                          background: "linear-gradient(#3a3a3a, #1a1a1a)",
                        }}
                      >
                        Download
                      </motion.button>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.04 }}
                  onClick={() => {
                    setLoadingMore(true);
                    fetchJobs(offset, false);
                  }}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-full font-semibold text-white text-[14px] shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(#444, #1c1c1c)",
                  }}
                >
                  {loadingMore ? "Loading…" : "Show More Files"}
                </motion.button>
              </div>
            )}
          </div>
        )}
      </div>

    </>
  );
}

function ProgressBar({ target }: { target: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (target > displayed) {
      const step = () => {
        setDisplayed((prev) => {
          if (prev >= target) return prev;
          const next = prev + Math.max(1, (target - prev) / 20);
          return Math.min(next, target);
        });
      };
      const id = setInterval(step, 200); // smooth increments
      return () => clearInterval(id);
    }
  }, [target, displayed]);

  return (
    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden relative">
      <div
        className="h-2 rounded-full transition-all duration-300 ease-linear"
        style={{
          width: `${displayed}%`,
          background: "linear-gradient(to right, #000, #333, #000)",
        }}
      />
    </div>
  );
}
