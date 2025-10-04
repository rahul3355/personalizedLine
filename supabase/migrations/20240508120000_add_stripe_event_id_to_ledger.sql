-- Add stripe_event_id column to ledger for webhook idempotency
ALTER TABLE public.ledger
    ADD COLUMN IF NOT EXISTS stripe_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS ledger_stripe_event_id_idx
    ON public.ledger (stripe_event_id)
    WHERE stripe_event_id IS NOT NULL;
