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


def _is_valid_research_payload(content: str) -> bool:
    """Return True if the JSON string matches the expected research schema."""

    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return False

    if not isinstance(payload, dict):
        return False

    for section_name in ("person", "company"):
        section = payload.get(section_name)
        if not isinstance(section, dict):
            return False

        name = section.get("name")
        info = section.get("info")
        moat = section.get("moat")

        if not isinstance(name, str):
            return False

        if not (isinstance(info, list) and len(info) == 2 and all(isinstance(item, str) for item in info)):
            return False

        if not isinstance(moat, str):
            return False

    return True


def _build_prompt(email: str, findings: List[str]) -> str:
    findings_text = "\n\n".join(findings) if findings else "No findings available."
    prompt = (
        "You are assisting a sales researcher in preparing a personalized cold outreach email.\n"
        "Using the search findings below, identify relevant insights about the prospect or their company.\n"
        "Return valid JSON with exactly two top-level keys: 'person' and 'company'.\n"
        "Each of those keys must map to an object containing:\n"
        "- 'name': the person's full name or the company's full name as a string (empty string if unknown).\n"
        "- 'info': an array of exactly two standalone sentences, each string capturing a distinct insight to use in outreach.\n"
        "- 'moat': a single-string description of the person's or company's unique advantage or defensible edge (empty string if unavailable).\n"
        "Do not include any other keys or commentary.\n"
        f"Prospect email: {email}\n"
        "Search findings:\n"
        f"{findings_text}\n"
        "Ensure the response is valid JSON and avoid additional commentary."
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
                "temperature": 0.2,
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

        if not _is_valid_research_payload(cleaned):
            LOGGER.warning("Groq returned invalid research JSON for %s: %s", email, cleaned)
            return "Research unavailable: Groq returned malformed JSON."

        return cleaned
    except Exception as exc:
        LOGGER.exception("Groq request failed for %s: %s", email, exc)
        return "Research unavailable: failed to generate Groq summary."
