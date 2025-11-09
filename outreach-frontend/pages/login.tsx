"use client";

import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import logo from "../pages/logo.png";

function LoginPage() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/"); // redirect logged-in users
    }
  }, [session, router]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <div className="relative flex h-dvh w-full overflow-hidden font-sans bg-white">
      <div className="absolute left-1/2 top-10 hidden -translate-x-1/2 lg:flex">
        <div
          className="rounded-full px-6 py-1.5"
          style={{
            background: 'linear-gradient(180deg, #f0f0f0 0%, #d4d4d4 25%, #b0b0b0 50%, #c8c8c8 75%, #e0e0e0 100%)',
            boxShadow: `
              inset 0 3px 6px rgba(255, 255, 255, 0.9),
              inset 0 -2px 4px rgba(0, 0, 0, 0.3),
              inset 3px 0 4px rgba(0, 0, 0, 0.15),
              inset -3px 0 4px rgba(0, 0, 0, 0.15),
              0 4px 8px rgba(0, 0, 0, 0.25),
              0 2px 4px rgba(0, 0, 0, 0.2)
            `,
            border: '1px solid rgba(0, 0, 0, 0.2)',
          }}
        >
          <span
            className="text-sm font-semibold text-black"
            style={{
              fontFamily: '"Aeonik Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              textShadow: `
                0 1px 2px rgba(255, 255, 255, 0.9),
                0 -1px 1px rgba(0, 0, 0, 0.6)
              `,
              letterSpacing: '0.05em'
            }}
          >
            BETA
          </span>
        </div>
      </div>
      {/* Left Section */}
      <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-100 bg-white">
        {/* Centered Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 gap-y-6">
          <div className="w-full max-w-md flex flex-col gap-y-6">
            {/* Logo */}
            <div className="flex justify-center lg:justify-start">
              <Image
                src={logo}
                alt="AuthorityPoint Logo"
                width={140}
                height={36}
                priority
                className="lg:w-[180px] lg:h-[40px]"
              />
            </div>

            {/* Headings */}
            <div className="text-center lg:text-left">
              <h1 className="text-[22px] sm:text-[24px] lg:text-[28px] font-semibold text-gray-900 mb-2 leading-tight">
                Login to your account
              </h1>
              <p className="text-gray-500 text-[14px] sm:text-[15px]">
                Sign in or sign up with your Google account to continue.
              </p>
            </div>

            {/* Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl font-medium text-white text-[15px] tracking-tight shadow-sm transition-all duration-300"
              style={{
                background: "linear-gradient(#5a5a5a, #1c1c1c)",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 8px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <FcGoogle className="w-5 h-5 mr-2 rounded-full" />
              Sign in with Google
            </button>
          </div>

          {/* Mobile Testimonial */}
          <div className="flex lg:hidden w-full mt-10">
            <div className="w-full max-w-sm mx-auto text-center">
              <blockquote className="text-[16px] font-medium text-gray-900 leading-relaxed">
                “Mailite has transformed how we manage outreach. It’s fast,
                intuitive, and incredibly effective — streamlining our workflow
                into one sleek experience.”
              </blockquote>
              <div className="mt-4">
                <p className="text-gray-900 font-semibold">Alex Carter</p>
                <p className="text-gray-500 text-sm">Founder, GrowthForge</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pb-4">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Image
  src="https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg"
  alt="UK Flag"
  width={24}   // set width only
  height={0}   // let aspect ratio calculate height
  className="h-auto w-[24px] rounded-[2px] object-contain"
/>
            <span>Made in United Kingdom</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} AuthorityPoint. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Section - Testimonial (desktop only) */}
      <div className="hidden lg:flex w-1/2 items-center justify-center bg-gray-50">
        <div className="max-w-lg px-12">
          <blockquote className="text-[22px] font-medium text-gray-900 leading-snug tracking-tight">
            “Mailite has transformed how we manage outreach. It’s fast,
            intuitive, and incredibly effective — streamlining our workflow
            into one sleek experience.”
          </blockquote>
          <div className="mt-6">
            <p className="text-gray-900 font-semibold">Alex Carter</p>
            <p className="text-gray-500 text-sm">Founder, GrowthForge</p>
          </div>
        </div>
      </div>
    </div>
  );
}

LoginPage.disableWhiteCard = true;

export default LoginPage;
