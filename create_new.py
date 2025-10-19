import os, pandas as pd, streamlit as st
from backend.app.db import enqueue_job
from backend.app.jobs import process_job, EXEC
from backend.app.gpt_helpers import generate_opener

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

    if uploaded:
        df = pd.read_csv(uploaded) if uploaded.name.endswith(".csv") else pd.read_excel(uploaded)
        df.columns = [c.strip() for c in df.columns]

        email_col = st.selectbox("Email column", options=df.columns)
        service_context = (
            f"Offer: {offer}\n"
            f"Persona: {persona}\n"
            f"Channel: {channel}\n"
            f"Max words: {max_words}"
        )

        if st.button("Generate Preview"):
            prev = df.head(3).copy()
            lines = []
            for _, row in prev.iterrows():
                opener, *_ = generate_opener(
                    company=row.get(email_col, ""),
                    description="",
                    industry="",
                    role="",
                    size="",
                    service=service_context,
                )
                lines.append(opener)
            prev["personalized_line"] = lines
            st.dataframe(prev[[email_col, "personalized_line"]])

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
                "email_col": email_col,
                "service": service_context,
                "file_path": file_path,
            }
            job_id = enqueue_job(uploaded.name, len(df), meta, user_id)
            EXEC.submit(process_job, job_id)
            st.success("✅ File is being processed. Check Past Files.")
