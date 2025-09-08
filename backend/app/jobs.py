import os
import json
import time
import math
import pandas as pd
import traceback
import tempfile
from backend.app.gpt_helpers import generate_opener
from backend.app.supabase_client import supabase
from datetime import datetime
import redis
import rq
import requests

# -----------------------------
# Redis connection
# -----------------------------
# FIX: disable UTF-8 decoding (let RQ handle raw bytes safely)
redis_conn = redis.Redis(host="redis", port=6379, decode_responses=False)
queue = rq.Queue("default", connection=redis_conn)

# -----------------------------
# Timing helper
# -----------------------------
def record_time(label, start, job_id):
    elapsed = round(time.time() - start, 2)
    print(f"[Timing] {label} took {elapsed} sec for job {job_id}")
    return elapsed

# -----------------------------
# Job Worker Functions
# -----------------------------

def next_queued_job():
    """Fetch the next queued job from Supabase."""
    res = (
        supabase.table("jobs")
        .select("*")
        .eq("status", "queued")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def process_subjob(job_id: str, chunk_id: int, rows: list, meta: dict, user_id: str, total_rows: int):
    """Process a chunk of rows for a given job, with global progress logging."""
    sub_start = time.time()
    out_lines = []
    processed_in_chunk = 0

    for i, row in enumerate(rows, start=1):
        try:
            print(f"[Worker] Job {job_id} | Chunk {chunk_id} | Row {i}/{len(rows)} -> {row}")
            line, _, _, _ = generate_opener(
                company=row.get(meta.get("company_col", ""), ""),
                description=row.get(meta.get("desc_col", ""), ""),
                industry=row.get(meta.get("industry_col", ""), ""),
                role=row.get(meta.get("title_col", ""), ""),
                size=row.get(meta.get("size_col", ""), ""),
                service=meta.get("service", ""),
            )
        except Exception as e:
            print(f"[Worker] ERROR row {i}: {e}")
            traceback.print_exc()
            line = f"[Error generating line: {e}]"
        out_lines.append(line)

        processed_in_chunk += 1

        # --- NEW: Global row-level progress ---
        if processed_in_chunk % 5 == 0 or processed_in_chunk == len(rows):
            job_res = (
                supabase.table("jobs")
                .select("rows_processed")
                .eq("id", job_id)
                .limit(1)
                .execute()
            )
            already_done = job_res.data[0]["rows_processed"] if job_res.data else 0
            new_done = already_done + 5 if processed_in_chunk % 5 == 0 else already_done + (len(rows) - processed_in_chunk + 1)

            if new_done > total_rows:
                new_done = total_rows

            percent = round((new_done / total_rows) * 100, 2)

            supabase.table("jobs").update(
                {
                    "rows_processed": new_done,
                    "progress_percent": percent
                }
            ).eq("id", job_id).execute()

            supabase.table("job_logs").insert(
                {
                    "job_id": job_id,
                    "step": new_done,
                    "total": total_rows,
                    "message": f"Global progress: {new_done}/{total_rows} rows ({percent}%)",
                }
            ).execute()

    # Save partial chunk to Supabase storage
    df = pd.DataFrame(rows)
    df["personalized_line"] = out_lines

    local_dir = tempfile.mkdtemp()
    out_path = os.path.join(local_dir, f"{job_id}_chunk_{chunk_id}.xlsx")
    df.to_excel(out_path, index=False, engine="openpyxl")

    storage_path = f"{user_id}/{job_id}/chunk_{chunk_id}.xlsx"
    with open(out_path, "rb") as f:
        supabase.storage.from_("outputs").upload(storage_path, f)

    supabase.table("files").insert(
        {
            "user_id": user_id,
            "job_id": job_id,
            "original_name": f"chunk_{chunk_id}.xlsx",
            "storage_path": storage_path,
            "file_type": "partial_output",
        }
    ).execute()

    elapsed = record_time(f"Chunk {chunk_id} row processing", sub_start, job_id)
    supabase.table("job_logs").insert(
        {"job_id": job_id, "step": chunk_id, "message": f"Chunk {chunk_id} done in {elapsed} sec"}
    ).execute()

    print(f"[Worker] Finished chunk {chunk_id}/{len(rows)} for job {job_id}")
    return storage_path


def finalize_job(job_id: str, user_id: str, total_chunks: int):
    """Merge all partial chunk files into one final result and update job status."""
    finalize_start = time.time()
    timings = {}
    try:
        print(f"[Worker] Finalizing job {job_id} with {total_chunks} chunks")

        merge_start = time.time()
        frames = []
        for chunk_id in range(1, total_chunks + 1):
            storage_path = f"{user_id}/{job_id}/chunk_{chunk_id}.xlsx"
            signed = supabase.storage.from_("outputs").create_signed_url(storage_path, 300)
            url = signed.get("signedURL") if signed else None
            if not url:
                raise Exception(f"Missing signed URL for {storage_path}")

            resp = requests.get(url, timeout=60)
            resp.raise_for_status()

            local_dir = tempfile.mkdtemp()
            local_path = os.path.join(local_dir, f"chunk_{chunk_id}.xlsx")
            with open(local_path, "wb") as f:
                f.write(resp.content)

            df = pd.read_excel(local_path)
            frames.append(df)

        timings["merge"] = record_time("Merging chunks", merge_start, job_id)

        upload_start = time.time()
        final_df = pd.concat(frames, ignore_index=True)
        local_dir = tempfile.mkdtemp()
        out_path = os.path.join(local_dir, f"{job_id}_final.xlsx")
        final_df.to_excel(out_path, index=False, engine="openpyxl")

        storage_path = f"{user_id}/{job_id}/result.xlsx"
        with open(out_path, "rb") as f:
            supabase.storage.from_("outputs").upload(storage_path, f)
        timings["upload"] = record_time("Final upload", upload_start, job_id)

        supabase.table("files").insert(
            {
                "user_id": user_id,
                "job_id": job_id,
                "original_name": "result.xlsx",
                "storage_path": storage_path,
                "file_type": "output",
            }
        ).execute()

        supabase.table("jobs").update(
            {
                "status": "succeeded",
                "finished_at": datetime.utcnow().isoformat() + "Z",
                "result_path": storage_path,
                "progress_percent": 100,
                "timing_json": json.dumps(timings),
            }
        ).eq("id", job_id).execute()

        timings["finalize_total"] = record_time("Finalize total", finalize_start, job_id)
        print(f"[Worker] Finalized job {job_id} successfully")

    except Exception as e:
        print(f"[Worker] Finalize ERROR for job {job_id}: {e}")
        traceback.print_exc()
        supabase.table("jobs").update(
            {"status": "failed", "error": f"Finalize error: {e}"}
        ).eq("id", job_id).execute()


def process_job(job_id: str):
    """Split a job into chunks based on available workers and enqueue subjobs."""
    job_start = time.time()
    timings = {}
    try:
        print(f"[Worker] === Starting process_job for {job_id} ===")

        job_res = (
            supabase.table("jobs")
            .select("*")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        if not job_res.data:
            print(f"[Worker] Job {job_id} not found in DB")
            return
        job = job_res.data[0]

        meta = job.get("meta_json", {})
        if isinstance(meta, str):
            meta = json.loads(meta)

        user_id = job["user_id"]
        file_path = meta.get("file_path")
        if not file_path:
            supabase.table("jobs").update(
                {"status": "failed", "error": "Missing file_path"}
            ).eq("id", job_id).execute()
            return

        # Download file
        dl_start = time.time()
        signed = supabase.storage.from_("inputs").create_signed_url(file_path, 300)
        url = signed.get("signedURL") if signed else None
        if not url:
            supabase.table("jobs").update(
                {
                    "status": "failed",
                    "finished_at": datetime.utcnow().isoformat() + "Z",
                    "error": "Could not create signed URL",
                }
            ).eq("id", job_id).execute()
            return

        local_dir = tempfile.mkdtemp()
        local_path = os.path.join(local_dir, os.path.basename(file_path))
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        with open(local_path, "wb") as f:
            f.write(resp.content)

        if local_path.endswith(".csv"):
            df = pd.read_csv(local_path)
        else:
            df = pd.read_excel(local_path)
        timings["download_input"] = record_time("Download input file", dl_start, job_id)

        total = len(df)

        # Check credits
        setup_start = time.time()
        profile_res = (
            supabase.table("profiles")
            .select("credits_remaining")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        available = profile_res.data[0]["credits_remaining"] if profile_res.data else 0
        if available < total:
            supabase.table("jobs").update(
                {
                    "status": "failed",
                    "finished_at": datetime.utcnow().isoformat() + "Z",
                    "error": "Not enough credits",
                }
            ).eq("id", job_id).execute()
            return

        supabase.table("profiles").update(
            {"credits_remaining": available - total}
        ).eq("id", user_id).execute()
        supabase.table("ledger").insert(
            {"user_id": user_id, "change": -total, "reason": f"job deduction: {job_id}"}
        ).execute()
        timings["setup"] = record_time("Setup (credits + DB updates)", setup_start, job_id)

        supabase.table("jobs").update(
            {
                "status": "in_progress",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "rows_processed": 0,
                "progress_percent": 0,
            }
        ).eq("id", job_id).execute()

        # Chunking
        chunk_start = time.time()
        try:
            num_workers = int(os.getenv("WORKER_COUNT", "1"))
        except Exception:
            num_workers = 1

        num_chunks = min(total, num_workers)
        chunk_size = math.ceil(total / num_chunks)

        chunks = [
            df.iloc[i:i + chunk_size].to_dict(orient="records")
            for i in range(0, total, chunk_size)
        ]
        timings["chunking"] = record_time("Chunking + enqueue", chunk_start, job_id)

        subjob_refs = []
        for idx, rows in enumerate(chunks, start=1):
            job_ref = queue.enqueue(process_subjob, job_id, idx, rows, meta, user_id, total)
            subjob_refs.append(job_ref)

        queue.enqueue(
            finalize_job,
            job_id,
            user_id,
            len(chunks),
            depends_on=subjob_refs
        )

        timings["process_job_total"] = record_time("process_job total", job_start, job_id)
        supabase.table("jobs").update({"timing_json": json.dumps(timings)}).eq("id", job_id).execute()

        print(f"[Worker] Enqueued {len(chunks)} chunks + finalize for job {job_id}")

    except Exception as e:
        print(f"[Worker] FATAL ERROR job {job_id}: {e}")
        traceback.print_exc()
        supabase.table("jobs").update(
            {
                "status": "failed",
                "finished_at": datetime.utcnow().isoformat() + "Z",
                "error": str(e),
            }
        ).eq("id", job_id).execute()


def worker_loop(poll_interval: int = 5):
    print("[Worker] Starting dispatcher loop...")
    while True:
        try:
            job = next_queued_job()
            if not job:
                print("[Worker] No jobs found. Sleeping...")
                time.sleep(poll_interval)
                continue
            process_job(job["id"])
        except Exception as e:
            print("[Worker] Dispatcher ERROR:", str(e))
            traceback.print_exc()
            time.sleep(poll_interval)
