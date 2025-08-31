"""
Helpers for generating personalized cold outreach lines with OpenAI.
Hardened version:
- Input normalization + safe fallbacks
- Compact, observation-only prompt with safe examples
- Offer used only as hidden context (not output)
- Output filtering: word count, banned terms, offer leakage
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


# ---------------- Input Normalization ----------------

def clean_company(company: str) -> str:
    """Normalize company name, strip suffixes like Inc/LLC/Ltd."""
    if not company:
        return ""
    c = company.strip()
    c = re.sub(r"\b(inc|llc|ltd|corp)\b\.?", "", c, flags=re.I)
    return c.strip()

def clean_title(title: str) -> str:
    """Canonicalize role title to safe fallback if missing."""
    if not title:
        return "decision-maker"
    return title.strip()

def preprocess_description(desc: str) -> str:
    """Clean company description text or fallback."""
    if not desc:
        return "a company focused on growth"
    desc = re.sub(r"[^a-zA-Z0-9\s]", "", str(desc))
    desc = re.sub(r"\s+", " ", desc).strip()
    return desc or "a company focused on growth"


# ---------------- Core GPT Call ----------------

def call_gpt(messages, temperature: float = 0.25, max_tokens: int = 50,
             model: str = "gpt-4o-mini") -> str:
    """Send messages to GPT and return first response string."""
    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=messages,
        )
        output = resp.choices[0].message.content.strip()
        print(f"[GPT RESPONSE] {output}")
        return output
    except Exception as e:
        print(f"[GPT ERROR] {e}")
        return f"[Error: {str(e)}]"


# ---------------- Safe Examples ----------------

SAFE_EXAMPLES = """
Examples of correct style:
1. Acme highlights its focus on workflow automation. Teams scaling this way often struggle with pipeline reliability once demand starts accelerating.
2. CloudScale positions itself as a SaaS platform. Companies in this space often face rising acquisition costs as markets become saturated.
3. TalentBridge emphasizes rapid hiring support. Growing firms with this focus frequently encounter bottlenecks when recruiting speed lags behind client demand.
4. In SaaS, scaling companies often run into outbound fatigue, where early tactics stop producing consistent meetings as they expand.
5. Fast-growing teams frequently face difficulties building repeatable customer acquisition systems, especially when trying to scale beyond initial traction.
"""


# ---------------- Output Filtering ----------------

BANNED_WORDS = {"mission", "solution", "innovation", "excited"}

def is_valid_output(line: str, offer: str) -> bool:
    """Check if line meets constraints."""
    words = line.split()
    if len(words) < 15 or len(words) > 25:
        return False
    for bad in BANNED_WORDS:
        if bad in line.lower():
            return False
    if offer and offer.lower() in line.lower():
        return False
    if line.count(".") > 1:  # more than one sentence
        return False
    return True


# ---------------- Line Generator ----------------

def generate_line(title: str, company: str, desc: str,
                  offer: str, persona: str, channel: str,
                  max_words: int = 22) -> str:
    """Generate a safe, observation-only personalized line for cold email."""

    # Normalize inputs
    title_clean = clean_title(title)
    company_clean = clean_company(company)
    desc_clean = preprocess_description(desc)
    offer_clean = (offer or "").strip()
    persona_clean = (persona or "business leader").strip()

    # Build system + user messages
    system_msg = (
        "You are an SDR research assistant. "
        "Write one natural-sounding observation line (~20 words) about a company or its industry. "
        "Do not pitch or sell. Do not invent unverifiable facts. "
        "Style = researched observation, not insider knowledge. One sentence only."
    )

    user_msg = (
        f"Inputs:\n"
        f"- Role: {title_clean}\n"
        f"- Company: {company_clean or '[none]'}\n"
        f"- Description: {desc_clean}\n"
        f"- Offer context (guidance only, not in output): {offer_clean or 'N/A'}\n"
        f"- Persona: {persona_clean}\n\n"
        f"Rules:\n"
        f"- If company provided, mention it.\n"
        f"- If company missing, use role or industry instead.\n"
        f"- Phrase pains as patterns: 'often face,' 'commonly run into,' 'frequently encounter.'\n"
        f"- Avoid vague words: mission, solution, innovation, excited.\n"
        f"- One sentence only (~20 words).\n\n"
        f"{SAFE_EXAMPLES}\n"
        f"Write one new line in the same style."
    )

    # Call GPT
    messages = [{"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}]
    line = call_gpt(messages)

    # Validate and retry once if needed
    if not is_valid_output(line, offer_clean):
        print("[VALIDATION] First attempt invalid, retrying with stricter instruction...")
        user_msg += "\nEnsure output is exactly one sentence, ~20 words, valid under all rules."
        messages[1]["content"] = user_msg
        line = call_gpt(messages)

    return line


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
