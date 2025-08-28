"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_URL } from "../../lib/api";
import {
  FileText,
  Calendar,
  Hash,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  Download,
} from "lucide-react";

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

  useEffect(() => {
    if (!id || !job) return;
    if (job.status !== "queued" && job.status !== "running") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/jobs/${id}/progress`);
        if (!res.ok) return;
        const data = await res.json();
        setPercent(data.percent || 0);
        setProgressMsg(data.message || "");

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

  const statusStyles =
    job.status === "succeeded"
      ? "bg-green-100 text-green-700"
      : job.status === "failed"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  const statusIcon =
    job.status === "succeeded" ? (
      <CheckCircle className="h-4 w-4" />
    ) : job.status === "failed" ? (
      <XCircle className="h-4 w-4" />
    ) : (
      <Loader2 className="h-4 w-4 animate-spin" />
    );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white shadow-xl rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Job Detail</h1>
          <span
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusStyles}`}
          >
            {statusIcon}
            {job.status}
          </span>
        </div>

        {/* Filename */}
        <div className="flex items-center gap-2 text-gray-700 mb-6">
          <FileText className="h-5 w-5 text-gray-400" />
          <span className="font-medium">{job.filename}</span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-gray-500 uppercase text-xs">Job ID</p>
            <p className="font-mono text-gray-900 break-all">{job.id}</p>
          </div>
          <div>
            <p className="text-gray-500 uppercase text-xs">Rows</p>
            <p className="text-gray-900">{job.rows}</p>
          </div>
          <div>
            <p className="text-gray-500 uppercase text-xs">Created</p>
            <p className="flex items-center gap-1 text-gray-700">
              <Calendar className="h-4 w-4 text-gray-400" />
              {new Date(job.created_at * 1000).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 uppercase text-xs">Finished</p>
            <p className="flex items-center gap-1 text-gray-700">
              <Calendar className="h-4 w-4 text-gray-400" />
              {job.finished_at
                ? new Date(job.finished_at * 1000).toLocaleString()
                : "-"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 uppercase text-xs">Error</p>
            <p className="text-gray-900">{job.error || "-"}</p>
          </div>
        </div>

        {/* Progress */}
        {(job.status === "queued" || job.status === "running") && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full"
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-700">
              {percent}% {progressMsg}
            </p>
          </div>
        )}

        {/* Result */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 uppercase text-xs mb-1">Result</p>
            {job.result_path ? (
              <a
                href={`${API_URL}/jobs/${job.id}/download`}
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium shadow hover:opacity-90 transition"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            ) : (
              <p className="text-gray-400">Not available</p>
            )}
          </div>

          <button
            onClick={() => router.push("/jobs")}
            className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </button>
        </div>
      </div>
    </div>
  );
}
