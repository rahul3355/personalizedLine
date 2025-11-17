# CREDIT SYSTEM IMPLEMENTATION - COMPLETE PLAN

**Status:** Pre-implementation analysis
**Environment:** Test mode (staying in test until all logic verified)
**Approach:** One feature at a time, thoroughly tested

---

## DATABASE & BACKEND EXPLORATION QUERIES

### **Run These First (Supabase SQL Editor)**

```sql
-- ============================================================================
-- STEP 1: Understand Current Database Schema
-- ============================================================================

-- Query 1.1: See profiles table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Expected columns:
-- id, email, credits_remaining, max_credits, plan_type, subscription_status,
-- renewal_date, stripe_customer_id, stripe_subscription_id, stripe_price_id,
-- stripe_payment_brand, stripe_payment_last4, created_at, updated_at


-- Query 1.2: Check if ledger table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'ledger'
) AS ledger_exists;

-- Expected: TRUE (you have this table based on webhook code)


-- Query 1.3: See ledger table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ledger'
ORDER BY ordinal_position;

-- Expected columns: id, user_id, change, amount, reason, ts


-- Query 1.4: Sample ledger entries (last 20)
SELECT
    id,
    user_id,
    change AS credit_change,
    amount AS usd_amount,
    reason,
    ts AS timestamp
FROM ledger
ORDER BY ts DESC
LIMIT 20;

-- Expected reasons:
-- "plan purchase - starter"
-- "monthly renewal - starter"
-- "addon purchase x5"
-- "plan change - pro"


-- Query 1.5: Your current credit distribution
SELECT
    plan_type,
    subscription_status,
    COUNT(*) AS users,
    AVG(credits_remaining) AS avg_credits,
    MIN(credits_remaining) AS min_credits,
    MAX(credits_remaining) AS max_credits,
    SUM(credits_remaining) AS total_credits
FROM profiles
GROUP BY plan_type, subscription_status
ORDER BY plan_type;


-- Query 1.6: Check for addon-related columns (should be FALSE - we'll add these)
SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'addon_credits'
) AS addon_credits_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'addon_purchases'
) AS addon_purchases_exists;


-- ============================================================================
-- STEP 2: Analyze Current Credit Activity
-- ============================================================================

-- Query 2.1: Total credits allocated by reason (last 30 days)
SELECT
    reason,
    COUNT(*) AS transactions,
    SUM(change) AS total_credits,
    SUM(amount) AS total_usd,
    AVG(amount) AS avg_usd
FROM ledger
WHERE ts >= NOW() - INTERVAL '30 days'
GROUP BY reason
ORDER BY total_usd DESC;


-- Query 2.2: Users who might be affected by monthly reset
SELECT
    id,
    email,
    plan_type,
    credits_remaining,
    max_credits,
    renewal_date,
    CASE
        WHEN credits_remaining > max_credits THEN 'Has add-on credits'
        WHEN credits_remaining < max_credits * 0.5 THEN 'Used >50%'
        ELSE 'Normal usage'
    END AS status
FROM profiles
WHERE plan_type != 'free'
ORDER BY credits_remaining DESC;


-- Query 2.3: Find test users (for manual testing)
SELECT
    id,
    email,
    plan_type,
    subscription_status,
    credits_remaining,
    stripe_customer_id,
    created_at
FROM profiles
WHERE email LIKE '%test%' OR email LIKE '%@gmail.com'
ORDER BY created_at DESC
LIMIT 10;


-- ============================================================================
-- STEP 3: Verify Webhook Processing
-- ============================================================================

-- Query 3.1: Recent Stripe events processed
SELECT
    event_id,
    event_type,
    processed_at,
    EXTRACT(EPOCH FROM (NOW() - processed_at)) / 60 AS minutes_ago
FROM processed_stripe_events
ORDER BY processed_at DESC
LIMIT 20;


-- Query 3.2: Match ledger entries to Stripe events (rough correlation)
SELECT
    l.ts,
    l.user_id,
    l.reason,
    l.change,
    l.amount,
    p.email
FROM ledger l
LEFT JOIN profiles p ON l.user_id = p.id
WHERE l.ts >= NOW() - INTERVAL '7 days'
ORDER BY l.ts DESC;


-- ============================================================================
-- STEP 4: Check for Data Integrity Issues
-- ============================================================================

-- Query 4.1: Find negative credit balances (should be empty!)
SELECT
    id,
    email,
    plan_type,
    credits_remaining,
    max_credits
FROM profiles
WHERE credits_remaining < 0;


-- Query 4.2: Find orphaned jobs (jobs without user)
SELECT
    j.id,
    j.user_id,
    j.status,
    j.created_at
FROM jobs j
LEFT JOIN profiles p ON j.user_id = p.id
WHERE p.id IS NULL
LIMIT 10;


-- Query 4.3: Find users with active subscription but free plan (inconsistency)
SELECT
    id,
    email,
    plan_type,
    subscription_status,
    stripe_subscription_id
FROM profiles
WHERE subscription_status = 'active' AND plan_type = 'free';


-- ============================================================================
-- STEP 5: Export Sample Data for Testing
-- ============================================================================

-- Query 5.1: Create test user snapshot (save this for rollback if needed)
SELECT
    id,
    email,
    credits_remaining,
    max_credits,
    plan_type,
    subscription_status,
    renewal_date,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id
FROM profiles
WHERE email = 'your-test-email@gmail.com';  -- Replace with your test email


-- Query 5.2: Your personal ledger history
SELECT
    ts,
    change,
    amount,
    reason
FROM ledger
WHERE user_id = 'your-user-id'  -- Replace with your user_id
ORDER BY ts DESC;
```

---

## BACKEND API TESTING COMMANDS

### **Run These via curl/Postman to understand your backend**

```bash
# Get your auth token first
# Login to your app, open DevTools → Application → Local Storage → access_token
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test 1: Get current user profile
curl -X GET "http://localhost:8000/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "id": "user-uuid",
#   "email": "test@example.com",
#   "credits_remaining": 2000,
#   "max_credits": 2000,
#   "plan_type": "starter",
#   "subscription_status": "active",
#   "renewal_date": "2025-02-15T00:00:00Z"
# }


# Test 2: List recent jobs
curl -X GET "http://localhost:8000/jobs?limit=10" \
  -H "Authorization: Bearer $TOKEN"


# Test 3: Trigger Stripe sync (manually sync subscription from Stripe)
curl -X POST "http://localhost:8000/stripe/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# This will:
# - Fetch latest subscription from Stripe
# - Update plan_type, subscription_status, renewal_date
# - Return current subscription state
```

---

## CURRENT SYSTEM STATE ANALYSIS

### **What You Have ✅**

1. **profiles table:**
   - `credits_remaining` (INT) - Single bucket for all credits
   - `max_credits` (INT) - Plan's monthly allocation
   - `plan_type` (TEXT) - free, starter, growth, pro
   - `subscription_status` (TEXT) - active, inactive, canceled
   - `renewal_date` (TIMESTAMP)
   - Stripe fields (customer_id, subscription_id, price_id)

2. **ledger table:**
   - Complete audit trail of all credit changes
   - Columns: user_id, change, amount, reason, ts

3. **Webhook handlers:**
   - `checkout.session.completed` - New subscription/add-on purchase
   - `invoice.paid` - Monthly renewals
   - `customer.subscription.deleted` - Cancellations
   - Idempotency protection via `processed_stripe_events`
   - Payment verification before credit allocation

4. **Backend logic:**
   - Atomic credit deduction (CAS pattern)
   - Credit reservation on job creation
   - Refund logic on job failure

### **What's Missing ❌**

1. **Separate credit buckets:**
   - No `addon_credits` column (add-ons mixed with monthly)
   - No expiration tracking for add-ons
   - Monthly reset overwrites add-on credits (BUG!)

2. **Upgrade/Downgrade handling:**
   - No proration logic
   - No "downgrade at period end" vs "immediate downgrade"
   - Credits reset immediately (may lose excess)

3. **Annual billing:**
   - No annual price IDs in env vars (only monthly)
   - No logic to detect annual vs monthly plans
   - No UI to choose billing frequency

4. **Frontend:**
   - No ledger/transaction history display
   - No "Manage Subscription" page
   - No "Upgrade/Downgrade" flow
   - No visibility into add-on credit expiration

5. **Pro plan bug:**
   - Frontend shows 40,000 credits
   - Backend allocates 25,000 credits
   - **MUST FIX THIS FIRST**

---

## IMPLEMENTATION PLAN - OVERVIEW

### **Priority Order (Implement in This Sequence)**

```
PHASE 1: Foundation (Must do first)
├─ Task 1.1: Fix Pro plan credit bug (5 min) ⚠️ CRITICAL
├─ Task 1.2: Add separate addon_credits column (15 min)
└─ Task 1.3: Create addon_purchases table for expiration tracking (30 min)

PHASE 2: Core Credit Logic (The hard part)
├─ Task 2.1: Implement monthly credit reset (preserve add-ons) (1 hour)
├─ Task 2.2: Implement add-on expiration (12 months) (1 hour)
└─ Task 2.3: Update job credit deduction (use monthly first, then add-ons) (30 min)

PHASE 3: Subscription Changes
├─ Task 3.1: Implement mid-cycle upgrade (1 hour)
├─ Task 3.2: Implement mid-cycle downgrade (1 hour)
└─ Task 3.3: Handle subscription cancellation properly (30 min)

PHASE 4: Annual Billing
├─ Task 4.1: Create annual Stripe products (30 min)
├─ Task 4.2: Update backend to handle annual plans (30 min)
└─ Task 4.3: Add annual toggle to frontend (30 min)

PHASE 5: Frontend
├─ Task 5.1: Credit ledger/transaction history page (2 hours)
├─ Task 5.2: Manage Subscription page (2 hours)
└─ Task 5.3: Upgrade/Downgrade UI with warnings (2 hours)

PHASE 6: Testing & Validation
├─ Task 6.1: End-to-end test all scenarios (4 hours)
└─ Task 6.2: Write test checklist (1 hour)
```

**Total Estimated Time: 18-20 hours**

---

## DETAILED PLAN FOR EACH TASK

---

## **PHASE 1: Foundation**

### **TASK 1.1: Fix Pro Plan Credit Bug** ⚠️ CRITICAL

**Current Problem:**
- `billing.tsx:65` → `credits: 40000`
- `main.py:108` → `"pro": 25000`

**Changes Needed:**

**Backend (`main.py`):**
```python
# Line 104-109
CREDITS_MAP = {
    "free": 500,
    "starter": 2000,
    "growth": 10000,
    "pro": 40000,  # ← Change from 25000 to 40000
}
```

**Testing:**
1. Check existing Pro users (SQL: `SELECT * FROM profiles WHERE plan_type = 'pro'`)
2. If any exist, credit them the difference:
   ```sql
   UPDATE profiles SET credits_remaining = credits_remaining + 15000
   WHERE plan_type = 'pro';

   INSERT INTO ledger (user_id, change, reason, ts)
   SELECT id, 15000, 'credit correction - pro plan bug', NOW()
   FROM profiles WHERE plan_type = 'pro';
   ```

**Verification:**
- New Pro purchase should allocate 40,000 credits
- Check ledger entry shows +40000

---

### **TASK 1.2: Add addon_credits Column**

**Database Migration:**
```sql
-- Add column to profiles table
ALTER TABLE profiles ADD COLUMN addon_credits INT DEFAULT 0;

-- Add comment
COMMENT ON COLUMN profiles.addon_credits IS 'Add-on credits purchased separately, expire after 12 months';

-- Migrate existing users (if any have credits > max_credits, assume excess is add-ons)
UPDATE profiles
SET addon_credits = credits_remaining - max_credits,
    credits_remaining = max_credits
WHERE credits_remaining > max_credits
AND plan_type != 'free';

-- Verify migration
SELECT
    id,
    email,
    plan_type,
    credits_remaining AS monthly_credits,
    addon_credits,
    max_credits
FROM profiles
WHERE addon_credits > 0;
```

**Backend Changes:**

**1. Update `/me` endpoint to return addon_credits (`main.py:641`):**
```python
# Line 641
.select("id, email, credits_remaining, addon_credits, max_credits, plan_type, subscription_status, renewal_date")
```

**2. Update credit deduction logic (`jobs.py:478-587`):**
```python
# Current logic (WRONG):
new_balance = credits_remaining - row_count

# New logic (CORRECT):
if credits_remaining >= row_count:
    # Use monthly credits only
    new_balance_monthly = credits_remaining - row_count
    new_balance_addon = addon_credits
else:
    # Use monthly + add-on credits
    remaining_needed = row_count - credits_remaining
    new_balance_monthly = 0
    new_balance_addon = addon_credits - remaining_needed

    if new_balance_addon < 0:
        raise InsufficientCreditsError()

# Update both columns
supabase.table("profiles").update({
    "credits_remaining": new_balance_monthly,
    "addon_credits": new_balance_addon
}).eq("id", user_id).execute()
```

**Testing:**
1. Create test user with 500 monthly + 1000 add-on credits
2. Process 1200-row job
3. Verify: monthly = 0, add-on = 300

---

### **TASK 1.3: Create addon_purchases Table**

**Purpose:** Track when add-ons were purchased to enforce 12-month expiration

**Database Migration:**
```sql
-- Create addon_purchases table
CREATE TABLE addon_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    credits INT NOT NULL,
    credits_remaining INT NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_payment_intent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_addon_purchases_user_id ON addon_purchases(user_id);
CREATE INDEX idx_addon_purchases_expires_at ON addon_purchases(expires_at);
CREATE INDEX idx_addon_purchases_user_expires ON addon_purchases(user_id, expires_at);

-- Comments
COMMENT ON TABLE addon_purchases IS 'Tracks add-on credit purchases with 12-month expiration';
COMMENT ON COLUMN addon_purchases.credits IS 'Original credits purchased';
COMMENT ON COLUMN addon_purchases.credits_remaining IS 'Credits not yet used';
COMMENT ON COLUMN addon_purchases.expires_at IS 'Expiration date (purchased_at + 365 days)';

-- Trigger to set expires_at automatically
CREATE OR REPLACE FUNCTION set_addon_expiration()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at := NEW.purchased_at + INTERVAL '365 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_addon_expiration
    BEFORE INSERT ON addon_purchases
    FOR EACH ROW
    EXECUTE FUNCTION set_addon_expiration();
```

**Backend Changes:**

**1. Modify add-on webhook handler (`main.py:1671-1722`):**
```python
# After successful add-on purchase
credits = qty * 1000

# Insert into addon_purchases table (NEW)
res_addon_purchase = (
    supabase.table("addon_purchases")
    .insert({
        "user_id": user_id,
        "credits": credits,
        "credits_remaining": credits,
        "purchased_at": datetime.utcnow().isoformat(),
        "stripe_payment_intent": obj.get("payment_intent")
    })
    .execute()
)

# Update addon_credits in profiles
# Use RPC for atomic increment
res_update = supabase.rpc(
    "increment_addon_credits",  # New RPC function needed
    {"user_id_param": user_id, "credit_amount": credits}
).execute()
```

**2. Create new RPC function:**
```sql
CREATE OR REPLACE FUNCTION public.increment_addon_credits(
    user_id_param UUID,
    credit_amount INTEGER
)
RETURNS TABLE(
    id UUID,
    addon_credits INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.profiles
    SET addon_credits = COALESCE(addon_credits, 0) + credit_amount
    WHERE profiles.id = user_id_param
    RETURNING profiles.id, profiles.addon_credits;
END;
$$;
```

**Testing:**
1. Buy add-on credits (5,000)
2. Verify `addon_purchases` table has entry with expires_at = 365 days from now
3. Verify `profiles.addon_credits` increased by 5,000

---

## **PHASE 2: Core Credit Logic**

### **TASK 2.1: Monthly Credit Reset (Preserve Add-ons)**

**Current Problem:**
- `invoice.paid` webhook resets `credits_remaining` to monthly allocation
- This OVERWRITES add-on credits (major bug!)

**Backend Changes (`main.py:1774-1876`):**

**Old logic:**
```python
# Line 1838-1846
res_update = (
    supabase.table("profiles")
    .update({
        "credits_remaining": monthly_credits,  # ← BUG: Overwrites everything
        "plan_type": plan_type,
    })
    .eq("id", user_id)
    .execute()
)
```

**New logic:**
```python
# RESET only monthly credits, PRESERVE addon_credits
res_update = (
    supabase.table("profiles")
    .update({
        "credits_remaining": monthly_credits,  # ← Resets monthly bucket
        "plan_type": plan_type,
        # addon_credits intentionally NOT touched
    })
    .eq("id", user_id)
    .execute()
)

# Update ledger to be more specific
res_ledger = (
    supabase.table("ledger")
    .insert({
        "user_id": user_id,
        "change": monthly_credits,
        "amount": invoice_amount,
        "reason": f"monthly renewal - {plan_type} (monthly credits only)",  # ← Clarify
        "ts": datetime.utcnow().isoformat(),
    })
    .execute()
)
```

**Testing Scenario:**
```
Day 1: User on Starter (2,000 monthly)
Day 10: User buys 5,000 add-on credits
  → credits_remaining: 2,000
  → addon_credits: 5,000

Day 15: User uses 1,500 credits (from monthly bucket)
  → credits_remaining: 500
  → addon_credits: 5,000

Day 30: Monthly renewal (invoice.paid fires)
  ❌ OLD: credits_remaining = 2,000, addon_credits = 0 (lost 5k!)
  ✅ NEW: credits_remaining = 2,000, addon_credits = 5,000 (preserved!)
```

---

### **TASK 2.2: Add-on Expiration (12 months)**

**Create Scheduled Job (Supabase Edge Function or Cron):**

**Option A: Database Function (Recommended)**
```sql
-- Function to expire old add-on purchases
CREATE OR REPLACE FUNCTION expire_addon_credits()
RETURNS void AS $$
DECLARE
    expired_record RECORD;
    total_expired INT;
BEGIN
    -- Find expired add-on purchases with remaining credits
    FOR expired_record IN
        SELECT
            id,
            user_id,
            credits_remaining,
            expires_at
        FROM addon_purchases
        WHERE expires_at <= NOW()
        AND credits_remaining > 0
    LOOP
        -- Deduct from user's addon_credits
        UPDATE profiles
        SET addon_credits = GREATEST(addon_credits - expired_record.credits_remaining, 0)
        WHERE id = expired_record.user_id;

        -- Log in ledger
        INSERT INTO ledger (user_id, change, reason, ts)
        VALUES (
            expired_record.user_id,
            -expired_record.credits_remaining,
            'addon credits expired - purchased ' || expired_record.expires_at::DATE,
            NOW()
        );

        -- Mark as fully used
        UPDATE addon_purchases
        SET credits_remaining = 0
        WHERE id = expired_record.id;

        RAISE NOTICE 'Expired % credits for user %', expired_record.credits_remaining, expired_record.user_id;
    END LOOP;

    GET DIAGNOSTICS total_expired = ROW_COUNT;
    RAISE NOTICE 'Total expired add-on batches: %', total_expired;
END;
$$ LANGUAGE plpgsql;

-- Schedule to run daily via pg_cron extension
SELECT cron.schedule(
    'expire-addon-credits',  -- Job name
    '0 2 * * *',              -- Run at 2am daily
    $$SELECT expire_addon_credits()$$
);
```

**Option B: Backend Cron Job (if no pg_cron):**
```python
# Create new endpoint in main.py
@app.post("/internal/expire-addons")
async def expire_addon_credits():
    """
    Internal endpoint to expire add-on credits.
    Call this daily via external cron (e.g., GitHub Actions, cron-job.org)
    """
    # Require internal API key
    if request.headers.get("X-Internal-Key") != os.getenv("INTERNAL_API_KEY"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Find expired add-ons
    expired = (
        supabase.table("addon_purchases")
        .select("*")
        .lte("expires_at", datetime.utcnow().isoformat())
        .gt("credits_remaining", 0)
        .execute()
    )

    for addon in expired.data:
        # Deduct from user's addon_credits
        supabase.table("profiles").update({
            "addon_credits": max(0, addon_credits - addon["credits_remaining"])
        }).eq("id", addon["user_id"]).execute()

        # Log expiration
        supabase.table("ledger").insert({
            "user_id": addon["user_id"],
            "change": -addon["credits_remaining"],
            "reason": f"addon credits expired - purchased {addon['purchased_at']}",
            "ts": datetime.utcnow().isoformat()
        }).execute()

        # Mark as expired
        supabase.table("addon_purchases").update({
            "credits_remaining": 0
        }).eq("id", addon["id"]).execute()

    return {"expired_batches": len(expired.data)}

# Setup external cron to call this daily:
# curl -X POST https://api.senditfast.ai/internal/expire-addons \
#   -H "X-Internal-Key: your-secret-key"
```

**Testing:**
1. Manually insert expired add-on:
   ```sql
   INSERT INTO addon_purchases (user_id, credits, credits_remaining, purchased_at, expires_at)
   VALUES ('your-user-id', 1000, 1000, NOW() - INTERVAL '400 days', NOW() - INTERVAL '35 days');
   ```
2. Run expiration function
3. Verify user's `addon_credits` decreased by 1,000
4. Verify ledger shows negative entry

---

### **TASK 2.3: Update Job Credit Deduction**

**Current:** Single bucket (`credits_remaining`)
**New:** Two buckets (monthly first, then add-ons)

**Backend Changes (`backend/app/jobs.py`):**

**Location:** `_deduct_job_credits()` function (lines 478-587)

**New Logic:**
```python
def _deduct_job_credits(supabase_client, user_id: str, cost: int, job_id: str):
    """
    Deduct credits using priority:
    1. Monthly credits (credits_remaining) first
    2. Add-on credits (addon_credits) second

    Atomic with retry logic
    """
    max_attempts = 5

    for attempt in range(max_attempts):
        # Read current balances
        profile_res = (
            supabase_client.table("profiles")
            .select("credits_remaining, addon_credits, max_credits, plan_type")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )

        profile = profile_res.data[0] if profile_res.data else None
        if not profile:
            raise Exception("Profile not found")

        monthly = profile.get("credits_remaining", 0)
        addon = profile.get("addon_credits", 0)
        total = monthly + addon

        if total < cost:
            raise Exception(f"Insufficient credits: need {cost}, have {total}")

        # Calculate new balances
        if monthly >= cost:
            # Use only monthly credits
            new_monthly = monthly - cost
            new_addon = addon
            deduction_source = "monthly"
        else:
            # Use monthly + add-on
            remaining_needed = cost - monthly
            new_monthly = 0
            new_addon = addon - remaining_needed
            deduction_source = "monthly+addon"

        # Atomic CAS update (both columns)
        update_res = (
            supabase_client.table("profiles")
            .update({
                "credits_remaining": new_monthly,
                "addon_credits": new_addon
            })
            .eq("id", user_id)
            .eq("credits_remaining", monthly)  # CAS on monthly
            .eq("addon_credits", addon)         # CAS on addon
            .execute()
        )

        if update_res.data:
            # Success! Log it
            supabase_client.table("ledger").insert({
                "user_id": user_id,
                "change": -cost,
                "amount": 0.0,
                "reason": f"job deduction: {job_id} ({deduction_source})",
                "ts": datetime.utcnow().isoformat()
            }).execute()

            return {
                "previous_monthly": monthly,
                "previous_addon": addon,
                "new_monthly": new_monthly,
                "new_addon": new_addon,
                "deduction_source": deduction_source
            }
        else:
            # CAS failed (concurrent update), retry
            time.sleep(0.1 * (2 ** attempt))  # Exponential backoff

    raise Exception("Unable to deduct credits after max retries")
```

**Also Update:** `_reserve_credits_for_job()` in `main.py` (lines 721-798) with same two-bucket logic

**Testing:**
1. User has 100 monthly + 500 add-on
2. Process 150-row job
3. Verify: monthly = 0, add-on = 450
4. Ledger shows: "job deduction: job-123 (monthly+addon)"

---

## **PHASE 3: Subscription Changes**

### **TASK 3.1: Mid-Cycle Upgrade**

**User Story:**
Starter user (2,000/month, has 500 left) upgrades to Pro (40,000/month) on Day 15

**Expected Behavior:**
- Stripe prorates charges: Charges ~$450 (15 days of Pro - 15 days of Starter)
- Backend immediately grants 40,000 monthly credits
- User loses 500 remaining Starter credits (acceptable trade-off)
- Add-on credits preserved

**Backend Changes (`main.py:1816-1826`):**

**Current code already handles this!** But let's make it clearer:

```python
# invoice.paid webhook with billing_reason="subscription_update"

# Get new plan from subscription items
items = subscription.get("items", {}).get("data", [])
if items:
    price_id = items[0].get("price", {}).get("id")
    new_plan = PRICE_TO_PLAN.get(price_id, plan_type)

    if new_plan != plan_type:
        print(f"[UPGRADE] {plan_type} → {new_plan}")

        # Reset monthly credits to NEW plan amount
        monthly_credits = CREDITS_MAP.get(new_plan, 0)

        res_update = (
            supabase.table("profiles")
            .update({
                "credits_remaining": monthly_credits,  # ← New plan's allocation
                "plan_type": new_plan,
                # addon_credits preserved
            })
            .eq("id", user_id)
            .execute()
        )

        # Log as upgrade
        res_ledger = (
            supabase.table("ledger")
            .insert({
                "user_id": user_id,
                "change": monthly_credits,
                "amount": invoice_amount,
                "reason": f"upgrade - {plan_type} → {new_plan}",
                "ts": datetime.utcnow().isoformat(),
            })
            .execute()
        )
```

**Testing in Stripe Test Mode:**
1. Create Starter subscription ($49/month)
2. Immediately upgrade to Pro ($499/month) via Stripe Dashboard
3. Webhook fires with billing_reason="subscription_update"
4. Verify: credits_remaining = 40,000, ledger shows "upgrade - starter → pro"

---

### **TASK 3.2: Mid-Cycle Downgrade**

**Two Options:**

**Option A: Downgrade at Period End (Recommended)**
- User keeps Pro access until billing cycle ends
- On Day 30, switches to Starter and gets 2,000 credits
- No refund

**Option B: Immediate Downgrade with Proration**
- User immediately switches to Starter
- Gets prorated credit ($250 for unused Pro days)
- Credit applied to next invoice

**Implementation (Backend):**

Same webhook handler as upgrade, but:

```python
if new_plan != plan_type:
    # Detect if upgrade or downgrade
    plan_order = {"free": 0, "starter": 1, "growth": 2, "pro": 3}
    is_downgrade = plan_order[new_plan] < plan_order[plan_type]

    if is_downgrade:
        # User is downgrading
        monthly_credits = CREDITS_MAP.get(new_plan, 0)

        # Option: Warn user they'll lose credits
        # (This happens automatically via Stripe settings)

        res_update = (
            supabase.table("profiles")
            .update({
                "credits_remaining": monthly_credits,  # ← Lower allocation
                "plan_type": new_plan,
                # addon_credits still preserved
            })
            .eq("id", user_id)
            .execute()
        )

        res_ledger = (
            supabase.table("ledger")
            .insert({
                "user_id": user_id,
                "change": monthly_credits,  # Might be negative if user had more!
                "amount": invoice_amount,
                "reason": f"downgrade - {plan_type} → {new_plan}",
                "ts": datetime.utcnow().isoformat(),
            })
            .execute()
        )
```

**Stripe Configuration:**

```python
# When user clicks "Downgrade" button, use this Stripe API call:
stripe.Subscription.modify(
    subscription_id,
    items=[{'price': PLAN_PRICE_MAP['starter']}],
    proration_behavior='always_invoice',  # or 'create_prorations'
    billing_cycle_anchor='unchanged'       # Downgrade at period end
)
```

**Testing:**
1. Create Pro subscription
2. Downgrade to Starter via Stripe API
3. Verify subscription.schedule shows future downgrade
4. Advance test clock to period end
5. Verify webhook fires and credits reset to 2,000

---

### **TASK 3.3: Subscription Cancellation**

**Current Code (`main.py:1877-1905`):**

Already handles cancellation correctly!

```python
# customer.subscription.deleted webhook
res_update = (
    supabase.table("profiles")
    .update({
        "subscription_status": "canceled",
        "plan_type": "free",
        # ✅ Does NOT touch credits_remaining or addon_credits
    })
    .eq("id", user_id)
    .execute()
)
```

**Enhancement: Add expiration date for remaining credits**

```sql
-- Add column
ALTER TABLE profiles ADD COLUMN credits_expire_at TIMESTAMP WITH TIME ZONE;

-- Update webhook to set expiration (90 days after cancellation)
res_update = (
    supabase.table("profiles")
    .update({
        "subscription_status": "canceled",
        "plan_type": "free",
        "credits_expire_at": (datetime.utcnow() + timedelta(days=90)).isoformat()
    })
    .eq("id", user_id)
    .execute()
)
```

**Create cleanup job (similar to add-on expiration):**
```sql
-- Expire canceled users' credits after 90 days
CREATE OR REPLACE FUNCTION expire_canceled_user_credits()
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET credits_remaining = 0,
        addon_credits = 0
    WHERE subscription_status = 'canceled'
    AND credits_expire_at <= NOW()
    AND (credits_remaining > 0 OR addon_credits > 0);

    -- Log it
    INSERT INTO ledger (user_id, change, reason, ts)
    SELECT
        id,
        -(credits_remaining + addon_credits),
        'credits expired after cancellation',
        NOW()
    FROM profiles
    WHERE subscription_status = 'canceled'
    AND credits_expire_at <= NOW();
END;
$$ LANGUAGE plpgsql;
```

**Testing:**
1. Cancel subscription
2. Verify: subscription_status = "canceled", plan_type = "free"
3. Verify: credits_remaining and addon_credits PRESERVED
4. User can still process jobs until credits run out

---

## **PHASE 4: Annual Billing**

### **TASK 4.1: Create Annual Stripe Products**

**In Stripe Dashboard:**

Already covered in previous comprehensive guide. Create 3 annual products:
- Starter Annual: $470/year (price_starter_annual)
- Growth Annual: $1,430/year (price_growth_annual)
- Pro Annual: $4,790/year (price_pro_annual)

**Key Setting:** Set billing interval to `year`

---

### **TASK 4.2: Backend - Handle Annual Plans**

**Update Environment Variables:**
```bash
STRIPE_PRICE_STARTER_ANNUAL=price_xxxxx
STRIPE_PRICE_GROWTH_ANNUAL=price_xxxxx
STRIPE_PRICE_PRO_ANNUAL=price_xxxxx
```

**Update Backend (`main.py`):**

```python
# Add annual price mappings
PLAN_PRICE_MAP_ANNUAL = {
    "starter_annual": os.getenv("STRIPE_PRICE_STARTER_ANNUAL"),
    "growth_annual": os.getenv("STRIPE_PRICE_GROWTH_ANNUAL"),
    "pro_annual": os.getenv("STRIPE_PRICE_PRO_ANNUAL"),
}

# Update PRICE_TO_PLAN to include annual
PRICE_TO_PLAN = {
    # Monthly
    **{pid: plan for plan, pid in PLAN_PRICE_MAP.items() if pid},
    # Annual (map to base plan name)
    **{pid: plan.replace("_annual", "") for plan, pid in PLAN_PRICE_MAP_ANNUAL.items() if pid}
}

# Credits map stays the same (monthly allocation regardless of billing frequency)
CREDITS_MAP = {
    "starter": 2000,   # Gets 2k/month whether billed monthly or annually
    "growth": 10000,
    "pro": 40000,
}
```

**Update checkout endpoint:**
```python
@app.post("/create_checkout_session")
async def create_checkout_session(
    data: CheckoutRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    # data.plan can now be: "starter", "starter_annual", etc.

    # Determine price_id
    if "_annual" in data.plan:
        price_id = PLAN_PRICE_MAP_ANNUAL.get(data.plan)
    else:
        price_id = PLAN_PRICE_MAP.get(data.plan)

    # Rest stays the same...
```

**Webhook handling:**
- No changes needed! Annual plans fire `invoice.paid` monthly too
- Stripe subscription interval is yearly (charges once/year)
- But credits still reset monthly via invoice.paid events

**Testing:**
1. Create annual subscription ($470/year for Starter)
2. Verify immediate charge of $470
3. Wait 30 days (or use Stripe test clock)
4. Verify invoice.paid fires and credits reset to 2,000
5. Next annual charge happens at Day 365

---

### **TASK 4.3: Frontend - Annual Toggle**

**Update `billing.tsx`:**

**Add state for billing frequency:**
```tsx
const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

// Update plan configuration
const planConfigurations: PlanConfig[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49,
    yearlyPrice: 470,  // Already calculated
    // ...
  },
  // ...
];

// Dynamic price display
const displayPrice = billingCycle === "monthly"
  ? plan.monthlyPrice
  : plan.yearlyPrice;

const displayInterval = billingCycle === "monthly" ? "/month" : "/year";

const savingsText = billingCycle === "yearly"
  ? `Save $${plan.monthlyPrice * 12 - plan.yearlyPrice}`
  : null;
```

**Add toggle UI:**
```tsx
<div className="flex items-center justify-center gap-3 mb-8">
  <span className={billingCycle === "monthly" ? "font-semibold" : "text-gray-600"}>
    Monthly
  </span>
  <Switch
    checked={billingCycle === "yearly"}
    onChange={() => setBillingCycle(prev => prev === "monthly" ? "yearly" : "monthly")}
    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200"
  >
    {/* Toggle styling */}
  </Switch>
  <span className={billingCycle === "yearly" ? "font-semibold" : "text-gray-600"}>
    Yearly
    <span className="ml-2 text-green-600 text-sm">Save 20%</span>
  </span>
</div>
```

**Update checkout call:**
```tsx
const handleCheckout = async (planId: string) => {
  const planName = billingCycle === "yearly" ? `${planId}_annual` : planId;

  const res = await fetch(`${API_URL}/create_checkout_session`, {
    method: "POST",
    headers: { /* ... */ },
    body: JSON.stringify({
      plan: planName,  // "starter" or "starter_annual"
      addon: false,
      quantity: 1,
    }),
  });
  // ...
};
```

**Testing:**
1. Toggle between Monthly/Yearly
2. Verify prices update ($49 vs $470)
3. Verify savings badge shows
4. Click "Upgrade to Starter" with Yearly selected
5. Verify Stripe checkout shows $470 yearly subscription

---

## **PHASE 5: Frontend**

### **TASK 5.1: Credit Ledger / Transaction History Page**

**Create:** `/outreach-frontend/pages/billing/history.tsx`

**Features:**
- Table of all credit transactions
- Columns: Date, Description, Credits, Balance, Amount (USD)
- Filter by type (purchase, renewal, usage, expiration)
- Pagination (20 per page)
- Export to CSV

**Backend API Endpoint:**

```python
# Add to main.py
@app.get("/billing/history")
def get_billing_history(
    current_user: AuthenticatedUser = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    # Get ledger entries
    ledger_res = (
        supabase.table("ledger")
        .select("*")
        .eq("user_id", current_user.user_id)
        .order("ts", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    # Calculate running balance
    transactions = []
    for entry in ledger_res.data:
        transactions.append({
            "id": entry["id"],
            "date": entry["ts"],
            "description": entry["reason"],
            "credits": entry["change"],
            "amount_usd": entry.get("amount", 0),
        })

    return {
        "transactions": transactions,
        "total": len(ledger_res.data),
        "limit": limit,
        "offset": offset
    }
```

**Frontend Component (simplified):**
```tsx
export default function BillingHistoryPage() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/billing/history?limit=20&offset=0`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(res => res.json())
      .then(data => setTransactions(data.transactions));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Credit History</h1>

      <table className="w-full">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Credits</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id}>
              <td>{new Date(t.date).toLocaleDateString()}</td>
              <td>{t.description}</td>
              <td className={t.credits > 0 ? "text-green-600" : "text-red-600"}>
                {t.credits > 0 ? "+" : ""}{t.credits.toLocaleString()}
              </td>
              <td>${t.amount_usd.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### **TASK 5.2: Manage Subscription Page**

**Create:** `/outreach-frontend/pages/billing/manage.tsx`

**Features:**
- Current plan display
- Next billing date
- Payment method (last 4 digits)
- "Upgrade" button → redirects to `/billing` with plan selector
- "Cancel Subscription" button (with confirmation modal)

**Backend API Endpoint:**

```python
@app.get("/billing/subscription")
def get_subscription_details(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    profile = _fetch_profile(current_user.user_id)

    subscription_data = {
        "plan_type": profile.get("plan_type"),
        "subscription_status": profile.get("subscription_status"),
        "renewal_date": profile.get("renewal_date"),
        "payment_method": {
            "brand": profile.get("stripe_payment_brand"),
            "last4": profile.get("stripe_payment_last4")
        },
        "credits": {
            "monthly": profile.get("credits_remaining"),
            "addon": profile.get("addon_credits", 0),
            "total": profile.get("credits_remaining", 0) + profile.get("addon_credits", 0)
        }
    }

    # Get upcoming invoice from Stripe
    if profile.get("stripe_subscription_id"):
        try:
            upcoming = stripe.Invoice.upcoming(
                subscription=profile["stripe_subscription_id"]
            )
            subscription_data["next_invoice"] = {
                "amount": upcoming.amount_due / 100,
                "date": upcoming.period_end
            }
        except:
            pass

    return subscription_data

@app.post("/billing/cancel")
async def cancel_subscription(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    profile = _fetch_profile(current_user.user_id)
    subscription_id = profile.get("stripe_subscription_id")

    if not subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    # Cancel at period end (user keeps access until billing date)
    stripe.Subscription.modify(
        subscription_id,
        cancel_at_period_end=True
    )

    # Update profile
    supabase.table("profiles").update({
        "subscription_status": "canceling"  # New status
    }).eq("id", current_user.user_id).execute()

    return {"status": "canceled_at_period_end"}
```

---

### **TASK 5.3: Upgrade/Downgrade UI with Warnings**

**Update:** `/outreach-frontend/pages/billing.tsx`

**Add Warning Modals:**

```tsx
const [confirmModal, setConfirmModal] = useState<{
  show: boolean;
  type: 'upgrade' | 'downgrade';
  fromPlan: string;
  toPlan: string;
  creditsLost: number;
} | null>(null);

const handleCheckout = async (planId: string) => {
  const currentPlan = userInfo.plan_type;
  const planOrder = { free: 0, starter: 1, growth: 2, pro: 3 };

  if (planOrder[planId] < planOrder[currentPlan]) {
    // Downgrade warning
    const currentCredits = userInfo.credits_remaining;
    const newPlanCredits = PRICING[planId].credits;
    const creditsLost = Math.max(0, currentCredits - newPlanCredits);

    setConfirmModal({
      show: true,
      type: 'downgrade',
      fromPlan: currentPlan,
      toPlan: planId,
      creditsLost: creditsLost
    });
    return;
  } else if (planOrder[planId] > planOrder[currentPlan]) {
    // Upgrade confirmation
    setConfirmModal({
      show: true,
      type: 'upgrade',
      fromPlan: currentPlan,
      toPlan: planId,
      creditsLost: 0
    });
    return;
  }

  // Proceed with checkout...
};

// Modal component
{confirmModal?.show && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md">
      <h2 className="text-2xl font-bold mb-4">
        {confirmModal.type === 'upgrade' ? 'Confirm Upgrade' : 'Confirm Downgrade'}
      </h2>

      {confirmModal.type === 'downgrade' && confirmModal.creditsLost > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <p className="text-yellow-800 font-semibold">⚠️ Warning:</p>
          <p className="text-yellow-700 mt-2">
            You will lose {confirmModal.creditsLost.toLocaleString()} monthly credits.
            Your add-on credits will be preserved.
          </p>
        </div>
      )}

      {confirmModal.type === 'upgrade' && (
        <p className="mb-4">
          You'll be charged a prorated amount today and immediately get access to{' '}
          {PRICING[confirmModal.toPlan].credits.toLocaleString()} credits.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setConfirmModal(null)}
          className="flex-1 px-4 py-2 border rounded"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setConfirmModal(null);
            proceedWithCheckout(confirmModal.toPlan);
          }}
          className="flex-1 px-4 py-2 bg-black text-white rounded"
        >
          {confirmModal.type === 'upgrade' ? 'Upgrade Now' : 'Downgrade'}
        </button>
      </div>
    </div>
  </div>
)}
```

---

## **PHASE 6: Testing & Validation**

### **TASK 6.1: End-to-End Testing Checklist**

```markdown
## Test Checklist (Stripe Test Mode)

### Setup
- [ ] Backend has test Stripe keys
- [ ] Frontend has test publishable key
- [ ] Database has processed_stripe_events table
- [ ] addon_purchases table created
- [ ] addon_credits column added to profiles

### Test 1: New Subscription
- [ ] Sign up for Starter ($49/month)
- [ ] Verify: credits_remaining = 2,000
- [ ] Verify: addon_credits = 0
- [ ] Verify: Ledger entry: "plan purchase - starter", +2000, $49
- [ ] Verify: No duplicate entries (idempotency)

### Test 2: Monthly Renewal
- [ ] Advance Stripe test clock 30 days
- [ ] Verify: invoice.paid webhook fires
- [ ] Verify: credits_remaining RESET to 2,000 (not added)
- [ ] Verify: Ledger entry: "monthly renewal - starter", +2000, $49

### Test 3: Add-on Purchase
- [ ] Buy 5,000 add-on credits ($75)
- [ ] Verify: addon_credits = 5,000
- [ ] Verify: addon_purchases table has entry
- [ ] Verify: expires_at = 365 days from now
- [ ] Verify: Ledger entry: "addon purchase x5", +5000, $75

### Test 4: Job Processing (Monthly Credits First)
- [ ] User has 1,500 monthly + 5,000 add-on
- [ ] Process 1,000-row job
- [ ] Verify: credits_remaining = 500, addon_credits = 5,000
- [ ] Verify: Ledger: "job deduction: job-xxx (monthly)", -1000

### Test 5: Job Processing (Using Add-ons)
- [ ] User has 200 monthly + 5,000 add-on
- [ ] Process 1,000-row job
- [ ] Verify: credits_remaining = 0, addon_credits = 4,200
- [ ] Verify: Ledger: "job deduction: job-xxx (monthly+addon)", -1000

### Test 6: Monthly Renewal (Preserve Add-ons)
- [ ] User has 0 monthly + 4,200 add-on
- [ ] Advance test clock 30 days
- [ ] Verify: credits_remaining = 2,000, addon_credits = 4,200 (PRESERVED!)
- [ ] Verify: Ledger: "monthly renewal - starter", +2000

### Test 7: Mid-Cycle Upgrade
- [ ] Starter user (500 monthly remaining)
- [ ] Upgrade to Pro ($499)
- [ ] Verify: Immediate charge ~$450 (prorated)
- [ ] Verify: credits_remaining = 40,000
- [ ] Verify: addon_credits preserved
- [ ] Verify: Ledger: "upgrade - starter → pro", +40000

### Test 8: Mid-Cycle Downgrade
- [ ] Pro user (30,000 monthly remaining)
- [ ] Downgrade to Starter
- [ ] Verify: credits_remaining = 2,000 (lost 28k)
- [ ] Verify: addon_credits preserved
- [ ] Verify: Ledger: "downgrade - pro → starter", +2000

### Test 9: Subscription Cancellation
- [ ] Cancel subscription
- [ ] Verify: subscription_status = "canceled"
- [ ] Verify: plan_type = "free"
- [ ] Verify: credits_remaining and addon_credits PRESERVED
- [ ] User can still process jobs

### Test 10: Add-on Expiration
- [ ] Manually insert expired add-on (purchased 400 days ago)
- [ ] Run expiration function
- [ ] Verify: addon_credits decreased
- [ ] Verify: addon_purchases.credits_remaining = 0
- [ ] Verify: Ledger: "addon credits expired", -1000

### Test 11: Annual Billing
- [ ] Sign up for Starter Annual ($470/year)
- [ ] Verify: Immediate charge $470
- [ ] Verify: credits_remaining = 2,000
- [ ] Advance test clock 30 days
- [ ] Verify: Credits reset to 2,000 (monthly reset even on annual)
- [ ] Advance test clock to Day 365
- [ ] Verify: Next annual charge $470

### Test 12: Frontend
- [ ] Billing history page shows all transactions
- [ ] Manage subscription page shows current plan
- [ ] Upgrade modal shows warnings
- [ ] Downgrade modal warns about lost credits
- [ ] Annual toggle updates prices correctly
```

---

## SUMMARY: IMPLEMENTATION ORDER

**Week 1: Foundation (Critical)**
1. Fix Pro plan bug (5 min)
2. Add addon_credits column + migration (30 min)
3. Create addon_purchases table (30 min)
4. Update credit deduction logic (2 hours)
5. Test thoroughly (2 hours)

**Week 2: Subscription Logic**
6. Fix monthly reset to preserve add-ons (1 hour)
7. Implement add-on expiration (2 hours)
8. Test upgrade/downgrade flows (2 hours)
9. Enhance cancellation handling (1 hour)

**Week 3: Annual Billing**
10. Create annual Stripe products (30 min)
11. Update backend for annual plans (1 hour)
12. Add annual toggle to frontend (1 hour)
13. Test annual billing (1 hour)

**Week 4: Frontend Polish**
14. Build credit history page (3 hours)
15. Build manage subscription page (3 hours)
16. Add upgrade/downgrade warnings (2 hours)
17. End-to-end testing (4 hours)

**Total: ~28 hours over 4 weeks**

---

You now have a complete roadmap. Which task would you like to tackle first?
