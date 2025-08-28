"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch(`${API_URL}/jobs`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setJobs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  if (loading) return <p className="text-gray-500 p-6">Loading jobs...</p>;
  if (error) return <p className="text-red-500 p-6">Error: {error}</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Past Files</h1>

      {jobs.length === 0 ? (
        <p className="text-gray-500">No jobs found</p>
      ) : (
        <table className="w-full border border-gray-300 text-left text-gray-900 bg-white shadow rounded-lg">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Filename</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Rows</th>
              <th className="p-2 border">Created</th>
              <th className="p-2 border">Finished</th>
              <th className="p-2 border">Download</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-100">
                <td className="p-2 border">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-blue-600 underline"
                  >
                    {job.filename}
                  </Link>
                </td>
                <td
                  className={`p-2 border ${
                    job.status === "failed"
                      ? "text-red-600 font-medium"
                      : job.status === "done"
                      ? "text-green-600 font-medium"
                      : "text-yellow-600 font-medium"
                  }`}
                >
                  {job.status}
                </td>
                <td className="p-2 border">{job.rows}</td>
                <td className="p-2 border">
                  {new Date(job.created_at * 1000).toLocaleString()}
                </td>
                <td className="p-2 border">
                  {job.finished_at
                    ? new Date(job.finished_at * 1000).toLocaleString()
                    : "-"}
                </td>
                <td className="p-2 border">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
