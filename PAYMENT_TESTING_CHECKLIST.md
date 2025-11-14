# FINAL PAYMENT SYSTEM TEST CHECKLIST
## Before Production Deployment

Run ALL these tests in Stripe TEST MODE before switching to production keys.

---

## ✅ Database Setup (CRITICAL - Do First!)

```sql
-- Run this in Supabase SQL Editor
-- Copy from: supabase_migration_processed_events.sql

CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_event_id
ON processed_stripe_events(event_id);

CREATE OR REPLACE FUNCTION public.increment_credits(
    user_id_param UUID,
    credit_amount INTEGER
)
RETURNS TABLE(id UUID, credits_remaining INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.profiles
    SET credits_remaining = COALESCE(credits_remaining, 0) + credit_amount
    WHERE profiles.id = user_id_param
    RETURNING profiles.id, profiles.credits_remaining;
END;
$$;
```

---

## 📋 Test Scenarios

### TEST 1: New Subscription Purchase ✅

**Steps:**
1. Log in as test user
2. Go to billing page
3. Select "Starter" plan
4. Use test card: `4242 4242 4242 4242`
5. Complete purchase

**Expected Results:**
- [ ] Redirects to success page with confetti
- [ ] User credits set to 2,000
- [ ] `subscription_status` = "active"
- [ ] `plan_type` = "starter"
- [ ] Ledger shows ONE entry: "plan purchase - starter"
- [ ] `processed_stripe_events` has 1 entry (checkout.session.completed)
- [ ] NO duplicate from invoice.paid

**Check Logs:**
```
[PLAN] user=xxx, plan=starter, credits=2000
[INVOICE] Skipping subscription_create invoice
```

---

### TEST 2: Add-on Credit Purchase ✅

**Steps:**
1. Note current credit balance (e.g., 1,500)
2. Buy 1,000 add-on credits
3. Use test card: `4242 4242 4242 4242`

**Expected Results:**
- [ ] Credits ADDED to existing (1,500 + 1,000 = 2,500)
- [ ] Ledger shows "addon purchase x1"
- [ ] Old balance preserved + new credits

**Check Logs:**
```
[ADDON] user=xxx, qty=1, credits=1000
OR
[WARNING] RPC increment_credits failed, using fallback
```

**If you see fallback warning:** Run the `increment_credits()` SQL function (migration missed)

---

### TEST 3: Failed Payment Handling ✅

**Steps:**
1. Try to purchase subscription
2. Use declining test card: `4000 0000 0000 0341`

**Expected Results:**
- [ ] Payment fails
- [ ] NO credits added
- [ ] User remains on current plan
- [ ] Event marked as processed

**Check Logs:**
```
[WARNING] Payment not verified for event evt_xxx
```

---

### TEST 4: Duplicate Webhook Protection ✅

**Steps:**
1. Complete any purchase
2. Go to Stripe Dashboard → Webhooks
3. Find the checkout.session.completed event
4. Click "Resend"

**Expected Results:**
- [ ] Second webhook is rejected
- [ ] NO duplicate credits
- [ ] Logs show idempotency message

**Check Logs:**
```
[IDEMPOTENCY] Event evt_xxx already processed, skipping
```

**Verify Database:**
```sql
SELECT * FROM processed_stripe_events WHERE event_id = 'evt_xxx';
-- Should show only 1 row
```

---

### TEST 5: Monthly Renewal (Requires Time Advancement) ⚠️

**Option A: Use Stripe Test Clocks (Recommended)**
1. Create a test clock in Stripe Dashboard
2. Create subscription with test clock
3. Advance clock by 1 month
4. Check webhook fired

**Option B: Wait for Test Renewal**
(Skip this if time-sensitive)

**Expected Results:**
- [ ] Credits RESET to plan amount (not added)
- [ ] Ledger shows "monthly renewal - starter"
- [ ] Previous unused credits lost (as designed)

**Check Logs:**
```
[RENEWAL] user=xxx, plan=starter, credits_reset_to=2000, reason=subscription_cycle
```

**Example:**
- Before renewal: 500 credits remaining
- After renewal: 2,000 credits (RESET, not 2,500)

---

### TEST 6: Plan Upgrade ✅

**Steps:**
1. Subscribe to "Starter" (2,000 credits)
2. Use some credits (e.g., down to 1,500)
3. Upgrade to "Pro" (25,000 credits)

**Expected Results:**
- [ ] Credits immediately jump to 25,000
- [ ] `plan_type` = "pro"
- [ ] Ledger shows "plan change - pro"
- [ ] Prorated charge processed

**Check Logs:**
```
[UPGRADE/DOWNGRADE] starter → pro
[RENEWAL] user=xxx, plan=pro, credits_reset_to=25000, reason=subscription_update
```

---

### TEST 7: Plan Downgrade ✅

**Steps:**
1. Subscribe to "Pro" (25,000 credits)
2. Downgrade to "Starter" (2,000 credits)

**Expected Results:**
- [ ] Credits drop to 2,000 (lose excess 23,000)
- [ ] `plan_type` = "starter"
- [ ] Ledger shows "plan change - starter"

**WARNING:** User loses excess credits. This is by design (monthly reset policy).

**Check Logs:**
```
[UPGRADE/DOWNGRADE] pro → starter
[RENEWAL] user=xxx, plan=starter, credits_reset_to=2000
```

---

### TEST 8: Subscription Cancellation ✅

**Steps:**
1. Have active subscription
2. Cancel in Stripe Dashboard (don't wait for period end)
3. Check webhook processed

**Expected Results:**
- [ ] `subscription_status` = "canceled"
- [ ] `plan_type` = "free"
- [ ] Existing credits PRESERVED
- [ ] User can still use remaining credits

**Check Logs:**
```
[CANCELED] user=xxx, subscription=sub_xxx
```

---

### TEST 9: Missing user_id Validation ✅

**Steps:** (Advanced - requires Stripe Dashboard access)
1. Create checkout session manually via Stripe API
2. Omit `user_id` from metadata
3. Complete payment

**Expected Results:**
- [ ] Webhook logs error
- [ ] NO credits allocated
- [ ] Event marked as processed
- [ ] System doesn't crash

**Check Logs:**
```
[ERROR] No user_id in checkout.session.completed metadata for event evt_xxx
```

---

### TEST 10: Invalid Plan Validation ✅

**Steps:** (Advanced)
1. Create checkout session with plan not in CREDITS_MAP
2. E.g., metadata: `{"plan": "enterprise"}`

**Expected Results:**
- [ ] Webhook logs error
- [ ] NO credits allocated
- [ ] Event marked as processed

**Check Logs:**
```
[ERROR] Invalid plan 'enterprise' in checkout.session.completed
```

---

### TEST 11: Concurrent Add-on Purchases (Race Condition Test) ✅

**Steps:** (Advanced - requires scripting)
1. Create script to buy 2 add-ons simultaneously
2. Or manually click purchase twice very quickly

**Expected Results:**
- [ ] BOTH purchases processed correctly
- [ ] NO credits lost
- [ ] Atomic increment works (or fallback)

**If Using RPC:**
```
[DB:increment_addon_credits] ...
```

**If Using Fallback:**
```
[WARNING] RPC increment_credits failed, using fallback
[DB:update_addon_credits] ...
```

**Verify Math:**
Starting: 1,000 credits
Purchase 1: +1,000 = 2,000
Purchase 2: +1,000 = 3,000
Final: 3,000 ✅

---

### TEST 12: Stripe API Failure Handling ✅

**Steps:** (Advanced - requires network manipulation)
1. Block Stripe API temporarily
2. Try to create checkout session

**Expected Results:**
- [ ] Error message shown to user
- [ ] System doesn't crash
- [ ] Graceful error handling

**Check Logs:**
```
[ERROR] Failed to create Stripe customer for user xxx: ...
```

---

## 🔍 Post-Test Verification

### Database Checks

```sql
-- 1. Check idempotency table has entries
SELECT COUNT(*) FROM processed_stripe_events;
-- Should have: # of webhook events processed

-- 2. Check no duplicate ledger entries
SELECT user_id, reason, COUNT(*) as count
FROM ledger
GROUP BY user_id, reason
HAVING COUNT(*) > 1;
-- Should be empty (no duplicates)

-- 3. Check user credits match expected
SELECT id, email, credits_remaining, plan_type, subscription_status
FROM profiles
WHERE id = 'your-test-user-id';

-- 4. View ledger history
SELECT * FROM ledger
WHERE user_id = 'your-test-user-id'
ORDER BY ts DESC;
```

### Log Checks

```bash
kubectl logs -f deployment/web -n personalizedline --tail=500 | grep -E "\[PLAN\]|\[ADDON\]|\[RENEWAL\]|\[CANCELED\]|\[ERROR\]|\[WARNING\]"
```

Look for:
- ✅ No ERROR messages (except test scenarios)
- ✅ All purchases logged
- ✅ Idempotency working
- ✅ Payment verification working

---

## ⚠️ Critical Issues to Watch

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Duplicate credits on first purchase** | Ledger has 2 entries for same purchase | Should be fixed (subscription_create skipped) |
| **Credits not reset monthly** | Credits keep adding each month | Should be fixed (invoice.paid handler) |
| **Race condition on add-ons** | Concurrent purchases lose credits | Should be fixed (atomic increment) |
| **Failed payments grant credits** | Failed card gets credits | Should be fixed (payment verification) |
| **Duplicate webhooks** | Same event processed twice | Should be fixed (idempotency table) |
| **Missing user_id crashes** | Webhook fails silently | Should be fixed (user_id validation) |

---

## 🚀 Production Deployment Checklist

Only proceed if ALL tests above pass:

- [ ] ✅ All 12 test scenarios pass
- [ ] ✅ Database migration applied (processed_stripe_events + increment_credits)
- [ ] ✅ No ERROR logs (except expected test scenarios)
- [ ] ✅ Idempotency working correctly
- [ ] ✅ Credits calculating correctly
- [ ] ✅ Ledger entries look correct
- [ ] ✅ No duplicate entries

**Then and only then:**

1. Switch to production Stripe keys in `k8s/secrets.yaml`
2. Create production webhook in Stripe Dashboard
3. Update webhook secret
4. Deploy to GKE: `kubectl rollout restart deployment/web -n personalizedline`
5. Update Vercel with production keys
6. Test with SMALL real payment first (cheapest plan)
7. Monitor logs closely for first 24 hours

---

## 📞 Troubleshooting

**Problem: increment_credits RPC not found**
```
[WARNING] RPC increment_credits failed
```
**Solution:** Run the increment_credits() function from migration SQL

**Problem: processed_stripe_events table doesn't exist**
```
[IDEMPOTENCY] Error checking event
```
**Solution:** Run the CREATE TABLE from migration SQL

**Problem: Duplicate credits on first purchase**
Check ledger - if you see 2 entries for same subscription, the subscription_create skip isn't working.
Review logs for `[INVOICE] Skipping subscription_create`

**Problem: Monthly renewal not working**
Enable Stripe test clocks to test properly, or wait for first real renewal.

---

## ✅ Sign-off

Test completed by: ________________

Date: ________________

All tests passed: YES / NO

Issues found: ________________

Ready for production: YES / NO

---

**CRITICAL:** Do NOT skip any tests. Payment bugs in production = lost revenue and angry customers.
