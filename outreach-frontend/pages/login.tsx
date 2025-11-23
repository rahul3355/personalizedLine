import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";
import { GridPattern } from "@/components/ui/grid-pattern";
import { Check, ArrowRight, ChevronRight, ChevronDown } from "lucide-react";
import { Globe } from "@/components/ui/globe";
import { Lens } from "@/components/ui/lens";
import Sign from "../assets/sign.png";
import SendItFastLogo from "../assets/senditfast-logo.png";
import Whiteboard from "../assets/whiteboard2.png";

// Company Logos
import AppleLogo from "../assets/apple.png";
import AwsLogo from "../assets/aws.png";
import BlackrockLogo from "../assets/blackrock.png";
import DeuLogo from "../assets/deu.png";
import DisneyLogo from "../assets/disney.png";
import MetaLogo from "../assets/meta.png";
import NikeLogo from "../assets/nike.png";
import SapLogo from "../assets/sap.png";
import StarbucksLogo from "../assets/starb.png";
import UberLogo from "../assets/uber.png";
import Logo12 from "../assets/12.png";
import AsdaLogo from "../assets/asda.png";
import CdLogo from "../assets/cd.png";
import DuLogo from "../assets/du.png";
import GymGroupLogo from "../assets/gymgroup.png";
import JdLogo from "../assets/jd.png";
import JioLogo from "../assets/jio.png";
import NrLogo from "../assets/nr.png";
import TcsLogo from "../assets/tcs.png";
import UomLogo from "../assets/uom.png";
import UooLogo from "../assets/uoo.png";
import VdfnLogo from "../assets/vdfn.png";

function LoginPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [session, router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
      });
    } catch (error) {
      setLoading(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="relative flex min-h-screen w-full font-sans bg-white">
      {/* Beta Button */}
      <div className="fixed left-1/2 top-10 hidden -translate-x-1/2 lg:flex z-50">
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
      <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-100 bg-white lg:h-screen lg:sticky lg:top-0">
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 gap-y-6">
          <div className="w-full max-w-md flex flex-col gap-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-[22px] sm:text-[24px] lg:text-[28px] font-semibold text-gray-900 mb-2 leading-tight">
                Login to your account
              </h1>
              <p className="text-gray-500 text-[14px] sm:text-[15px]">
                Sign in or sign up with your Google account to continue.
              </p>
            </div>

            <div className="relative w-full group">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? "#D1D5DB" : "linear-gradient(#5a5a5a, #1c1c1c)",
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
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
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="1"
                        strokeDasharray="15.7 47.1"
                        strokeDashoffset="15.7"
                        strokeLinecap="round"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <FcGoogle className="w-5 h-5 mr-2 rounded-full" />
                    Sign in with Google
                  </>
                )}
              </button>
              {!loading && (
                <div className="absolute -inset-1 rounded-xl border-2 border-dashed border-black opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100"></div>
              )}
            </div>
          </div>

          {/* Mobile Content */}
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

      {/* Right Section - Full Landing Page (desktop only) */}
      <div className="hidden lg:flex w-1/2 flex-col bg-gray-50 relative">
        {/* Grid Pattern Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <GridPattern
            width={30}
            height={30}
            x={-1}
            y={-1}
            strokeDasharray={"4 2"}
            className={cn(
              "opacity-50"
            )}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col px-8 py-12 space-y-16">
          {/* Header Section with Logo */}
          <div className="flex flex-col items-center justify-center space-y-6">
            <Image
              src={SendItFastLogo}
              alt="SendItFast Logo"
              width={120}
              height={120}
              className="h-auto"
            />
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold text-black font-sans tracking-tighter">
                Personalized your cold emails
              </h2>
              <p className="text-lg text-gray-500 font-sans">
                <span>
                  Well-researched, personalized emails for every lead.
                </span>
                <br />
                Ideal for B2B Sales, Agencies, and GTM Teams
              </p>
            </div>
            {/* Whiteboard Image */}
            <div className="w-full max-w-xl mt-4 group">
              <Lens
                zoomFactor={2}
                lensSize={200}
                isStatic={false}
                ariaLabel="Zoom Area"
              >
                <Image
                  src={Whiteboard}
                  alt="Whiteboard demonstration"
                  className="w-full h-auto rounded-3xl grayscale group-hover:grayscale-0 transition-all duration-300"
                  priority
                />
              </Lens>
            </div>
          </div>

          {/* Hero Section with Globe and Logos */}
          <section className="flex flex-col space-y-6">
            <p className="text-md font-regular tracking-widest text-gray-900 mb-2 text-center uppercase font-sans">
              POSITIVE REPLIES FROM TEAMS AT:
            </p>

            <div className="grid grid-cols-2 gap-1 items-center">
              {/* Left: Globe */}
              <div className="relative flex items-center justify-center h-[250px]">
                <Globe className="scale-75" />
              </div>

              {/* Right: Company Logos Section */}
              <div className="rounded-xl p-6 flex flex-col items-center justify-center h-full">
                <div className="grid grid-cols-4 gap-x-4 gap-y-6 justify-items-center items-center w-full">
                  <Image src={AppleLogo} alt="Apple" className="h-12 w-auto object-contain" />
                  <Image src={AwsLogo} alt="AWS" className="h-5 w-auto object-contain" />
                  <Image src={BlackrockLogo} alt="Blackrock" className="h-12 w-auto object-contain" />
                  <Image src={DeuLogo} alt="Deutsche Bank" className="h-12 w-auto object-contain" />
                  <Image src={DisneyLogo} alt="Disney" className="h-12 w-auto object-contain" />
                  <Image src={MetaLogo} alt="Meta" className="h-12 w-auto object-contain" />
                  <Image src={NikeLogo} alt="Nike" className="h-5 w-auto object-contain" />
                  <Image src={SapLogo} alt="SAP" className="h-5 w-auto object-contain" />
                  <Image src={StarbucksLogo} alt="Starbucks" className="h-12 w-auto object-contain" />
                  <Image src={UberLogo} alt="Uber" className="h-4 w-auto object-contain" />

                  {/* New Logos */}
                  <Image src={Logo12} alt="12" className="h-12 w-auto object-contain" />
                  <Image src={AsdaLogo} alt="Asda" className="h-5 w-auto object-contain" />
                  <Image src={CdLogo} alt="CD" className="h-12 w-auto object-contain" />
                  <Image src={DuLogo} alt="Du" className="h-12 w-auto object-contain" />
                  <Image src={GymGroupLogo} alt="Gym Group" className="h-5 w-auto object-contain" />
                  <Image src={JdLogo} alt="JD" className="h-12 w-auto object-contain" />
                  <Image src={JioLogo} alt="Jio" className="h-12 w-auto object-contain" />
                  <Image src={NrLogo} alt="NR" className="h-12 w-auto object-contain" />
                  <Image src={TcsLogo} alt="TCS" className="h-5 w-auto object-contain" />
                  <Image src={UomLogo} alt="UOM" className="h-12 w-auto object-contain" />
                  <Image src={UooLogo} alt="UOO" className="h-12 w-auto object-contain" />
                  <Image src={VdfnLogo} alt="Vodafone" className="h-12 w-auto object-contain" />


                </div>
              </div>
            </div>
          </section>

          {/* Manifesto */}
          <section className="bg-white p-6 space-y-4">
            <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              Why SendItFast?
            </h3>
            <h4 className="text-lg font-semibold text-black">
              Emails deserves better than "quick personalization hacks"
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed">
              SendItFast is built on a simple belief: personalization isn't a trick to
              dodge spam filters. It's a way to show you actually did the work. That's
              why every row is treated like a mini research task, not just a mail merge.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <p className="font-semibold text-black text-xs">Real context</p>
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  Pull from signals prospects actually care about, not just "saw you
                  went to X university."
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-black text-xs">Respectful brevity</p>
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  One sharp opener that earns a reply, instead of templated slops.
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-black text-xs">Measurable lift</p>
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  Structured outputs so you can test, track, and iterate without
                  rebuilding your workflow.
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-black text-xs">Efficiency at scale</p>
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  Sound human, not algorithmic. No robotic tells. Lines that feel researched, not generated.
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-black text-xs">Your data, your control</p>
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  Copyright-free. Export everything. Move to any CRM. No lock-in, no proprietary formatting that holds your work hostage.
                </p>
              </div>
            </div>

            {/* Signature - Right aligned */}
            <div className="pt-6 flex justify-end">
              <div className="space-y-2 text-right">
                <Image
                  src={Sign}
                  alt="Signature"
                  width={120}
                  height={60}
                  className="h-auto ml-auto"
                />
                <p className="text-xs text-gray-600">Founder, SendItFast</p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-black">
                FAQs
              </h2>
            </div>

            <div className="space-y-3">
              {/* FAQ 1 */}
              <div
                className="rounded-xl border border-gray-300 bg-white overflow-hidden cursor-pointer"
                onClick={() => toggleFaq(0)}
              >
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium text-black">What does SendItFast do?</span>
                  {openFaq === 0 ? (
                    <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  )}
                </div>
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    openFaq === 0 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-xs text-gray-700 leading-relaxed">
                      SendItFast is an AI-powered platform that researches prospects and writes personalized email lines at scale. Upload a spreadsheet, get back the same file with personalized email body and custom openers for every lead, no manual research required.
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ 2 */}
              <div
                className="rounded-xl border border-gray-300 bg-white overflow-hidden cursor-pointer"
                onClick={() => toggleFaq(1)}
              >
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium text-black">Do you send emails or manage inbox?</span>
                  {openFaq === 1 ? (
                    <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  )}
                </div>
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    openFaq === 1 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-xs text-gray-700 leading-relaxed">
                      SendItFast focuses purely on research, email and opener generation. We don't send emails or connect to your inbox. You upload a file, we generate structured outputs, and you download an enriched spreadsheet.
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ 3 */}
              <div
                className="rounded-xl border border-gray-300 bg-white overflow-hidden cursor-pointer"
                onClick={() => toggleFaq(2)}
              >
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium text-black">How do credits and the 500 free rows work?</span>
                  {openFaq === 2 ? (
                    <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  )}
                </div>
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    openFaq === 2 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-xs text-gray-700 leading-relaxed">
                      Each processed email costs 1 credit. Your very first upload includes 500 rows free, regardless of plan, so you can see the tone and research depth before paying. (You can get 500 extra credits on using the first 500, for a limited time.)
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ 4 */}
              <div
                className="rounded-xl border border-gray-300 bg-white overflow-hidden cursor-pointer"
                onClick={() => toggleFaq(3)}
              >
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm font-medium text-black">Cost?</span>
                  {openFaq === 3 ? (
                    <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500 transition-transform duration-200" />
                  )}
                </div>
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-in-out",
                    openFaq === 3 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-xs text-gray-700 leading-relaxed">
                      Free 500 credits to start. After that, plans starts at $49/month for 2000 credits ($0.0245 per credit). It scales down to $0.0125 per credit if purchased at scale.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

LoginPage.disableWhiteCard = true;

export default LoginPage;