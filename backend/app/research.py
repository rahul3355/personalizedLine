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

        return content.strip()
    except Exception as exc:
        LOGGER.exception("Groq request failed for %s: %s", email, exc)
        return "Research unavailable: failed to generate Groq summary."
