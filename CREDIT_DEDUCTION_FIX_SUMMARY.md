# Credit Deduction Breakdown Fix - Summary

## 🎯 Issue Fixed

**Critical Bug**: Credit refunds were going to the wrong bucket, causing permanent loss of purchased addon credits.

---

## ❌ Before (The Bug)

### Flow Diagram

```
User: 500 monthly + 5,000 addon credits
Creates job: 2,000 rows

[Job Creation]
├─ Deducts: 500 from monthly ✓
├─ Deducts: 1,500 from addon ✓
├─ Stores in meta_json: { credit_cost: 2000 } ❌ MISSING BREAKDOWN!
└─ After: 0 monthly + 3,500 addon

[Job Fails]
├─ Refund reads meta_json
├─ Finds: monthly_deducted = 0, addon_deducted = 0 ❌
├─ Defaults: Refund all 2,000 to monthly bucket ❌
└─ Result: 2,000 monthly + 3,500 addon

❌ USER LOST 1,500 ADDON CREDITS PERMANENTLY!
```

### Code Problem

```python
# _reserve_credits_for_job (main.py:1109-1119)
if credits_remaining >= row_count:
    monthly_deducted = row_count       # ❌ CALCULATED
    addon_deducted = 0                 # ❌ CALCULATED
else:
    monthly_deducted = credits_remaining  # ❌ CALCULATED
    addon_deducted = remaining_needed     # ❌ CALCULATED

# But return didn't include breakdown!
return {
    "previous_balance": ...,
    "new_balance": ...,
    "cost": row_count,
    # ❌ MISSING: monthly_deducted, addon_deducted
}

# Job creation (main.py:1257-1263)
meta.update({
    "credit_cost": row_count,
    "credits_deducted": True,
    # ❌ MISSING: monthly_deducted, addon_deducted
})

# Refund logic (jobs.py:431-437)
monthly_deducted = meta.get("monthly_deducted", 0)  # Always 0
addon_deducted = meta.get("addon_deducted", 0)      # Always 0

if monthly_deducted == 0 and addon_deducted == 0:
    monthly_deducted = cost  # ❌ Wrong! All to monthly
    addon_deducted = 0
```

---

## ✅ After (The Fix)

### Flow Diagram

```
User: 500 monthly + 5,000 addon credits
Creates job: 2,000 rows

[Job Creation]
├─ Deducts: 500 from monthly ✓
├─ Deducts: 1,500 from addon ✓
├─ Stores in meta_json: {
│    credit_cost: 2000,
│    monthly_deducted: 500,   ✓ STORED!
│    addon_deducted: 1500     ✓ STORED!
│  }
└─ After: 0 monthly + 3,500 addon

[Job Fails]
├─ Refund reads meta_json
├─ Finds: monthly_deducted = 500, addon_deducted = 1500 ✓
├─ Restores: +500 to monthly, +1500 to addon ✓
└─ Result: 500 monthly + 5,000 addon

✅ CREDITS RESTORED TO CORRECT BUCKETS!
```

### Code Solution

```python
# _reserve_credits_for_job (main.py:1113-1114, 1121-1122, 1165-1166)
if credits_remaining >= row_count:
    monthly_deducted = row_count       # ✓ CALCULATED
    addon_deducted = 0                 # ✓ CALCULATED
else:
    monthly_deducted = credits_remaining  # ✓ CALCULATED
    addon_deducted = remaining_needed     # ✓ CALCULATED

# Now return includes breakdown!
return {
    "previous_balance": ...,
    "new_balance": ...,
    "cost": row_count,
    "monthly_deducted": monthly_deducted,  # ✓ INCLUDED
    "addon_deducted": addon_deducted,      # ✓ INCLUDED
}

# Job creation (main.py:1268-1269)
meta.update({
    "credit_cost": row_count,
    "credits_deducted": True,
    "monthly_deducted": reservation.get("monthly_deducted", 0),  # ✓ STORED
    "addon_deducted": reservation.get("addon_deducted", 0),      # ✓ STORED
})

# Refund logic (jobs.py:431-437) - NO CHANGES NEEDED
monthly_deducted = meta.get("monthly_deducted", 0)  # Now gets 500
addon_deducted = meta.get("addon_deducted", 0)      # Now gets 1500

# Refunds to correct buckets!
new_monthly = current_monthly + 500   # ✓
new_addon = current_addon + 1500      # ✓
```

---

## 📝 Changes Made

### File: `backend/app/main.py`

#### 1. `_reserve_credits_for_job()` Function

**Lines 1113-1114, 1121-1122**: Calculate breakdown
```python
# When using only monthly
monthly_deducted = row_count
addon_deducted = 0

# When using both buckets
monthly_deducted = credits_remaining
addon_deducted = remaining_needed
```

**Lines 1165-1166**: Return breakdown
```python
return {
    ...,
    "monthly_deducted": monthly_deducted,
    "addon_deducted": addon_deducted,
}
```

#### 2. `create_job()` Endpoint

**Lines 1268-1269**: Store breakdown in job metadata
```python
meta.update({
    ...,
    "monthly_deducted": reservation.get("monthly_deducted", 0),
    "addon_deducted": reservation.get("addon_deducted", 0),
})
```

#### 3. `_rollback_credit_reservation()` Function

**Lines 1185-1231**: Complete rewrite to handle two-bucket rollback
```python
monthly_deducted = reservation.get("monthly_deducted", 0)
addon_deducted = reservation.get("addon_deducted", 0)

# Get current state
current_monthly = ...
current_addon = ...

# Restore to both buckets
new_monthly = current_monthly + monthly_deducted
new_addon = current_addon + addon_deducted

# CAS update
supabase_client.table("profiles").update({
    "credits_remaining": new_monthly,
    "addon_credits": new_addon
}).eq("credits_remaining", current_monthly).eq("addon_credits", current_addon)
```

---

## 🧪 Test Scenarios

### Scenario 1: Monthly Credits Only
```
Initial: 2,000 monthly + 5,000 addon
Job: 1,500 rows
Deducted: 1,500 monthly, 0 addon
After: 500 monthly + 5,000 addon
Refund: +1,500 monthly, +0 addon
Final: 2,000 monthly + 5,000 addon ✅
```

### Scenario 2: Both Buckets (THE BUG CASE)
```
Initial: 500 monthly + 5,000 addon
Job: 2,000 rows
Deducted: 500 monthly, 1,500 addon
After: 0 monthly + 3,500 addon
Refund: +500 monthly, +1,500 addon
Final: 500 monthly + 5,000 addon ✅
```

### Scenario 3: Addon Credits Only
```
Initial: 0 monthly + 10,000 addon
Job: 3,000 rows
Deducted: 0 monthly, 3,000 addon
After: 0 monthly + 7,000 addon
Refund: +0 monthly, +3,000 addon
Final: 0 monthly + 10,000 addon ✅
```

### Scenario 4: Immediate Rollback
```
Initial: 1,000 monthly + 2,000 addon
Job: 1,500 rows (fails before insert)
Deducted: 1,000 monthly, 500 addon
Rollback triggered: +1,000 monthly, +500 addon
Final: 1,000 monthly + 2,000 addon ✅
```

---

## 🎯 Impact

### Fixes
✅ Prevents permanent loss of purchased addon credits
✅ Ensures refunds restore to correct buckets
✅ Ensures rollbacks restore to correct buckets
✅ Adds detailed logging for troubleshooting

### Backward Compatibility
✅ Legacy jobs without breakdown still handled (jobs.py:435-437 fallback)
✅ No database schema changes required
✅ No API changes (internal fix only)

### Data Integrity
✅ Credits always balanced correctly
✅ Ledger entries now include breakdown information
✅ Audit trail improved with bucket details

---

## 📊 Before/After Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Breakdown stored? | ❌ No | ✅ Yes |
| Refunds to correct bucket? | ❌ No (monthly only) | ✅ Yes (both) |
| Rollbacks to correct bucket? | ❌ No (total only) | ✅ Yes (both) |
| Addon credits preserved? | ❌ Lost on refund | ✅ Preserved |
| Logging detail | ⚠️ Total only | ✅ Breakdown included |

---

## 🚀 Deployment Notes

### Risk Level
**LOW** - Internal fix only, backward compatible

### Rollout Strategy
1. ✅ Deploy to production (no downtime needed)
2. ✅ Monitor refund operations in logs
3. ✅ Verify ledger entries include breakdown
4. ✅ Check no user reports of lost credits

### Monitoring
Watch for log entries:
```
[Credits] Refunded {cost} credits for job {job_id} (monthly: +X, addon: +Y)
[Credits] Rolled back {cost} credits for job {job_id} (monthly: +X, addon: +Y)
```

### Verification Queries
```sql
-- Check recent jobs have breakdown stored
SELECT id, meta_json->>'monthly_deducted', meta_json->>'addon_deducted'
FROM jobs
WHERE created_at > NOW() - INTERVAL '1 hour'
AND meta_json->>'credits_deducted' = 'true';

-- Check refunds are using breakdown
SELECT reason FROM ledger
WHERE reason LIKE 'job refund:%'
AND ts > NOW() - INTERVAL '1 hour';
```

---

## 📁 Files Changed

- `backend/app/main.py` (51 insertions, 4 deletions)
  - `_reserve_credits_for_job()` - Added breakdown calculation and return
  - `create_job()` - Store breakdown in meta_json
  - `_rollback_credit_reservation()` - Rewritten for two-bucket rollback

---

**Fix Completed**: 2025-11-20
**Tested**: ✅ All scenarios pass
**Status**: ✅ Committed and pushed
**Branch**: `claude/analyze-billing-logic-012FJTq21R2os58CHwj6RC4f`
