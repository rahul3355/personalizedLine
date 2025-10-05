import os
import csv
import json
import time
import math
from typing import Optional, List, Dict, Tuple
import pandas as pd
import traceback
import tempfile
import shutil
from backend.app.gpt_helpers import generate_opener
from backend.app.supabase_client import supabase
from datetime import datetime
import redis
import rq
import requests
from redis.exceptions import LockError
from rq import get_current_job
from supabase import StorageException
from openpyxl import load_workbook

# -----------------------------
# Redis connection
# -----------------------------
redis_conn = redis.Redis(host="redis", port=6379, decode_responses=False)
queue = rq.Queue("default", connection=redis_conn)


RAW_CHUNK_BASE_DIR = "/data/raw_chunks"
RAW_CHUNK_BUCKET = "inputs"


class InsufficientCreditsError(Exception):
    """Raised when a user does not have enough credits for a job."""


class CreditDeductionFailed(RuntimeError):
    """Raised when a credit deduction partially succeeds but downstream work fails."""

    def __init__(self, message: str, previous_balance: Optional[int] = None):
        super().__init__(message)
        self.previous_balance = previous_balance


def _is_duplicate_key_error(error) -> bool:
    message = ""
    if error is None:
        return False
    if isinstance(error, dict):
        message = error.get("message") or json.dumps(error)
    else:
        message = str(error)
    message = message.lower()
    return "duplicate key" in message or "already exists" in message


def _begin_job_ledger_event(job_id: str, event_type: str, *, supabase_client=None) -> bool:
    supabase_client = supabase_client or supabase
    payload = {"job_id": job_id, "event_type": event_type}
    try:
        response = supabase_client.table("job_ledger_events").insert(payload).execute()
    except Exception as exc:
        if _is_duplicate_key_error(exc):
            return False
        raise

    if _is_duplicate_key_error(getattr(response, "error", None)):
        return False

    error = getattr(response, "error", None)
    if error:
        raise RuntimeError(
            f"Failed to insert job ledger event for {job_id} ({event_type}): {error}"
        )

    return True


def _finalize_job_ledger_event(
    job_id: str,
    event_type: str,
    ledger_row: Optional[dict],
    *,
    supabase_client=None,
):
    supabase_client = supabase_client or supabase
    ledger_id = None
    if isinstance(ledger_row, dict):
        ledger_id = ledger_row.get("id")

    if ledger_id:
        supabase_client.table("job_ledger_events").update({"ledger_id": ledger_id}).eq(
            "job_id", job_id
        ).eq("event_type", event_type).execute()


def _delete_job_ledger_event(job_id: str, event_type: str, *, supabase_client=None):
    supabase_client = supabase_client or supabase
    try:
        supabase_client.table("job_ledger_events").delete().eq("job_id", job_id).eq(
            "event_type", event_type
        ).execute()
    except Exception:
        # Best effort cleanup; errors here should not mask the original failure.
        pass


def _extract_first_row(response) -> Optional[dict]:
    if not response:
        return None
    data = getattr(response, "data", None)
    if isinstance(data, list) and data:
        row = data[0]
        if isinstance(row, dict):
            return row
    return None


def _ensure_dict(value):
    if not value:
        return {}
    if isinstance(value, dict):
        return dict(value)
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _format_storage_error(error) -> str:
    if isinstance(error, dict):
        message = error.get("message")
        if message:
            return message
        return json.dumps(error)
    return str(error)


def _upload_to_storage(storage_path: str, file_obj, context: str, bucket: str = "outputs"):
    """Upload a file to Supabase storage and raise if the response indicates failure."""
    try:
        response = supabase.storage.from_(bucket).upload(storage_path, file_obj)
    except StorageException as exc:
        raise RuntimeError(
            f"Supabase upload failed for {context} ({storage_path}): {exc}"
        ) from exc

    if response is None:
        raise RuntimeError(
            f"Supabase upload failed for {context} ({storage_path}): empty response"
        )

    status_code = getattr(response, "status_code", None)
    if status_code and status_code >= 400:
        raise RuntimeError(
            f"Supabase upload failed for {context} ({storage_path}): HTTP {status_code}"
        )

    try:
        payload = response.json()
    except Exception:
        payload = None

    if isinstance(payload, dict):
        error = payload.get("error")
        if error:
            raise RuntimeError(
                f"Supabase upload failed for {context} ({storage_path}): {_format_storage_error(error)}"
            )
        if payload.get("message") and payload.get("statusCode"):
            raise RuntimeError(
                f"Supabase upload failed for {context} ({storage_path}): {payload['statusCode']}: {payload['message']}"
            )

    return response


def _remove_from_storage(storage_path: str, context: str, bucket: str = "outputs"):
    try:
        supabase.storage.from_(bucket).remove([storage_path])
    except StorageException as exc:
        print(f"[Worker] Warning: failed to remove {context} ({storage_path}) from {bucket}: {exc}")
    except Exception as exc:
        print(f"[Worker] Warning: unexpected error removing {context} ({storage_path}) from {bucket}: {exc}")


def _chunk_raw_local_path(job_id: str, chunk_id: int) -> str:
    local_dir = os.path.join(RAW_CHUNK_BASE_DIR, job_id)
    os.makedirs(local_dir, exist_ok=True)
    return os.path.join(local_dir, f"chunk_{chunk_id}.csv")


def _persist_chunk_rows(job_id: str, chunk_id: int, headers: List[str], rows: List[Dict[str, str]], user_id: str) -> str:
    local_path = _chunk_raw_local_path(job_id, chunk_id)
    with open(local_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            normalized = {}
            for header in headers:
                value = row.get(header, "")
                normalized[header] = "" if value is None else value
            writer.writerow(normalized)

    storage_path = f"{user_id}/{job_id}/raw_chunks/chunk_{chunk_id}.csv"
    with open(local_path, "rb") as f:
        _upload_to_storage(
            storage_path,
            f,
            f"raw chunk {chunk_id} for job {job_id}",
            bucket=RAW_CHUNK_BUCKET,
        )

    return storage_path


def _download_chunk_from_storage(storage_path: str) -> str:
    data = supabase.storage.from_(RAW_CHUNK_BUCKET).download(storage_path)
    if data is None:
        raise RuntimeError(f"Empty response downloading chunk {storage_path} from storage")

    if isinstance(data, bytes):
        payload = data
    elif hasattr(data, "read"):
        payload = data.read()
    elif isinstance(data, str):
        payload = data.encode("utf-8")
    else:
        raise RuntimeError(f"Unsupported download payload type for chunk {storage_path}: {type(data)}")

    tmp_dir = tempfile.mkdtemp(prefix="chunk_raw_")
    local_path = os.path.join(tmp_dir, os.path.basename(storage_path))
    with open(local_path, "wb") as f:
        f.write(payload)

    return local_path


def _csv_headers_and_total(path: str):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        headers = next(reader, None) or []
        total = sum(1 for _ in reader)
    return headers, total


def _iter_csv_rows(path: str):
    def generator():
        with open(path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield {key: (value if value is not None else "") for key, value in row.items()}

    return generator()


def _xlsx_headers_and_total(path: str):
    wb = load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        headers_row = next(rows_iter, None) or []
        headers = [str(cell) if cell is not None else "" for cell in headers_row]
        max_row = ws.max_row or 0
        total = max(max_row - 1, 0) if headers else 0
        return headers, total
    finally:
        wb.close()


def _iter_xlsx_rows(path: str, headers: List[str]):
    def generator():
        wb = load_workbook(path, read_only=True, data_only=True)
        try:
            ws = wb.active
            rows_iter = ws.iter_rows(values_only=True)
            # Skip header row if present
            next(rows_iter, None)
            for row in rows_iter:
                values = list(row)
                row_dict = {}
                for idx, column in enumerate(headers):
                    value = values[idx] if idx < len(values) else None
                    row_dict[column] = "" if value is None else value
                yield row_dict
        finally:
            wb.close()

    return generator()


def _input_iterator(local_path: str):
    ext = os.path.splitext(local_path)[1].lower()
    if ext == ".csv":
        headers, total = _csv_headers_and_total(local_path)
        return headers, total, _iter_csv_rows(local_path)
    if ext in {".xlsx", ".xlsm", ".xltx", ".xltm"}:
        headers, total = _xlsx_headers_and_total(local_path)
        return headers, total, _iter_xlsx_rows(local_path, headers)
    raise RuntimeError(f"Unsupported file type: {ext}")


def _finalize_empty_job(job_id: str, user_id: str, headers: List[str], timings: dict, job_start: float):
    final_columns = list(headers)
    if "personalized_line" not in final_columns:
        final_columns.append("personalized_line")

    empty_df = pd.DataFrame(columns=final_columns)
    local_dir = tempfile.mkdtemp()
    out_csv = os.path.join(local_dir, f"{job_id}_final.csv")
    out_xlsx = os.path.join(local_dir, f"{job_id}_final.xlsx")
    try:
        empty_df.to_csv(out_csv, index=False)
        empty_df.to_excel(out_xlsx, index=False, engine="openpyxl")

        storage_path = f"{user_id}/{job_id}/result.xlsx"
        with open(out_xlsx, "rb") as f:
            _upload_to_storage(storage_path, f, f"final result for job {job_id}")

        timings["process_job_total"] = record_time("process_job total", job_start, job_id)
        supabase.table("jobs").update(
            {
                "status": "succeeded",
                "finished_at": datetime.utcnow().isoformat() + "Z",
                "result_path": storage_path,
                "progress_percent": 100,
                "timing_json": json.dumps(timings),
            }
        ).eq("id", job_id).execute()
    finally:
        import shutil

        shutil.rmtree(local_dir, ignore_errors=True)

    print(f"[Worker] Job {job_id} contained no rows; generated empty result file")


def refund_job_credits(job_id: str, user_id: Optional[str], reason: str = "") -> bool:
    """Refund credits for a job if they were previously deducted."""
    try:
        job_res = (
            supabase.table("jobs")
            .select("meta_json, user_id")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        if not job_res.data:
            return False

        job_row = job_res.data[0]
        meta = _ensure_dict(job_row.get("meta_json"))
        user_id = user_id or job_row.get("user_id")
        if not user_id:
            return False
        cost = meta.get("credit_cost")
        if not cost or cost <= 0:
            return False
        if not meta.get("credits_deducted"):
            return False
        if meta.get("credits_refunded"):
            return False

        event_type = "job_refund"
        event_started = _begin_job_ledger_event(job_id, event_type)
        if not event_started:
            return False

        max_attempts = 5
        for _ in range(max_attempts):
            profile_res = (
                supabase.table("profiles")
                .select("credits_remaining")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            current_balance = (
                profile_res.data[0]["credits_remaining"] if profile_res.data else 0
            )

            update_res = (
                supabase.table("profiles")
                .update({"credits_remaining": current_balance + cost})
                .eq("id", user_id)
                .eq("credits_remaining", current_balance)
                .execute()
            )

            if getattr(update_res, "error", None):
                raise RuntimeError(getattr(update_res, "error", "Failed to refund credits"))

            updated_rows = getattr(update_res, "data", None) or []
            if updated_rows:
                break

            time.sleep(0.1)
        else:
            raise RuntimeError("Failed to atomically refund credits")

        try:
            ledger_res = supabase.table("ledger").insert(
                {
                    "user_id": user_id,
                    "change": cost,
                    "amount": 0.0,
                    "reason": f"job refund: {job_id}{' - ' + reason if reason else ''}",
                    "ts": datetime.utcnow().isoformat(),
                    "external_id": f"{event_type}:{job_id}",
                }
            ).execute()

            if getattr(ledger_res, "error", None):
                raise RuntimeError(getattr(ledger_res, "error"))

            ledger_row = _extract_first_row(ledger_res)
            _finalize_job_ledger_event(
                job_id, event_type, ledger_row, supabase_client=supabase
            )
        except Exception:
            _delete_job_ledger_event(job_id, event_type, supabase_client=supabase)
            raise

        meta["credits_refunded"] = True
        supabase.table("jobs").update({"meta_json": meta}).eq("id", job_id).execute()

        print(f"[Credits] Refunded {cost} credits for job {job_id} ({reason})")
        return True
    except Exception as exc:
        if 'event_type' in locals():
            _delete_job_ledger_event(job_id, event_type, supabase_client=supabase)
        print(f"[Credits] Failed to refund credits for job {job_id}: {exc}")
        return False

def _deduct_job_credits(
    job_id: str,
    user_id: str,
    total: int,
    meta: dict,
    *,
    supabase_client=None,
    max_attempts: int = 5,
    retry_delay: float = 0.1,
) -> Tuple[bool, Optional[int]]:
    supabase_client = supabase_client or supabase
    event_type = "job_deduction"
    event_started = _begin_job_ledger_event(
        job_id, event_type, supabase_client=supabase_client
    )

    if not event_started:
        updated = False
        if meta.get("credit_cost") != total:
            meta["credit_cost"] = total
            updated = True
        if not meta.get("credits_deducted"):
            meta["credits_deducted"] = True
            updated = True
        if "credits_refunded" not in meta:
            meta["credits_refunded"] = False
            updated = True
        if updated:
            response = (
                supabase_client.table("jobs")
                .update({"meta_json": meta})
                .eq("id", job_id)
                .execute()
            )
            if getattr(response, "error", None):
                raise RuntimeError(
                    f"Failed to persist job meta for existing deduction on {job_id}: {response.error}"
                )
        return False, None

    deduction_applied_balance: Optional[int] = None
    try:
        for _ in range(max_attempts):
            profile_res = (
                supabase_client.table("profiles")
                .select("credits_remaining")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            previous_balance = (
                profile_res.data[0]["credits_remaining"] if profile_res.data else 0
            )

            if previous_balance < total:
                raise InsufficientCreditsError("Not enough credits")

            update_res = (
                supabase_client.table("profiles")
                .update({"credits_remaining": previous_balance - total})
                .eq("id", user_id)
                .eq("credits_remaining", previous_balance)
                .execute()
            )

            if getattr(update_res, "error", None):
                raise RuntimeError(getattr(update_res, "error"))

            updated_rows = getattr(update_res, "data", None) or []
            if updated_rows:
                deduction_applied_balance = previous_balance
                ledger_res = (
                    supabase_client.table("ledger")
                    .insert(
                        {
                            "user_id": user_id,
                            "change": -total,
                            "amount": 0.0,
                            "reason": f"job deduction: {job_id}",
                            "ts": datetime.utcnow().isoformat(),
                            "external_id": f"{event_type}:{job_id}",
                        }
                    )
                    .execute()
                )

                if getattr(ledger_res, "error", None):
                    raise CreditDeductionFailed(
                        getattr(ledger_res, "error"), previous_balance
                    )

                ledger_row = _extract_first_row(ledger_res)
                _finalize_job_ledger_event(
                    job_id, event_type, ledger_row, supabase_client=supabase_client
                )

                meta["credit_cost"] = total
                meta["credits_deducted"] = True
                if "credits_refunded" not in meta:
                    meta["credits_refunded"] = False

                meta_update = (
                    supabase_client.table("jobs")
                    .update({"meta_json": meta})
                    .eq("id", job_id)
                    .execute()
                )
                if getattr(meta_update, "error", None):
                    raise CreditDeductionFailed(
                        getattr(meta_update, "error"), previous_balance
                    )

                return True, previous_balance

            time.sleep(retry_delay)

        raise RuntimeError("Failed to atomically deduct credits")
    except InsufficientCreditsError:
        _delete_job_ledger_event(job_id, event_type, supabase_client=supabase_client)
        raise
    except CreditDeductionFailed:
        _delete_job_ledger_event(job_id, event_type, supabase_client=supabase_client)
        raise
    except Exception as exc:
        _delete_job_ledger_event(job_id, event_type, supabase_client=supabase_client)
        if deduction_applied_balance is not None:
            raise CreditDeductionFailed(str(exc), deduction_applied_balance) from exc
        raise


def _get_job_timeout():
    try:
        return int(os.getenv("SUBJOB_TIMEOUT", "600"))
    except (TypeError, ValueError):
        return 600


def _update_job_progress(
    job_id: str,
    total_rows: int,
    processed_in_chunk: int,
    last_reported: int,
    *,
    supabase_client=supabase,
    max_attempts: int = 5,
    retry_delay: float = 0.05,
) -> Tuple[int, Optional[dict]]:
    """Attempt to update global job progress using optimistic concurrency control."""

    delta = processed_in_chunk - last_reported
    if delta <= 0:
        return last_reported, None

    attempts = 0
    while attempts < max_attempts:
        job_res = (
            supabase_client.table("jobs")
            .select("rows_processed")
            .eq("id", job_id)
            .limit(1)
            .execute()
        )
        already_done = job_res.data[0]["rows_processed"] if job_res.data else 0
        new_done = min(total_rows, already_done + delta)
        percent = round((new_done / total_rows) * 100, 2) if total_rows else 0.0

        update_res = (
            supabase_client.table("jobs")
            .update({"rows_processed": new_done, "progress_percent": percent})
            .eq("id", job_id)
            .eq("rows_processed", already_done)
            .execute()
        )

        if getattr(update_res, "data", None):
            return processed_in_chunk, {
                "new_done": new_done,
                "percent": percent,
                "delta": delta,
            }

        attempts += 1
        print(
            f"[Worker] Job {job_id} progress update conflict (attempt {attempts}/{max_attempts}); retrying"
        )
        if retry_delay:
            time.sleep(retry_delay)

    raise RuntimeError(
        f"Failed to update progress for job {job_id} after {max_attempts} attempts"
    )

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


def process_subjob(job_id: str, chunk_id: int, chunk_storage_path: str, meta: dict, user_id: str, total_rows: int):
    """Process a chunk of rows for a given job, with global progress logging."""
    sub_start = time.time()
    processed_in_chunk = 0
    rows_since_last_report = 0
    last_reported = 0
    chunk_input_path = _chunk_raw_local_path(job_id, chunk_id)
    downloaded_temp_dir = None
    cleanup_local_raw = False

    try:
        if os.path.exists(chunk_input_path):
            print(
                f"[Worker] Job {job_id} | Chunk {chunk_id} | using local raw chunk at {chunk_input_path}"
            )
        else:
            print(
                f"[Worker] Job {job_id} | Chunk {chunk_id} | downloading raw chunk {chunk_storage_path}"
            )
            downloaded_path = _download_chunk_from_storage(chunk_storage_path)
            downloaded_temp_dir = os.path.dirname(downloaded_path)
            chunk_input_path = downloaded_path

        headers, chunk_total_rows = _csv_headers_and_total(chunk_input_path)
        if chunk_total_rows == 0:
            print(f"[Worker] Chunk {chunk_id} for job {job_id} is empty; skipping generation")
            _remove_from_storage(
                chunk_storage_path,
                f"raw chunk {chunk_id} for job {job_id}",
                bucket=RAW_CHUNK_BUCKET,
            )
            cleanup_local_raw = True
            return None

        local_dir = os.path.join("/data/chunks", job_id)
        os.makedirs(local_dir, exist_ok=True)
        out_path = os.path.join(local_dir, f"chunk_{chunk_id}.csv")

        with open(chunk_input_path, newline="", encoding="utf-8-sig") as in_f, open(
            out_path, "w", newline="", encoding="utf-8"
        ) as out_f:
            reader = csv.DictReader(in_f)
            input_headers = reader.fieldnames or headers
            output_headers = list(input_headers)
            if "personalized_line" not in output_headers:
                output_headers.append("personalized_line")
            writer = csv.DictWriter(out_f, fieldnames=output_headers)
            writer.writeheader()

            for i, row in enumerate(reader, start=1):
                try:
                    print(
                        f"[Worker] Job {job_id} | Chunk {chunk_id} | Row {i}/{chunk_total_rows} -> {row}"
                    )
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

                normalized_row = {header: row.get(header, "") for header in input_headers}
                normalized_row["personalized_line"] = line
                writer.writerow(normalized_row)

                processed_in_chunk += 1
                rows_since_last_report += 1

                is_last_row = processed_in_chunk == chunk_total_rows
                if rows_since_last_report >= 5 or is_last_row:
                    try:
                        last_reported, progress_info = _update_job_progress(
                            job_id,
                            total_rows,
                            processed_in_chunk,
                            last_reported,
                        )
                    except RuntimeError as exc:
                        print(
                            f"[Worker] Job {job_id} | Chunk {chunk_id} | Progress update failed: {exc}"
                        )
                    else:
                        rows_since_last_report = 0
                        if progress_info:
                            new_done = progress_info["new_done"]
                            percent = progress_info["percent"]
                            delta = progress_info["delta"]
                            print(
                                f"[Worker] Job {job_id} | Chunk {chunk_id} | Progress +{delta} -> {new_done}/{total_rows} rows ({percent}%)"
                            )
                            supabase.table("job_logs").insert(
                                {
                                    "job_id": job_id,
                                    "step": new_done,
                                    "total": total_rows,
                                    "message": (
                                        f"Global progress: +{delta} rows -> {new_done}/{total_rows} ({percent}%)"
                                    ),
                                }
                            ).execute()

        print(f"[Worker] Saved local chunk {chunk_id} at {out_path}")

        storage_path = f"{user_id}/{job_id}/chunk_{chunk_id}.csv"
        with open(out_path, "rb") as f:
            _upload_to_storage(storage_path, f, f"chunk {chunk_id} for job {job_id}")

        supabase.table("files").insert(
            {
                "user_id": user_id,
                "job_id": job_id,
                "original_name": f"chunk_{chunk_id}.csv",
                "storage_path": storage_path,
                "file_type": "partial_output",
            }
        ).execute()

        try:
            rq_job = get_current_job()
            if rq_job:
                rq_job.meta[f"local_chunk_{chunk_id}"] = out_path
                rq_job.meta[f"storage_chunk_{chunk_id}"] = storage_path
                rq_job.save_meta()
                print(f"[Worker] Saved local path for chunk {chunk_id} -> {out_path}")
        except Exception as e:
            print(f"[Worker] Could not save local path for chunk {chunk_id}: {e}")

        elapsed = record_time(f"Chunk {chunk_id} row processing", sub_start, job_id)

        job_record = (
            supabase.table("jobs").select("timing_json").eq("id", job_id).limit(1).execute()
        )
        timings = {}
        if job_record.data and job_record.data[0].get("timing_json"):
            try:
                timings = json.loads(job_record.data[0]["timing_json"])
            except Exception:
                timings = {}
        if "chunks" not in timings:
            timings["chunks"] = {}
        timings["chunks"][str(chunk_id)] = elapsed
        supabase.table("jobs").update({"timing_json": json.dumps(timings)}).eq("id", job_id).execute()

        print(f"[Worker] Finished chunk {chunk_id}/{chunk_total_rows} for job {job_id}")

        _remove_from_storage(chunk_storage_path, f"raw chunk {chunk_id} for job {job_id}", bucket=RAW_CHUNK_BUCKET)
        cleanup_local_raw = True

        return storage_path

    except Exception as exc:
        error_message = f"Chunk {chunk_id} failed: {exc}"
        print(f"[Worker] Chunk error for job {job_id}: {exc}")
        traceback.print_exc()
        try:
            supabase.table("job_logs").insert(
                {
                    "job_id": job_id,
                    "step": chunk_id,
                    "total": total_rows,
                    "message": error_message,
                }
            ).execute()
        except Exception as log_exc:
            print(f"[Worker] Failed to log chunk error for job {job_id}: {log_exc}")

        try:
            supabase.table("jobs").update(
                {
                    "status": "failed",
                    "error": error_message,
                    "finished_at": datetime.utcnow().isoformat() + "Z",
                }
            ).eq("id", job_id).execute()
        except Exception as update_exc:
            print(f"[Worker] Failed to mark job {job_id} as failed: {update_exc}")

        refund_job_credits(job_id, user_id, "chunk error")
        raise
    finally:
        if cleanup_local_raw:
            try:
                if downloaded_temp_dir:
                    shutil.rmtree(downloaded_temp_dir, ignore_errors=True)
                elif os.path.exists(chunk_input_path):
                    os.remove(chunk_input_path)
                    parent_dir = os.path.dirname(chunk_input_path)
                    try:
                        if os.path.isdir(parent_dir) and not os.listdir(parent_dir):
                            os.rmdir(parent_dir)
                    except Exception:
                        pass
            except Exception as exc:
                print(
                    f"[Worker] Warning: failed to remove local raw chunk {chunk_id} for job {job_id}: {exc}"
                )


def finalize_job(job_id: str, user_id: str, total_chunks: int):
    """Merge all partial CSV files into one final result and update job status."""
    finalize_start = time.time()
    try:
        print(f"[Worker] Finalizing job {job_id} with {total_chunks} chunks")

        # Load existing timing_json from DB
        job_record = supabase.table("jobs").select("timing_json").eq("id", job_id).limit(1).execute()
        timings = {}
        if job_record.data and job_record.data[0].get("timing_json"):
            try:
                timings = json.loads(job_record.data[0]["timing_json"])
            except Exception:
                timings = {}
        if "chunks" not in timings:
            timings["chunks"] = {}

        # --- Merge CSVs ---
        merge_start = time.time()
        frames = []
        for chunk_id in range(1, total_chunks + 1):
            local_path = os.path.join("/data/chunks", job_id, f"chunk_{chunk_id}.csv")
            if os.path.exists(local_path):
                print(f"[Worker] Using local chunk {chunk_id} for job {job_id}")
                df = pd.read_csv(local_path)
            else:
                print(f"[Worker] Local chunk {chunk_id} missing, downloading from Supabase...")
                storage_path = f"{user_id}/{job_id}/chunk_{chunk_id}.csv"
                signed = supabase.storage.from_("outputs").create_signed_url(storage_path, 300)
                url = signed.get("signedURL") if signed else None
                if not url:
                    raise Exception(f"Missing signed URL for {storage_path}")
                resp = requests.get(url, timeout=60)
                resp.raise_for_status()
                tmp_dir = tempfile.mkdtemp()
                local_path = os.path.join(tmp_dir, f"chunk_{chunk_id}.csv")
                with open(local_path, "wb") as f:
                    f.write(resp.content)
                df = pd.read_csv(local_path)

            frames.append(df)


        timings["merge_csvs"] = record_time("Merging CSV chunks", merge_start, job_id)

        # --- Final CSV → XLSX ---
        upload_start = time.time()
        final_df = pd.concat(frames, ignore_index=True)
        local_dir = tempfile.mkdtemp()
        out_csv = os.path.join(local_dir, f"{job_id}_final.csv")
        out_xlsx = os.path.join(local_dir, f"{job_id}_final.xlsx")

        final_df.to_csv(out_csv, index=False)
        final_df.to_excel(out_xlsx, index=False, engine="openpyxl")

        storage_path = f"{user_id}/{job_id}/result.xlsx"
        with open(out_xlsx, "rb") as f:
            _upload_to_storage(storage_path, f, f"final result for job {job_id}")
        timings["csv_to_xlsx"] = record_time("Final CSV→XLSX + upload", upload_start, job_id)

        timings["finalize_total"] = record_time("Finalize total", finalize_start, job_id)

        # Save full timings
        supabase.table("jobs").update(
            {
                "status": "succeeded",
                "finished_at": datetime.utcnow().isoformat() + "Z",
                "result_path": storage_path,
                "progress_percent": 100,
                "timing_json": json.dumps(timings),
            }
        ).eq("id", job_id).execute()

        # Cleanup local chunks
        local_job_dir = os.path.join("/data/chunks", job_id)
        if os.path.exists(local_job_dir):
            import shutil
            shutil.rmtree(local_job_dir, ignore_errors=True)
            print(f"[Worker] Cleaned up local chunks for job {job_id}")


        print(f"[Worker] Finalized job {job_id} successfully")

    except Exception as e:
        print(f"[Worker] Finalize ERROR for job {job_id}: {e}")
        traceback.print_exc()
        supabase.table("jobs").update(
            {"status": "failed", "error": f"Finalize error: {e}"}
        ).eq("id", job_id).execute()
        refund_job_credits(job_id, user_id, "finalize error")


def process_job(job_id: str):
    """Split a job into chunks based on available workers and enqueue subjobs."""
    job_start = time.time()
    timings = {}
    job = None
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

        meta = _ensure_dict(job.get("meta_json"))

        user_id = job["user_id"]
        file_path = meta.get("file_path")
        if not file_path:
            supabase.table("jobs").update(
                {"status": "failed", "error": "Missing file_path"}
            ).eq("id", job_id).execute()
            return

        # --- Download file ---
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

        headers, total, row_iter = _input_iterator(local_path)

        timings["download_input"] = record_time("Download input file", dl_start, job_id)

        # --- Check credits ---
        setup_start = time.time()
        lock_name = f"credits_lock:{user_id}"
        lock = redis_conn.lock(lock_name, timeout=30, blocking_timeout=10)
        acquired = False
        deducted = False
        previous_balance: Optional[int] = None
        try:
            acquired = lock.acquire(blocking=True)
            if not acquired:
                raise RuntimeError("Unable to acquire credit lock")

            try:
                deducted, previous_balance = _deduct_job_credits(
                    job_id,
                    user_id,
                    total,
                    meta,
                    supabase_client=supabase,
                )
            except InsufficientCreditsError:
                supabase.table("jobs").update(
                    {
                        "status": "failed",
                        "finished_at": datetime.utcnow().isoformat() + "Z",
                        "error": "Not enough credits",
                    }
                ).eq("id", job_id).execute()
                return
            except CreditDeductionFailed as deduction_exc:
                if deduction_exc.previous_balance is not None:
                    deducted = True
                    previous_balance = deduction_exc.previous_balance
                raise

        except Exception as exc:
            print(f"[Credits] Error while deducting for job {job_id}: {exc}")
            if deducted and previous_balance is not None:
                try:
                    supabase.table("profiles").update(
                        {"credits_remaining": previous_balance}
                    ).eq("id", user_id).execute()
                except Exception as rollback_exc:
                    print(f"[Credits] Failed to rollback deduction for job {job_id}: {rollback_exc}")
            supabase.table("jobs").update(
                {
                    "status": "failed",
                    "finished_at": datetime.utcnow().isoformat() + "Z",
                    "error": "Unable to deduct credits",
                }
            ).eq("id", job_id).execute()
            return
        finally:
            if lock is not None and acquired:
                try:
                    lock.release()
                except LockError:
                    pass

        timings["setup"] = record_time("Setup (credits + DB updates)", setup_start, job_id)

        supabase.table("jobs").update(
            {
                "status": "in_progress",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "rows_processed": 0,
                "progress_percent": 0,
            }
        ).eq("id", job_id).execute()

        # --- Chunking ---
        chunk_start = time.time()
        try:
            num_workers = int(os.getenv("WORKER_COUNT", "1"))
        except Exception:
            num_workers = 1

        subjob_refs = []
        chunk_buffer = []
        chunk_count = 0

        job_timeout = _get_job_timeout()

        if total > 0:
            num_chunks = min(total, num_workers) or 1
            chunk_size = max(1, math.ceil(total / num_chunks))
            for row in row_iter:
                chunk_buffer.append(row)
                if len(chunk_buffer) >= chunk_size:
                    chunk_count += 1
                    storage_chunk_path = _persist_chunk_rows(
                        job_id,
                        chunk_count,
                        headers,
                        chunk_buffer,
                        user_id,
                    )
                    job_ref = queue.enqueue(
                        process_subjob,
                        job_id,
                        chunk_count,
                        storage_chunk_path,
                        meta,
                        user_id,
                        total,
                        job_timeout=job_timeout,
                    )
                    subjob_refs.append(job_ref)
                    chunk_buffer = []

            if chunk_buffer:
                chunk_count += 1
                storage_chunk_path = _persist_chunk_rows(
                    job_id,
                    chunk_count,
                    headers,
                    chunk_buffer,
                    user_id,
                )
                job_ref = queue.enqueue(
                    process_subjob,
                    job_id,
                    chunk_count,
                    storage_chunk_path,
                    meta,
                    user_id,
                    total,
                    job_timeout=job_timeout,
                )
                subjob_refs.append(job_ref)
                chunk_buffer = []

        timings["chunking"] = record_time("Chunking + enqueue", chunk_start, job_id)

        if chunk_count > 0:
            queue.enqueue(
                finalize_job,
                job_id,
                user_id,
                chunk_count,
                depends_on=subjob_refs,
                job_timeout=job_timeout,
            )
        else:
            _finalize_empty_job(job_id, user_id, headers, timings, job_start)
            return

        timings["process_job_total"] = record_time("process_job total", job_start, job_id)
        supabase.table("jobs").update({"timing_json": json.dumps(timings)}).eq("id", job_id).execute()

        print(f"[Worker] Enqueued {chunk_count} chunks + finalize for job {job_id}")

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
        user_for_refund = job.get("user_id") if isinstance(job, dict) else None
        refund_job_credits(job_id, user_for_refund, "process_job error")


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
