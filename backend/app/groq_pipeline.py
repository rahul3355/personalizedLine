"""Groq + SERPER research pipeline for generating personalized openers."""
from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional

import requests

try:  # pragma: no cover - optional dependency for tests
    from groq import Groq  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - allow import without SDK
    Groq = None  # type: ignore

try:  # pragma: no cover - optional dependency for tests
    import tiktoken  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - fallback tokenizer
    tiktoken = None  # type: ignore

SERPER_URL = os.getenv("SERPER_URL", "https://google.serper.dev/search")


def _require_env(name: str) -> str:
    value = os.getenv(name, "")
    if not value:
        raise ProspectResearchError(f"{name} is not configured")
    return value

SERVICE_CONTEXT_DEFAULT = os.getenv(
    "SERVICE_CONTEXT",
    (
        "I have a saas which helps you personalize every outreach email at scale "
        "using AI-generated personalized opening lines based on online public data "
        "about the prospect and their company. And I want funding for this saas from you."
    ),
)

MODEL_PRICING = {
    "llama-3.1-8b-instant": {"input": Decimal("0.05"), "output": Decimal("0.08")},
    "openai/gpt-oss-120b": {"input": Decimal("0.15"), "output": Decimal("0.75")},
}

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", re.IGNORECASE)


class ProspectResearchError(RuntimeError):
    """Raised when the research pipeline cannot produce an opener."""


def _round_money(value: Decimal, places: int = 6) -> float:
    return float(value.quantize(Decimal("1").scaleb(-places), rounding=ROUND_HALF_UP))


@dataclass
class ModelRun:
    prompt_tokens: int
    completion_tokens: int
    elapsed_seconds: float
    cost_usd: float
    raw_output: str

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens


@dataclass
class PipelineResult:
    line: str
    search_snippets: str
    serper_payload: str
    llama_run: Optional[ModelRun]
    gpt_run: Optional[ModelRun]
    fallback_reason: Optional[str]

    @property
    def total_cost(self) -> float:
        total = Decimal("0")
        if self.llama_run:
            total += Decimal(str(self.llama_run.cost_usd))
        if self.gpt_run:
            total += Decimal(str(self.gpt_run.cost_usd))
        return _round_money(total)

    @property
    def total_input_tokens(self) -> int:
        total = 0
        if self.llama_run:
            total += self.llama_run.prompt_tokens
        if self.gpt_run:
            total += self.gpt_run.prompt_tokens
        return total

    @property
    def total_output_tokens(self) -> int:
        total = 0
        if self.llama_run:
            total += self.llama_run.completion_tokens
        if self.gpt_run:
            total += self.gpt_run.completion_tokens
        return total

    @property
    def total_elapsed(self) -> float:
        total = 0.0
        if self.llama_run:
            total += self.llama_run.elapsed_seconds
        if self.gpt_run:
            total += self.gpt_run.elapsed_seconds
        return total


def _calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    if model_name not in MODEL_PRICING:
        raise ProspectResearchError(f"Unknown model pricing for {model_name}")
    rates = MODEL_PRICING[model_name]
    input_cost = (Decimal(input_tokens) / Decimal(1_000_000)) * rates["input"]
    output_cost = (Decimal(output_tokens) / Decimal(1_000_000)) * rates["output"]
    return _round_money(input_cost + output_cost)


def _build_tokenizer():
    if tiktoken is None:  # pragma: no cover - fallback for test environments
        class _FallbackTokenizer:
            def encode(self, text: str):
                return text.split()

        return _FallbackTokenizer()
    try:
        return tiktoken.encoding_for_model("gpt-4")
    except Exception:
        try:
            return tiktoken.get_encoding("cl100k_base")
        except Exception:  # pragma: no cover - network failures in CI
            class _FallbackTokenizer:
                def encode(self, text: str):
                    return text.split()

            return _FallbackTokenizer()
        return tiktoken.get_encoding("cl100k_base")


ENCODER = _build_tokenizer()


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ProspectResearchError(f"{name} is not configured")
    return value


def _load_groq_class():  # pragma: no cover - thin import shim
    global Groq  # type: ignore
    if Groq is not None:
        return Groq
    try:
        from groq import Groq as _Groq  # type: ignore
    except ModuleNotFoundError as exc:  # pragma: no cover - handled upstream
        raise ProspectResearchError("groq SDK is not installed") from exc
    Groq = _Groq  # type: ignore
    return Groq


def count_tokens(text: Optional[str]) -> int:
    return len(ENCODER.encode(text or ""))


def _get_groq_client() -> "Groq":
    groq_cls = _load_groq_class()
    api_key = _require_env("GROQ_API_KEY")
    return groq_cls(api_key=api_key)
def _get_groq_client() -> Groq:
    if Groq is None:
        raise ProspectResearchError("groq SDK is not installed")
    api_key = _require_env("GROQ_API_KEY")
    return Groq(api_key=api_key)


def _ensure_session(session: Optional[requests.Session] = None) -> requests.Session:
    return session or requests.Session()


def _serper_search(email: str, session: Optional[requests.Session] = None) -> Dict[str, Any]:
    api_key = _require_env("SERPER_API_KEY")

    sess = _ensure_session(session)
    username, domain = email.split("@", 1)
    payload = [{"q": f"{username} {domain}"}, {"q": domain}]
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}

    resp = sess.post(SERPER_URL, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _collect_paragraphs(search_payload: Any) -> str:
    blocks = search_payload if isinstance(search_payload, list) else [search_payload]
    snippets = []
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
                snippets.append("\n".join(filter(None, [title, snippet])))
    return "\n\n".join(snippets)


def _run_llama(snippets: str, client: Groq) -> ModelRun:
    prompt = (
        "From the text below identify the primary person and the primary company.\n"
        'Return EXACTLY valid JSON with two top-level keys: "person" and "company".\n'
        'Each value must have:\n- "name": full name (string)\n- "info": exactly two sentences about that person/company.\n'
        "Also write the company's moat in one line.\n\nText:\n" + snippets
    )
    prompt_tokens = count_tokens(prompt)
    start = time.time()
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
    )
    elapsed = time.time() - start
    output_text = (response.choices[0].message.content or "").strip()
    completion_tokens = count_tokens(output_text)
    cost = _calculate_cost("llama-3.1-8b-instant", prompt_tokens, completion_tokens)
    return ModelRun(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        elapsed_seconds=round(elapsed, 3),
        cost_usd=cost,
        raw_output=output_text,
    )


def _run_gpt(extraction_json: str, service_context: str, client: Groq) -> ModelRun:
    prompt = (
        "Generate a human-written, well-researched, conversational, highly personalized opening line "
        "for email after 'Hi _name_' (don’t include 'Hi name'). Write one or two sentences. Don’t pitch. "
        "Focus on a pain this person/company might face. Output only the line in plain English.\n\n"
        f"Person info:\n{extraction_json}\n\nService context:\n{service_context}"
    )
    prompt_tokens = count_tokens(prompt)
    start = time.time()
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.6,
        max_completion_tokens=1024,
        top_p=0.95,
    )
    elapsed = time.time() - start
    output_text = (response.choices[0].message.content or "").strip()
    completion_tokens = count_tokens(output_text)
    cost = _calculate_cost("openai/gpt-oss-120b", prompt_tokens, completion_tokens)
    return ModelRun(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        elapsed_seconds=round(elapsed, 3),
        cost_usd=cost,
        raw_output=output_text,
    )


def generate_opener_from_email(
    email: str,
    *,
    service_context: Optional[str] = None,
    session: Optional[requests.Session] = None,
    client: Optional[Groq] = None,
) -> PipelineResult:
    if not email or not EMAIL_REGEX.match(email):
        raise ProspectResearchError("A valid email address is required")

    search_payload = _serper_search(email, session=session)
    snippets = _collect_paragraphs(search_payload)
    if not snippets:
        return PipelineResult(
            line="We tried to research you online but could not find enough context to personalize this outreach.",
            search_snippets="",
            serper_payload=json.dumps(search_payload, ensure_ascii=False),
            llama_run=None,
            gpt_run=None,
            fallback_reason="no_search_results",
        )

    groq_client = client or _get_groq_client()

    llama_run = _run_llama(snippets, groq_client)
    extraction_json = llama_run.raw_output

    service_text = service_context or SERVICE_CONTEXT_DEFAULT

    try:
        json.loads(extraction_json)
    except Exception:
        # Encourage downstream prompt to self-correct by wrapping in JSON block
        extraction_json = json.dumps({"raw": extraction_json})

    gpt_run = _run_gpt(extraction_json, service_text, groq_client)

    line = gpt_run.raw_output or ""
    if not line:
        raise ProspectResearchError("Groq returned an empty opener")

    return PipelineResult(
        line=line,
        search_snippets=snippets,
        serper_payload=json.dumps(search_payload, ensure_ascii=False),
        llama_run=llama_run,
        gpt_run=gpt_run,
        fallback_reason=None,
    )

