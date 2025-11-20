import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Upload, Zap, Download, Shield, Clock, TrendingUp } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { ProcessFlowchart } from "@/components/ProcessFlowchart";
import { CompanyLogos } from "@/components/CompanyLogos";
import { cn } from "@/lib/utils";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <InlineLoader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <h1 className="text-lg font-medium text-gray-700">
          Please log in to continue
        </h1>
      </div>
    );
  }

  const handleStartFree = () => {
    router.push("/upload");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Dot Pattern Background */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className={cn(
            "text-gray-300/60",
            "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
          )}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 py-24 text-center">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-black max-w-4xl mx-auto leading-tight tracking-tight mb-8"
            style={{ fontFamily: '"Aeonik Pro", "Aeonik", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
          >
            Turn prospects into personalized outreach
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            AI-powered research for every lead. Upload your CSV, get personalized opening lines in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              onClick={handleStartFree}
              size="lg"
              className="group relative rounded-full h-12 px-8 text-base font-medium bg-black text-white hover:bg-gray-800 transition-colors duration-200"
            >
              <span className="inline-flex items-center">
                Start Free (500 credits)
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Check className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">
              No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* Process Flowchart */}
      <ProcessFlowchart />

      {/* Features Bento Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold text-center text-black mb-16">
            Everything you need to scale outreach
          </h2>

          <BentoGrid>
            <BentoCard
              name="Lightning Fast"
              description="Process hundreds of leads in minutes, not hours. AI-powered research that scales with your pipeline."
              Icon={Zap}
              className="md:col-span-2"
            />
            <BentoCard
              name="Real-Time Research"
              description="We analyze each prospect using live web data to craft relevant, personalized opening lines."
              Icon={TrendingUp}
            />
            <BentoCard
              name="Secure & Private"
              description="Enterprise-grade security. Your data is encrypted and never shared. SOC 2 compliant infrastructure."
              Icon={Shield}
            />
            <BentoCard
              name="Simple Upload"
              description="Drop your CSV or XLSX file. No complex setup, no technical knowledge required."
              Icon={Upload}
              className="md:col-span-2"
            />
          </BentoGrid>
        </div>
      </section>

      {/* Company Logos / Testimonials */}
      <section className="py-16 bg-gray-50">
        <CompanyLogos />
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="group transition-colors hover:bg-gray-50 rounded-2xl p-8">
              <div className="text-5xl font-bold text-black mb-3">3x</div>
              <div className="text-gray-600 font-medium">Higher reply rate</div>
            </div>
            <div className="group transition-colors hover:bg-gray-50 rounded-2xl p-8">
              <div className="text-5xl font-bold text-black mb-3">2min</div>
              <div className="text-gray-600 font-medium">Average processing time</div>
            </div>
            <div className="group transition-colors hover:bg-gray-50 rounded-2xl p-8">
              <div className="text-5xl font-bold text-black mb-3">500</div>
              <div className="text-gray-600 font-medium">Free credits to start</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 bg-black text-white overflow-hidden">
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className={cn(
            "text-white/20",
            "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
          )}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold mb-6">
            Ready to scale your outreach?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join teams using AI-powered research to book more meetings.
          </p>
          <Button
            onClick={handleStartFree}
            size="lg"
            className="group rounded-full h-12 px-8 text-base font-medium bg-white text-black hover:bg-gray-100 transition-colors duration-200"
          >
            <span className="inline-flex items-center">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </Button>
          <p className="mt-6 text-sm text-gray-400">
            500 free credits • No credit card required
          </p>
        </div>
      </section>
    </div>
  );
}
