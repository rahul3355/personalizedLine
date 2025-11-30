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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
                <h1 className="text-4xl font-serif font-medium tracking-tight text-gray-900">
                    {getGreeting()}, {firstName}
                </h1>
                <p className="text-gray-500 mt-2 text-lg font-light">
                    Here's what's happening with your campaigns today.
                </p>
            </div>
            <Link href="/upload">
                <Button className="bg-black hover:bg-gray-800 text-white rounded-full px-8 h-12 transition-all hover:shadow-lg active:scale-[0.98] shadow-md text-[15px] font-medium">
                    <Plus className="w-5 h-5 mr-2" />
                    Start Generating Emails
                </Button>
            </Link>
        </div>
    );
}
