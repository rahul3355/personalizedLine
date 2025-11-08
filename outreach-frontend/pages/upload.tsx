"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type DragEvent as ReactDragEvent,
} from "react";
import { Switch } from "@headlessui/react";
import { API_URL } from "../lib/api";
import {
  Upload as UploadIcon,
  Check,
  ArrowRight,
  ArrowLeft,
  X as XIcon,
  Info,
  RefreshCcw,
  Mail,
  FileText,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../lib/AuthProvider";
import { useRouter } from "next/router";
import { useToast } from "@/components/Toast";
import { supabase } from "../lib/supabaseClient";
// replace


const BRAND = "#4F55F1";
const BRAND_HOVER = "#3D42D8";
const BRAND_TINT = "rgba(79,85,241,0.12)";
const BRAND_SOFT = "rgba(79,85,241,0.22)";

const INITIAL_SERVICE_COMPONENTS = {
  core_offer: "",
  key_differentiator: "",
  cta: "",
} as const;

type ServiceFieldKey = keyof typeof INITIAL_SERVICE_COMPONENTS;
type ServiceComponents = Record<ServiceFieldKey, string>;
type ServiceHelpKey = ServiceFieldKey | "include_fallback";
type SerializedServiceComponents = ServiceComponents & {
  include_fallback: boolean;
  fallback_action?: string;
};

const buildFallbackAction = (coreOffer: string): string => {
  const trimmed = coreOffer.trim();
  if (!trimmed) {
    return "If you're not the right person, please connect me with whoever oversees this area of the business.";
  }

  return `If you're not the right person, please connect me with whoever oversees ${trimmed}.`;
};

const SERVICE_FIELDS: { key: ServiceFieldKey; label: string; placeholder: string }[] = [
  {
    key: "core_offer",
    label: "Core Offer",
    placeholder: "Explain the core product or service you're offering",
  },
  {
    key: "key_differentiator",
    label: "Key Differentiator",
    placeholder: "Share what makes this offering unique",
  },
  {
    key: "cta",
    label: "Call to Action",
    placeholder: "Describe the next step you'd like the reader to take",
  },
];

const HELP_CONTENT: Record<ServiceHelpKey, { what: string; why: string; example: string }> = {
  core_offer: {
    what: "The main product or service you're offering to prospects.",
    why: "This helps prospects quickly understand what you do and whether it's relevant to them.",
    example: "AI-powered email automation for sales teams",
  },
  key_differentiator: {
    what: "What makes your service unique or better than competitors.",
    why: "This shows prospects why they should choose you over alternatives.",
    example: "Generates personalized lines 10x faster than manual research",
  },
  cta: {
    what: "The specific action you want prospects to take next.",
    why: "This directs them clearly to the next step in your outreach process.",
    example: "Book a 15-minute demo call",
  },
  include_fallback: {
    what: "Whether you want to ask the reader to forward the email if they're not the right contact.",
    why: "Keeps momentum by inviting prospects to connect you with the correct decision-maker when needed.",
    example: "Toggle this on to add a forward request at the end of your email",
  },
};

const COPY = {
  title: "Upload prospects",
  sub: "CSV or XLSX • up to 100k rows • header row required",
  dz_idle: "Drag & drop or browse file",
  dz_selected: "",
  proceed: "Next",
};

// Step-specific titles/subtitles shown *under* the stepper
const STEP_META = [
  {
    title: "Upload",
    sub: "CSV or XLSX • up to 100k rows • header row required",
  },
  {
    title: "Email column",
    sub: "Choose which column contains the email address.",
  },
  {
    title: "Context",
    sub: "Describe your service so we can personalize outputs.",
  },
] as const;

type CreditInfo = {
  rowCount: number;
  creditsRemaining: number;
  missingCredits: number;
  hasEnoughCredits: boolean;
};





const HelpTooltip = ({ fieldKey }: { fieldKey: ServiceHelpKey }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const help = HELP_CONTENT[fieldKey];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {showTooltip && (
        <div
          className="absolute z-50 w-72 p-3 rounded-md"
          style={{
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(24, 25, 28, 0.95)",
            boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.3)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="space-y-2.5 text-sm" style={{ color: "#dbdee1" }}>
            <p className="leading-relaxed">{help.what}</p>
            <p className="leading-relaxed">{help.why}</p>
            <p className="leading-relaxed" style={{ color: "#b5bac1" }}>
              e.g., "{help.example}"
            </p>
            <div className="pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
              <p style={{ color: "#949ba4", fontSize: "0.8125rem" }}>
                Leave blank if not relevant to you.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StepTracker = ({
  step,
  jobCreated,
}: {
  step: number;
  jobCreated: boolean;
}) => {
  const steps = ["Upload", "Email", "Context"];

  return (
    <div className="flex justify-center items-center mb-6">
      <div
        className="inline-flex items-center rounded-2xl bg-gray-50 border border-gray-100 px-6 py-3 shadow-sm"
        style={{ fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui' }}
      >
        {steps.map((label, i) => {
          const done = i < step || (i === 2 && jobCreated);
          const current = i === step && !done;

          const base =
            "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold";
          const circleStyle = done
            ? { backgroundColor: BRAND, border: `1px solid ${BRAND}`, color: "white" }
            : current
              ? { backgroundColor: "white", border: `2px solid ${BRAND}`, color: BRAND }
              : { backgroundColor: "white", border: "1px solid #E5E7EB", color: "#6B7280" };

          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-3">
                <span className={base} style={circleStyle}>
                  {done ? (
                    <Check className="w-4 h-4" stroke="white" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>

                <span
                  className="text-sm"
                  style={{
                    color: current || done ? BRAND : "#6B7280",
                    fontWeight: current ? 600 : 500,
                  }}
                >
                  {label}
                </span>
              </div>

              {i < steps.length - 1 && (
                <ArrowRight className="mx-4 h-4 w-4" style={{ color: BRAND_SOFT }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};




export default function UploadPage() {
  const { session, loading: authLoading, refreshUserInfo } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [tempPath, setTempPath] = useState<string | null>(null);

  const [emailCol, setEmailCol] = useState("");

  const [serviceComponents, setServiceComponents] = useState<ServiceComponents>(
    () => ({ ...INITIAL_SERVICE_COMPONENTS })
  );
  const [includeFallback, setIncludeFallback] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [jobCreated, setJobCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [refreshingCredits, setRefreshingCredits] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState(0); // 0 = upload, 1 = confirm headers, 2 = confirm service

  const [showDropOverlay, setShowDropOverlay] = useState(false);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewEmails, setPreviewEmails] = useState<string[]>([]);
  const [selectedPreviewEmail, setSelectedPreviewEmail] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    email: string;
    email_body: string;
    credits_remaining: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const hasCreditShortage = Boolean(creditInfo && !creditInfo.hasEnoughCredits);
  const formatNumber = useCallback((value: number) => value.toLocaleString(), []);


  const emptyInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const clearFileInputs = () => {
    if (emptyInputRef.current) emptyInputRef.current.value = "";
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  const updateServiceComponent = (key: ServiceFieldKey, value: string) => {
    setServiceComponents((prev) => ({ ...prev, [key]: value }));
  };

  const isServiceContextComplete = () =>
    serviceComponents.core_offer.trim().length > 0;

  const serializeServicePayload = () => {
    const payload: SerializedServiceComponents = {
      ...serviceComponents,
      include_fallback: includeFallback,
    };

    if (includeFallback) {
      payload.fallback_action = buildFallbackAction(serviceComponents.core_offer);
    }

    return JSON.stringify(payload);
  };

  const renderServiceInputs = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SERVICE_FIELDS.map((field) => (
          <div
            key={field.key}
            className={`flex flex-col gap-2 ${
              field.key === "core_offer" ? "md:col-span-2" : ""
            }`}
          >
            <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              {field.label}
              <HelpTooltip fieldKey={field.key} />
            </label>
            <textarea
              autoFocus={field.key === "core_offer"}
              value={serviceComponents[field.key]}
              onChange={(e) => updateServiceComponent(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm transition focus:border-[#4F55F1] focus:ring-2 focus:ring-[#4F55F1]"
              rows={field.key === "core_offer" ? 4 : 3}
              required={field.key === "core_offer"}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
          <span className="font-semibold">Include fallback?</span>
          <HelpTooltip fieldKey="include_fallback" />
        </span>
        <div className="flex items-center gap-3 text-xs font-semibold text-gray-700">
          <Switch
            checked={includeFallback}
            onChange={setIncludeFallback}
            className={`${
              includeFallback ? "bg-[#4F55F1]" : "bg-gray-200"
            } relative inline-flex h-6 w-11 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F55F1]`}
          >
            <span className="sr-only">Toggle fallback forwarding request</span>
            <span
              aria-hidden="true"
              className={`${
                includeFallback ? "translate-x-6" : "translate-x-1"
              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
            />
          </Switch>
          <span>{includeFallback ? "On" : "Off"}</span>
        </div>
      </div>
    </div>
  );

  const handleFileSelection = useCallback(
    (next: File | null) => {
      setFile(next);
      setHeaders([]);
      setTempPath(null);
      setCreditInfo(null);
      setError(null);
      setJobCreated(false);
      setStep(0);
      setEmailCol("");
      setServiceComponents({ ...INITIAL_SERVICE_COMPONENTS });
      setIncludeFallback(false);
      setRefreshingCredits(false);
    },
    []
  );



  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    const isFileDrag = (e: DragEvent) => {
      const dt = e.dataTransfer;
      if (!dt) return false;
      try {
        return Array.from(dt.types || []).includes("Files");
      } catch {
        return false;
      }
    };

    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const show = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      prevent(e);
      setShowDropOverlay(true);
    };

    const hide = () => {
      setShowDropOverlay(false);
    };

    const onDragEnter = (e: DragEvent) => {
      show(e);
    };

    const onDragOver = (e: DragEvent) => {
      show(e);
    };

    // Hide when the pointer leaves the viewport (address bar, tabs, outside window)
    const onDragLeave = (e: DragEvent) => {
      prevent(e);
      const any = e as any;
      const outOfWindow =
        (any.clientX <= 0 ||
          any.clientY <= 0 ||
          any.clientX >= window.innerWidth ||
          any.clientY >= window.innerHeight) &&
        !any.relatedTarget;
      if (outOfWindow) hide();
    };

    const onDrop = (e: DragEvent) => {
      prevent(e);
      hide();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
        clearFileInputs();
      }
    };

    const onDragEnd = () => hide();
    const onBlur = () => hide();
    const onMouseLeave = () => hide();
    const onVisibility = () => { if (document.hidden) hide(); };
    const onKeyDown = (ev: KeyboardEvent) => { if (ev.key === "Escape") hide(); };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("blur", onBlur);
    window.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);


  const autoMapHeaders = (headers: string[], guess?: string | null) => {
    if (guess && headers.includes(guess)) {
      setEmailCol(guess);
      return;
    }

    const normalize = (text: string) => text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const targets = ["email", "emails", "e-mail", "e-mails", "mail", "mails"].map(normalize);

    for (const header of headers) {
      const normalizedHeader = normalize(header);
      if (targets.includes(normalizedHeader)) {
        setEmailCol(header);
        return;
      }
    }

    for (const header of headers) {
      const parts = header
        .trim()
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      if (parts.some((part) => part === "email" || part === "mail")) {
        setEmailCol(header);
        return;
      }
    }

    setEmailCol((prev) => (prev && headers.includes(prev) ? prev : ""));
  };

  const applyCreditPayload = (
    payload: any,
    options: { autoMap?: boolean; fallbackPath?: string } = {}
  ) => {
    if (payload && Array.isArray(payload.headers)) {
      setHeaders(payload.headers);
      const guess =
        typeof payload.email_header_guess === "string"
          ? payload.email_header_guess
          : null;
      if (options.autoMap) {
        autoMapHeaders(payload.headers, guess);
      } else {
        setEmailCol((prev) => {
          if (prev && payload.headers.includes(prev)) {
            return prev;
          }
          if (guess && payload.headers.includes(guess)) {
            return guess;
          }
          return "";
        });
      }
    }

    if (payload && typeof payload.file_path === "string") {
      setTempPath(payload.file_path);
    } else if (options.fallbackPath) {
      setTempPath(options.fallbackPath);
    }

    const hasRow = payload && payload.row_count !== undefined && payload.row_count !== null;
    const hasCredits =
      payload && payload.credits_remaining !== undefined && payload.credits_remaining !== null;
    const hasMissing =
      payload && payload.missing_credits !== undefined && payload.missing_credits !== null;
    const hasEnoughProvided = payload && typeof payload.has_enough_credits === "boolean";

    if (hasRow || hasCredits || hasMissing || hasEnoughProvided) {
      const rowCount = hasRow
        ? Number(payload.row_count) || 0
        : creditInfo?.rowCount ?? 0;
      const creditsRemaining = hasCredits
        ? Number(payload.credits_remaining) || 0
        : creditInfo?.creditsRemaining ?? 0;
      const missingCredits = hasMissing
        ? Math.max(0, Number(payload.missing_credits) || 0)
        : Math.max(0, rowCount - creditsRemaining);
      const hasEnough = hasEnoughProvided
        ? payload.has_enough_credits
        : creditsRemaining >= rowCount;

      setCreditInfo({
        rowCount,
        creditsRemaining,
        missingCredits,
        hasEnoughCredits: hasEnough,
      });
    }
  };

  const parseStoredFile = async (
    storagePath: string,
    token: string,
    options: { autoMap?: boolean } = {}
  ) => {
    const res = await fetch(`${API_URL}/parse_headers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ file_path: storagePath }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Backend failed: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (!data.headers || !Array.isArray(data.headers)) {
      throw new Error("Invalid headers received from backend");
    }
    applyCreditPayload(data, { autoMap: options.autoMap, fallbackPath: storagePath });
    return data;
  };

  const handleRefreshCredits = useCallback(async () => {
    if (!tempPath || !session?.access_token) return;
    setRefreshingCredits(true);
    setError(null);
    try {
      await refreshUserInfo();
      await parseStoredFile(tempPath, session.access_token, { autoMap: false });
    } catch (err: any) {
      console.error("[Upload] Refresh credits error:", err);
      setError(err.message || "Unable to refresh credits");
    } finally {
      setRefreshingCredits(false);
    }
  }, [tempPath, session, refreshUserInfo]);

  const renderCreditBanner = (compact = false) => {
    if (!creditInfo) return null;

    const { rowCount, creditsRemaining, missingCredits, hasEnoughCredits } = creditInfo;
    const stateClasses = hasEnoughCredits
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
    const iconClasses = hasEnoughCredits
      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-200"
      : "bg-amber-500/10 text-amber-700 border border-amber-200";
    const layoutClasses = compact
      ? "space-y-3"
      : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

    return (
      <div className={`mb-4 rounded-xl border px-4 py-3 ${stateClasses}`}>
        <div className={layoutClasses}>
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full ${iconClasses}`}
            >
              <Info className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                This file contains {formatNumber(rowCount)} rows.
              </p>
              <p className="text-sm">
                {hasEnoughCredits ? (
                  <>
                    You&apos;re good to go — you have {formatNumber(creditsRemaining)}
                    credits available. Running this job will use
                    {" "}{formatNumber(rowCount)} credits.
                  </>
                ) : (
                  <>
                    You have {formatNumber(creditsRemaining)} credits remaining, so
                    you&apos;re short {formatNumber(missingCredits)} credits. Add
                    credits to continue.
                  </>
                )}
              </p>
            </div>
          </div>

          {!hasEnoughCredits && (
            <div
              className={`${compact ? "flex flex-col" : "flex flex-wrap"} gap-2 sm:justify-end`}
            >
              <button
                type="button"
                onClick={() => router.push("/billing")}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
                style={{
                  borderColor: "rgba(249, 115, 22, 0.3)",
                  color: "#B45309",
                  backgroundColor: "rgba(254, 243, 199, 0.6)",
                }}
              >
                Buy credits
              </button>
              <button
                type="button"
                onClick={handleRefreshCredits}
                disabled={refreshingCredits || !tempPath || !session?.access_token}
                className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: BRAND_SOFT, color: BRAND }}
              >
                <RefreshCcw className={`h-4 w-4 ${refreshingCredits ? "animate-spin" : ""}`} />
                {refreshingCredits ? "Refreshing..." : "I've added credits"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleParseHeaders = async (): Promise<boolean> => {
    if (!file) {
      setError("Please select a file first");
      return false;
    }

    if (!session?.access_token) {
      setError("Session not ready. Please wait a moment.");
      return false;
    }

    setError(null);
    setLoading(true);

    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error("User not authenticated");

      const storagePath = `${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("inputs")
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      console.log("[Upload] File uploaded:", storagePath);

      const data = await parseStoredFile(storagePath, session.access_token, {
        autoMap: true,
      });
      console.log("[Upload] Headers parsed:", data.headers);
      setTimeout(() => {
        setStep(1);
      }, 500);

      return true;
    } catch (err: any) {
      console.error("[Upload] ParseHeaders error:", err);
      setError(err.message || "Something went wrong");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmHeaders = async (): Promise<boolean> => {
    if (!emailCol) {
      setError("Please select an email column");
      return false;
    }

    if (hasCreditShortage) {
      return false;
    }

    setError(null);

    setTimeout(() => {
      setStep(2);
    }, 500);

    return true;
  };

  const handleCreateJob = async (): Promise<boolean> => {
    if (!tempPath || !emailCol || !isServiceContextComplete()) {
      setError("Please provide your core offer to continue");
      return false;
    }

    if (hasCreditShortage) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        user_id: session?.user.id || "",
        file_path: tempPath,
        email_col: emailCol,
        service: serializeServicePayload(),
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
        if (res.status === 402) {
          let detail: any = null;
          try {
            const body = await res.json();
            detail = typeof body.detail === "object" ? body.detail : body;
          } catch (jsonErr) {
            console.error("[Upload] Failed to parse credit error:", jsonErr);
          }

          if (detail) {
            applyCreditPayload(detail);
          }

          return false;
        }

        const errText = await res.text();
        throw new Error(`Failed: ${res.status} - ${errText}`);
      }

      await res.json();

      try {
        await refreshUserInfo();
      } catch (refreshErr) {
        console.error("[Upload] Failed to refresh user info after job creation", refreshErr);
      }

      setJobCreated(true);
      toast({
        type: "success",
        message: "Job started! Redirecting to Jobs...",
      });
      router.push("/jobs");

      return true;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleShowPreview = async () => {
    if (!tempPath || !emailCol) {
      setPreviewError("Please complete the previous steps first");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      console.log("[Preview] Fetching emails with:", { tempPath, emailCol });

      const res = await fetch(`${API_URL}/preview/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          file_path: tempPath,
          email_col: emailCol,
        }),
      });

      if (!res.ok) {
        let errorMessage = `Failed to fetch preview emails (${res.status})`;
        try {
          const errorData = await res.json();
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string'
              ? errorData.detail
              : JSON.stringify(errorData.detail);
          }
        } catch {
          const errText = await res.text();
          errorMessage = errText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("[Preview] Received emails:", data.emails);

      setPreviewEmails(data.emails || []);
      setShowPreview(true);
      if (data.emails && data.emails.length > 0) {
        setSelectedPreviewEmail(data.emails[0]);
      } else {
        setSelectedPreviewEmail("");
        setPreviewError("No emails found in the file. Please check your data.");
      }
    } catch (err: any) {
      console.error("[Upload] Preview emails error:", err);
      setPreviewError(err.message || "Failed to load preview emails");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedPreviewEmail || selectedPreviewEmail === "") {
      setPreviewError("Please select an email from the dropdown");
      return;
    }

    if (!isServiceContextComplete()) {
      setPreviewError("Please provide your core offer to generate a preview");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);

    try {
      console.log("[Preview] Generating preview for:", selectedPreviewEmail);

      const res = await fetch(`${API_URL}/preview/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          file_path: tempPath,
          email_col: emailCol,
          selected_email: selectedPreviewEmail,
          service: serializeServicePayload(),
        }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          const body = await res.json();
          setPreviewError(body.detail?.message || "Insufficient credits for preview");
          return;
        }
        let errorMessage = `Failed to generate preview (${res.status})`;
        try {
          const errorData = await res.json();
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string'
              ? errorData.detail
              : JSON.stringify(errorData.detail);
          }
        } catch {
          const errText = await res.text();
          errorMessage = errText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log("[Preview] Generated preview:", data);
      setPreviewResult(data);

      // Update credit info
      if (creditInfo) {
        setCreditInfo({
          ...creditInfo,
          creditsRemaining: data.credits_remaining,
        });
      }

      // Refresh user info to update credits in the header
      try {
        await refreshUserInfo();
      } catch (refreshErr) {
        console.error("[Upload] Failed to refresh user info after preview", refreshErr);
      }
    } catch (err: any) {
      console.error("[Upload] Preview generation error:", err);
      setPreviewError(err.message || "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDrag = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) {
      handleFileSelection(f);
      clearFileInputs();  // ensure same-file selection works later
    }
  };


  if (authLoading) return <p>Loading...</p>;
  if (!session) return null;

  return (
    <>
      {/* DESKTOP */}
      <div className="hidden md:block">
        <section
          className="md:px-8 md:py-6 min-h-[calc(100vh-170px)] bg-white"
          style={{ fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui' }}
        >
          <div className="max-w-[960px] mx-auto">
            {/* Header: stepper first, then dynamic title */}
            <div className="mb-2">
              <StepTracker step={step} jobCreated={jobCreated} />
            </div>

            {/* Show title/subtitle only after step 0 */}
           {/* Apple-style contextual framing */}
{step === 0 && (
  <header className="mb-8 text-center">
    <h1
      className="text-[22px] font-semibold text-gray-900 tracking-tight"
      style={{ letterSpacing: "-0.01em" }}
    >
      Enrich Your Leads
    </h1>
    <p className="text-[14px] text-gray-600 font-light mt-1">
      We’ll scan your file, detect key details, and prepare it for mapping.
    </p>
  </header>
)}

{step > 0 && (
  <header className="mb-6 text-center">
    <h1
      className="text-[22px] font-semibold text-gray-900 tracking-tight"
      style={{ letterSpacing: "-0.01em" }}
    >
      {STEP_META[step].title}
    </h1>
    {STEP_META[step].sub && (
      <p className="text-[13px] text-gray-600 font-light mt-1">
        {STEP_META[step].sub}
      </p>
    )}
          </header>
)}




            {/* NO CARD — direct on base background */}
            {!jobCreated && renderCreditBanner()}
            {/* Step 0: Upload */}
            {step === 0 && !jobCreated && (
              <div className="flex flex-col">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={[
                    "relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer bg-gray-50",
                    "px-6 py-14",
                    dragActive
                      ? "border-[#4F55F1] bg-[rgba(79,85,241,0.06)]"
                      : "border-gray-400 hover:border-[#4F55F1] hover:bg-[rgba(79,85,241,0.04)]",
                  ].join(" ")}
                  onClick={() => { if (!file) emptyInputRef.current?.click(); }}
                >
                  <input
                    id="file-input-desktop-empty"
                    ref={emptyInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onClick={(e) => ((e.target as HTMLInputElement).value = "")}
                    onChange={(e) => {
                      const next = e.target.files?.[0] || null;
                      handleFileSelection(next);
                      e.currentTarget.value = "";
                    }}
                  />

                  {!file && (
                    <div className="text-center">
                      <UploadIcon
                        className="mx-auto mb-4"
                        style={{ width: 36, height: 36, color: BRAND }}
                      />
                      <p className="text-sm font-medium text-gray-800 mb-2">
                        Upload Your File
                      </p>
                      <p className="text-xs text-gray-500">
                        CSV/XLSX up to 100k rows
                      </p>
                      <button
                        type="button"
                        className="mt-4 px-6 py-2 rounded-full text-white font-medium"
                        style={{ backgroundColor: BRAND }}
                        onClick={() => emptyInputRef.current?.click()}
                      >
                        Browse File
                      </button>
                    </div>
                  )}

                  {file && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelection(null);
                          clearFileInputs();
                        }}
                        className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
                      >
                        <XIcon className="w-4 h-4" style={{ color: BRAND }} />
                      </button>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: BRAND_TINT }}>
                            <FileText className="w-5 h-5" style={{ color: BRAND }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(3)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <button
                            type="button"
                            className="text-sm font-medium"
                            style={{ color: BRAND }}
                            onClick={(e) => { e.stopPropagation(); replaceInputRef.current?.click(); }}
                          >
                            Replace
                          </button>
                          <input
                            ref={replaceInputRef}
                            type="file"
                            accept=".csv,.xlsx"
                            className="hidden"
                            onChange={(e) => {
                              const next = e.target.files?.[0] || null;
                              handleFileSelection(next);
                              e.currentTarget.value = "";
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* Only render footer button if file exists */}
                {file && (
                  <div className="mt-6 flex items-center justify-center">
                    <button
                      onClick={handleParseHeaders}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-white font-medium disabled:cursor-not-allowed"
                      style={{ backgroundColor: loading ? "#D1D5DB" : BRAND }}
                    >
                      Upload & Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* Step 1: Confirm Headers (compact) */}
            {step === 1 && !jobCreated && (
              <div className="flex flex-col">
                <div className="space-y-5">

                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 block">
                      Email Column
                    </label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" style={{ color: BRAND }} />
                      <select
                        className="flex-1 rounded-md border bg-white px-3 py-2 text-sm focus:ring-2"
                        style={{
                          borderColor: "#E5E7EB",
                          outline: "none",
                          boxShadow: "none",
                        }}
                        value={emailCol}
                        onChange={(e) => setEmailCol(e.target.value)}
                        onFocus={(e) =>
                          ((e.target as HTMLSelectElement).style.borderColor = BRAND)
                        }
                        onBlur={(e) =>
                          ((e.target as HTMLSelectElement).style.borderColor = "#E5E7EB")
                        }
                      >
                        <option value="" disabled>
                          Select a column
                        </option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500">
                      We&apos;ll only send the selected email column to generate your personalized lines.
                    </p>
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                      {error}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm hover:bg-[rgba(79,85,241,0.04)]"
                    style={{ borderColor: BRAND_SOFT, color: BRAND }}
                    title="Previous"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={handleConfirmHeaders}
                    disabled={loading || hasCreditShortage}
                    title={hasCreditShortage ? "Add credits to continue" : undefined}
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                    style={{ backgroundColor: BRAND }}
                    onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      BRAND_HOVER)
                    }
                    onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      BRAND)
                    }
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Confirm Service (compact) */}
            {step === 2 && !jobCreated && (
              <div className="flex flex-col">
                <div className="space-y-4">

                  {renderServiceInputs()}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                      {error}
                    </div>
                  )}

                  {/* Preview Section */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex flex-col items-center">
                      {!showPreview && !previewResult && (
                        <button
                          type="button"
                          onClick={handleShowPreview}
                          disabled={previewLoading || !isServiceContextComplete()}
                          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: BRAND }}
                        >
                          {previewLoading ? "Loading..." : "Preview"}
                        </button>
                      )}

                      {showPreview && !previewResult && (
                        <div className="w-full max-w-md space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 block text-center">
                              Select an email to preview ({previewEmails.length} available)
                            </label>
                            <select
                              value={selectedPreviewEmail}
                              onChange={(e) => setSelectedPreviewEmail(e.target.value)}
                              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition focus:border-[#4F55F1] focus:ring-2 focus:ring-[#4F55F1]"
                            >
                              <option value="">-- Select an email --</option>
                              {previewEmails.map((email) => (
                                <option key={email} value={email}>
                                  {email}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowPreview(false);
                                setPreviewEmails([]);
                                setSelectedPreviewEmail("");
                                setPreviewError(null);
                              }}
                              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md border text-sm hover:bg-gray-50"
                              style={{ borderColor: "#E5E7EB", color: "#6B7280" }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleGeneratePreview}
                              disabled={previewLoading || !selectedPreviewEmail}
                              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: BRAND }}
                            >
                              {previewLoading ? "Generating..." : "Start Preview"}
                            </button>
                          </div>
                        </div>
                      )}

                      {previewError && (
                        <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                          {previewError}
                        </div>
                      )}

                      {previewResult && (
                        <div className="w-full mt-4 space-y-4">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-green-800">
                                  Preview Generated
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  For: {previewResult.email}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="text-xs font-medium text-green-800 block mb-2">
                                Personalized Email:
                              </label>
                              <div className="bg-white border border-green-200 rounded-md p-4 text-sm text-gray-900 whitespace-pre-wrap">
                                {previewResult.email_body}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowPreview(false);
                                setPreviewEmails([]);
                                setSelectedPreviewEmail("");
                                setPreviewResult(null);
                                setPreviewError(null);
                              }}
                              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-white font-medium"
                              style={{ backgroundColor: BRAND }}
                            >
                              Generate Another Preview
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm hover:bg-[rgba(79,85,241,0.04)]"
                    style={{ borderColor: BRAND_SOFT, color: BRAND }}
                    title="Previous"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={handleCreateJob}
                    disabled={loading || hasCreditShortage}
                    title={hasCreditShortage ? "Add credits to continue" : undefined}
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                    style={{ backgroundColor: BRAND }}
                    onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      BRAND_HOVER)
                    }
                    onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      BRAND)
                    }
                  >
                    {loading ? "Generating…" : "Generate"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {showDropOverlay && (
              <div className="fixed inset-0 z-[60] bg-white/70 flex items-center justify-center">
                {/* keep event-capture layer so drop still works */}
                <div
                  className="absolute inset-0"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  aria-hidden
                />
                <div className="relative flex flex-col items-center justify-center p-0">
                  {/* use your svg */}
                  <img src="/dnd.png" alt="Drag and drop" className="w-[172px] h-[172px]" />
                  <p className="mt-3 text-gray-700 font-medium">Drop to upload CSV/XLSX</p>
                </div>
              </div>
            )}

          </div>
        </section>
      </div>

      {/* Mobile sections kept intact for functionality; desktop changes satisfy requirements */}
      {step === 0 && !jobCreated && (
        <div className="block md:hidden w-full h-[calc(100vh-159px)] px-4 flex items-center justify-center overflow-hidden relative -mt-[64px] pt-[64px] bg-white">
          <div className="max-w-md w-full space-y-6 mt-0" style={{ fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui' }}>
            <h1 className="text-xl font-semibold text-gray-900 text-center">
              Upload Outreach File
            </h1>
            <p className="text-gray-500 text-sm text-center">
              Import your CSV/XLSX to begin personalization.
            </p>
            {renderCreditBanner(true)}

            <div className="rounded-xl border-2 border-dashed p-8 text-center"
              style={{ borderColor: "#E5E7EB" }}
              onClick={() => document.getElementById("mobile-file-input")?.click()}
            >
              <input
                id="mobile-file-input"
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const next = e.target.files?.[0] || null;
                  handleFileSelection(next);
                  (e.target as HTMLInputElement).value = "";
                }}
              />
              <UploadIcon className="h-10 w-10 mx-auto mb-3" style={{ color: BRAND }} />
              {file ? (
                <span className="text-gray-700 font-medium">{file.name}</span>
              ) : (
                <span className="text-gray-600 text-sm">
                  Tap to upload file
                </span>
              )}
            </div>

            <button
              onClick={handleParseHeaders}
              disabled={loading || !file}
              className="w-full py-3 rounded-md font-medium text-white text-[15px] tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "Parsing..." : "Proceed"}
            </button>
          </div>
        </div>
      )}

      {step === 1 && !jobCreated && (
        <div className="block md:hidden w-full h-[calc(100vh-69px)] px-4 flex items-start justify-center overflow-hidden relative -mt-[64px] pt-[64px] bg-white">
          <div className="max-w-md w-full space-y-6" style={{ fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui' }}>
            <h2 className="text-lg font-semibold text-gray-900 text-center">Confirm Email Column</h2>
            {renderCreditBanner(true)}
            <div className="rounded-xl border p-6 space-y-3" style={{ borderColor: "#E5E7EB" }}>
              <label className="text-xs text-gray-500 block">Email Column</label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" style={{ color: BRAND }} />
                <select
                  className="flex-1 rounded-md border bg-white px-3 py-2 text-sm"
                  style={{ borderColor: "#E5E7EB" }}
                  value={emailCol}
                  onChange={(e) => setEmailCol(e.target.value)}
                >
                  <option value="" disabled>
                    Select a column
                  </option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                Only the selected email column will be processed downstream.
              </p>
            </div>

            <button
              onClick={handleConfirmHeaders}
              disabled={loading || hasCreditShortage}
              title={hasCreditShortage ? "Add credits to continue" : undefined}
              className="w-full py-3 rounded-md font-medium text-white text-[15px] tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "Submitting..." : "Confirm Email Column"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && !jobCreated && (
        <div className="block md:hidden w-full h-[calc(100vh-69px)] px-4 flex items-start justify-center pt-[64px] bg-white overflow-y-auto">
          <div className="max-w-md w-full space-y-6 pb-8" style={{ fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui' }}>
            <h2 className="text-lg font-semibold text-gray-900 text-center">Describe Your Service</h2>
            {renderCreditBanner(true)}
            {renderServiceInputs()}

            {/* Mobile Preview Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center space-y-4">
                {!showPreview && !previewResult && (
                  <button
                    type="button"
                    onClick={handleShowPreview}
                    disabled={previewLoading || !isServiceContextComplete()}
                    className="w-full py-3 rounded-md font-medium text-white text-[15px] tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: BRAND }}
                  >
                    {previewLoading ? "Loading..." : "Preview"}
                  </button>
                )}

                {showPreview && !previewResult && (
                  <div className="w-full space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700 block text-center">
                        Select an email to preview ({previewEmails.length} available)
                      </label>
                      <select
                        value={selectedPreviewEmail}
                        onChange={(e) => setSelectedPreviewEmail(e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
                      >
                        <option value="">-- Select an email --</option>
                        {previewEmails.map((email) => (
                          <option key={email} value={email}>
                            {email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPreview(false);
                          setPreviewEmails([]);
                          setSelectedPreviewEmail("");
                          setPreviewError(null);
                        }}
                        className="flex-1 py-3 rounded-md border font-medium text-[15px]"
                        style={{ borderColor: "#E5E7EB", color: "#6B7280" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleGeneratePreview}
                        disabled={previewLoading || !selectedPreviewEmail}
                        className="flex-1 py-3 rounded-md font-medium text-white text-[15px] disabled:opacity-50"
                        style={{ backgroundColor: BRAND }}
                      >
                        {previewLoading ? "Generating..." : "Start Preview"}
                      </button>
                    </div>
                  </div>
                )}

                {previewError && (
                  <div className="w-full bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                    {previewError}
                  </div>
                )}

                {previewResult && (
                  <div className="w-full space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            Preview Generated
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            For: {previewResult.email}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="text-xs font-medium text-green-800 block mb-2">
                          Personalized Email:
                        </label>
                        <div className="bg-white border border-green-200 rounded-md p-4 text-sm text-gray-900 whitespace-pre-wrap">
                          {previewResult.email_body}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewEmails([]);
                        setSelectedPreviewEmail("");
                        setPreviewResult(null);
                        setPreviewError(null);
                      }}
                      className="w-full py-3 rounded-md font-medium text-white text-[15px]"
                      style={{ backgroundColor: BRAND }}
                    >
                      Generate Another Preview
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCreateJob}
              disabled={loading || hasCreditShortage}
              title={hasCreditShortage ? "Add credits to continue" : undefined}
              className="w-full py-3 rounded-md font-medium text-white text-[15px] tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND }}
            >
              {loading ? "Submitting..." : "Start Generating"}
            </button>
          </div>
        </div>
      )}

    </>
  );
}
