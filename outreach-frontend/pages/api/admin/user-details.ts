import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const ADMIN_SECRET = 'RAHUL987987';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authHeader = req.headers['x-admin-secret'];

    if (authHeader !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID required' });
    }

    try {
        // 1. Get Profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        // 2. Get Recent Jobs
        const { data: jobs, error: jobsError } = await supabaseAdmin
            .from('jobs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (jobsError) throw jobsError;

        // 3. Get Ledger (Last 10)
        const { data: ledger, error: ledgerError } = await supabaseAdmin
            .from('ledger')
            .select('*')
            .eq('user_id', userId)
            .order('ts', { ascending: false })
            .limit(10);

        res.status(200).json({
            profile,
            jobs,
            ledger: ledger || []
        });

    } catch (error: any) {
        console.error('User Details Error:', error);
        res.status(500).json({ error: error.message });
    }
}
