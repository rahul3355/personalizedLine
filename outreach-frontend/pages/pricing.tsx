import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  X,
  Sparkles,
  Menu,
  HelpCircle,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Switch } from "@headlessui/react";

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
    yearlyPrice: 470,
    credits: 2000,
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
    notIncluded: ["Credit rollover", "Dedicated account manager"],
    cta: "Start Starter Plan",
    popular: false,
  },
  {
    name: "Growth",
    id: "growth",
    monthlyPrice: 149,
    yearlyPrice: 1430,
    credits: 10000,
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
    notIncluded: ["Dedicated account manager"],
    cta: "Start Growth Plan",
    popular: true,
  },
  {
    name: "Pro",
    id: "pro",
    monthlyPrice: 499,
    yearlyPrice: 4790,
    credits: 40000,
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
        <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-medium text-gray-900 tracking-tight mb-6 font-serif"
            >
              Simple, transparent pricing
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto mb-10"
            >
              Start free, upgrade when you're ready. No hidden fees. Cancel
              anytime.
            </motion.p>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center justify-center gap-4"
            >
              <span
                className={`text-sm font-medium ${!annual ? "text-gray-900" : "text-gray-400"
                  }`}
              >
                Monthly
              </span>
              <Switch
                checked={annual}
                onChange={setAnnual}
                className={`${annual ? "bg-gray-900" : "bg-gray-200"
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span
                  className={`${annual ? "translate-x-6" : "translate-x-1"
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
              <span
                className={`text-sm font-medium ${annual ? "text-gray-900" : "text-gray-400"
                  }`}
              >
                Annual{" "}
                <span className="text-green-500 font-semibold">
                  (Save 20%)
                </span>
              </span>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiers.map((tier, index) => (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative rounded-2xl p-8 ${tier.popular
                    ? "ring-2 ring-[#4F55F1] bg-white"
                    : "bg-white border border-gray-100"
                    }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#4F55F1] text-white text-xs font-medium rounded-full">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-medium text-gray-900 tracking-tight mb-2 font-serif">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-gray-500">{tier.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        $
                        {annual
                          ? Math.round(tier.yearlyPrice / 12)
                          : tier.monthlyPrice}
                      </span>
                      <span className="text-gray-500 ml-2">/month</span>
                    </div>
                    {annual && tier.monthlyPrice > 0 && (
                      <p className="text-sm text-green-500 mt-1">
                        ${tier.yearlyPrice} billed annually
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      {tier.creditsLabel}
                    </p>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 mb-6 ${tier.popular
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                  >
                    {tier.cta}
                  </button>

                  <div className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                    {tier.notIncluded.map((feature, i) => (
                      <div key={i} className="flex items-start opacity-50">
                        <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
              Need more than 40,000 credits?
            </h2>
            <p className="text-gray-600 mb-8">
              Contact us for enterprise pricing with unlimited credits, custom
              integrations, dedicated support, and more.
            </p>
            <Link
              href="mailto:sales@senditfast.ai"
              className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            >
              Contact Sales
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                Compare Plans
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">
                      Feature
                    </th>
                    {tiers.map((tier) => (
                      <th
                        key={tier.id}
                        className={`text-center py-4 px-4 font-semibold ${tier.popular ? "text-gray-900 font-bold" : "text-gray-900"
                          }`}
                      >
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-4 px-4 text-gray-600">{feature.name}</td>
                      {["free", "starter", "growth", "pro"].map((tierId) => {
                        const value = feature[tierId as keyof typeof feature];
                        return (
                          <td key={tierId} className="text-center py-4 px-4">
                            {typeof value === "boolean" ? (
                              value ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-gray-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-gray-900">{value}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedFaq(expandedFaq === index ? null : index)
                    }
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-bold text-gray-900">{faq.q}</span>
                    <HelpCircle
                      className={`h-5 w-5 text-gray-400 transition-transform ${expandedFaq === index ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-4 text-gray-600">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-6 font-serif">
              Ready to get started?
            </h2>
            <p className="text-xl text-gray-600 mb-10">
              Start with 500 free credits. No credit card required.
            </p>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="inline-flex items-center px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: "linear-gradient(#5a5a5a, #1c1c1c)",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              <FcGoogle className="h-5 w-5 mr-3 bg-white rounded-full p-0.5" />
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

PricingPage.disableWhiteCard = true;
PricingPage.backgroundClassName = "bg-white";
