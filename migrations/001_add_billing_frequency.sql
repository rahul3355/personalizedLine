-- Migration: Add billing_frequency column to profiles table
-- Date: 2025-11-28
-- Scenario 1: Track monthly vs annual billing

-- Add billing_frequency column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS billing_frequency TEXT
CHECK (billing_frequency IN ('monthly', 'annual', NULL));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_billing_frequency
ON profiles(billing_frequency)
WHERE billing_frequency IS NOT NULL;

-- Backfill existing active subscriptions as monthly
-- (Annual users will get correct value on next webhook event)
UPDATE profiles
SET billing_frequency = 'monthly'
WHERE plan_type IN ('starter', 'growth', 'pro')
  AND subscription_status = 'active'
  AND billing_frequency IS NULL;

-- Verification query
SELECT
    plan_type,
    billing_frequency,
    COUNT(*) as user_count
FROM profiles
WHERE subscription_status = 'active'
GROUP BY plan_type, billing_frequency
ORDER BY plan_type;
