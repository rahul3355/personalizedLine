"""Helper utilities for performing research to support personalized outreach."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

import requests

LOGGER = logging.getLogger(__name__)

SERPER_ENDPOINT = "https://google.serper.dev/search"
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.1-8b-instant"


def _build_prompt(email: str, search_data: List[dict]) -> str:
    prompt = (
        "Extract structured information from this research data and return ONLY valid JSON.\n\n"
        f"RESEARCH DATA:\n{json.dumps(search_data, indent=2)}\n\n"
        "Extract into this exact structure:\n"
        "{\n"
        '    "prospect_info": {\n'
        '        "name": "Full name",\n'
        '        "title": "Current job title",\n'
        '        "company": "Company name",\n'
        '        "recent_activity": ["Recent thing 1", "Recent thing 2"],\n'
        '        "relevance_signals": ["Major signal"]\n'
        "    }\n"
        "}\n\n"
        "Return ONLY the JSON, no explanation."
    )
    return prompt


FALLBACK_MALFORMED_JSON = "Research unavailable: Groq returned malformed JSON."


def _strip_code_fences(content: str) -> str:
    """Remove optional Markdown code fences from the Groq response."""

    stripped = content.strip()
    if not stripped.startswith("```"):
        return stripped

    lines = stripped.splitlines()
    # Drop the opening fence
    lines = lines[1:]

    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]

    return "\n".join(lines).strip()


def _normalize_groq_payload(raw_content: str) -> Dict[str, Any]:
    """Parse and validate Groq content into a normalized payload."""

    cleaned_content = _strip_code_fences(raw_content)
    try:
        payload = json.loads(cleaned_content)
    except json.JSONDecodeError as exc:  # pragma: no cover - covered via fallback test
        raise ValueError("Groq response was not valid JSON") from exc

    # Unwrap single-element arrays that contain the expected structure
    if isinstance(payload, list):
        if len(payload) == 1 and isinstance(payload[0], dict):
            payload = payload[0]
        else:
            raise ValueError("Groq response was not a JSON object")

    if not isinstance(payload, dict):
        raise ValueError("Groq response was not a JSON object")

    prospect_info = payload.get("prospect_info")
    if not isinstance(prospect_info, dict):
        raise ValueError("Groq response missing 'prospect_info' object")

    required_string_fields = ["name", "title", "company"]
    for field in required_string_fields:
        value = prospect_info.get(field)
        if not isinstance(value, str):
            raise ValueError(f"Groq response field 'prospect_info.{field}' must be a string")

    list_fields = ["recent_activity", "relevance_signals"]
    for field in list_fields:
        value = prospect_info.get(field)
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise ValueError(
                f"Groq response field 'prospect_info.{field}' must be a list of strings"
            )

    return payload


def perform_research(email: str) -> str:
    """Run Serper and Groq research for an email address.

    Returns the JSON string from Groq or a descriptive fallback string if anything fails.
    """

    if not email or "@" not in email:
        return "Research unavailable: invalid or missing email address."

    serper_key = os.getenv("SERPER_API_KEY")
    if not serper_key:
        LOGGER.warning("SERPER_API_KEY not configured; skipping research for %s", email)
        return "Research unavailable: missing Serper API key."

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        LOGGER.warning("GROQ_API_KEY not configured; skipping research for %s", email)
        return "Research unavailable: missing Groq API key."

    username, domain = email.split("@", 1)
    queries = [f"{username} {domain}".strip(), domain]

    search_data: List[dict] = []
    headers = {
        "X-API-KEY": serper_key,
        "Content-Type": "application/json",
    }

    for query in queries:
        if not query:
            continue
        try:
            response = requests.post(
                SERPER_ENDPOINT,
                headers=headers,
                json={"q": query},
                timeout=20,
            )
            response.raise_for_status()
            payload = response.json()
            search_data.append(payload)
        except Exception as exc:
            LOGGER.exception("Serper request failed for query '%s': %s", query, exc)
            continue

    if not search_data or not any(d.get("organic") for d in search_data):
        return "Research unavailable: no search results from Serper."

    print("\n📊 RAW RESEARCH DATA:")
    print(json.dumps(search_data, indent=2))

    prompt = _build_prompt(email, search_data)

    try:
        response = requests.post(
            GROQ_ENDPOINT,
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL_NAME,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a precise assistant that only responds with JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
                "max_completion_tokens": 11500,
            },
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        choices = payload.get("choices") or []
        if not choices:
            raise ValueError("Groq response missing choices")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not content:
            raise ValueError("Groq response missing message content")
        try:
            normalized_payload = _normalize_groq_payload(content)
        except ValueError as exc:
            LOGGER.warning("Groq response validation failed for %s: %s", email, exc)
            return FALLBACK_MALFORMED_JSON

        return json.dumps(normalized_payload, indent=2)
    except Exception as exc:
        LOGGER.exception("Groq request failed for %s: %s", email, exc)
        return "Research unavailable: failed to generate Groq summary."
