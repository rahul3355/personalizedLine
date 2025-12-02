import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const ADMIN_SECRET = 'RAHUL987987';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authHeader = req.headers['x-admin-secret'];

    if (authHeader !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // 1. Get Queue Stats (Processing/Queued)
        const { count: processingCount } = await supabaseAdmin
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'processing');

        const { count: queuedCount } = await supabaseAdmin
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'queued');

        const { count: failedCount } = await supabaseAdmin
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed')
            .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // 2. Get Recent Failed Jobs
        const { data: recentFailed } = await supabaseAdmin
            .from('jobs')
            .select('id, created_at, status, error, user_id, meta_json')
            .eq('status', 'failed')
            .order('created_at', { ascending: false })
            .limit(10);

        // 3. Get Total Credits Used (24h) - Approximate via Ledger
        const { data: ledgerData } = await supabaseAdmin
            .from('ledger')
            .select('change')
            .lt('change', 0)
            .gt('ts', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const creditsBurned = ledgerData?.reduce((acc, curr) => acc + Math.abs(curr.change), 0) || 0;

        // 4. Get Recent Global Activity (Jobs)
        const { data: recentJobs } = await supabaseAdmin
            .from('jobs')
            .select('id, created_at, status, rows_processed, user_id, meta_json')
            .order('created_at', { ascending: false })
            .limit(15);

        // 5. Get Recent Signups
        const { data: recentUsers } = await supabaseAdmin
            .from('profiles')
            .select('id, email, created_at, plan_type')
            .order('created_at', { ascending: false })
            .limit(8);

        // 6. Get Recent Transactions (Ledger)
        const { data: recentTransactions } = await supabaseAdmin
            .from('ledger')
            .select('*')
            .order('ts', { ascending: false })
            .limit(15);

        // --- GOD MODE DATA ---

        // 7. Serper Stats
        let serperCredits = 0;
        try {
            const serperRes = await fetch(`https://google.serper.dev/account?apiKey=${process.env.SERPER_API_KEY}`);
            const serperJson = await serperRes.json();
            serperCredits = serperJson.credits || 0;
        } catch (e) {
            console.error("Failed to fetch Serper stats", e);
        }

        // 8. Whales (Top 10 by TOTAL credits)
        // Note: PostgREST doesn't support sorting by computed columns easily.
        // We'll fetch top 50 by base credits, then re-sort in memory with addons.
        const { data: rawWhales } = await supabaseAdmin
            .from('profiles')
            .select('id, email, credits_remaining, addon_credits, plan_type')
            .order('credits_remaining', { ascending: false })
            .limit(50);

        const whales = rawWhales
            ?.map(u => ({
                ...u,
                total_credits: (u.credits_remaining || 0) + (u.addon_credits || 0)
            }))
            .sort((a, b) => b.total_credits - a.total_credits)
            .slice(0, 10);

        // 9. Churn Risk (Inactive > 30 days & > 100 credits)
        // We'll fetch users created > 30 days ago and do some filtering in memory for MVP.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: potentialChurn } = await supabaseAdmin
            .from('profiles')
            .select('id, email, created_at, credits_remaining, addon_credits')
            .lt('created_at', thirtyDaysAgo.toISOString())
            .limit(100);

        const churnRisk = potentialChurn
            ?.filter(u => ((u.credits_remaining || 0) + (u.addon_credits || 0)) > 100)
            .slice(0, 10);

        // 10. Revenue/Usage Chart Data (Last 30 days ledger)
        const { data: ledgerHistory } = await supabaseAdmin
            .from('ledger')
            .select('change, ts')
            .gte('ts', thirtyDaysAgo.toISOString())
            .order('ts', { ascending: true })
            .limit(1000);

        // 11. General Info (Total Users & Total System Credits)
        // Fallback: Fetch all IDs and count them (inefficient but reliable if count property fails)
        const { data: allUserIds, error: userCountError } = await supabaseAdmin
            .from('profiles')
            .select('id');

        const totalUsers = allUserIds?.length || 0;

        if (userCountError) console.error("Total Users Error:", userCountError);

        // Calculate total system credits (base + addon)
        const { data: allProfiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('credits_remaining, addon_credits');

        if (profilesError) console.error("System Credits Error:", profilesError);

        const totalSystemCredits = allProfiles?.reduce((acc, curr) => {
            const base = curr.credits_remaining || 0;
            const addon = curr.addon_credits || 0;
            return acc + base + addon;
        }, 0) || 0;

        res.status(200).json({
            stats: {
                processing: processingCount || 0,
                queued: queuedCount || 0,
                failed24h: failedCount || 0,
                creditsBurned24h: creditsBurned,
                serperCredits, // New
            },
            recentFailed: recentFailed || [],
            recentJobs: recentJobs || [],
            recentUsers: recentUsers || [],
            recentTransactions: recentTransactions || [],
            whales: whales || [], // New
            churnRisk: churnRisk || [], // New
            ledgerHistory: ledgerHistory || [], // New
            totalUsers: totalUsers || 0, // New
            totalSystemCredits, // New
        });

    } catch (error: any) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
}
