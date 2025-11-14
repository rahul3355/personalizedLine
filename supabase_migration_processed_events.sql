-- Migration: Create processed_stripe_events table for idempotency
-- This table tracks which Stripe webhook events have been processed
-- to prevent duplicate credit allocations

CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on event_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_event_id
ON processed_stripe_events(event_id);

-- Create index on processed_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
ON processed_stripe_events(processed_at);

-- Add comment
COMMENT ON TABLE processed_stripe_events IS 'Tracks processed Stripe webhook events to ensure idempotency';

-- ============================================================================
-- Function: Atomic credit increment
-- Prevents race conditions when multiple add-on purchases happen simultaneously
-- ============================================================================

-- Drop existing function if it has wrong signature
DROP FUNCTION IF EXISTS public.increment_credits(uuid, integer);

CREATE OR REPLACE FUNCTION public.increment_credits(
    user_id_param UUID,
    credit_amount INTEGER
)
RETURNS TABLE(
    id UUID,
    credits_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.profiles
    SET credits_remaining = COALESCE(credits_remaining, 0) + credit_amount
    WHERE profiles.id = user_id_param
    RETURNING profiles.id, profiles.credits_remaining;
END;
$$;

COMMENT ON FUNCTION public.increment_credits IS 'Atomically increments user credits to prevent race conditions';
