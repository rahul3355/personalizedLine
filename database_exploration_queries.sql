-- ============================================================================
-- DATABASE EXPLORATION QUERIES
-- Run these in Supabase SQL Editor to understand your current system
-- ============================================================================

-- QUERY 1: Profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- QUERY 2: Jobs table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'jobs'
ORDER BY ordinal_position;

-- QUERY 3: Ledger table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ledger'
ORDER BY ordinal_position;

-- QUERY 4: Check if ledger table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'ledger'
) AS ledger_exists;

-- QUERY 5: Sample profile data (see current credit structure)
SELECT 
    id,
    email,
    plan_type,
    subscription_status,
    credits_remaining,
    max_credits,
    renewal_date,
    stripe_customer_id,
    stripe_subscription_id,
    created_at
FROM profiles
LIMIT 3;

-- QUERY 6: Sample ledger entries (if table exists)
SELECT 
    id,
    user_id,
    change,
    amount,
    reason,
    ts
FROM ledger
ORDER BY ts DESC
LIMIT 10;

-- QUERY 7: Check processed_stripe_events table
SELECT 
    event_id,
    event_type,
    processed_at
FROM processed_stripe_events
ORDER BY processed_at DESC
LIMIT 10;

-- QUERY 8: All tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- QUERY 9: User credit summary (how many users per plan)
SELECT 
    plan_type,
    subscription_status,
    COUNT(*) AS user_count,
    AVG(credits_remaining) AS avg_credits,
    SUM(credits_remaining) AS total_credits
FROM profiles
GROUP BY plan_type, subscription_status
ORDER BY plan_type;

-- QUERY 10: Recent job activity
SELECT 
    j.id,
    j.user_id,
    j.status,
    j.rows,
    j.rows_processed,
    j.created_at,
    j.finished_at,
    p.email,
    p.plan_type
FROM jobs j
LEFT JOIN profiles p ON j.user_id = p.id
ORDER BY j.created_at DESC
LIMIT 10;

-- QUERY 11: Check for addon_credits column (doesn't exist yet)
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'addon_credits'
) AS addon_credits_exists;

-- QUERY 12: Check for addon_purchases table (doesn't exist yet)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'addon_purchases'
) AS addon_purchases_table_exists;

