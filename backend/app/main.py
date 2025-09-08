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

app = FastAPI()

import os
redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
redis_conn = redis.from_url(redis_url)
  # use localhost when FastAPI runs on your host
q = Queue(connection=redis_conn)


# Security scheme (adds Authorize button in Swagger)
security = HTTPBearer()

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

# ✅ Stripe Checkout Session (subscription OR add-on)
@app.post("/create_checkout_session")
def create_checkout_session(
    request: Request,
    plan: str = Form(None),
    is_addon: bool = Form(False),
    quantity: int = Form(1),
    user_id: str = Depends(get_current_user)
):
    try:
        print("DEBUG /create_checkout_session START")
        print("DEBUG plan:", plan)
        print("DEBUG is_addon:", is_addon)
        print("DEBUG quantity:", quantity)
        print("DEBUG user_id:", user_id)

        user = db.get_user(user_id)
        print("DEBUG user from DB:", user)

        if is_addon:
            plan_type = user.get("plan_type", "free")
            price_id = ADDON_PRICE_MAP.get(plan_type)
            print("DEBUG addon plan_type:", plan_type)
            print("DEBUG addon price_id:", price_id)

            checkout = stripe.checkout.Session.create(
                customer_email=user.get("email"),
                payment_method_types=["card"],
                mode="payment",
                line_items=[{"price": price_id, "quantity": quantity}],
                success_url="http://localhost:3000/billing?success=true",
                cancel_url="http://localhost:3000/billing?canceled=true",
                metadata={"user_id": user_id, "addon": "true", "quantity": quantity}
            )
        else:
            price_map = {
                "starter": os.getenv("STRIPE_PRICE_STARTER"),
                "growth": os.getenv("STRIPE_PRICE_GROWTH"),
                "pro": os.getenv("STRIPE_PRICE_PRO"),
            }
            print("DEBUG subscription plan:", plan)
            print("DEBUG subscription price_id:", price_map.get(plan))

            checkout = stripe.checkout.Session.create(
                customer_email=user.get("email"),
                payment_method_types=["card"],
                mode="subscription",
                line_items=[{"price": price_map[plan], "quantity": 1}],
                success_url="http://localhost:3000/billing?success=true",
                cancel_url="http://localhost:3000/billing?canceled=true",
                metadata={"user_id": user_id, "plan": plan}
            )

        print("DEBUG checkout session created:", checkout.url)
        return {"url": checkout.url}

    except Exception as e:
        print("ERROR in /create_checkout_session:", str(e))
        raise HTTPException(status_code=400, detail=str(e))


# ✅ Stripe Webhook with Idempotency + Customer-first lifecycle
# ✅ Stripe Webhook with Idempotency + Customer-first lifecycle
@app.post("/stripe-webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    event_id = event["id"]
    event_type = event["type"]

    # --- Idempotency check (local SQLite) ---
    with db.db() as con:
        row = con.execute("SELECT 1 FROM webhook_events WHERE id=?", (event_id,)).fetchone()
        if row:
            return {"status": "duplicate"}
        con.execute(
            "INSERT INTO webhook_events (id, type, created_at) VALUES (?, ?, ?)",
            (event_id, event_type, datetime.utcnow().isoformat())
        )

    # --- Credits map ---
    credits_map = {
        "free": 500,
        "starter": 2000,
        "growth": 10000,
        "pro": 25000,
    }

    # ---- Handle Events ----
    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        email = session.get("customer_email", "")
        is_addon = session["metadata"].get("addon") == "true"

        if is_addon:
            qty = int(session["metadata"].get("quantity", 1))
            credits = qty * 1000

            # Fetch current credits from Supabase
            current = (
                supabase.table("profiles")
                .select("credits_remaining")
                .eq("id", user_id)
                .single()
                .execute()
            )
            current_credits = current.data["credits_remaining"] if current.data else 0
            new_total = current_credits + credits

            # Update Supabase
            supabase.table("profiles").update({
                "credits_remaining": new_total
            }).eq("id", user_id).execute()

            # Optional: still log locally
            db.update_credits(user_id, credits, f"Add-on purchase x{qty}")

        else:
            plan = session["metadata"]["plan"]
            subscription_id = session.get("subscription")
            renewal_date = None
            if subscription_id:
                sub = stripe.Subscription.retrieve(subscription_id)
                renewal_date = sub.get("current_period_end")

            credits = credits_map.get(plan, 0)
            supabase.table("profiles").update({
                "plan_type": plan,
                "subscription_status": "active",
                "renewal_date": renewal_date,
                "credits_remaining": credits
            }).eq("id", user_id).execute()

    elif event_type == "invoice.payment_succeeded":
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        sub = stripe.Subscription.retrieve(subscription_id) if subscription_id else None

        if sub and "metadata" in sub:
            user_id = sub["metadata"].get("user_id")
            plan = sub["metadata"].get("plan")
            renewal_date = sub.get("current_period_end")
            if user_id and plan:
                credits = credits_map.get(plan, 0)
                supabase.table("profiles").update({
                    "credits_remaining": credits,
                    "renewal_date": renewal_date,
                    "subscription_status": "active"
                }).eq("id", user_id).execute()

    elif event_type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        sub = stripe.Subscription.retrieve(subscription_id) if subscription_id else None

        if sub and "metadata" in sub:
            user_id = sub["metadata"].get("user_id")
            if user_id:
                supabase.table("profiles").update({
                    "subscription_status": "past_due"
                }).eq("id", user_id).execute()

    elif event_type == "charge.refunded":
        charge = event["data"]["object"]
        metadata = charge.get("metadata", {})
        user_id = metadata.get("user_id")
        if user_id:
            supabase.table("profiles").update({
                "plan_type": "free",
                "subscription_status": "inactive",
                "credits_remaining": 500
            }).eq("id", user_id).execute()

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        user_id = sub["metadata"]["user_id"] if "metadata" in sub else None
        if user_id:
            supabase.table("profiles").update({
                "plan_type": "free",
                "subscription_status": "inactive",
                "credits_remaining": 500
            }).eq("id", user_id).execute()

    return {"status": "success"}
