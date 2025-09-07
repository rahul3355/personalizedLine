"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_URL } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";
import { Download } from "lucide-react";

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

  async function fetchJobs(offsetParam: number, reset = false) {
    if (!session) return;
    try {
      if (reset) setLoading(true);
      const res = await fetch(
        `${API_URL}/jobs?offset=${offsetParam}&limit=5`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data: Job[] = await res.json();

      if (reset) {
        setJobs(data);
      } else {
        setJobs((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === 5); // if fewer than 5 returned, no more jobs
      setOffset(offsetParam + data.length);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    <div className="p-12 font-sans max-w-5xl mx-auto">
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
                        {job.progress && job.progress > 0 ? (
                          <div
                            className="h-2 rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${job.progress}%`,
                              background:
                                "linear-gradient(to right, #000, #333, #000)",
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300" />
                        )}
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
  );
}
