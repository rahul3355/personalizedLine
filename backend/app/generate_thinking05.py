import os
import pandas as pd
from openai import OpenAI

# --- Client (DeepSeek API not OpenAI API) ---
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),  # Use your DeepSeek key
    base_url="https://api.deepseek.com"     # Point client to DeepSeek
)

# --- Prompt rules ---
ONE_PROMPT_RULES = (
    "You are writing the first sentence of a cold email.\n"
    "Steps (do this internally, do not show):\n"
    "1. Skim the company details and service context.\n"
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
        {"role": "user", "content": ONE_PROMPT_RULES + "\n\n" + user_prompt}
    ]
    resp = client.chat.completions.create(
        model="deepseek-reasoner",  # Correct DeepSeek model
        messages=messages,
        max_completion_tokens=3000
    )
    opener = (resp.choices[0].message.content or "").strip()
    usage = resp.usage
    return opener, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens

# --- Main ---
if __name__ == "__main__":
    service_desc = "Lead generation services (appointment setting, outbound campaigns)."
    df = pd.read_excel("p3.xlsx")

    total_prompt, total_completion, total_tokens = 0, 0, 0
    max_rows = 5

    for i, row in df.iterrows():
        if i >= max_rows:
            break
        company = row.get("Cleaned Company Name") or row.get("Company Name") or ""
        description = row.get("Company Short Description") or ""
        industry = row.get("Industry") or ""
        role = row.get("Title") or row.get("Seniority") or ""
        size = row.get("Employee Count") or ""

        opener, prompt_toks, completion_toks, total_toks = generate_opener(
            company, description, industry, role, size, service_desc
        )

        print("=" * 80)
        print(f"Company: {company}")
        print(f"Opener: {opener}")
        print(f"Tokens → prompt={prompt_toks}, completion={completion_toks}, total={total_toks}")

        total_prompt += prompt_toks
        total_completion += completion_toks
        total_tokens += total_toks

    print("=" * 80)
    print("Overall Token Usage")
    print(f"Prompt: {total_prompt}, Completion: {total_completion}, Total: {total_tokens}")
