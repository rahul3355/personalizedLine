import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PiCoinDuotone } from "react-icons/pi";
import Link from "next/link";

export default function WelcomeHeader() {
    const { userInfo } = useAuth();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const firstName = userInfo?.full_name?.split(" ")[0] || "there";

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-medium tracking-tight text-gray-900">
                    {getGreeting()}, {firstName}
                </h1>
                <p className="text-gray-500 mt-1">
                    Here's what's happening with your campaigns today.
                </p>
            </div>
            <Link href="/upload">
                <Button className="bg-black hover:bg-gray-800 text-white rounded-xl px-6 h-12 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-none">
                    <Plus className="w-5 h-5 mr-2" />
                    Generate All Emails
                    <div className="ml-3 bg-white rounded-full px-2 py-0.5 flex items-center gap-1.5 h-7">
                        <PiCoinDuotone className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs font-medium text-black">1 / row</span>
                    </div>
                </Button>
            </Link>
        </div>
    );
}
