import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Menu,
  HelpCircle,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import SendItFastLogo from "../assets/senditfast-logo.png";
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";

// SEO
const SEO = {
  title: "Pricing | SendItFast.ai - AI Email Personalization Plans",
  description:
    "Simple, transparent pricing for SendItFast. Start free with 500 credits, then scale with plans from $49/mo. AI-powered personalized cold emails at scale.",
  url: "https://senditfast.ai/pricing",
  image: "https://senditfast.ai/og-pricing.png",
};

// Pricing tiers
const tiers = [
  {
    name: "Free",
    id: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    credits: 500,
    yearlyCredits: 500,
    creditsLabel: "500 credits",
    description: "Perfect for trying out the platform",
    features: [
      "500 credits to start",
      "AI-powered research",
      "Personalized email generation",
      "CSV & Excel support",
      "Export to any CRM",
      "Email support",
    ],
    yearlyFeatures: [
      "500 credits to start",
      "AI-powered research",
      "Personalized email generation",
      "CSV & Excel support",
      "Export to any CRM",
      "Email support",
    ],
    notIncluded: [
      "Priority processing",
      "Credit rollover",
      "Dedicated support",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Starter",
    id: "starter",
    monthlyPrice: 49,
    yearlyPrice: 470, // $49 × 12 × 0.8 = $470/year
    credits: 2000,
    yearlyCredits: 24000, // 2000 × 12
    creditsLabel: "2,000 credits/mo",
    pricePerCredit: "$0.0245",
    addonPrice: "$15 per 1,000",
    description: "For individual sales reps and small teams",
    features: [
      "2,000 credits per month",
      "Everything in Free",
      "$15 per 1,000 add-on credits",
      "Faster processing",
      "30-day file retention",
      "Priority email support",
    ],
    yearlyFeatures: [
      "24,000 credits per year",
      "Everything in Free",
      "$15 per 1,000 add-on credits",
      "Faster processing",
      "30-day file retention",
      "Priority email support",
    ],
    notIncluded: ["Credit rollover", "Dedicated account manager"],
    cta: "Start Starter Plan",
    popular: false,
  },
  {
    name: "Growth",
    id: "growth",
    monthlyPrice: 149,
    yearlyPrice: 1430, // $149 × 12 × 0.8 = $1430/year
    credits: 10000,
    yearlyCredits: 120000, // 10000 × 12
    creditsLabel: "10,000 credits/mo",
    pricePerCredit: "$0.0149",
    addonPrice: "$13 per 1,000",
    description: "For growing sales teams and agencies",
    features: [
      "10,000 credits per month",
      "Everything in Starter",
      "$13 per 1,000 add-on credits",
      "Credit rollover (up to 2x)",
      "Priority processing queue",
      "Slack support channel",
    ],
    yearlyFeatures: [
      "120,000 credits per year",
      "Everything in Starter",
      "$13 per 1,000 add-on credits",
      "Credit rollover (up to 2x)",
      "Priority processing queue",
      "Slack support channel",
    ],
    notIncluded: ["Dedicated account manager"],
    cta: "Start Growth Plan",
    popular: true,
  },
  {
    name: "Pro",
    id: "pro",
    monthlyPrice: 499,
    yearlyPrice: 4790, // $499 × 12 × 0.8 = $4790/year
    credits: 40000,
    yearlyCredits: 480000, // 40000 × 12
    creditsLabel: "40,000 credits/mo",
    pricePerCredit: "$0.0125",
    addonPrice: "$11 per 1,000",
    description: "For large teams and enterprises",
    features: [
      "40,000 credits per month",
      "Everything in Growth",
      "$11 per 1,000 add-on credits",
      "Credit rollover (up to 3x)",
      "Highest priority processing",
      "Dedicated account manager",
      "Custom onboarding",
      "Phone support",
    ],
    yearlyFeatures: [
      "480,000 credits per year",
      "Everything in Growth",
      "$11 per 1,000 add-on credits",
      "Credit rollover (up to 3x)",
      "Highest priority processing",
      "Dedicated account manager",
      "Custom onboarding",
      "Phone support",
    ],
    notIncluded: [],
    cta: "Start Pro Plan",
    popular: false,
  },
];

// FAQ
const faqs = [
  {
    q: "What is a credit?",
    a: "1 credit = 1 prospect researched and personalized. Each row in your upload file that gets processed uses one credit.",
  },
  {
    q: "Do unused credits roll over?",
    a: "On Growth and Pro plans, unused credits roll over to the next month, up to 2x (Growth) or 3x (Pro) your monthly allowance. Free and Starter credits expire at month end.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, you can cancel your subscription at any time. You'll retain access until the end of your current billing period.",
  },
  {
    q: "What happens if I run out of credits?",
    a: "You can purchase add-on credits at any time, even on the Free plan. Add-on credits never expire and are used after your monthly credits.",
  },
  {
    q: "Is there a limit on file size?",
    a: "All plans support files up to 100,000 rows. The only limit is your available credits.",
  },
  {
    q: "Do you offer annual discounts?",
    a: "Yes! Annual plans are billed at a 20% discount compared to monthly billing.",
  },
  {
    q: "Can I upgrade or downgrade?",
    a: "Yes, you can change your plan at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at your next billing date.",
  },
  {
    q: "Do you offer enterprise pricing?",
    a: "Yes! For teams needing more than 40,000 credits per month or custom requirements, contact us for enterprise pricing.",
  },
];

// Comparison table features
const comparisonFeatures = [
  { name: "Monthly Credits", free: "500", starter: "2,000", growth: "10,000", pro: "40,000" },
  { name: "Add-on Credits (per 1,000)", free: "-", starter: "$15", growth: "$13", pro: "$11" },
  { name: "AI Research & Personalization", free: true, starter: true, growth: true, pro: true },
  { name: "CSV & Excel Export", free: true, starter: true, growth: true, pro: true },
  { name: "Real-time Progress Tracking", free: true, starter: true, growth: true, pro: true },
  { name: "Priority Processing", free: false, starter: true, growth: true, pro: true },
  { name: "Credit Rollover", free: false, starter: false, growth: "2x", pro: "3x" },
  { name: "Slack Support", free: false, starter: false, growth: true, pro: true },
  { name: "Dedicated Account Manager", free: false, starter: false, growth: false, pro: true },
  { name: "Phone Support", free: false, starter: false, growth: false, pro: true },
];

export default function PricingPage() {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
          content="SendItFast pricing, AI email personalization cost, cold email automation pricing, email outreach tool price, bulk email personalization pricing, sales automation pricing"
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

        {/* Schema.org - Pricing */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: "SendItFast Pricing",
              description: SEO.description,
              url: SEO.url,
              mainEntity: {
                "@type": "Product",
                name: "SendItFast.ai",
                description:
                  "AI-powered personalized cold email at scale",
                offers: tiers.map((tier) => ({
                  "@type": "Offer",
                  name: tier.name,
                  price: annual ? tier.yearlyPrice : tier.monthlyPrice,
                  priceCurrency: "USD",
                  description: tier.description,
                })),
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
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-900 font-semibold text-sm"
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
                  className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
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
                  className="block py-2 text-gray-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="block py-2 text-gray-900 font-semibold"
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
                    className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium text-white"
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
        <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9FAFB' }}>
          <div className="max-w-7xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 tracking-tight mb-10 font-serif"
            >
              Pricing
            </motion.h1>

            {/* Pill-style Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center rounded-full border border-gray-200 p-1 bg-white"
            >
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${!annual
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${annual
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Yearly
              </button>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9FAFB' }}>
          <div className="max-w-7xl mx-auto pt-12">
            {/* Section Label */}
            <p
              className="text-sm font-semibold text-gray-900 mb-8"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
            >
              Individual Plans
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiers.map((tier, index) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative flex flex-col rounded-2xl"
                  style={{
                    backgroundColor: '#ffffff',
                    padding: '32px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {/* 1. Plan Name - 20px semi-bold #1a1a1a */}
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: '#1a1a1a',
                        lineHeight: '1.3',
                        margin: 0
                      }}
                    >
                      {tier.name}
                    </h3>
                    {tier.popular && (
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#f97316'
                        }}
                      >
                        Recommended
                      </span>
                    )}
                  </div>

                  {/* 2. Price - $XX 22px semi-bold, /mo. or /yr. 14px #9a9a9a */}
                  <div style={{ marginTop: '4px' }}>
                    {tier.monthlyPrice === 0 ? (
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: '400',
                          color: '#1a1a1a'
                        }}
                      >
                        Free
                      </span>
                    ) : (
                      <div className="flex items-baseline">
                        <span
                          style={{
                            fontSize: '22px',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            lineHeight: '1.2'
                          }}
                        >
                          ${annual ? tier.yearlyPrice : tier.monthlyPrice}
                        </span>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '400',
                            color: '#9a9a9a'
                          }}
                        >
                          {annual ? '/yr.' : '/mo.'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. Features Header - 14px italic #8b7355 */}
                  <p
                    className="italic"
                    style={{
                      fontSize: '14px',
                      fontWeight: '400',
                      color: '#8b7355',
                      lineHeight: '1.5',
                      marginTop: '24px',
                      marginBottom: '16px'
                    }}
                  >
                    {index === 0 ? "Includes:" : `Everything in ${tiers[index - 1].name}, plus:`}
                  </p>

                  {/* 4. Features List - compact 8px spacing, Check icon, pure black text */}
                  <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(annual ? tier.yearlyFeatures : tier.features).map((feature, i) => (
                      <div key={i} className="flex" style={{ gap: '6px', alignItems: 'flex-start' }}>
                        <Check
                          size={14}
                          strokeWidth={2}
                          style={{
                            color: '#8b7355',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        />
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '400',
                            color: '#000000',
                            lineHeight: '1.3'
                          }}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                    {tier.notIncluded.map((feature, i) => (
                      <div key={i} className="flex" style={{ gap: '6px', alignItems: 'flex-start' }}>
                        <X
                          size={14}
                          strokeWidth={2}
                          style={{
                            color: '#d1d5db',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        />
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '400',
                            color: '#d1d5db',
                            lineHeight: '1.3'
                          }}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 5. Button - pill, 14px medium, 10px 24px padding */}
                  <div style={{ marginTop: '32px' }}>
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="transition-all duration-200"
                      style={{
                        display: 'inline-block',
                        padding: '10px 24px',
                        borderRadius: '9999px',
                        fontSize: '14px',
                        fontWeight: '500',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: tier.popular ? '#1a1a1a' : '#e8e4dc',
                        color: tier.popular ? '#ffffff' : '#1a1a1a',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = tier.popular ? '#2a2a2a' : '#dcd8d0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = tier.popular ? '#1a1a1a' : '#e8e4dc';
                      }}
                    >
                      {tier.cta}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise Section - Centered Card */}
        <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F9FAFB' }}>
          <div className="max-w-4xl mx-auto">
            {/* Enterprise Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '16px',
                padding: '32px'
              }}
            >
              {/* Card Header */}
              <h3
                style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '4px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
              >
                Enterprise
              </h3>
              <p
                style={{
                  fontSize: '16px',
                  color: '#666666',
                  marginBottom: '24px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
              >
                Custom pricing for large teams
              </p>

              {/* Features intro */}
              <p
                style={{
                  fontSize: '14px',
                  color: '#666666',
                  marginBottom: '16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}
              >
                Everything in Pro, plus:
              </p>

              {/* Features Grid - Two Columns */}
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-3" style={{ marginBottom: '32px' }}>
                {[
                  'Unlimited credits',
                  'Custom integrations',
                  'Dedicated account manager',
                  'Priority support channel',
                  'Custom onboarding',
                  'Phone support',
                  'API access',
                  'SSO/SAML authentication',
                  'Advanced analytics & reporting',
                  'Custom data retention',
                  'SLA guarantee',
                  'Invoice/PO billing'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center" style={{ gap: '10px' }}>
                    <Check
                      size={16}
                      strokeWidth={2}
                      style={{ color: '#1a1a1a', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: '400',
                        color: '#1a1a1a',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                      }}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Contact Sales Button */}
              <Link
                href="mailto:sales@senditfast.ai"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: '1px solid #e5e5e5',
                  backgroundColor: '#ffffff',
                  color: '#1a1a1a',
                  textDecoration: 'none',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>



        {/* FAQ Section - Cursor Style */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between">
              {/* Left side - Title (30% width) */}
              <div style={{ width: '30%', minWidth: '200px' }}>
                <h2
                  className="font-sans"
                  style={{
                    fontSize: '40px',
                    fontWeight: '500',
                    color: '#1a1a1a',
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  Questions & Answers
                </h2>
              </div>

              {/* Right side - Questions (65% width) */}
              <div style={{ width: '45%' }} className="mt-8 md:mt-0">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    style={{ borderBottom: '1px solid #e5e5e5' }}
                  >
                    <button
                      onClick={() =>
                        setExpandedFaq(expandedFaq === index ? null : index)
                      }
                      className="w-full text-left flex items-center justify-between transition-opacity hover:opacity-60"
                      style={{ padding: '16px 0' }}
                    >
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: '500',
                          color: '#1a1a1a',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      >
                        {faq.q}
                      </span>
                      <ChevronDown
                        size={18}
                        strokeWidth={1.5}
                        className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ml-6 ${expandedFaq === index ? "rotate-180" : ""
                          }`}
                      />
                    </button>
                    {expandedFaq === index && (
                      <div
                        style={{
                          paddingBottom: '16px',
                          fontSize: '14px',
                          lineHeight: '1.7',
                          color: '#666666',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section - Try SendItFast */}
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

PricingPage.disableWhiteCard = true;
PricingPage.backgroundClassName = "bg-white";
