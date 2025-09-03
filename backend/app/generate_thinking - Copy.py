import os, re, random, pandas as pd
from openai import OpenAI

# --- Monkeypatch for proxies bug (safe to keep) ---
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)

import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper

# --- Client ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------- PROMPTS ----------

# Helper (input cleaner)
HELPER_RULES = (
    "You are a pre-processor. Clean and reframe raw company details into a concise, neutral summary. "
    "Rules: "
    "- Do NOT mention AI, automation, outreach, SDRs, or our service. "
    "- Keep 1–3 short lines. "
    "- Focus on company context, industry traits, and general business challenges. "
    "- Reframe service context into neutral language (e.g. 'keeping personalization consistent at scale'). "
    "Output format:\n"
    "Company summary: ...\n"
    "Industry context: ...\n"
    "Service context (reframed): ..."
)

HELPER_TEMPLATE = """Company: {company}
Description: {description}
Industry: {industry}
Role: {role}
Size: {size}
Raw service context: {service}"""

# Reasoner
REASONER_RULES = (
    "You are an analyst. Identify the single most likely PAIN this company faces "
    "that connects directly to the reframed service context. "
    "Final output must be inside <final> tags, max one sentence. "
    "Be concrete and specific. No generic phrases. "
    "Do not pitch, compliment, or mention AI, automation, or outreach."
)

REASONER_USER_TEMPLATE = """Think step by step briefly (do not show).
Then output ONLY:

<final>
[short phrase or sentence describing the pain]
</final>

Inputs:
{helper_output}"""

# Style Helper
STYLE_RULES = (
    "You are a style generator. Create 3 different phrasing variations for this pain. "
    "1. Plain factual phrasing. "
    "2. Light conversational phrasing. "
    "3. Industry-flavored metaphor phrasing (if natural). "
    "Avoid greetings, questions, or pitches."
)

STYLE_TEMPLATE = """Company: {company}
Pain: {pain}"""

# Tone Variation Helper (NEW)
TONE_RULES = (
    "Reframe the opener candidate into 3 tone variations: "
    "1. Neutral professional (concise, factual). "
    "2. Conversational SDR (natural, human, but no greetings or fluff). "
    "3. Industry-flavored (use light analogy or context). "
    "Keep each version one sentence under 30 words."
)

TONE_TEMPLATE = """Opener candidate: {opener}"""

# Chat
CHAT_RULES = (
    "Write a cold email opener. "
    "Rules: 1–2 sentences, 10–50 words. "
    "Conversational, natural tone. "
    "Mention the company name naturally. "
    "Highlight the pain. "
    "Do not pitch, compliment, or mention AI/automation. "
    "Do not start with greetings. "
    "Do not ask questions."
)

CHAT_USER_TEMPLATE = """Company: {company}
Phrasing style: {style}
Pain: {pain}"""

# Post-Rewrite
REWRITE_RULES = (
    "Rewrite the opener as exactly one sharp, natural sentence. "
    "Rules: 18–25 words. "
    "No fluff phrases like 'it’s crucial', 'really stands out', 'can be frustrating'. "
    "No greetings, no questions, no pitches, no compliments. "
    "Keep it plain, human, and observational."
)

REWRITE_TEMPLATE = """Original opener: {opener}"""

# ---------- HELPERS ----------

FINAL_RE = re.compile(r"<final>\s*(.*?)\s*</final>", re.DOTALL | re.IGNORECASE)

def _extract_final(text: str) -> str:
    if not text:
        return ""
    m = FINAL_RE.search(text)
    return m.group(1).strip() if m else text.strip()

def _clean(s: str) -> str:
    if not s:
        return ""
    return s.replace("“", "").replace("”", "").replace('"', "").strip()

# ---------- FALLBACKS ----------

FALLBACKS = [
    "{company} is growing fast, and keeping communications personal while scaling must be a constant challenge.",
    "At {company}, balancing growth with maintaining personalized connections is likely a tough challenge.",
    "{company} seems to be in a phase where keeping customer engagement authentic while scaling operations isn’t easy.",
    "For {company}, ensuring personalization doesn’t get lost while expanding quickly must take constant effort."
]

def fallback_opener(company: str) -> str:
    return random.choice(FALLBACKS).format(company=company)

# ---------- STAGES ----------

def preprocess_inputs(company, description, industry, role, size, service):
    user_prompt = HELPER_TEMPLATE.format(
        company=company or "",
        description=description or "",
        industry=industry or "",
        role=role or "",
        size=str(size or ""),
        service=service or ""
    )
    messages = [
        {"role": "system", "content": HELPER_RULES},
        {"role": "user", "content": user_prompt}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.3,
        max_tokens=200
    )
    return (resp.choices[0].message.content or "").strip()

def identify_pain(helper_output):
    user_prompt = REASONER_RULES + "\n\n" + REASONER_USER_TEMPLATE.format(helper_output=helper_output)
    messages = [{"role": "user", "content": user_prompt}]
    resp = client.chat.completions.create(
        model="o1-mini",
        messages=messages,
        max_completion_tokens=2000
    )
    raw_text = (resp.choices[0].message.content or "").strip()
    return _clean(_extract_final(raw_text))

def generate_styles(company, pain):
    user_prompt = STYLE_TEMPLATE.format(company=company or "", pain=pain or "")
    messages = [
        {"role": "system", "content": STYLE_RULES},
        {"role": "user", "content": user_prompt}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.5,
        max_tokens=200
    )
    styles = (resp.choices[0].message.content or "").strip().split("\n")
    return [s.strip("-•123. ") for s in styles if s.strip()][:3]

def generate_openers(company, pain, styles):
    candidates = []
    for style in styles:
        messages = [
            {"role": "system", "content": CHAT_RULES},
            {"role": "user", "content": CHAT_USER_TEMPLATE.format(company=company or "", style=style, pain=pain)}
        ]
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=200
        )
        opener = (resp.choices[0].message.content or "").strip()
        candidates.append(_clean(opener))
    return candidates

def add_tone_variations(opener):
    user_prompt = TONE_TEMPLATE.format(opener=opener)
    messages = [
        {"role": "system", "content": TONE_RULES},
        {"role": "user", "content": user_prompt}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.6,
        max_tokens=200
    )
    tones = (resp.choices[0].message.content or "").strip().split("\n")
    return [t.strip("-•123. ") for t in tones if t.strip()][:3]

def rewrite_opener(opener):
    user_prompt = REWRITE_TEMPLATE.format(opener=opener)
    messages = [
        {"role": "system", "content": REWRITE_RULES},
        {"role": "user", "content": user_prompt}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.3,
        max_tokens=100
    )
    return _clean((resp.choices[0].message.content or "").strip())

# ---------- MAIN PIPELINE ----------

def generate_opener(company, description, industry, role, size, service):
    helper_output = preprocess_inputs(company, description, industry, role, size, service)
    pain = identify_pain(helper_output)
    if not pain:
        return fallback_opener(company)

    styles = generate_styles(company, pain)
    candidates = generate_openers(company, pain, styles)

    # Pick best base candidate
    base = candidates[0] if candidates else fallback_opener(company)

    # Add tone variations
    tones = add_tone_variations(base)
    all_versions = [base] + tones

    # Rewrite all versions and pick the first valid one
    for version in all_versions:
        rewritten = rewrite_opener(version)
        if 18 <= len(rewritten.split()) <= 25:
            return rewritten

    return fallback_opener(company)

if __name__ == "__main__":
    service_desc = "AI-powered outreach tool that helps SDRs scale personalization without losing human tone."
    df = pd.read_excel("p3.xlsx")

    max_rows = 5
    for i, row in df.iterrows():
        if i >= max_rows:
            break
        company = row.get("Cleaned Company Name") or row.get("Company Name") or ""
        description = row.get("Company Short Description") or ""
        industry = row.get("Industry") or ""
        role = row.get("Title") or row.get("Seniority") or ""
        size = row.get("Employee Count") or ""

        opener = generate_opener(company, description, industry, role, size, service_desc)
        print("=" * 80)
        print(f"Company: {company}")
        print(f"Opener: {opener}")
