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
