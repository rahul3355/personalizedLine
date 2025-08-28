"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { API_URL } from "../../lib/api";
import {
  FileText,
  ArrowDownToLine,
  Calendar,
  Loader2,
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

interface JobProgress {
  job_id: string;
  status: string;
  percent: number;
  message: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, JobProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setJobs(data);

      for (const job of data) {
        if (job.status === "queued" || job.status === "running") {
          fetch(`${API_URL}/jobs/${job.id}/progress`)
            .then((res) => res.json())
            .then((prog) => {
              setProgressMap((prev) => ({
                ...prev,
                [job.id]: prog,
              }));
            })
            .catch(() => {});
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(() => fetchJobs(), 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Jobs</h1>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-10 bg-gray-100 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-red-600">Error: {error}</p>;
  }

  if (jobs.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-10 text-center">
          <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">
            No jobs yet
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Upload a file to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Jobs</h1>

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Filename</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Rows</th>
                <th className="px-6 py-3 text-left">Created</th>
                <th className="px-6 py-3 text-left">Finished</th>
                <th className="px-6 py-3 text-left">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job, idx) => {
                const prog = progressMap[job.id];
                const percent =
                  job.status === "succeeded"
                    ? 100
                    : job.status === "failed"
                    ? 0
                    : prog?.percent || 0;

                return (
                  <tr
                    key={job.id}
                    className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                    onClick={() => router.push(`/jobs/${job.id}`)}
                  >
                    <td className="px-6 py-4 flex items-center gap-2 text-gray-700">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="hover:underline">{job.filename}</span>
                      {(job.status === "queued" ||
                        job.status === "running") && (
                        <div className="flex-1 ml-4">
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-2 bg-blue-600 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {percent}% {prog?.message || ""}
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          job.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : job.status === "succeeded"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {job.rows || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(job.created_at * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {job.finished_at
                        ? new Date(job.finished_at * 1000).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {job.result_path ? (
                        <a
                          href={`${API_URL}/jobs/${job.id}/download`}
                          className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-medium hover:bg-gray-800 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
