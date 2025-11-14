# 🧪 COMPLETE END-TO-END PAYMENT TESTING GUIDE

**Mode**: Stripe TEST MODE
**Purpose**: Verify all payment scenarios work before production
**Time Required**: 2-3 hours
**Prerequisites**: Stripe test mode configured, backend deployed, database migration complete

---

## 🎯 Testing Philosophy

**Test EVERYTHING before production.** One missed bug = lost money or angry customers.

Each test follows this format:
1. **Scenario** - What you're testing
2. **Setup** - What you need first
3. **Steps** - Exact actions to take
4. **Expected Result** - What should happen
5. **Verification** - How to confirm it worked
6. **Rollback** - How to reset for next test

---

## 📋 Pre-Test Setup

### 1. Verify Test Mode

**Check Stripe Dashboard:**
- Top-left should show "Test mode" toggle ON
- URL should contain `/test/`

**Check Backend Logs:**
```bash
kubectl logs -f deployment/web -n personalizedline --tail=100
```

**Check Your Keys:**
- Stripe Publishable Key starts with `pk_test_`
- Stripe Secret Key starts with `sk_test_`

### 2. Get Test Cards

Stripe provides these test cards:

| Card Number | Purpose |
|-------------|---------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Payment declined (insufficient funds) |
| `4000 0000 0000 0341` | Card declined (charge fails) |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

**For all test cards:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

### 3. Create Test User Account

1. Sign up at your app: https://senditfast.ai
2. Use a test email (e.g., `test1@example.com`)
3. Note the user ID from database or logs

### 4. Prepare Verification Tools

**Database Access:**
```sql
-- Have these queries ready in Supabase SQL Editor

-- Check user profile
SELECT id, email, credits_remaining, plan_type, subscription_status, renewal_date
FROM profiles
WHERE email = 'test1@example.com';

-- Check ledger history
SELECT user_id, change, amount, reason, ts
FROM ledger
WHERE user_id = 'YOUR-USER-ID'
ORDER BY ts DESC;

-- Check processed events
SELECT event_id, event_type, processed_at
FROM processed_stripe_events
ORDER BY processed_at DESC
LIMIT 20;
```

**Log Monitoring:**
```bash
# In a separate terminal, keep this running
kubectl logs -f deployment/web -n personalizedline --tail=50 | grep -E "\[PLAN\]|\[ADDON\]|\[RENEWAL\]|\[CANCELED\]|\[ERROR\]|\[WARNING\]|\[IDEMPOTENCY\]"
```

---

## 🧪 TEST 1: New Subscription Purchase (Starter Plan)

### Scenario
User purchases their first paid subscription (Starter plan - 2,000 credits)

### Setup
- User signed up and has 500 free credits
- No active subscription

### Steps

1. **Log in** to your app as test user
2. **Go to Billing page** (`/billing`)
3. **Select "Starter" plan** ($10/month or whatever your price is)
4. **Click "Subscribe"**
5. **Enter test card**: `4242 4242 4242 4242`
6. **Complete checkout**
7. **Wait for redirect** to success page

### Expected Result

**Frontend:**
- ✅ Redirects to `/billing/success`
- ✅ Purple confetti animation appears
- ✅ "Payment successful!" message displayed
- ✅ After 3 seconds, redirects to home page

**Backend Logs:**
```
[EVENT] checkout.session.completed id=evt_xxx
[PLAN] user=xxx, plan=starter, credits=2000, renewal=xxx
[INVOICE] Skipping subscription_create invoice (already handled by checkout)
```

**Database Changes:**
```sql
-- Run this query
SELECT credits_remaining, plan_type, subscription_status
FROM profiles
WHERE email = 'test1@example.com';
```

**Should show:**
- `credits_remaining`: 2000
- `plan_type`: starter
- `subscription_status`: active

```sql
-- Check ledger
SELECT change, amount, reason FROM ledger
WHERE user_id = 'YOUR-USER-ID'
ORDER BY ts DESC LIMIT 1;
```

**Should show:**
- `change`: 2000
- `amount`: 10.00 (or your price)
- `reason`: "plan purchase - starter"

### Verification Checklist

- [ ] Credits changed from 500 to 2000
- [ ] plan_type = "starter"
- [ ] subscription_status = "active"
- [ ] Ledger has ONE entry "plan purchase - starter"
- [ ] No duplicate entry (no second "subscription_create" entry)
- [ ] processed_stripe_events has 1 entry for checkout.session.completed
- [ ] Confetti appeared on success page
- [ ] Redirected to home after 3 seconds

### Common Issues

❌ **If credits didn't change:**
- Check logs for errors
- Verify webhook is configured in Stripe Dashboard
- Check `processed_stripe_events` table exists

❌ **If you see duplicate ledger entries:**
- Bug: subscription_create invoice not being skipped
- Check logs for "[INVOICE] Skipping subscription_create"

### Rollback
```sql
-- Reset for next test
UPDATE profiles
SET credits_remaining = 500, plan_type = 'free', subscription_status = 'inactive'
WHERE email = 'test1@example.com';

DELETE FROM ledger WHERE user_id = 'YOUR-USER-ID';
DELETE FROM processed_stripe_events;
```

---

## 🧪 TEST 2: Add-on Credits Purchase

### Scenario
User buys 1,000 add-on credits while on free plan

### Setup
- User has 500 credits (or any amount - note the number)
- No active subscription

### Steps

1. **Note current credits** (e.g., 500)
2. **Go to** `/add-on-credits` page
3. **Select quantity**: 1 (for 1,000 credits)
4. **Click "Buy Credits"**
5. **Enter test card**: `4242 4242 4242 4242`
6. **Complete checkout**

### Expected Result

**Backend Logs:**
```
[EVENT] checkout.session.completed id=evt_xxx
[ADDON] user=xxx, qty=1, credits=1000, customer=cus_xxx
```

OR if atomic function is working:
```
[DB:increment_addon_credits] ...
```

OR if fallback is used:
```
[WARNING] RPC increment_credits failed, using fallback
[DB:update_addon_credits] ...
```

**Database:**
```sql
SELECT credits_remaining FROM profiles WHERE email = 'test1@example.com';
```

**Should show:**
- Previous credits + 1000 (e.g., 500 + 1000 = 1500)

```sql
SELECT change, reason FROM ledger
WHERE user_id = 'YOUR-USER-ID'
ORDER BY ts DESC LIMIT 1;
```

**Should show:**
- `change`: 1000
- `reason`: "addon purchase x1"

### Verification Checklist

- [ ] Credits increased by exactly 1,000
- [ ] plan_type still "free" (unchanged)
- [ ] subscription_status still "inactive" (unchanged)
- [ ] Ledger shows "addon purchase x1"
- [ ] No errors in logs

### Math Verification

**Before**: 500 credits
**Purchase**: +1,000 credits
**After**: 1,500 credits ✅

### Common Issues

❌ **If you see "[WARNING] RPC increment_credits failed":**
- This is OK! Fallback will work
- But better to fix: Verify migration SQL ran correctly
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'increment_credits';`

### Rollback
```sql
UPDATE profiles
SET credits_remaining = 500
WHERE email = 'test1@example.com';

DELETE FROM ledger WHERE reason LIKE 'addon%';
```

---

## 🧪 TEST 3: Failed Payment (Card Declined)

### Scenario
User tries to buy subscription but payment fails

### Setup
- User on free plan with 500 credits

### Steps

1. **Go to Billing page**
2. **Select "Starter" plan**
3. **Click "Subscribe"**
4. **Enter declining card**: `4000 0000 0000 0341`
5. **Try to complete checkout**

### Expected Result

**Stripe Checkout:**
- ❌ Payment fails with "Your card was declined"
- User remains on checkout page or redirected back

**Backend Logs:**
```
[EVENT] checkout.session.completed id=evt_xxx
[WARNING] Payment not verified for event evt_xxx, skipping credit allocation
```

**Database:**
```sql
SELECT credits_remaining, plan_type, subscription_status
FROM profiles
WHERE email = 'test1@example.com';
```

**Should show (NO CHANGES):**
- `credits_remaining`: 500 (unchanged)
- `plan_type`: free (unchanged)
- `subscription_status`: inactive (unchanged)

```sql
SELECT COUNT(*) FROM ledger WHERE user_id = 'YOUR-USER-ID';
```

**Should return:** 0 (no ledger entry created)

### Verification Checklist

- [ ] Payment declined at Stripe
- [ ] Credits remain 500 (unchanged)
- [ ] plan_type remains "free"
- [ ] No ledger entry created
- [ ] Logs show "Payment not verified"
- [ ] Event still marked as processed (in processed_stripe_events)

### Why This Matters

**If failed payment granted credits = YOU LOSE MONEY**

This test confirms payment verification is working correctly.

---

## 🧪 TEST 4: Duplicate Webhook (Idempotency Test)

### Scenario
Stripe sends the same webhook twice (retry scenario)

### Setup
- Complete a successful purchase first (Test 1 or 2)

### Steps

1. **Complete a purchase** (any type)
2. **Note the credits** after purchase
3. **Go to Stripe Dashboard** → Webhooks
4. **Find the webhook endpoint** (`https://api.senditfast.ai/stripe-webhook`)
5. **Click on it** → View events
6. **Find the checkout.session.completed event** from your purchase
7. **Click "..." menu** → "Resend event"
8. **Wait 5 seconds**

### Expected Result

**Backend Logs:**
```
[EVENT] checkout.session.completed id=evt_xxx
[IDEMPOTENCY] Event evt_xxx already processed, skipping
```

**Database:**
```sql
SELECT credits_remaining FROM profiles WHERE email = 'test1@example.com';
```

**Should show (NO CHANGE):**
- Credits remain the same (not doubled)

```sql
SELECT COUNT(*) FROM ledger
WHERE user_id = 'YOUR-USER-ID' AND reason = 'plan purchase - starter';
```

**Should return:** 1 (only one entry, not two)

```sql
SELECT COUNT(*) FROM processed_stripe_events
WHERE event_id = 'evt_xxx';
```

**Should return:** 1 (event recorded only once)

### Verification Checklist

- [ ] Second webhook was received
- [ ] Logs show "already processed, skipping"
- [ ] Credits did NOT increase
- [ ] Ledger has only ONE entry (not duplicated)
- [ ] processed_stripe_events table has only one row for this event

### Why This Matters

**Without idempotency:**
- User pays once → Gets 2000 credits
- Stripe retries webhook → User gets another 2000 credits
- **You just gave away 2000 free credits ($10+ value)**

This test confirms you won't lose money on webhook retries.

---

## 🧪 TEST 5: Monthly Renewal (CRITICAL - Use Test Clocks)

### Scenario
User's subscription renews after 1 month - credits should RESET

### Setup
This requires **Stripe Test Clocks** (special feature for time travel)

### Steps (Detailed)

#### Part A: Create Test Clock

1. **Go to Stripe Dashboard** → Test Clocks
2. **Click "Create test clock"**
3. **Set name**: "Monthly Renewal Test"
4. **Set start time**: Today's date at 00:00
5. **Click "Create"**

#### Part B: Create Subscription with Test Clock

1. **In your app**, log in as test user
2. **Before subscribing**, modify the checkout to use test clock:

   **Option 1: Via Stripe Dashboard**
   - Don't use your app's checkout
   - Instead: Stripe Dashboard → Customers → Create customer
   - Email: test-clock@example.com
   - Click customer → Subscriptions → Create subscription
   - Select your Starter plan price
   - **Important**: Click "Additional options" → Test clock → Select your test clock
   - Create subscription

   **Option 2: Via API (Advanced)**
   - You'd need to modify your backend temporarily to include test_clock parameter
   - Not recommended for quick testing

2. **Note the subscription ID** (e.g., `sub_xxxxx`)

#### Part C: Verify Initial State

```sql
-- Check initial credits
SELECT credits_remaining, plan_type, renewal_date
FROM profiles
WHERE email = 'test-clock@example.com';
```

**Should show:**
- `credits_remaining`: 2000
- `plan_type`: starter
- `renewal_date`: (some future timestamp)

#### Part D: Use Some Credits

```sql
-- Simulate using credits
UPDATE profiles
SET credits_remaining = 500
WHERE email = 'test-clock@example.com';
```

**User now has**: 500 credits remaining

#### Part E: Advance Test Clock

1. **Go to Stripe Dashboard** → Test Clocks
2. **Click your test clock**
3. **Click "Advance time"**
4. **Advance by**: 1 month and 1 hour
5. **Click "Advance"**
6. **Wait 30 seconds** for webhook to fire

#### Part F: Check Results

**Backend Logs:**
```
[EVENT] invoice.paid id=evt_xxx
[RENEWAL] user=xxx, plan=starter, credits_reset_to=2000, amount=$10.00, reason=subscription_cycle
```

**Database:**
```sql
SELECT credits_remaining FROM profiles WHERE email = 'test-clock@example.com';
```

**Should show:**
- `credits_remaining`: 2000 (RESET, not 2500)

```sql
SELECT change, reason FROM ledger
WHERE user_id = 'YOUR-USER-ID'
ORDER BY ts DESC LIMIT 1;
```

**Should show:**
- `change`: 2000
- `reason`: "monthly renewal - starter"

### Verification Checklist

- [ ] invoice.paid event fired
- [ ] Credits RESET to 2000 (not added to 500)
- [ ] Logs show "reason=subscription_cycle"
- [ ] Ledger shows "monthly renewal - starter"
- [ ] User charged correct amount
- [ ] NOT seeing "Skipping subscription_create"

### Expected Behavior

**Before renewal**: 500 credits remaining
**After renewal**: 2,000 credits (not 2,500) ✅

**This confirms**: Monthly reset policy working correctly

### Common Issues

❌ **If credits show 2,500:**
- BUG: Credits are being ADDED instead of RESET
- Check code: Line should be `credits_remaining: monthly_credits` not `+ monthly_credits`

❌ **If no invoice.paid event:**
- Check test clock advanced correctly
- Check webhook endpoint is receiving events
- Check billing_reason in Stripe Dashboard

### Cleanup

```sql
DELETE FROM profiles WHERE email = 'test-clock@example.com';
DELETE FROM ledger WHERE user_id = 'test-clock-user-id';
```

---

## 🧪 TEST 6: Plan Upgrade (Starter → Pro)

### Scenario
User on Starter plan upgrades to Pro plan mid-cycle

### Setup
- User has active Starter subscription
- User has 500 credits remaining (used 1,500 of 2,000)

### Steps

1. **Ensure user on Starter** with 500 credits
2. **Go to Billing page**
3. **Click "Upgrade to Pro"** (or manage subscription in Stripe)
4. **Complete upgrade**

   **In Stripe Dashboard:**
   - Go to customer → Subscription
   - Click "Update subscription"
   - Change to Pro plan price
   - Click "Update subscription"
   - Stripe will create prorated invoice

5. **Wait for webhook** (5-10 seconds)

### Expected Result

**Backend Logs:**
```
[EVENT] invoice.paid id=evt_xxx
[UPGRADE/DOWNGRADE] starter → pro
[RENEWAL] user=xxx, plan=pro, credits_reset_to=25000, amount=$XX.XX, reason=subscription_update
```

**Database:**
```sql
SELECT credits_remaining, plan_type FROM profiles WHERE email = 'test1@example.com';
```

**Should show:**
- `credits_remaining`: 25000 (immediately)
- `plan_type`: pro

```sql
SELECT change, reason FROM ledger WHERE user_id = 'YOUR-USER-ID' ORDER BY ts DESC LIMIT 1;
```

**Should show:**
- `change`: 25000
- `reason`: "plan change - pro"

### Verification Checklist

- [ ] Credits jumped from 500 to 25,000
- [ ] plan_type changed to "pro"
- [ ] Logs show "UPGRADE/DOWNGRADE starter → pro"
- [ ] Ledger reason is "plan change - pro"
- [ ] Prorated invoice charged correctly

### Expected Behavior

**Before**: 500 credits, Starter plan
**After**: 25,000 credits, Pro plan ✅

User gets immediate access to Pro credits.

---

## 🧪 TEST 7: Plan Downgrade (Pro → Starter)

### Scenario
User on Pro plan downgrades to Starter

### Setup
- User has active Pro subscription
- User has 20,000 credits remaining

### Steps

1. **Ensure user on Pro** with 20,000 credits
2. **In Stripe Dashboard:**
   - Go to customer → Subscription
   - Click "Update subscription"
   - Change to Starter plan price
   - Click "Update subscription"
3. **Wait for webhook**

### Expected Result

**Backend Logs:**
```
[EVENT] invoice.paid id=evt_xxx
[UPGRADE/DOWNGRADE] pro → starter
[RENEWAL] user=xxx, plan=starter, credits_reset_to=2000, reason=subscription_update
```

**Database:**
```sql
SELECT credits_remaining, plan_type FROM profiles WHERE email = 'test1@example.com';
```

**Should show:**
- `credits_remaining`: 2000 (loses 18,000 credits)
- `plan_type`: starter

### Verification Checklist

- [ ] Credits dropped from 20,000 to 2,000
- [ ] plan_type changed to "starter"
- [ ] Logs show "DOWNGRADE pro → starter"
- [ ] Ledger shows "plan change - starter"

### Expected Behavior

**Before**: 20,000 credits, Pro plan
**After**: 2,000 credits, Starter plan ✅

**User loses excess credits** - this is by design (monthly reset policy)

---

## 🧪 TEST 8: Subscription Cancellation

### Scenario
User cancels their subscription

### Setup
- User has active subscription
- User has 1,500 credits remaining

### Steps

1. **Ensure user has active subscription**
2. **In Stripe Dashboard:**
   - Go to customer → Subscription
   - Click "Cancel subscription"
   - Choose "Cancel immediately" or "Cancel at period end"
   - Confirm cancellation
3. **Wait for webhook**

### Expected Result

**Backend Logs:**
```
[EVENT] customer.subscription.deleted id=evt_xxx
[CANCELED] user=xxx, subscription=sub_xxx
```

**Database:**
```sql
SELECT credits_remaining, plan_type, subscription_status
FROM profiles WHERE email = 'test1@example.com';
```

**Should show:**
- `credits_remaining`: 1500 (unchanged - preserved)
- `plan_type`: free
- `subscription_status`: canceled

### Verification Checklist

- [ ] subscription_status = "canceled"
- [ ] plan_type = "free"
- [ ] Credits preserved (not lost)
- [ ] Logs show "[CANCELED]"
- [ ] User can still use remaining 1,500 credits

### Expected Behavior

**Before**: Active subscription, 1,500 credits
**After**: Canceled subscription, 1,500 credits (kept) ✅

User keeps credits until they use them up.

---

## 🧪 TEST 9: Invalid Metadata (Missing user_id)

### Scenario
Webhook arrives without user_id in metadata (edge case)

### Setup
This is hard to test directly, but you can check logs

### Alternative: Check Code Protection

```bash
# Search for the validation in logs
kubectl logs deployment/web -n personalizedline --tail=1000 | grep "No user_id"
```

### Manual Test (Advanced)

You would need to manually send a webhook with missing user_id using Stripe CLI or API. Skip this unless you're very technical.

### Verification

The code at `backend/app/main.py:1500-1504` should prevent this:

```python
if not user_id:
    print(f"[ERROR] No user_id in checkout.session.completed metadata for event {event_id}")
    _mark_event_processed(event_id, event_type)
    return {"status": "error", "message": "missing_user_id"}
```

**Expected**: Error logged, event marked processed, no credits granted

---

## 🧪 TEST 10: Invalid Plan

### Scenario
Webhook with invalid plan name in metadata

### Setup
Similar to Test 9, hard to test directly

### Verification

Code at `backend/app/main.py:1562-1566` should prevent this:

```python
if plan not in CREDITS_MAP:
    print(f"[ERROR] Invalid plan '{plan}' in checkout.session.completed for event {event_id}")
    _mark_event_processed(event_id, event_type)
    return {"status": "error", "message": "invalid_plan"}
```

**Expected**: Error logged, no credits granted

---

## 🧪 TEST 11: Concurrent Add-on Purchases (Race Condition)

### Scenario
Two add-on purchases happen at exact same time

### Setup
- User has 1,000 credits
- Need to trigger two purchases simultaneously

### Steps (Advanced)

**Option 1: Manual Rapid Clicks**
1. Open two browser windows side-by-side
2. Both logged in as same user
3. Both on add-on purchase page
4. Click "Buy Credits" in both windows simultaneously
5. Complete both checkouts quickly

**Option 2: Script Test** (More reliable)
```bash
# Would require custom script to trigger two Stripe checkouts simultaneously
# Skip if not technical
```

### Expected Result

**If atomic increment works:**
```
[DB:increment_addon_credits] ... (first purchase)
[DB:increment_addon_credits] ... (second purchase)
```

**If fallback works:**
```
[WARNING] RPC increment_credits failed, using fallback
[DB:update_addon_credits] ...
```

**Database:**
```sql
SELECT credits_remaining FROM profiles WHERE email = 'test1@example.com';
```

**Should show:**
- Starting credits (1,000) + purchase 1 (1,000) + purchase 2 (1,000) = 3,000 ✅

```sql
SELECT COUNT(*) FROM ledger WHERE user_id = 'YOUR-USER-ID' AND reason LIKE 'addon%';
```

**Should return:** 2 (both purchases logged)

### Verification Checklist

- [ ] Both purchases processed
- [ ] Credits = 3,000 (correct math)
- [ ] Two ledger entries
- [ ] No credits lost

### Why This Matters

**Without atomic increment:**
- Read credits: 1,000
- Purchase 1 adds 1,000 → Write 2,000
- Purchase 2 reads OLD value (1,000), adds 1,000 → Write 2,000
- **User only gets 2,000 instead of 3,000** (lost 1,000 credits)

---

## 🧪 TEST 12: Stripe API Failure Simulation

### Scenario
Stripe API is temporarily down or rate limited

### Steps

This is hard to test directly without blocking network. Instead:

### Verification

Check code has error handling:

**At `backend/app/main.py:294-304`:**
```python
try:
    customer = stripe.Customer.create(**customer_payload)
    # ...
except Exception as e:
    print(f"[ERROR] Failed to create Stripe customer for user {user_id}: {e}")
    return None
```

**At multiple webhook handlers:**
```python
try:
    # ... credit allocation
except Exception as exc:
    print(f"[Stripe] Failed to record add-on purchase: {exc}")
```

### Manual Test

1. **Temporarily break Stripe** (not recommended)
2. **Try to create checkout**
3. **Should see** error message instead of crash

### Expected Behavior

- ❌ App doesn't crash
- ❌ User sees error message
- ✅ Error logged
- ✅ System continues working for other users

---

## 📊 MASTER VERIFICATION CHECKLIST

After running all tests, verify:

### Database State
```sql
-- No duplicate ledger entries
SELECT user_id, reason, COUNT(*) as count
FROM ledger
GROUP BY user_id, reason
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- All events processed only once
SELECT event_id, COUNT(*) as count
FROM processed_stripe_events
GROUP BY event_id
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check all your test users
SELECT email, credits_remaining, plan_type, subscription_status
FROM profiles
WHERE email LIKE 'test%';
```

### Log Analysis
```bash
# Check for errors
kubectl logs deployment/web -n personalizedline --tail=500 | grep -i error

# Check for warnings
kubectl logs deployment/web -n personalizedline --tail=500 | grep -i warning

# Verify idempotency working
kubectl logs deployment/web -n personalizedline --tail=500 | grep IDEMPOTENCY

# Verify renewals working
kubectl logs deployment/web -n personalizedline --tail=500 | grep RENEWAL
```

---

## ✅ FINAL TEST RESULTS CHECKLIST

Before going to production, ALL must pass:

- [ ] ✅ TEST 1: New subscription - Credits set correctly
- [ ] ✅ TEST 2: Add-on purchase - Credits added correctly
- [ ] ✅ TEST 3: Failed payment - No credits granted
- [ ] ✅ TEST 4: Duplicate webhook - Rejected with idempotency
- [ ] ✅ TEST 5: Monthly renewal - Credits RESET (not added)
- [ ] ✅ TEST 6: Plan upgrade - Credits adjusted immediately
- [ ] ✅ TEST 7: Plan downgrade - Credits reduced correctly
- [ ] ✅ TEST 8: Cancellation - Status updated, credits preserved
- [ ] ✅ TEST 9: Invalid user_id - Error handled gracefully
- [ ] ✅ TEST 10: Invalid plan - Error handled gracefully
- [ ] ✅ TEST 11: Concurrent purchases - No credits lost
- [ ] ✅ TEST 12: API failures - Graceful degradation

### Database Checks
- [ ] No duplicate ledger entries
- [ ] All events in processed_stripe_events unique
- [ ] All test users have correct credits
- [ ] All subscription statuses correct

### Log Checks
- [ ] No ERROR messages (except expected test failures)
- [ ] Idempotency logs present
- [ ] Payment verification logs present
- [ ] Renewal logs present (if tested with test clocks)

---

## 🚀 READY FOR PRODUCTION?

If **ALL** tests pass:

### Next Steps:

1. **Document test results**
   ```
   Test Date: ___________
   Tested By: ___________
   All 12 tests: PASS ✅
   Database checks: PASS ✅
   Log checks: PASS ✅
   ```

2. **Switch to Production Stripe Keys**
   - Update `k8s/secrets.yaml`
   - Create production webhook
   - Deploy to GKE

3. **Final Smoke Test**
   - Make ONE real small purchase yourself
   - Verify credits allocated correctly
   - Monitor logs for 24 hours

4. **Monitor Closely**
   - First 24 hours: Check logs every few hours
   - First week: Daily log review
   - Watch for errors or anomalies

---

## 🆘 TROUBLESHOOTING

### Problem: Credits not allocated after purchase

**Check:**
1. Webhook configured in Stripe Dashboard?
2. Webhook URL correct: `https://api.senditfast.ai/stripe-webhook`
3. Webhook secret matches in secrets.yaml?
4. Backend pods running? `kubectl get pods -n personalizedline`
5. Check backend logs for webhook events

### Problem: Duplicate ledger entries

**Check:**
1. processed_stripe_events table exists?
2. Logs show idempotency checks?
3. Events being marked as processed?

### Problem: Monthly renewals not working

**Check:**
1. Using test clocks correctly?
2. Subscription has correct metadata (user_id)?
3. invoice.paid event firing?
4. billing_reason = "subscription_cycle"?

### Problem: RPC function errors

**Check:**
```sql
-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'increment_credits';

-- If missing, run migration again
```

---

## 📝 TEST EXECUTION LOG

Use this template to track your testing:

```
=== PAYMENT SYSTEM TEST LOG ===

Date: ___________
Tester: ___________
Environment: TEST MODE

TEST 1 - New Subscription:
Result: PASS / FAIL
Notes: ___________

TEST 2 - Add-on Purchase:
Result: PASS / FAIL
Notes: ___________

TEST 3 - Failed Payment:
Result: PASS / FAIL
Notes: ___________

TEST 4 - Duplicate Webhook:
Result: PASS / FAIL
Notes: ___________

TEST 5 - Monthly Renewal:
Result: PASS / FAIL
Notes: ___________

TEST 6 - Plan Upgrade:
Result: PASS / FAIL
Notes: ___________

TEST 7 - Plan Downgrade:
Result: PASS / FAIL
Notes: ___________

TEST 8 - Cancellation:
Result: PASS / FAIL
Notes: ___________

TEST 9 - Invalid user_id:
Result: PASS / FAIL / SKIP
Notes: ___________

TEST 10 - Invalid plan:
Result: PASS / FAIL / SKIP
Notes: ___________

TEST 11 - Concurrent purchases:
Result: PASS / FAIL / SKIP
Notes: ___________

TEST 12 - API failures:
Result: PASS / FAIL / SKIP
Notes: ___________

=== FINAL RESULTS ===
Total Tests: 12
Passed: ___
Failed: ___
Skipped: ___

Production Ready: YES / NO

Sign-off: ___________
```

---

**Good luck with testing! Take your time and verify everything works before production.** 🚀
