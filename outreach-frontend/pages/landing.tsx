import { useState, useEffect, useRef } from "react";
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
  ChevronLeft,
  Play,
  Star,
  Menu,
  X,
  Building2,
  Briefcase,
  Target,
  Rocket,
  Megaphone,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import SendItFastLogo from "../assets/senditfast-logo.png";
import BgBgImage from "../assets/bgbg1.png";
import Bento1Image from "../assets/bento1.png";
import Bento2Image from "../assets/bento2.png";
import Bento3Image from "../assets/bento3.png";
import Bento4Image from "../assets/bento4.png";
import Bento5Image from "../assets/bento5.png";
import Bento6Image from "../assets/bento6.png";
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
    imagePosition: "center 40%",  // Adjust: 0% = top, 50% = center, 100% = bottom
    whiteAreaHeight: "55%",        // Adjust: higher % = more white area, less image visible
  },
  {
    icon: Sparkles,
    title: "AI-Powered Personalization",
    description:
      "Generate unique, human-sounding email openers that reference specific details about each prospect. No templates, no generic lines.",
    imagePosition: "center 40%",
    whiteAreaHeight: "55%",
  },
  {
    icon: Upload,
    title: "Bulk Processing",
    description:
      "Upload CSV or Excel files with up to 100,000 prospects. Get personalized lines for every single row, delivered in minutes.",
    imagePosition: "center 60%",
    whiteAreaHeight: "55%",
  },
  {
    icon: FileSpreadsheet,
    title: "Export Anywhere",
    description:
      "Download enriched files with personalized columns. Works with any CRM or email tool - Salesforce, HubSpot, Instantly, Smartlead.",
    imagePosition: "center 80%",
    whiteAreaHeight: "55%",
  },
  {
    icon: Shield,
    title: "No Data Lock-in",
    description:
      "Your data stays yours. Download everything, cancel anytime. No proprietary formats or vendor lock-in.",
    imagePosition: "center 80%",  // Use keywords: top, center, bottom
    whiteAreaHeight: "55%",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Parallel processing means thousands of prospects get researched and personalized simultaneously. Hours of work done in minutes.",
    imagePosition: "center 30%",
    whiteAreaHeight: "55%",
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
  {
    title: "Founders & CEOs",
    description:
      "Close strategic partnerships and key accounts with research-backed outreach that gets replies.",
    icon: Briefcase,
  },
  {
    title: "Real Estate Agents",
    description:
      "Reach property investors and clients with personalized messages that reference their specific interests.",
    icon: Building2,
  },
  {
    title: "Consultants",
    description:
      "Win more clients by showing you understand their challenges before the first conversation.",
    icon: Target,
  },
  {
    title: "SaaS Startups",
    description:
      "Build your pipeline from scratch with personalized cold outreach that punches above your weight.",
    icon: Rocket,
  },
  {
    title: "Marketing Agencies",
    description:
      "Offer cold email as a service with AI-powered personalization at scale for multiple clients.",
    icon: Megaphone,
  },
];

// Stats
const stats = [
  { value: "30+", label: "Sources used for research" },
  { value: "1.2M", label: "Emails used to fine-tune the AI model" },
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
  const [showSolution, setShowSolution] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Card dimensions
  const cardWidth = 280;
  const cardGap = 24;
  const cardTotal = cardWidth + cardGap; // 304px per card

  // Initialize carousel to show original cards (skip clones at start)
  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      // Start at the first real card (after the cloned set)
      carousel.scrollLeft = useCases.length * cardTotal;
    }
  }, []);

  // Seamless infinite scroll handler
  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const scrollPos = carousel.scrollLeft;
    const singleSetWidth = useCases.length * cardTotal;

    // If scrolled to the cloned cards at the beginning, jump to real cards
    if (scrollPos < cardTotal / 2) {
      carousel.scrollLeft = scrollPos + singleSetWidth;
    }
    // If scrolled to the cloned cards at the end, jump back to real cards
    else if (scrollPos > singleSetWidth * 2 - carousel.clientWidth) {
      carousel.scrollLeft = scrollPos - singleSetWidth;
    }
  };

  // Carousel navigation handlers
  const scrollCarouselLeft = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({ left: -cardTotal, behavior: 'smooth' });
  };

  const scrollCarouselRight = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({ left: cardTotal, behavior: 'smooth' });
  };

  // Tripled array for seamless looping (clone + original + clone)
  const infiniteUseCases = [...useCases, ...useCases, ...useCases];

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
                <div className="relative group">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium text-white tracking-tight transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: loading ? "#D1D5DB" : "linear-gradient(#5a5a5a, #1c1c1c)",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                    }}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 mr-2"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="white"
                            strokeWidth="3"
                            strokeDasharray="31.4 31.4"
                            strokeLinecap="round"
                          />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <FcGoogle className="h-4 w-4 mr-2 rounded-full" />
                        Sign in with Google
                      </>
                    )}
                  </button>
                  {!loading && (
                    <div className="absolute -inset-1 rounded-xl border-2 border-dashed border-black opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
                  )}
                </div>
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
                    <div className="relative group w-full mt-2">
                      <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium text-white tracking-tight transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: loading ? "#D1D5DB" : "linear-gradient(#5a5a5a, #1c1c1c)",
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                        }}
                      >
                        {loading ? (
                          <>
                            <svg
                              className="animate-spin h-4 w-4 mr-2"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="white"
                                strokeWidth="3"
                                strokeDasharray="31.4 31.4"
                                strokeLinecap="round"
                              />
                            </svg>
                            Signing in...
                          </>
                        ) : (
                          <>
                            <FcGoogle className="h-4 w-4 mr-2 rounded-full" />
                            Sign in with Google
                          </>
                        )}
                      </button>
                      {!loading && (
                        <div className="absolute -inset-1 rounded-xl border-2 border-dashed border-black opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src={BgBgImage}
              alt="Background"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
              priority
              quality={100}
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-400 text-sm font-medium mb-8"
              >

                Best-in-class personalization
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 tracking-tight leading-[1.1] mb-6 font-serif"
              >
                Personalize Cold Emails
                <br />

              </motion.h1>
              <br></br>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                Our AI Agent researches each person and
                generates well-researched email and personalized opener that gets a
                reply
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col items-center justify-center"
              >
                <div className="relative group">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center px-16 py-4 rounded-xl text-base font-medium text-white tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: loading ? "#D1D5DB" : "linear-gradient(#5a5a5a, #1c1c1c)",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                    }}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 mr-2"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="white"
                            strokeWidth="3"
                            strokeDasharray="31.4 31.4"
                            strokeLinecap="round"
                          />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <FcGoogle className="h-5 w-5 mr-3 rounded-full" />
                        Sign in with Google
                      </>
                    )}
                  </button>
                  {!loading && (
                    <div className="absolute -inset-1 rounded-xl border-2 border-dashed border-black opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
                  )}
                </div>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-400"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
                  Free 500 credits
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
                  Bonus reward
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-white">
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
                  <div className="text-4xl sm:text-5xl font-medium text-gray-900 smb-2 font-mono">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Toggle Switch */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setShowSolution(false)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${!showSolution
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  The Problem
                </button>
                <button
                  onClick={() => setShowSolution(true)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${showSolution
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  Our Solution
                </button>
              </div>
            </div>

            {/* Card Container with Animation */}
            <AnimatePresence mode="wait">
              {!showSolution ? (
                /* Problem Card */
                <motion.div
                  key="problem"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setShowSolution(true)}
                  className="bg-white rounded-2xl p-10 transition-all duration-300 cursor-pointer"
                >
                  <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 tracking-tight mb-8 font-serif">
                    Cold email personalization is broken
                  </h2>
                  <div className="space-y-5 text-gray-600">
                    <p className="flex items-start">
                      <X className="h-4 w-4 text-red-400 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        Manual research is impossible to scale
                      </span>
                    </p>
                    <p className="flex items-start">
                      <X className="h-4 w-4 text-red-400 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        Templates produce generic, bad marketing emails
                      </span>
                    </p>
                    <p className="flex items-start">
                      <X className="h-4 w-4 text-red-400 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        Buyers expect personalization, templated email gets ignored
                      </span>
                    </p>
                    <p className="flex items-start">
                      <X className="h-4 w-4 text-red-400 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        Agencies spend time behind third-world VAs that suck
                      </span>
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* Solution Card */
                <motion.div
                  key="solution"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setShowSolution(false)}
                  className="bg-white rounded-2xl p-10 transition-all duration-300 cursor-pointer"
                >
                  <h3 className="text-2xl sm:text-3xl font-medium text-gray-900 tracking-tight mb-8 font-serif">
                    SendItFast changes everything
                  </h3>
                  <div className="space-y-5 text-gray-600">
                    <p className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        AI researches every prospect from 30+ sources, finds real signals
                      </span>
                    </p>
                    <p className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        Generate unique emails and openers that shows you did work
                      </span>
                    </p>
                    <p className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        Process thousands of prospects in minutes
                      </span>
                    </p>
                    <p className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                      <span className="leading-relaxed">
                        Way higher reply rates compared to templates
                      </span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
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
                  className="relative group"
                >
                  <div className="text-6xl font-bold text-gray-900/10 mb-4 transition-colors duration-200 group-hover:text-gray-900">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 tracking-tight mb-2 font-serif">
                    {step.title}
                  </h3>
                  <p className="text-gray-600">{step.description}</p>
                  {index < steps.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute top-8 -right-4 h-8 w-8 text-gray-400" />
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
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                Built for high-performing sales teams
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to scale personalized outreach
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => {
                // Map each feature to its corresponding bento image
                const bentoImages = [Bento1Image, Bento2Image, Bento3Image, Bento4Image, Bento5Image, Bento6Image];
                const bentoImage = bentoImages[index];

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="group overflow-hidden bg-white rounded-2xl transition-all duration-300"
                  >
                    {/* Image Area - fixed height, not absolute positioned */}
                    <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                      <Image
                        src={bentoImage}
                        alt={feature.title}
                        fill
                        className="object-cover"
                        style={{ objectPosition: feature.imagePosition }}
                      />
                      {/* Dark overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center z-10">
                        <span className="text-white font-medium text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif">
                          Read More
                        </span>
                      </div>
                    </div>
                    {/* Content Area - separate from image, no overlap possible */}
                    <div className="p-6 sm:p-8 bg-white group-hover:bg-[#FFFFF0] transition-colors duration-300">
                      <h3 className="text-xl font-medium text-gray-900 tracking-tight mb-3 font-serif">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                Who uses SendItFast
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Trusted by sales teams, agencies, and founders who value quality
                over quantity
              </p>
            </div>

            {/* Carousel Container */}
            <div className="relative">
              {/* Left Arrow */}
              <button
                onClick={scrollCarouselLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-lg transition-all duration-200 hidden lg:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={scrollCarouselRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-lg transition-all duration-200 hidden lg:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Scrollable Cards */}
              <div
                ref={carouselRef}
                id="useCasesCarousel"
                className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={handleCarouselScroll}
              >
                {infiniteUseCases.map((useCase, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-[280px] bg-white rounded-2xl p-8 text-center"
                  >
                    <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                      <useCase.icon className="h-7 w-7 text-gray-700" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 tracking-tight mb-2 font-serif">
                      {useCase.title}
                    </h3>
                    <p className="text-gray-600 text-sm">{useCase.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tagline */}
            <div className="mt-12 text-center">
              <p className="text-gray-500 text-lg italic">
                ...literally anyone who uses cold emails
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
              {/* Left Column - Heading */}
              <div className="lg:col-span-4">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-normal text-gray-900 tracking-tight leading-tight">
                  Questions & Answers
                </h2>
              </div>

              {/* Right Column - FAQ Items */}
              <div className="lg:col-span-8 space-y-0">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <button
                      onClick={() =>
                        setExpandedFaq(expandedFaq === index ? null : index)
                      }
                      className="w-full py-6 text-left flex items-center justify-between hover:opacity-70 transition-opacity group"
                    >
                      <span className="font-normal text-gray-900 text-base pr-8">
                        {faq.q}
                      </span>
                      <svg
                        className={`h-5 w-5 text-gray-900 flex-shrink-0 transition-transform duration-200 ${
                          expandedFaq === index ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
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
                          <div className="pb-6 pr-12 text-gray-600 text-[15px] leading-relaxed">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-medium text-gray-900 tracking-tight mb-12 font-serif">
              Try SendItFast
            </h2>
            <div className="relative group inline-block">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex items-center justify-center px-8 py-4 rounded-xl text-base font-medium text-white tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? "#D1D5DB" : "linear-gradient(#5a5a5a, #1c1c1c)",
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="3"
                        strokeDasharray="31.4 31.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Start for free
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
              {!loading && (
                <div className="absolute -inset-1 rounded-xl border-2 border-dashed border-black opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
              )}
            </div>
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