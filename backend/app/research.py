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


def _is_valid_research_payload(content: str) -> tuple[bool, dict | None]:
    """Validate and normalize the expected research payload JSON."""

    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return False, None

    if not isinstance(payload, dict):
        return False, None

    prospect_info = payload.get("prospect_info")
    if not isinstance(prospect_info, dict):
        return False, None

    # Validate required fields
    name = prospect_info.get("name")
    if not isinstance(name, str):
        return False, None

    title = prospect_info.get("title")
    if not isinstance(title, str):
        return False, None

    company = prospect_info.get("company")
    if not isinstance(company, str):
        return False, None

    recent_activity = prospect_info.get("recent_activity")
    if not isinstance(recent_activity, list):
        return False, None

    relevance_signals = prospect_info.get("relevance_signals")
    if not isinstance(relevance_signals, list):
        return False, None

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


def _build_prompt(email: str, findings: List[str]) -> str:
    findings_text = "\n\n".join(findings) if findings else "No findings available."
    prompt = (
        "Extract structured information from this research data and return ONLY valid JSON.\n\n"
        f"RESEARCH DATA:\n{findings_text}\n\n"
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

    findings: List[str] = []
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
        except Exception as exc:
            LOGGER.exception("Serper request failed for query '%s': %s", query, exc)
            continue

        organic_results = payload.get("organic") or []
        for result in organic_results:
            title = result.get("title") or ""
            snippet = result.get("snippet") or ""
            if not (title or snippet):
                continue
            findings.append(f"Title: {title}\nSnippet: {snippet}")

    if not findings:
        findings.append("No search results were retrieved from Serper.")

    prompt = _build_prompt(email, findings)

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
