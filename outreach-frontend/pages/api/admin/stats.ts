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

        res.status(200).json({
            stats: {
                processing: processingCount || 0,
                queued: queuedCount || 0,
                failed24h: failedCount || 0,
                creditsBurned24h: creditsBurned,
            },
            recentFailed: recentFailed || [],
            recentJobs: recentJobs || [],
            recentUsers: recentUsers || [],
            recentTransactions: recentTransactions || [],
        });

    } catch (error: any) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
}
