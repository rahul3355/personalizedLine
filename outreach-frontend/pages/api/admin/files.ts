import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const ADMIN_SECRET = 'RAHUL987987';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authHeader = req.headers['x-admin-secret'];

    if (authHeader !== ADMIN_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { range, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    try {
        let query = supabaseAdmin
            .from('jobs')
            .select('*, profiles:user_id(email)', { count: 'exact' });

        // Time Range Filter
        // Default to 'all' if not specified to ensure we see data initially
        if (range && range !== 'all') {
            const now = new Date();
            let startTime;
            switch (range) {
                case '24h':
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
            }
            if (startTime) {
                query = query.gt('created_at', startTime.toISOString());
            }
        }

        // Search Filter (Filename or Email)
        if (search) {
            // Note: This is a bit complex because we're searching across joined tables and JSON columns.
            // Supabase/PostgREST doesn't support OR across tables easily in one go without raw SQL or RPC.
            // For MVP, we'll try a best-effort approach or rely on client-side filtering if volume is low,
            // but for "Nvidia-level" we should do it right.
            // Let's assume we search mostly by filename (meta_json) or email.

            // Search in meta_json for file_path
            // query = query.ilike('meta_json->>file_path', `%${search}%`); 
            // The above syntax might vary based on PostgREST version.

            // Alternative: Use a text search vector if available, or simple ilike on known columns.
            // Since we joined profiles, we can filter by email.
            // query = query.ilike('profiles.email', `%${search}%`);

            // To do OR, we might need to construct a raw filter string.
            // `or=(meta_json->>file_path.ilike.*${search}*,profiles.email.ilike.*${search}*)`
            query = query.or(`meta_json->>file_path.ilike.%${search}%,profiles.email.ilike.%${search}%`);
        }

        // Ordering and Pagination
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limitNum - 1);

        const { data, count, error } = await query;

        if (error) throw error;

        // Calculate Metrics (Aggregates)
        // Note: For large datasets, running separate aggregate queries is better than calculating in-memory on paginated data.
        // We need aggregates for the *entire* filtered set, not just the page.

        // 1. Total Files (Count) -> Already got 'count' from query

        // 2. Total Rows Processed
        // We need a separate query for this sum if we want it to reflect the filters.
        // For MVP speed, we might skip dynamic aggregation on every keystroke or use a simplified approach.
        // Let's do a separate aggregate query for stats if range is provided.

        let stats = {
            totalFiles: count || 0,
            totalRows: 0,
            successRate: 0
        };

        // Only run heavy aggregates if not searching (to save DB load) or if explicitly requested
        // For now, let's just return the paginated data and total count.
        // We can add a "get_stats" flag later.

        res.status(200).json({
            data: data || [],
            meta: {
                total: count || 0,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil((count || 0) / limitNum)
            }
        });

    } catch (error: any) {
        console.error('Files API Error:', error);
        res.status(500).json({ error: error.message });
    }
}
