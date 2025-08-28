import time
from db import get_job, update_job
from jobs import process_job

def next_queued_job():
    from db import db
    with db() as con:
        cur = con.execute("SELECT id FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1")
        row = cur.fetchone()
        return row[0] if row else None

def worker_loop():
    while True:
        job_id = next_queued_job()
        if job_id:
            try:
                process_job(job_id)
            except Exception as e:
                update_job(job_id, status="failed", error=str(e))
        else:
            time.sleep(2)  # nothing to do
