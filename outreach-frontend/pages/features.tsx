import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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
  Target,
  BarChart3,
  RefreshCw,
  Download,
  Lock,
  Cpu,
  Database,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
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

// Core Features
const coreFeatures = [
  {
    icon: Search,
    title: "AI-Powered Prospect Research",
    description:
      "Our AI searches the web in real-time to find relevant signals about each prospect - company news, personal achievements, recent announcements, and industry trends. No stale data, no guesswork.",
    benefits: [
      "Real-time web search for each prospect",
      "Finds company and personal insights",
      "Identifies recent news and achievements",
      "Detects competitive positioning signals",
    ],
  },
  {
    icon: Sparkles,
    title: "Personalized Email Generation",
    description:
      "Generate unique, human-sounding email openers that reference specific details about each prospect. Our AI crafts lines that sound like you actually did the research - because it did.",
    benefits: [
      "Unique opener for every prospect",
      "References specific insights found",
      "Natural, human tone of voice",
      "Customizable to your offer and style",
    ],
  },
  {
    icon: Upload,
    title: "Bulk CSV & Excel Processing",
    description:
      "Upload files with up to 100,000 prospects. Our platform handles massive lists efficiently, processing thousands of prospects in parallel without compromising quality.",
    benefits: [
      "Support for CSV and XLSX formats",
      "Up to 100,000 rows per upload",
      "Automatic column detection",
      "Memory-efficient streaming processing",
    ],
  },
  {
    icon: FileSpreadsheet,
    title: "Flexible Export Options",
    description:
      "Download enriched files with personalized columns added. Works seamlessly with any CRM or email tool - Salesforce, HubSpot, Instantly, Smartlead, Apollo, and more.",
    benefits: [
      "Export to CSV or Excel format",
      "Compatible with all major CRMs",
      "Preserves original data structure",
      "Add custom columns as needed",
    ],
  },
  {
    icon: Zap,
    title: "Lightning-Fast Processing",
    description:
      "Parallel processing architecture means thousands of prospects get researched and personalized simultaneously. What would take days manually happens in minutes.",
    benefits: [
      "Parallel processing architecture",
      "Real-time progress tracking",
      "Average 2-5 seconds per prospect",
      "Background processing while you work",
    ],
  },
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description:
      "Your data is encrypted at rest and in transit. We never store your prospect lists longer than necessary, and you can delete everything anytime.",
    benefits: [
      "AES-256 encryption",
      "SOC 2 compliant infrastructure",
      "GDPR compliant data handling",
      "Automatic data retention policies",
    ],
  },
];

// How it works
const howItWorks = [
  {
    step: 1,
    title: "Upload Your Prospect List",
    description:
      "Drop your CSV or Excel file containing prospect emails. Our system automatically detects email columns and validates the data format.",
    details: [
      "Drag and drop or browse to upload",
      "Supports CSV and XLSX formats",
      "Automatic header detection",
      "Row count and credit estimation",
    ],
  },
  {
    step: 2,
    title: "Describe Your Service",
    description:
      "Tell us about your offer: what you're selling, what makes it unique, and the action you want prospects to take. This context shapes every personalized line.",
    details: [
      "Define your core value proposition",
      "Highlight key differentiators",
      "Set your call-to-action",
      "Optional: specify timing and goals",
    ],
  },
  {
    step: 3,
    title: "AI Research & Generation",
    description:
      "Our AI searches the web for each prospect, synthesizes findings, and generates a personalized email opener that connects your offer to their specific situation.",
    details: [
      "Web search for each prospect",
      "Company and person analysis",
      "Context-aware personalization",
      "Quality validation checks",
    ],
  },
  {
    step: 4,
    title: "Download & Deploy",
    description:
      "Get your enriched file with personalized lines added as new columns. Import directly into your email tool and start sending campaigns that convert.",
    details: [
      "Original data preserved",
      "New personalization columns added",
      "Ready for CRM import",
      "Track job history anytime",
    ],
  },
];

// Technical specs
const techSpecs = [
  {
    icon: Cpu,
    title: "Processing Speed",
    value: "2-5 sec/prospect",
    description: "Average time to research and personalize one prospect",
  },
  {
    icon: Database,
    title: "Maximum File Size",
    value: "100,000 rows",
    description: "Upload large prospect lists without breaking them up",
  },
  {
    icon: RefreshCw,
    title: "Real-time Updates",
    value: "WebSocket",
    description: "Live progress tracking for all running jobs",
  },
  {
    icon: Lock,
    title: "Data Retention",
    value: "30 days",
    description: "Files auto-delete after 30 days for security",
  },
];

// Integration examples
const integrations = [
  "Salesforce",
  "HubSpot",
  "Instantly",
  "Smartlead",
  "Apollo",
  "Lemlist",
  "Outreach",
  "Salesloft",
  "Close",
  "Pipedrive",
  "Monday CRM",
  "Copper",
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
                featureList: coreFeatures.map((f) => f.title),
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
                  className="text-[#4F55F1] text-sm font-medium"
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
                    background:
                      "linear-gradient(135deg, #4F55F1 0%, #3D42D8 100%)",
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
                  className="block py-2 text-[#4F55F1] font-medium"
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
                  href="/about"
                  className="block py-2 text-gray-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <div className="pt-3 border-t border-gray-100">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #4F55F1 0%, #3D42D8 100%)",
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
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#4F55F1]/10 text-[#4F55F1] text-sm font-medium mb-8"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Platform Features
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6"
            >
              Everything you need to
              <br />
              <span className="text-[#4F55F1]">scale personalized outreach</span>
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

        {/* Core Features Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Core Features
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Powerful tools designed for sales teams who value quality and
                efficiency
              </p>
            </div>

            <div className="space-y-16">
              {coreFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className={`grid lg:grid-cols-2 gap-12 items-center ${
                    index % 2 === 1 ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                    <div className="h-14 w-14 rounded-2xl bg-[#4F55F1]/10 flex items-center justify-center mb-6">
                      <feature.icon className="h-7 w-7 text-[#4F55F1]" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 mb-6">{feature.description}</p>
                    <ul className="space-y-3">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div
                    className={`bg-gradient-to-br from-[#4F55F1]/5 to-[#4F55F1]/10 rounded-3xl p-8 h-80 flex items-center justify-center ${
                      index % 2 === 1 ? "lg:order-1" : ""
                    }`}
                  >
                    <feature.icon className="h-32 w-32 text-[#4F55F1]/30" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From upload to outreach in four simple steps
              </p>
            </div>

            <div className="space-y-12">
              {howItWorks.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white border border-gray-100 rounded-2xl p-8"
                >
                  <div className="grid md:grid-cols-2 gap-8 items-start">
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="h-12 w-12 rounded-full bg-[#4F55F1] text-white flex items-center justify-center font-bold text-xl mr-4">
                          {item.step}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                    <ul className="space-y-3">
                      {item.details.map((detail, i) => (
                        <li key={i} className="flex items-start">
                          <ChevronRight className="h-5 w-5 text-[#4F55F1] mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Technical Specs Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Technical Specifications
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Built for performance and scale
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {techSpecs.map((spec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 text-center"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#4F55F1]/10 flex items-center justify-center mx-auto mb-4">
                    <spec.icon className="h-6 w-6 text-[#4F55F1]" />
                  </div>
                  <div className="text-3xl font-bold text-[#4F55F1] mb-2">
                    {spec.value}
                  </div>
                  <div className="font-semibold text-gray-900 mb-1">
                    {spec.title}
                  </div>
                  <div className="text-sm text-gray-500">{spec.description}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Works with Your Stack
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Export to any CRM or email tool. No complicated integrations
                needed.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {integrations.map((integration, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="px-6 py-3 bg-gray-50 rounded-full text-gray-700 font-medium"
                >
                  {integration}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-[#4F55F1] px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to try SendItFast?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Start with 500 free credits. No credit card required.
            </p>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="inline-flex items-center px-8 py-4 rounded-xl text-base font-semibold bg-white text-[#4F55F1] hover:bg-gray-100 transition-all duration-200"
            >
              <FcGoogle className="h-5 w-5 mr-3" />
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}

FeaturesPage.disableWhiteCard = true;
FeaturesPage.backgroundClassName = "bg-white";
