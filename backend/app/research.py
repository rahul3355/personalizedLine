"""Helper utilities for performing research to support personalized outreach."""

from __future__ import annotations

import json
import logging
import os
from typing import List

import requests

LOGGER = logging.getLogger(__name__)

SERPER_ENDPOINT = "https://google.serper.dev/search"
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.1-8b-instant"


def _clean_response_content(content: str) -> str:
    """Normalize Groq response content to a raw JSON string."""

    if not content:
        return ""

    stripped = content.strip()
    if not stripped:
        return ""

    if stripped.startswith("```"):
        # Remove optional language hint (e.g., ```json) and trailing fence.
        stripped = stripped[3:]
        if stripped.lower().startswith("json"):
            stripped = stripped[4:]
        if stripped.endswith("```"):
            stripped = stripped[:-3]
        stripped = stripped.strip()

    return stripped


def _coerce_string_list(value: object) -> list[str]:
    """Normalize a value into a list of strings."""

    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str)]
    return []


def _is_valid_research_payload(content: str) -> tuple[bool, dict | None]:
    """Validate and normalize the expected research payload JSON."""

    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return False, None

    # Handle case where Groq returns an array instead of a single object
    if isinstance(payload, list):
        if not payload:
            return False, None
        # Take the first element
        payload = payload[0]

    if not isinstance(payload, dict):
        return False, None

    prospect_info = payload.get("prospect_info")
    if isinstance(prospect_info, dict):
        name = prospect_info.get("name")
        title = prospect_info.get("title")
        company = prospect_info.get("company")

        # Validate required fields: name and company must be strings
        if not isinstance(name, str) or not isinstance(company, str):
            return False, None

        # Title can be None, null, or empty - convert to empty string
        if title is None or not isinstance(title, str):
            title = ""

        recent_activity = _coerce_string_list(prospect_info.get("recent_activity"))
        relevance_signals = _coerce_string_list(prospect_info.get("relevance_signals"))

        cleaned_payload = {
            "prospect_info": {
                "name": name,
                "title": title,
                "company": company,
                "recent_activity": recent_activity,
                "relevance_signals": relevance_signals,
            }
        }

        return True, cleaned_payload

    person = payload.get("person")
    company = payload.get("company")

    if isinstance(person, dict) and isinstance(company, dict):
        person_name = person.get("name")
        company_name = company.get("name")

        if not isinstance(person_name, str) or not isinstance(company_name, str):
            return False, None

        person_info = _coerce_string_list(person.get("info"))
        company_info = _coerce_string_list(company.get("info"))

        normalized_payload: dict[str, dict[str, object]] = {
            "person": {
                "name": person_name,
                "info": person_info,
            },
            "company": {
                "name": company_name,
                "info": company_info,
                "moat": company.get("moat") if isinstance(company.get("moat"), str) else "",
            },
        }

        return True, normalized_payload

    return False, None


def _build_prompt(email: str, search_data: List[dict]) -> str:
    prompt = (
        "Extract structured information from this research data and return ONLY valid JSON.\n\n"
        f"RESEARCH DATA:\n{json.dumps(search_data, indent=2)}\n\n"
        "Extract into this exact structure (a SINGLE JSON OBJECT, NOT an array):\n"
        "{\n"
        '    "prospect_info": {\n'
        '        "name": "Full name",\n'
        '        "title": "Current job title or empty string if not found",\n'
        '        "company": "Company name",\n'
        '        "recent_activity": ["Recent thing 1", "Recent thing 2"],\n'
        '        "relevance_signals": ["Major signal"]\n'
        "    }\n"
        "}\n\n"
        "IMPORTANT:\n"
        "- If title is not available, use empty string \"\" (NOT null)\n"
        "- All string fields must be strings, never null\n"
        "- Return a SINGLE JSON object (not an array)\n"
        "- Return ONLY the JSON, no explanation"
    )
    return prompt


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

        cleaned = _clean_response_content(content)
        if not cleaned:
            raise ValueError("Groq response empty after cleaning")

        is_valid, normalized_payload = _is_valid_research_payload(cleaned)
        if not is_valid or normalized_payload is None:
            LOGGER.warning("Groq returned invalid research JSON for %s: %s", email, cleaned)
            return "Research unavailable: Groq returned malformed JSON."

        return json.dumps(normalized_payload, ensure_ascii=False, indent=2)
    except Exception as exc:
        LOGGER.exception("Groq request failed for %s: %s", email, exc)
        return "Research unavailable: failed to generate Groq summary."
