import streamlit as st
import pandas as pd
import openai
import io
import string
import re

# ---------- version ----------
def bump_version():
    try:
        with open("version.txt", "r+") as f:
            cur = f.read().strip()
            major, minor, patch, letter = cur.split(".")
            idx = string.ascii_lowercase.index(letter)
            letter = string.ascii_lowercase[idx + 1] if idx < 25 else "a"
            patch = patch if idx < 25 else str(int(patch) + 1)
            new_v = f"{major}.{minor}.{patch}.{letter}"
            f.seek(0); f.write(new_v); f.truncate()
        return new_v
    except FileNotFoundError:
        with open("version.txt", "w") as f:
            f.write("0.0.0.a")
        return "0.0.0.a"

VERSION = bump_version()

# ---------- app ----------
st.set_page_config(page_title="Personalized Outreach Line Generator", page_icon="✨", layout="centered")
openai.api_key = st.secrets["OPENAI_API_KEY"]

st.title("Personalized Outreach Line Generator (Simple One-Pass)")
st.caption("Pipeline: Preprocess → GPT one-pass → Final line. One sentence, 18–26 words, always Observation → Pain → Bridge.")

uploaded = st.file_uploader("Upload CSV/XLSX with columns: title, company, company short description", type=["csv", "xlsx"])

col1, col2, col3 = st.columns([2,1,1])
with col1:
    raw_offer = st.text_input("Your offer (plain English)", value="turning LinkedIn posts into calls with decision makers")
with col2:
    persona_label = st.text_input("Primary persona (e.g., CFOs, CIOs, HR leaders)", value="Founders")
with col3:
    channel_phrase = st.text_input("Optional channel mention (blank = none)", value="LinkedIn")

max_words = st.slider("Word limit", min_value=18, max_value=28, value=24, step=1)

# ---------- GPT helper ----------
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

# ---------- preprocessing ----------
def preprocess_description(desc: str) -> str:
    """Basic cleaning of description."""
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

# ---------- line generator ----------
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

# ---------- main ----------
if uploaded:
    df = pd.read_csv(uploaded) if uploaded.name.endswith(".csv") else pd.read_excel(uploaded)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    desc_col = None
    for c in ["company_short_description","company_description","description","company_desc"]:
        if c in df.columns: desc_col = c
    if not desc_col: st.error("Missing required description column."); st.stop()

    offer_clean = raw_offer.strip()

    # --- Preview first 3 ---
    st.subheader("Preview")
    if st.button("Preview first 3"):
        prev = df.head(3).copy()
        lines = []
        progress = st.progress(0)
        status = st.empty()
        total = len(prev)
        for i, (_, row) in enumerate(prev.iterrows(), start=1):
            line = generate_line(row.get("title",""), row.get("company",""), row.get(desc_col,""),
                                 offer_clean, persona_label, channel_phrase, max_words)
            lines.append(line)
            status.text(f"{i}/{total} processed: {row.get('company','')}")
            progress.progress(min(i/total,1.0))
        prev["personalized_line"] = lines
        st.dataframe(prev[["title","company","personalized_line"]])

    # --- Generate full file ---
    st.subheader("Generate")
    if st.button("Generate full file"):
        if len(df) > 50:
            st.warning("Free tier limited to 50 rows."); df = df.head(50)

        out = []
        progress = st.progress(0)
        status = st.empty()
        total = len(df)

        for i, (_, row) in enumerate(df.iterrows(), start=1):
            line = generate_line(row.get("title",""), row.get("company",""), row.get(desc_col,""),
                                 offer_clean, persona_label, channel_phrase, max_words)
            out.append(line)
            status.text(f"{i}/{total} processed: {row.get('company','')}")
            progress.progress(min(i/total,1.0))

        df_out = df.copy()
        df_out["personalized_line"] = out

        buf = io.BytesIO()
        df_out.to_excel(buf, index=False, engine="openpyxl")
        buf.seek(0)
        st.download_button(
            "Download Excel with Personalized Lines",
            data=buf,
            file_name="personalized_output.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

st.markdown(
    f"<div style='position: fixed; bottom: 10px; left: 10px; font-size: 0.75rem; color: #64748b;'>v{VERSION}</div>",
    unsafe_allow_html=True
)
