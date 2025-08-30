"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  progress?: number;
  message?: string;
}

export default function JobsPage() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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

  async function handleDownload(job: Job) {
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
      <div className="p-10 text-center text-gray-400 animate-pulse text-lg">
        Loading your past files...
      </div>
    );
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-semibold mb-8 text-gray-900 tracking-tight">
        Past Files
      </h1>

      {jobs.length === 0 ? (
        <div className="text-gray-500 text-center text-lg">
          No past files found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">Filename</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Rows</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Created</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Finished</th>
                <th className="px-6 py-4 text-right font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-gray-50 transition-colors duration-200"
                >
                  {/* Filename */}
                  <td className="px-6 py-4">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {job.filename}
                    </Link>
                  </td>

                  {/* Status + Progress */}
                  <td className="px-6 py-4">
                    {job.status === "succeeded" ? (
                      <span className="text-green-600 font-medium">Done</span>
                    ) : job.status === "failed" ? (
                      <span className="text-red-600 font-medium">Failed</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-36 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-yellow-500 h-2 transition-all duration-500"
                              style={{ width: `${job.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-medium">
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
                  </td>

                  {/* Rows */}
                  <td className="px-6 py-4 text-gray-700">{job.rows}</td>

                  {/* Created */}
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(job.created_at * 1000).toLocaleString()}
                  </td>

                  {/* Finished */}
                  <td className="px-6 py-4 text-gray-500">
                    {job.finished_at
                      ? new Date(job.finished_at * 1000).toLocaleString()
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    {job.status === "succeeded" ? (
                      <button
                        onClick={() => handleDownload(job)}
                        className="px-5 py-2 rounded-md bg-black text-white text-xs font-medium hover:bg-gray-800 shadow-sm transition"
                      >
                        Download
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
