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
        # Existing jobs table
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

        # Existing job logs
        con.execute("""CREATE TABLE IF NOT EXISTS job_logs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT,
            ts INT,
            step INT DEFAULT 0,
            total INT DEFAULT 0,
            message TEXT
        )""")

        # ✅ Users table
        con.execute("""CREATE TABLE IF NOT EXISTS users(
            id TEXT PRIMARY KEY,              -- Supabase user_id
            email TEXT,
            plan_type TEXT,                   -- starter, growth, pro, free
            subscription_status TEXT,         -- active, canceled, inactive
            renewal_date INT,                 -- timestamp
            credits_remaining INT DEFAULT 0
        )""")

        # ✅ Ledger table
        con.execute("""CREATE TABLE IF NOT EXISTS ledger(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            change INT,                       -- +1000, -20, etc.
            reason TEXT,                      -- 'subscription reset', 'job deduction', 'add-on purchase'
            ts INT
        )""")

        # ✅ Webhook events (for idempotency)
        con.execute("""CREATE TABLE IF NOT EXISTS webhook_events(
            id TEXT PRIMARY KEY,              -- Stripe event_id
            type TEXT,
            created_at INT
        )""")

def enqueue_job(filename, rows, meta: dict, user_id: str) -> str:
    job_id = str(uuid.uuid4())
    print(f"[DB] Enqueue job {job_id} file={filename} rows={rows}")
    with db() as con:
        con.execute("INSERT INTO jobs(id,status,filename,rows,created_at,meta_json,user_id) VALUES (?,?,?,?,?,?,?)",
                    (job_id, "queued", filename, rows, int(time.time()), json.dumps(meta), user_id))
    return job_id

def update_job(job_id, **fields):
    print(f"[DB] Update job {job_id} {fields}")
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
    print(f"[DB LOG] job={job_id} step={step}/{total} msg={message}")
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

# ======================================================
# ✅ Credit System Helpers
# ======================================================

def ensure_user(user_id: str, email: str):
    """Create a user record if it doesn't exist yet."""
    with db() as con:
        cur = con.execute("SELECT id FROM users WHERE id=?", (user_id,))
        if not cur.fetchone():
            con.execute("INSERT INTO users(id,email,plan_type,subscription_status,renewal_date,credits_remaining) VALUES (?,?,?,?,?,?)",
                        (user_id, email, None, "inactive", 0, 0))

def get_user(user_id: str):
    with db() as con:
        cur = con.execute("SELECT * FROM users WHERE id=?", (user_id,))
        row = cur.fetchone()
        if not row: 
            return None
        keys = [d[0] for d in cur.description]
        return dict(zip(keys, row))

def update_credits(user_id: str, change: int, reason: str):
    """Increment or decrement credits and record the change in ledger."""
    with db() as con:
        con.execute("UPDATE users SET credits_remaining = credits_remaining + ? WHERE id=?", (change, user_id))
        con.execute("INSERT INTO ledger(user_id, change, reason, ts) VALUES (?,?,?,?)",
                    (user_id, change, reason, int(time.time())))

def get_credits(user_id: str):
    with db() as con:
        cur = con.execute("SELECT credits_remaining FROM users WHERE id=?", (user_id,))
        row = cur.fetchone()
        return row[0] if row else 0

def get_ledger(user_id: str, limit=20):
    """Return recent credit changes."""
    with db() as con:
        cur = con.execute("SELECT change, reason, ts FROM ledger WHERE user_id=? ORDER BY ts DESC LIMIT ?", (user_id, limit))
        return [dict(zip([d[0] for d in cur.description], r)) for r in cur.fetchall()]
