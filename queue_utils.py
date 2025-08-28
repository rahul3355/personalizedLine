# queue_utils.py
import sqlite3, os, json, time, uuid
from contextlib import contextmanager
from backend.app import db, jobs, gpt_helpers

DB_PATH = "jobs.db"

@contextmanager
def db():
    con = sqlite3.connect(DB_PATH, timeout=30)
    con.execute("PRAGMA journal_mode=WAL;")
    try:
        yield con
        con.commit()
    finally:
        con.close()

def init_db():
    with db() as con:
        con.execute("""CREATE TABLE IF NOT EXISTS jobs(
            id TEXT PRIMARY KEY,
            status TEXT,
            filename TEXT,
            rows INT,
            created_at INT,
            started_at INT,
            finished_at INT,
            error TEXT,
            result_path TEXT,
            meta_json TEXT
        )""")

def enqueue_job(filename, rows, meta: dict) -> str:
    job_id = str(uuid.uuid4())
    with db() as con:
        con.execute("INSERT INTO jobs(id,status,filename,rows,created_at,meta_json) VALUES (?,?,?,?,?,?)",
                    (job_id, "queued", filename, rows, int(time.time()), json.dumps(meta)))
    return job_id

def update_job(job_id, **fields):
    sets = ",".join([f"{k}=?" for k in fields])
    vals = list(fields.values()) + [job_id]
    with db() as con:
        con.execute(f"UPDATE jobs SET {sets} WHERE id=?", vals)

def get_job(job_id):
    with db() as con:
        cur = con.execute("SELECT * FROM jobs WHERE id=?", (job_id,))
        row = cur.fetchone()
    if not row:
        return None
    keys = [d[0] for d in cur.description]
    return dict(zip(keys, row))

def list_jobs(limit=20):
    with db() as con:
        cur = con.execute("SELECT id,status,filename,rows,created_at,finished_at FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,))
        return [dict(zip([d[0] for d in cur.description], r)) for r in cur.fetchall()]
    
def worker_loop():
    while True:
        # check DB for queued jobs
        job = jobs.next_queued_job()
        if job:
            try:
                jobs.process_job(job["id"])
            except Exception as e:
                db.update_job(job["id"], status="failed", error=str(e))
        else:
            time.sleep(2)  # nothing to do, wait
