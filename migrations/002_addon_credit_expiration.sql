-- Migration: Add addon credit expiration tracking
-- Date: 2025-11-28
-- Scenario 3: Track addon purchases with expiration dates

-- Create table to track each addon purchase separately
CREATE TABLE IF NOT EXISTS addon_credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Purchase details
    credits_purchased INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,
    price_paid DECIMAL(10,2) NOT NULL,

    -- Plan context at time of purchase
    purchased_under_plan TEXT NOT NULL,

    -- Expiration tracking
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    expired BOOLEAN DEFAULT FALSE,

    -- Stripe linkage
    stripe_payment_intent TEXT,
    stripe_checkout_session_id TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_addon_purchases_user
ON addon_credit_purchases(user_id);

CREATE INDEX idx_addon_purchases_expiry
ON addon_credit_purchases(expires_at)
WHERE NOT expired AND credits_remaining > 0;

CREATE INDEX idx_addon_purchases_user_active
ON addon_credit_purchases(user_id, expires_at)
WHERE NOT expired;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_addon_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_addon_purchases_updated_at
    BEFORE UPDATE ON addon_credit_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_addon_purchases_updated_at();

-- Migrate existing addon credits to new table
-- Expiry based on current plan: 6 months for Starter, 12 months for Growth/Pro
INSERT INTO addon_credit_purchases
    (user_id, credits_purchased, credits_remaining, price_paid,
     purchased_under_plan, purchased_at, expires_at)
SELECT
    id AS user_id,
    addon_credits AS credits_purchased,
    addon_credits AS credits_remaining,
    0 AS price_paid,
    plan_type AS purchased_under_plan,
    created_at AS purchased_at,
    CASE
        WHEN plan_type = 'starter' THEN NOW() + INTERVAL '6 months'
        ELSE NOW() + INTERVAL '12 months'
    END AS expires_at
FROM profiles
WHERE addon_credits > 0;

-- Verification query
SELECT
    p.email,
    p.plan_type,
    p.addon_credits AS old_addon_credits,
    acp.credits_remaining AS new_addon_credits,
    acp.expires_at,
    acp.purchased_under_plan
FROM profiles p
JOIN addon_credit_purchases acp ON acp.user_id = p.id
WHERE p.addon_credits > 0;
