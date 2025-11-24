"use client"
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { Sparkles, FileText } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";
import Link from "next/link";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { useRef } from "react";
import mailAnimation from "../assets/mail.json";
import archiveAnimation from "../assets/archive.json";
import shipImage from "../assets/ship.png"

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const archiveLottieRef = useRef<LottieRefCurrentProps>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <InlineLoader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Please log in to continue</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-170px)] overflow-hidden bg-white p-8 rounded-3xl">
      {/* Dot Pattern Background */}
      <div className="absolute inset-0 overflow-hidden">
        <DotPattern
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
          className={cn(
            "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
          )}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Existing Cards */}
          <div className="flex flex-col gap-0">
            {/* Generate Card */}
            <Link
              href="/upload"
              className="group relative flex flex-col justify-between bg-white p-6 transition-all border-2 border-gray-100 rounded-t-xl hover:border-[#4f55f1] hover:border-dashed"
              onMouseEnter={() => lottieRef.current?.play()}
              onMouseLeave={() => lottieRef.current?.stop()}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 -ml-1 transition-all grayscale group-hover:grayscale-0">
                    <Lottie
                      lottieRef={lottieRef}
                      animationData={mailAnimation}
                      loop={true}
                      autoplay={false}
                    />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">Start</h3>
                </div>
                <p className="text-sm text-gray-500">
                  Start generating emails by uploading lead list
                </p>
              </div>
            </Link>

            {/* View Files Card */}
            <Link
              href="/jobs"
              className="group relative flex flex-col justify-between bg-white p-6 transition-all border-2 border-gray-100 border-t-0 rounded-b-xl hover:border-[#4f55f1] hover:border-dashed hover:border-t-2"
              onMouseEnter={() => {
                archiveLottieRef.current?.setSpeed(0.3);
                archiveLottieRef.current?.play();
              }}
              onMouseLeave={() => archiveLottieRef.current?.stop()}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 -ml-1 transition-all grayscale group-hover:grayscale-0">
                    <Lottie
                      lottieRef={archiveLottieRef}
                      animationData={archiveAnimation}
                      loop={true}
                      autoplay={false}
                    />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">View Files</h3>
                </div>
                <p className="text-sm text-gray-500">
                  View processed files
                </p>
              </div>
            </Link>
          </div>

          {/* Right Column - Promotional Card */}
          <div className="flex flex-col items-center justify-start">
            {/* Polaroid Photo Card */}
            <div className="bg-white p-3 shadow-xl transition-shadow duration-300 max-w-sm">
              {/* Photo Container */}
              <div className="bg-gray-100 mb-3">
                <img
                  src={shipImage.src}
                  alt="Ship illustration"
                  className="w-full h-auto aspect-square object-cover"
                />
              </div>

              {/* Polaroid Caption Area */}
              <div className="flex items-center justify-between gap-3 pb-2">
                {/* Text on left */}
                <div className="text-left">
                  <h2 className="text-xl font-medium text-black" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                    Exploring?
                  </h2>
                  <p className="text-md font-medium text-gray-400" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                    Spend 500 credits, get 500 free!
                  </p>
                </div>

                {/* Button on right */}
                <button className="bg-black text-white px-4 py-1.5 text-sm rounded-md hover:bg-gray-800 transition-colors font-medium shadow-md whitespace-nowrap" style={{ fontFamily: "'Mencken Std Narrow Regular', serif" }}>
                  Claim Offer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}