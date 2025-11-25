"use client"
import { useRouter } from "next/router";
import { useAuth } from "../lib/AuthProvider";
import { TrendingUp, Clock, CheckCircle2, ArrowRight, FileText, Download, Activity, Zap } from "lucide-react";
import InlineLoader from "@/components/InlineLoader";
import Link from "next/link";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { useRef } from "react";
import mailAnimation from "../assets/mail.json";
import archiveAnimation from "../assets/archive.json";

export default function Home() {
  const { session, loading, userInfo } = useAuth();
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

  const credits = (userInfo?.credits_remaining ?? 0) + (userInfo?.addon_credits ?? 0);
  const displayName = userInfo?.full_name ? userInfo.full_name.split(' ')[0] : 'there';

  // Mock data - in production, this would come from your API
  const stats = {
    jobsThisMonth: 247,
    successRate: 98,
    creditsUsed: 1240
  };

  const recentFiles = [
    { id: 1, name: "Q4_leads_batch_final.csv", status: "completed", date: "2 hours ago", rows: 1250 },
    { id: 2, name: "enterprise_contacts.xlsx", status: "processing", date: "5 hours ago", rows: 890, progress: 67 },
    { id: 3, name: "outreach_list_nov.csv", status: "completed", date: "1 day ago", rows: 2100 },
  ];

  const recentActivity = [
    { id: 1, text: "Q4_leads_batch_final.csv processed successfully", time: "2h ago", type: "success" },
    { id: 2, text: "New feature: Bulk export now available", time: "1d ago", type: "feature" },
    { id: 3, text: "You've saved 15 hours with automated enrichment", time: "2d ago", type: "insight" },
  ];

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

      <div className="relative z-10 mx-auto max-w-6xl space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">
            Welcome back, {displayName}!
          </h2>
          <p className="text-gray-500">Here's what's happening with your campaigns today.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Jobs This Month */}
          <div className="bg-gradient-to-br from-[#4f55f1]/5 to-[#4f55f1]/10 border-2 border-[#4f55f1]/20 rounded-2xl p-6 transition-all hover:border-[#4f55f1]/40">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-white rounded-lg">
                <TrendingUp className="h-5 w-5 text-[#4f55f1]" />
              </div>
              <span className="text-xs font-medium text-[#4f55f1] bg-[#4f55f1]/10 px-2 py-1 rounded-full">
                This month
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.jobsThisMonth}</p>
              <p className="text-sm text-gray-600">Jobs Processed</p>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-2xl p-6 transition-all hover:border-emerald-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-white rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-200 px-2 py-1 rounded-full">
                Success
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
              <p className="text-sm text-gray-600">Success Rate</p>
            </div>
          </div>

          {/* Credits Used */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-2xl p-6 transition-all hover:border-amber-300">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-white rounded-lg">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-amber-700 bg-amber-200 px-2 py-1 rounded-full">
                Usage
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{stats.creditsUsed.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Credits Used</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Primary Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary CTA - Upload */}
            <Link
              href="/upload"
              className="group relative block bg-gradient-to-br from-[#4f55f1] to-[#3d42d8] border-2 border-[#4f55f1] rounded-2xl p-8 transition-all hover:scale-[1.02]"
              onMouseEnter={() => lottieRef.current?.play()}
              onMouseLeave={() => lottieRef.current?.stop()}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <div className="h-10 w-10 transition-all grayscale-0">
                        <Lottie
                          lottieRef={lottieRef}
                          animationData={mailAnimation}
                          loop={true}
                          autoplay={false}
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Start New Campaign</h3>
                      <p className="text-[#e0e2ff] text-sm mt-1">
                        Upload your lead list and start generating personalized emails
                      </p>
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-6 w-6 text-white/80 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-4" />
              </div>
            </Link>

            {/* Recent Files */}
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
                <Link
                  href="/jobs"
                  className="text-sm font-medium text-[#4f55f1] hover:text-[#3d42d8] flex items-center gap-1 transition-colors"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="space-y-3">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#4f55f1]/30 transition-all group cursor-pointer"
                  >
                    <div className="p-2 bg-white rounded-lg border border-gray-200 group-hover:border-[#4f55f1]/30 transition-colors">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{file.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{file.rows.toLocaleString()} rows</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{file.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === "completed" ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </span>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Download className="h-4 w-4 text-gray-600" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#4f55f1] transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 min-w-[35px]">
                            {file.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Quick Actions */}
          <div className="space-y-6">
            {/* View Files Card */}
            <Link
              href="/jobs"
              className="group relative block bg-white border-2 border-gray-100 rounded-2xl p-6 transition-all hover:border-[#4f55f1]/40"
              onMouseEnter={() => {
                archiveLottieRef.current?.setSpeed(0.3);
                archiveLottieRef.current?.play();
              }}
              onMouseLeave={() => archiveLottieRef.current?.stop()}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-[#4f55f1]/5 transition-colors">
                    <div className="h-8 w-8 transition-all grayscale group-hover:grayscale-0">
                      <Lottie
                        lottieRef={archiveLottieRef}
                        animationData={archiveAnimation}
                        loop={true}
                        autoplay={false}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">View All Files</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Browse your processed files
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#4f55f1] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>

            {/* Recent Activity */}
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>

              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        activity.type === "success" && "bg-emerald-500",
                        activity.type === "feature" && "bg-[#4f55f1]",
                        activity.type === "insight" && "bg-amber-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {activity.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Tip */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-100 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Quick Tip</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Upload CSV files up to 10MB for optimal processing speed. Larger files are automatically queued.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}