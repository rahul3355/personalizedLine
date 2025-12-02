import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const ADMIN_SECRET = 'RAHUL987987';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers['x-admin-secret'];
    if (authHeader !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId, reason } = req.body;

    if (!jobId) {
        return res.status(400).json({ error: 'Job ID required' });
    }

    try {
        // 1. Fetch Job
        const { data: job, error: jobError } = await supabaseAdmin
            .from('jobs')
            .select('user_id, meta_json')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const meta = job.meta_json || {};

        // Check if already refunded
        if (meta.credits_refunded) {
            return res.status(400).json({ error: 'Already refunded' });
        }

        // Check cost
        const cost = meta.credit_cost;
        if (!cost || cost <= 0) {
            return res.status(400).json({ error: 'No credit cost found in job meta' });
        }

        const userId = job.user_id;

        // 2. Fetch Profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('credits_remaining, addon_credits')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // 3. Calculate Refund Breakdown
        // If breakdown exists in meta, use it. Else assume all monthly.
        // Note: The python code defaults to monthly if not specified.
        let monthlyRefund = meta.monthly_deducted || 0;
        let addonRefund = meta.addon_deducted || 0;

        if (monthlyRefund === 0 && addonRefund === 0) {
            monthlyRefund = cost;
        }

        const newMonthly = (profile.credits_remaining || 0) + monthlyRefund;
        const newAddon = (profile.addon_credits || 0) + addonRefund;

        // 4. Update Profile (Atomic-ish)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                credits_remaining: newMonthly,
                addon_credits: newAddon
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 5. Insert Ledger
        await supabaseAdmin.from('ledger').insert({
            user_id: userId,
            change: cost,
            amount: 0,
            reason: `job refund: ${jobId} ${reason ? '- ' + reason : ''} (via Console)`,
            ts: new Date().toISOString(),
        });

        // 6. Update Job Meta
        const newMeta = {
            ...meta,
            credits_refunded: true,
            refunded_at: new Date().toISOString()
        };

        await supabaseAdmin
            .from('jobs')
            .update({ meta_json: newMeta })
            .eq('id', jobId);

        res.status(200).json({ success: true, refunded: cost });

    } catch (error: any) {
        console.error('Refund Error:', error);
        res.status(500).json({ error: error.message });
    }
}
