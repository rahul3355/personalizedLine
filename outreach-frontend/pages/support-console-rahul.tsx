import React, { useState, useEffect, useRef } from 'react';
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
    ExternalLink,
    Command,
    ChevronRight,
    Copy,
    DollarSign
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

type Transaction = {
    id: string;
    user_id: string;
    change: number;
    reason: string;
    ts: string;
    meta?: any;
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
    recentTransactions: Transaction[];
};

type JobDetailsFull = {
    job: Job;
    inputUrl: string | null;
    outputUrl: string | null;
    serviceContext: any;
};

type UserDetailsFull = {
    profile: Profile;
    jobs: Job[];
    ledger: Transaction[];
};

type SearchResults = {
    users: Profile[];
    jobs: Job[];
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
    const [data, setData] = useState<DashboardData | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerType, setDrawerType] = useState<'job' | 'user' | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [jobDetails, setJobDetails] = useState<JobDetailsFull | null>(null);
    const [userDetails, setUserDetails] = useState<UserDetailsFull | null>(null);

    const [drawerLoading, setDrawerLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'raw' | 'logs' | 'jobs' | 'ledger'>('overview');

    // Column Filters
    const [userFilter, setUserFilter] = useState("");
    const [jobFilter, setJobFilter] = useState("");
    const [txFilter, setTxFilter] = useState("");

    // God Mode State
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditAmount, setCreditAmount] = useState(0);
    const [creditReason, setCreditReason] = useState("");
    const [bannerText, setBannerText] = useState("");

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

    // --- Global Search ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const res = await fetch(`/api/admin/global-search?query=${encodeURIComponent(searchQuery)}`, {
                        headers: { 'x-admin-secret': ADMIN_PASS }
                    });
                    const json = await res.json();
                    setSearchResults(json);
                } catch (error) {
                    console.error("Search failed", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults(null);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);


    const handleRefund = async (jobId: string) => {
        if (!confirm("Are you sure you want to refund this job?")) return;
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
                if (selectedId === jobId) openJobDrawer(jobId); // Refresh drawer
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert("Failed to refund");
        }
    };

    const handleAdjustCredits = async () => {
        if (!selectedId || !creditAmount || !creditReason) return;
        if (!confirm(`Are you sure you want to ${creditAmount > 0 ? 'add' : 'remove'} ${Math.abs(creditAmount)} credits?`)) return;

        try {
            const res = await fetch('/api/admin/credits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': ADMIN_PASS
                },
                body: JSON.stringify({ userId: selectedId, amount: creditAmount, reason: creditReason })
            });
            const json = await res.json();
            if (res.ok) {
                alert(`Success! New Balance: ${json.newBalance}`);
                setShowCreditModal(false);
                setCreditAmount(0);
                setCreditReason("");
                openUserDrawer(selectedId); // Refresh drawer
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert("Failed to adjust credits");
        }
    };

    const openJobDrawer = async (jobId: string) => {
        setSelectedId(jobId);
        setDrawerType('job');
        setDrawerOpen(true);
        setDrawerLoading(true);
        setJobDetails(null);
        setActiveTab('overview');
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

    const openUserDrawer = async (userId: string) => {
        setSelectedId(userId);
        setDrawerType('user');
        setDrawerOpen(true);
        setDrawerLoading(true);
        setUserDetails(null);
        setActiveTab('overview');
        try {
            const res = await fetch(`/api/admin/user-details?userId=${userId}`, {
                headers: { 'x-admin-secret': ADMIN_PASS }
            });
            const json = await res.json();
            setUserDetails(json);
        } catch (err) {
            console.error(err);
            alert("Error fetching user details");
            setDrawerOpen(false);
        } finally {
            setDrawerLoading(false);
        }
    };

    // --- Render Helpers ---
    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            completed: 'bg-green-50 text-green-700 border-green-200',
            succeeded: 'bg-green-50 text-green-700 border-green-200',
            failed: 'bg-red-50 text-red-700 border-red-200',
            processing: 'bg-blue-50 text-blue-700 border-blue-200',
            queued: 'bg-gray-50 text-gray-700 border-gray-200',
        };
        const style = styles[status.toLowerCase()] || 'bg-gray-50 text-gray-600 border-gray-200';
        return (
            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-semibold border ${style}`}>
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

    // Filtered Data
    const filteredUsers = data?.recentUsers.filter(u =>
        u.email.toLowerCase().includes(userFilter.toLowerCase()) ||
        u.id.includes(userFilter)
    ) || [];

    const filteredJobs = data?.recentJobs.filter(j =>
        j.id.includes(jobFilter) ||
        (j.meta_json?.file_path || '').toLowerCase().includes(jobFilter.toLowerCase()) ||
        (j.user_id || '').toLowerCase().includes(jobFilter.toLowerCase())
    ) || [];

    const filteredTx = data?.recentTransactions.filter(tx =>
        tx.reason.toLowerCase().includes(txFilter.toLowerCase()) ||
        tx.user_id.includes(txFilter) ||
        (tx.change.toString().includes(txFilter))
    ) || [];

    // --- Views ---

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
                <Head><title>Support Console</title></Head>
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="h-12 w-12 bg-black rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-gray-200">
                            <Activity className="text-white h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">System Admin</h1>
                        <p className="text-gray-500 mt-2 text-sm">Restricted Access</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Admin ID"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                            value={inputId}
                            onChange={(e) => setInputId(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                            value={inputPass}
                            onChange={(e) => setInputPass(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-900 transition-colors shadow-lg shadow-gray-200"
                        >
                            Access Console
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-gray-100 relative">
            <Head><title>Control Panel • Active</title></Head>

            {/* --- Top Bar --- */}
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-gray-200 z-30">
                <div className="w-full px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center">
                                <Activity className="text-white h-4 w-4" />
                            </div>
                            <span className="font-semibold tracking-tight">Control Panel</span>
                        </div>

                        {/* Global Search Bar */}
                        <div className="relative w-96 group">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
                            <input
                                type="text"
                                placeholder="Search Users, Jobs, Files..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-gray-300 rounded-lg text-sm outline-none transition-all border"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {/* Search Results Dropdown */}
                            {searchResults && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden text-left animate-in fade-in slide-in-from-top-2 z-50">
                                    {searchResults.users.length === 0 && searchResults.jobs.length === 0 && (
                                        <div className="p-4 text-center text-gray-500 text-sm">No results found.</div>
                                    )}

                                    {searchResults.users.length > 0 && (
                                        <div className="border-b border-gray-50">
                                            <div className="px-4 py-2 bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Users</div>
                                            {searchResults.users.map(user => (
                                                <div key={user.id} onClick={() => { setSearchQuery(''); openUserDrawer(user.id); }} className="p-3 hover:bg-gray-50 flex items-center justify-between cursor-pointer group transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">
                                                            {user.email[0].toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-sm text-gray-900 truncate">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchResults.jobs.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jobs</div>
                                            {searchResults.jobs.map(job => (
                                                <div
                                                    key={job.id}
                                                    onClick={() => { setSearchQuery(''); openJobDrawer(job.id); }}
                                                    className="p-3 hover:bg-gray-50 flex items-center justify-between cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-4 w-4 text-gray-400" />
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-sm text-gray-900 truncate max-w-[200px]">
                                                                {job.meta_json?.file_path?.split('/').pop() || 'Unknown File'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        {/* System Banner Input */}
                        <div className="hidden md:flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Set System Banner..."
                                className="bg-transparent border-b border-gray-300 focus:border-black outline-none text-xs w-32 transition-all"
                                value={bannerText}
                                onChange={(e) => setBannerText(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-medium text-gray-700">System Operational</span>
                        </div>
                        <button onClick={fetchStats} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {bannerText && (
                    <div className="bg-yellow-50 border-b border-yellow-100 py-1 text-center text-xs font-medium text-yellow-800">
                        📢 System Banner: {bannerText}
                    </div>
                )}
            </header>

            <main className="w-full px-6 pt-24 pb-20">

                {/* --- Business Intelligence Row --- */}
                {data && (data as any).whales && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Whales */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                <DollarSign className="h-4 w-4 text-purple-500" />
                                Whales (Top Users)
                            </h3>
                            <div className="space-y-3">
                                {(data as any).whales.map((user: any) => (
                                    <div key={user.id} onClick={() => openUserDrawer(user.id)} className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <span className="truncate max-w-[150px]">{user.email}</span>
                                        <span className="font-mono font-bold">{user.credits_remaining.toLocaleString()} cr</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Churn Risk */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                Churn Risk (Inactive)
                            </h3>
                            <div className="space-y-3">
                                {(data as any).churnRisk.map((user: any) => (
                                    <div key={user.id} onClick={() => openUserDrawer(user.id)} className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                        <span className="truncate max-w-[150px]">{user.email}</span>
                                        <span className="text-xs text-gray-400"><TimeAgo date={user.created_at} /></span>
                                    </div>
                                ))}
                                {(data as any).churnRisk.length === 0 && <div className="text-gray-400 text-xs">No users at risk.</div>}
                            </div>
                        </div>

                        {/* Revenue/Usage Chart (Mocked Visual for now) */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                <Activity className="h-4 w-4 text-blue-500" />
                                30-Day Activity Pulse
                            </h3>
                            <div className="flex-1 flex items-end gap-1 h-32 border-b border-gray-100 pb-2">
                                {/* Simple visualization of ledger history */}
                                {(data as any).ledgerHistory?.slice(-30).map((item: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-t-sm ${item.change > 0 ? 'bg-green-400' : 'bg-blue-400'}`}
                                        style={{ height: `${Math.min(Math.abs(item.change) / 100, 100)}%` }}
                                        title={`${new Date(item.ts).toLocaleDateString()}: ${item.change}`}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-2">
                                <span>30 days ago</span>
                                <span>Today</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Main Dashboard Grid --- */}
                {data && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)]">

                        {/* Column 1: New Users */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <UserPlus className="h-4 w-4 text-gray-500" />
                                        New Users
                                    </h3>
                                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{filteredUsers.length}</span>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter users..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all"
                                        value={userFilter}
                                        onChange={(e) => setUserFilter(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => openUserDrawer(user.id)}
                                        className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="font-medium text-sm text-gray-900 truncate max-w-[180px]">{user.email}</div>
                                            <span className="text-[10px] text-gray-400"><TimeAgo date={user.created_at || ''} /></span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="capitalize">{user.plan_type} Plan</span>
                                            <span className="font-mono">{user.credits_remaining} cr</span>
                                        </div>
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="p-8 text-center text-gray-400 text-xs">No users found</div>
                                )}
                            </div>
                        </div>

                        {/* Column 2: Live Activity (Jobs) */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-gray-500" />
                                        Live Jobs
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter jobs..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all"
                                        value={jobFilter}
                                        onChange={(e) => setJobFilter(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredJobs.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => openJobDrawer(job.id)}
                                        className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group flex items-start gap-3"
                                    >
                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${job.status === 'failed' ? 'bg-red-500' :
                                            job.status === 'succeeded' ? 'bg-green-500' : 'bg-blue-500'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-sm font-medium text-gray-900 truncate" title={job.meta_json?.file_path || ''}>
                                                    {job.meta_json?.file_path?.split('/').pop() || (job.status === 'failed' ? 'Job Failed' : 'Processed File')}
                                                </div>
                                                <span className="text-[10px] text-gray-400"><TimeAgo date={job.created_at} /></span>
                                            </div>
                                            <div className="text-xs text-gray-500 truncate mb-1 font-mono" title={`Job ID: ${job.id}`}>
                                                {job.id}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-gray-400 font-mono">{job.rows_processed} rows</span>
                                                <StatusBadge status={job.status} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredJobs.length === 0 && (
                                    <div className="p-8 text-center text-gray-400 text-xs">No jobs found</div>
                                )}
                            </div>
                        </div>

                        {/* Column 3: Recent Transactions */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-gray-500" />
                                        Transactions
                                    </h3>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter transactions..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-all"
                                        value={txFilter}
                                        onChange={(e) => setTxFilter(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {filteredTx.map(tx => (
                                    <div
                                        key={tx.id}
                                        onClick={() => openUserDrawer(tx.user_id)}
                                        className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className={`text-sm font-bold ${tx.change > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                {tx.change > 0 ? '+' : ''}{tx.change} Credits
                                            </div>
                                            <span className="text-[10px] text-gray-400"><TimeAgo date={tx.ts} /></span>
                                        </div>
                                        <div className="text-xs text-gray-500 truncate mb-1">
                                            {tx.reason}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono truncate">
                                            {tx.user_id}
                                        </div>
                                    </div>
                                ))}
                                {filteredTx.length === 0 && (
                                    <div className="p-8 text-center text-gray-400 text-xs">No transactions found</div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

            </main>

            {/* --- Inspector Drawer --- */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-white/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setDrawerOpen(false)}
                    />

                    <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200">

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 capitalize">{drawerType} Inspector</h2>
                                <p className="text-sm text-gray-500 font-mono mt-1">{selectedId}</p>
                            </div>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 px-6">
                            {drawerType === 'job' && ['overview', 'raw', 'logs'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                        ? 'border-black text-black'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                            {drawerType === 'user' && ['overview', 'jobs', 'ledger'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                        ? 'border-black text-black'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            {drawerLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-3">
                                    <RefreshCw className="h-6 w-6 animate-spin" />
                                    <span className="text-sm">Loading details...</span>
                                </div>
                            ) : (
                                <>
                                    {/* --- JOB DRAWER CONTENT --- */}
                                    {drawerType === 'job' && jobDetails && (
                                        <>
                                            {activeTab === 'overview' && (
                                                <div className="space-y-6">
                                                    {/* Status Card */}
                                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <span className="text-sm text-gray-500 font-medium">Status</span>
                                                            <StatusBadge status={jobDetails.job.status} />
                                                        </div>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <span className="text-sm text-gray-500 font-medium">Created</span>
                                                            <span className="text-sm text-gray-900">{new Date(jobDetails.job.created_at).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-gray-500 font-medium">Cost</span>
                                                            <span className="text-sm text-gray-900 font-semibold">{jobDetails.job.meta_json?.credit_cost || 0} Credits</span>
                                                        </div>
                                                    </div>

                                                    {/* Files */}
                                                    <div className="space-y-3">
                                                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Artifacts</h3>
                                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <FileText className="h-5 w-5 text-blue-500" />
                                                                    <span className="text-sm font-medium text-gray-900">Input File</span>
                                                                </div>
                                                                {jobDetails.inputUrl ? (
                                                                    <a href={jobDetails.inputUrl} download className="text-sm text-blue-600 hover:underline">Download</a>
                                                                ) : <span className="text-xs text-gray-400">Expired</span>}
                                                            </div>
                                                            {jobDetails.job.status === 'succeeded' && (
                                                                <div className="p-4 flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <FileText className="h-5 w-5 text-green-500" />
                                                                        <span className="text-sm font-medium text-gray-900">Result File</span>
                                                                    </div>
                                                                    {jobDetails.outputUrl ? (
                                                                        <a href={jobDetails.outputUrl} download className="text-sm text-green-600 hover:underline">Download</a>
                                                                    ) : <span className="text-xs text-gray-400">Expired</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="pt-6">
                                                        <button
                                                            onClick={() => handleRefund(jobDetails.job.id)}
                                                            className="w-full py-3 bg-white border border-gray-200 text-red-600 font-medium rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm"
                                                        >
                                                            Refund Job Credits
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'raw' && (
                                                <div className="bg-white rounded-xl border border-gray-200 p-4 font-mono text-xs overflow-x-auto">
                                                    <pre>{JSON.stringify(jobDetails.job, null, 2)}</pre>
                                                </div>
                                            )}

                                            {activeTab === 'logs' && (
                                                <div className="space-y-4">
                                                    {jobDetails.job.error ? (
                                                        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-mono whitespace-pre-wrap">
                                                            {jobDetails.job.error}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-400">
                                                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                                            No errors found.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* --- USER DRAWER CONTENT --- */}
                                    {drawerType === 'user' && userDetails && (
                                        <>
                                            {activeTab === 'overview' && (
                                                <div className="space-y-6">
                                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <span className="text-sm text-gray-500 font-medium">Email</span>
                                                            <span className="text-sm text-gray-900 font-medium">{userDetails.profile.email}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <span className="text-sm text-gray-500 font-medium">Plan</span>
                                                            <span className="text-sm text-gray-900 capitalize">{userDetails.profile.plan_type}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Credits</div>
                                                                <div className="text-xl font-bold text-gray-900">{userDetails.profile.credits_remaining.toLocaleString()}</div>
                                                            </div>
                                                            <button
                                                                onClick={() => setShowCreditModal(true)}
                                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                                                            >
                                                                Adjust
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Credit Adjustment Modal */}
                                                    {showCreditModal && (
                                                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[60]">
                                                            <div className="bg-white rounded-xl shadow-2xl p-6 w-80 border border-gray-200 animate-in zoom-in-95 duration-200">
                                                                <h3 className="font-semibold text-gray-900 mb-4">Adjust Credits</h3>
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <label className="text-xs font-medium text-gray-500 block mb-1">Amount (+/-)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-all"
                                                                            placeholder="e.g. 100 or -50"
                                                                            value={creditAmount}
                                                                            onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-medium text-gray-500 block mb-1">Reason</label>
                                                                        <input
                                                                            type="text"
                                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-all"
                                                                            placeholder="e.g. Refund for job #123"
                                                                            value={creditReason}
                                                                            onChange={(e) => setCreditReason(e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-2 pt-2">
                                                                        <button
                                                                            onClick={() => setShowCreditModal(false)}
                                                                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={handleAdjustCredits}
                                                                            className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
                                                                        >
                                                                            Confirm
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeTab === 'jobs' && (
                                                <div className="space-y-2">
                                                    {userDetails.jobs.map(job => (
                                                        <div key={job.id} onClick={() => openJobDrawer(job.id)} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <StatusBadge status={job.status} />
                                                                <span className="text-xs text-gray-400"><TimeAgo date={job.created_at} /></span>
                                                            </div>
                                                            <div className="text-xs font-mono text-gray-500 truncate">{job.id}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {activeTab === 'ledger' && (
                                                <div className="space-y-2">
                                                    {userDetails.ledger.map(tx => (
                                                        <div key={tx.id} className="bg-white p-4 rounded-xl border border-gray-200">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className={`text-sm font-bold ${tx.change > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                                    {tx.change > 0 ? '+' : ''}{tx.change}
                                                                </span>
                                                                <span className="text-xs text-gray-400"><TimeAgo date={tx.ts} /></span>
                                                            </div>
                                                            <div className="text-xs text-gray-500">{tx.reason}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
