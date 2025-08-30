"use client";

import { useState, useEffect } from "react";
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
import { Listbox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";

export default function UploadPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

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

  // 🔒 protect route
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

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
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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

  if (authLoading) return <p>Loading...</p>;
  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-10 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Upload Outreach File
        </h1>
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
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-12 transition ${
                dragActive
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 bg-gray-50/50"
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
                  <span className="text-gray-400 text-sm">
                    Drag & drop or{" "}
                    <span className="text-gray-900 underline">click</span> to
                    upload file
                  </span>
                )}
              </label>
            </div>

            <button
              onClick={handleParseHeaders}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(#444, #1c1c1c)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow =
                    "0 0 8px rgba(0,0,0,0.25)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? "Parsing..." : "Proceed"}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {headers.length > 0 && (
          <div className="space-y-8 mt-6">
            {/* Choose Columns */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Choose Columns
              </h2>
              <div className="space-y-5">
                {[
                  {
                    label: "Title Column",
                    value: titleCol,
                    setValue: setTitleCol,
                    icon: <Tag className="h-4 w-4 text-gray-400" />,
                  },
                  {
                    label: "Company Column",
                    value: companyCol,
                    setValue: setCompanyCol,
                    icon: <Building2 className="h-4 w-4 text-gray-400" />,
                  },
                  {
                    label: "Description Column",
                    value: descCol,
                    setValue: setDescCol,
                    icon: <FileText className="h-4 w-4 text-gray-400" />,
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {field.label}
                    </label>
                    <div className="flex items-center gap-2">
                      {field.icon}
                      <select
                        className="flex-1 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 px-4 py-2.5 text-gray-700 text-sm transition-all"
                        value={field.value}
                        onChange={(e) => field.setValue(e.target.value)}
                      >
                        <option value="">Select {field.label}</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personalization Settings */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Personalization Settings
              </h2>
              <div className="space-y-5">
                {[
                  {
                    label: "Offer",
                    value: offer,
                    setValue: setOffer,
                    icon: <MessageSquare className="h-4 w-4 text-gray-400" />,
                  },
                  {
                    label: "Persona",
                    value: persona,
                    setValue: setPersona,
                    icon: <User className="h-4 w-4 text-gray-400" />,
                  },
                  {
                    label: "Channel",
                    value: channel,
                    setValue: setChannel,
                    icon: <Share2 className="h-4 w-4 text-gray-400" />,
                  },
                  {
                    label: "Max Words",
                    value: maxWords,
                    setValue: (val: any) => setMaxWords(Number(val)),
                    icon: <Hash className="h-4 w-4 text-gray-400" />,
                    type: "number",
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {field.label}
                    </label>
                    <div className="flex items-center gap-2">
                      {field.icon}
                      <input
                        type={field.type || "text"}
                        value={field.value}
                        onChange={(e) => field.setValue(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 px-4 py-2.5 text-gray-700 text-sm transition-all"
                        placeholder={field.label}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            {jobId && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
                Job created! ID: <span className="font-mono">{jobId}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleCreateJob}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(#444, #1c1c1c)",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow =
                    "0 0 8px rgba(0,0,0,0.25)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? "Submitting..." : "Start Job"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
