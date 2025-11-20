# Billing & Credit Logic Issues - Comprehensive Analysis
## Generated: 2025-11-19

---

## EXECUTIVE SUMMARY

This document provides a comprehensive analysis of billing and credit logic issues in the personalizedLine codebase. Issues are categorized by severity (CRITICAL, HIGH, MEDIUM, LOW) and include specific scenarios where problems occur.

**Overall Assessment**: The billing system has solid foundations with atomic operations and idempotency protection, but contains several critical bugs that could result in incorrect credit allocation, lost revenue, or poor user experience.

---

## TABLE OF CONTENTS

1. [Critical Issues](#critical-issues)
2. [High Priority Issues](#high-priority-issues)
3. [Medium Priority Issues](#medium-priority-issues)
4. [Low Priority Issues](#low-priority-issues)
5. [Business Logic Concerns](#business-logic-concerns)
6. [Scenario Testing Results](#scenario-testing-results)
7. [Recommendations](#recommendations)

---

## CRITICAL ISSUES

### 🔴 ISSUE #1: Credit Deduction Breakdown Not Stored (Data Loss Risk)

**Location**: `backend/app/main.py:1108-1162` (credit reservation) vs `backend/app/jobs.py:431-437` (refund logic)

**Problem**: When credits are deducted during job creation, the code calculates which buckets were used (monthly vs addon), but **never stores this breakdown** in the job's `meta_json`. However, the refund logic expects to find `monthly_deducted` and `addon_deducted` in the metadata.

**Code Evidence**:

```python
# main.py:1108-1119 - Deduction logic
if credits_remaining >= row_count:
    new_monthly = credits_remaining - row_count
    new_addon = addon_credits
    deduction_source = "monthly"
else:
    remaining_needed = row_count - credits_remaining
    new_monthly = 0
    new_addon = addon_credits - remaining_needed
    deduction_source = "monthly+addon"

# meta.update at line 1257-1262 - MISSING breakdown!
meta.update({
    "credit_cost": row_count,
    "credits_deducted": True,
    "credits_refunded": False,
})
# ❌ Should also store: monthly_deducted, addon_deducted
```

```python
# jobs.py:431-437 - Refund logic expects breakdown
monthly_deducted = meta.get("monthly_deducted", 0)
addon_deducted = meta.get("addon_deducted", 0)

# If no breakdown available (legacy jobs), refund all to monthly bucket
if monthly_deducted == 0 and addon_deducted == 0:
    monthly_deducted = cost  # ❌ Wrong bucket restoration!
    addon_deducted = 0
```

**Impact**:
- **Scenario 1**: User has 500 monthly + 5000 addon credits, creates job with 2000 rows
  - Deduction: 500 from monthly, 1500 from addon
  - Job fails → Refund: 2000 to monthly, 0 to addon ❌
  - **Result**: User loses 1500 addon credits permanently

- **Scenario 2**: User has 1000 monthly + 10000 addon credits, creates job with 500 rows
  - Deduction: 500 from monthly, 0 from addon
  - Job fails → Refund: 500 to monthly ✅
  - **Result**: Correct by accident (no addon used)

**Financial Impact**: Medium-High (users lose purchased addon credits)

**Fix Required**:
```python
# In main.py after line 1119, calculate breakdown:
if credits_remaining >= row_count:
    monthly_deducted = row_count
    addon_deducted = 0
else:
    monthly_deducted = credits_remaining
    addon_deducted = row_count - credits_remaining

# Store in meta_json:
meta.update({
    "credit_cost": row_count,
    "credits_deducted": True,
    "credits_refunded": False,
    "monthly_deducted": monthly_deducted,
    "addon_deducted": addon_deducted,
})
```

---

### 🔴 ISSUE #2: Preview Generation Ignores Addon Credits

**Location**: `backend/app/main.py:1500-1571`

**Problem**: The `/preview/generate` endpoint only checks and deducts from `credits_remaining` (monthly bucket), completely ignoring `addon_credits`. This creates an inconsistent user experience.

**Code Evidence**:

```python
# Line 1509-1510 - Only selects monthly credits
profile_res = (
    supabase_client.table("profiles")
    .select("credits_remaining")  # ❌ Missing addon_credits
    .eq("id", user_id)
    .limit(1)
    .execute()
)

# Line 1521 - Only checks monthly
if credits_remaining < 1:
    raise HTTPException(
        status_code=402,
        detail={
            "error": "insufficient_credits",
            "credits_remaining": credits_remaining,  # ❌ Should be total
            "message": "You need at least 1 credit to generate a preview"
        }
    )

# Line 1531 - Only deducts from monthly
new_balance = credits_remaining - 1
update_res = (
    supabase_client.table("profiles")
    .update({"credits_remaining": new_balance})  # ❌ Doesn't use addon
    .eq("id", user_id)
    .eq("credits_remaining", credits_remaining)
    .execute()
)
```

**Impact**:
- **Scenario 1**: User has 0 monthly, 5000 addon credits
  - Tries to generate preview
  - **Result**: "Insufficient credits" error ❌
  - **Expected**: Should deduct 1 from addon credits

- **Scenario 2**: User upgrades mid-month, uses all monthly credits
  - Has 10000 addon credits remaining
  - Cannot preview any emails despite having credits
  - **Result**: Poor UX, support tickets

**Comparison**: Job processing (`/jobs`) correctly uses two-bucket system at line 1108-1119

**Fix Required**:
```python
# Select both buckets
.select("credits_remaining, addon_credits")

# Check total
total_credits = credits_remaining + addon_credits
if total_credits < 1:
    raise HTTPException(...)

# Deduct using same two-bucket logic as job processing
if credits_remaining >= 1:
    new_monthly = credits_remaining - 1
    new_addon = addon_credits
else:
    new_monthly = 0
    new_addon = addon_credits - 1

.update({
    "credits_remaining": new_monthly,
    "addon_credits": new_addon
})
```

---

### 🔴 ISSUE #3: Annual → Monthly Mid-Year Transition Logic Missing

**Location**: `backend/app/main.py:2033-2151` (checkout.session.completed webhook)

**Problem**: When a user on an annual plan switches to a monthly plan (or vice versa) mid-year, there's no logic to handle the credit transition or prorated refund.

**Code Evidence**:

```python
# Line 2091-2127 - Checkout completion
base_plan = plan.replace("_annual", "") if plan.endswith("_annual") else plan
is_annual = plan.endswith("_annual")

if is_annual:
    credits = ANNUAL_CREDITS_MAP.get(base_plan, 0)  # 24,000 for starter
else:
    credits = CREDITS_MAP.get(base_plan, 0)  # 2,000 for starter

res_update = (
    supabase.table("profiles")
    .update({
        "plan_type": base_plan,
        "subscription_status": "active",
        "renewal_date": renewal_date,
        "credits_remaining": credits,  # ❌ Overwrites existing credits!
    })
    .eq("id", user_id)
    .execute()
)
```

**Impact**:
- **Scenario 1**: User on Starter Annual (24,000 credits upfront)
  - 6 months in, used 10,000 credits (14,000 remaining)
  - Upgrades to Growth Monthly (10,000/month)
  - **Result**: Credits reset to 10,000 (loses 14,000 credits) ❌

- **Scenario 2**: User on Growth Monthly (10,000/month)
  - Mid-month with 5,000 remaining
  - Upgrades to Growth Annual (120,000 upfront)
  - **Result**: Gets full 120,000 despite only having paid monthly prorated ❌

**Business Impact**: High (financial loss from credit manipulation or customer churn)

**Fix Required**:
- Add `billing_frequency` column to profiles table ("monthly" | "annual")
- Check existing billing frequency during plan changes
- Implement prorated credit calculation or prevent mid-cycle frequency changes
- Add UI warning: "Annual plan changes require contacting support"

---

### 🔴 ISSUE #4: Upgrade Credits Added to Existing Balance (Double Allocation)

**Location**: `backend/app/main.py:2329-2332` (customer.subscription.updated webhook)

**Problem**: When a user upgrades, the webhook adds the **full monthly allocation** of the new plan to their existing credits. This creates a windfall for users who upgrade strategically.

**Code Evidence**:

```python
# Line 2329-2332 - UPGRADE logic
if new_plan_credits > old_plan_credits:
    # Add new plan's full credit allocation to existing credits
    updated_credits = current_credits + new_plan_credits
```

**Impact**:
- **Scenario 1**: User on Starter (2,000/month)
  - Day 1 of billing cycle, has 2,000 credits
  - Immediately upgrades to Growth (10,000/month)
  - **Result**: Gets 2,000 + 10,000 = 12,000 credits for first month ❌
  - **Expected**: Should get 10,000 credits total (prorated)

- **Scenario 2**: User on Growth (10,000/month)
  - Day 29 of billing cycle, has used 9,500 (500 remaining)
  - Upgrades to Pro (40,000/month)
  - **Result**: Gets 500 + 40,000 = 40,500 credits ❌
  - Next renewal: Gets another 40,000 credits (resets to 40,000)
  - **Total in 2 months**: 80,500 instead of 80,000

**Exploit Potential**: Medium (users can time upgrades for extra credits)

**Business Logic Question**: Is this intentional goodwill or a bug?
- If intentional: Should be documented clearly
- If bug: Should use `max(current_credits, new_plan_credits)` instead of addition

**Alternative Fix**:
```python
# Option A: Replace (cleaner)
updated_credits = new_plan_credits

# Option B: Preserve excess (fair)
if current_credits > new_plan_credits:
    # User has more than new monthly allocation (probably used addons)
    updated_credits = current_credits + (new_plan_credits - old_plan_credits)
else:
    # User has less than new allocation (normal case)
    updated_credits = new_plan_credits
```

---

## HIGH PRIORITY ISSUES

### 🟠 ISSUE #5: No Billing Frequency Tracking

**Location**: Multiple files, database schema

**Problem**: The system stores `plan_type` (e.g., "starter") but not whether the user is on monthly or annual billing. This is derived from Stripe subscription data, which is fragile.

**Code Evidence**:

```python
# Line 2120 - Stores only base plan name
"plan_type": base_plan,  # "starter" for both monthly and annual

# Line 2196-2198 - Has to query Stripe subscription to determine frequency
subscription_interval = subscription.get("items", {}).get("data", [])[0].get("plan", {}).get("interval")
is_annual_subscription = subscription_interval == "year"
```

**Impact**:
- **Scenario 1**: Stripe webhook fails or is delayed
  - System doesn't know if user is annual or monthly
  - Monthly renewal webhook fires → Credits reset incorrectly for annual users
  - **Result**: Annual user loses all unused credits

- **Scenario 2**: Database query optimization
  - Need to know which users are annual vs monthly
  - **Current**: Must query Stripe API for every user (slow, rate limits)
  - **Expected**: Simple SQL query on profiles table

**Fix Required**:
```sql
-- Add column
ALTER TABLE profiles
ADD COLUMN billing_frequency TEXT DEFAULT 'monthly'
CHECK (billing_frequency IN ('monthly', 'annual'));

-- Update on checkout
UPDATE profiles
SET billing_frequency = 'annual'
WHERE ...
```

---

### 🟠 ISSUE #6: Addon Credits Have No Expiration Tracking

**Location**: Database schema, `backend/app/main.py:2047-2086` (addon purchase)

**Problem**: According to `CREDIT_SYSTEM_IMPLEMENTATION_PLAN.md`, addon credits should expire after 12 months. However, there's no expiration tracking implemented.

**Code Evidence**:

```python
# Line 2060 - Simple addition, no expiration
new_addon_total = (current_addon or 0) + credits

# Database schema - No expiration columns
addon_credits (INT)  # ❌ Should have addon_credits_expire_at
```

**Impact**:
- **Scenario 1**: User buys 50,000 addon credits on Jan 1, 2024
  - Never uses them
  - Jan 1, 2025: Should expire
  - **Result**: Credits remain available forever ❌
  - **Business Impact**: Lost revenue (users can "bank" credits indefinitely)

- **Scenario 2**: Auditing and compliance
  - Finance team needs to know liability from unexpired credits
  - **Current**: Cannot query, must assume all credits are valid
  - **Result**: Inaccurate financial reporting

**Fix Required**:
```sql
-- Create addon purchases tracking table
CREATE TABLE addon_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    credits INT NOT NULL,
    credits_remaining INT NOT NULL,
    purchased_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,  -- 12 months from purchase
    stripe_session_id TEXT
);

-- Daily cron job to expire old credits
-- Deduct from addon_credits where expires_at < NOW()
```

---

### 🟠 ISSUE #7: Rollback Function Incomplete (Two-Bucket Issue)

**Location**: `backend/app/main.py:1168-1188` (_rollback_credit_reservation)

**Problem**: The rollback function only restores to `credits_remaining` (monthly bucket), ignoring the possibility that addon credits were also deducted.

**Code Evidence**:

```python
# Line 1175-1177
supabase_client.table("profiles").update(
    {"credits_remaining": reservation["previous_balance"]}  # ❌ Only monthly!
).eq("id", user_id).eq("credits_remaining", reservation["new_balance"]).execute()
```

**Impact**:
- **Scenario**: User has 100 monthly + 5000 addon
  - Tries to create 200-row job
  - Credit deduction succeeds: 100 from monthly, 100 from addon
  - Job creation fails (e.g., file path error)
  - Rollback executes
  - **Result**: Restores 200 to monthly, addon remains at 4900 ❌
  - **User loses**: 100 addon credits

**Fix Required**:
```python
# Rollback needs to store breakdown
def _rollback_credit_reservation(
    supabase_client,
    user_id: str,
    reservation: Dict[str, int],
    job_id: str,
    monthly_deducted: int,
    addon_deducted: int,
):
    # Restore both buckets
    supabase_client.table("profiles").update({
        "credits_remaining": current_monthly + monthly_deducted,
        "addon_credits": current_addon + addon_deducted
    }).eq("id", user_id).execute()
```

---

### 🟠 ISSUE #8: Plan Type Collision (Annual Plans Mapped to Base Names)

**Location**: `backend/app/main.py:110-114`

**Problem**: Both `PLAN_PRICE_MAP` and `PLAN_PRICE_MAP_ANNUAL` map to the same base plan names in `PRICE_TO_PLAN`. This creates ambiguity.

**Code Evidence**:

```python
# Line 110-114
PRICE_TO_PLAN = {
    **{pid: plan for plan, pid in PLAN_PRICE_MAP.items() if pid},
    **{pid: plan.replace("_annual", "") for plan, pid in PLAN_PRICE_MAP_ANNUAL.items() if pid}
    # Both "starter" monthly and "starter_annual" map to "starter" ❌
}
```

**Impact**:
- **Scenario**: Given a price_id, cannot determine if it's monthly or annual
  - `PRICE_TO_PLAN["price_xxx123"] = "starter"`
  - Is this monthly or annual? Unknown!
  - **Result**: Must query Stripe API to check, adding latency

**Fix**: Either keep `_annual` suffix in plan_type or add separate mapping:
```python
PRICE_TO_PLAN_WITH_FREQUENCY = {
    pid: plan for plan, pid in PLAN_PRICE_MAP.items()
}
PRICE_TO_PLAN_WITH_FREQUENCY.update({
    pid: plan for plan, pid in PLAN_PRICE_MAP_ANNUAL.items()
})
# Now: price_xxx123 → "starter_annual"
```

---

## MEDIUM PRIORITY ISSUES

### 🟡 ISSUE #9: Invoice.paid Upgrade Skip Logic Fragile

**Location**: `backend/app/main.py:2232-2241`

**Problem**: The code skips credit reset for upgrades assuming `customer.subscription.updated` already handled it. But if that webhook fails or arrives out of order, credits won't be allocated.

**Code Evidence**:

```python
# Line 2232-2241
if monthly_credits > old_monthly_credits:
    # UPGRADE: Credits already added by customer.subscription.updated
    # Skip credit reset to avoid overwriting the added credits
    should_reset_credits = False
    print(f"[INVOICE_UPGRADE] Skipping credit reset for upgrade")
```

**Impact**:
- **Scenario**: User upgrades from Starter to Growth
  - Stripe fires `customer.subscription.updated` webhook
  - Webhook fails (network error, server restart)
  - Later, `invoice.paid` webhook fires
  - **Result**: No credits allocated, user stuck with old plan credits ❌

**Fix**: Make `invoice.paid` idempotent - always set credits correctly regardless of previous webhooks:
```python
# Always set to correct amount on invoice.paid
res_update = (
    supabase.table("profiles")
    .update({
        "credits_remaining": monthly_credits,
        "plan_type": plan_type,
    })
    .eq("id", user_id)
    .execute()
)
```

---

### 🟡 ISSUE #10: No Validation for Same-Plan Upgrades

**Location**: `backend/app/main.py:811-907` (/subscription/upgrade)

**Problem**: Backend doesn't prevent user from "upgrading" to their current plan, wasting API calls and creating confusing ledger entries.

**Code Evidence**:

```python
# Line 853-858
if new_credits <= current_credits:
    raise HTTPException(status_code=400, detail="Can only upgrade to a higher plan")
```

**Impact**:
- **Scenario**: User on Growth (10,000 credits)
  - Tries to "upgrade" to Growth
  - **Current**: 10,000 ≤ 10,000 → Error "Can only upgrade to a higher plan"
  - **Better**: Check plan_type first: "You're already on Growth"

**Fix**:
```python
if plan == current_plan:
    raise HTTPException(
        status_code=400,
        detail=f"You are already subscribed to the {plan.capitalize()} plan"
    )
```

---

### 🟡 ISSUE #11: Cancellation Preserves Credits Indefinitely

**Location**: `backend/app/main.py:2383-2410` (customer.subscription.deleted webhook)

**Problem**: When a subscription is canceled, credits remain available forever. Users can continue processing jobs without paying.

**Code Evidence**:

```python
# Line 2395-2404
res_update = (
    supabase.table("profiles")
    .update({
        "subscription_status": "canceled",
        "plan_type": "free",
        # ❌ Does NOT zero out credits_remaining or addon_credits
    })
    .eq("id", user_id)
    .execute()
)
```

**Impact**:
- **Scenario**: User on Pro (40,000/month)
  - Day 1: Cancels subscription
  - Still has 40,000 credits
  - Processes 40,000 jobs over next 3 months
  - **Result**: Free usage worth $499/month for 3 months

**Business Logic Decision Required**:
- Option A: Zero out credits immediately on cancellation (harsh)
- Option B: Set expiration date (e.g., 30 days grace period)
- Option C: Set credits to free tier amount (500) immediately

**Current Spec**: `CREDIT_SYSTEM_IMPLEMENTATION_PLAN.md` suggests preserving credits, but no expiration mentioned

---

### 🟡 ISSUE #12: Missing Payment Failure Handling

**Location**: `backend/app/main.py:1947-2421` (stripe webhook)

**Problem**: No webhook handler for `invoice.payment_failed` or `payment_intent.payment_failed`. Users with failed renewals keep access.

**Code Evidence**:

```python
# Line 176-197 - STRIPE_SYNC_EVENTS includes payment_failed events
"invoice.payment_failed",
"payment_intent.payment_failed",

# But no handler in webhook function!
if event_type == "checkout.session.completed":
    ...
elif event_type == "invoice.paid":
    ...
elif event_type == "customer.subscription.updated":
    ...
elif event_type == "customer.subscription.deleted":
    ...
# ❌ No handler for payment failures
```

**Impact**:
- **Scenario**: User's credit card expires
  - Monthly renewal invoice created
  - Payment fails
  - **Result**: User keeps access and credits ❌
  - After several retry attempts, Stripe eventually cancels subscription
  - User got 2-3 weeks of free usage

**Fix Required**:
```python
elif event_type == "invoice.payment_failed":
    # Suspend account or reduce credits to free tier
    # Send email notification
    # Log for collections team
```

---

## LOW PRIORITY ISSUES

### 🔵 ISSUE #13: Ledger Table Growth Unbounded

**Location**: Database schema, all ledger insert operations

**Problem**: Every credit operation inserts into `ledger` table with no archival or partitioning strategy. Over time, this will impact query performance.

**Impact**:
- **Scenario**: 10,000 active users, avg 50 transactions/user/month
  - 500,000 rows/month
  - After 2 years: 12 million rows
  - `/account/ledger` endpoint becomes slow
  - Database backup size grows significantly

**Fix**: Implement table partitioning by date or archive strategy
```sql
-- Partition by month
CREATE TABLE ledger_2025_01 PARTITION OF ledger
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Or periodic archival
INSERT INTO ledger_archive SELECT * FROM ledger WHERE ts < NOW() - INTERVAL '1 year';
DELETE FROM ledger WHERE ts < NOW() - INTERVAL '1 year';
```

---

### 🔵 ISSUE #14: Redis Lock Timeout Too Long

**Location**: `backend/app/main.py:1244` (credit reservation lock)

**Problem**: Lock timeout is 30 seconds with 10-second blocking timeout. This is excessive for a simple credit check.

**Code Evidence**:

```python
# Line 1244
lock = redis_conn.lock(lock_name, timeout=30, blocking_timeout=10)
```

**Impact**:
- If a request hangs, subsequent requests from same user are blocked for 10 seconds
- Under high load, users experience long delays
- **Better**: timeout=5, blocking_timeout=3

---

### 🔵 ISSUE #15: No Rate Limiting on Checkout Endpoint

**Location**: `backend/app/main.py:1821-1915` (/create_checkout_session)

**Problem**: No rate limiting on checkout session creation. Could be abused to create spam Stripe sessions.

**Impact**:
- Malicious user could spam endpoint
- Creates thousands of unpaid Stripe sessions
- Stripe may flag account
- **Fix**: Add rate limit: 5 checkouts per user per 10 minutes

---

## BUSINESS LOGIC CONCERNS

### 📊 CONCERN #1: Annual Plan Monthly Invoices

**Location**: `backend/app/main.py:2196-2206`

**Observation**: Code comments indicate that `invoice.paid` fires monthly even for annual plans. This is unusual.

**Code Evidence**:

```python
# Line 2200-2206
if is_annual_subscription:
    print(
        f"[INVOICE] Annual subscription detected for user {user_id}. "
        f"Skipping credit reset (credits allocated upfront at purchase)."
    )
    # Annual subscriptions don't get monthly credit resets
```

**Question**: Why does Stripe fire `invoice.paid` monthly for annual subscriptions?
- Stripe annual subscriptions typically only fire once per year
- **Possible cause**: Subscription is set up with monthly interval but annual price
- **Recommendation**: Verify Stripe subscription configuration

---

### 📊 CONCERN #2: No Minimum Purchase Amount

**Location**: `backend/app/main.py:1843-1855` (addon checkout)

**Observation**: Users can buy single addon units (1000 credits). No minimum purchase.

**Impact**:
- Stripe transaction fee: $0.30 + 2.9%
- For $13 purchase (Growth addon 1000 credits): fee = $0.68 (5.2%)
- For $11 purchase (Pro addon 1000 credits): fee = $0.62 (5.6%)
- **Recommendation**: Set minimum addon purchase (e.g., 5000 credits) to reduce transaction fee percentage

---

### 📊 CONCERN #3: Upgrade Credit Allocation Policy Unclear

**Location**: `backend/app/main.py:2329-2332`

**Question**: Is the current upgrade behavior (adding credits) intentional or a bug?

**Current Behavior**: Starter user with 1,800 credits upgrades to Growth → Gets 11,800 credits

**Alternative Policies**:
- **A. Reset to new plan** (most common): User gets 10,000 credits
- **B. Preserve if higher** (fair): User gets max(1,800, 10,000) = 10,000
- **C. Add difference** (generous): User gets 1,800 + (10,000 - 2,000) = 9,800
- **D. Add full (current)**: User gets 1,800 + 10,000 = 11,800 ✓

**Recommendation**: Document intended behavior clearly and validate with business team

---

## SCENARIO TESTING RESULTS

### Test Scenario Matrix

| # | Scenario | Current Behavior | Expected Behavior | Status |
|---|----------|------------------|-------------------|--------|
| 1 | New monthly subscription | ✅ Correct | ✅ 2,000 credits | PASS |
| 2 | New annual subscription | ✅ Correct | ✅ 24,000 credits | PASS |
| 3 | Monthly renewal (monthly plan) | ✅ Correct | ✅ Reset to 2,000 | PASS |
| 4 | Monthly renewal (annual plan) | ✅ Correct | ✅ Skip reset | PASS |
| 5 | Addon purchase | ✅ Correct | ✅ Add to addon bucket | PASS |
| 6 | Job with monthly credits only | ✅ Correct | ✅ Deduct from monthly | PASS |
| 7 | Job with mixed credits | ✅ Correct | ✅ Deduct monthly first | PASS |
| 8 | Job failure refund (monthly only) | ✅ Correct | ✅ Refund to monthly | PASS |
| 9 | **Job failure refund (mixed)** | ❌ **FAIL** | ⚠️ Refund to both buckets | **ISSUE #1** |
| 10 | **Preview with addon credits only** | ❌ **FAIL** | ⚠️ Should succeed | **ISSUE #2** |
| 11 | **Upgrade Starter→Growth** | ⚠️ **UNCLEAR** | ❓ Policy undefined | **CONCERN #3** |
| 12 | **Annual→Monthly mid-year** | ❌ **FAIL** | ⚠️ Prorated credits | **ISSUE #3** |
| 13 | Downgrade at renewal | ⚠️ Untested | ✅ Reset to lower amount | NEEDS TEST |
| 14 | Cancellation | ⚠️ Credits persist | ❓ Policy undefined | **ISSUE #11** |
| 15 | Failed payment | ❌ No handler | ⚠️ Suspend account | **ISSUE #12** |

---

## RECOMMENDATIONS

### Immediate Actions (This Sprint)

1. **FIX ISSUE #1**: Store `monthly_deducted` and `addon_deducted` in job metadata
2. **FIX ISSUE #2**: Make preview generation use two-bucket credit system
3. **ADD ISSUE #5**: Add `billing_frequency` column to profiles table
4. **CLARIFY CONCERN #3**: Document and validate upgrade credit policy with business team

### Short-term (Next 2 Sprints)

5. **FIX ISSUE #3**: Add logic for annual↔monthly transitions
6. **FIX ISSUE #7**: Update rollback function to handle two buckets
7. **ADD ISSUE #12**: Implement payment failure webhook handlers
8. **FIX ISSUE #6**: Implement addon credit expiration tracking

### Long-term (Next Quarter)

9. **FIX ISSUE #13**: Implement ledger table partitioning/archival
10. **ADD ISSUE #15**: Add rate limiting to checkout endpoints
11. **REVIEW CONCERN #1**: Verify Stripe annual subscription configuration
12. **POLICY CONCERN #2**: Set minimum addon purchase amounts
13. **POLICY ISSUE #11**: Define credit expiration policy for canceled users

### Testing & Monitoring

14. **Add integration tests** for all scenario matrix items
15. **Set up Sentry alerts** for credit operation failures
16. **Create dashboard** for credit operations (allocations, refunds, expirations)
17. **Quarterly audit** of ledger transactions vs Stripe revenue

---

## APPENDIX: Code Locations Reference

### Credit Allocation
- Monthly subscription: `main.py:2112-2114`
- Annual subscription: `main.py:2109-2111`
- Addon purchase: `main.py:2047-2086`
- Monthly renewal: `main.py:2250-2276`
- Upgrade: `main.py:2329-2362`

### Credit Deduction
- Job creation: `main.py:1067-1166`
- Preview generation: `main.py:1500-1571`
- Refund: `jobs.py:401-500`

### Stripe Webhooks
- checkout.session.completed: `main.py:2033-2151`
- invoice.paid: `main.py:2154-2289`
- customer.subscription.updated: `main.py:2291-2381`
- customer.subscription.deleted: `main.py:2383-2410`

### Database Schema
- profiles table: `CREDIT_SYSTEM_QUICK_REF.md`
- ledger table: `CREDIT_SYSTEM_QUICK_REF.md`
- jobs table: `CREDIT_SYSTEM_QUICK_REF.md`

---

## SEVERITY DEFINITIONS

- 🔴 **CRITICAL**: Data loss, financial loss, or security vulnerability
- 🟠 **HIGH**: Incorrect billing, poor UX, or moderate financial impact
- 🟡 **MEDIUM**: Edge cases, performance issues, or maintenance concerns
- 🔵 **LOW**: Nice-to-have improvements or minor optimizations
- 📊 **CONCERN**: Business logic clarification needed

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Reviewed By**: AI Analysis System
**Next Review**: After implementing critical fixes
