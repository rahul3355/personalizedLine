import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Menu,
  X,
  Target,
  Heart,
  Users,
  Zap,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import SendItFastLogo from "../assets/senditfast-logo.png";
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";

// SEO
const SEO = {
  title: "About | SendItFast.ai - Our Mission & Story",
  description:
    "Learn about SendItFast.ai, our mission to make personalized outreach accessible to everyone, and how we're using AI to transform cold email for sales teams worldwide.",
  url: "https://senditfast.ai/about",
  image: "https://senditfast.ai/og-about.png",
};

// Values
const values = [
  {
    icon: Target,
    title: "Quality Over Quantity",
    description:
      "We believe in personalization that actually works. Every line should feel researched and relevant, not templated and generic.",
  },
  {
    icon: Heart,
    title: "Respect for Recipients",
    description:
      "Good personalization respects the recipient's time. Our AI crafts openers that earn attention, not annoy.",
  },
  {
    icon: Users,
    title: "Built for Teams",
    description:
      "From solo founders to enterprise sales teams, our platform scales with you. Same quality, any volume.",
  },
  {
    icon: Zap,
    title: "Speed Without Sacrifice",
    description:
      "Fast doesn't mean cheap. Our AI does in minutes what would take humans hours, without cutting corners on quality.",
  },
];

// Stats
const stats = [
  { value: "10M+", label: "Emails personalized" },
  { value: "5,000+", label: "Sales teams served" },
  { value: "127", label: "Countries reached" },
  { value: "4.9/5", label: "Average rating" },
];

export default function AboutPage() {
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
          content="SendItFast about, AI email company, cold email automation company, email personalization startup, sales technology company, GTM tools"
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
              "@type": "AboutPage",
              name: "About SendItFast",
              description: SEO.description,
              url: SEO.url,
              mainEntity: {
                "@type": "Organization",
                name: "SendItFast.ai",
                description:
                  "AI-powered personalized cold email at scale",
                url: "https://senditfast.ai",
                foundingDate: "2024",
                sameAs: [
                  "https://twitter.com/senditfast",
                  "https://linkedin.com/company/senditfast",
                ],
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
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/about"
                  className="text-gray-900 font-semibold text-sm"
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
                  className="block py-2 text-gray-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="/about"
                  className="block py-2 text-gray-900 font-semibold"
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
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#4F55F1]/10 text-[#4F55F1] text-sm font-medium mb-8"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Our Story
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl font-medium text-gray-900 tracking-tight mb-6 font-serif"
              >
                Making personalized outreach
                <br />
                <span className="text-gray-900">accessible to everyone</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-gray-600 leading-relaxed"
              >
                We started SendItFast because we believed there had to be a
                better way to do cold outreach. Manual research doesn't scale,
                but generic templates don't convert. So we built something
                better.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-6 font-serif">
                  Our Mission
                </h2>
                <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                  <p>
                    Cold outreach gets a bad reputation because most of it is
                    terrible. Generic templates, obvious automation, zero
                    relevance to the recipient. It's spam with extra steps.
                  </p>
                  <p>
                    But when outreach is done right - when you've actually
                    researched the person and found a genuine reason to connect
                    - it works. The problem is that kind of personalization
                    takes hours per prospect. It doesn't scale.
                  </p>
                  <p>
                    Our mission is to make quality personalization scalable. We
                    use AI to do the research that humans don't have time for,
                    and generate openers that sound like you actually did the
                    work. Because the AI did.
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-900 mb-4">
                    10x
                  </div>
                  <div className="text-xl text-gray-600">
                    faster than manual research
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
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
                  <div className="text-4xl sm:text-5xl font-medium text-gray-900 tracking-tight mb-2 font-serif">
                    {stat.value}
                  </div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-24 bg-gray-50 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 mb-4 font-serif">
                What We Believe
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Our values guide everything we build
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-8 text-center"
                >
                  <div className="h-14 w-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
                    <value.icon className="h-7 w-7 text-gray-700" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 tracking-tight mb-2 font-serif">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-medium text-gray-900 tracking-tight mb-8 text-center font-serif">
                The Problem We Solve
              </h2>

              <div className="space-y-8 text-gray-600 text-lg leading-relaxed">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
                  <h3 className="text-xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                    The Old Way
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      Spend 5-10 minutes researching each prospect manually
                    </li>
                    <li>
                      Write custom openers that reference what you found
                    </li>
                    <li>
                      Process maybe 10-20 prospects per hour
                    </li>
                    <li>Burn out your SDR team doing repetitive work</li>
                    <li>Or give up and send generic templates that get ignored</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-2xl p-8">
                  <h3 className="text-xl font-medium text-gray-900 tracking-tight mb-4 font-serif">
                    The SendItFast Way
                  </h3>
                  <ul className="space-y-3">
                    <li>
                      Upload your entire prospect list at once
                    </li>
                    <li>
                      AI researches each person in real-time using web search
                    </li>
                    <li>
                      Generate personalized openers that reference specific
                      details
                    </li>
                    <li>Process thousands of prospects in parallel</li>
                    <li>Download enriched file ready for your email tool</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gray-900 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-medium text-white mb-6 font-serif">
              Ready to try it yourself?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Join thousands of sales teams who've made the switch to
              AI-powered personalization.
            </p>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="inline-flex items-center px-8 py-4 rounded-xl text-base font-semibold bg-white text-gray-900 hover:bg-gray-100 transition-all duration-200"
            >
              <FcGoogle className="h-5 w-5 mr-3" />
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <p className="mt-4 text-sm text-white/60">
              500 free credits. No credit card required.
            </p>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}

AboutPage.disableWhiteCard = true;
AboutPage.backgroundClassName = "bg-white";
