
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Globe } from "@/components/ui/globe";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { LightRays } from "@/components/ui/light-rays";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@headlessui/react";
import { API_URL } from "../lib/api";
import {
  X as XIcon,
  Search,
  MessageCircle,
  Send,
  Flame,
  TrendingUp,
  ListChecks,
} from "lucide-react";

const INITIAL_SERVICE_COMPONENTS = {
  core_offer: "",
  key_differentiator: "",
  cta: "",
} as const;

type ServiceFieldKey = keyof typeof INITIAL_SERVICE_COMPONENTS;
type ServiceComponents = Record<ServiceFieldKey, string>;
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
    core_offer: "AI-powered sales forecasting and pipeline management",
    key_differentiator: "Predict deal closure with 95% accuracy using machine learning",
    cta: "Book a personalized demo",
  },
  {
    id: "ex7",
    category: "sales",
    core_offer: "Conversation intelligence for sales calls",
    key_differentiator: "Real-time coaching and automated note-taking during calls",
    cta: "Try it free for 30 days",
  },
  {
    id: "ex8",
    category: "marketing",
    core_offer: "Marketing automation platform for growing businesses",
    key_differentiator: "Set up campaigns in minutes with pre-built templates and AI assistance",
    cta: "Start your free trial",
  },
  {
    id: "ex9",
    category: "marketing",
    core_offer: "Content creation tool powered by AI",
    key_differentiator: "Generate blog posts, social media, and ad copy 10x faster",
    cta: "Create your first piece for free",
  },
  {
    id: "ex10",
    category: "marketing",
    core_offer: "Email marketing with advanced segmentation",
    key_differentiator: "Achieve 40% higher open rates with AI-optimized send times",
    cta: "Schedule a walkthrough",
  },
  {
    id: "ex11",
    category: "marketing",
    core_offer: "Social media management for agencies",
    key_differentiator: "Manage 100+ client accounts from one unified dashboard",
    cta: "Request a demo",
  },
  {
    id: "ex12",
    category: "recruitment",
    core_offer: "Applicant tracking system for high-volume hiring",
    key_differentiator: "Reduce time-to-hire by 50% with automated screening and scheduling",
    cta: "See it in action today",
  },
  {
    id: "ex13",
    category: "recruitment",
    core_offer: "AI-powered candidate sourcing platform",
    key_differentiator: "Find passive candidates across 20+ job boards simultaneously",
    cta: "Start sourcing for free",
  },
  {
    id: "ex14",
    category: "recruitment",
    core_offer: "Video interviewing and assessment tool",
    key_differentiator: "Screen candidates 3x faster with asynchronous video interviews",
    cta: "Try it with your next hire",
  },
  {
    id: "ex15",
    category: "recruitment",
    core_offer: "Employer branding and recruitment marketing",
    key_differentiator: "Increase application rates by 60% with targeted career site optimization",
    cta: "Get your free branding audit",
  },
];

function ExamplesDrawerPanel({
  onClose,
  onUseExample,
}: {
  onClose: () => void;
  onUseExample: (example: ExampleItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExampleCategory | "all">("all");

  const filteredExamples = EXAMPLE_DATA.filter((example) => {
    const matchesSearch =
      searchQuery === "" ||
      example.core_offer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.key_differentiator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      example.cta.toLowerCase().includes(searchQuery.toLowerCase());

    if (searchQuery !== "") {
      return matchesSearch;
    }

    const matchesCategory = selectedCategory === "all" || example.category === selectedCategory;
    return matchesCategory;
  });

  return (
    <div
      className="relative flex flex-col rounded-[24px] bg-[#F5F5F5] shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
      style={{
        fontFamily: '"Aeonik Pro", ui-sans-serif, system-ui',
        height: '400px',
        maxHeight: '400px',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute left-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
      >
        <XIcon className="h-4 w-4 text-gray-600" />
      </button>

      <div className="px-6 pt-6 pb-4">
        <h2 className="text-center text-lg font-semibold text-gray-900 mb-4">
          Examples
        </h2>
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

      <div className="flex flex-1 gap-3 px-4 pb-4 overflow-hidden min-h-0">
        <div className="flex flex-col gap-3 pt-2 flex-shrink-0">
          {EXAMPLE_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;

            return (
              <div key={category.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                    isSelected ? 'bg-white' : 'bg-white hover:bg-gray-50'
                  }`}
                  aria-label={category.label}
                >
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-gray-700' : 'text-gray-500'}`} />
                </button>
                <div
                  className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
                  style={{
                    backgroundColor: 'rgba(24, 25, 28, 0.95)',
                    color: 'white',
                  }}
                >
                  {category.label}
                </div>
              </div>
            );
          })}

          <div className="relative group">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all text-xs font-semibold ${
                selectedCategory === "all" ? 'bg-white text-gray-700' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              aria-label="All Categories"
            >
              All
            </button>
            <div
              className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{
                backgroundColor: 'rgba(24, 25, 28, 0.95)',
                color: 'white',
              }}
            >
              All
            </div>
          </div>
        </div>

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
                    <p className="text-sm text-gray-700">{example.core_offer}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      Key differentiator:
                    </label>
                    <p className="text-sm text-gray-700">{example.key_differentiator}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">
                      CTA:
                    </label>
                    <p className="text-sm text-gray-700">{example.cta}</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onUseExample(example)}
                    className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
                    style={{
                      backgroundColor: 'white',
                      borderColor: '#D1D5DB',
                      color: '#6B7280',
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
                  >
                    Use this
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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

function LoginPage() {
  const { session } = useAuth();
  const router = useRouter();

  // Preview state
  const [serviceComponents, setServiceComponents] = useState<ServiceComponents>(
    () => ({ ...INITIAL_SERVICE_COMPONENTS })
  );
  const [includeFallback, setIncludeFallback] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    email: string;
    email_body: string;
    credits_remaining: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const examplesTriggerRef = useRef<HTMLButtonElement>(null);
  const desktopExamplesRef = useRef<HTMLDivElement>(null);

  // Don't redirect logged-in users - allow them to use the preview feature
  // useEffect(() => {
  //   if (session) {
  //     router.push("/"); // redirect logged-in users
  //   }
  // }, [session, router]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
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

  const handleUseExample = (example: ExampleItem) => {
    setServiceComponents({
      core_offer: example.core_offer,
      key_differentiator: example.key_differentiator,
      cta: example.cta,
    });
    setShowExamples(false);
  };

  useEffect(() => {
    if (!showExamples) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;

      if (
        (desktopExamplesRef.current && desktopExamplesRef.current.contains(target)) ||
        (examplesTriggerRef.current && examplesTriggerRef.current.contains(target))
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

  const handleGeneratePreview = async () => {
    if (!isServiceContextComplete()) {
      setPreviewError("Please provide your core offer to generate a preview");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);

    try {
      // Build headers - include Authorization only if session exists
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_URL}/preview/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file_path: null, // No file for login page preview
          email_col: null,
          selected_email: "pip.plah@sap.com",
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
      setPreviewResult(data);
    } catch (err: any) {
      setPreviewError(err.message || "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="relative flex h-dvh w-full overflow-hidden font-sans bg-white">
      
      
      
{/* Beta Button with BorderBeam - positioned over the dividing line */}
      <div className="absolute left-1/2 top-10 hidden -translate-x-1/2 lg:flex z-50">
        <Button
          className="relative overflow-hidden bg-white text-gray-900 border border-gray-200 pointer-events-none"
          size="lg"
          variant="outline"
          type="button"
          tabIndex={-1}
          aria-disabled
        >
          Beta
          <BorderBeam
            size={40}
            initialOffset={20}
            className="from-transparent via-yellow-500 to-transparent"
            transition={{
              type: "spring",
              stiffness: 60,
              damping: 20,
            }}
          />
        </Button>
      </div>
      {/* Left Section */}
      <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-100 bg-white">
        {/* Centered Content */}
        
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 gap-y-6">
          
          <div className="w-full max-w-md flex flex-col gap-y-6">
            {/* Logo */}
            
             

            {/* Headings */}
            <div className="text-center lg:text-left">
              <h1 className="text-[22px] sm:text-[24px] lg:text-[28px] font-semibold text-gray-900 mb-2 leading-tight">
                Login to your account
              </h1>
              <p className="text-gray-500 text-[14px] sm:text-[15px]">
                Sign in or sign up with your Google account to continue.
              </p>
              
            </div>

            {/* Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300"
              style={{
                background: "linear-gradient(#5a5a5a, #1c1c1c)",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 8px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <FcGoogle className="w-5 h-5 mr-2 rounded-full" />
              Sign in with Google
            </button>
            
          </div>

          {/* Mobile Testimonial */}
          <div className="flex lg:hidden w-full mt-10">
            <div className="w-full max-w-sm mx-auto text-center">
              <blockquote className="text-[16px] font-medium text-gray-900 leading-relaxed">
                Cold emails that prove you did your homework
              </blockquote>
              
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pb-4">
         
          <p className="mt-2 text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} SendItFast. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Section - Preview Card (desktop only) */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center bg-gray-50 p-8 relative">
        <Card className="w-full max-w-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-center">Email Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hardcoded Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Email Address
              </label>
              <Input
                type="email"
                value="pip.plah@sap.com"
                disabled
                className="bg-gray-100 text-gray-500 cursor-not-allowed text-sm h-8"
              />
            </div>

            {/* Service Input Fields */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Core Offer
              </label>
              <Textarea
                value={serviceComponents.core_offer}
                onChange={(e) => updateServiceComponent("core_offer", e.target.value)}
                placeholder="Explain the core product or service you're offering"
                className="resize-none text-sm"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Key Differentiator
              </label>
              <Textarea
                value={serviceComponents.key_differentiator}
                onChange={(e) => updateServiceComponent("key_differentiator", e.target.value)}
                placeholder="Share what makes this offering unique"
                className="resize-none text-sm"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Call to Action
              </label>
              <Textarea
                value={serviceComponents.cta}
                onChange={(e) => updateServiceComponent("cta", e.target.value)}
                placeholder="Describe the next step you'd like the reader to take"
                className="resize-none text-sm"
                rows={2}
              />
            </div>

            {/* Include Fallback Toggle and Examples Button */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700">
                  Include fallback?
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <Switch
                    checked={includeFallback}
                    onChange={setIncludeFallback}
                    className={`${
                      includeFallback ? "bg-[#4F55F1]" : "bg-gray-200"
                    } relative inline-flex h-5 w-10 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F55F1]`}
                  >
                    <span className="sr-only">Toggle fallback forwarding request</span>
                    <span
                      aria-hidden="true"
                      className={`${
                        includeFallback ? "translate-x-5" : "translate-x-1"
                      } inline-block h-3 w-3 transform rounded-full bg-white transition`}
                    />
                  </Switch>
                  <span className="text-xs">{includeFallback ? "On" : "Off"}</span>
                </div>
              </div>

              {/* View Examples Button */}
              <button
                type="button"
                onClick={() => setShowExamples((prev) => !prev)}
                ref={examplesTriggerRef}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#4F55F1] transition-all duration-200 ease-out focus:outline-none rounded-full hover:bg-[#4F55F1]/10"
                aria-expanded={showExamples}
              >
                <ListChecks className="w-3 h-3" />
                Examples
              </button>
            </div>

            {/* Generate Preview Button */}
            <Button
              onClick={handleGeneratePreview}
              disabled={previewLoading || !isServiceContextComplete()}
              className="w-full bg-[#4F55F1] hover:bg-[#3D42D8] text-white h-9 text-sm"
            >
              {previewLoading ? "Generating..." : "Generate Preview"}
            </Button>

            {/* Error Display */}
            {previewError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
                {previewError}
              </div>
            )}

            {/* Preview Result */}
            {previewResult && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Generated Email
                </label>
                <Textarea
                  value={previewResult.email_body}
                  readOnly
                  className="resize-none bg-green-50 border-green-200 text-sm"
                  rows={6}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Examples Drawer */}
        <AnimatePresence>
          {showExamples && (
            <motion.div
              key="examples-drawer-desktop"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="pointer-events-none absolute inset-y-0 right-0 flex w-full max-w-xs z-40"
            >
              <div
                ref={desktopExamplesRef}
                className="pointer-events-auto flex-1"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <ExamplesDrawerPanel onClose={() => setShowExamples(false)} onUseExample={handleUseExample} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

LoginPage.disableWhiteCard = true;

export default LoginPage;
