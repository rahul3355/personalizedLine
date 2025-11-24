
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
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../lib/AuthProvider";
import { useOptimisticJobs, type OptimisticJob } from "../lib/OptimisticJobsProvider";
import { useRouter } from "next/router";
import { useToast } from "@/components/Toast";
import { supabase } from "../lib/supabaseClient";
import { logger } from "../lib/logger";
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
    label: "What are you pitching?",
    placeholder: "e.g. AI-powered email automation for sales teams",
  },
  {
    key: "key_differentiator",
    label: "Why should they care?",
    placeholder: "e.g. Generates personalized lines 10x faster than manual research",
  },
  {
    key: "cta",
    label: "What's the next step?",
    placeholder: "e.g. Book a 15-minute demo to see it in action",
  },
];

const QUICK_PRESETS = [
  {
    label: "SaaS Product",
    data: {
      core_offer: "All-in-one project management software",
      key_differentiator: "Combines task tracking, chat, and docs in one place",
      cta: "Start your 14-day free trial",
    },
  },
  {
    label: "Agency Service",
    data: {
      core_offer: "Full-service digital marketing optimization",
      key_differentiator: "Guaranteed 20% ROI increase in 90 days",
      cta: "Get a free marketing audit",
    },
  },
  {
    label: "Recruiting",
    data: {
      core_offer: "Senior Full-Stack Engineer role",
      key_differentiator: "Remote-first, competitive salary + equity",
      cta: "Book a quick screening call",
    },
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
    cta: "Get started with 500 free credits",
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
    sub: "Pick the column that lists your recipients' email addresses.",
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
        height: isMobile ? '100dvh' : '450px',
        maxHeight: isMobile ? '100dvh' : '450px'
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
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}



export default function UploadPage() {
  const { session, loading: authLoading, refreshUserInfo, optimisticallyDeductCredits, revertOptimisticCredits } = useAuth();
  const { addOptimisticJob, removeOptimisticJob } = useOptimisticJobs();
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

    const handlePresetClick = (preset: typeof QUICK_PRESETS[0]) => {
      setServiceComponents({
        core_offer: preset.data.core_offer,
        key_differentiator: preset.data.key_differentiator,
        cta: preset.data.cta,
      });
    };

    return (
      <div className="space-y-8">
        {/* Quick Fill Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900">
              Quick Fill
            </label>
            <button
              type="button"
              ref={examplesTriggerRef}
              onClick={() => setShowExamples(true)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
            >
              <ListChecks className="w-3.5 h-3.5" />
              Browse all examples
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid gap-6">
          {SERVICE_FIELDS.map((field) => (
            <div key={field.key} className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 flex items-center gap-1.5">
                  {field.label}
                  {field.key === "core_offer" && <span className="text-red-500">*</span>}
                  <HelpTooltip fieldKey={field.key} />
                </label>
                <span className={`text-[10px] ${serviceComponents[field.key].length > 280 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                  {serviceComponents[field.key].length}/300
                </span>
              </div>
              <textarea
                autoFocus={field.key === "core_offer"}
                value={serviceComponents[field.key]}
                onChange={(e) => updateServiceComponent(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={field.key === "core_offer" ? 3 : 2}
                required={field.key === "core_offer"}
                maxLength={300}
              />
            </div>
          ))}
        </div>

        {/* Fallback Switch */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="space-y-0.5">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900">
              Fallback Request
            </label>
            <p className="text-[0.8rem] text-slate-500">
              Ask to be forwarded if the contact is incorrect.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={includeFallback}
              onChange={setIncludeFallback}
              className={`${includeFallback ? "bg-slate-900" : "bg-slate-200"
                } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2`}
            >
              <span
                className={`${includeFallback ? "translate-x-4" : "translate-x-1"
                  } inline-block h-3.5 w-3.5 transform rounded-full bg-white transition`}
              />
            </Switch>
            <HelpTooltip fieldKey="include_fallback" />
          </div>
        </div>

        {/* Examples Drawer */}
        <AnimatePresence>
          {showExamples && (
            <>
              <motion.div
                key="examples-drawer-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm"
                onClick={closeExamples}
              >
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="absolute right-0 top-0 h-full w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExamplesDrawerPanel onClose={closeExamples} isMobile onUseExample={handleUseExample} />
                </motion.div>
              </motion.div>

              <motion.div
                key="examples-drawer-desktop"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-y-0 right-0 hidden w-full max-w-md md:flex z-50 shadow-2xl"
              >
                <div
                  ref={desktopExamplesRef}
                  className="flex-1 h-full bg-white border-l border-slate-200"
                  onClick={(e) => e.stopPropagation()}
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
      logger.error(`Backend failed: ${res.status}`, errText);
      throw new Error("Failed to parse file headers. Please try again.");
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
      logger.error("[Upload] Refresh credits error:", err);
      setError(err.message || "Unable to refresh credits");
    } finally {
      setRefreshingCredits(false);
    }
  }, [tempPath, session, refreshUserInfo]);

  const renderCreditBanner = (compact = false) => {
    if (!creditInfo) return null;

    const { rowCount, creditsRemaining, missingCredits, hasEnoughCredits } = creditInfo;

    // Only show banner if there's a problem (not enough credits)
    if (hasEnoughCredits) return null;

    return (
      <div className="mb-4 mx-auto max-w-sm rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">
              {formatNumber(rowCount)} rows • {formatNumber(rowCount)} credits
            </span>
            {!hasEnoughCredits && (
              <span className="text-sm font-medium text-red-600">
                ({formatNumber(missingCredits)} short)
              </span>
            )}
          </div>

          {!hasEnoughCredits && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/billing")}
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-800"
              >
                Add credits
              </button>
              <button
                type="button"
                onClick={handleRefreshCredits}
                disabled={refreshingCredits || !tempPath || !session?.access_token}
                className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw className={`h-3.5 w-3.5 ${refreshingCredits ? "animate-spin" : ""}`} />
                {refreshingCredits ? "Refreshing..." : "Refresh"}
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

      const data = await parseStoredFile(storagePath, session.access_token, {
        autoMap: true,
      });
      setTimeout(() => {
        setStep(1);
      }, 500);

      return true;
    } catch (err: any) {
      logger.error("[Upload] ParseHeaders error:", err);
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

    // Generate temporary ID for optimistic job
    const optimisticJobId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const creditsToDeduct = creditInfo?.rowCount || 0;

    // Create optimistic job
    const optimisticJob: OptimisticJob = {
      id: optimisticJobId,
      status: "in_progress",
      filename: file?.name || "upload.xlsx",
      rows: creditInfo?.rowCount || 0,
      created_at: Date.now(),
      finished_at: null,
      error: null,
      progress: 0,
      message: null,
      isOptimistic: true,
    };

    // Optimistically update UI
    addOptimisticJob(optimisticJob);
    optimisticallyDeductCredits(creditsToDeduct);

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
        // Revert optimistic updates on error
        removeOptimisticJob(optimisticJobId);
        revertOptimisticCredits(creditsToDeduct);

        if (res.status === 402) {
          let detail: any = null;
          try {
            const body = await res.json();
            detail = typeof body.detail === "object" ? body.detail : body;
          } catch (jsonErr) {
            logger.error("[Upload] Failed to parse credit error:", jsonErr);
          }

          if (detail) {
            applyCreditPayload(detail);
          }

          return false;
        }

        const errText = await res.text();
        logger.error(`Job creation failed: ${res.status}`, errText);
        throw new Error("Failed to create job. Please try again.");
      }

      await res.json();

      // Remove optimistic job (real job will appear from server)
      removeOptimisticJob(optimisticJobId);

      try {
        await refreshUserInfo();
      } catch (refreshErr) {
        logger.error("[Upload] Failed to refresh user info after job creation", refreshErr);
      }

      setJobCreated(true);
      toast({
        type: "success",
        message: "Job started! Redirecting to Jobs...",
      });
      router.push("/jobs");

      return true;
    } catch (err: any) {
      // Revert optimistic updates on error
      removeOptimisticJob(optimisticJobId);
      revertOptimisticCredits(creditsToDeduct);

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
        } catch (parseErr) {
          const errText = await res.text();
          logger.error("API error:", errText);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();

      setPreviewEmails(data.emails || []);
      setShowPreview(true);
      if (data.emails && data.emails.length > 0) {
        setSelectedPreviewEmail(data.emails[0]);
      } else {
        setSelectedPreviewEmail("");
        setPreviewError("No emails found in the file. Please check your data.");
      }
    } catch (err: any) {
      logger.error("[Upload] Preview emails error:", err);
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
        } catch (parseErr) {
          const errText = await res.text();
          logger.error("API error:", errText);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
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
        logger.error("[Upload] Failed to refresh user info after preview", refreshErr);
      }
    } catch (err: any) {
      logger.error("[Upload] Preview generation error:", err);
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
          <div className={`mx-auto transition-all duration-300 ${step === 2 ? 'max-w-[1400px]' : 'max-w-[960px]'}`}>
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
                  Upload lead list
                </h1>
                <p className="text-[14px] text-gray-600 font-light mt-1">
                  Make sure it has the email column
                </p>
              </header>
            )}

            {step > 0 && (
              <header className="mb-6 relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="absolute left-0 top-1 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
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
                </div>
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
                    "relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
                    "px-6 py-12",
                    "focus:outline-none focus:ring-2 focus:ring-[#4F55F1] focus:ring-offset-2",
                    dragActive
                      ? "border-[#4F55F1] bg-[rgba(79,85,241,0.08)]"
                      : "border-[#D1D5DB] bg-[#F9FAFB] hover:border-[rgba(79,85,241,0.5)] hover:bg-[rgba(79,85,241,0.04)]",
                  ].join(" ")}
                  onClick={() => { if (!file) emptyInputRef.current?.click(); }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !file) {
                      e.preventDefault();
                      emptyInputRef.current?.click();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload file area. Press Enter or Space to browse files, or drag and drop a file here"
                >
                  <input
                    id="file-input-desktop-empty"
                    ref={emptyInputRef}
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                        className={[
                          "mx-auto mb-4 transition-colors duration-300",
                          dragActive ? "text-[#4F55F1]" : "text-[#9CA3AF]",
                        ].join(" ")}
                        style={{ width: 48, height: 48 }}
                      />
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Upload Your File
                      </p>
                      <p className="text-xs text-gray-500">
                        CSV/XLSX up to 10k rows
                      </p>
                      <button
                        type="button"
                        className="mt-4 px-5 py-2 rounded-md text-white font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                        style={{ backgroundColor: BRAND }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = BRAND_HOVER;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = BRAND;
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          emptyInputRef.current?.click();
                        }}
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
                        className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <XIcon className="w-4 h-4" style={{ color: BRAND }} />
                      </button>

                      <div className="flex items-center gap-3">
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
                    </>
                  )}
                </div>

                {error && (
                  <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                {/* Only render footer button if file exists */}
                {file && (
                  <div className="mt-6 flex items-center justify-center">
                    <button
                      onClick={handleParseHeaders}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-white font-medium disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 disabled:hover:scale-100 disabled:hover:shadow-none"
                      style={{ backgroundColor: loading ? "#D1D5DB" : BRAND }}
                      onMouseEnter={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = BRAND_HOVER;
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) e.currentTarget.style.backgroundColor = BRAND;
                      }}
                    >
                      {loading ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            {/* Bold white strip */}
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="white"
                              strokeWidth="3"
                              strokeDasharray="31.4 31.4"
                              strokeLinecap="round"
                            />
                            {/* Thin white strip */}
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="white"
                              strokeWidth="1"
                              strokeDasharray="15.7 47.1"
                              strokeDashoffset="15.7"
                              strokeLinecap="round"
                            />
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          Upload & Continue
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* Step 1: Confirm Headers (compact) */}
            {step === 1 && !jobCreated && (
              <div className="flex flex-col">
                <div className="space-y-4">
                  <div className="mx-auto max-w-sm space-y-2">
                    <label className="text-xs font-medium text-gray-700">
                      Select Email Column
                    </label>
                    <select
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
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
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium">
                      {error}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-center">
                  <button
                    onClick={handleConfirmHeaders}
                    disabled={loading || hasCreditShortage}
                    title={hasCreditShortage ? "Add credits to continue" : undefined}
                    className="inline-flex items-center justify-center gap-2 h-10 px-8 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition-all hover:scale-105 active:scale-95"
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
              <div className="flex flex-col pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  {/* LEFT COLUMN: Inputs */}
                  <div className="lg:col-span-5 space-y-8">
                    <div className="bg-white">
                      {renderServiceInputs()}
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-destructive/15 text-destructive border border-destructive/20 px-4 py-3 rounded-md text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    {/* Main CTA */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleCreateJob}
                        disabled={loading || hasCreditShortage}
                        className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-md bg-slate-900 text-white font-medium text-sm shadow transition-colors hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50"
                      >
                        {loading ? "Generating..." : "Generate All Emails"}
                        {!loading && <Sparkles className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Sticky Preview (Gmail Style) */}
                  <div className="lg:col-span-7 sticky top-6">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      {/* Gmail-like Header */}
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-400/80" />
                          <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                          <div className="w-3 h-3 rounded-full bg-green-400/80" />
                        </div>
                        <div className="flex items-center gap-2">
                          {previewResult && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Generated
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Email Client UI */}
                      <div className="p-6 space-y-6">
                        {/* Email Metadata */}
                        <div className="space-y-4 border-b border-slate-100 pb-6">
                          {/* To Field */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-500 w-12">To:</span>
                            {previewEmails.length > 0 ? (
                              <div className="relative flex-1">
                                <select
                                  value={selectedPreviewEmail}
                                  onChange={(e) => setSelectedPreviewEmail(e.target.value)}
                                  className="w-full appearance-none bg-transparent text-sm text-slate-900 font-medium focus:outline-none cursor-pointer hover:text-blue-600 transition-colors"
                                >
                                  {previewEmails.map((email) => (
                                    <option key={email} value={email}>{email}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                            ) : (
                              <button
                                onClick={handleShowPreview}
                                className="text-sm text-blue-600 hover:underline font-medium"
                              >
                                Select recipients from file
                              </button>
                            )}
                          </div>

                          {/* Subject Field */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-500 w-12">Subject:</span>
                            <span className="text-sm text-slate-900">
                              Quick question regarding {serviceComponents.core_offer ? serviceComponents.core_offer.split(' ').slice(0, 3).join(' ') + '...' : 'your goals'}
                            </span>
                          </div>
                        </div>

                        {/* Email Body */}
                        <div className="min-h-[300px] text-[15px] leading-relaxed text-slate-800">
                          {previewLoading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-12">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Sparkles className="w-4 h-4 text-blue-600" />
                                </div>
                              </div>
                              <span className="text-sm font-medium animate-pulse">Writing personalized email...</span>
                            </div>
                          ) : previewResult ? (
                            <div className="whitespace-pre-wrap font-sans">
                              {previewResult.email_body}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 py-12 text-center bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-100">
                              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center">
                                <Mail className="w-8 h-8 text-slate-300" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-900">No preview generated yet</p>
                                <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                                  Fill out the details on the left and click "Generate Preview" to see the magic.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                          {previewError ? (
                            <p className="text-xs text-red-500 font-medium">{previewError}</p>
                          ) : (
                            <div />
                          )}
                          <button
                            onClick={handleGeneratePreview}
                            disabled={previewLoading || !selectedPreviewEmail || !isServiceContextComplete()}
                            className={`
                              inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                              ${previewResult
                                ? "bg-slate-100 text-slate-900 hover:bg-slate-200"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200"
                              }
                              disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                            `}
                          >
                            {previewLoading ? (
                              "Writing..."
                            ) : (
                              <>
                                {previewResult ? <RefreshCcw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                {previewResult ? "Regenerate" : "Generate Preview"}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div >
              </div >
            )
            }

            {
              showDropOverlay && (
                <div className="fixed inset-0 z-[60] bg-white/70 backdrop-blur-lg flex items-center justify-center">
                  {/* keep event-capture layer so drop still works */}
                  <div
                    className="absolute inset-0"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    aria-hidden
                  />
                  <div className="relative flex flex-col items-center justify-center bg-white border-2 border-dashed border-[#4F55F1] rounded-2xl p-12">
                    <UploadIcon className="w-16 h-16 text-[#4F55F1] mb-4" />
                    <p className="text-base font-medium text-gray-700">Drop to upload CSV/XLSX</p>
                  </div>
                </div>
              )
            }

          </div >
        </section >
      </div >

      {/* Mobile sections kept intact for functionality; desktop changes satisfy requirements */}
      {
        step === 0 && !jobCreated && (
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
                  accept=".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                className="w-full py-3 rounded-md font-medium text-white text-[15px] tracking-tight disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: BRAND }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      {/* Bold white strip */}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="3"
                        strokeDasharray="31.4 31.4"
                        strokeLinecap="round"
                      />
                      {/* Thin white strip */}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="1"
                        strokeDasharray="15.7 47.1"
                        strokeDashoffset="15.7"
                        strokeLinecap="round"
                      />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  "Proceed"
                )}
              </button>
            </div>
          </div >
        )
      }

      {
        step === 1 && !jobCreated && (
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
        )
      }

      {
        step === 2 && !jobCreated && (
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
                      <div className="w-full rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">{previewError}</p>
                        </div>
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
        )
      }

    </>
  );
}
