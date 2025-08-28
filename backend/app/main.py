from fastapi import FastAPI, UploadFile, File
import uuid, shutil, os, tempfile, threading
from . import db
from . import jobs
from . import gpt_helpers
import queue_utils   # ✅ relative import
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()

def start_worker():
    t = threading.Thread(target=queue_utils.worker_loop, daemon=True)
    t.start()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://127.0.0.1:3000"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/jobs")
def create_job(file: UploadFile = File(...)):
    tmp_dir = tempfile.gettempdir()
    temp_path = os.path.join(tmp_dir, f"{uuid.uuid4()}_{file.filename}")

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user_id = "test-user"

    # minimal metadata
    meta = {"uploaded_from": "fastapi"}

    # rows can be 0 for now, or later count rows from CSV/Excel
    job_id = db.enqueue_job(temp_path, 0, meta, user_id)

    # Optional: start processing now (for MVP)
    jobs.process_job(job_id)

    return {"job_id": job_id}

@app.get("/jobs")
def list_jobs():
    user_id = "test-user"
    return db.list_jobs(user_id)

@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    user_id = "test-user"
    job = db.get_job(job_id)
    if not job or job["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/jobs/{job_id}/download")
def download_job(job_id: str):
    user_id = "test-user"
    job = db.get_job(job_id)

    # Validate job
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
def job_progress(job_id: str):
    user_id = "test-user"
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




