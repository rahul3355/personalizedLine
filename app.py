import streamlit as st
import pandas as pd
import openai
import string
import re
import os
import time
from concurrent.futures import ThreadPoolExecutor
import sqlite3, json, uuid
from contextlib import contextmanager
from streamlit_supabase_auth import login_form, logout_button

# ---------- paths ----------
DB_PATH = "jobs.db"
UPLOAD_DIR = "uploads"
WORK_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(WORK_DIR, exist_ok=True)

# ---------- queue utils ----------
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

        # Safe migrations
        try:
            con.execute("ALTER TABLE jobs ADD COLUMN user_id TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            con.execute("ALTER TABLE job_logs ADD COLUMN step INT DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            con.execute("ALTER TABLE job_logs ADD COLUMN total INT DEFAULT 0")
        except sqlite3.OperationalError:
            pass

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
        if not row:
            return None
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

init_db()
EXEC = ThreadPoolExecutor(max_workers=2)

# ---------- GPT helpers ----------
openai.api_key = st.secrets["OPENAI_API_KEY"]

def call_gpt(prompt, temperature=0.4, max_tokens=150, model="gpt-4o-mini"):
    resp = openai.chat.completions.create(
        model=model,
        temperature=temperature,
        max_completion_tokens=max_tokens,
        messages=[
            {"role":"system","content":"You are a precise SDR copywriter. Always output one sentence, Gmail-style, never fluff."},
            {"role":"user","content":prompt}
        ],
    )
    return resp.choices[0].message.content.strip()

def preprocess_description(desc: str) -> str:
    if not desc: return ""
    desc = re.sub(r"[^a-zA-Z0-9\s]", "", str(desc))
    desc = re.sub(r"\s+", " ", desc).strip()
    return desc

def guess_problem(desc: str) -> str:
    desc = desc.lower()
    if "cloud" in desc: return "wasted cloud spend"
    if "engineer" in desc or "recruit" in desc: return "hiring bottlenecks"
    if "insurance" in desc or "data" in desc: return "compliance delays"
    return "growth bottlenecks"

def guess_urgency(problem: str) -> str:
    if "cloud" in problem: return "budget pressure from CFOs"
    if "hiring" in problem: return "missed product deadlines"
    if "compliance" in problem: return "regulatory risk"
    return "slowed growth"

# ✅ Restored original prompt rules
def generate_line(title, company, desc, offer, persona, channel, max_words):
    clean_desc = preprocess_description(desc)
    problem = guess_problem(clean_desc)
    urgency = guess_urgency(problem)
    examples = """
Examples:
1. CloudScale helps SMBs cut wasted cloud spend, and LinkedIn posts naming idle-resource waste spark CFO replies under budget pressure.
2. TalentBridge speeds up startup hiring, and founders blocked by engineering bottlenecks often engage when proof of faster placements is shared on LinkedIn.
3. Dutch Digital tackles inefficiencies in insurance data-sharing, and posts pointing out compliance delays trigger quick responses from industry leaders.
"""
    prompt = f"""{examples}

Now write one cold outreach first-line for a Gmail cold email.

Company: {company}
Title: {title}
Description: {clean_desc}
Problem: {problem}
Why it matters: {urgency}
Offer: {offer}
Persona: {persona}
Channel: {channel}

Rules:
- One sentence only. 18–{max_words} words.
- Must explicitly mention {company} by name.
- Structure: Observation → Pain → Bridge.
- Tone: researched, sharp, natural.
- No filler like “I noticed”, “industry leaders”, “mission”, “tailored”.
- Output only the sentence.
"""
    return call_gpt(prompt, temperature=0.5)

# ---------- async worker ----------
def process_job(job_id):
    try:
        job = get_job(job_id)
        meta = json.loads(job["meta_json"])

        # reload file
        file_path = meta.get("file_path")
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        title_col = meta.get("title_col")
        company_col = meta.get("company_col")
        desc_col = meta.get("desc_col")
        offer = meta.get("offer")
        persona = meta.get("persona")
        channel = meta.get("channel")
        max_words = meta.get("max_words")

        update_job(job_id, status="running", started_at=int(time.time()))

        total = len(df)
        out_lines = []

        for i, (_, row) in enumerate(df.iterrows(), start=1):
            try:
                line = generate_line(
                    row.get(title_col, ""),
                    row.get(company_col, ""),
                    row.get(desc_col, ""),
                    offer, persona, channel, max_words
                )
            except Exception as e:
                line = f"[Error generating line: {e}]"

            out_lines.append(line)
            log_progress(job_id, f"Working on {row.get(company_col,'')} ({i}/{total})", i, total)

        df_out = df.copy()
        df_out["personalized_line"] = out_lines
        out_path = os.path.join(WORK_DIR, f"{job_id}.xlsx")
        df_out.to_excel(out_path, index=False, engine="openpyxl")

        update_job(job_id, status="succeeded", finished_at=int(time.time()), result_path=out_path)
    except Exception as e:
        update_job(job_id, status="failed", finished_at=int(time.time()), error=str(e))

# ---------- UI Navigation ----------
st.set_page_config(page_title="Personalized Outreach Tool", layout="wide")

user = login_form()  # Supabase auth
if not user:
    st.stop()

logout_button()

# ✅ pull correct ID from Supabase
user_id = user["user"]["id"]

PAGES = ["Create New", "Past Files"]
choice = st.sidebar.radio("Choose Page", PAGES)

# ---------- Generator Page ----------
if choice == "Create New":
    st.header("Step 1: Upload Your File")
    st.caption("Upload a CSV or Excel file that has people, company names, and company descriptions.")
    uploaded = st.file_uploader("Upload file", type=["csv", "xlsx"])

    col1, col2, col3 = st.columns([2,1,1])
    with col1:
        raw_offer = st.text_input("What are you offering?", value="turning LinkedIn posts into calls with decision makers")
    with col2:
        persona_label = st.text_input("Who are you targeting?", value="Founders")
    with col3:
        channel_phrase = st.text_input("Mention channel? (optional)", value="LinkedIn")

    max_words = st.slider("Limit words in sentence", min_value=18, max_value=28, value=24, step=1)

    if uploaded:
        df = pd.read_csv(uploaded) if uploaded.name.endswith(".csv") else pd.read_excel(uploaded)
        df.columns = [c.strip() for c in df.columns]

        st.subheader("Step 2: Match Your Columns")
        title_col = st.selectbox("Which column has job title / role?", options=df.columns)
        company_col = st.selectbox("Which column has company name?", options=df.columns)
        desc_col = st.selectbox("Which column has company description?", options=df.columns)

        offer_clean = raw_offer.strip()

        st.subheader("Step 3: Preview")
        if st.button("Generate Preview"):
            prev = df.head(3).copy()
            lines = []
            progress = st.progress(0)
            status = st.empty()
            total = len(prev)
            for i, (_, row) in enumerate(prev.iterrows(), start=1):
                line = generate_line(row.get(title_col,""), row.get(company_col,""), row.get(desc_col,""),
                                     offer_clean, persona_label, channel_phrase, max_words)
                lines.append(line)
                progress.progress(i/total)
                status.text(f"Creating line {i}/{total} for {row.get(company_col,'')}")
            prev["personalized_line"] = lines
            st.dataframe(prev[[title_col, company_col, "personalized_line"]])

        st.subheader("Step 4: Create Full File")
        if st.button("Start Full File Job"):
            if len(df) > 50:
                st.warning("Free trial limited to 50 rows. Only first 50 will be processed.")
                df = df.head(50)

            file_path = os.path.join(UPLOAD_DIR, uploaded.name)
            with open(file_path, "wb") as f:
                f.write(uploaded.getbuffer())

            meta = {
                "offer": offer_clean, "persona": persona_label,
                "channel": channel_phrase, "max_words": max_words,
                "title_col": title_col, "company_col": company_col, "desc_col": desc_col,
                "file_path": file_path
            }
            job_id = enqueue_job(uploaded.name, len(df), meta, user_id)
            EXEC.submit(process_job, job_id)
            st.success("✅ Your file is being processed in the background. Check 'Past Files' page to see progress.")

# ---------- Past Jobs Page ----------
elif choice == "Past Files":
    st.header("Your Past Files")
    st.caption("See progress of files you created. Download when ready.")

    jobs = list_jobs(user_id, limit=50)

    if not jobs:
        st.info("No files created yet.")
    else:
        for job in jobs:
            created = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(job["created_at"]))
            finished = job["finished_at"]
            finished = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(finished)) if finished else "—"

            st.write(f"**{job['filename']}** ({job['rows']} rows)")
            st.caption(f"Uploaded: {created} | Finished: {finished}")

            if job["status"] == "running":
                percent, message = get_progress(job["id"])
                st.progress(percent/100 if percent else 0)
                st.caption(f"In progress: {message or 'Working...'} ({percent or 0}%)")
            elif job["status"] == "succeeded":
                st.success("✅ Done – ready to download")
                if job["result_path"]:
                    with open(job["result_path"], "rb") as fh:
                        st.download_button("Download File", data=fh.read(),
                                           file_name=os.path.basename(job["result_path"]),
                                           mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            elif job["status"] == "failed":
                st.error("❌ Failed – please try again later")
            elif job["status"] == "queued":
                st.warning("⏳ Waiting to start...")
            st.markdown("---")
