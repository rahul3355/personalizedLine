"use client";

import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";

export default function LoginPage() {
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
    <div className="flex h-dvh overflow-hidden font-sans">
      {/* Left Section */}
      <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-100">
        {/* Centered Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-y-6">
          <div className="w-full max-w-md flex flex-col gap-y-6">
            {/* Logo */}
            <span className="text-2xl font-bold text-gray-900 tracking-tight">
              Mailite
            </span>

            {/* Headings */}
            <div>
              <h1 className="text-[28px] font-semibold text-gray-900 mb-2 leading-tight">
                Login to your account
              </h1>
              <p className="text-gray-500 text-[15px]">
                Sign in with your Google account to continue.
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
        </div>

        {/* Footer */}
        <div className="mt-auto pb-4">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Image
              src="https://upload.wikimedia.org/wikipedia/en/a/ae/Flag_of_the_United_Kingdom.svg"
              alt="UK Flag"
              width={16}
              height={16}
              className="rounded-sm"
            />
            <span>Made in United Kingdom</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} Mailite. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Section - Testimonial */}
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
