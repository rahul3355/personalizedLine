"""Utilities for generating personalized cold-email openers.

This module contains a direct adaptation of the experimental
``e-o8.integrated.py`` script shared by the user.  It exposes the same
prompt construction, enrichment, and retry logic as reusable functions so it
can be imported by the rest of the backend instead of relying on
``gpt_helpers``.

The original script shipped with hard-coded API keys.  Those have been
removed—configuration is now read exclusively from environment variables so
that secrets remain outside the codebase.  See :func:`required_env_vars` for
the full list of variables that must be set.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import textwrap
import time
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlparse

# Optional third-party imports: all calls guard against import failures.
try:  # pragma: no cover - optional dependency
    import requests
except Exception:  # pragma: no cover - graceful fallback when requests missing
    requests = None  # type: ignore

try:  # pragma: no cover - optional dependency
    from groq import Groq
except Exception:  # pragma: no cover - graceful fallback when Groq SDK missing
    Groq = None  # type: ignore

logger = logging.getLogger("personalized_line")


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    """Fetch an environment variable.

    The helper trims whitespace and treats empty values as ``None`` so that we
    can fall back to defaults consistently.
    """

    value = os.getenv(name, default if default is not None else None)
    if value is None:
        return None
    value = value.strip()
    return value or None


def required_env_vars() -> Iterable[str]:
    """Return the list of required environment variables.

    ``DEEPSEEK_API_KEY`` powers outbound calls to DeepSeek and is the only
    strictly mandatory secret.  ``SERVICE_CONTEXT`` determines how the final
    sentence references the user's offer.  If you plan to use SERPer or Groq
    enrichment, supply their API keys as well; otherwise those steps are
    skipped gracefully.
    """

    return ("DEEPSEEK_API_KEY", "SERVICE_CONTEXT")


SERVICE_CONTEXT = _env("SERVICE_CONTEXT", "") or ""
DEEPSEEK_API_KEY = _env("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = _env("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = _env("DEEPSEEK_MODEL", "deepseek-reasoner")

SERPER_API_KEY = _env("SERPER_API_KEY")
SERPER_SEARCH_BASE = _env("SERPER_SEARCH_BASE", "https://google.serper.dev/search")
SERPER_SCRAPE_BASE = _env("SERPER_SCRAPE_BASE", "https://scrape.serper.dev/")
SERPER_NEWS_BASE = _env("SERPER_NEWS_BASE", "https://google.serper.dev/news")

GROQ_API_KEY = _env("GROQ_API_KEY")
GROQ_MODEL = _env("GROQ_MODEL", "llama-3.1-8b-instant")

REQUEST_TIMEOUT = int(_env("PERSONALIZED_LINE_REQUEST_TIMEOUT", "20") or 20)
PAUSE_BETWEEN_REQUESTS = float(_env("PERSONALIZED_LINE_PAUSE", "0.6") or 0.6)
MAX_SERP_ITEMS = int(_env("PERSONALIZED_LINE_MAX_SERP_ITEMS", "8") or 8)
SCRAPE_MAX_CREDITS = int(_env("PERSONALIZED_LINE_SCRAPE_MAX_CREDITS", "2") or 2)

MIN_WORDS = int(_env("PERSONALIZED_LINE_MIN_WORDS", "25") or 25)
MAX_WORDS = int(_env("PERSONALIZED_LINE_MAX_WORDS", "30") or 30)
MAX_ATTEMPTS = int(_env("PERSONALIZED_LINE_MAX_ATTEMPTS", "3") or 3)

DISALLOWED_HOSTS = {
    h.strip().lower()
    for h in (_env("PERSONALIZED_LINE_DISALLOWED_HOSTS", "linkedin.com,crunchbase.com") or "").split(",")
    if h.strip()
}


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def host_of(url: str) -> str:
    try:
        return urlparse(url).netloc.split(":")[0].lower()
    except Exception:
        return ""


def is_disallowed(url: str) -> bool:
    host = host_of(url)
    if not host:
        return False
    for disallowed in DISALLOWED_HOSTS:
        if host == disallowed or host.endswith("." + disallowed):
            return True
    return False


def _serper_headers() -> Dict[str, str]:
    return {"X-API-KEY": SERPER_API_KEY or "", "Content-Type": "application/json"}


def serper_search(query: str, max_items: int = MAX_SERP_ITEMS) -> Dict[str, Any]:
    if requests is None or not SERPER_API_KEY:
        logger.debug("SERPer search skipped (requests library or API key missing)")
        return {}
    try:
        response = requests.post(
            SERPER_SEARCH_BASE,
            json={"q": query},
            headers=_serper_headers(),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict) and isinstance(data.get("organic"), list):
            data["organic"] = data["organic"][:max_items]
        return data
    except Exception as exc:  # pragma: no cover - network call
        logger.warning("SERPer search failed for '%s': %s", query, exc)
        return {}


def extract_serp(serp: Dict[str, Any]) -> Tuple[List[str], List[str], List[str]]:
    titles: List[str] = []
    snippets: List[str] = []
    links: List[str] = []
    for item in serp.get("organic") or []:
        titles.append(item.get("title", "") or "")
        snippets.append(item.get("snippet", "") or "")
        link = item.get("link") or item.get("url") or ""
        if link and link not in links:
            links.append(link)
    return titles, snippets, links


def serper_scrape(url: str) -> str:
    if requests is None or not SERPER_API_KEY:
        return ""
    payload = {"url": url, "maxCredits": SCRAPE_MAX_CREDITS}
    try:
        response = requests.post(
            SERPER_SCRAPE_BASE,
            json=payload,
            headers=_serper_headers(),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        try:
            data = response.json()
        except ValueError:
            return (response.text or "")[:150_000]
        if isinstance(data, dict):
            for key in ("content", "text", "rendered", "body", "html"):
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    return value[:150_000]
            for value in data.values():
                if isinstance(value, str) and len(value) > 80:
                    return value[:150_000]
            return json.dumps(data)[:150_000]
        if isinstance(data, list):
            return "\n\n".join(map(str, data))[:150_000]
        return ""
    except Exception as exc:  # pragma: no cover - network call
        logger.debug("SERPer scrape failed %s: %s", url, exc)
        return ""


def groq_client() -> Any:
    if Groq is None or not GROQ_API_KEY:
        return None
    return Groq(api_key=GROQ_API_KEY)


def call_groq(client: Any, prompt: str) -> str:
    if client is None:
        return ""
    try:
        resp = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            return resp.choices[0].message.content.strip()
        except Exception:
            try:
                return resp.choices[0].text.strip()
            except Exception:
                return ""
    except Exception as exc:  # pragma: no cover - network call
        logger.debug("Groq completion failed: %s", exc)
        return ""


# ---------------------------------------------------------------------------
# Enrichment helpers (person, company, news)
# ---------------------------------------------------------------------------

def enrich_person(local: str, domain: str, gc: Any) -> Dict[str, Any]:
    query = f"{local} {domain}"
    serp = serper_search(query)
    titles, snippets, links = extract_serp(serp)
    scraped_text = ""
    scraped_url = ""
    for url in links:
        if is_disallowed(url):
            continue
        scraped_text = serper_scrape(url)
        scraped_url = url
        if scraped_text:
            break
        time.sleep(PAUSE_BETWEEN_REQUESTS)
    parts: List[str] = []
    if titles:
        parts.append("SERP TITLES:\n" + "\n".join(titles))
    if snippets:
        parts.append("SERP SNIPPETS:\n" + "\n".join(snippets))
    if scraped_text:
        parts.append(f"PAGE ({scraped_url}):\n" + scraped_text)
    blob = ("\n\n---\n\n".join(parts))[:140_000]
    summary = ""
    if blob and gc is not None:
        summary = call_groq(gc, "Summarize this person in ~6 short sentences:\n\n" + blob)
    scraped: List[Dict[str, str]] = []
    if scraped_text:
        scraped.append({"url": scraped_url, "text_snippet": scraped_text[:400]})
    return {
        "titles": titles,
        "snippets": snippets,
        "scraped": scraped,
        "summary": summary,
    }


def enrich_company(domain: str, gc: Any) -> Dict[str, Any]:
    query = f"{domain} company profile"
    serp = serper_search(query)
    titles, snippets, links = extract_serp(serp)
    root = f"https://{domain}"
    candidates = [root] + [link for link in links if link != root]
    scraped_items: List[Dict[str, str]] = []
    for url in candidates:
        if len(scraped_items) >= 3:
            break
        if is_disallowed(url):
            continue
        text = serper_scrape(url)
        if text:
            scraped_items.append({"url": url, "text_snippet": text[:400]})
        time.sleep(PAUSE_BETWEEN_REQUESTS)
    parts: List[str] = []
    if titles:
        parts.append("SERP TITLES:\n" + "\n".join(titles))
    if snippets:
        parts.append("SERP SNIPPETS:\n" + "\n".join(snippets))
    for scraped in scraped_items:
        parts.append(f"PAGE ({scraped['url']}):\n" + (scraped.get("text_snippet") or ""))
    blob = ("\n\n---\n\n".join(parts))[:140_000]
    summary = ""
    if blob and gc is not None:
        summary = call_groq(gc, "Summarize this company in 2-4 sentences:\n\n" + blob)
    return {
        "titles": titles,
        "snippets": snippets,
        "scraped": scraped_items,
        "summary": summary,
    }


def enrich_news(domain: str, gc: Any) -> Dict[str, Any]:
    if requests is None or not SERPER_API_KEY:
        return {"items": [], "summary": ""}
    try:
        response = requests.post(
            SERPER_NEWS_BASE,
            json={"q": domain},
            headers=_serper_headers(),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except Exception:  # pragma: no cover - network call
        data = {}
    items: List[Dict[str, str]] = []
    for entry in (data.get("news") or []):
        title = entry.get("title", "").strip()
        snippet = entry.get("snippet", "").strip()
        date = entry.get("date", "")
        source = entry.get("source", "")
        if title or snippet:
            items.append({"title": title, "snippet": snippet, "date": date, "source": source})
    summary = ""
    if items and gc is not None:
        summary = call_groq(gc, "Summarize these news items succinctly:\n\n" + json.dumps(items))
    return {"items": items, "summary": summary}


# ---------------------------------------------------------------------------
# Prompt construction & DeepSeek calls
# ---------------------------------------------------------------------------

DEEPSEEK_PROMPT_TEMPLATE = textwrap.dedent(
    """\
Service Context: {service_context}

Input — use only facts in these three blocks (do not invent):
PERSONAL SUMMARY:
{personal_summary}

COMPANY SUMMARY:
{company_summary}

NEWS SUMMARY:
{news_summary}

Task — produce exactly one single-sentence cold-email opener that meets all of the following:
1. Human-written and conversational (not a headline or press-speak).
2. Grounded in a concrete fact from NEWS_SUMMARY or COMPANY_SUMMARY (you may repeat the news title/source phrase exactly). If NEWS_SUMMARY is non-empty, prioritize referencing one clear news fact and show how that fact creates the pain described below; otherwise ground the sentence in COMPANY_SUMMARY.
3. Begins with an insight, observation, or concrete outcome (do NOT start with the person’s name or a greeting).
4. Explicitly ties to a real company pain our service solves (choose one: procurement complexity, compliance review burden, slow executive alignment, stalled pilots/RFIs, or missed priority pipeline). Use specific, measurable pain language (e.g., “procurement delays,” “extended compliance reviews,” “stalled pilots,” “lost RFIs”), not vague superlatives.
5. Does NOT ask a question, does NOT pitch, contains no CTA, and contains no pricing or product jargon.
6. Uses between {min_words} and {max_words} words inclusive. Count words strictly; produce exactly one sentence.
7. Avoid marketing hyperbole (no “unprecedented,” “industry-leading,” “game-changing,” etc.). Prefer concrete consequence language and a clear link between the news/fact and the pain.
8. Output only the single sentence and nothing else.
9. Do NOT include the literal phrase "Using the Service Context,". Instead, include one short clause in the sentence that reproduces at least **three consecutive words** verbatim from the Service Context block above, showing how the named pain is addressed. Output only the single sentence and nothing else.

"""
)


def build_deepseek_prompt(service_context: str, personal: str, company: str, news: str) -> str:
    return DEEPSEEK_PROMPT_TEMPLATE.format(
        service_context=service_context,
        personal_summary=personal or "<no personal summary>",
        company_summary=company or "<no company summary>",
        news_summary=news or "<no news>",
        min_words=str(MIN_WORDS),
        max_words=str(MAX_WORDS),
    )


def _openai_client() -> Any:
    try:
        from openai import OpenAI
    except Exception as exc:  # pragma: no cover - openai import failure
        logger.exception("Failed to import openai client: %s", exc)
        raise
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY must be set before calling DeepSeek")
    return OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)


def call_deepseek(prompt: str, temperature: float = 0.0, max_tokens: int = 10_000) -> Tuple[str, Any]:
    messages = [
        {"role": "system", "content": "You are an expert outreach copywriter."},
        {"role": "user", "content": prompt},
    ]
    client = _openai_client()
    start = time.time()
    response = None
    output_text = ""
    try:
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        elapsed = time.time() - start
        logger.info("DeepSeek call elapsed=%.2fs", elapsed)
        try:
            output_text = (response.choices[0].message.content or "").strip()
        except Exception:
            try:
                output_text = (response.choices[0].text or "").strip()
            except Exception:
                output_text = ""
        try:
            response_dict = dict(response)
            logger.debug("DeepSeek response keys: %s", list(response_dict.keys()))
            if "id" in response_dict:
                logger.debug("DeepSeek response id: %s", response_dict.get("id"))
        except Exception:
            logger.debug("DeepSeek raw repr (truncated): %s", repr(response)[:1000])
        logger.debug("DeepSeek returned %d chars", len(output_text or ""))
        return output_text, response
    except Exception as exc:
        elapsed = time.time() - start
        logger.exception("DeepSeek call failed after %.2fs: %s", elapsed, exc)
        return "", response


def sanitize_single_line(text: str) -> str:
    if not text:
        return ""
    squashed = " ".join(text.strip().split())
    for line in squashed.splitlines():
        if line.strip():
            squashed = line.strip()
            break
    if len(squashed) >= 2 and (
        (squashed[0] == '"' and squashed[-1] == '"')
        or (squashed[0] == "'" and squashed[-1] == "'")
    ):
        squashed = squashed[1:-1].strip()
    return squashed


def count_words(value: str) -> int:
    if not value:
        return 0
    return len([word for word in value.split() if word.strip()])


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def obtain_and_generate(
    email: str,
    dry_run: bool = False,
    debug: bool = False,
    *,
    service_context: Optional[str] = None,
    emit_stdout: bool = True,
    emit_diagnostics: bool = True,
) -> Tuple[int, Optional[str]]:
    if debug:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)

    if "@" not in email:
        logger.error("Invalid email supplied: %s", email)
        return 2, None

    local, domain = email.split("@", 1)
    local = local.strip()
    domain = domain.strip().lower()

    gc = groq_client()

    person = enrich_person(local, domain, gc)
    company = enrich_company(domain, gc)
    news = enrich_news(domain, gc)

    personal_summary = person.get("summary") or ""
    company_summary = company.get("summary") or ""
    news_summary = news.get("summary") or ""

    if emit_diagnostics:
        print("\n=== PERSONAL SUMMARY ===", file=sys.stderr)
        print(personal_summary or "<none>", file=sys.stderr)
        print("\n=== COMPANY SUMMARY ===", file=sys.stderr)
        print(company_summary or "<none>", file=sys.stderr)
        print("\n=== NEWS SUMMARY ===", file=sys.stderr)
        print(news_summary or "<none>", file=sys.stderr)
        print("", file=sys.stderr)

    context = service_context or SERVICE_CONTEXT
    prompt = build_deepseek_prompt(context, personal_summary, company_summary, news_summary)

    if dry_run:
        if emit_stdout:
            print(prompt)
        return 0, prompt

    last_output = ""
    temperatures = [0.0, 0.18, 0.35][:MAX_ATTEMPTS]
    token_limits = [10_000, 200, 200][:MAX_ATTEMPTS]
    for attempt in range(MAX_ATTEMPTS):
        temp = temperatures[attempt]
        max_tokens = token_limits[attempt]
        logger.info(
            "DeepSeek attempt %d/%d (temp=%.2f max_tokens=%d)",
            attempt + 1,
            MAX_ATTEMPTS,
            temp,
            max_tokens,
        )
        output, raw = call_deepseek(prompt, temperature=temp, max_tokens=max_tokens)
        logger.debug("Raw model output (truncated): %s", (output or "")[:1000])
        output = sanitize_single_line(output)
        last_output = output
        if not output:
            logger.warning("Empty output on attempt %d", attempt + 1)
            continue
        word_count = count_words(output)
        if MIN_WORDS <= word_count <= MAX_WORDS:
            logger.info("Valid output length=%d words", word_count)
            if emit_stdout:
                print(output)
            return 0, output
        logger.warning(
            "Output word count %d outside %d-%d on attempt %d",
            word_count,
            MIN_WORDS,
            MAX_WORDS,
            attempt + 1,
        )

    if last_output:
        logger.warning(
            "Returning last model output despite length mismatch (words=%d)",
            count_words(last_output),
        )
        if emit_stdout:
            print(last_output)
        return 0, last_output
    logger.error("No usable output from model after %d attempts", MAX_ATTEMPTS)
    return 4, None


def generate_personalized_opener(
    email: str,
    *,
    service_context: Optional[str] = None,
    debug: bool = False,
) -> str:
    """Programmatic helper that returns the generated sentence.

    The helper suppresses CLI printing so callers (like the worker) can
    capture the opener directly.  ``service_context`` overrides the module's
    default when provided.
    """

    exit_code, output = obtain_and_generate(
        email,
        dry_run=False,
        debug=debug,
        service_context=service_context,
        emit_stdout=False,
        emit_diagnostics=debug,
    )
    if exit_code != 0 or not output:
        raise RuntimeError(
            f"Failed to generate personalized opener for {email} (exit={exit_code})"
        )
    return output


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def _parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a personalized opener")
    parser.add_argument("--email", "-e", default="a-bohutinsky@tcv.com")
    parser.add_argument("--dry-run", action="store_true", help="Print the DeepSeek prompt without calling the model")
    parser.add_argument("--debug", action="store_true", help="Enable verbose logging")
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> None:
    args = _parse_args(argv)
    exit_code, _ = obtain_and_generate(args.email, dry_run=args.dry_run, debug=args.debug)
    raise SystemExit(exit_code)


if __name__ == "__main__":  # pragma: no cover - CLI convenience
    main()

