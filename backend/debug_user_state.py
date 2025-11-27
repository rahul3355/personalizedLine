import os
import sys
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

env_path = os.path.join("app", ".env")
load_dotenv(env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

email = "rahulrocks.amb@gmail.com"

print(f"Debugging user: {email}...")

res = supabase.table("profiles").select("*").eq("email", email).single().execute()
if not res.data:
    print("User not found")
    sys.exit(1)

user = res.data
user_id = user["id"]
print(f"User ID: {user_id}")
print(f"Status: {user.get('welcome_reward_status')}")
print(f"Created At: {user.get('created_at')}")
print(f"Credits Remaining: {user.get('credits_remaining')}")

print("\nLedger Entries (Negative only):")
ledgers = supabase.table("ledger").select("*").eq("user_id", user_id).lt("change", 0).execute()
total_used = 0
for item in ledgers.data:
    print(f" - {item['ts']}: {item['change']} ({item['reason']})")
    total_used += abs(item['change'])

print(f"\nTotal Calculated Usage (Manual): {total_used}")

# Test RPC
try:
    print("\nTesting RPC 'get_total_credits_used'...")
    rpc_res = supabase.rpc("get_total_credits_used", {"user_uuid": user_id}).execute()
    print(f"RPC Result: {rpc_res.data}")
except Exception as e:
    print(f"RPC Failed: {e}")

# Check logic
created_at_str = user.get("created_at")
if created_at_str:
    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
    now = datetime.now(created_at.tzinfo)
    limit = created_at + timedelta(days=7)
    print(f"\nTime Check:")
    print(f"Created: {created_at}")
    print(f"Now:     {now}")
    print(f"Limit:   {limit}")
    print(f"Within 7 days? {now < limit}")

print(f"\nUnlock Condition Met? {total_used >= 500 and now < limit}")
