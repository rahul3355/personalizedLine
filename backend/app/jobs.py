import os
import json
import time
import pandas as pd
import traceback
import tempfile
from backend.app.gpt_helpers import generate_opener
from backend.app.supabase_client import supabase
from datetime import datetime 
from fastapi import HTTPException


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


def process_job(job_id: str):
    """Execute a single job with debug logging."""
    try:
        print(f"[Worker] === Starting process_job for {job_id} ===")

        # Fetch job
        job_res = (
            supabase.table("jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        if not job_res.data:
            print(f"[Worker] Job {job_id} not found in DB")
            return
        job = job_res.data
        print(f"[Worker] Loaded job: {job}")

        # Load metadata
        meta = job.get("meta_json", {})
        if isinstance(meta, str):
            meta = json.loads(meta)
        print(f"[Worker] Meta for job {job_id}: {meta}")

        user_id = job["user_id"]
        file_path = meta.get("file_path")
        if not file_path:
            print(f"[Worker] No file_path in meta for {job_id}")
            supabase.table("jobs").update(
                {"status": "failed", "error": "Missing file_path"}
            ).eq("id", job_id).execute()
            return

        # Ensure temp directory exists
        local_dir = tempfile.mkdtemp()
        local_path = os.path.join(local_dir, f"{job_id}_{os.path.basename(file_path)}")

        # Download file
        print(f"[Worker] Downloading {file_path} -> {local_path}")
        res = supabase.storage.from_("inputs").download(file_path)

        if hasattr(res, "data"):  # new SDK
            if not res.data or getattr(res, "error", None):
                raise HTTPException(status_code=404, detail="File not found in storage")
            contents = res.data
        elif isinstance(res, (bytes, bytearray)):  # old SDK
            contents = res
        else:
            raise HTTPException(status_code=500, detail=f"Unexpected download response: {type(res)}")  # <-- fix here too
        

        with open(local_path, "wb") as f:
            f.write(contents)
        print(f"[Worker] Download complete: {local_path}")

        # Load into dataframe
        if local_path.endswith(".csv"):
            df = pd.read_csv(local_path)
        else:
            df = pd.read_excel(local_path)
        total = len(df)
        print(f"[Worker] DataFrame loaded with {total} rows")

        # Check credits
        profile_res = (
            supabase.table("profiles")
            .select("credits_remaining")
            .eq("id", user_id)
            .single()
            .execute()
        )
        available = profile_res.data["credits_remaining"] if profile_res.data else 0
        print(f"[Worker] User {user_id} credits: {available}, required: {total}")
        if available < total:
            supabase.table("jobs").update(
                {"status": "failed", "finished_at": datetime.utcnow().isoformat() + "Z", "error": "Not enough credits"}
            ).eq("id", job_id).execute()
            return

        # Deduct credits
        supabase.table("profiles").update(
            {"credits_remaining": available - total}
        ).eq("id", user_id).execute()

        supabase.table("ledger").insert(
            {"user_id": user_id, "change": -total, "reason": f"job deduction: {job_id}"}
        ).execute()
        print(f"[Worker] Deducted {total} credits for job {job_id}")

        # Mark as running
        supabase.table("jobs").update(
            {"status": "in_progress", "started_at": datetime.utcnow().isoformat() + "Z"}
        ).eq("id", job_id).execute()
        print(f"[Worker] Marked job {job_id} as in_progress")

        # Generate outputs
        out_lines = []
        for i, (_, row) in enumerate(df.iterrows(), start=1):
            try:
                print(f"[Worker] Row {i}/{total} -> {row.to_dict()}")
                print(f"[Worker] Calling generate_opener...")
                line, _, _, _ = generate_opener(
                    company=row.get(meta.get("company_col", ""), ""),
                    description=row.get(meta.get("desc_col", ""), ""),
                    industry=row.get(meta.get("industry_col", ""), ""),
                    role=row.get(meta.get("title_col", ""), ""),
                    size=row.get(meta.get("size_col", ""), ""),
                    service=meta.get("service", "")
                )
                print(f"[Worker] Got line: {line}")
            except Exception as e:
                print(f"[Worker] ERROR in generate_opener row {i}: {e}")
                traceback.print_exc()
                line = f"[Error generating line: {e}]"
            out_lines.append(line)

            # Log progress
            supabase.table("job_logs").insert(
                {
                    "job_id": job_id,
                    "step": i,
                    "total": total,
                    "message": f"Processed row {i}/{total}"
                }
            ).execute()

        # Save result file
        df["personalized_line"] = out_lines
        out_path = os.path.join(local_dir, f"{job_id}_result.xlsx")
        df.to_excel(out_path, index=False, engine="openpyxl")
        print(f"[Worker] Result saved locally at {out_path}")

        # Upload to outputs bucket
        storage_path = f"{user_id}/{job_id}/result.xlsx"
        with open(out_path, "rb") as f:
            supabase.storage.from_("outputs").upload(storage_path, f)
        print(f"[Worker] Uploaded result to {storage_path}")

        # Record in files table
        supabase.table("files").insert(
            {
                "user_id": user_id,
                "job_id": job_id,
                "original_name": "result.xlsx",
                "storage_path": storage_path,
                "file_type": "output",
            }
        ).execute()

        # Mark success
        supabase.table("jobs").update(
            {"status": "succeeded", "finished_at": datetime.utcnow().isoformat() + "Z", "result_path": storage_path}
        ).eq("id", job_id).execute()
        print(f"[Worker] === Job {job_id} finished successfully ===")

    except Exception as e:
        print(f"[Worker] FATAL ERROR in job {job_id}: {e}")
        traceback.print_exc()
        supabase.table("jobs").update(
            {"status": "failed", "finished_at": datetime.utcnow().isoformat() + "Z", "error": str(e)}
        ).eq("id", job_id).execute()


def worker_loop(poll_interval: int = 5):
    print("[Worker] Starting job worker loop...")
    while True:
        try:
            print("[Worker] Checking for queued jobs...")
            job = next_queued_job()
            if not job:
                print("[Worker] No jobs found. Sleeping...")
                time.sleep(poll_interval)
                continue

            job_id = job["id"]
            print(f"[Worker] Picked up job {job_id}")

            # Removed "processing" state — let process_job set "running"
            process_job(job_id)

        except Exception as e:
            print("[Worker] ERROR:", str(e))
            traceback.print_exc()
            time.sleep(poll_interval)



def save_output_file(user_id, job_id, out_path, filename="result.xlsx"):
    """Helper to save output to Supabase Storage + record in DB."""
    with open(out_path, "rb") as f:
        storage_path = f"{user_id}/{job_id}/{filename}"
        supabase.storage.from_("outputs").upload(storage_path, f)

    supabase.table("files").insert({
        "user_id": user_id,
        "job_id": job_id,
        "original_name": filename,
        "storage_path": storage_path,
        "file_type": "output"
    }).execute()

    supabase.table("jobs").update({
        "status": "succeeded",
        "finished_at": datetime.utcnow().isoformat() + "Z",
        "result_path": storage_path
    }).eq("id", job_id).execute()
