"use client"
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { Sparkles, FileText } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";
import Link from "next/link";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

export default function Home() {
  const { session, loading } = useAuth();
  const router = useRouter();

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

      <div className="relative z-10 mx-auto max-w-5xl pt-20">
        <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-gray-100 md:grid-cols-2">
          {/* Generate Card */}
          <Link
            href="/upload"
            className="group relative flex flex-col justify-between border-b border-gray-100 bg-white p-8 transition-colors hover:bg-gray-50/50 md:border-b-0 md:border-r"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#4f55f1]" />
                <h3 className="text-lg font-medium text-gray-900">Generate</h3>
              </div>
              <p className="text-sm text-gray-500">
                Start generating emails by uploading lead list
              </p>
            </div>
          </Link>

          {/* View Files Card */}
          <Link
            href="/jobs"
            className="group relative flex flex-col justify-between bg-white p-8 transition-colors hover:bg-gray-50/50"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#4f55f1]" />
                <h3 className="text-lg font-medium text-gray-900">View Files</h3>
              </div>
              <p className="text-sm text-gray-500">
                View processed files
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}