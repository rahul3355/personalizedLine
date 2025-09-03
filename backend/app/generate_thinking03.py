import os, pandas as pd
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

# ---------- MODEL ----------
MODEL = "o3"

# ---------- PROMPT ----------

MASTER_RULES = (
    "You are writing the FIRST line of a cold email.\n\n"
    "Rules:\n"
    "- Output exactly one opener per company.\n"
    "- 1–2 sentences, 12–28 words.\n"
    "- Conversational and natural, like a human SDR who skimmed their site.\n"
    "- Mention the company name naturally, not forced.\n"
    "- Highlight ONE pain they might face that links directly to the service context.\n"
    "- No greetings. No questions. No pitching. No compliments.\n"
    "- Write as if making an observation to a colleague, not a headline.\n"
    "- Keep phrasing simple, human, and plain — avoid jargon, meta language (like 'I saw', 'skimming'), or exaggeration.\n\n"
    "Examples:\n"
    "Company: My Kind Of Cruise\n"
    "Service: Lead generation services\n"
    "Output: My Kind Of Cruise heads into peak season with bookings rising, so keeping every interaction personal must be tricky.\n\n"
    "Company: Dutch Digital Systems\n"
    "Service: Lead generation services\n"
    "Output: Dutch Digital Systems is scaling its insurance software, and keeping outreach consistent while refining modules can be hard to balance."
)

USER_TEMPLATE = """Company: {company}
Description: {description}
Industry: {industry}
Role: {role}
Size: {size}
Service context: {service}"""

# ---------- GENERATOR ----------

def generate_opener(company, description, industry, role, size, service):
    user_prompt = MASTER_RULES + "\n\n" + USER_TEMPLATE.format(
        company=company or "",
        description=description or "",
        industry=industry or "",
        role=role or "",
        size=str(size or ""),
        service=service or ""
    )

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": user_prompt}],
        max_completion_tokens=3000
    )
    return (resp.choices[0].message.content or "").strip()

# ---------- MAIN ----------

if __name__ == "__main__":
    service_desc = "Lead generation services (appointment setting, outbound campaigns)."
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
