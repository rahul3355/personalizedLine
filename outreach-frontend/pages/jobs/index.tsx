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

  if (loading) return <p className="p-6 text-gray-600">Loading jobs...</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Jobs</h1>

        <table className="w-full border border-gray-300 rounded-md overflow-hidden">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border-b">Filename</th>
              <th className="p-2 border-b">Status</th>
              <th className="p-2 border-b">Rows</th>
              <th className="p-2 border-b">Created</th>
              <th className="p-2 border-b">Finished</th>
              <th className="p-2 border-b">Download</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
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
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <td className="p-2 border-b">
                    <span className="text-blue-600 underline">{job.filename}</span>
                    {(job.status === "queued" || job.status === "running") && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 h-2 rounded">
                          <div
                            className="h-2 bg-blue-600 rounded"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-700 mt-1">
                          {percent}% {prog?.message || ""}
                        </p>
                      </div>
                    )}
                  </td>

                  <td className="p-2 border-b">
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
                  </td>

                  <td className="p-2 border-b">{job.rows}</td>
                  <td className="p-2 border-b">
                    {new Date(job.created_at * 1000).toLocaleString()}
                  </td>
                  <td className="p-2 border-b">
                    {job.finished_at
                      ? new Date(job.finished_at * 1000).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2 border-b">
                    {job.result_path ? (
                      <a
                        href={`${API_URL}/jobs/${job.id}/download`}
                        className="text-blue-600 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Download
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
