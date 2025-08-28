"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_URL } from "../../lib/api";

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

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [percent, setPercent] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>("");

  // fetch job details
  useEffect(() => {
    if (!id) return;

    async function fetchJob() {
      try {
        const res = await fetch(`${API_URL}/jobs/${id}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setJob(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [id]);

  // poll progress every 3 seconds while job is running
  useEffect(() => {
    if (!id) return;
    if (!job) return;
    if (job.status !== "queued" && job.status !== "running") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/jobs/${id}/progress`);
        if (!res.ok) return;
        const data = await res.json();
        setPercent(data.percent || 0);
        setProgressMsg(data.message || "");

        // also update overall job object
        const jobRes = await fetch(`${API_URL}/jobs/${id}`);
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          setJob(jobData);
        }
      } catch (_) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [id, job]);

  if (loading) return <p className="p-6 text-gray-600">Loading job details...</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!job) return <p className="p-6 text-gray-600">No job found</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Job Detail</h1>

        <p><strong>ID:</strong> {job.id}</p>
        <p><strong>Filename:</strong> {job.filename}</p>
        <p>
          <strong>Status:</strong>{" "}
          <span
            className={
              job.status === "failed"
                ? "text-red-600 font-medium"
                : job.status === "succeeded"
                ? "text-green-600 font-medium"
                : "text-yellow-600 font-medium"
            }
          >
            {job.status}
          </span>
        </p>
        <p><strong>Rows:</strong> {job.rows}</p>
        <p><strong>Created:</strong> {new Date(job.created_at * 1000).toLocaleString()}</p>
        <p><strong>Finished:</strong> {job.finished_at ? new Date(job.finished_at * 1000).toLocaleString() : "-"}</p>
        <p><strong>Error:</strong> {job.error || "-"}</p>

        {/* Progress Bar */}
        {job.status === "queued" || job.status === "running" ? (
          <div className="mt-4">
            <div className="h-4 w-full bg-gray-200 rounded">
              <div
                className="h-4 bg-blue-600 rounded"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-700">
              {percent}% {progressMsg}
            </p>
          </div>
        ) : null}

        {/* Download link when ready */}
        <p className="mt-4">
          <strong>Result:</strong>{" "}
          {job.result_path ? (
            <a
              href={`${API_URL}/jobs/${job.id}/download`}
              className="text-blue-600 underline"
            >
              Download
            </a>
          ) : (
            "-"
          )}
        </p>

        <button
          onClick={() => router.push("/jobs")}
          className="mt-4 bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 text-gray-900"
        >
          ← Back to Jobs
        </button>
      </div>
    </div>
  );
}
