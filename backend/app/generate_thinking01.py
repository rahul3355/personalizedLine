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

# ---------- PROMPT ----------

MASTER_RULES = (
    "You are an SDR assistant. Your task is to write the FIRST line of a cold email.\n\n"
    "Inputs will include company details and a service context.\n\n"
    "Rules:\n"
    "- Output exactly one opener per company.\n"
    "- 1–2 sentences, 12–28 words.\n"
    "- Conversational, natural, and human-like — as if you skimmed their website.\n"
    "- Mention the company name naturally.\n"
    "- Highlight one likely pain that this service directly solves.\n"
    "- No greetings, no questions, no pitches, no compliments.\n"
    "- Write like spoken observation, not a headline.\n\n"
    "Examples:\n"
    "Company: My Kind Of Cruise\n"
    "Service: Lead generation services\n"
    "Output: Noticed My Kind Of Cruise heading into peak season — keeping outreach personal during heavy booking periods must be tough.\n\n"
    "Company: Dutch Digital Systems\n"
    "Service: Lead generation services\n"
    "Output: Dutch Digital Systems is scaling fast, and keeping client data secure while expanding must feel like a constant tradeoff."
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
        model="o1-mini",  # reasoning model
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
