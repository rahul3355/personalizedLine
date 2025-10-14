import os
import pandas as pd
import streamlit as st

from backend.app.db import enqueue_job
from backend.app.jobs import process_job, EXEC
from backend.app.gpt_helpers import generate_line as legacy_generate_line
from backend.app.personalized_line_generator import generate_personalized_opener

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _normalize_email(value: object) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text


def _service_clause(offer: str, persona: str, channel: str) -> str:
    offer = offer.strip()
    persona = persona.strip()
    channel = channel.strip()
    if not any([offer, persona, channel]):
        return ""
    # Simple sentence that satisfies the "three consecutive words" rule.
    return f"I help {persona or 'prospects'} with {offer or 'your offer'} through {channel or 'multi-channel outreach'}".strip()


def render(user_id: str):
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
    service_context = _service_clause(offer, persona, channel)

    if uploaded:
        df = pd.read_csv(uploaded) if uploaded.name.endswith(".csv") else pd.read_excel(uploaded)
        df.columns = [c.strip() for c in df.columns]

        title_col = st.selectbox("Job title column", options=df.columns)
        company_col = st.selectbox("Company column", options=df.columns)
        desc_col = st.selectbox("Description column", options=df.columns)
        email_col = st.selectbox("Email column", options=df.columns)

        if st.button("Generate Preview"):
            prev = df.head(3).copy()
            lines = []
            for _, row in prev.iterrows():
                email_value = _normalize_email(row[email_col])
                line = ""
                if email_value:
                    try:
                        line = generate_personalized_opener(
                            email_value,
                            service_context=service_context or None,
                        )
                    except Exception as exc:
                        st.warning(f"DeepSeek generator failed for {email_value}: {exc}")
                if not line:
                    line = legacy_generate_line(
                        row[title_col],
                        row[company_col],
                        row[desc_col],
                        offer,
                        persona,
                        channel,
                        max_words,
                    )
                lines.append(line)
            prev["personalized_line"] = lines
            st.dataframe(prev[[title_col, company_col, "personalized_line"]])

        if st.button("Start Full File Job"):
            if len(df) > 50:
                df = df.head(50)

            file_path = os.path.join(UPLOAD_DIR, uploaded.name)
            with open(file_path, "wb") as f:
                f.write(uploaded.getbuffer())

            meta = {
                "offer": offer,
                "persona": persona,
                "channel": channel,
                "max_words": max_words,
                "title_col": title_col,
                "company_col": company_col,
                "desc_col": desc_col,
                "email_col": email_col,
                "service": service_context,
                "file_path": file_path,
            }
            job_id = enqueue_job(uploaded.name, len(df), meta, user_id)
            EXEC.submit(process_job, job_id)
            st.success("✅ File is being processed. Check Past Files.")
