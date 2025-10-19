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


@dataclass
class ProspectBatchItem:
    email: str
    result: Optional[PipelineResult]
    error: Optional[str]
    elapsed_seconds: float

    @property
    def total_cost(self) -> float:
        if not self.result:
            return 0.0
        return self.result.total_cost

    @property
    def input_tokens(self) -> int:
        if not self.result:
            return 0
        return self.result.total_input_tokens

    @property
    def output_tokens(self) -> int:
        if not self.result:
            return 0
        return self.result.total_output_tokens

    @property
    def model_time(self) -> float:
        if not self.result:
            return 0.0
        return self.result.total_elapsed


@dataclass
class BatchRun:
    items: list[ProspectBatchItem]
    total_input_tokens: int
    total_output_tokens: int
    total_cost_usd: float
    total_model_time_seconds: float
    overall_elapsed_seconds: float


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
    value = os.getenv(name, "")
    if not value:
        raise ProspectResearchError(f"{name} is not configured")
    return value


def _resolve_api_key(name: str, override: Optional[str]) -> str:
    if override:
        return override
    return _require_env(name)


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


def _get_groq_client(*, api_key: Optional[str] = None) -> "Groq":
    groq_cls = _load_groq_class()
    key = _resolve_api_key("GROQ_API_KEY", api_key)
    return groq_cls(api_key=key)


def _ensure_session(session: Optional[requests.Session] = None) -> requests.Session:
    return session or requests.Session()


def _serper_search(
    email: str,
    *,
    api_key: Optional[str] = None,
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:
    key = _resolve_api_key("SERPER_API_KEY", api_key)
    sess = _ensure_session(session)
    username, domain = email.split("@", 1)
    payload = [{"q": f"{username} {domain}"}, {"q": domain}]
    headers = {"X-API-KEY": key, "Content-Type": "application/json"}

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


def _summarize_service_context(service_context: Optional[str]) -> str:
    text = (service_context or SERVICE_CONTEXT_DEFAULT or "").strip()
    if not text:
        return "help your team personalize every outreach email at scale with AI"
    first_sentence = re.split(r"(?<=[.!?])\s+", text)[0].strip()
    cleaned = re.sub(r"^I\s+have\s+a\s+saas\s+which\s+helps\s+you\s+", "", first_sentence, flags=re.IGNORECASE)
    cleaned = cleaned.rstrip(". ")
    if not cleaned:
        return "help your team personalize every outreach email at scale with AI"
    if re.match(r"^(help|support|drive|enable|improve|personalize)", cleaned, re.IGNORECASE):
        return cleaned
    return f"help with {cleaned}"


def _select_highlight(snippets: str) -> str:
    normalized = re.sub(r"\s+", " ", snippets or "").strip()
    if not normalized:
        return "the momentum your team is building right now"
    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    for sentence in sentences:
        candidate = sentence.strip()
        if len(candidate) >= 40:
            return candidate
    return normalized[:160].rstrip(" ,;:")


def _compose_simple_line(snippets: str, service_context: Optional[str]) -> str:
    highlight = _select_highlight(snippets)
    if highlight and highlight[-1] not in ".!?":
        highlight = f"{highlight}."
    context = _summarize_service_context(service_context)
    return (
        f"While digging into your work I noticed {highlight} "
        f"It made me think about how we could {context}."
    )


def _fallback_result(
    *,
    line: str,
    search_payload: Any,
    snippets: str,
    reason: str,
) -> PipelineResult:
    return PipelineResult(
        line=line,
        search_snippets=snippets,
        serper_payload=json.dumps(search_payload, ensure_ascii=False),
        llama_run=None,
        gpt_run=None,
        fallback_reason=reason,
    )


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
    serper_api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
) -> PipelineResult:
    if not email or not EMAIL_REGEX.match(email):
        raise ProspectResearchError("A valid email address is required")

    try:
        search_payload = _serper_search(email, api_key=serper_api_key, session=session)
    except TypeError:
        # Compatibility shim for existing monkeypatched stubs in tests.
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

    service_text = service_context or SERVICE_CONTEXT_DEFAULT

    try:
        groq_client = client or _get_groq_client(api_key=groq_api_key)
    except ProspectResearchError as exc:
        fallback_line = _compose_simple_line(snippets, service_text)
        return _fallback_result(
            line=fallback_line,
            search_payload=search_payload,
            snippets=snippets,
            reason=str(exc),
        )

    llama_run = _run_llama(snippets, groq_client)
    extraction_json = llama_run.raw_output

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


def run_pipeline_for_emails(
    emails: list[str],
    *,
    service_context: Optional[str] = None,
    serper_api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
    session: Optional[requests.Session] = None,
    client: Optional[Groq] = None,
    emit_logs: bool = False,
) -> BatchRun:
    """Process a batch of emails using the Groq + SERPER pipeline.

    This mirrors the example script flow supplied by power users by tracking
    aggregate cost, token, and timing statistics while optionally streaming
    detailed logs to stdout.
    """

    start_wall = time.time()
    items: list[ProspectBatchItem] = []
    total_input = 0
    total_output = 0
    total_cost = Decimal("0")
    total_model_time = 0.0

    for email in emails:
        if emit_logs:
            print("\n" + "=" * 80)
            print("Processing:", email)

        item_start = time.time()
        try:
            result = generate_opener_from_email(
                email,
                service_context=service_context,
                session=session,
                client=client,
                serper_api_key=serper_api_key,
                groq_api_key=groq_api_key,
            )
            error = None
        except ProspectResearchError as exc:
            result = None
            error = str(exc)

        elapsed = round(time.time() - item_start, 3)
        item = ProspectBatchItem(
            email=email,
            result=result,
            error=error,
            elapsed_seconds=elapsed,
        )
        items.append(item)

        if result is not None:
            total_input += result.total_input_tokens
            total_output += result.total_output_tokens
            total_model_time += result.total_elapsed
            total_cost += Decimal(str(result.total_cost))

        if emit_logs:
            if error:
                print("Error:", error)
            else:
                llama_cost = result.llama_run.cost_usd if result.llama_run else 0.0
                gpt_cost = result.gpt_run.cost_usd if result.gpt_run else 0.0
                snippets_preview = (result.search_snippets or "")[:400]
                if snippets_preview:
                    print("Search snippets preview:", snippets_preview)
                print("Opening line:", result.line)
                print(f"Time: {result.total_elapsed:.3f}s")
                print(
                    "Tokens → input: "
                    f"{result.total_input_tokens}, output: {result.total_output_tokens}"
                )
                print(
                    "Cost breakdown → "
                    f"Llama8B ${llama_cost:.6f}, GPT120B ${gpt_cost:.6f}"
                )
                print(
                    "Total email cost: $"
                    f"{_round_money(Decimal(str(result.total_cost))):.6f}"
                )
            print(f"Overall email wall time: {elapsed:.3f}s")

    total_elapsed = round(time.time() - start_wall, 4)

    if emit_logs:
        print("\n" + "=" * 80)
        print("GRAND TOTALS")
        print(f"Total time (s): {total_model_time:.3f}")
        print(f"Total input tokens: {total_input}")
        print(f"Total output tokens: {total_output}")
        print(f"Total cost (USD): ${_round_money(total_cost):.6f}")
        print(f"Overall script time (s): {total_elapsed:.4f} seconds")

    return BatchRun(
        items=items,
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        total_cost_usd=_round_money(total_cost),
        total_model_time_seconds=round(total_model_time, 3),
        overall_elapsed_seconds=total_elapsed,
    )

