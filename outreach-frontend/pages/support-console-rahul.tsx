import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
    Search,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Clock,
    CreditCard,
    User,
    ArrowLeft,
    Activity,
    FileText,
    UserPlus,
    Zap,
    X,
    Download,
    FileJson,
    ExternalLink
} from 'lucide-react';

// --- Types ---
type Job = {
    id: string;
    created_at: string;
    status: string;
    rows_processed: number;
    meta_json: any;
    error?: string;
    user_id?: string;
    result_path?: string;
};

type Profile = {
    id: string;
    email: string;
    credits_remaining: number;
    addon_credits: number;
    plan_type: string;
    subscription_status: string;
    created_at?: string;
};

type Stats = {
    processing: number;
    queued: number;
    failed24h: number;
    creditsBurned24h: number;
};

type DashboardData = {
    stats: Stats;
    recentFailed: Job[];
    recentJobs: Job[];
    recentUsers: Profile[];
};

type JobDetailsFull = {
    job: Job;
    inputUrl: string | null;
    outputUrl: string | null;
    serviceContext: any;
};

// --- Constants ---
const ADMIN_ID = "Rahul9";
const ADMIN_PASS = "RAHUL987987";

export default function SupportConsole() {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [inputId, setInputId] = useState("");
    const [inputPass, setInputPass] = useState("");

    // App State
    const [view, setView] = useState<'dashboard' | 'user'>('dashboard');
    const [data, setData] = useState<DashboardData | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userData, setUserData] = useState<{ profile: Profile; jobs: Job[]; ledger: any[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [jobDetails, setJobDetails] = useState<JobDetailsFull | null>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // --- Auth Handler ---
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputId === ADMIN_ID && inputPass === ADMIN_PASS) {
            setIsAuthenticated(true);
            fetchStats();
        } else {
            alert("Invalid Credentials");
        }
    };

    // --- Data Fetching ---
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats', {
                headers: { 'x-admin-secret': ADMIN_PASS }
            });
            const text = await res.text();
            try {
                const json = JSON.parse(text);
                if (json.stats) {
                    setData(json);
                    setLastRefreshed(new Date());
                }
            } catch (e) {
                console.error("Failed to parse stats JSON:", text.slice(0, 200));
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-refresh every 10s
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?query=${encodeURIComponent(searchQuery)}`, {
                headers: { 'x-admin-secret': ADMIN_PASS }
            });
            const json = await res.json();
            setSearchResults(json.users || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectUser = async (userId: string) => {
        setLoading(true);
        setSelectedUserId(userId);
        try {
            const res = await fetch(`/api/admin/user-details?userId=${userId}`, {
                headers: { 'x-admin-secret': ADMIN_PASS }
            });
            const json = await res.json();
            setUserData(json);
            setView('user');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async (jobId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation(); // Prevent drawer open
        if (!confirm("Are you sure you want to refund this job?")) return;
        setActionLoading(jobId);
        try {
            const res = await fetch('/api/admin/refund', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': ADMIN_PASS
                },
                body: JSON.stringify({ jobId, reason: 'Support Console Action' })
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Refunded ${json.refunded} credits.`);
                if (selectedUserId) selectUser(selectedUserId); // Refresh
                if (selectedJobId === jobId && jobDetails) {
                    // Refresh drawer if open
                    openJobDrawer(jobId);
                }
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert("Failed to refund");
        } finally {
            setActionLoading(null);
        }
    };

    const openJobDrawer = async (jobId: string) => {
        setSelectedJobId(jobId);
        setDrawerOpen(true);
        setDrawerLoading(true);
        setJobDetails(null);
        try {
            const res = await fetch(`/api/admin/job-details-full?jobId=${jobId}`, {
                headers: { 'x-admin-secret': ADMIN_PASS }
            });
            const text = await res.text();
            try {
                const json = JSON.parse(text);
                if (res.ok) {
                    setJobDetails(json);
                } else {
                    alert("Failed to fetch job details");
                    setDrawerOpen(false);
                }
            } catch (e) {
                console.error("Failed to parse job details JSON:", text.slice(0, 200));
                alert("Error: API returned invalid JSON");
                setDrawerOpen(false);
            }
        } catch (err) {
            console.error(err);
            alert("Error fetching details");
            setDrawerOpen(false);
        } finally {
            setDrawerLoading(false);
        }
    };

    // --- Render Helpers ---
    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            completed: 'bg-green-100 text-green-700 border-green-200',
            succeeded: 'bg-green-100 text-green-700 border-green-200',
            failed: 'bg-red-100 text-red-700 border-red-200',
            processing: 'bg-blue-100 text-blue-700 border-blue-200',
            queued: 'bg-gray-100 text-gray-700 border-gray-200',
        };
        const style = styles[status.toLowerCase()] || 'bg-gray-50 text-gray-600 border-gray-200';
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold border ${style}`}>
                {status}
            </span>
        );
    };

    const TimeAgo = ({ date }: { date: string }) => {
        const diff = (new Date().getTime() - new Date(date).getTime()) / 1000;
        let text = '';
        if (diff < 60) text = 'Just now';
        else if (diff < 3600) text = `${Math.floor(diff / 60)}m ago`;
        else if (diff < 86400) text = `${Math.floor(diff / 3600)}h ago`;
        else text = `${Math.floor(diff / 86400)}d ago`;
        return <span className="text-xs text-gray-400">{text}</span>;
    };

    // --- Views ---

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
                <Head><title>Support Console</title></Head>
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="h-12 w-12 bg-gray-900 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-xl shadow-gray-200">
                            <Activity className="text-white h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Support Console</h1>
                        <p className="text-gray-500 mt-2 text-sm">Restricted Access</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Admin ID"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                            value={inputId}
                            onChange={(e) => setInputId(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                            value={inputPass}
                            onChange={(e) => setInputPass(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-black transition-colors shadow-lg shadow-gray-200"
                        >
                            Access Console
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-purple-100 relative overflow-hidden">
            <Head><title>Support Console • Active</title></Head>

            {/* Top Bar */}
            <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
                            <Activity className="text-white h-4 w-4" />
                        </div>
                        <span className="font-semibold tracking-tight">Support Console</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Updated {lastRefreshed.toLocaleTimeString()}</span>
                        <button onClick={fetchStats} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">

                {view === 'dashboard' && data && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* 1. Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500 font-medium">Processing</div>
                                    <Activity className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{data.stats.processing}</div>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500 font-medium">Queued</div>
                                    <Clock className="h-4 w-4 text-gray-400" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{data.stats.queued}</div>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500 font-medium">Failed (24h)</div>
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{data.stats.failed24h}</div>
                            </div>
                            <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-500 font-medium">Credits Burned (24h)</div>
                                    <Zap className="h-4 w-4 text-purple-500" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900">{data.stats.creditsBurned24h.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* 2. Global Activity Feed (Left 2/3) */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">Live Activity</h2>
                                </div>

                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="divide-y divide-gray-50">
                                        {data.recentJobs.map(job => (
                                            <div
                                                key={job.id}
                                                onClick={() => openJobDrawer(job.id)}
                                                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                                            >
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${job.status === 'failed' ? 'bg-red-50 text-red-500' :
                                                    job.status === 'succeeded' ? 'bg-green-50 text-green-500' :
                                                        'bg-blue-50 text-blue-500'
                                                    }`}>
                                                    {job.status === 'failed' ? <AlertCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                                                            {job.status === 'failed' ? 'Job Failed' : 'Processed File'}
                                                        </span>
                                                        <StatusBadge status={job.status} />
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate flex items-center gap-2">
                                                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">{job.user_id?.slice(0, 8)}...</span>
                                                        <span>•</span>
                                                        <span>{job.rows_processed} rows</span>
                                                        {job.error && <span className="text-red-500">• {job.error}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <TimeAgo date={job.created_at} />
                                                    {job.meta_json?.credit_cost > 0 && (
                                                        <div className="text-xs font-medium text-gray-900 mt-1">
                                                            {job.meta_json.credit_cost} credits
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {data.recentJobs.length === 0 && (
                                            <div className="p-8 text-center text-gray-400">No recent activity</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Sidebar (Right 1/3) */}
                            <div className="space-y-8">

                                {/* Search Widget */}
                                <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl shadow-gray-200">
                                    <h3 className="text-lg font-semibold mb-4">Find User</h3>
                                    <form onSubmit={handleSearch} className="relative">
                                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Email or ID..."
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border-transparent focus:bg-gray-700 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white placeholder-gray-500"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </form>
                                    {searchResults.length > 0 ? (
                                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                            {searchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => selectUser(user.id)}
                                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-mono">
                                                        {user.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium truncate">{user.email}</div>
                                                        <div className="text-xs text-gray-400">{user.plan_type}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        searchQuery && !loading && (
                                            <div className="mt-4 text-center text-gray-500 text-sm py-4">
                                                No users found
                                            </div>
                                        )
                                    )}
                                    {loading && (
                                        <div className="mt-4 text-center text-gray-500 text-sm py-4">
                                            Searching...
                                        </div>
                                    )}
                                </div>

                                {/* Recent Signups */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">New Users</h3>
                                    <div className="space-y-3">
                                        {data.recentUsers.map(user => (
                                            <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-purple-200 transition-colors">
                                                <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                                    <UserPlus className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 truncate">{user.email}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <TimeAgo date={user.created_at || ''} />
                                                        <span>•</span>
                                                        <span className="capitalize">{user.plan_type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {view === 'user' && userData && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <button
                            onClick={() => setView('dashboard')}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </button>

                        {/* User Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                                    <User className="h-8 w-8 text-gray-400" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">{userData.profile.email}</h1>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">{userData.profile.id}</span>
                                        <span>•</span>
                                        <span className="capitalize px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{userData.profile.plan_type} Plan</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-8">
                                <div className="text-right">
                                    <div className="text-sm text-gray-500 mb-1">Monthly Credits</div>
                                    <div className="text-2xl font-semibold text-gray-900">{userData.profile.credits_remaining.toLocaleString()}</div>
                                </div>
                                <div className="text-right border-l border-gray-100 pl-8">
                                    <div className="text-sm text-gray-500 mb-1">Add-on Credits</div>
                                    <div className="text-2xl font-semibold text-purple-600">{userData.profile.addon_credits.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Jobs Table */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Created</th>
                                            <th className="px-6 py-3">Rows</th>
                                            <th className="px-6 py-3">Cost</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {userData.jobs.map(job => (
                                            <tr
                                                key={job.id}
                                                onClick={() => openJobDrawer(job.id)}
                                                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={job.status} />
                                                    {job.error && (
                                                        <div className="text-xs text-red-500 mt-1 max-w-xs truncate font-medium" title={job.error}>
                                                            {job.error}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {new Date(job.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {job.rows_processed}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {job.meta_json?.credit_cost || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {job.meta_json?.credit_cost > 0 && !job.meta_json?.credits_refunded && (
                                                        <button
                                                            onClick={(e) => handleRefund(job.id, e)}
                                                            disabled={actionLoading === job.id}
                                                            className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 border border-transparent hover:border-purple-100"
                                                        >
                                                            {actionLoading === job.id ? 'Refunding...' : 'Refund'}
                                                        </button>
                                                    )}
                                                    {job.meta_json?.credits_refunded && (
                                                        <span className="text-xs text-gray-400 italic flex items-center justify-end gap-1">
                                                            <CheckCircle className="h-3 w-3" /> Refunded
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {userData.jobs.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                    No jobs found for this user.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

            </main>

            {/* --- Job Details Drawer --- */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                        onClick={() => setDrawerOpen(false)}
                    />

                    {/* Panel */}
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-900">Job Details</h2>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {drawerLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-3">
                                    <RefreshCw className="h-6 w-6 animate-spin" />
                                    <span className="text-sm">Loading details...</span>
                                </div>
                            ) : jobDetails ? (
                                <>
                                    {/* Status Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <StatusBadge status={jobDetails.job.status} />
                                            <span className="text-sm text-gray-500">{new Date(jobDetails.job.created_at).toLocaleString()}</span>
                                        </div>
                                        {jobDetails.job.error && (
                                            <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                                                <div className="font-semibold mb-1 flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" /> Error Log
                                                </div>
                                                {jobDetails.job.error}
                                            </div>
                                        )}
                                    </div>

                                    {/* Files Section */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Files</h3>

                                        {/* Input File */}
                                        <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-between group hover:border-purple-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">Input File</div>
                                                    <div className="text-xs text-gray-500">{jobDetails.job.rows_processed} rows</div>
                                                </div>
                                            </div>
                                            {jobDetails.inputUrl ? (
                                                <a
                                                    href={jobDetails.inputUrl}
                                                    download
                                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                    title="Download Input"
                                                >
                                                    <Download className="h-5 w-5" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-400">Expired</span>
                                            )}
                                        </div>

                                        {/* Output File */}
                                        {jobDetails.job.status === 'succeeded' && (
                                            <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-between group hover:border-green-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">Result File</div>
                                                        <div className="text-xs text-gray-500">Final Output</div>
                                                    </div>
                                                </div>
                                                {jobDetails.outputUrl ? (
                                                    <a
                                                        href={jobDetails.outputUrl}
                                                        download
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Download Result"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Expired</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Context Section */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                            <FileJson className="h-4 w-4 text-gray-400" /> Service Context
                                        </h3>
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm font-mono text-gray-700 overflow-x-auto">
                                            <pre className="whitespace-pre-wrap">
                                                {JSON.stringify(jobDetails.serviceContext, null, 2)}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-6 border-t border-gray-100">
                                        {jobDetails.job.meta_json?.credit_cost > 0 && !jobDetails.job.meta_json?.credits_refunded ? (
                                            <button
                                                onClick={(e) => handleRefund(jobDetails.job.id, e as any)}
                                                disabled={actionLoading === jobDetails.job.id}
                                                className="w-full py-3 rounded-xl bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <RefreshCw className={`h-4 w-4 ${actionLoading === jobDetails.job.id ? 'animate-spin' : ''}`} />
                                                {actionLoading === jobDetails.job.id ? 'Refunding...' : 'Refund Credits'}
                                            </button>
                                        ) : jobDetails.job.meta_json?.credits_refunded ? (
                                            <div className="w-full py-3 rounded-xl bg-gray-50 text-gray-500 font-medium flex items-center justify-center gap-2 border border-gray-200">
                                                <CheckCircle className="h-4 w-4" /> Refunded
                                            </div>
                                        ) : null}
                                    </div>

                                </>
                            ) : (
                                <div className="text-center text-gray-500">Job not found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
