import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { ArrowRight, CheckCircle2, Clock3, XCircle, FileText } from "lucide-react";
import Link from "next/link";

interface Job {
    id: string;
    status: "pending" | "in_progress" | "succeeded" | "failed";
    filename: string;
    created_at: number | string;
}

function formatTimeAgo(timestamp: number | string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(seconds)) return "";

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) + " seconds ago";
}

function StatusPill({ status }: { status: Job["status"] }) {
    const visuals = {
        succeeded: {
            label: "Completed",
            icon: CheckCircle2,
            className: "bg-[#E4E5FF] text-[#4F55F1]",
        },
        failed: {
            label: "Failed",
            icon: XCircle,
            className: "bg-red-100 text-red-600",
        },
        in_progress: {
            label: "In Progress",
            icon: Clock3,
            className: "bg-gray-100 text-gray-600",
        },
        pending: {
            label: "Pending",
            icon: Clock3,
            className: "bg-gray-100 text-gray-600",
        },
    };

    const config = visuals[status] || visuals.pending;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
            <Icon className="w-3.5 h-3.5" />
            {config.label}
        </span>
    );
}

export default function RecentActivity() {
    const { session } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;

        const fetchRecentJobs = async () => {
            try {
                const res = await fetch(`${API_URL}/jobs?limit=5`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setJobs(data);
                }
            } catch (error) {
                console.error("Failed to fetch recent jobs", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentJobs();
    }, [session]);

    if (loading) {
        return (
            <Card className="bg-white border border-gray-100 shadow-sm rounded-xl h-full">
                <CardHeader className="p-6 pb-0">
                    <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white border border-gray-100 shadow-sm rounded-xl h-full overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
                <Link href="/jobs">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-black hover:bg-gray-100">
                        View All <ArrowRight className="ml-1 w-4 h-4" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="p-0">
                {jobs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No recent activity</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-gray-100">
                                <TableHead className="pl-6 text-gray-500 font-normal">File Name</TableHead>
                                <TableHead className="text-gray-500 font-normal">Status</TableHead>
                                <TableHead className="text-right pr-6 text-gray-500 font-normal">Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.map((job) => (
                                <TableRow
                                    key={job.id}
                                    className="hover:bg-gray-50/50 border-gray-100 cursor-pointer group"
                                    onClick={() => window.location.href = `/jobs?id=${job.id}`}
                                >
                                    <TableCell className="pl-6 font-medium text-gray-900 group-hover:text-[#4f55f1] transition-colors py-4">
                                        {job.filename}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <StatusPill status={job.status} />
                                    </TableCell>
                                    <TableCell className="text-right pr-6 text-gray-500 text-sm py-4">
                                        {formatTimeAgo(job.created_at)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
