-- Atomic credit deduction helper for Supabase/Postgres
-- Ensures we only subtract credits when the user has enough remaining.
create or replace function public.deduct_credits(
    p_user_id uuid,
    p_amount integer
)
returns table(success boolean, credits_remaining integer)
language sql
security definer
set search_path = public
as $$
    update profiles
       set credits_remaining = credits_remaining - p_amount
     where id = p_user_id
       and credits_remaining >= p_amount
    returning true as success, credits_remaining;
$$;

grant execute on function public.deduct_credits(uuid, integer) to authenticated, service_role;
