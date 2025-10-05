create table if not exists public.job_ledger_events (
    job_id uuid not null,
    event_type text not null,
    ledger_id uuid,
    created_at timestamptz not null default now(),
    constraint job_ledger_events_pkey primary key (job_id, event_type)
);
