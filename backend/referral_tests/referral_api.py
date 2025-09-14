from fastapi import FastAPI, HTTPException
from supabase import create_client
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# request body schema
class ReferralRequest(BaseModel):
    referrer_id: str
    referred_id: str
    status: str

@app.post("/referrals/rpc")
def add_referral_rpc(referral: ReferralRequest):
    # Step 1: validate status
    if referral.status not in ["pending", "active"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    # Step 2: check referrer exists
    referrer_check = supabase.table("profiles").select("id").eq("id", referral.referrer_id).execute()
    if not referrer_check.data:
        raise HTTPException(status_code=400, detail="Referrer does not exist")

    # Step 3: check referred exists
    referred_check = supabase.table("profiles").select("id").eq("id", referral.referred_id).execute()
    if not referred_check.data:
        raise HTTPException(status_code=400, detail="Referred user does not exist")

    # Step 4: check duplicate referral
    duplicate_check = supabase.table("referrals").select("id").eq("referred_id", referral.referred_id).execute()
    if duplicate_check.data:
        raise HTTPException(status_code=400, detail="This user has already been referred")

    # Step 5: call RPC (safe now)
    response = supabase.rpc("add_referral", {
        "referrer_id": "1217b889-af63-407b-9322-5ab676d8eaca",
        "referred_id": "7e73f4e2-1097-4eb3-b2cf-f70e448c5ddc",
        "status": "pending"
    }).execute()

    return response.data
