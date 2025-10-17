"""Groq + Serper pipeline for generating personalized outreach lines."""

from __future__ import annotations

import importlib
import time
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable, List, Optional, Tuple
import os
import time
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Iterable, List, Optional

import re

import requests

_groq_spec = importlib.util.find_spec("groq")
if _groq_spec is not None:
    _groq_module = importlib.import_module("groq")
    Groq = getattr(_groq_module, "Groq", None)
else:
    Groq = None  # type: ignore[assignment]

_tiktoken_spec = importlib.util.find_spec("tiktoken")
if _tiktoken_spec is not None:
    _tiktoken = importlib.import_module("tiktoken")
else:
    _tiktoken = None
import tiktoken
from groq import Groq

SERPER_URL = "https://google.serper.dev/search"

LLM_EXTRACTION_MODEL = "llama-3.1-8b-instant"
LLM_PERSONALIZATION_MODEL = "openai/gpt-oss-120b"

MODEL_PRICING: Dict[str, Dict[str, Decimal]] = {
    LLM_EXTRACTION_MODEL: {"input": Decimal("0.05"), "output": Decimal("0.08")},
    LLM_PERSONALIZATION_MODEL: {"input": Decimal("0.15"), "output": Decimal("0.75")},
}

EMAIL_HEADER_ALIASES = {
    "email",
    "emails",
    "emailid",
    "mail",
    "mailid",
}


class PersonalizedLineError(RuntimeError):
    """Raised when the personalized line generation fails."""


@dataclass
class GenerationMetrics:
    email: str
    extraction_json: str
    opening_line: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    elapsed_seconds: float


EMAIL_PATTERN = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
EMAIL_HEADER_CANDIDATES = {
    "email",
    "emails",
    "e-mail",
    "e-mails",
    "email id",
    "email-id",
    "emailid",
    "mail",
    "mail id",
    "email address",
}


def extract_email_from_row(row: Dict[str, str]) -> Optional[str]:
    """Return the email value from the column labelled ``Email`` (case-insensitive)."""

    for header, value in row.items():
        if header is None:
            continue

        normalized_header = str(header).strip().casefold()
        if normalized_header not in EMAIL_HEADER_CANDIDATES:
            continue

        if normalized_header != "email":
            continue

    """Return the first email-like value found in the row values."""
    for value in row.values():
        if value is None:
            candidate = ""
        elif isinstance(value, str):
            candidate = value.strip()
        else:
            candidate = str(value).strip()

        if not candidate:
            continue

        match = EMAIL_PATTERN.search(candidate)
        if match:
            return match.group(0)

def _normalize_header(header: Optional[str]) -> str:
    if not header:
        return ""
    cleaned = "".join(ch for ch in header.lower() if ch.isalnum())
    return cleaned


def extract_email_from_row(row: Dict[str, str]) -> Optional[str]:
    """Return the first non-empty email value based on known header aliases."""
    for key in row.keys():
        normalized = _normalize_header(key)
        if normalized in EMAIL_HEADER_ALIASES:
            value = row.get(key)
            if isinstance(value, str):
                candidate = value.strip()
            elif value is None:
                candidate = ""
            else:
                candidate = str(value).strip()
            if candidate:
                return candidate
    return None


class _Tokenizer:
    """Small wrapper around tiktoken with graceful fallback."""

    def __init__(self) -> None:
        if _tiktoken is None:
            self._enc = None
        else:
            try:
                self._enc = _tiktoken.encoding_for_model("gpt-4")
            except Exception:
                self._enc = _tiktoken.get_encoding("cl100k_base")

    def count(self, text: str) -> int:
        if self._enc is None:
            # Rough heuristic: 4 characters per token fallback.
            return max(1, len(text or "") // 4) if text else 0
        try:
            self._enc = tiktoken.encoding_for_model("gpt-4")
        except Exception:
            self._enc = tiktoken.get_encoding("cl100k_base")

    def count(self, text: str) -> int:
        return len(self._enc.encode(text or ""))


class PersonalizedLineGenerator:
    """Encapsulates the Groq + Serper workflow for generating personalized lines."""

    def __init__(
        self,
        *,
        groq_api_key: str,
        serper_api_key: str,
        groq_client: Optional["Groq"] = None,
        serper_url: str = SERPER_URL,
        http_client: Optional[requests.Session] = None,
    ) -> None:
        if not groq_api_key:
            raise PersonalizedLineError("Groq API key is required")
        if not serper_api_key:
            raise PersonalizedLineError("Serper API key is required")

        if Groq is None:
            raise PersonalizedLineError(
                "groq package is not installed; install backend/app/requirements.txt"
            )

        if groq_client is None:
            groq_client = Groq(api_key=groq_api_key)
        self._client = groq_client

        self._serper_api_key = serper_api_key
        groq_client: Optional[Groq] = None,
        serper_url: str = SERPER_URL,
        http_client: Optional[requests.Session] = None,
    ) -> None:
        api_key = os.getenv("GROQ_API_KEY")
        if groq_client is None:
            if not api_key:
                raise PersonalizedLineError("GROQ_API_KEY is not configured")
            groq_client = Groq(api_key=api_key)
        self._client = groq_client

        self._serper_api_key = os.getenv("SERPER_API_KEY")
        if not self._serper_api_key:
            raise PersonalizedLineError("SERPER_API_KEY is not configured")

        self._serper_url = serper_url
        self._http = http_client or requests.Session()
        self._tokenizer = _Tokenizer()

    def _round_money(self, amount: Decimal, places: int = 6) -> float:
        return float(amount.quantize(Decimal("1").scaleb(-places), rounding=ROUND_HALF_UP))

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> Decimal:
        pricing = MODEL_PRICING.get(model)
        if not pricing:
            return Decimal("0")
        input_cost = (Decimal(input_tokens) / Decimal(1_000_000)) * pricing["input"]
        output_cost = (Decimal(output_tokens) / Decimal(1_000_000)) * pricing["output"]
        return input_cost + output_cost

    def _serper_payload(self, email: str) -> List[Dict[str, str]]:
        username, _, domain = email.partition("@")
        if not username or not domain:
            raise PersonalizedLineError("Invalid email format")
        return [{"q": f"{username} {domain}"}, {"q": domain}]

    def _search_public_data(self, email: str) -> str:
        payload = self._serper_payload(email)
        headers = {"X-API-KEY": self._serper_api_key, "Content-Type": "application/json"}
        response = self._http.post(self._serper_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        blocks: Iterable[Dict[str, object]]
        if isinstance(data, list):
            blocks = data
        elif isinstance(data, dict):
            blocks = [data]
        else:
            raise PersonalizedLineError("Unexpected SERPER response format")

        paragraphs: List[str] = []
        for block in blocks:
            organic_entries = []
            if isinstance(block, dict):
                organic_entries = block.get("organic") or []
            for entry in organic_entries:
                if not isinstance(entry, dict):
                    continue
                title = (entry.get("title") or "").strip()
                snippet = (entry.get("snippet") or "").strip()
                if title or snippet:
                    paragraphs.append(f"{title}\n{snippet}")
        concatenated = "\n\n".join(paragraphs)
        if not concatenated:
            raise PersonalizedLineError("No public information found for email")
        return concatenated

    def _run_extraction_model(
        self, text: str
    ) -> tuple[str, int, int, Decimal, float]:
        prompt = (
            "From the text below identify the primary person and the primary company.\n"
            'Return EXACTLY valid JSON with two top-level keys: "person" and "company".\n'
            "Each value must have:\n"
            '- "name": full name (string)\n'
            '- "info": exactly two sentences about that person/company.\n'
            "Also write the company's moat in one line.\n\nText:\n"
            + text
        )
        input_tokens = self._tokenizer.count(prompt)
        start = time.time()
        response = self._client.chat.completions.create(
            model=LLM_EXTRACTION_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        elapsed = time.time() - start
        content = (response.choices[0].message.content or "").strip()
        output_tokens = self._tokenizer.count(content)
        cost = self._calculate_cost(LLM_EXTRACTION_MODEL, input_tokens, output_tokens)
        return content, input_tokens, output_tokens, cost, elapsed

    def _run_personalization_model(
        self, person_company_json: str, service_context: str
    ) -> tuple[str, int, int, Decimal, float]:
        prompt = (
            "Generate a human-written, well-researched, conversational, highly personalized opening line "
            "for email after 'Hi _name_' (don’t include 'Hi name'). "
            "Write one or two sentences. Don’t pitch. Focus on a pain this person/company might face. "
            "Output only the line in plain English.\n\nPerson info:\n"
            + person_company_json
            + "\n\nService context:\n"
            + (service_context or "")
        )
        input_tokens = self._tokenizer.count(prompt)
        start = time.time()
        response = self._client.chat.completions.create(
            model=LLM_PERSONALIZATION_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_completion_tokens=1024,
            top_p=0.95,
        )
        elapsed = time.time() - start
        content = (response.choices[0].message.content or "").strip()
        output_tokens = self._tokenizer.count(content)
        cost = self._calculate_cost(LLM_PERSONALIZATION_MODEL, input_tokens, output_tokens)
        return content, input_tokens, output_tokens, cost, elapsed

    def generate(self, email: str, service_context: str) -> GenerationMetrics:
        public_text = self._search_public_data(email)
        extraction_json, extract_in_tokens, extract_out_tokens, extract_cost, extract_elapsed = self._run_extraction_model(public_text)
        opening_line, line_in_tokens, line_out_tokens, line_cost, line_elapsed = self._run_personalization_model(
            extraction_json, service_context
        )
        total_cost = extract_cost + line_cost
        total_input = extract_in_tokens + line_in_tokens
        total_output = extract_out_tokens + line_out_tokens
        total_elapsed = extract_elapsed + line_elapsed
        metrics = GenerationMetrics(
            email=email,
            extraction_json=extraction_json,
            opening_line=opening_line,
            input_tokens=total_input,
            output_tokens=total_output,
            cost_usd=self._round_money(total_cost),
            elapsed_seconds=total_elapsed,
        )
        return metrics


_generator_cache: Dict[Tuple[str, str], PersonalizedLineGenerator] = {}


def get_personalized_line_generator(
    groq_api_key: str, serper_api_key: str
) -> PersonalizedLineGenerator:
    cache_key = (groq_api_key, serper_api_key)
    generator = _generator_cache.get(cache_key)
    if generator is None:
        generator = PersonalizedLineGenerator(
            groq_api_key=groq_api_key,
            serper_api_key=serper_api_key,
        )
        _generator_cache[cache_key] = generator
    return generator
_generator: Optional[PersonalizedLineGenerator] = None


def get_personalized_line_generator() -> PersonalizedLineGenerator:
    global _generator
    if _generator is None:
        _generator = PersonalizedLineGenerator()
    return _generator
