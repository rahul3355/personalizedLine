import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Upload,
  Search,
  Sparkles,
  FileSpreadsheet,
  Mail,
  Zap,
  Shield,
  Globe,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  Play,
  Star,
  Menu,
  X,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import SendItFastLogo from "../assets/senditfast-logo.png";
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";

// SEO Constants
const SEO = {
  title: "SendItFast.ai - AI-Powered Personalized Cold Email at Scale",
  description:
    "Generate personalized cold emails at scale with AI. Upload your prospect list, get research-backed, conversion-focused email openers in minutes. Perfect for B2B sales, agencies, and GTM teams.",
  url: "https://senditfast.ai",
  image: "https://senditfast.ai/og-image.png",
};

// Feature data
const features = [
  {
    icon: Search,
    title: "Deep Prospect Research",
    description:
      "AI searches the web to find relevant signals about each prospect - recent news, company updates, and personal achievements.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Personalization",
    description:
      "Generate unique, human-sounding email openers that reference specific details about each prospect. No templates, no generic lines.",
  },
  {
    icon: Upload,
    title: "Bulk Processing",
    description:
      "Upload CSV or Excel files with up to 100,000 prospects. Get personalized lines for every single row, delivered in minutes.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export Anywhere",
    description:
      "Download enriched files with personalized columns. Works with any CRM or email tool - Salesforce, HubSpot, Instantly, Smartlead.",
  },
  {
    icon: Shield,
    title: "No Data Lock-in",
    description:
      "Your data stays yours. Download everything, cancel anytime. No proprietary formats or vendor lock-in.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Parallel processing means thousands of prospects get researched and personalized simultaneously. Hours of work done in minutes.",
  },
];

// How it works steps
const steps = [
  {
    number: "01",
    title: "Upload Your List",
    description:
      "Drop your CSV or Excel file with prospect emails. We handle lists from 10 to 100,000 rows.",
  },
  {
    number: "02",
    title: "Describe Your Offer",
    description:
      "Tell us what you're selling and what makes it unique. Our AI tailors every line to your value proposition.",
  },
  {
    number: "03",
    title: "AI Researches & Writes",
    description:
      "Our AI searches the web for each prospect, finds relevant signals, and crafts a personalized opener.",
  },
  {
    number: "04",
    title: "Download & Send",
    description:
      "Get your enriched file with personalized lines. Import into your email tool and start sending.",
  },
];

// Use cases
const useCases = [
  {
    title: "B2B Sales Teams",
    description:
      "Scale personalized outreach without hiring more SDRs. Each rep can send hundreds of truly personalized emails daily.",
    icon: TrendingUp,
  },
  {
    title: "Lead Gen Agencies",
    description:
      "Deliver higher quality campaigns for clients. Personalization that actually converts, not generic templates.",
    icon: Users,
  },
  {
    title: "GTM Teams",
    description:
      "Launch campaigns faster. From prospect list to personalized outreach in hours, not weeks.",
    icon: Zap,
  },
  {
    title: "Recruiters",
    description:
      "Stand out in candidates' inboxes. Personalized outreach that shows you actually researched them.",
    icon: Mail,
  },
];

// Stats
const stats = [
  { value: "10x", label: "Faster than manual research" },
  { value: "140%", label: "Higher response rates" },
  { value: "100K", label: "Prospects per upload" },
  { value: "500", label: "Free credits to start" },
];

// Testimonials / Social proof
const testimonials = [
  {
    quote:
      "SendItFast cut our prospecting time by 80%. The personalization quality is indistinguishable from manual research.",
    author: "Sarah Chen",
    role: "Head of Sales, TechScale",
    avatar: "SC",
  },
  {
    quote:
      "We've tried every personalization tool out there. SendItFast is the only one that actually sounds human.",
    author: "Marcus Johnson",
    role: "Founder, OutboundPro Agency",
    avatar: "MJ",
  },
  {
    quote:
      "Our reply rates doubled after switching to SendItFast. The AI actually finds relevant talking points.",
    author: "Emily Rodriguez",
    role: "SDR Manager, CloudFirst",
    avatar: "ER",
  },
];

// Pricing tiers for preview
const pricingPreview = [
  {
    name: "Free",
    price: "0",
    credits: "500",
    description: "Perfect for trying out the platform",
  },
  {
    name: "Starter",
    price: "49",
    credits: "2,000",
    description: "For individual sales reps",
  },
  {
    name: "Growth",
    price: "149",
    credits: "10,000",
    description: "For growing sales teams",
    popular: true,
  },
  {
    name: "Pro",
    price: "499",
    credits: "40,000",
    description: "For agencies and large teams",
  },
];

// FAQ data
const faqs = [
  {
    q: "What does SendItFast do exactly?",
    a: "SendItFast is an AI-powered platform that researches prospects and generates personalized email openers at scale. You upload a spreadsheet with prospect emails, and we return the same file enriched with personalized, research-backed email lines for each prospect.",
  },
  {
    q: "How is this different from other email tools?",
    a: "Unlike template-based tools, SendItFast actually researches each prospect using web search to find relevant signals - company news, personal achievements, recent updates. The AI then crafts unique openers that reference these specific details, not generic personalization like 'I saw you work at [Company]'.",
  },
  {
    q: "Do you send emails or connect to my inbox?",
    a: "No. SendItFast focuses purely on research and personalization. We don't send emails or touch your inbox. You upload a file, we generate personalized lines, and you download the enriched file to use with any email tool you prefer.",
  },
  {
    q: "How many prospects can I process at once?",
    a: "Our platform handles files up to 100,000 rows. Processing happens in parallel, so even large files complete in a reasonable time.",
  },
  {
    q: "What format do I need for my prospect list?",
    a: "We support CSV and Excel (XLSX) files. Your file needs at minimum an email column - we extract the domain to research the company. Name columns help us find more personal information.",
  },
  {
    q: "How do credits work?",
    a: "1 credit = 1 prospect researched and personalized. Everyone starts with 500 free credits. Paid plans range from 2,000 to 40,000 credits per month, with add-on credits available.",
  },
];

export default function LandingPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{SEO.title}</title>
        <meta name="title" content={SEO.title} />
        <meta name="description" content={SEO.description} />
        <meta
          name="keywords"
          content="AI email personalization, cold email automation, personalized outreach, bulk email personalization, AI cold email, email outreach tool, B2B email, sales automation, GTM tools, lead generation, prospect research, email copywriting AI, SendItFast"
        />
        <meta name="author" content="SendItFast.ai" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={SEO.url} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SEO.url} />
        <meta property="og:title" content={SEO.title} />
        <meta property="og:description" content={SEO.description} />
        <meta property="og:image" content={SEO.image} />
        <meta property="og:site_name" content="SendItFast.ai" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={SEO.url} />
        <meta name="twitter:title" content={SEO.title} />
        <meta name="twitter:description" content={SEO.description} />
        <meta name="twitter:image" content={SEO.image} />

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "SendItFast.ai",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description: SEO.description,
              url: SEO.url,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "Free tier with 500 credits",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "127",
              },
              featureList: [
                "AI-powered prospect research",
                "Personalized email generation",
                "Bulk CSV/Excel processing",
                "CRM integration export",
                "Real-time progress tracking",
              ],
            }),
          }}
        />

        {/* Organization schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "SendItFast.ai",
              url: SEO.url,
              logo: `${SEO.url}/logo.png`,
              sameAs: [
                "https://twitter.com/senditfast",
                "https://linkedin.com/company/senditfast",
              ],
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center">
                <Image
                  src={SendItFastLogo}
                  alt="SendItFast.ai - AI Email Personalization Tool"
                  width={120}
                  height={28}
                  priority
                />
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <Link
                  href="/features"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  About
                </Link>
              </div>

              {/* CTA Buttons */}
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Log in
                </Link>
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg, #4F55F1 0%, #3D42D8 100%)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray="31.4 31.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    <>
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white border-t border-gray-100"
              >
                <div className="px-4 py-4 space-y-3">
                  <Link
                    href="/features"
                    className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link
                    href="/pricing"
                    className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/about"
                    className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About
                  </Link>
                  <div className="pt-3 border-t border-gray-100">
                    <Link
                      href="/login"
                      className="block py-2 text-gray-600 hover:text-gray-900 font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full mt-2 inline-flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, #4F55F1 0%, #3D42D8 100%)",
                      }}
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#4F55F1]/10 text-[#4F55F1] text-sm font-medium mb-8"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI-Powered Email Personalization
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-6"
              >
                Personalized cold emails
                <br />
                <span className="text-[#4F55F1]">at scale</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                Upload your prospect list. Our AI researches each person and
                generates unique, human-sounding email openers that actually get
                replies.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="group relative inline-flex items-center px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  style={{
                    background: "linear-gradient(135deg, #4F55F1 0%, #3D42D8 100%)",
                    boxShadow: "0 4px 14px rgba(79, 85, 241, 0.4)",
                  }}
                >
                  <FcGoogle className="h-5 w-5 mr-3 bg-white rounded-full p-0.5" />
                  Start Free with Google
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
                <span className="text-sm text-gray-500">
                  500 free credits, no card required
                </span>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-400"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Export to any CRM
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  GDPR compliant
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <div className="text-4xl sm:text-5xl font-bold text-[#4F55F1] mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                  Cold email personalization is broken
                </h2>
                <div className="space-y-4 text-gray-600">
                  <p className="flex items-start">
                    <X className="h-5 w-5 text-red-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      Manual research takes hours per prospect - impossible to
                      scale
                    </span>
                  </p>
                  <p className="flex items-start">
                    <X className="h-5 w-5 text-red-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      Template tools produce generic, robotic-sounding emails
                    </span>
                  </p>
                  <p className="flex items-start">
                    <X className="h-5 w-5 text-red-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      86% of buyers expect personalization - generic emails get
                      ignored
                    </span>
                  </p>
                  <p className="flex items-start">
                    <X className="h-5 w-5 text-red-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      SDRs spend 12+ hours per week writing emails that don't
                      convert
                    </span>
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#4F55F1]/5 to-[#4F55F1]/10 rounded-3xl p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  SendItFast changes everything
                </h3>
                <div className="space-y-4 text-gray-600">
                  <p className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      AI researches every prospect automatically - find real
                      talking points
                    </span>
                  </p>
                  <p className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      Generate unique openers that sound like you actually did
                      the work
                    </span>
                  </p>
                  <p className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      Process thousands of prospects in minutes, not weeks
                    </span>
                  </p>
                  <p className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-1 flex-shrink-0" />
                    <span>
                      2x higher reply rates compared to template-based
                      approaches
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                How SendItFast works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From prospect list to personalized outreach in four simple
                steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="text-6xl font-bold text-[#4F55F1]/10 mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                  {index < steps.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute top-8 -right-4 h-8 w-8 text-[#4F55F1]/30" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Built for high-performing sales teams
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to scale personalized outreach
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white border border-gray-100 rounded-2xl p-8 hover:border-[#4F55F1]/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#4F55F1]/10 flex items-center justify-center mb-6">
                    <feature.icon className="h-6 w-6 text-[#4F55F1]" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Who uses SendItFast
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Trusted by sales teams, agencies, and founders who value quality
                over quantity
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {useCases.map((useCase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-8 text-center"
                >
                  <div className="h-14 w-14 rounded-xl bg-[#4F55F1]/10 flex items-center justify-center mx-auto mb-6">
                    <useCase.icon className="h-7 w-7 text-[#4F55F1]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{useCase.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Loved by sales teams everywhere
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 rounded-2xl p-8"
                >
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-[#4F55F1] flex items-center justify-center text-white font-medium mr-3">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-gray-500">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Preview Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Start free, upgrade when you're ready. No hidden fees.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {pricingPreview.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`bg-white rounded-2xl p-8 ${
                    plan.popular
                      ? "ring-2 ring-[#4F55F1] relative"
                      : "border border-gray-100"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#4F55F1] text-white text-xs font-medium rounded-full">
                      Popular
                    </div>
                  )}
                  <div className="text-lg font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    {plan.credits} credits/month
                  </div>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/pricing"
                className="inline-flex items-center text-[#4F55F1] font-medium hover:underline"
              >
                View full pricing details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Frequently asked questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedFaq(expandedFaq === index ? null : index)
                    }
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{faq.q}</span>
                    <ChevronRight
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedFaq === index ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {expandedFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4 text-gray-600">{faq.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Ready to scale your outreach?
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Join thousands of sales professionals who've already made the
              switch to AI-powered personalization.
            </p>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group relative inline-flex items-center px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:scale-105 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #4F55F1 0%, #3D42D8 100%)",
                boxShadow: "0 4px 14px rgba(79, 85, 241, 0.4)",
              }}
            >
              <FcGoogle className="h-5 w-5 mr-3 bg-white rounded-full p-0.5" />
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="mt-4 text-sm text-gray-500">
              500 free credits to start. No credit card required.
            </p>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}

LandingPage.disableWhiteCard = true;
LandingPage.backgroundClassName = "bg-white";
