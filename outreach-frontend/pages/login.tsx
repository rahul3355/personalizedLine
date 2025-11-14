
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import { Globe } from "@/components/ui/globe";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";

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
      {/* Beta Button with BorderBeam - positioned over the dividing line */}
      <div className="absolute left-1/2 top-10 hidden -translate-x-1/2 lg:flex z-50">
        <Button className="relative overflow-hidden" size="lg" variant="outline">
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
      <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-100 bg-white">
        {/* Centered Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 gap-y-6">
          <div className="w-full max-w-md flex flex-col gap-y-6">
            {/* Logo */}
            

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

      {/* Right Section - Globe (desktop only) */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center bg-gray-50 relative">
        <div className="max-w-lg px-12 text-center mb-8 z-10">
          <blockquote className="text-[20px] font-medium text-gray-900 leading-snug tracking-tight">
            Cold emails that prove you did your homework
          </blockquote>
        </div>
        <div className="relative w-full max-w-[600px] h-[600px] flex items-center justify-center">
          <Globe className="top-0" />
        </div>
      </div>
    </div>
  );
}

LoginPage.disableWhiteCard = true;

export default LoginPage;
