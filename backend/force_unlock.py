import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load env vars
basedir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(basedir, "app", ".env")
load_dotenv(env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

supabase = create_client(url, key)

email = "rahulrocks.amb@gmail.com"
print(f"Checking account for: {email}")

# 1. Get User
res = supabase.table("profiles").select("id, welcome_reward_status").eq("email", email).single().execute()
if not res.data:
    print("User not found!")
    sys.exit(1)

user_id = res.data["id"]
current_status = res.data["welcome_reward_status"]
print(f"Current Status: {current_status}")

# 2. Check Usage (just to confirm)
rpc_res = supabase.rpc("get_total_credits_used", {"user_uuid": user_id}).execute()
total_used = rpc_res.data if rpc_res.data is not None else 0
print(f"Total Credits Used: {total_used}")

# 3. Force Unlock
if total_used >= 500:
    print("Condition met (>500).")
    # print("Forcing unlock...")
    # supabase.table("profiles").update({
    #     "welcome_reward_status": "unlocked"
    # }).eq("id", user_id).execute()
    # print("✅ SUCCESS: Reward status updated to 'unlocked'.")
    # print("👉 Refresh your dashboard now. The button should be active.")
else:
    print(f"⚠️ Warning: Usage ({total_used}) is less than 500.")
    # Uncomment to force anyway if needed
    # supabase.table("profiles").update({"welcome_reward_status": "unlocked"}).eq("id", user_id).execute()
