import json
import logging
import os

import requests
from openai import OpenAI


def _coalesce_text(value):
    """Return a stripped string representation for prompt fields."""
    if value is None:
        return ""
    return str(value).strip()

# --- Client (DeepSeek API not OpenAI API) ---
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),  # Use your DeepSeek key
    base_url="https://api.deepseek.com"  # Point client to DeepSeek
)


LOGGER = logging.getLogger(__name__)

GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_SIF_MODEL = "openai/gpt-oss-120b"
SIF_SYSTEM_PROMPT = (
    "You are an SDR assistant. Write a cold email opener. "
    "Requirements: 1–2 sentences; 14–40 words; conversational; natural tone; "
    "mention the company name naturally; highlight the given pain; "
    "do not pitch our service; do not ask questions."
)

# --- Prompt rules ---
ONE_PROMPT_RULES = (
    "You are writing the first sentence of a cold email.\n"
    "Steps (do this internally, do not show):\n"
    "1. Skim the recipient email address and the service context.\n"
    "2. Infer one likely angle or challenge worth mentioning based only on the email address and service context.\n"
    "3. Write exactly one natural, conversational sentence (18–25 words).\n\n"
    "Rules:\n"
    "- Keep the tone human and observational.\n"
    "- Do not pitch, do not compliment, do not ask questions.\n"
    "- Do not explain your reasoning, only output the sentence.\n"
)

USER_TEMPLATE = """Recipient email: {email}
Service context: {service}"""

# --- Core function ---
def generate_opener(
    company: str = "",
    description: str = "",
    industry: str = "",
    role: str = "",
    size: str = "",
    service: str = "",
    *,
    email: str = "",
):
    """Generate an opener using only the provided email and service context."""
    email_value = _coalesce_text(email or company)
    service_value = _coalesce_text(service)

    user_prompt = USER_TEMPLATE.format(
        email=email_value,
        service=service_value,
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
        email=_coalesce_text(company) or _coalesce_text(title),
        service=service_context,
    )

    return opener


def generate_sif_personalized_line(sif_research: str, service_context: str) -> str:
    """Generate a SIF personalized opener using Groq with structured research."""

    if not sif_research or not sif_research.strip():
        return "SIF personalized line unavailable: missing research."

    cleaned_research = sif_research.strip()
    if cleaned_research.lower().startswith("research unavailable"):
        return "SIF personalized line unavailable: research unavailable."

    try:
        parsed_research = json.loads(cleaned_research)
    except json.JSONDecodeError:
        LOGGER.warning("SIF research JSON could not be parsed: %s", cleaned_research)
        return "SIF personalized line unavailable: invalid research JSON."

    if not isinstance(parsed_research, dict):
        LOGGER.warning("SIF research payload is not a JSON object: %s", cleaned_research)
        return "SIF personalized line unavailable: invalid research JSON."

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        LOGGER.warning("GROQ_API_KEY not configured; skipping SIF personalization")
        return "SIF personalized line unavailable: missing Groq API key."

    service_text = (service_context or "").strip() or "Service context unavailable."
    research_text = json.dumps(parsed_research, ensure_ascii=False, indent=2)

    user_prompt = (
        f"{SIF_SYSTEM_PROMPT}\n\n"
        f"Service context:\n{service_text}\n\n"
        f"Research JSON:\n{research_text}"
    )

    try:
        response = requests.post(
            GROQ_CHAT_ENDPOINT,
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_SIF_MODEL,
                "messages": [
                    {"role": "system", "content": SIF_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.6,
                "top_p": 0.95,
                "max_completion_tokens": 3000,
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Groq response was not a JSON object")
        choices = payload.get("choices") or []
        if not choices:
            raise ValueError("Groq response missing choices")
        first_choice = choices[0] or {}
        if not isinstance(first_choice, dict):
            raise ValueError("Groq response choices malformed")
        message = first_choice.get("message") or {}
        if not isinstance(message, dict):
            raise ValueError("Groq response message malformed")
        content = (message.get("content") or "").strip()
        if not content:
            raise ValueError("Groq response missing message content")
        return content
    except Exception as exc:
        LOGGER.exception("Groq personalization request failed: %s", exc)
        return "SIF personalized line unavailable: failed to generate personalization."
