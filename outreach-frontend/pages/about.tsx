import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

import SendItFastLogo from "../assets/senditfast-logo.png";
import AboutImage from "../assets/about-1.png";
import Frame1 from "../assets/frame1.png";
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";
import LandingNavbar from "../components/LandingNavbar";

// SEO
const SEO = {
  title: "About | SendItFast.ai - Our Mission & Story",
  description:
    "Learn about SendItFast.ai, our mission to make personalized outreach accessible to everyone, and how we're using AI to transform cold email for sales teams worldwide.",
  url: "https://senditfast.ai/about",
  image: "https://senditfast.ai/og-about.png",
};



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
        {/* Navigation */}
        <LandingNavbar />

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center">


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
                better way to do cold outreach.
                better.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
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
              <div className="rounded-3xl overflow-hidden flex items-center justify-center">
                <Image
                  src={AboutImage}
                  alt="About SendItFast"
                  className="w-full h-auto object-cover rounded-3xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Why SendItFast Section with Frame */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            {/* Frame Container */}
            <div className="relative">
              {/* Frame Image - positioned absolutely around the content */}
              <div className="absolute inset-0 pointer-events-none opacity-50 rounded-sm overflow-hidden" style={{ margin: '-40px', padding: '40px' }}>
                <Image
                  src={Frame1}
                  alt=""
                  fill
                  className="object-contain rounded-sm"
                  style={{ objectFit: 'fill' }}
                />
              </div>

              {/* Content inside the frame */}
              <div className="relative bg-white p-10 space-y-6 rounded-sm" style={{ margin: '20px' }}>
                <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">
                  Why SendItFast?
                </h3>
                <h4 className="text-2xl font-semibold text-black">
                  Emails deserves better than "quick personalization hacks"
                </h4>
                <p className="text-base text-gray-700 leading-relaxed">
                  SendItFast is built on a simple belief: personalization isn't a trick to
                  dodge spam filters. It's a way to show you actually did the work. That's
                  why every row is treated like a mini research task, not just a mail merge.
                </p>
                <div className="grid gap-6 md:grid-cols-3 pt-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-black text-sm">Real context</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Pull from signals prospects actually care about, not just "saw you
                      went to X university."
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-black text-sm">Respectful brevity</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      One sharp opener that earns a reply, instead of templated slops.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-black text-sm">Measurable lift</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Structured outputs so you can test, track, and iterate without
                      rebuilding your workflow.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-black text-sm">Efficiency at scale</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Sound human, not algorithmic. No robotic tells. Lines that feel researched, not generated.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-black text-sm">Your data, your control</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Copyright-free. Export everything. Move to any CRM. No lock-in, no proprietary formatting that holds your work hostage.
                    </p>
                  </div>
                </div>
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

        <Footer />
      </div>
    </>
  );
}

AboutPage.disableWhiteCard = true;
AboutPage.backgroundClassName = "bg-white";
