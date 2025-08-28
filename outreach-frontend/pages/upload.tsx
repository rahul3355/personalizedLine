"use client"; // add this at the very top of upload/page.tsx

import { useState } from "react";
import { API_URL } from "../lib/api";


export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`${API_URL}/jobs`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Upload failed: ${res.status}`);
            }

            const data = await res.json();
            setJobId(data.job_id);
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
            <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
                <h1 className="text-xl font-bold mb-4">Upload Outreach File</h1>

                <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mb-4"
                />

                <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Uploading..." : "Upload"}
                </button>

                {jobId && (
                    <p className="mt-4 text-green-600">
                        ✅ Job created! ID: <span className="font-mono">{jobId}</span>
                    </p>
                )}

                {error && <p className="mt-4 text-red-600">❌ {error}</p>}
            </div>
        </div>
    );
}
