"""
Cron job to expire addon credits that have passed their expiration date.
Run daily via Kubernetes CronJob at 2 AM UTC.

Usage:
    python -m backend.app.cron_expire_addons
"""
import os
from datetime import datetime
from .supabase_client import get_supabase


def expire_addon_credits(dry_run=False):
    """
    Expire addon credits that have passed their expiration date.

    Args:
        dry_run: If True, only show what would be expired without making changes
    """
    supabase = get_supabase()

    print(f"[CRON_EXPIRE_ADDONS] Starting at {datetime.utcnow().isoformat()}")
    print(f"[CRON_EXPIRE_ADDONS] Dry run mode: {dry_run}")

    try:
        # Find expired addon purchases that still have credits
        expired_purchases = supabase.table("addon_credit_purchases").select("*").eq(
            "expired", False
        ).lt(
            "expires_at", datetime.utcnow().isoformat()
        ).gt(
            "credits_remaining", 0
        ).execute()

        if not expired_purchases.data:
            print("[CRON_EXPIRE_ADDONS] No addon credits to expire")
            return {"expired_count": 0, "total_credits_expired": 0}

        total_expired = 0
        users_affected = set()

        for purchase in expired_purchases.data:
            user_id = purchase["user_id"]
            credits_lost = purchase["credits_remaining"]
            purchase_id = purchase["id"]
            purchased_at = purchase["purchased_at"]
            expires_at = purchase["expires_at"]

            users_affected.add(user_id)

            print(f"[CRON_EXPIRE_ADDONS] Expiring {credits_lost} credits for user {user_id[:8]}... "
                  f"(purchased {purchased_at}, expired {expires_at})")

            if not dry_run:
                # Mark as expired and zero out remaining credits
                supabase.table("addon_credit_purchases").update({
                    "expired": True,
                    "credits_remaining": 0
                }).eq("id", purchase_id).execute()

                # Log to ledger
                supabase.table("ledger").insert({
                    "user_id": user_id,
                    "change": -credits_lost,
                    "amount": 0,
                    "reason": f"addon expiration (purchase {purchase_id[:8]}...)",
                    "ts": datetime.utcnow().isoformat(),
                }).execute()

                # Also update legacy addon_credits column for consistency
                profile = supabase.table("profiles").select("addon_credits").eq("id", user_id).single().execute()
                if profile.data:
                    current_addon = profile.data.get("addon_credits", 0)
                    new_addon = max(0, current_addon - credits_lost)
                    supabase.table("profiles").update({
                        "addon_credits": new_addon
                    }).eq("id", user_id).execute()

                    print(f"[CRON_EXPIRE_ADDONS] Updated legacy addon_credits: {current_addon} → {new_addon}")

            total_expired += credits_lost

        print(f"[CRON_EXPIRE_ADDONS] {'Would expire' if dry_run else 'Expired'} {total_expired} credits "
              f"from {len(expired_purchases.data)} purchases affecting {len(users_affected)} users")

        return {
            "expired_count": len(expired_purchases.data),
            "total_credits_expired": total_expired,
            "users_affected": len(users_affected),
            "dry_run": dry_run
        }

    except Exception as exc:
        print(f"[CRON_EXPIRE_ADDONS] ERROR: {exc}")
        raise


if __name__ == "__main__":
    # Check if dry run mode enabled via environment variable
    dry_run = os.getenv("DRY_RUN", "false").lower() == "true"

    result = expire_addon_credits(dry_run=dry_run)

    print(f"[CRON_EXPIRE_ADDONS] Completed: {result}")
    print(f"[CRON_EXPIRE_ADDONS] Finished at {datetime.utcnow().isoformat()}")
