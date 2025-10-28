import json
import logging
import os

import requests


LOGGER = logging.getLogger(__name__)

GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_SIF_MODEL = "openai/gpt-oss-120b"
SIF_SYSTEM_PROMPT = (
    "Generate a human-written, well-researched, conversational, highly personalized "
    "opening line for email after 'Hi _name_' (don’t include 'Hi name'). Write one "
    "or two sentences. Don’t pitch. Focus on a pain this person/company might face. "
    "Output only the line in plain English."
)

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

    service_text = (service_context or "").strip()
    research_text = cleaned_research

    user_prompt = (
        f"{SIF_SYSTEM_PROMPT}\n\n"
        f"Person info:\n{research_text}\n\n"
        f"Service context:\n{service_text}"
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
