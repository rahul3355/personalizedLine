"use client"
import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import InlineLoader from "@/components/InlineLoader";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn, truncateMiddle } from "@/lib/utils";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import StatsOverview from "@/components/dashboard/StatsOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { Button } from "@/components/ui/button";
import { Search, Plus, FileText, Clock, ChevronRight, Sparkles, ArrowRight, FileSpreadsheet } from "lucide-react";
import { PiCoinsDuotone } from "react-icons/pi";
import SendItFastLogo from "../assets/senditfast-logo.png";

export default function Dashboard() {
    const { session, loading, userInfo } = useAuth();

    // Mobile Data Fetching
    const [mobileJobs, setMobileJobs] = useState<any[]>([]);
    const [mobileLoading, setMobileLoading] = useState(true);

    useEffect(() => {
        if (!session) return;

        const fetchMobileJobs = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/jobs?limit=10`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setMobileJobs(data);
                }
            } catch (error) {
                console.error("Failed to fetch jobs", error);
            } finally {
                setMobileLoading(false);
            }
        };

        fetchMobileJobs();
    }, [session]);

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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const firstName = userInfo?.full_name?.split(" ")[0] || "there";

    return (
        <>
            <Head>
                <title>Dashboard | SendItFast.ai - AI Email Personalization</title>
                <meta name="description" content="Your SendItFast dashboard. Start generating personalized cold emails at scale." />
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            {/* Desktop View (Perplexity Style - Adapted for White Card) */}
            <div className="hidden lg:flex md:py-6 min-h-[calc(100vh-110px)] bg-white rounded-[32px] shadow-sm mr-4 flex-col items-center justify-center px-6 sm:px-8 lg:px-10">

                {/* Centered Content Container */}
                <div className="w-full max-w-2xl px-6 flex flex-col items-center">

                    {/* Greeting */}
                    <h1 className="text-4xl md:text-5xl font-serif font-medium text-gray-900 mb-4 text-center tracking-tight">
                        {getGreeting()}, {firstName}
                    </h1>

                    <p className="text-gray-400 text-lg mb-10 font-light tracking-wide">
                        A good day to send emails
                    </p>

                    {/* Main Action Input (Perplexity Style - Adapted to Mobile Button Look) */}
                    <Link href="/upload" className="w-full group">
                        <div className="group relative w-full bg-[#4F55F1]/10 border border-[#4F55F1] rounded-2xl transition-all duration-300 p-4 flex items-center space-x-4 active:scale-[0.99] hover:bg-[#4F55F1]/20 hover:border-black">
                            <div className="h-10 w-10 rounded-full bg-[#4F55F1] flex items-center justify-center flex-shrink-0 text-white group-hover:bg-transparent group-hover:text-black transition-all duration-300">
                                <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                            </div>
                            <div className="flex-1 text-left">
                                <span className="block text-[15px] font-medium text-gray-900">Start Generating Emails</span>
                                <span className="block text-[12px] text-gray-400">Upload a CSV to begin</span>
                            </div>
                        </div>
                    </Link>

                    {/* Quick Stats Row */}
                    <div className="flex items-center gap-8 mt-12 text-sm text-gray-400 font-medium">
                        <div className="group flex items-center gap-2 hover:text-[#4F55F1] transition-colors cursor-default">
                            <PiCoinsDuotone className="w-4 h-4 text-[#D4AF37] group-hover:text-[#4F55F1] transition-colors" />
                            <span>{(userInfo?.credits_remaining || 0) + (userInfo?.addon_credits || 0)} Credits</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                        <div className="hover:text-[#4F55F1] transition-colors cursor-default capitalize">
                            <span>{(userInfo?.user?.plan_type || "free").split('_')[0]} Plan</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                        <Link href="/jobs" className="group flex items-center gap-2 hover:text-[#4F55F1] transition-colors">
                            <FileSpreadsheet className="w-4 h-4 text-green-600 group-hover:text-[#4F55F1] transition-colors" />
                            <span>View History</span>
                        </Link>
                    </div>

                </div>
            </div>

            {/* Mobile View (Ground Up - Perplexity Style) */}
            <div className="lg:hidden min-h-screen bg-white overflow-x-hidden flex flex-col">


                {/* Main Scrollable Content */}
                <div className="flex-1 flex flex-col px-5 pt-12 pb-24 space-y-10">

                    {/* Hero & Greeting */}
                    <div className="text-center space-y-3">
                        <h1 className="text-3xl font-serif font-medium text-gray-900 tracking-tight">
                            {getGreeting()}, {firstName}
                        </h1>
                        <p className="text-gray-500 text-[15px] font-normal">
                            A good day to reach out
                        </p>
                    </div>

                    {/* Primary Action - "Search Bar" Style Button */}
                    <Link href="/upload" className="block w-full">
                        <div className="group relative w-full bg-[#4F55F1]/10 border border-[#4F55F1] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 p-4 flex items-center space-x-4 active:scale-[0.99] hover:bg-[#4F55F1]/20 hover:border-black">
                            <div className="h-10 w-10 rounded-full bg-[#4F55F1] flex items-center justify-center flex-shrink-0 text-white group-hover:bg-transparent group-hover:text-black transition-all duration-300">
                                <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                            </div>
                            <div className="flex-1 text-left">
                                <span className="block text-[15px] font-medium text-gray-900">Start Generating Emails</span>
                                <span className="block text-[12px] text-gray-400">Upload a CSV to begin</span>
                            </div>
                        </div>
                    </Link>

                    {/* Minimalist Stats Row */}
                    <div className="flex items-center justify-center divide-x divide-gray-100 py-2">
                        <div className="px-6 text-center">
                            <div className="text-lg font-semibold text-gray-900">
                                {(userInfo?.credits_remaining || 0) + (userInfo?.addon_credits || 0)}
                            </div>
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Credits</div>
                        </div>
                        <div className="px-6 text-center">
                            <div className="text-lg font-semibold text-gray-900 capitalize">
                                {(userInfo?.user?.plan_type || "free").split('_')[0]}
                            </div>
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Plan</div>
                        </div>
                        <div className="px-6 text-center">
                            <div className="text-lg font-semibold text-gray-900">
                                {mobileJobs.length > 0 ? mobileJobs.length + "+" : "0"}
                            </div>
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">Files</div>
                        </div>
                    </div>

                    {/* Recent Activity List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider">Recent Activity</h2>
                            <Link href="/jobs" className="text-[13px] font-medium text-gray-400 hover:text-gray-900 transition-colors">
                                View all
                            </Link>
                        </div>

                        <div className="space-y-0 divide-y divide-gray-50 border-t border-b border-gray-50">
                            {mobileLoading ? (
                                [1, 2, 3].map((i) => (
                                    <div key={i} className="py-4 flex items-center space-x-4 animate-pulse">
                                        <div className="h-8 w-8 bg-gray-100 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-24 bg-gray-100 rounded" />
                                            <div className="h-2 w-16 bg-gray-50 rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : mobileJobs.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-50 mb-3">
                                        <Sparkles className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500">No projects yet.</p>
                                </div>
                            ) : (
                                mobileJobs.map((job) => (
                                    <Link key={job.id} href={`/jobs?id=${job.id}`} className="block">
                                        <div className="group py-4 flex items-center justify-between active:bg-gray-50 transition-colors -mx-2 px-2 rounded-lg">
                                            <div className="flex items-center space-x-3.5 overflow-hidden">
                                                <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-900 transition-colors">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[14px] font-medium text-gray-900 truncate">
                                                        {truncateMiddle(job.filename, 20)}
                                                    </p>
                                                    <div className="flex items-center space-x-2 mt-0.5">
                                                        <span className="text-[11px] text-gray-400">
                                                            {new Date(job.created_at).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-[10px] text-gray-300">•</span>
                                                        <span className={`text-[10px] font-medium ${job.status === 'succeeded' ? 'text-green-600' :
                                                            job.status === 'failed' ? 'text-red-500' :
                                                                'text-blue-500'
                                                            }`}>
                                                            {job.status === 'succeeded' ? 'Completed' :
                                                                job.status === 'failed' ? 'Failed' : 'Processing'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0 ml-4" />
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.disableWhiteCard = true; 