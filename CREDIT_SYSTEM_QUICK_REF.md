# QUICK REFERENCE - Credit System Implementation

## Your Database Schema (Current State)

### profiles table
```
id                      UUID (PK)
email                   TEXT
credits_remaining       INT    ← Monthly credits only (currently)
max_credits             INT
plan_type               TEXT   (free, starter, growth, pro)
subscription_status     TEXT   (active, inactive, canceled)
renewal_date            TIMESTAMP
stripe_customer_id      TEXT
stripe_subscription_id  TEXT
stripe_price_id         TEXT
created_at              TIMESTAMP

❌ Missing: addon_credits column
```

### ledger table
```
id          SERIAL (PK)
user_id     UUID (FK → profiles.id)
change      INT     ← Credit delta (+2000 for purchase, -500 for job)
amount      FLOAT   ← USD amount
reason      TEXT    ← Description
ts          TIMESTAMP
```

### Jobs table (exists)
### processed_stripe_events table (exists)
### ❌ addon_purchases table (MISSING - need to create)

---

## What Needs to Change

### Database Changes Needed:
1. **ADD:** `addon_credits INT` column to `profiles`
2. **CREATE:** `addon_purchases` table (track expiration)
3. **CREATE:** RPC function `increment_addon_credits()`
4. **OPTIONAL:** `credits_expire_at` column for canceled users

### Backend Changes Needed:
1. **FIX:** Pro plan credits (25000 → 40000)
2. **UPDATE:** Monthly reset webhook (preserve addon_credits)
3. **UPDATE:** Credit deduction (use monthly first, then add-ons)
4. **UPDATE:** Add-on purchase webhook (insert into addon_purchases)
5. **CREATE:** Add-on expiration cron job
6. **CREATE:** Annual billing price IDs

### Frontend Changes Needed:
1. **CREATE:** Credit history page (`/billing/history`)
2. **CREATE:** Manage subscription page (`/billing/manage`)
3. **ADD:** Annual billing toggle to pricing page
4. **ADD:** Upgrade/downgrade confirmation modals

---

## Priority Fix List

### CRITICAL (Do First) ⚠️
- [ ] Fix Pro plan bug (CREDITS_MAP["pro"] = 40000)
- [ ] Add addon_credits column
- [ ] Fix monthly reset to NOT overwrite add-on credits

### HIGH (Before Production)
- [ ] Create addon_purchases table
- [ ] Update credit deduction logic (two-bucket system)
- [ ] Test upgrade/downgrade flows

### MEDIUM (Nice to Have)
- [ ] Annual billing
- [ ] Credit history page
- [ ] Add-on expiration (12 months)

### LOW (Post-Launch)
- [ ] Fancy UI for subscription management
- [ ] Email notifications for renewals
- [ ] Usage analytics dashboard

---

## Key SQL Queries to Run NOW

```sql
-- 1. Check if Pro plan bug affects anyone
SELECT id, email, plan_type, credits_remaining, max_credits
FROM profiles
WHERE plan_type = 'pro';

-- 2. Check if anyone has add-on credits mixed in
SELECT id, email, plan_type, credits_remaining, max_credits,
       (credits_remaining - max_credits) AS excess_credits
FROM profiles
WHERE credits_remaining > max_credits;

-- 3. See all recent credit transactions
SELECT user_id, change, amount, reason, ts
FROM ledger
ORDER BY ts DESC
LIMIT 20;

-- 4. Check webhook idempotency is working
SELECT event_type, COUNT(*) as count
FROM processed_stripe_events
GROUP BY event_type
ORDER BY count DESC;
```

---

## Implementation Time Estimates

| Task | Time | Complexity |
|------|------|------------|
| Fix Pro bug | 5 min | Easy |
| Add addon_credits column | 15 min | Easy |
| Create addon_purchases table | 30 min | Medium |
| Update credit deduction logic | 2 hours | Hard |
| Fix monthly reset | 1 hour | Medium |
| Add-on expiration | 2 hours | Medium |
| Upgrade/downgrade logic | 2 hours | Medium |
| Annual billing (backend) | 1 hour | Easy |
| Annual billing (frontend) | 1 hour | Medium |
| Credit history page | 3 hours | Medium |
| Manage subscription page | 3 hours | Medium |
| **TOTAL** | **~16 hours** | |

---

## Testing Strategy

**Use Stripe Test Mode:**
- Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0341` (failure)
- Test clock: Simulate time passing (advance 30 days for renewals)
- Webhooks: Test via Stripe CLI `stripe listen --forward-to localhost:8000/stripe-webhook`

**Create Test User:**
```sql
-- You can manually manipulate test user credits for testing
UPDATE profiles
SET credits_remaining = 100,
    addon_credits = 500
WHERE email = 'your-test@email.com';
```

**Rollback Strategy:**
```sql
-- Take snapshot before changes
CREATE TABLE profiles_backup_2025_01_15 AS
SELECT * FROM profiles;

-- Rollback if needed
DELETE FROM profiles;
INSERT INTO profiles SELECT * FROM profiles_backup_2025_01_15;
```

