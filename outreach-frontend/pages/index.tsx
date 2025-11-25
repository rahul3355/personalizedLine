"use client"
import { useAuth } from "../lib/AuthProvider";
import InlineLoader from "@/components/InlineLoader";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import WelcomeHeader from "@/components/dashboard/WelcomeHeader";
import StatsOverview from "@/components/dashboard/StatsOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import OfferCard from "@/components/dashboard/OfferCard";

export default function Home() {
    const { session, loading } = useAuth();

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
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
    );
}