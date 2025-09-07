"use client";

import { useState, useEffect } from "react";
import { API_URL } from "../lib/api";
import { Tag, Building2, FileText, Upload, Briefcase, Users } from "lucide-react";
import { useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import confettiAnim from "../public/confetti.json";
import { supabase } from "../lib/supabaseClient";


const StepTracker = ({ step, jobCreated }: { step: number; jobCreated: boolean }) => {
  const steps = ["Upload File", "Confirm Headers", "Confirm Service"];

  return (
    <div className="flex items-center justify-center space-x-8 mb-10">
      {steps.map((label, index) => {
        const current = index;
        const isCompleted = current < step || (current === 2 && jobCreated);
        const isActive = current === step && !isCompleted;

        return (
          <div key={index} className="flex items-center space-x-2">
            <motion.div
              className={`w-8 h-8 flex items-center justify-center rounded-full border-2 text-base font-medium leading-none
    ${isCompleted ? "border-green-500 bg-green-500 text-white" : ""}
    ${isActive ? "border-blue-500 bg-blue-100 text-blue-700" : ""}
    ${!isCompleted && !isActive ? "border-gray-300 bg-white text-gray-400" : ""}
  `}
              animate={isActive && current === 0 ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.6, repeat: isActive && current === 0 ? Infinity : 0 }}
            >
              {isCompleted ? "✓" : index + 1}
            </motion.div>

            <span
              className={`text-sm font-medium ${isCompleted ? "text-green-600" : isActive ? "text-blue-600" : "text-gray-500"
                }`}
            >
              {label}
            </span>

            {index < steps.length - 1 && (
              <div
                className={`w-16 h-1 rounded-full ${isCompleted ? "bg-green-500" : isActive ? "bg-blue-400" : "bg-gray-200"
                  }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function UploadPage() {
  const { user, session, loading: authLoading } = useAuth();
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
  const [jobCreated, setJobCreated] = useState(false);
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
      const userId = session?.user?.id;
      if (!userId) throw new Error("User not authenticated");

      // 1. Upload file directly to Supabase
      const storagePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("inputs")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      console.log("[Upload] File uploaded:", storagePath);

      // 2. Tell backend to parse it
      const res = await fetch(`${API_URL}/parse_headers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: storagePath, user_id: userId }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Backend failed: ${res.status} - ${errText}`);
      }

      const data = await res.json();
      if (!data.headers || !Array.isArray(data.headers)) {
        throw new Error("Invalid headers received from backend");
      }

      setHeaders(data.headers);
      setTempPath(data.file_path);
      autoMapHeaders(data.headers);

      console.log("[Upload] Headers parsed:", data.headers);
      setStep(1);
    } catch (err: any) {
      console.error("[Upload] ParseHeaders error:", err);
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
      const payload = {
        user_id: session?.user.id || "",        // must be a UUID string
        file_path: tempPath,             // comes from Step 1
        company_col: companyCol,         // chosen in Step 2
        desc_col: descCol,               // chosen in Step 2
        industry_col: industryCol,       // chosen in Step 2
        title_col: titleCol,             // chosen in Step 2
        size_col: sizeCol,               // chosen in Step 2
        service: service.trim() || "email outreach", // Step 3; fallback to default
      };

      const res = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text(); // <-- capture backend error body
        throw new Error(`Failed: ${res.status} - ${errText}`);
      }

      await res.json();

      setJobCreated(true);

      // redirect after confetti
      setTimeout(() => {
        router.push("/jobs");
      }, 1500);
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
    <>
      <div className="hidden md:block">
        <div className="hidden md:flex items-start justify-center bg-gray-50 px-4 py-10 font-sans min-h-[calc(80vh-64px)]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-10 border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Upload Outreach File
            </h1>
            <p className="text-gray-500 text-sm mt-1 mb-8">
              Import your CSV/XLSX and configure columns for personalization.
            </p>

            <StepTracker step={step} jobCreated={jobCreated} />

            {/* Step 0: Upload File */}
            {step === 0 && !jobCreated && (
              <div className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-12 transition ${dragActive
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
            {step === 1 && !jobCreated && (
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
            {step === 2 && !jobCreated && (
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

            {/* Confetti Success */}
            {jobCreated && (
              <div className="flex flex-col items-center justify-center py-12">
                <Lottie animationData={confettiAnim} loop={false} style={{ width: 220, height: 220 }} />
                <p className="mt-4 text-lg font-semibold text-green-600">
                  Job Created Successfully!
                </p>
                <p className="text-sm text-gray-500">Redirecting to Your Files...</p>
              </div>
            )}
          </div>
        </div>
      </div>

{/* Mobile Upload Section */}
{step === 0 && !jobCreated && (
  <div className="block md:hidden w-full h-[calc(100vh-159px)] px-4 flex items-center justify-center overflow-hidden relative -mt-[64px] pt-[64px]">
    <div className="max-w-md w-full space-y-6 mt-0">
      <h1 className="text-xl font-semibold text-gray-900 text-center">
        Upload Outreach File
      </h1>
      <p className="text-gray-500 text-sm text-center">
        Import your CSV/XLSX to begin personalization.
      </p>

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 text-center">
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
            <Upload className="h-10 w-10 text-gray-400 mb-3" />
            {file ? (
              <span className="text-gray-700 font-medium">{file.name}</span>
            ) : (
              <span className="text-gray-400 text-sm">Tap to upload file</span>
            )}
          </label>
        </div>

        <button
          onClick={handleParseHeaders}
          disabled={loading}
          className="w-full mt-6 py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(#444, #1c1c1c)" }}
        >
          {loading ? "Parsing..." : "Proceed"}
        </button>
      </div>
    </div>
  </div>
)}

{/* Mobile Confirm Headers Section */}
{step === 1 && !jobCreated && (
  <div className="block md:hidden w-full h-[calc(100vh-69px)] px-4 flex items-start justify-center overflow-hidden relative -mt-[64px] pt-[64px]">
    <div className="max-w-md w-full space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 text-center">
        Confirm Headers
      </h2>
      

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
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
            <label className="text-xs text-gray-500 block">{field.label}</label>
            <div className="flex items-center gap-2">
              {field.icon}
              <select
                className="flex-1 rounded-lg border border-gray-200 bg-gray-100 shadow-inner focus:ring-2 focus:ring-gray-900 focus:border-gray-900 px-3 py-2 text-gray-700 text-sm transition-all"
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

      <button
        onClick={handleConfirmHeaders}
        disabled={loading}
        className="w-full py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(#444, #1c1c1c)" }}
      >
        {loading ? "Submitting..." : "Confirm Headers"}
      </button>
    </div>
  </div>

  
)}

{/* Mobile Confirm Service Section */}
{step === 2 && !jobCreated && (
  <div className="block md:hidden w-full h-[calc(100vh-69px)] px-4 flex items-start justify-center pt-[64px]">
  <div className="max-w-md w-full space-y-6">
    <h2 className="text-lg font-semibold text-gray-900 text-center">
      Describe Your Service
    </h2>

    <textarea
      value={service}
      onChange={(e) => setService(e.target.value)}
      placeholder="e.g. Lead generation services (appointment setting, outbound campaigns)"
      className="w-full rounded-xl border border-black bg-white text-gray-900 text-[15px] px-4 py-3 resize-none 
                 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] transition-colors duration-200"
      rows={7}
    />

    <button
      onClick={handleCreateJob}
      disabled={loading}
      className="w-full py-3 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: "linear-gradient(#444, #1c1c1c)" }}
    >
      {loading ? "Submitting..." : "Start Generating"}
    </button>
  </div>
</div>
)}

{/* Mobile Success Section (Confetti + Redirect) */}
{jobCreated && (
  <div className="block md:hidden w-full h-[calc(100vh-69px)] px-4 flex flex-col items-center justify-center pt-[64px]">
    <Lottie
      animationData={confettiAnim}
      loop={false}
      style={{ width: 200, height: 200 }}
    />
    <p className="mt-4 text-lg font-semibold text-green-600 text-center">
      Job Created Successfully!
    </p>
    <p className="text-sm text-gray-500 text-center">
      Redirecting to Your Files...
    </p>
  </div>
)}








    </>

  );
}
