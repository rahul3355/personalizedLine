import os, re, pandas as pd
from openai import OpenAI

# --- Monkeypatch for proxies bug ---
from openai._base_client import SyncHttpxClientWrapper
class CustomWrapper(SyncHttpxClientWrapper):
    def __init__(self, *args, **kwargs):
        kwargs.pop("proxies", None)
        super().__init__(*args, **kwargs)
import openai
openai._base_client.SyncHttpxClientWrapper = CustomWrapper

# --- Clients ---
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# ---------- PROMPTS ----------

REASONER_RULES = (
    "You are an analyst. Identify the single most likely PAIN "
    "that this company faces which connects directly to the service context. "
    "Output only the pain as one short phrase or sentence inside <final> tags. "
    "Be concrete and specific. No generic phrases like 'growth is hard'. "
    "Do not pitch. Do not compliment. Do not leave blank."
)

REASONER_USER_TEMPLATE = """Think step by step privately (do not show). 
Then output ONLY:

<final>
[short phrase or sentence describing the pain]
</final>

Inputs:
Company: {company}
Description: {description}
Industry: {industry}
Role: {role}
Size: {size}
Service context: {service}"""

CHAT_RULES = (
    "You are an SDR assistant. Write a cold email opener. "
    "Requirements: 1–2 sentences; 14–40 words; conversational; natural tone; "
    "mention the company name naturally; highlight the given pain; "
    "do not pitch our service; do not ask questions."
)

CHAT_USER_TEMPLATE = """Company: {company}
Pain: {pain}"""

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
    s = s.replace("“", "").replace("”", "").replace('"', "").strip()
    return s

# ---------- VALIDATOR ----------

BANNED_WORDS = ["resonate", "impressive", "great company", "our service", "we help", "AI-powered"]

def is_valid_pain(pain: str, company: str) -> bool:
    if not pain or pain.strip() in [".", "..."]:
        return False
    if len(pain.split()) < 4:  # too short
        return False
    if any(bad in pain.lower() for bad in BANNED_WORDS):
        return False
    if "growth" in pain.lower() and "scale" not in pain.lower():
        # too generic like "growth is hard"
        return False
    return True

# ---------- STAGE 1: Reasoner ----------

def identify_pain(company, description, industry, role, size, service, retry=True):
    messages = [
        {"role": "system", "content": REASONER_RULES},
        {"role": "user", "content": REASONER_USER_TEMPLATE.format(
            company=company or "",
            description=description or "",
            industry=industry or "",
            role=role or "",
            size=str(size or ""),
            service=service or "",
        )}
    ]
    resp = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        temperature=0.5,
        max_tokens=300
    )
    raw = (resp.choices[0].message.content or "").strip()
    pain = _clean(_extract_final(raw))

    if not is_valid_pain(pain, company) and retry:
        # Retry once with stricter instructions
        stricter = REASONER_RULES + " Be extremely specific and avoid vague wording."
        messages[0]["content"] = stricter
        resp = client.chat.completions.create(
            model="deepseek-reasoner",
            messages=messages,
            temperature=0.4,
            max_tokens=300
        )
        raw = (resp.choices[0].message.content or "").strip()
        pain = _clean(_extract_final(raw))

    return pain if is_valid_pain(pain, company) else ""

# ---------- STAGE 2: Chat ----------

def write_opener(company, pain):
    if not pain:
        # Fallback generic opener
        return f"Noticed {company} is growing fast — keeping outreach personal while scaling must be a constant challenge."

    messages = [
        {"role": "system", "content": CHAT_RULES},
        {"role": "user", "content": CHAT_USER_TEMPLATE.format(company=company or "", pain=pain)}
    ]
    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        temperature=0.7,
        max_tokens=150
    )
    opener = (resp.choices[0].message.content or "").strip()
    return _clean(opener)

# ---------- MAIN PIPELINE ----------

def generate_opener(company, description, industry, role, size, service):
    pain = identify_pain(company, description, industry, role, size, service)
    return write_opener(company, pain)

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
