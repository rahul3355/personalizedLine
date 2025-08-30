from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Depends
import uuid, shutil, os, tempfile, threading, pandas as pd, base64, json
from . import db, jobs
import queue_utils
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Start background worker when app boots
def start_worker():
    t = threading.Thread(target=queue_utils.worker_loop, daemon=True)
    t.start()

@app.on_event("startup")
def startup_event():
    db.init_db()
    start_worker()

# Allow frontend to talk to backend
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
        # JWT = header.payload.signature, we only decode payload (2nd part)
        payload_part = token.split(".")[1]
        # pad base64
        padded = payload_part + "=" * (-len(payload_part) % 4)
        decoded = base64.urlsafe_b64decode(padded)
        payload = json.loads(decoded)
        return payload.get("sub")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# STEP 1 — Parse headers from uploaded file
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

# STEP 2 — Create job using chosen columns + metadata
@app.post("/jobs")
def create_job(
    file_path: str = Form(...),
    title_col: str = Form(...),
    company_col: str = Form(...),
    desc_col: str = Form(...),
    offer: str = Form(...),
    persona: str = Form(...),
    channel: str = Form(...),
    max_words: int = Form(...),
    user_id: str = Depends(get_current_user)
):
    meta = {
        "file_path": file_path,
        "title_col": title_col,
        "company_col": company_col,
        "desc_col": desc_col,
        "offer": offer,
        "persona": persona,
        "channel": channel,
        "max_words": max_words
    }

    job_id = db.enqueue_job("user-upload.xlsx", 0, meta, user_id)
    return {"job_id": job_id}

@app.get("/jobs")
def list_jobs(user_id: str = Depends(get_current_user)):
    jobs = db.list_jobs(user_id)
    enriched = []
    for job in jobs:
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

    # ✅ Enrich with progress + message
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
