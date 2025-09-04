from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
import uuid, shutil, os, tempfile, threading, pandas as pd, base64, json, stripe
from . import db, jobs
import queue_utils
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

app = FastAPI()

# Stripe Setup (Test Mode)
STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET:
    stripe.api_key = STRIPE_SECRET

ADDON_PRODUCTS = {
    "addon_1000": {"price_id": os.getenv("STRIPE_PRICE_1000", ""), "credits": 1000},
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
        user = db.get_user(user_id)

    credits = db.get_credits(user_id)
    ledger = db.get_ledger(user_id, limit=10)

    # Ensure defaults
    user = dict(user)  # convert Row/Mapping to mutable dict
    user.setdefault("plan_type", "free")
    user.setdefault("subscription_status", "inactive")
    user.setdefault("renewal_date", None)

    return {
        "user": user,
        "credits_remaining": credits,
        "ledger": ledger
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
