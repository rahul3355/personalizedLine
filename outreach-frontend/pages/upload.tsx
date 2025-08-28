"use client";

import { useState } from "react";
import { API_URL } from "../lib/api";
import {
  Tag,
  Building2,
  FileText,
  MessageSquare,
  User,
  Share2,
  Hash,
  Upload,
} from "lucide-react";

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

  const [dragActive, setDragActive] = useState(false);

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-10 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Upload Outreach File</h1>
        <p className="text-gray-500 text-sm mt-1 mb-8">
          Import your CSV/XLSX and configure columns for personalization.
        </p>

        {/* Step 1 */}
        {!headers.length && (
          <div className="space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl py-12 transition ${
                dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50/30"
              }`}
            >
              <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                {file ? (
                  <span className="text-gray-700 font-medium">{file.name}</span>
                ) : (
                  <span className="text-gray-400">
                    Drag & drop or <span className="text-blue-600 underline">click</span> to upload file
                  </span>
                )}
              </label>
            </div>

            <button
              onClick={handleParseHeaders}
              disabled={loading}
              className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-full font-semibold shadow hover:opacity-90 disabled:opacity-50 transition"
            >
              {loading ? "Parsing..." : "Proceed"}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {headers.length > 0 && (
          <div className="space-y-8">
            {/* Choose Columns */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Choose Columns
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Title Column</label>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <select
                      className="flex-1 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 px-4 py-3 text-gray-700"
                      value={titleCol}
                      onChange={(e) => setTitleCol(e.target.value)}
                    >
                      <option value="">Select Title Column</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Company Column</label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <select
                      className="flex-1 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 px-4 py-3 text-gray-700"
                      value={companyCol}
                      onChange={(e) => setCompanyCol(e.target.value)}
                    >
                      <option value="">Select Company Column</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Description Column</label>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <select
                      className="flex-1 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 px-4 py-3 text-gray-700"
                      value={descCol}
                      onChange={(e) => setDescCol(e.target.value)}
                    >
                      <option value="">Select Description Column</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Personalization Settings */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Personalization Settings
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Offer</label>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={offer}
                      onChange={(e) => setOffer(e.target.value)}
                      className="flex-1 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 px-4 py-3 text-gray-700"
                      placeholder="Offer"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Persona</label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={persona}
                      onChange={(e) => setPersona(e.target.value)}
                      className="flex-1 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 px-4 py-3 text-gray-700"
                      placeholder="Persona"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Channel</label>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="flex-1 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 px-4 py-3 text-gray-700"
                      placeholder="Channel"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max Words</label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={maxWords}
                      onChange={(e) => setMaxWords(Number(e.target.value))}
                      className="flex-1 rounded-xl border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 px-4 py-3 text-gray-700"
                      placeholder="Max Words"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                ❌ {error}
              </div>
            )}
            {jobId && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
                ✅ Job created! ID: <span className="font-mono">{jobId}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleCreateJob}
              disabled={loading}
              className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-full font-semibold shadow hover:opacity-90 disabled:opacity-50 transition mt-2"
            >
              {loading ? "Submitting..." : "Start Job"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
