import pandas as pd, os, time, json
from concurrent.futures import ThreadPoolExecutor
from backend.app.db import get_job, update_job, log_progress
from backend.app.gpt_helpers import generate_line
from backend.app import db

WORK_DIR = "outputs"
os.makedirs(WORK_DIR, exist_ok=True)
EXEC = ThreadPoolExecutor(max_workers=2)



def next_queued_job():
    with db.db() as con:
        cur = con.execute("SELECT * FROM jobs WHERE status='queued' ORDER BY created_at LIMIT 1")
        row = cur.fetchone()
        if row:
            keys = [d[0] for d in cur.description]
            return dict(zip(keys, row))
    return None

def process_job(job_id):
    try:
        job = get_job(job_id)
        meta = json.loads(job["meta_json"])
        file_path = meta.get("file_path")

        df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)

        update_job(job_id, status="running", started_at=int(time.time()))

        out_lines = []
        total = len(df)
        for i, (_, row) in enumerate(df.iterrows(), start=1):
            try:
                line = generate_line(
                    row.get(meta["title_col"], ""),
                    row.get(meta["company_col"], ""),
                    row.get(meta["desc_col"], ""),
                    meta["offer"], meta["persona"], meta["channel"], meta["max_words"]
                )
            except Exception as e:
                line = f"[Error generating line: {e}]"
            out_lines.append(line)
            log_progress(job_id, f"Working on {row.get(meta['company_col'],'')} ({i}/{total})", i, total)

        df["personalized_line"] = out_lines
        out_path = os.path.join(WORK_DIR, f"{job_id}.xlsx")
        df.to_excel(out_path, index=False, engine="openpyxl")
        update_job(job_id, status="succeeded", finished_at=int(time.time()), result_path=out_path)

    except Exception as e:
        update_job(job_id, status="failed", finished_at=int(time.time()), error=str(e))
