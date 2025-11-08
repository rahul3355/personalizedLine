import json
import logging
import os

import requests


LOGGER = logging.getLogger(__name__)

GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_SIF_MODEL = "openai/gpt-oss-120b"

DEFAULT_FALLBACK_ACTION = "Forward if not right person"

def generate_full_email_body(research_components: str, service_context: str) -> str:
    """Generate a full email body using Groq with structured research."""

    if not research_components or not research_components.strip():
        return "Email body unavailable: missing research."

    cleaned_research = research_components.strip()
    if cleaned_research.lower().startswith("research unavailable"):
        return "Email body unavailable: research unavailable."

    try:
        parsed_research = json.loads(cleaned_research)
    except json.JSONDecodeError:
        LOGGER.warning("Research JSON could not be parsed: %s", cleaned_research)
        return "Email body unavailable: invalid research JSON."

    if not isinstance(parsed_research, dict):
        LOGGER.warning("Research payload is not a JSON object: %s", cleaned_research)
        return "Email body unavailable: invalid research JSON."

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        LOGGER.warning("GROQ_API_KEY not configured; skipping email generation")
        return "Email body unavailable: missing Groq API key."

    # Parse service context as JSON
    service_components = {}
    if service_context and service_context.strip():
        try:
            parsed_service = json.loads(service_context)
            if isinstance(parsed_service, dict):
                include_flag = parsed_service.get("include_fallback")
                fallback_action = parsed_service.get("fallback_action")
                if include_flag is True and (
                    fallback_action is None
                    or (isinstance(fallback_action, str) and not fallback_action.strip())
                ):
                    parsed_service["fallback_action"] = DEFAULT_FALLBACK_ACTION
                if include_flag is False:
                    parsed_service.pop("fallback_action", None)
                service_components = parsed_service
            else:
                service_components = {}
        except json.JSONDecodeError:
            LOGGER.warning("Service context JSON could not be parsed, using as plain text: %s", service_context)
            # If it's a plain string, create a basic structure
            service_components = {
                "core_offer": service_context,
                "key_differentiator": "",
                "cta": "Demo invitation",
                "timeline": "Next Thursday at 2pm or 5pm",
                "goal": "Get meeting OR forward to right person",
                "include_fallback": True,
                "fallback_action": DEFAULT_FALLBACK_ACTION,
            }

    include_fallback = service_components.get("include_fallback")
    fallback_enabled = include_fallback is not False

    critical_rules = [
        "- Use conversational tone with contractions\n",
        "- NO em dashes or hyphens, jargon\n",
        "- Reference specific research findings naturally (don't list facts)\n",
        "- Connect their world to the service value or product value\n",
        "- Include self-awareness when appropriate\n",
        "- Clear CTA with specific times\n",
    ]
    if fallback_enabled:
        critical_rules.append("- Always include forward option\n")
    critical_rules.append(
        "- Sound like a human wrote this, not an AI. Write for easy readability.\n"
    )

    formatting_lines = [
        "  1. First paragraph: Research/context about their business\n",
        "  2. Second paragraph: Your value proposition\n",
    ]
    third_paragraph = "  3. Third paragraph: Call-to-action"
    if fallback_enabled:
        third_paragraph += " and forward option"
    formatting_lines.append(f"{third_paragraph}\n\n")

    user_prompt = (
        "Write a cold email body based on these components. DO NOT include greetings, footers, or signatures.\n\n"
        f"RESEARCH COMPONENTS:\n{json.dumps(parsed_research, indent=2)}\n\n"
        f"SERVICE COMPONENTS:\n{json.dumps(service_components, indent=2)}\n\n"
        "CRITICAL RULES:\n"
        + "".join(critical_rules)
        + "- FORMATTING: Break the email into 3 clear paragraphs separated by blank lines:\n"
        + "".join(formatting_lines)
        + "Write ONLY the email body (no \"Hi\", no \"Best\", no signature)."
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
                "temperature": 0.7,
                "max_completion_tokens": 11200,
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
        LOGGER.exception("Groq email generation request failed: %s", exc)
        return "Email body unavailable: failed to generate email body."
