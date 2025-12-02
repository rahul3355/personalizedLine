import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const ADMIN_SECRET = 'RAHUL987987';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authHeader = req.headers['x-admin-secret'];

    if (authHeader !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'Job ID required' });
    }

    try {
        // 1. Fetch Job
        const { data: job, error: jobError } = await supabaseAdmin
            .from('jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (jobError || !job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const meta = job.meta_json || {};
        const inputPath = meta.file_path;
        const resultPath = job.result_path;

        // 2. Generate Signed URLs
        let inputUrl = null;
        let outputUrl = null;

        if (inputPath) {
            const { data } = await supabaseAdmin
                .storage
                .from('inputs')
                .createSignedUrl(inputPath, 3600); // 1 hour
            inputUrl = data?.signedUrl;
        }

        if (resultPath) {
            const { data } = await supabaseAdmin
                .storage
                .from('outputs')
                .createSignedUrl(resultPath, 3600); // 1 hour
            outputUrl = data?.signedUrl;
        }

        // 3. Extract Service Context
        // Service can be a string (legacy) or an object (new structure)
        let serviceContext = meta.service;

        // If it's a JSON string, try to parse it for better display
        if (typeof serviceContext === 'string' && serviceContext.startsWith('{')) {
            try {
                serviceContext = JSON.parse(serviceContext);
            } catch (e) {
                // keep as string
            }
        }

        res.status(200).json({
            job,
            inputUrl,
            outputUrl,
            serviceContext
        });

    } catch (error: any) {
        console.error('Job Details Full Error:', error);
        res.status(500).json({ error: error.message });
    }
}
