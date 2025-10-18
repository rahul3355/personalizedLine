import os
from typing import List

import pandas as pd
import streamlit as st

from backend.app.db import enqueue_job
from backend.app.jobs import EXEC, process_job
from backend.app.groq_pipeline import (
    ProspectResearchError,
    SERVICE_CONTEXT_DEFAULT,
    generate_opener_from_email,
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _preview_lines(rows: pd.DataFrame, email_col: str, service_context: str) -> List[str]:
    previews: List[str] = []
    for _, row in rows.iterrows():
        email = str(row.get(email_col, "") or "").strip()
        if not email:
            previews.append("[Missing email]")
            continue
        try:
            result = generate_opener_from_email(email, service_context=service_context)
            line = result.line
            if result.fallback_reason:
                line = f"[Fallback:{result.fallback_reason}] {line}"
            previews.append(line)
        except ProspectResearchError as exc:
            previews.append(f"[Fallback] {exc}")
        except Exception as exc:  # pragma: no cover - debugging helper only
            previews.append(f"[Error generating line: {exc}]")
    return previews


def render(user_id: str):
    st.header("Step 1: Upload Your File")
    uploaded = st.file_uploader("Upload file", type=["csv", "xlsx"])

    service_context = st.text_area(
        "Service context passed to the model",
        SERVICE_CONTEXT_DEFAULT,
        height=160,
    )

    if uploaded:
        df = (
            pd.read_csv(uploaded)
            if uploaded.name.endswith(".csv")
            else pd.read_excel(uploaded)
        )
        df.columns = [c.strip() for c in df.columns]

        email_col = st.selectbox("Email column", options=df.columns)

        if st.button("Generate Preview"):
            preview_df = df.head(3).copy()
            preview_df["personalized_line"] = _preview_lines(
                preview_df, email_col, service_context
            )
            st.dataframe(preview_df[[email_col, "personalized_line"]])

        if st.button("Start Full File Job"):
            if len(df) > 50:
                df = df.head(50)

            file_path = os.path.join(UPLOAD_DIR, uploaded.name)
            with open(file_path, "wb") as f:
                f.write(uploaded.getbuffer())

            meta = {
                "file_path": file_path,
                "email_col": email_col,
                "service_context": service_context,
                "pipeline": "groq",
            }
            job_id = enqueue_job(uploaded.name, len(df), meta, user_id)
            EXEC.submit(process_job, job_id)
            st.success("✅ File is being processed. Check Past Files.")
