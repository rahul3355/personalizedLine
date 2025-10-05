alter table if exists public.ledger
    add column if not exists external_id text;
