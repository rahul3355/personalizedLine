import openai, re, streamlit as st

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
