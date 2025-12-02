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
        return res.status(400).json({ error: 'Query parameter required' });
    }

    try {
        // Search by email or ID
        // Supabase doesn't support OR easily in one go with different columns in JS client without raw filter sometimes,
        // but .or() works.
        // Check if query is a valid UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

        let queryBuilder = supabaseAdmin
            .from('profiles')
            .select('*')
            .limit(20);

        if (isUUID) {
            queryBuilder = queryBuilder.or(`email.ilike.%${query}%,id.eq.${query}`);
        } else {
            queryBuilder = queryBuilder.ilike('email', `%${query}%`);
        }

        const { data: users, error } = await queryBuilder;

        if (error) throw error;

        res.status(200).json({ users });

    } catch (error: any) {
        console.error('Admin Search Error:', error);
        res.status(500).json({ error: error.message });
    }
}
