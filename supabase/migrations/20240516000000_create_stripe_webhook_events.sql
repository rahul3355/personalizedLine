create table if not exists public.stripe_webhook_events (
    event_id text primary key,
    event_type text,
    processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events
    add constraint stripe_webhook_events_event_id_unique unique (event_id);
