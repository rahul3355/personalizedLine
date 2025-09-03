import os
import pandas as pd
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

# --- Prompt rules ---
ONE_PROMPT_RULES = (
    "You are writing the first sentence of a cold email.\n"
    "Steps (do this internally, do not show):\n"
    "1. Skim the company details.\n"
    "2. Identify one specific pain they likely face that connects directly to the service context.\n"
    "3. Write exactly one natural, conversational sentence (18–25 words).\n\n"
    "Rules:\n"
    "- Mention the company name naturally.\n"
    "- Human-written tone, plain language, no headlines.\n"
    "- Do not pitch, do not compliment, do not ask questions.\n"
    "- Do not explain your reasoning, only output the sentence.\n"
)

USER_TEMPLATE = """Company: {company}
Description: {description}
Industry: {industry}
Role: {role}
Size: {size}
Service context: {service}"""

# --- Core function ---
def generate_opener(company, description, industry, role, size, service):
    user_prompt = USER_TEMPLATE.format(
        company=company or "",
        description=description or "",
        industry=industry or "",
        role=role or "",
        size=str(size or ""),
        service=service or ""
    )
    messages = [
        {"role": "system", "content": ONE_PROMPT_RULES},
        {"role": "user", "content": user_prompt}
    ]
    resp = client.chat.completions.create(
        model="gpt-5",  # reasoning model
        messages=messages,
        max_completion_tokens=2000  # pessimistic allowance
    )
    opener = (resp.choices[0].message.content or "").strip()

    # Token usage tracking
    usage = resp.usage
    prompt_tokens = usage.prompt_tokens if hasattr(usage, "prompt_tokens") else 0
    completion_tokens = usage.completion_tokens if hasattr(usage, "completion_tokens") else 0
    total_tokens = usage.total_tokens if hasattr(usage, "total_tokens") else 0

    return opener, prompt_tokens, completion_tokens, total_tokens

# --- Main ---
if __name__ == "__main__":
    service_desc = "Lead generation services (appointment setting, outbound campaigns)."
    df = pd.read_excel("p3.xlsx")

    max_rows = 5

    grand_prompt = 0
    grand_completion = 0
    grand_total = 0

    for i, row in df.iterrows():
        if i >= max_rows:
            break
        company = row.get("Cleaned Company Name") or row.get("Company Name") or ""
        description = row.get("Company Short Description") or ""
        industry = row.get("Industry") or ""
        role = row.get("Title") or row.get("Seniority") or ""
        size = row.get("Employee Count") or ""

        opener, pt, ct, tt = generate_opener(company, description, industry, role, size, service_desc)

        # accumulate
        grand_prompt += pt
        grand_completion += ct
        grand_total += tt

        print("=" * 80)
        print(f"Company: {company}")
        print(f"Opener: {opener}")
        print(f"Tokens → prompt={pt}, completion={ct}, total={tt}")

    print("=" * 80)
    print("Overall Token Usage")
    print(f"Prompt: {grand_prompt}, Completion: {grand_completion}, Total: {grand_total}")
