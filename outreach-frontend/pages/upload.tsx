"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  Search,
  MessageCircle,
  Send,
  Flame,
  TrendingUp,
  Sparkles,
  ListChecks,
  ChevronDown,
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
type ServiceHelpKey = ServiceFieldKey | "include_fallback" | "preview_button";
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

type HelpContent = {
  what: string;
  why: string;
  example?: string;
};

const HELP_CONTENT: Record<ServiceHelpKey, HelpContent> = {
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
  preview_button: {
    what: "Generates a sample personalized email from your uploaded file.",
    why: "Lets you confirm the tone and content before committing credits to a full run.",
  },
};

const COPY = {
  title: "Upload prospects",
  sub: "CSV or XLSX • up to 100k rows • header row required",
  dz_idle: "Drag & drop or browse file",
  dz_selected: "",
  proceed: "Next",
};

type ExampleCategory = "outreach" | "sales" | "marketing" | "recruitment";

type ExampleItem = {
  id: string;
  category: ExampleCategory;
  core_offer: string;
  key_differentiator: string;
  cta: string;
};

const EXAMPLE_CATEGORIES = [
  { id: "outreach" as const, label: "Outreach", icon: MessageCircle },
  { id: "sales" as const, label: "Sales", icon: Send },
  { id: "marketing" as const, label: "Marketing", icon: Flame },
  { id: "recruitment" as const, label: "Recruitment", icon: TrendingUp },
];

const EXAMPLE_DATA: ExampleItem[] = [
  {
    id: "ex1",
    category: "outreach",
    core_offer: "AI-powered email personalization for sales teams",
    key_differentiator: "Generates personalized lines 10x faster than manual research",
    cta: "Book a 15-minute demo to see it in action",
  },
  {
    id: "ex2",
    category: "outreach",
    core_offer: "Automated lead enrichment and data validation",
    key_differentiator: "99% accuracy with real-time email verification",
    cta: "Start your free trial today",
  },
  {
    id: "ex3",
    category: "outreach",
    core_offer: "LinkedIn automation for outbound prospecting",
    key_differentiator: "Send 200+ personalized connection requests daily with AI-generated messages",
    cta: "Try it free for 14 days",
  },
  {
    id: "ex4",
    category: "sales",
    core_offer: "CRM integration that syncs with your existing workflow",
    key_differentiator: "Zero setup time - plug and play in under 5 minutes",
    cta: "Schedule a walkthrough with our team",
  },
  {
    id: "ex5",
    category: "sales",
    core_offer: "Sales intelligence platform for B2B teams",
    key_differentiator: "Access to 50M+ verified contacts across all industries",
    cta: "Get started with 100 free credits",
  },
  {
    id: "ex6",
    category: "sales",
    core_offer: "Interactive proposal software for closing deals faster",
    key_differentiator: "Track engagement in real-time and follow up at the perfect moment",
    cta: "Create your first proposal in minutes",
  },
  {
    id: "ex7",
    category: "marketing",
    core_offer: "Multi-channel campaign automation",
    key_differentiator: "Increases conversion rates by 3x with smart segmentation",
    cta: "See our case studies and ROI calculator",
  },
  {
    id: "ex8",
    category: "marketing",
    core_offer: "Content personalization engine for websites",
    key_differentiator: "Real-time visitor analytics and dynamic content delivery",
    cta: "Request a personalized demo",
  },
  {
    id: "ex9",
    category: "marketing",
    core_offer: "Email marketing automation with advanced A/B testing",
    key_differentiator: "Achieve 40% higher open rates with AI-optimized send times",
    cta: "Sign up and send your first campaign free",
  },
  {
    id: "ex10",
    category: "recruitment",
    core_offer: "AI-powered candidate screening and matching",
    key_differentiator: "Reduces time-to-hire by 60% with intelligent automation",
    cta: "Book a consultation with our hiring experts",
  },
  {
    id: "ex11",
    category: "recruitment",
    core_offer: "Talent sourcing platform with passive candidate reach",
    key_differentiator: "2x larger talent pool than traditional job boards",
    cta: "Start sourcing top talent in 48 hours",
  },
  {
    id: "ex12",
    category: "recruitment",
    core_offer: "Interview scheduling and coordination platform",
    key_differentiator: "Eliminates back-and-forth emails with smart calendar integration",
    cta: "Schedule a demo to see how it works",
  },
  {
    id: "ex13",
    category: "outreach",
    core_offer: "Cold email outreach platform with deliverability optimization",
    key_differentiator: "95% inbox placement rate with AI-powered spam detection",
    cta: "Get a free deliverability audit",
  },
  {
    id: "ex14",
    category: "outreach",
    core_offer: "Multi-channel outreach sequences with email, LinkedIn, and phone",
    key_differentiator: "Coordinate touchpoints across channels with smart timing algorithms",
    cta: "Book a strategy session with our outreach experts",
  },
  {
    id: "ex15",
    category: "outreach",
    core_offer: "Automated follow-up system for cold outreach campaigns",
    key_differentiator: "Increases response rates by 3x with behavior-triggered follow-ups",
    cta: "Start your 30-day free trial",
  },
  {
    id: "ex16",
    category: "sales",
    core_offer: "Predictive analytics platform for sales forecasting",
    key_differentiator: "Achieve 90% forecast accuracy with machine learning models",
    cta: "Request a personalized forecast demo",
  },
  {
    id: "ex17",
    category: "sales",
    core_offer: "Sales enablement platform with content management and tracking",
    key_differentiator: "Track content engagement and identify what resonates with buyers",
    cta: "See how top performers use our platform",
  },
  {
    id: "ex18",
    category: "sales",
    core_offer: "Conversation intelligence software for sales calls",
    key_differentiator: "AI-powered insights from every call to improve win rates by 25%",
    cta: "Try it free with 5 call recordings",
  },
  {
    id: "ex19",
    category: "marketing",
    core_offer: "Social media management and scheduling platform",
    key_differentiator: "AI suggests optimal posting times and content recommendations",
    cta: "Connect your accounts and schedule your first post",
  },
  {
    id: "ex20",
    category: "marketing",
    core_offer: "Marketing attribution and ROI tracking software",
    key_differentiator: "Track every touchpoint and attribute revenue to the right channels",
    cta: "Get a free marketing ROI assessment",
  },
  {
    id: "ex21",
    category: "marketing",
    core_offer: "Webinar hosting platform with lead generation tools",
    key_differentiator: "Automated lead scoring and instant follow-up sequences",
    cta: "Host your first webinar in 10 minutes",
  },
  {
    id: "ex22",
    category: "recruitment",
    core_offer: "Video interviewing platform with AI assessment",
    key_differentiator: "Screen 10x more candidates with asynchronous video and AI analysis",
    cta: "Start your pilot program today",
  },
  {
    id: "ex23",
    category: "recruitment",
    core_offer: "Applicant tracking system with collaborative hiring workflows",
    key_differentiator: "Reduce time-to-hire by 40% with streamlined team collaboration",
    cta: "Schedule a walkthrough with our team",
  },
  {
    id: "ex24",
    category: "recruitment",
    core_offer: "Employee referral program software with gamification",
    key_differentiator: "Generate 5x more quality referrals with automated rewards",
    cta: "Launch your referral program in one week",
  },
];

// Step-specific titles/subtitles shown *under* the stepper
const STEP_META = [
  {
    title: "Upload",
    sub: "CSV or XLSX • up to 100k rows • header row required",
  },
  {
    title: "Select your email column",
    sub: "",
  },
  {
    title: "Context",
    sub: "Describe your product/service so we can personalize outputs.",
  },
] as const;

type CreditInfo = {
  rowCount: number;
  creditsRemaining: number;
  missingCredits: number;
  hasEnoughCredits: boolean;
};





type TooltipHandlers = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
};

const HelpTooltip = ({
  fieldKey,
  showLabelSpacing = true,
  buttonClassName,
  renderTrigger,
  containerClassName,
}: {
  fieldKey: ServiceHelpKey;
  showLabelSpacing?: boolean;
  buttonClassName?: string;
  renderTrigger?: (handlers: TooltipHandlers) => ReactNode;
  containerClassName?: string;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const help = HELP_CONTENT[fieldKey];
  const isPreviewTooltip = fieldKey === "preview_button";
  const triggerClasses = [
    "inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-100 transition-colors",
    showLabelSpacing ? "ml-1.5" : "",
    buttonClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const containerClasses = ["relative inline-block", containerClassName]
    .filter(Boolean)
    .join(" ");

  const handlers: TooltipHandlers = {
    onMouseEnter: () => setShowTooltip(true),
    onMouseLeave: () => setShowTooltip(false),
    onFocus: () => setShowTooltip(true),
    onBlur: () => setShowTooltip(false),
  };

  return (
    <div className={containerClasses}>
      {renderTrigger ? (
        renderTrigger(handlers)
      ) : (
        <button
          type="button"
          onMouseEnter={handlers.onMouseEnter}
          onMouseLeave={handlers.onMouseLeave}
          onClick={() => setShowTooltip(!showTooltip)}
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
          className={triggerClasses}
          aria-label="Help"
        >
          <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
        </button>
      )}

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
          onMouseEnter={handlers.onMouseEnter}
          onMouseLeave={handlers.onMouseLeave}
        >
          <div
            className="space-y-2.5 text-sm leading-relaxed"
            style={{ color: "#dbdee1", ...(isPreviewTooltip && { fontWeight: 600 }) }}
          >
            <p>{help.what}</p>
            <p>{help.why}</p>
            {!isPreviewTooltip && help.example && (
              <p className="leading-relaxed" style={{ color: "#b5bac1" }}>
                e.g., "{help.example}"
              </p>
            )}
            {!isPreviewTooltip && (
              <div className="pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
                <p style={{ color: "#949ba4", fontSize: "0.8125rem" }}>
                  Leave blank if not relevant to you.
                </p>
              </div>
            )}
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




function ExamplesDrawerPanel({
  onClose,
  isMobile = false,
  onUseExample,
}: {
  onClose: () => void;
  isMobile?: boolean;
  onUseExample: (example: ExampleItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExampleCategory | "all">("all");

  const radiusClass = isMobile ? "rounded-l-3xl" : "rounded-[24px]";

  // Filter examples based on search and category
  // When searching, ALWAYS search across ALL categories
  const filteredExamples = EXAMPLE_DATA.filter((example) => {
    const matchesSearch =
      searchQuery === "" ||
      example.core_offer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.key_differentiator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.cta.toLowerCase().includes(searchQuery.toLowerCase());

    // If there's a search query, ignore category filter and search all
    if (searchQuery !== "") {
      return matchesSearch;
    }

    // If no search query, filter by category as usual
    const matchesCategory = selectedCategory === "all" || example.category === selectedCategory;
    return matchesCategory;
  });

  return (
    <div
      className={`relative flex flex-col ${radiusClass} bg-[#F5F5F5] shadow-[0_12px_30px_rgba(0,0,0,0.08)]`}
      style={{
        fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui',
        height: isMobile ? '100vh' : '450px',
        maxHeight: isMobile ? '100vh' : '450px'
      }}
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={`absolute left-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200 transition-colors ${isMobile ? 'top-20' : 'top-4'}`}
      >
        <XIcon className="h-4 w-4 text-gray-600" />
      </button>

      {/* Header Section */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-center text-lg font-semibold text-gray-900 mb-4">
          Examples
        </h2>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
          />
        </div>
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 gap-3 px-4 pb-4 overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <div className="flex flex-col gap-3 pt-2 flex-shrink-0">
          {EXAMPLE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;

            return (
              <div key={category.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full transition-all
                    ${isSelected ? 'bg-white' : 'bg-white hover:bg-gray-50'}
                  `}
                  aria-label={category.label}
                >
                  <Icon
                    className={`h-4 w-4 ${isSelected ? 'text-gray-700' : 'text-gray-500'}`}
                  />
                </button>
                {/* Tooltip on hover */}
                <div
                  className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                  style={{
                    backgroundColor: 'rgba(24, 25, 28, 0.95)',
                    color: 'white'
                  }}
                >
                  {category.label}
                </div>
              </div>
            );
          })}

          {/* All Categories Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`
                flex items-center justify-center w-10 h-10 rounded-full transition-all text-xs font-semibold
                ${selectedCategory === "all" ? 'bg-white text-gray-700' : 'bg-white text-gray-500 hover:bg-gray-50'}
              `}
              aria-label="All Categories"
            >
              All
            </button>
            {/* Tooltip on hover */}
            <div
              className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{
                backgroundColor: 'rgba(24, 25, 28, 0.95)',
                color: 'white'
              }}
            >
              All
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-scroll pr-2 space-y-3 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9CA3AF #F5F5F5' }}>
          {filteredExamples.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No examples found
            </div>
          ) : (
            filteredExamples.map((example) => (
              <div
                key={example.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Core offer:
                    </label>
                    <p className="text-sm text-gray-700">
                      {example.core_offer}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Key differentiator:
                    </label>
                    <p className="text-sm text-gray-700">
                      {example.key_differentiator}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      CTA:
                    </label>
                    <p className="text-sm text-gray-700">
                      {example.cta}
                    </p>
                  </div>
                </div>

                {/* Use this button */}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onUseExample(example)}
                    className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
                    style={{
                      backgroundColor: 'white',
                      borderColor: '#D1D5DB',
                      color: '#6B7280'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#C026D3';
                      (e.target as HTMLButtonElement).style.color = 'white';
                      (e.target as HTMLButtonElement).style.borderColor = '#C026D3';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'white';
                      (e.target as HTMLButtonElement).style.color = '#6B7280';
                      (e.target as HTMLButtonElement).style.borderColor = '#D1D5DB';
                    }}
                    onMouseDown={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#A21CAF';
                    }}
                    onMouseUp={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#C026D3';
                    }}
                  >
                    Use this
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: #F5F5F5;
        }
        div::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  );
}



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
  const [showExamples, setShowExamples] = useState(false);

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
  const examplesTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopExamplesRef = useRef<HTMLDivElement>(null);

  const clearFileInputs = () => {
    if (emptyInputRef.current) emptyInputRef.current.value = "";
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  useEffect(() => {
    if (!showExamples) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Only use document-level click-outside detection on desktop (md breakpoint: 768px)
      // Mobile uses backdrop onClick in the AnimatePresence section instead
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (!isDesktop) return;

      const target = event.target as Node | null;

      if (
        (desktopExamplesRef.current &&
          desktopExamplesRef.current.contains(target)) ||
        (examplesTriggerRef.current &&
          examplesTriggerRef.current.contains(target))
      ) {
        return;
      }

      setShowExamples(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showExamples]);

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

  const renderServiceInputs = () => {
    const closeExamples = () => setShowExamples(false);

    const handleUseExample = (example: ExampleItem) => {
      setServiceComponents({
        core_offer: example.core_offer,
        key_differentiator: example.key_differentiator,
        cta: example.cta,
      });
      closeExamples();
    };

    return (
      <div className="relative space-y-5">
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
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 shadow-sm transition focus:border-[#4F55F1] focus:ring-2 focus:ring-[#4F55F1] resize-none overflow-auto"
                rows={field.key === "core_offer" ? 4 : 3}
                required={field.key === "core_offer"}
                maxLength={300}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <span className="font-semibold">Include 'Forward to right person' text?</span>
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

          <div className="relative inline-block group">
            <button
              type="button"
              onClick={() => setShowExamples((prev) => !prev)}
              ref={examplesTriggerRef}
              className="relative inline-flex items-center gap-2 h-6 px-3 text-sm font-semibold text-[#4F55F1] transition-all duration-200 ease-out focus:outline-none rounded-full group-hover:scale-105"
              style={{
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(79, 85, 241, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              aria-expanded={showExamples}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span className="relative inline-block">
                View Examples
                <span
                  className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#4F55F1] transition-all duration-300 group-hover:w-full"
                  style={{ bottom: '-2px' }}
                />
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showExamples && (
            <>
              <motion.div
                key="examples-drawer-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 md:hidden bg-black/20"
                onClick={closeExamples}
              >
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="absolute right-0 top-0 h-full w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExamplesDrawerPanel onClose={closeExamples} isMobile onUseExample={handleUseExample} />
                </motion.div>
              </motion.div>

              <motion.div
                key="examples-drawer-desktop"
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-full max-w-xs md:flex md:max-w-sm lg:max-w-md z-40"
              >
                <div
                  ref={desktopExamplesRef}
                  className="pointer-events-auto flex-1"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <ExamplesDrawerPanel onClose={closeExamples} onUseExample={handleUseExample} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

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
      setShowExamples(false);
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
                  <>Running this job will use {formatNumber(rowCount)} credits.</>
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
            {step !== 2 && !jobCreated && renderCreditBanner()}
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
                      Choose which column contains the email address.
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
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm hover:bg-[rgba(79,85,241,0.04)]"
                    style={{ border: "none", color: "#8b8b8bff" }}
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
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
                <div className="rounded-3xl bg-white px-8 py-8 shadow-sm space-y-6 min-h-[540px]">

                  {renderServiceInputs()}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                      {error}
                    </div>
                  )}

                  {/* Preview Section */}
                  <div className="space-y-6">
                    <div className="flex flex-col gap-5 w-full">
                      {!showPreview && !previewResult && (
                        <div className="flex flex-col items-center">
                          <HelpTooltip
                            fieldKey="preview_button"
                            showLabelSpacing={false}
                            renderTrigger={({
                              onMouseEnter,
                              onMouseLeave,
                              onFocus,
                              onBlur,
                            }) => (
                              <div
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onFocus={onFocus}
                                onBlur={onBlur}
                                className="inline-flex items-center justify-center"
                              >
                                <button
                                  type="button"
                                  onClick={handleShowPreview}
                                  disabled={previewLoading || !isServiceContextComplete()}
                                  className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 text-gray-700 hover:text-gray-900 hover:bg-gray-100 hover:scale-105"
                                >
                                  <span className="relative">
                                    {previewLoading ? "Loading..." : "Preview"}
                                    <span
                                      className="absolute bottom-0 left-0 w-0 h-[2px] bg-gray-900 transition-all duration-300 group-hover:w-full group-disabled:w-0"
                                      style={{ bottom: '-2px' }}
                                    />
                                  </span>
                                  <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                                </button>
                              </div>
                            )}
                          />
                        </div>
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
                              {previewLoading ? "Generating..." : "Start Preview (1 credit)"}
                            </button>
                          </div>
                        </div>
                      )}

                      {previewError && (
                        <div className="w-full bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium text-center">
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
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm hover:bg-[rgba(79,85,241,0.04)]"
                    style={{ border: "none", color: "#8b8b8bff" }}
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
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
        <div className="block md:hidden w-full min-h-[calc(100vh-159px)] px-4 flex items-center justify-center overflow-hidden bg-white">
          <div className="max-w-md w-full space-y-6 mt-0 bg-white" style={{ fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui' }}>
            <h1 className="text-xl font-semibold text-gray-900 text-center">
              Upload Outreach File
            </h1>
            <p className="text-gray-500 text-sm text-center">
              Import your CSV/XLSX to begin personalization.
            </p>
            {renderCreditBanner(true)}

            <div className="rounded-xl border-2 border-dashed p-8 text-center bg-white"
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
            <div className="space-y-3">
              <label className="text-xs text-gray-500 block">
                Choose which column contains the email address.
              </label>
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
            <div className="space-y-6">
              {renderServiceInputs()}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Mobile Preview Section */}
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  {!showPreview && !previewResult && (
                    <HelpTooltip
                      fieldKey="preview_button"
                      showLabelSpacing={false}
                      containerClassName="relative block w-full"
                      renderTrigger={({
                        onMouseEnter,
                        onMouseLeave,
                        onFocus,
                        onBlur,
                      }) => (
                        <div
                          onMouseEnter={onMouseEnter}
                          onMouseLeave={onMouseLeave}
                          onFocus={onFocus}
                          onBlur={onBlur}
                          className="w-full"
                        >
                          <button
                            type="button"
                            onClick={handleShowPreview}
                            disabled={previewLoading || !isServiceContextComplete()}
                            className="w-full inline-flex items-center justify-center px-6 py-3 rounded-full border border-gray-300 bg-white text-gray-600 font-semibold tracking-tight transition hover:bg-gray-50 disabled:bg-white disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            {previewLoading ? "Loading..." : "Preview"}
                          </button>
                        </div>
                      )}
                    />
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
                          <div className="bg-white border border-green-200 rounded-md p-4 text-xs text-gray-900 whitespace-pre-wrap leading-relaxed">
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
