# backend/app/gpt_helpers.py

"""
Helpers for generating personalized cold outreach lines with OpenAI.
This version restores the stricter logic from the old root gpt_helpers.py:
- Hardcoded example outputs
- guess_problem / guess_urgency heuristics
- Strict prompt structure enforcing 1-sentence Gmail-style snippets
"""

import os
import re
import streamlit as st
from openai import OpenAI

# --- Monkey patch to drop unsupported `proxies` kwarg ---
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)

import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper
# --------------------------------------------------------

# Ensure API key from Streamlit secrets
os.environ["OPENAI_API_KEY"] = st.secrets["OPENAI_API_KEY"]

# Create global OpenAI client
client = OpenAI()

print("DEBUG gpt_helpers: OpenAI client initialized")
print("DEBUG gpt_helpers: API key present?", bool(os.environ.get("OPENAI_API_KEY")))


# ---------------- Heuristic Helpers ----------------

def guess_problem(desc: str) -> str:
    """Naive keyword-based guess of company pain point."""
    if not desc:
        return "growth bottlenecks"
    d = desc.lower()
    if "cloud" in d:
        return "wasted cloud spend"
    if "health" in d or "med" in d:
        return "scaling patient access"
    if "recruit" in d or "talent" in d:
        return "engineering bottlenecks"
    if "finance" in d or "bank" in d:
        return "compliance and cost pressure"
    return "growth bottlenecks"


def guess_urgency(desc: str) -> str:
    """Naive keyword-based guess of urgency trigger."""
    if not desc:
        return "founders facing growth plateaus"
    d = desc.lower()
    if "cfo" in d or "budget" in d:
        return "CFO budget pressure"
    if "compliance" in d or "regulation" in d:
        return "regulatory deadlines"
    if "talent" in d or "hiring" in d:
        return "missed product launches"
    return "growth bottlenecks"


# ---------------- Core GPT Call ----------------

def call_gpt(prompt: str, temperature: float = 0.4, max_tokens: int = 150,
             model: str = "gpt-4o-mini") -> str:
    """Send prompt to GPT and return first response string."""
    try:
        print(f"[GPT CALL] model={model}, temp={temperature}, max_tokens={max_tokens}")
        print(f"[GPT PROMPT PREVIEW]\n{prompt[:300]}...\n")

        resp = client.chat.completions.create(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a precise SDR copywriter. "
                        "One sentence only, 18–22 words. "
                        "Must explicitly mention the company name. "
                        "Absolutely avoid generic fluff like 'mission', 'solution', or 'I noticed'."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        output = resp.choices[0].message.content.strip()
        print(f"[GPT RESPONSE] {output}")
        return output

    except Exception as e:
        print(f"[GPT ERROR] {e}")
        return f"[Error: {str(e)}]"


# ---------------- Prompt Assembly ----------------

EXAMPLES = """
Examples:
1. CloudScale helps SMBs cut wasted cloud spend, and LinkedIn posts naming idle-resource waste spark CFO replies under budget pressure.
2. TalentBridge speeds up startup hiring, and founders blocked by engineering bottlenecks often engage when proof of faster placements is shared on LinkedIn.
3. Dutch Digital tackles inefficiencies in insurance data-sharing, and posts pointing out compliance delays trigger quick responses from industry leaders.
"""

def preprocess_description(desc: str) -> str:
    """Clean company description text."""
    if not desc:
        return ""
    desc = re.sub(r"[^a-zA-Z0-9\s]", "", str(desc))
    desc = re.sub(r"\s+", " ", desc).strip()
    return desc


def generate_line(title: str, company: str, desc: str,
                  offer: str, persona: str, channel: str,
                  max_words: int = 22) -> str:
    """Build structured prompt for personalized cold outreach line."""
    desc_clean = preprocess_description(desc)
    problem = guess_problem(desc_clean)
    urgency = guess_urgency(desc_clean)

    prompt = (
        f"{EXAMPLES}\n\n"
        f"Write ONE new line in the same style.\n\n"
        f"- Prospect: {title or 'Unknown'} at {company or 'a company'}\n"
        f"- Company description: {desc_clean or 'N/A'}\n"
        f"- Our offer: {offer or 'N/A'}\n"
        f"- Persona: {persona or 'N/A'}\n"
        f"- Channel: {channel or 'N/A'}\n"
        f"- Observed problem: {problem}\n"
        f"- Urgency trigger: {urgency}\n\n"
        f"Constraints:\n"
        f"- One sentence, 18–22 words\n"
        f"- Explicitly mention {company or 'the company'}\n"
        f"- Gmail snippet tone\n"
        f"- Absolutely avoid generic filler\n"
    )

    return call_gpt(prompt, temperature=0.5, max_tokens=150)


# ---------------- Test Utility ----------------

def test_connection():
    """Quick check if models API works."""
    try:
        models = client.models.list()
        ids = [m.id for m in models.data[:3]]
        print("DEBUG gpt_helpers: Fetched models:", ids)
        return True
    except Exception as e:
        print("DEBUG gpt_helpers: Error fetching models:", e)
        return False
