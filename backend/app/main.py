from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends, Header
import uuid, shutil, os, tempfile, threading, pandas as pd, base64, json, stripe, time
from . import db, jobs
import queue_utils
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load env (backend/.env)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI()

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


def start_worker():
    t = threading.Thread(target=queue_utils.worker_loop, daemon=True)
    t.start()

@app.on_event("startup")
def startup_event():
    db.init_db()
    start_worker()

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

# ---- Helper: extract user_id from Supabase JWT ----
def get_current_user(request: Request):
    auth = request.headers.get("authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth.split(" ")[1]

    try:
        payload_part = token.split(".")[1]
        padded = payload_part + "=" * (-len(payload_part) % 4)
        decoded = base64.urlsafe_b64decode(padded)
        payload = json.loads(decoded)
        return payload.get("sub")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ✅ Step 1 — Parse headers
@app.post("/parse_headers")
def parse_headers(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    tmp_dir = tempfile.gettempdir()
    temp_path = os.path.join(tmp_dir, f"{uuid.uuid4()}_{file.filename}")

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        df = pd.read_csv(temp_path) if temp_path.endswith(".csv") else pd.read_excel(temp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    headers = [str(c) for c in df.columns]
    return {"headers": headers, "temp_path": temp_path}

# ✅ Step 2 — Create job with new required fields
@app.post("/jobs")
def create_job(
    file_path: str = Form(...),
    company_col: str = Form(...),
    desc_col: str = Form(...),
    industry_col: str = Form(...),
    title_col: str = Form(...),
    size_col: str = Form(...),
    service: str = Form(...),
    user_id: str = Depends(get_current_user)
):
    meta = {
        "file_path": file_path,
        "company_col": company_col,
        "desc_col": desc_col,
        "industry_col": industry_col,
        "title_col": title_col,
        "size_col": size_col,
        "service": service
    }
    job_id = db.enqueue_job("user-upload.xlsx", 0, meta, user_id)
    return {"job_id": job_id}

@app.get("/me")
def get_me(user_id: str = Depends(get_current_user)):
    user = db.get_user(user_id)
    if not user:
        db.ensure_user(user_id, email="unknown@example.com")
        # Give Free Plan baseline of 500 credits
        with db.db() as con:
            con.execute(
                "UPDATE users SET plan_type=?, subscription_status=?, credits_remaining=?, renewal_date=? WHERE id=?",
                ("free", "active", 500, int(time.time()) + 30*24*3600, user_id)
            )
        user = db.get_user(user_id)

    credits = db.get_credits(user_id)
    ledger = db.get_ledger(user_id, limit=10)

    # Ensure defaults
    user = dict(user)
    user.setdefault("plan_type", "free")
    user.setdefault("subscription_status", "inactive")
    user.setdefault("renewal_date", int(time.time()) + 30*24*3600)

    return {
        "user": user,
        "credits_remaining": credits,
        "ledger": ledger,
        "next_renewal": user.get("renewal_date")
    }

# ✅ Existing job management endpoints unchanged...
@app.get("/jobs")
def list_jobs(user_id: str = Depends(get_current_user)):
    jobs_list = db.list_jobs(user_id)
    enriched = []
    for job in jobs_list:
        percent, message = db.get_progress(job["id"])
        job["progress"] = percent
        job["message"] = message
        enriched.append(job)
    return enriched

@app.get("/jobs/{job_id}")
def get_job(job_id: str, user_id: str = Depends(get_current_user)):
    job = db.get_job(job_id)
    if not job or job["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Job not found")
    percent, message = db.get_progress(job_id)
    job["progress"] = percent
    job["message"] = message
    return job

@app.get("/jobs/{job_id}/download")
def download_job(job_id: str, user_id: str = Depends(get_current_user)):
    job = db.get_job(job_id)
    if not job or job["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Job not found")

    result_path = job.get("result_path")
    if not result_path or not os.path.exists(result_path):
        raise HTTPException(status_code=404, detail="Result file not found")

    return FileResponse(
        result_path,
        filename=os.path.basename(result_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.get("/jobs/{job_id}/progress")
def job_progress(job_id: str, user_id: str = Depends(get_current_user)):
    job = db.get_job(job_id)
    if not job or job["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Job not found")

    percent, message = db.get_progress(job_id)
    return {
        "job_id": job_id,
        "status": job["status"],
        "percent": percent,
        "message": message
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

    # --- Idempotency check ---
    with db.db() as con:
        row = con.execute("SELECT 1 FROM webhook_events WHERE id=?", (event_id,)).fetchone()
        if row:
            return {"status": "duplicate"}
        con.execute(
            "INSERT INTO webhook_events (id, type, created_at) VALUES (?, ?, ?)",
            (event_id, event_type, int(time.time()))
        )

    # --- Credits map ---
    credits_map = {
        "free": 500,
        "starter": 2000,
        "growth": 10000,
        "pro": 25000,
    }

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        email = session.get("customer_email", "")
        is_addon = session["metadata"].get("addon") == "true"

        if is_addon:
            qty = int(session["metadata"].get("quantity", 1))
            credits = qty * 1000
            with db.db() as con:
                con.execute(
                    "UPDATE users SET credits_remaining = credits_remaining + ? WHERE id=?",
                    (credits, user_id)
                )
            db.update_credits(user_id, credits, f"Add-on purchase x{qty}")
        else:
            plan = session["metadata"]["plan"]
            subscription_id = session.get("subscription")
            renewal_date = None
            if subscription_id:
                sub = stripe.Subscription.retrieve(subscription_id)
                renewal_date = sub.get("current_period_end")  # safe get

            credits = credits_map.get(plan, 0)
            db.ensure_user(user_id, email=email)
            with db.db() as con:
                con.execute(
                    "UPDATE users SET plan_type=?, subscription_status=?, renewal_date=?, credits_remaining=? WHERE id=?",
                    (plan, "active", renewal_date, credits, user_id)
                )

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
                with db.db() as con:
                    con.execute(
                        "UPDATE users SET credits_remaining=?, renewal_date=?, subscription_status=? WHERE id=?",
                        (credits, renewal_date, "active", user_id)
                    )

    elif event_type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        sub = stripe.Subscription.retrieve(subscription_id) if subscription_id else None

        if sub and "metadata" in sub:
            user_id = sub["metadata"].get("user_id")
            if user_id:
                with db.db() as con:
                    con.execute(
                        "UPDATE users SET subscription_status=? WHERE id=?",
                        ("past_due", user_id)
                    )

    elif event_type == "charge.refunded":
        charge = event["data"]["object"]
        metadata = charge.get("metadata", {})
        user_id = metadata.get("user_id")
        if user_id:
            with db.db() as con:
                con.execute(
                    "UPDATE users SET plan_type=?, subscription_status=?, credits_remaining=? WHERE id=?",
                    ("free", "inactive", 500, user_id)
                )

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        user_id = sub["metadata"]["user_id"] if "metadata" in sub else None
        if user_id:
            with db.db() as con:
                con.execute(
                    "UPDATE users SET plan_type=?, subscription_status=?, credits_remaining=? WHERE id=?",
                    ("free", "inactive", 500, user_id)
                )

    return {"status": "success"}
