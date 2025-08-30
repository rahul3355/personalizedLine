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
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [session]);

  async function fetchJobs() {
    if (!session) return;
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(job: Job, e: React.MouseEvent) {
    e.stopPropagation(); // prevent row navigation
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
                      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className="h-3 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${job.progress || 0}%`,
                            background:
                              "linear-gradient(to right, #6366f1, #3b82f6, #0ea5e9)",
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-700 font-medium min-w-[2rem] text-right">
                        {job.progress}%
                      </span>
                    </div>
                    {job.message && (
                      <span className="text-xs text-gray-500">
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
        </div>
      )}
    </div>
  );
}
