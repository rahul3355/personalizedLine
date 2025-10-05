begin;

-- Drop the unused job_ledger_events table introduced in earlier migrations.
drop table if exists public.job_ledger_events;

-- Ensure ledger entries that provide idempotency have a unique external_id.
create unique index if not exists ledger_external_id_key
    on public.ledger(external_id)
    where external_id is not null;

commit;
