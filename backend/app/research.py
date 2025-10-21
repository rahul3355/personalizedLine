"""Helper utilities for performing research to support personalized outreach."""

from __future__ import annotations

import logging
import os
from typing import List

import requests

LOGGER = logging.getLogger(__name__)

SERPER_ENDPOINT = "https://google.serper.dev/search"
GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.1-8b-instant"


def _build_prompt(email: str, findings: List[str]) -> str:
    findings_text = "\n\n".join(findings) if findings else "No findings available."
    prompt = (
        "You are assisting a sales researcher in preparing a personalized cold outreach email.\n"
        "Using the search findings below, identify relevant insights about the prospect or their company.\n"
        "Return a JSON object with two keys: 'summary' (a short paragraph) and 'insights' (a list of distinct bullet-sized strings).\n"
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
        return content.strip()
    except Exception as exc:
        LOGGER.exception("Groq request failed for %s: %s", email, exc)
        return "Research unavailable: failed to generate Groq summary."
