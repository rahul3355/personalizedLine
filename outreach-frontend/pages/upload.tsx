"use client";

import { useState, useEffect } from "react";
import { API_URL } from "../lib/api";
import { Tag, Building2, FileText, Upload, Briefcase, Users } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";

export default function UploadPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [tempPath, setTempPath] = useState<string | null>(null);

  const [companyCol, setCompanyCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [industryCol, setIndustryCol] = useState("");
  const [titleCol, setTitleCol] = useState("");
  const [sizeCol, setSizeCol] = useState("");

  const [service, setService] = useState("");

  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState(0); // 0 = upload, 1 = confirm headers, 2 = confirm service

  // 🔒 protect route
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  // --- Auto-map headers after parse ---
  const autoMapHeaders = (headers: string[]) => {
    const findMatch = (candidates: string[]) => {
      return (
        headers.find((h) =>
          candidates.some((c) => h.toLowerCase().includes(c))
        ) || ""
      );
    };

    setCompanyCol(findMatch(["cleaned company name", "company name", "organization"]));
    setDescCol(findMatch(["company short description", "description", "about"]));
    setIndustryCol(findMatch(["industry", "sector", "field"]));
    setTitleCol(findMatch(["title", "seniority", "role", "position"]));
    setSizeCol(findMatch(["employee count", "size", "headcount", "staff"]));
  };

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

      // auto assign defaults
      autoMapHeaders(data.headers);

      setStep(1);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHeaders = () => {
    if (!companyCol || !descCol || !industryCol || !titleCol || !sizeCol) {
      setError("Please select all required columns");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleCreateJob = async () => {
    if (!tempPath || !companyCol || !descCol || !industryCol || !titleCol || !sizeCol || !service) {
      setError("Please complete all required fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file_path", tempPath);
      formData.append("company_col", companyCol);
      formData.append("desc_col", descCol);
      formData.append("industry_col", industryCol);
      formData.append("title_col", titleCol);
      formData.append("size_col", sizeCol);
      formData.append("service", service);

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
    <div className="flex items-start justify-center bg-gray-50 px-4 py-10 font-sans min-h-[calc(80vh-64px)]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-10 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Upload Outreach File
        </h1>
        <p className="text-gray-500 text-sm mt-1 mb-8">
          Import your CSV/XLSX and configure columns for personalization.
        </p>

        {/* Step 0: Upload File */}
        {step === 0 && (
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
            >
              {loading ? "Parsing..." : "Proceed"}
            </button>
          </div>
        )}

        {/* Step 1: Confirm Headers */}
        {step === 1 && (
          <div className="space-y-8 mt-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">
                Confirm Headers
              </h2>
              <div className="grid grid-cols-2 gap-6">
                {[
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
                  {
                    label: "Industry Column",
                    value: industryCol,
                    setValue: setIndustryCol,
                    icon: <Briefcase className="h-4 w-4 text-gray-400" />,
                  },
                  {
                    label: "Title Column",
                    value: titleCol,
                    setValue: setTitleCol,
                    icon: <Tag className="h-4 w-4 text-gray-400" />,
                  },
                  {
                    label: "Size Column",
                    value: sizeCol,
                    setValue: setSizeCol,
                    icon: <Users className="h-4 w-4 text-gray-400" />,
                  },
                ].map((field) => (
                  <div key={field.label} className="space-y-1">
                    <label className="text-xs text-gray-500 block">
                      {field.label}
                    </label>
                    <div className="flex items-center gap-2">
                      {field.icon}
                      <select
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-100 shadow-inner focus:ring-2 focus:ring-gray-900 focus:border-gray-900 px-4 py-2.5 text-gray-700 text-sm transition-all"
                        value={field.value}
                        onChange={(e) => field.setValue(e.target.value)}
                      >
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

            <button
              onClick={handleConfirmHeaders}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(#444, #1c1c1c)",
              }}
            >
              Confirm Headers
            </button>
          </div>
        )}

        {/* Step 2: Confirm Service */}
        {step === 2 && (
          <div className="space-y-8 mt-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Service Context
              </h2>
              <textarea
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. Lead generation services (appointment setting, outbound campaigns)"
                className="w-full rounded-lg border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 px-4 py-3 text-gray-700 text-sm transition-all min-h-[120px]"
              />
            </div>

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

            <button
              onClick={handleCreateJob}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(#444, #1c1c1c)",
              }}
            >
              {loading ? "Submitting..." : "Confirm Service"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
