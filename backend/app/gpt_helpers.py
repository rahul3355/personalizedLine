import os
from openai import OpenAI
import json


def _coalesce_text(value):
    """Return a stripped string representation for prompt fields."""
    if value is None:
        return ""
    return str(value).strip()

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
    if not opener:
        choice = resp.choices[0]
        message_payload = {}

        msg = getattr(choice, "message", None)
        if msg is not None:
            try:
                message_payload = msg.model_dump()
            except AttributeError:
                message_payload = {
                    "role": getattr(msg, "role", None),
                    "content": getattr(msg, "content", None),
                    "refusal": getattr(msg, "refusal", None),
                    "metadata": getattr(msg, "metadata", None),
                }

        debug_payload = {
            "response_id": getattr(resp, "id", None),
            "finish_reason": getattr(choice, "finish_reason", None),
            "message": message_payload,
        }
        print(
            "[DeepSeek][Empty opener] "
            + json.dumps(debug_payload, default=str, ensure_ascii=False)
        )
        opener = "[No opener generated]"
    usage = resp.usage
    return opener, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens


def generate_line(title, company, description, offer, persona, channel, max_words):
    """Compatibility wrapper for legacy callers expecting generate_line."""
    service_context = (
        f"Offer: {_coalesce_text(offer)}\n"
        f"Persona: {_coalesce_text(persona)}\n"
        f"Channel: {_coalesce_text(channel)}\n"
        f"Max words: {max_words}\n"
        f"Title: {_coalesce_text(title)}"
    )

    opener, *_ = generate_opener(
        _coalesce_text(company),
        _coalesce_text(description),
        "",  # industry (unused in legacy preview context)
        _coalesce_text(title),
        "",
        service_context,
    )

    return opener
