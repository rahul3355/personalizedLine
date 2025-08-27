# app.py
import streamlit as st, os, time, pandas as pd
from auth import require_user, sign_out_button
from db import init_db, enqueue_job, list_jobs, get_progress, get_job
from jobs import process_job, EXEC

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

st.set_page_config(page_title="Personalized Outreach Tool", layout="wide")

# ---------- Init + Auth ----------
init_db()
user = require_user()  # ✅ Google enforced
sign_out_button()

PAGES = ["Create New", "Past Files"]
choice = st.sidebar.radio("Choose Page", PAGES)

# ---------- Create New ----------
if choice == "Create New":
    st.header("Step 1: Upload Your File")
    uploaded = st.file_uploader("Upload file", type=["csv", "xlsx"])

    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        offer = st.text_input("What are you offering?", "turning LinkedIn posts into calls")
    with col2:
        persona = st.text_input("Who are you targeting?", "Founders")
    with col3:
        channel = st.text_input("Channel?", "LinkedIn")

    max_words = st.slider("Limit words", 18, 28, 24)

    if uploaded:
        df = pd.read_csv(uploaded) if uploaded.name.endswith(".csv") else pd.read_excel(uploaded)
        df.columns = [c.strip() for c in df.columns]

        title_col = st.selectbox("Job title column", options=df.columns)
        company_col = st.selectbox("Company column", options=df.columns)
        desc_col = st.selectbox("Description column", options=df.columns)

        if st.button("Generate Preview"):
            prev = df.head(3).copy()
            lines = []
            from gpt_helpers import generate_line
            for _, row in prev.iterrows():
                lines.append(generate_line(row[title_col], row[company_col], row[desc_col],
                                           offer, persona, channel, max_words))
            prev["personalized_line"] = lines
            st.dataframe(prev[[title_col, company_col, "personalized_line"]])

        if st.button("Start Full File Job"):
            if len(df) > 50:
                df = df.head(50)
            file_path = os.path.join(UPLOAD_DIR, uploaded.name)
            with open(file_path, "wb") as f:
                f.write(uploaded.getbuffer())
            meta = {
                "offer": offer, "persona": persona, "channel": channel,
                "max_words": max_words, "title_col": title_col,
                "company_col": company_col, "desc_col": desc_col,
                "file_path": file_path
            }
            job_id = enqueue_job(uploaded.name, len(df), meta, user["id"])
            EXEC.submit(process_job, job_id)
            st.success("✅ File is being processed. Check Past Files.")

# ---------- Past Files ----------
elif choice == "Past Files":
    st.header("Your Past Files")
    jobs = list_jobs(user["id"], limit=50)

    if not jobs:
        st.info("No files yet.")
    else:
        for job in jobs:
            created = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(job["created_at"]))
            finished = job["finished_at"]
            finished = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(finished)) if finished else "—"

            st.write(f"**{job['filename']}** ({job['rows']} rows) – {job['status']}")
            st.caption(f"Uploaded: {created} | Finished: {finished}")

            if job["status"] == "running":
                progress_ph = st.empty()
                status_ph = st.empty()
                percent, msg = get_progress(job["id"])
                progress_ph.progress((percent or 0) / 100)
                status_ph.caption(f"In progress: {msg or 'Working...'} ({percent or 0}%)")

                for _ in range(120):
                    time.sleep(2)
                    percent, msg = get_progress(job["id"])
                    progress_ph.progress((percent or 0) / 100)
                    status_ph.caption(f"In progress: {msg or 'Working...'} ({percent or 0}%)")

                    j = get_job(job["id"])
                    if j and j.get("status") != "running":
                        st.rerun()
                        break

            elif job["status"] == "succeeded":
                st.success("Done – ready to download")
                if job["result_path"]:
                    try:
                        with open(job["result_path"], "rb") as fh:
                            st.download_button(
                                "Download File",
                                data=fh.read(),
                                file_name=os.path.basename(job["result_path"]),
                                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                key=f"dl-{job['id']}",
                            )
                    except FileNotFoundError:
                        st.error("Output file not found on disk.")

            elif job["status"] == "failed":
                st.error("Failed – check and retry")

            elif job["status"] == "queued":
                st.warning("Waiting to start…")

            st.markdown("---")
