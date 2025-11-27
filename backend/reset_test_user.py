import os
import sys
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime

# Add app directory to path to find modules if needed, 
# but here we just need the env vars.
# Assuming we run this from 'backend' directory
env_path = os.path.join("app", ".env")
load_dotenv(env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in env")
    sys.exit(1)

supabase = create_client(url, key)

email = "rahulrocks.amb@gmail.com"

print(f"Resetting user: {email}...")

# 1. Get User ID
try:
    res = supabase.table("profiles").select("id").eq("email", email).single().execute()
    if not res.data:
        print(f"User {email} not found!")
        sys.exit(1)
    
    user_id = res.data["id"]
    print(f"Found user_id: {user_id}")

    # 2. Reset Profile
    # Set created_at to 4 days ago (so 3 days remaining)
    # Set status to 'locked'
    # Reset credits to 1000
    from datetime import timedelta
    four_days_ago = (datetime.utcnow() - timedelta(days=4)).isoformat()
    
    supabase.table("profiles").update({
        "created_at": four_days_ago,
        "welcome_reward_status": "locked",
        "credits_remaining": 1000
    }).eq("id", user_id).execute()
    
    print("✅ Profile reset: created_at = 4 days ago (3 days left), status = 'locked'")

    # 3. Clear Ledger & Add Fake Usage
    # Clear existing
    supabase.table("ledger").delete().eq("user_id", user_id).execute()
    
    # Add -490 usage
    supabase.table("ledger").insert({
        "user_id": user_id,
        "change": -490,
        "amount": 0,
        "reason": "test usage setup",
        "ts": datetime.utcnow().isoformat()
    }).execute()
    
    print("✅ Ledger updated: Added -490 usage (Need 10 more to unlock)")

    print("\nSUCCESS! You can now test the flow:")
    print("1. Refresh dashboard -> Offer Card should say 'Spend 500 credits by [Date]...'")
    print("2. Run a job that costs 10 credits")
    print("3. Refresh dashboard -> Offer Card should unlock!")

except Exception as e:
    print(f"Error: {e}")
