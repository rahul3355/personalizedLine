"use client";

import { useRouter } from "next/router";
import { useAuth } from "../../lib/AuthProvider";
import { API_URL } from "../../lib/api";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

interface Job {
  id: string;
  status: "pending" | "in_progress" | "succeeded" | "failed";
  filename: string;
  rows: number;
  created_at: number;
  finished_at: number | null;
  error: string | null;
  result_path: string | null;
}

interface JobProgress {
  percent: number;
  message: string;
  status: "in_progress" | "succeeded" | "failed";
}

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { session } = useAuth() as { session: Session | null };

  const [job, setJob] = useState<Job | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!session || !id) return;

    let interval: NodeJS.Timeout;

    async function fetchJob() {
      try {
        const res = await fetch(`${API_URL}/jobs/${id}`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        });
        if (!res.ok) throw new Error("Failed to fetch job");
        const data: Job = await res.json();
        setJob(data);

        if (data.status !== "succeeded" && data.status !== "failed") {
          interval = setInterval(async () => {
            try {
              const res2 = await fetch(`${API_URL}/jobs/${id}/progress`, {
                headers: {
                  Authorization: `Bearer ${session?.access_token ?? ""}`,
                },
              });
              if (res2.ok) {
                const prog: JobProgress = await res2.json();
                setProgress(prog.percent);
                setMessage(prog.message);
                setJob((prev) =>
                  prev ? { ...prev, status: prog.status } : prev
                );

                if (prog.status === "succeeded" || prog.status === "failed") {
                  clearInterval(interval);
                }
              }
            } catch (err) {
              console.error("Error fetching progress:", err);
            }
          }, 2000);
        }
      } catch (err) {
        console.error("Error fetching job:", err);
      }
    }

    fetchJob();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session, id]);

  async function handleDownload() {
    if (!job || !session) return;
    try {
      const res = await fetch(`${API_URL}/jobs/${job.id}/download`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
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
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Download error:", err);
    }
  }

  if (!session) return <p className="p-6">Please login to view this page</p>;
  if (!job) return <p className="p-6">Loading job...</p>;

  return (
    <>
      {/* -------- Desktop -------- */}
      <div className="hidden md:block max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Job Details</h1>

        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Filename:</span> {job.filename}
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Rows:</span> {job.rows}
          </p>
          <p className="text-gray-700 mb-2">
            <span className="font-semibold">Created:</span>{" "}
            {new Date(job.created_at).toLocaleString()}
          </p>
          <p className="text-gray-700 mb-4">
            <span className="font-semibold">Status:</span>{" "}
            <span
              className={
                job.status === "succeeded"
                  ? "text-green-600 font-semibold"
                  : job.status === "failed"
                  ? "text-red-600 font-semibold"
                  : "text-yellow-600 font-semibold"
              }
            >
              {job.status}
            </span>
          </p>

          {/* Progress */}
          {(job.status === "in_progress" || job.status === "pending") && (
            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="h-3 bg-gradient-to-r from-gray-900 to-gray-700 transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {progress > 0 ? `${progress}% – ${message}` : "Starting..."}
              </p>
            </div>
          )}

          {/* Download */}
          {job.status === "succeeded" && job.result_path && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleDownload}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 rounded-xl font-medium text-white shadow-lg transition active:scale-95"
                style={{
                  background: "linear-gradient(#5a5a5a, #1c1c1c)",
                }}
              >
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

      {/* -------- Mobile -------- */}
      <div className="block md:hidden px-4 pt-4 pb-16 font-sans">
        {/* Header with Back */}
        <button
    onClick={() => router.push("/jobs")}
    className="flex items-center gap-1 text-[15px] font-medium text-gray-800 hover:text-black transition-opacity active:opacity-60"
  >
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
    Back
  </button>
          <br/><br/><br/>
        <div className="flex items-center justify-between mb-6">
          
          <h1 className="text-lg font-semibold text-gray-900 text-center flex-1">
            Job Details
          </h1>
          <div className="w-12" /> {/* Spacer for symmetry */}
        </div>

        {/* Card */}
        <div className="bg-white p-5 rounded-xl shadow-md space-y-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Filename:</span> {job.filename}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Rows:</span> {job.rows}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Created:</span>{" "}
            {new Date(job.created_at).toLocaleString()}
          </p>
          <p className="text-sm">
            <span className="font-semibold">Status:</span>{" "}
            <span
              className={
                job.status === "succeeded"
                  ? "text-green-600 font-semibold"
                  : job.status === "failed"
                  ? "text-red-600 font-semibold"
                  : "text-yellow-600 font-semibold"
              }
            >
              {job.status}
            </span>
          </p>

          {/* Progress */}
          {(job.status === "in_progress" || job.status === "pending") && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-gray-900 to-gray-700 transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {progress > 0 ? `${progress}% – ${message}` : "Starting..."}
              </p>
            </div>
          )}
          <br></br>

          {/* Download */}
          {job.status === "succeeded" && job.result_path && (
            <button
              onClick={handleDownload}
              className="mt-6 w-full py-3 rounded-lg font-semibold text-white text-[15px] tracking-tight shadow-md active:scale-95 transition"
              style={{ background: "linear-gradient(#3a3a3a, #1c1c1c)" }}
            >
              Download Result
            </button>
          )}

          {/* Error */}
          {job.status === "failed" && (
            <div className="mt-6 text-center text-red-600 font-semibold text-sm">
              Job failed: {job.error || "Unknown error"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
