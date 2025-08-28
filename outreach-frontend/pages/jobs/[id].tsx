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

  if (loading) return <p className="p-6 text-gray-600">Loading job details...</p>;
  if (error) return <p className="p-6 text-red-600">Error: {error}</p>;
  if (!job) return <p className="p-6 text-gray-600">No job found</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Job Detail</h1>

        <p><strong className="text-gray-700">ID:</strong> <span className="text-gray-900">{job.id}</span></p>
        <p><strong className="text-gray-700">Filename:</strong> <span className="text-gray-900">{job.filename}</span></p>
        <p><strong className="text-gray-700">Status:</strong> 
          <span className={
            job.status === "failed" ? "text-red-600 font-medium" :
            job.status === "done" ? "text-green-600 font-medium" : "text-yellow-600 font-medium"
          }>
            {job.status}
          </span>
        </p>
        <p><strong className="text-gray-700">Rows:</strong> <span className="text-gray-900">{job.rows}</span></p>
        <p><strong className="text-gray-700">Created:</strong> <span className="text-gray-900">{new Date(job.created_at * 1000).toLocaleString()}</span></p>
        <p><strong className="text-gray-700">Finished:</strong> <span className="text-gray-900">{job.finished_at ? new Date(job.finished_at * 1000).toLocaleString() : "-"}</span></p>
        <p><strong className="text-gray-700">Error:</strong> <span className="text-red-600">{job.error || "-"}</span></p>
        <p><strong className="text-gray-700">Result:</strong> 
          {job.result_path ? (
            <a href={`${API_URL}/jobs/${job.id}/download`} className="text-blue-600 underline">Download</a>
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
