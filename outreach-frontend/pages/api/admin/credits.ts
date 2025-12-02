import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_SECRET = "RAHUL987987"; // Hardcoded for now as per existing pattern

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.headers['x-admin-secret'] !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, amount, reason } = req.body;

    if (!userId || !amount || !reason) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // 1. Get current profile to verify existence
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('credits_remaining')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: 'User not found' });
        }

        const newBalance = (profile.credits_remaining || 0) + amount;

        // 2. Update profile
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ credits_remaining: newBalance })
            .eq('id', userId);

        if (updateError) {
            throw updateError;
        }

        // 3. Add to ledger
        const { error: ledgerError } = await supabaseAdmin
            .from('ledger')
            .insert({
                user_id: userId,
                change: amount,
                reason: `Admin Adjustment: ${reason}`,
                meta: { admin_action: true, timestamp: new Date().toISOString() }
            });

        if (ledgerError) {
            console.error("Ledger insert failed but profile updated:", ledgerError);
            // Non-critical failure, but good to log
        }

        return res.status(200).json({ success: true, newBalance });

    } catch (error: any) {
        console.error("Credit adjustment failed:", error);
        return res.status(500).json({ error: error.message });
    }
}
