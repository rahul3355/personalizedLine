"""Two-step Groq personalization pipeline used by the worker."""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Optional, Tuple

import requests

try:
    import tiktoken
except Exception:  # pragma: no cover - best effort optional dependency
    tiktoken = None  # type: ignore

from groq import Groq


SERPER_URL = "https://google.serper.dev/search"


MODEL_PRICING: Dict[str, Dict[str, Decimal]] = {
    "llama-3.1-8b-instant": {"input": Decimal("0.05"), "output": Decimal("0.08")},
    "openai/gpt-oss-120b": {"input": Decimal("0.15"), "output": Decimal("0.75")},
}


def _round_money(value: Decimal, places: int = 6) -> float:
    return float(value.quantize(Decimal("1").scaleb(-places), rounding=ROUND_HALF_UP))


def _calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> Dict[str, float]:
    rates = MODEL_PRICING.get(model)
    if not rates:
        return {"model": model, "input_cost": 0.0, "output_cost": 0.0, "total_cost": 0.0}

    prompt_cost = (Decimal(prompt_tokens) / Decimal(1_000_000)) * rates["input"]
    completion_cost = (Decimal(completion_tokens) / Decimal(1_000_000)) * rates["output"]
    total = prompt_cost + completion_cost
    return {
        "model": model,
        "input_cost": _round_money(prompt_cost),
        "output_cost": _round_money(completion_cost),
        "total_cost": _round_money(total),
    }


_ENCODER = None


def _get_encoder():
    global _ENCODER
    if _ENCODER is not None:
        return _ENCODER

    if tiktoken is None:
        _ENCODER = None
        return None

    try:
        _ENCODER = tiktoken.encoding_for_model("gpt-4")
    except Exception:
        _ENCODER = tiktoken.get_encoding("cl100k_base")
    return _ENCODER


def _count_tokens(text: str) -> int:
    encoder = _get_encoder()
    if encoder is None:
        return len((text or "").split())
    return len(encoder.encode(text or ""))


_GROQ_CLIENT: Optional[Groq] = None


def _get_groq_client() -> Groq:
    global _GROQ_CLIENT
    if _GROQ_CLIENT is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is not set")
        _GROQ_CLIENT = Groq(api_key=api_key)
    return _GROQ_CLIENT


@dataclass
class PersonalizationResult:
    """Structured response for a single personalization row."""

    user_info: str
    personalized_line: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    costs: Dict[str, Dict[str, float]] = field(default_factory=dict)
    timings: Dict[str, float] = field(default_factory=dict)
    raw_extraction: str = ""


def _perform_serper_search(username: str, domain: str) -> str:
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        raise RuntimeError("SERPER_API_KEY environment variable is not set")

    payload = [{"q": f"{username} {domain}"}, {"q": domain}]
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    response = requests.post(SERPER_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    blocks = data if isinstance(data, list) else [data]

    paragraphs = []
    for block in blocks:
        organic = block.get("organic") if isinstance(block, dict) else None
        if not organic:
            continue
        for entry in organic:
            if not isinstance(entry, dict):
                continue
            title = (entry.get("title") or "").strip()
            snippet = (entry.get("snippet") or "").strip()
            if title or snippet:
                paragraphs.append(f"{title}\n{snippet}".strip())

    return "\n\n".join(paragraphs)


def _call_groq(model: str, prompt: str, **kwargs) -> Tuple[str, int, int]:
    client = _get_groq_client()
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        **kwargs,
    )
    message = response.choices[0].message.content or ""
    usage = getattr(response, "usage", None)
    prompt_tokens = getattr(usage, "prompt_tokens", 0) if usage else 0
    completion_tokens = getattr(usage, "completion_tokens", 0) if usage else 0
    return message.strip(), prompt_tokens, completion_tokens


def run_personalization_pipeline(email: str, service: str) -> PersonalizationResult:
    email_value = (email or "").strip()
    service_value = (service or "").strip()

    if not email_value:
        message = "[Missing email address]"
        return PersonalizationResult(
            user_info=message,
            personalized_line=message,
        )

    if "@" not in email_value:
        message = f"[Invalid email format: {email_value}]"
        return PersonalizationResult(
            user_info=message,
            personalized_line="[Unable to generate line: invalid email]",
        )

    username, domain = email_value.split("@", 1)

    timings: Dict[str, float] = {}
    costs: Dict[str, Dict[str, float]] = {}

    try:
        serper_start = time.time()
        search_text = _perform_serper_search(username, domain)
        timings["serper_search"] = time.time() - serper_start
    except Exception as exc:
        error = f"[Search error: {exc}]"
        return PersonalizationResult(
            user_info=error,
            personalized_line="[Unable to generate line: search failed]",
        )

    if not search_text:
        return PersonalizationResult(
            user_info="[No search results found]",
            personalized_line="[Unable to generate line: no public context]",
        )

    prompt1 = (
        "From the text below identify the primary person and the primary company.\n"
        "Return EXACTLY valid JSON with two top-level keys: \"person\" and \"company\".\n"
        "Each value must have:\n"
        "- \"name\": full name (string)\n"
        "- \"info\": exactly two sentences about that person/company.\n"
        "Also write the company's moat in one line.\n\nText:\n"
        + search_text
    )

    prompt_tokens_1 = _count_tokens(prompt1)

    try:
        step1_start = time.time()
        extraction, prompt_tokens_model, completion_tokens_model = _call_groq(
            "llama-3.1-8b-instant", prompt1
        )
        timings["groq_step1"] = time.time() - step1_start
    except Exception as exc:
        error = f"[Groq step1 error: {exc}]"
        return PersonalizationResult(
            user_info=error,
            personalized_line="[Unable to generate line: extraction failed]",
        )

    if prompt_tokens_model:
        prompt_tokens_1 = prompt_tokens_model
    completion_tokens_1 = completion_tokens_model or _count_tokens(extraction)
    costs["llama-3.1-8b-instant"] = _calculate_cost(
        "llama-3.1-8b-instant", prompt_tokens_1, completion_tokens_1
    )

    prompt2 = (
        "Generate a human-written, well-researched, conversational, highly personalized opening line "
        "for email after 'Hi _name_' (don’t include 'Hi name'). "
        "Write one or two sentences. Don’t pitch. Focus on a pain this person/company might face. "
        "Output only the line in plain English.\n\nPerson info:\n"
        + extraction
        + "\n\nService context:\n"
        + service_value
    )

    prompt_tokens_2 = _count_tokens(prompt2)

    try:
        step2_start = time.time()
        opener, prompt_tokens_model2, completion_tokens_model2 = _call_groq(
            "openai/gpt-oss-120b",
            prompt2,
            temperature=0.6,
            max_completion_tokens=1024,
            top_p=0.95,
        )
        timings["groq_step2"] = time.time() - step2_start
    except Exception as exc:
        error = f"[Groq step2 error: {exc}]"
        return PersonalizationResult(
            user_info=extraction or "[Extraction unavailable]",
            personalized_line=error,
        )

    if prompt_tokens_model2:
        prompt_tokens_2 = prompt_tokens_model2
    completion_tokens_2 = completion_tokens_model2 or _count_tokens(opener)
    costs["openai/gpt-oss-120b"] = _calculate_cost(
        "openai/gpt-oss-120b", prompt_tokens_2, completion_tokens_2
    )

    total_prompt_tokens = prompt_tokens_1 + prompt_tokens_2
    total_completion_tokens = completion_tokens_1 + completion_tokens_2

    result = PersonalizationResult(
        user_info=extraction,
        personalized_line=opener or "[No personalized line generated]",
        prompt_tokens=total_prompt_tokens,
        completion_tokens=total_completion_tokens,
        total_tokens=total_prompt_tokens + total_completion_tokens,
        costs=costs,
        timings=timings,
        raw_extraction=extraction,
    )

    return result

