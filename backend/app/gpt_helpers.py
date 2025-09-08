import os
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
        max_tokens=3000
    )
    opener = (resp.choices[0].message.content or "").strip()
    usage = resp.usage
    return opener, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
