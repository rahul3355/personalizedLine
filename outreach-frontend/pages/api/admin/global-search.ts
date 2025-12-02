import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const ADMIN_SECRET = 'RAHUL987987';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authHeader = req.headers['x-admin-secret'];

    if (authHeader !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { query } = req.query;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query required' });
    }

    const searchTerm = query.trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

    try {
        // Parallelize queries for speed
        const userQuery = supabaseAdmin
            .from('profiles')
            .select('id, email, plan_type, credits_remaining, created_at')
            .limit(5);

        const jobQuery = supabaseAdmin
            .from('jobs')
            .select('id, status, created_at, rows_processed, user_id, meta_json, error')
            .order('created_at', { ascending: false })
            .limit(10);

        // Apply filters
        if (isUUID) {
            // If UUID, search ID fields directly
            userQuery.eq('id', searchTerm);
            jobQuery.eq('id', searchTerm);
        } else {
            // Text search
            userQuery.ilike('email', `%${searchTerm}%`);

            // For jobs, we search the meta_json for filenames or the ID if it partially matches (unlikely for UUIDs but good for safety)
            // Note: Supabase doesn't support easy deep JSON search with ilike on all fields, 
            // so we'll rely on a text cast or specific fields if known. 
            // For now, we'll search if the ID *contains* the text (rare) or if we can match metadata.
            // A better approach for jobs is usually ID or User ID. 
            // Let's try to find jobs by this user email first if it looks like an email.
            if (searchTerm.includes('@')) {
                const { data: user } = await supabaseAdmin.from('profiles').select('id').eq('email', searchTerm).single();
                if (user) {
                    jobQuery.eq('user_id', user.id);
                } else {
                    // If no user found, return empty jobs for this specific email query
                    jobQuery.eq('id', '00000000-0000-0000-0000-000000000000');
                }
            } else {
                // Generic text search on jobs is hard without full text search setup.
                // We will search for jobs where the input filename matches.
                // This requires the 'meta_json' ->> 'file_path' to be indexed or just ilike searched.
                // Syntax: meta_json->>'file_path' ilike '%query%'
                jobQuery.or(`meta_json->>file_path.ilike.%${searchTerm}%`);
            }
        }

        const [usersRes, jobsRes] = await Promise.all([userQuery, jobQuery]);

        res.status(200).json({
            users: usersRes.data || [],
            jobs: jobsRes.data || []
        });

    } catch (error: any) {
        console.error('Global Search Error:', error);
        res.status(500).json({ error: error.message });
    }
}
