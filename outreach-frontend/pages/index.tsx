"use client"
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../lib/AuthProvider";
import InlineLoader from "@/components/InlineLoader";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import StatsOverview from "@/components/dashboard/StatsOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import OfferCard from "@/components/dashboard/OfferCard";
import { Button } from "@/components/ui/button";
import { Search, Plus, FileText, Clock, ChevronRight, Sparkles } from "lucide-react";
import SendItFastLogo from "../assets/senditfast-logo.png";

export default function Home() {
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
    const initial = firstName[0];

    return (
        <>
            {/* Desktop View (Unchanged) */}
            <div className="hidden lg:block relative min-h-[calc(100vh-170px)] overflow-hidden bg-white p-8 rounded-3xl lg:mr-4 shadow-sm">
                {/* Dot Pattern Background - Right Half Only */}
                <div className="absolute top-0 right-0 bottom-0 w-1/2 overflow-hidden pointer-events-none">
                    <DotPattern
                        width={20}
                        height={20}
                        cx={1}
                        cy={1}
                        cr={1}
                        className={cn(
                            "[mask-image:linear-gradient(to_left,white,transparent)]"
                        )}
                    />
                </div>

                <div className="relative z-10 mx-auto max-w-6xl pt-4">
                    <WelcomeHeader />

                    <StatsOverview />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                        {/* Main Content Area - Recent Activity */}
                        <div className="lg:col-span-2 min-h-[400px]">
                            <RecentActivity />
                        </div>

                        {/* Sidebar - Offer Card */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-8">
                                <OfferCard />
                            </div>
                        </div>
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
                            What would you like to research today?
                        </p>
                    </div>

                    {/* Primary Action - "Search Bar" Style Button */}
                    <Link href="/upload" className="block w-full">
                        <div className="group relative w-full bg-white border border-gray-200 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 p-4 flex items-center space-x-4 active:scale-[0.99]">
                            <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-500 group-hover:text-black transition-colors">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left">
                                <span className="block text-[15px] font-medium text-gray-900">Start New Project</span>
                                <span className="block text-[12px] text-gray-400">Upload a CSV to begin</span>
                            </div>
                            <div className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
                                <ChevronRight className="w-4 h-4" />
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
                                                        {job.filename}
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

Home.disableWhiteCard = true;