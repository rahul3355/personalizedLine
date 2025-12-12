import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Check,
  ChevronDown,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { FcGoogle } from "react-icons/fc";

import SendItFastLogo from "../assets/senditfast-logo.png";
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";

// SEO
const SEO = {
  title: "Features | SendItFast.ai - AI Email Personalization Platform",
  description:
    "Explore SendItFast's powerful features: AI-powered prospect research, personalized email generation, bulk CSV processing, CRM export, and more. Scale your cold outreach without sacrificing quality.",
  url: "https://senditfast.ai/features",
  image: "https://senditfast.ai/og-features.png",
};

const features = [
  {
    title: "Deep Prospect Research",
    example: "Finds their recent Series B funding round on TechCrunch.",
  },
  {
    title: "Context-Aware Personalization",
    example: "Mentions their podcast interview about 'Future of AI' in the intro.",
  },
  {
    title: "Live Web Analysis",
    example: "Scans their careers page to specific open roles you can help fill.",
  },
  {
    title: "Verified Email Discovery",
    example: "Validates 'john.d@company.com' against SMTP servers before sending.",
  },
  {
    title: "Social Signal Detection",
    example: "Notices they just posted about 'hiring SDRs' on LinkedIn.",
  },
  {
    title: "Custom Tone Matching",
    example: "Mimics your 'casual but professional' writing style automatically.",
  },
  {
    title: "Multi-Channel Support",
    example: "Generates content formatted for both Email and LinkedIn DM limits.",
  },
  {
    title: "One-Click CRM Sync",
    example: "Pushes 'Interested' leads directly to your HubSpot pipeline.",
  },
  {
    title: "High-Throughput Engine",
    example: "Processes a list of 5,000 leads in under 20 minutes.",
  },
  {
    title: "Enterprise Security Standards",
    example: "Encrypts your prospect data with AES-256 at rest.",
  },
  {
    title: "Parallel Processing Grid",
    example: "Researches 50 prospects simultaneously to save you time.",
  },
  {
    title: "99.99% Uptime Reliability",
    example: "Always ready to send, even during end-of-quarter spikes.",
  },
  {
    title: "Auto-Scaling Architecture",
    example: "Handles your 100k lead upload as easily as a 100 lead list.",
  },
  {
    title: "Secure Data Isolation",
    example: "Your custom prompts and data are never shared with other users.",
  },
  {
    title: "Low Latency Response",
    example: "Get your first personalized batch back in seconds, not hours.",
  },
  {
    title: "Real-Time Job Monitoring",
    example: "Watch the progress bar update as each email is crafted.",
  },
];

// Feature Dropdown Component
interface FeatureProps {
  feature: {
    title: string;
    example: string;
  };
  index: number;
}

const FeatureDropdown = ({ feature, index }: FeatureProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      viewport={{ once: true }}
      className="bg-gray-50 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Check className="h-5 w-5 text-gray-900" />
          </div>
          <span className="text-gray-700 font-medium select-none">
            {feature.title}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""
            }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-12">
              <p className="text-sm text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-700">Example: </span>
                {feature.example}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Detail Dropdown Component for How It Works
interface DetailProps {
  detail: {
    title: string;
    example: string;
  };
}

const DetailDropdown = ({ detail }: DetailProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start text-left py-3 hover:bg-gray-50 rounded-lg transition-colors group focus:outline-none"
      >
        <ChevronRight
          className={`h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? "transform rotate-90 text-gray-900" : "group-hover:text-gray-600"
            }`}
        />
        <div>
          <span className={`text-gray-600 font-medium transition-colors ${isOpen ? "text-gray-900" : "group-hover:text-gray-900"}`}>
            {detail.title}
          </span>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2 text-sm text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-700">Example: </span>
                  {detail.example}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </div>
  );
};

// How it works
const howItWorks = [
  {
    step: 1,
    title: "Upload Your Prospect List",
    description:
      "Drop your CSV or Excel file containing prospect emails. Our system automatically detects email columns and validates the data format.",
    details: [
      {
        title: "Drag and drop or browse to upload",
        example: "Supports files up to 50MB. Just drag your file from your desktop.",
      },
      {
        title: "Supports CSV and XLSX formats",
        example:
          "Compatible with exports from Apollo, LinkedIn Sales Navigator, and more.",
      },
      {
        title: "Automatic header detection",
        example:
          "We instantly identify 'Email', 'First Name', and 'Company' columns.",
      },
      {
        title: "Row count and credit estimation",
        example: "See exactly how many credits you'll use before confirming.",
      },
    ],
  },
  {
    step: 2,
    title: "Describe Your Service",
    description:
      "Tell us about your offer: what you're selling, what makes it unique, and the action you want prospects to take. This context shapes every personalized line.",
    details: [
      {
        title: "Define your core value proposition",
        example: "e.g., 'Retain more customers with AI-driven churn prediction.'",
      },
      {
        title: "Highlight key differentiators",
        example:
          "e.g., 'Unlike competitors, we offer real-time implementation support.'",
      },
      {
        title: "Set your call-to-action",
        example: "e.g., 'Book a 15-min demo' or 'Start your free trial'.",
      },
      {
        title: "Optional: specify timing and goals",
        example: "e.g., 'We are looking to partner with 5 agencies this quarter.'",
      },
    ],
  },
  {
    step: 3,
    title: "AI Research & Generation",
    description:
      "Our AI searches the web for each prospect, synthesizes findings, and generates a personalized email opener that connects your offer to their specific situation.",
    details: [
      {
        title: "Web search for each prospect",
        example:
          "Searches LinkedIn, Company website, Google, Blogs, Forums, Reddit, Glassdoor, Apollo, Crunchbase, News, and 30+ more sources.",
      },
      {
        title: "Company and person analysis",
        example: "Answers questions like: 'Who is this person?' and 'What are the company's goals, revenue, and vision?'",
      },
      {
        title: "Context-aware personalization",
        example: "Identifies exactly what company pain points your service/product can solve based on the research.",
      },
      {
        title: "Quality validation checks",
        example: "Determines the best way to write emails for this specific person to maximize the chance of a reply.",
      },
    ],
  },
  {
    step: 4,
    title: "Download & Deploy",
    description:
      "Get your enriched file with personalized lines added as new columns. Import directly into your email tool and start sending campaigns that convert.",
    details: [
      {
        title: "Original data preserved",
        example: "Your original columns remain untouched; new data is appended.",
      },
      {
        title: "New personalization columns added",
        example: "Adds 'sif_email' and 'sif_personalized_line' columns.",
      },
      {
        title: "Track job history anytime",
        example: "Access your past jobs and download them again whenever needed.",
      },
    ],
  },
];



export default function FeaturesPage() {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
        <title>{SEO.title}</title>
        <meta name="title" content={SEO.title} />
        <meta name="description" content={SEO.description} />
        <meta
          name="keywords"
          content="AI email personalization features, cold email automation tool, prospect research AI, bulk email personalization, email outreach platform features, SendItFast features, sales automation features, GTM tools"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={SEO.url} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SEO.url} />
        <meta property="og:title" content={SEO.title} />
        <meta property="og:description" content={SEO.description} />
        <meta property="og:image" content={SEO.image} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO.title} />
        <meta name="twitter:description" content={SEO.description} />

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "SendItFast Features",
              description: SEO.description,
              url: SEO.url,
              mainEntity: {
                "@type": "SoftwareApplication",
                name: "SendItFast.ai",
                applicationCategory: "BusinessApplication",
                featureList: features.map(f => f.title),
              },
            }),
          }}
        />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center">
                <Image
                  src={SendItFastLogo}
                  alt="SendItFast.ai"
                  width={120}
                  height={28}
                  priority
                />
              </Link>

              <div className="hidden md:flex items-center space-x-8">
                <Link
                  href="/features"
                  className="text-gray-900 font-semibold text-sm"
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
                  href="/blog"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Blog
                </Link>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  About
                </Link>
              </div>

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
                  className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(#5a5a5a, #1c1c1c)",
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                  }}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>

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

          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-100">
              <div className="px-4 py-4 space-y-3">
                <Link
                  href="/features"
                  className="block py-2 text-gray-900 font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="block py-2 text-gray-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="/blog"
                  className="block py-2 text-gray-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link
                  href="/about"
                  className="block py-2 text-gray-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-white"
                    style={{
                      background: "linear-gradient(#5a5a5a, #1c1c1c)",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
                    }}
                  >
                    Get Started Free
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-gray-100 text-gray-900 text-sm font-medium mb-8"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Platform Features
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 tracking-tight mb-6 font-serif"
            >
              Everything you need to
              <br />
              <span className="text-gray-900">scale personalized outreach</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
            >
              AI-powered research and email generation that turns cold lists
              into warm conversations.
            </motion.p>
          </div>
        </section>

        {/* Features Grid Section */}
        <section className="py-24 bg-white px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                Powerful Capabilities
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Built for scale, security, and performance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, index) => (
                <FeatureDropdown key={index} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From upload to outreach in four simple steps
              </p>
            </div>

            <div className="relative ml-4 md:ml-12 border-l-4 border-gray-900 space-y-12 pl-8 md:pl-12">
              {howItWorks.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* Mask for the line below the last circle */}
                  {index === howItWorks.length - 1 && (
                    <div className="absolute -left-[58px] md:-left-[74px] top-12 bottom-0 w-12 bg-white" />
                  )}

                  {/* Number Circle - Centered on the border line */}
                  {/* Parent padding is pl-8 (32px) or pl-12 (48px). 
                      Border is 4px. 
                      We want circle center aligned with border center.
                      Line center relative to content start is: -(padding + 2px).
                      For pl-8: -(32 + 2) = -34px.
                      For pl-12: -(48 + 2) = -50px.
                      Circle radius is 24px (w-12).
                      Left position = Center - Radius.
                      Mobile (pl-8): -34 - 24 = -58px.
                      Desktop (pl-12): -50 - 24 = -74px.
                  */}
                  <div className="absolute -left-[58px] md:-left-[74px] top-0 h-12 w-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xl ring-8 ring-white">
                    {item.step}
                  </div>

                  {/* Content Card */}
                  <div className="bg-white rounded-2xl p-8">
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                      <div>
                        <h3 className="text-xl font-medium text-gray-900 tracking-tight font-serif mb-2">
                          {item.title}
                        </h3>
                        <p className="text-gray-600">{item.description}</p>
                      </div>
                      <div className="space-y-1">
                        {item.details.map((detail, i) => (
                          <DetailDropdown key={i} detail={detail} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>



        {/* CTA Section */}
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

        <Footer />
      </div>
    </>
  );
}

FeaturesPage.disableWhiteCard = true;
FeaturesPage.backgroundClassName = "bg-white";
