"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_URL } from "../../lib/api";
import { useAuth } from "../../lib/AuthProvider";

interface Job {
  id: string;
  status: string;
  filename: string;
  rows: number;
  created_at: number;
  finished_at: number | null;
  error: string | null;
  result_path: string | null;
}

interface JobProgress {
  job_id: string;
  status: string;
  percent: number;
  message: string;
}

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { session } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);

  useEffect(() => {
    if (!id || !session) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchJobAndProgress() {
      try {
        const res = await fetch(`${API_URL}/jobs/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch job");
        const jobData = await res.json();
        setJob(jobData);

        if (jobData.status === "in_progress") {
          interval = setInterval(async () => {
            const progRes = await fetch(`${API_URL}/jobs/${id}/progress`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (progRes.ok) {
              const progData = await progRes.json();
              setProgress(progData);

              if (
                progData.status === "succeeded" ||
                progData.status === "failed"
              ) {
                clearInterval(interval!);
                const finalRes = await fetch(`${API_URL}/jobs/${id}`, {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (finalRes.ok) {
                  const finalData = await finalRes.json();
                  setJob(finalData);
                  setProgress(null);
                }
              }
            }
          }, 2000);
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchJobAndProgress();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, session]);

  async function handleDownload() {
    if (!job) return;
    const res = await fetch(`${API_URL}/jobs/${job.id}/download`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return alert("Download failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.filename || "result"}.xlsx`;
    a.click();
  }

  if (!job)
    return <p className="text-center text-gray-500 mt-20">Loading job...</p>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        {/* Page title */}
        <h1 className="text-3xl font-semibold mb-6 text-gray-900 tracking-tight">
          Job Detail
        </h1>

        {/* Job info in two columns */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-700">
          <div>
            <p className="text-xs text-gray-500">ID</p>
            <p className="font-medium text-gray-900 break-all">{job.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Filename</p>
            <p className="font-medium text-gray-900">{job.filename}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rows</p>
            <p className="font-medium text-gray-900">{job.rows}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Created At</p>
            <p className="font-medium text-gray-900">
              {new Date(job.created_at * 1000).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Finished At</p>
            <p className="font-medium text-gray-900">
              {job.finished_at
                ? new Date(job.finished_at * 1000).toLocaleString()
                : "In progress"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p
              className={`font-semibold ${
                job.status === "succeeded"
                  ? "text-green-600"
                  : job.status === "failed"
                  ? "text-red-600"
                  : "text-yellow-600"
              }`}
            >
              {job.status}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {job.status === "in_progress" && (
          <div className="mt-8">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="h-3 bg-gradient-to-r from-gray-900 to-gray-700 transition-all duration-500 rounded-full"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {progress
                ? `${progress.percent}% — ${progress.message}`
                : "Starting..."}
            </p>
          </div>
        )}

        {/* Download button */}
        {job.status === "succeeded" && job.result_path && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={handleDownload}
              className="w-full sm:w-auto flex items-center justify-center py-3 px-6 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300"
              style={{
                background: "linear-gradient(#5a5a5a, #1c1c1c)",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 8px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Icon */}
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                />
              </svg>
              Download Result
            </button>
          </div>
        )}

        {/* Error */}
        {job.status === "failed" && (
          <div className="mt-8 text-center text-red-600 font-semibold">
            Job failed: {job.error || "Unknown error"}
          </div>
        )}
      </div>
    </div>
  );
}
