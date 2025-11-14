
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
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

  useEffect(() => {
    if (session) {
      router.push("/"); // redirect logged-in users
    }
  }, [session, router]);

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

  const handleGeneratePreview = async () => {
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
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center bg-gray-50 p-8">
        <Card className="w-full max-w-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-center">Email Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Hardcoded Email Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                Email Address
              </label>
              <Input
                type="email"
                value="pip.plah@sap.com"
                disabled
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Service Input Fields */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                Core Offer
              </label>
              <Textarea
                value={serviceComponents.core_offer}
                onChange={(e) => updateServiceComponent("core_offer", e.target.value)}
                placeholder="Explain the core product or service you're offering"
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                Key Differentiator
              </label>
              <Textarea
                value={serviceComponents.key_differentiator}
                onChange={(e) => updateServiceComponent("key_differentiator", e.target.value)}
                placeholder="Share what makes this offering unique"
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                Call to Action
              </label>
              <Textarea
                value={serviceComponents.cta}
                onChange={(e) => updateServiceComponent("cta", e.target.value)}
                placeholder="Describe the next step you'd like the reader to take"
                className="resize-none"
                rows={2}
              />
            </div>

            {/* Include Fallback Toggle */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-gray-700">
                Include fallback?
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

            {/* Generate Preview Button */}
            <Button
              onClick={handleGeneratePreview}
              disabled={previewLoading || !isServiceContextComplete()}
              className="w-full bg-[#4F55F1] hover:bg-[#3D42D8] text-white"
            >
              {previewLoading ? "Generating..." : "Generate Preview"}
            </Button>

            {/* Error Display */}
            {previewError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                {previewError}
              </div>
            )}

            {/* Preview Result */}
            {previewResult && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">
                  Generated Email
                </label>
                <Textarea
                  value={previewResult.email_body}
                  readOnly
                  className="resize-none bg-green-50 border-green-200"
                  rows={8}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

LoginPage.disableWhiteCard = true;

export default LoginPage;
