"use client";

import { useState } from "react";
import { API_URL } from "../lib/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [tempPath, setTempPath] = useState<string | null>(null);

  const [titleCol, setTitleCol] = useState("");
  const [companyCol, setCompanyCol] = useState("");
  const [descCol, setDescCol] = useState("");

  const [offer, setOffer] = useState("turning LinkedIn posts into calls");
  const [persona, setPersona] = useState("Founders");
  const [channel, setChannel] = useState("LinkedIn");
  const [maxWords, setMaxWords] = useState(24);

  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Upload file & parse headers
  const handleParseHeaders = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/parse_headers`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data = await res.json();
      setHeaders(data.headers);
      setTempPath(data.temp_path);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit job with metadata
  const handleCreateJob = async () => {
    if (!tempPath || !titleCol || !companyCol || !descCol) {
      setError("Please select all required columns");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file_path", tempPath);
      formData.append("title_col", titleCol);
      formData.append("company_col", companyCol);
      formData.append("desc_col", descCol);
      formData.append("offer", offer);
      formData.append("persona", persona);
      formData.append("channel", channel);
      formData.append("max_words", String(maxWords));

      const res = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

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

        {/* Step 1: Upload + Parse */}
        {!headers.length && (
          <>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mb-4"
            />

            <button
              onClick={handleParseHeaders}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Parsing..." : "Parse Headers"}
            </button>
          </>
        )}

        {/* Step 2: Choose Columns */}
        {headers.length > 0 && (
          <div className="space-y-3">
            <label className="block">
              Title Column
              <select
                className="w-full border p-2 rounded"
                value={titleCol}
                onChange={(e) => setTitleCol(e.target.value)}
              >
                <option value="">Select column</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>

            <label className="block">
              Company Column
              <select
                className="w-full border p-2 rounded"
                value={companyCol}
                onChange={(e) => setCompanyCol(e.target.value)}
              >
                <option value="">Select column</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>

            <label className="block">
              Description Column
              <select
                className="w-full border p-2 rounded"
                value={descCol}
                onChange={(e) => setDescCol(e.target.value)}
              >
                <option value="">Select column</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>

            {/* Extra Inputs */}
            <input
              type="text"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Offer"
            />
            <input
              type="text"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Persona"
            />
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="Channel"
            />
            <input
              type="number"
              value={maxWords}
              onChange={(e) => setMaxWords(Number(e.target.value))}
              className="w-full border p-2 rounded"
              placeholder="Max Words"
            />

            <button
              onClick={handleCreateJob}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Start Job"}
            </button>
          </div>
        )}

        {/* Results */}
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
