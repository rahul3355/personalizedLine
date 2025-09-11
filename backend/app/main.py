from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import uuid, shutil, os, tempfile, threading, pandas as pd, base64, json, stripe, time
from fastapi.responses import StreamingResponse
import io
from pydantic import BaseModel
import os
from . import db, jobs
from backend.app.queue_utils import process_row
from .supabase_client import supabase
from supabase import create_client
from fastapi import APIRouter, Body
from io import BytesIO
from datetime import datetime, timedelta
import requests
import httpx
from fastapi import Query
import redis
from rq import Queue
 # reuse the same function your workers use


# Load env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

app = FastAPI()

import os
redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
redis_conn = redis.from_url(redis_url)
  # use localhost when FastAPI runs on your host
q = Queue(connection=redis_conn)


# Security scheme (adds Authorize button in Swagger)
security = HTTPBearer()

class CheckoutRequest(BaseModel):
    plan: str
    addon: bool = False
    quantity: int = 1
    user_id: str

# Stripe Setup
STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
if STRIPE_SECRET:
    stripe.api_key = STRIPE_SECRET

# Add-on product mapping
ADDON_PRICE_MAP = {
    "free": os.getenv("STRIPE_PRICE_ADDON_FREE"),
    "starter": os.getenv("STRIPE_PRICE_ADDON_STARTER"),
    "growth": os.getenv("STRIPE_PRICE_ADDON_GROWTH"),
    "pro": os.getenv("STRIPE_PRICE_ADDON_PRO"),
}

from . import jobs

def start_worker():
    t = threading.Thread(target=jobs.worker_loop, daemon=True)
    t.start()


@app.on_event("startup")
async def startup_event():
    print("[Main] Running startup_event")
    db.init_db()
    start_worker()
    print("[Main] Worker started")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

# ---- Extract user_id from JWT ----
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload_part = token.split(".")[1]
        padded = payload_part + "=" * (-len(payload_part) % 4)
        decoded = base64.urlsafe_b64decode(padded)
        payload = json.loads(decoded)
        return payload.get("sub")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ✅ Step 1 — Parse headers
def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)


class ParseRequest(BaseModel):
    user_id: str
    file_path: str

@app.post("/parse_headers")
async def parse_headers(payload: dict = Body(...)):
    try:
        file_path = payload.get("file_path")
        user_id = payload.get("user_id")
        if not file_path or not user_id:
            raise HTTPException(status_code=400, detail="file_path and user_id required")

        # --- Step 1: Generate signed URL from Supabase ---
        try:
            signed = supabase.storage.from_("inputs").create_signed_url(file_path, 60)
            if not signed or "signedURL" not in signed:
                raise HTTPException(status_code=500, detail="Failed to get signed URL")
            signed_url = signed["signedURL"]
            print(f"[ParseHeaders] Got signed URL for {file_path}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Signed URL error: {e}")

        # --- Step 2: Stream file from Supabase ---
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(signed_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Download failed: {resp.status_code}")
            contents = resp.content

        # --- Step 3: Parse only headers (read small sample) ---
        if file_path.endswith(".xlsx"):
            df = pd.read_excel(BytesIO(contents), nrows=5)  # only first few rows
        else:
            df = pd.read_csv(BytesIO(contents), nrows=5)

        headers = df.columns.tolist()
        print(f"[ParseHeaders] Parsed headers for {file_path}: {headers}")

        return {"headers": headers, "file_path": file_path}

    except Exception as e:
        print(f"[ParseHeaders] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ✅ Step 2 — Create job
from pydantic import BaseModel

class JobRequest(BaseModel):
    user_id: str
    file_path: str
    company_col: str
    desc_col: str
    industry_col: str
    title_col: str
    size_col: str
    service: str


@app.get("/jobs")
def list_jobs(
    user_id: str = Depends(get_current_user),
    offset: int = 0,
    limit: int = 5
):
    supabase = get_supabase()

    jobs_res = (
        supabase.table("jobs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)  # <-- pagination
        .execute()
    )
    jobs = jobs_res.data or []
    if not jobs:
        return []

    job_ids = [job["id"] for job in jobs]

    logs_res = (
        supabase.table("job_logs")
        .select("job_id, step, total, message")
        .in_("job_id", job_ids)
        .order("step", desc=True)
        .execute()
    )
    logs = logs_res.data or []
    latest_logs = {}
    for log in logs:
        job_id = log["job_id"]
        if job_id not in latest_logs:  # first (highest step) wins
            latest_logs[job_id] = log

    for job in jobs:
        last_log = latest_logs.get(job["id"])
        if last_log:
            step = last_log["step"]
            total = last_log["total"] or 1
            job["progress"] = int((step / total) * 100)
            job["message"] = last_log.get("message")
        else:
            job["progress"] = 0
            job["message"] = None

    return jobs



# ✅ Other routes unchanged (get_me, list_jobs, get_job, download, progress, checkout, webhook)
# ... keep all your code from [147†source] after this point


@app.get("/me")
def get_me(user_id: str = Depends(get_current_user)):
    try:
        res = (
            supabase.table("profiles")
            .select("id, email, credits_remaining, max_credits, plan_type, subscription_status, renewal_date")
            .eq("id", user_id)
            .single()
            .execute()
        )

        if not res.data:
            # bootstrap default profile
            profile = {
                "id": user_id,
                "email": "unknown@example.com",
                "credits_remaining": 500,
                "max_credits": 5000,
                "plan_type": "free",
                "subscription_status": "active",
                "renewal_date": (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
            supabase.table("profiles").insert(profile).execute()
            res = (
                supabase.table("profiles")
                .select("*")
                .eq("id", user_id)
                .single()
                .execute()
            )

        return res.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.get("/jobs")
def list_jobs(user_id: str = Depends(get_current_user)):
    supabase = get_supabase()

    jobs_res = (
        supabase.table("jobs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    jobs = jobs_res.data or []

    for job in jobs:
        logs_res = (
            supabase.table("job_logs")
            .select("step,total,message")
            .eq("job_id", job["id"])
            .order("step", desc=True)
            .limit(1)
            .execute()
        )
        last_log = logs_res.data[0] if logs_res.data else None

        if last_log:
            step = last_log["step"]
            total = last_log["total"] or 1
            job["progress"] = int((step / total) * 100)
            job["message"] = last_log.get("message")
        else:
            job["progress"] = 0
            job["message"] = None

    return jobs


@app.post("/jobs")
async def create_job(req: JobRequest):
    try:
        # Download file from Supabase storage
        supabase = get_supabase()
        res = supabase.storage.from_("inputs").download(req.file_path)
        if not res:
            raise HTTPException(status_code=404, detail="File not found in storage")

        contents = res
        if req.file_path.endswith(".xlsx"):
            df = pd.read_excel(BytesIO(contents))
        else:
            df = pd.read_csv(BytesIO(contents))

        row_count = len(df)

        meta = {
            "file_path": req.file_path,
            "company_col": req.company_col,
            "desc_col": req.desc_col,
            "industry_col": req.industry_col,
            "title_col": req.title_col,
            "size_col": req.size_col,
            "service": req.service,
        }

        # --- Step 1: insert into Supabase jobs table ---
        result = (
            supabase.table("jobs")
            .insert(
                {
                    "user_id": req.user_id,
                    "status": "queued",
                    "filename": os.path.basename(req.file_path),
                    "rows": row_count,
                    "meta_json": meta,
                }
            )
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to insert job")

        job = result.data[0]

        # --- Step 2: enqueue each row into Redis ---
        for row_number in range(1, row_count + 1):
            q.enqueue(process_row, row_number)

        return {"id": job["id"], "status": job["status"], "rows": row_count}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




@app.get("/jobs/{job_id}")
def get_job(job_id: str, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()

    job_res = (
        supabase.table("jobs")
        .select("*")
        .eq("id", job_id)
        .single()
        .execute()
    )
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_res.data
    if job["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    logs_res = (
        supabase.table("job_logs")
        .select("*")
        .eq("job_id", job_id)
        .order("step", desc=True)
        .limit(1)
        .execute()
    )
    last_log = logs_res.data[0] if logs_res.data else None

    if last_log:
        step = last_log["step"]
        total = last_log["total"] or 1
        job["progress"] = int((step / total) * 100)
        job["message"] = last_log.get("message")
    else:
        job["progress"] = 0
        job["message"] = None

    return job


@app.get("/jobs/{job_id}/download")
async def download_result(job_id: str):
    job = (
        supabase.table("jobs")
        .select("result_path")
        .eq("id", job_id)
        .single()
        .execute()
    )
    if not job.data or not job.data["result_path"]:
        raise HTTPException(status_code=404, detail="Result not found")

    storage_path = job.data["result_path"]
    file = supabase.storage.from_("outputs").download(storage_path)
    return StreamingResponse(io.BytesIO(file), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
        "Content-Disposition": f"attachment; filename=result.xlsx"
    })


@app.get("/jobs/{job_id}/progress")
def job_progress(job_id: str, user_id: str = Depends(get_current_user)):
    supabase = get_supabase()

    job_res = (
        supabase.table("jobs")
        .select("id,user_id,status")
        .eq("id", job_id)
        .single()
        .execute()
    )
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_res.data
    if job["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    logs_res = (
        supabase.table("job_logs")
        .select("*")
        .eq("job_id", job_id)
        .order("step", desc=True)
        .limit(1)
        .execute()
    )
    last_log = logs_res.data[0] if logs_res.data else None

    if last_log:
        step = last_log["step"]
        total = last_log["total"] or 1
        percent = int((step / total) * 100)
        message = last_log.get("message")
    else:
        percent = 0
        message = None

    return {
        "job_id": job_id,
        "status": job["status"],
        "percent": percent,
        "message": message,
    }

YOUR_DOMAIN = "http://localhost:3000"
# ✅ Stripe Checkout Session (subscription OR add-on)
class CheckoutRequest(BaseModel):
    plan: str
    addon: bool = False
    quantity: int = 1
    user_id: str

# ========================
# /create_checkout_session
# ========================
@app.post("/create_checkout_session")
async def create_checkout_session(data: CheckoutRequest):
    try:
        print("========== CREATE CHECKOUT SESSION ==========")
        print(f"[DEBUG] Incoming data: {data}")

        # --- Base plan price IDs
        price_map = {
            "starter": os.getenv("STRIPE_PRICE_STARTER"),
            "growth": os.getenv("STRIPE_PRICE_GROWTH"),
            "pro": os.getenv("STRIPE_PRICE_PRO"),
        }

        # --- Add-on price IDs (plan specific)
        addon_price_map = {
            "starter": os.getenv("STRIPE_PRICE_ADDON_STARTER"),  # $8 per 1000
            "growth": os.getenv("STRIPE_PRICE_ADDON_GROWTH"),    # $6 per 1000
            "pro": os.getenv("STRIPE_PRICE_ADDON_PRO"),          # $5 per 1000
        }

        line_items = []
        price_id = None
        mode = "subscription"

        if data.addon:
            # Add-on purchase
            addon_price_id = addon_price_map.get(data.plan)
            if not addon_price_id:
                print(f"[ERROR] Invalid addon plan: {data.plan}")
                return {"error": "Invalid addon plan"}
            price_id = addon_price_id
            line_items = [{
                "price": addon_price_id,
                "quantity": data.quantity,
            }]
            mode = "payment"
        else:
            # Plan purchase
            price_id = price_map.get(data.plan)
            if not price_id:
                print(f"[ERROR] Invalid plan: {data.plan}")
                return {"error": "Invalid plan"}
            line_items = [{
                "price": price_id,
                "quantity": 1,
            }]
            mode = "subscription"

        print(f"[INFO] Using price_id={price_id}, mode={mode}, user_id={data.user_id}")

        # --- Create checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode=mode,
            line_items=line_items,
            success_url="http://localhost:3000/billing?success=true",
            cancel_url="http://localhost:3000/billing?canceled=true",
            # attach metadata everywhere
            metadata={
                "user_id": data.user_id,
                "plan": data.plan,
                "addon": str(data.addon).lower(),
                "quantity": str(data.quantity),
            },
            subscription_data=None if data.addon else {
                "metadata": {
                    "user_id": data.user_id,
                    "plan": data.plan,
                }
            },
        )

        print(f"[INFO] Created Checkout Session: {session['id']}")
        print("========== END CREATE CHECKOUT SESSION ==========")

        return {"id": session.id}

    except Exception as e:
        print(f"[ERROR] create_checkout_session failed: {e}")
        return {"error": str(e)}



from fastapi import Request, Header, HTTPException
from datetime import datetime
import stripe
from supabase import create_client
import os

# Init Supabase (must be service role key)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

CREDITS_MAP = {
    "free": 500,
    "starter": 2000,
    "growth": 10000,
    "pro": 25000,
}

def log_db(label, res):
    try:
        print(f"[DB:{label}] data={getattr(res, 'data', None)} error={getattr(res, 'error', None)}")
    except Exception as e:
        print(f"[DB:{label}] logging failed: {e}")

@app.post("/stripe-webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    print("========== STRIPE WEBHOOK ==========")

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        print(f"[ERROR] Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_type = event["type"]
    obj = event["data"]["object"]
    print(f"[EVENT] {event_type} id={event['id']}")

    def log_db(label, res):
        print(f"[DB:{label}] data={res.data} error={res.error}")

    if event_type == "checkout.session.completed":
        metadata = obj.get("metadata", {})
        user_id = metadata.get("user_id")
        plan = metadata.get("plan")
        is_addon = metadata.get("addon") == "true"

        if is_addon:
            qty = int(metadata.get("quantity", 1))
            credits = qty * 1000
            current = supabase.table("profiles").select("credits_remaining").eq("id", user_id).single().execute()
            current_credits = current.data["credits_remaining"] if current.data else 0
            new_total = current_credits + credits

            res_update = supabase.table("profiles").update({
                "credits_remaining": new_total
            }).eq("id", user_id).execute()
            log_db("update_profile_addon", res_update)

            res_ledger = supabase.table("ledger").insert({
                "user_id": user_id,
                "change": credits,
                "amount": (obj.get("amount_total") or 0) / 100.0,
                "reason": f"addon purchase x{qty}",
                "ts": datetime.utcnow().isoformat()
            }).execute()
            log_db("insert_ledger_addon", res_ledger)

            print(f"[ADDON] user={user_id}, qty={qty}, credits={credits}, total={new_total}")

        else:
            subscription_id = obj.get("subscription")
            renewal_date = None
            if subscription_id:
                sub = stripe.Subscription.retrieve(subscription_id)
                renewal_date = sub.get("current_period_end")

            credits = CREDITS_MAP.get(plan, 0)
            res_update = supabase.table("profiles").update({
                "plan_type": plan,
                "subscription_status": "active",
                "renewal_date": renewal_date,
                "credits_remaining": credits
            }).eq("id", user_id).execute()
            log_db("update_profile_plan", res_update)

            res_ledger = supabase.table("ledger").insert({
                "user_id": user_id,
                "change": credits,
                "amount": (obj.get("amount_total") or 0) / 100.0,
                "reason": f"plan purchase - {plan}",
                "ts": datetime.utcnow().isoformat()
            }).execute()
            log_db("insert_ledger_plan", res_ledger)

            print(f"[PLAN] user={user_id}, plan={plan}, credits={credits}, renewal={renewal_date}")

    # ... leave other cases (subscription.created, invoice.payment_succeeded, etc.) unchanged

    print("========== END WEBHOOK ==========")
    return {"status": "success"}
