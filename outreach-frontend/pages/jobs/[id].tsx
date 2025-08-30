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

              // stop polling once job has finished
              if (progData.status === "succeeded" || progData.status === "failed") {
                clearInterval(interval!);
                const finalRes = await fetch(`${API_URL}/jobs/${id}`, {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (finalRes.ok) {
                  const finalData = await finalRes.json();
                  setJob(finalData);
                  setProgress(null); // cleanup progress after job resolves
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

  if (!job) return <p>Loading job...</p>;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Job Detail</h1>

        <div className="space-y-3 text-gray-700">
          <p><span className="font-semibold">ID:</span> {job.id}</p>
          <p><span className="font-semibold">Filename:</span> {job.filename}</p>
          <p><span className="font-semibold">Rows:</span> {job.rows}</p>
          <p>
            <span className="font-semibold">Created At:</span>{" "}
            {new Date(job.created_at * 1000).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Finished At:</span>{" "}
            {job.finished_at
              ? new Date(job.finished_at * 1000).toLocaleString()
              : "In progress"}
          </p>
        </div>

        {/* Progress bar (only visible during in_progress) */}
        {job.status === "in_progress" && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 bg-black transition-all duration-500"
                style={{ width: `${progress?.percent || 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {progress ? `${progress.percent}% — ${progress.message}` : "Starting..."}
            </p>
          </div>
        )}

        {/* Download button replaces progress once job succeeds */}
        {job.status === "succeeded" && job.result_path && (
          <div className="mt-8">
            <button
              onClick={handleDownload}
              className="w-full md:w-auto px-6 py-3 rounded-lg bg-black text-white text-sm font-semibold shadow hover:bg-gray-800 transition"
            >
              Download Result
            </button>
          </div>
        )}

        {/* Error display */}
        {job.status === "failed" && (
          <div className="mt-6 text-red-600 font-semibold">
            Job failed: {job.error || "Unknown error"}
          </div>
        )}
      </div>
    </div>
  );
}
