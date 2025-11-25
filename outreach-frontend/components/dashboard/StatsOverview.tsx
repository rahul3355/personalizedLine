import { useAuth } from "@/lib/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, FileText, CreditCard } from "lucide-react";

export default function StatsOverview() {
    const { userInfo } = useAuth();

    const stats = [
        {
            title: "Credits Remaining",
            value: (userInfo?.credits_remaining || 0) + (userInfo?.addon_credits || 0),
            icon: Zap,
            description: "Available for use",
            iconColor: "text-[#4f55f1]",
        },
        {
            title: "Plan Status",
            value: userInfo?.user?.plan_type === "pro" ? "Pro Plan" : "Free Plan",
            icon: CreditCard,
            description: userInfo?.user?.subscription_status === "active" ? "Active" : "Inactive",
            iconColor: "text-black",
        },
        {
            title: "Files Processed",
            value: "View History",
            icon: FileText,
            description: "Check your past jobs",
            iconColor: "text-black",
            link: "/jobs"
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
            {stats.map((stat, index) => (
                <Card key={index} className="bg-white border border-gray-100 shadow-sm rounded-xl p-6">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-0 pt-0">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            {stat.title}
                        </CardTitle>
                        <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                    </CardHeader>
                    <CardContent className="px-0 pb-0">
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
