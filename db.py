import sqlite3, json, time, uuid
from contextlib import contextmanager

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
            meta_json TEXT,
            user_id TEXT
        )""")

        con.execute("""CREATE TABLE IF NOT EXISTS job_logs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT,
            ts INT,
            step INT DEFAULT 0,
            total INT DEFAULT 0,
            message TEXT
        )""")

def enqueue_job(filename, rows, meta: dict, user_id: str) -> str:
    job_id = str(uuid.uuid4())
    with db() as con:
        con.execute("INSERT INTO jobs(id,status,filename,rows,created_at,meta_json,user_id) VALUES (?,?,?,?,?,?,?)",
                    (job_id, "queued", filename, rows, int(time.time()), json.dumps(meta), user_id))
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
        if not row: return None
        keys = [d[0] for d in cur.description]
    return dict(zip(keys, row))

def list_jobs(user_id: str, limit=50):
    with db() as con:
        cur = con.execute("SELECT id,status,filename,rows,created_at,finished_at,error,result_path FROM jobs WHERE user_id=? ORDER BY created_at DESC LIMIT ?", (user_id, limit))
        return [dict(zip([d[0] for d in cur.description], r)) for r in cur.fetchall()]

def log_progress(job_id, message, step, total):
    with db() as con:
        con.execute("INSERT INTO job_logs(job_id, ts, step, total, message) VALUES (?,?,?,?,?)",
                    (job_id, int(time.time()), step, total, message))

def get_progress(job_id):
    with db() as con:
        cur = con.execute("SELECT step,total,message FROM job_logs WHERE job_id=? ORDER BY ts DESC LIMIT 1",(job_id,))
        row = cur.fetchone()
        if row:
            step, total, message = row
            percent = int((step/total)*100) if total else 0
            return percent, message
        return None, None
