-- 1. Check User Status & Creation Date
SELECT id, email, welcome_reward_status, created_at 
FROM profiles 
WHERE email = 'rahulrocks.amb@gmail.com';

-- 2. Check Ledger History (Credits Used)
SELECT * 
FROM ledger 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rahulrocks.amb@gmail.com') 
AND change < 0
ORDER BY ts DESC;

-- 3. Check if the RPC function exists and works
-- This should return the total credits used (positive integer)
SELECT get_total_credits_used((SELECT id FROM profiles WHERE email = 'rahulrocks.amb@gmail.com'));
