# Payment & Credits System - Production Fixes

## Overview
This document outlines critical fixes to the payment and credit allocation system to ensure production readiness.

## Credit Policy Implemented: **Monthly Reset**

Based on industry best practices and your preference ("I don't want them to stack"), we've implemented a **Monthly Reset** policy:

- **Initial Purchase**: User gets full credit allocation for their plan
- **Monthly Renewals**: Credits RESET to the plan's monthly allocation (unused credits don't carry over)
- **Add-on Credits**: These ADD to existing balance (one-time purchases)
- **Example**:
  - User subscribes to Starter plan (2,000 credits/month)
  - Month 1: Gets 2,000 credits, uses 500
  - Month 2: Invoice paid → credits RESET to 2,000 (not 3,500)

This matches how most successful SaaS companies operate (Hunter.io, Mailchimp, etc.).

## Critical Fixes Implemented

### 1. ✅ Monthly Renewal Handler (`invoice.paid`)
**Problem**: Users were charged monthly but never received their monthly credits.

**Fix**: Added handler for `invoice.paid` webhook event that:
- Verifies payment was successful
- Identifies the user from subscription metadata
- RESETS credits to monthly allocation (doesn't add)
- Records transaction in ledger
- Only processes for active subscriptions

**Location**: `backend/app/main.py:1590-1665`

### 2. ✅ Payment Verification
**Problem**: Credits could be granted even if payment failed.

**Fix**: Added `_verify_payment_status()` function that:
- Checks `payment_status == "paid"` for checkout sessions
- Checks `status == "paid" and paid == True` for invoices
- Blocks credit allocation if payment not verified

**Location**: `backend/app/main.py:1441-1454`

### 3. ✅ Idempotency Protection
**Problem**: If Stripe retries a webhook, users could get duplicate credits.

**Fix**: Implemented event tracking system:
- `_is_event_processed()`: Checks if event already handled
- `_mark_event_processed()`: Records processed events
- Uses new `processed_stripe_events` table
- Returns early if duplicate detected

**Location**: `backend/app/main.py:1414-1439`

### 4. ✅ Subscription Cancellation Handler
**Problem**: No handling when users cancel subscriptions.

**Fix**: Added handler for `customer.subscription.deleted` that:
- Sets `subscription_status` to "canceled"
- Downgrades `plan_type` to "free"
- Preserves existing credits until used

**Location**: `backend/app/main.py:1667-1692`

### 5. ✅ Credit Allocation Logic
**Problem**: Subscription credits were being SET (line 1548), which is correct, but confusion about add vs reset.

**Clarification**:
- **Subscription (initial)**: Credits are SET to plan amount ✅
- **Subscription (renewal)**: Credits are RESET to plan amount ✅
- **Add-ons**: Credits are ADDED to existing balance ✅

## Database Changes Required

### Create the `processed_stripe_events` Table

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_event_id
ON processed_stripe_events(event_id);

CREATE INDEX IF NOT EXISTS idx_processed_stripe_events_processed_at
ON processed_stripe_events(processed_at);
```

**Location**: `supabase_migration_processed_events.sql`

## Deployment Steps

### 1. Create Database Table
```bash
# Copy the SQL from supabase_migration_processed_events.sql
# Paste into Supabase Dashboard → SQL Editor → Run
```

### 2. Deploy Backend Changes
```bash
# The code changes are already committed
# Push to deploy branch
git add backend/app/main.py
git commit -m "Fix critical payment issues: add monthly renewals, idempotency, and payment verification"
git push -u origin claude/fix-credits-payment-audit-01VtVvZC7uESSXFc1bKSAEU2

# Restart GKE deployment
kubectl rollout restart deployment/web -n default

# Or delete pod to force restart
kubectl get pods
kubectl delete pod <pod-name>
```

### 3. Verify Deployment
```bash
# Check logs
kubectl logs -f deployment/web --tail=100

# Look for successful startup
```

## Testing Checklist (Test Mode)

Before switching to production Stripe keys, test these scenarios:

### Test 1: New Subscription Purchase
- [ ] Create test subscription
- [ ] Verify credits are allocated
- [ ] Check ledger entry created
- [ ] Verify `subscription_status` = "active"
- [ ] Check logs for `[PLAN]` message

### Test 2: Monthly Renewal (Critical!)
- [ ] Trigger test renewal (advance Stripe test clock OR wait for invoice.paid)
- [ ] Verify credits RESET to monthly amount (not added)
- [ ] Check ledger shows "monthly renewal"
- [ ] Check logs for `[RENEWAL]` message

### Test 3: Add-on Credits
- [ ] Purchase add-on credits
- [ ] Verify credits ADD to existing balance
- [ ] Check ledger entry
- [ ] Check logs for `[ADDON]` message

### Test 4: Duplicate Webhook
- [ ] Manually replay a webhook event in Stripe Dashboard
- [ ] Verify it's rejected with "duplicate" status
- [ ] Confirm no duplicate credits granted
- [ ] Check logs for `[IDEMPOTENCY]` message

### Test 5: Failed Payment
- [ ] Use Stripe test card that triggers payment failure
- [ ] Verify NO credits are allocated
- [ ] Check logs for `[WARNING] Payment not verified`

### Test 6: Subscription Cancellation
- [ ] Cancel a test subscription
- [ ] Verify `subscription_status` → "canceled"
- [ ] Verify `plan_type` → "free"
- [ ] Existing credits preserved
- [ ] Check logs for `[CANCELED]` message

## Production Deployment (Real Stripe Keys)

### Before Switching to Production:
1. ✅ All test scenarios pass
2. ✅ Database migration applied
3. ✅ Backend deployed and stable
4. ✅ Webhook endpoint verified in Stripe Dashboard

### Switch to Production:
1. Update Stripe keys in `k8s/secrets.yaml`:
   ```yaml
   STRIPE_SECRET_KEY: "sk_live_xxxxx"  # Replace with live key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_xxxxx"
   STRIPE_WEBHOOK_SECRET: "whsec_xxxxx"  # Get new secret from Stripe
   ```

2. Create production webhook in Stripe Dashboard:
   - URL: `https://api.senditfast.ai/stripe-webhook`
   - Events: Select all relevant events (or use the same as test mode)
   - Copy the new signing secret

3. Apply secrets and restart:
   ```bash
   kubectl apply -f k8s/secrets.yaml
   kubectl rollout restart deployment/web
   ```

4. Update Vercel environment variables with production keys

## Monitoring

### Important Log Messages to Watch:
- `[RENEWAL]` - Monthly credits reset
- `[ADDON]` - Add-on credits purchased
- `[PLAN]` - New subscription purchased
- `[CANCELED]` - Subscription canceled
- `[IDEMPOTENCY]` - Duplicate event blocked
- `[WARNING] Payment not verified` - Failed payment blocked

### Common Issues:
1. **User not found in invoice.paid**: Ensure subscription has `user_id` in metadata
2. **Idempotency table errors**: Ensure migration was applied
3. **Credits not resetting**: Check subscription_status is "active"

## Files Modified

1. `backend/app/main.py`:
   - Added helper functions (lines 1414-1454)
   - Added idempotency check (lines 1474-1477)
   - Added payment verification (lines 1488-1493)
   - Added invoice.paid handler (lines 1590-1665)
   - Added subscription.deleted handler (lines 1667-1692)
   - Added event processing marker (lines 1698-1699)

2. `supabase_migration_processed_events.sql`:
   - New table for idempotency tracking

## Credit Allocation Summary

| Event | Action | Ledger Entry |
|-------|--------|--------------|
| New Subscription | SET credits to plan amount | "plan purchase - {plan}" |
| Monthly Renewal (invoice.paid) | RESET credits to plan amount | "monthly renewal - {plan}" |
| Add-on Purchase | ADD credits to existing | "addon purchase x{qty}" |
| Subscription Canceled | No change to credits | None |

## Support for Rollover (Future)

If you later decide to allow limited rollover:
1. Modify the `invoice.paid` handler
2. Calculate: `new_credits = min(monthly_credits + unused, 2 * monthly_credits)`
3. Update ledger reason to indicate rollover

Current implementation makes this easy to add later.

---

**Status**: ✅ Ready for Testing
**Next Step**: Run Test Mode scenarios, then deploy to production
