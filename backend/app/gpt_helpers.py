from typing import Optional

from backend.app.personalization_pipeline import PersonalizationResult, run_personalization_pipeline


def _coalesce_text(value: Optional[str]):
    """Return a stripped string representation for prompt fields."""

    if value is None:
        return ""
    return str(value).strip()


def generate_opener(
    company: str = "",
    description: str = "",
    industry: str = "",
    role: str = "",
    size: str = "",
    service: str = "",
    *,
    email: str = "",
) -> tuple[str, int, int, int, PersonalizationResult]:
    """Generate an opener using the Groq-based personalization pipeline."""

    email_value = _coalesce_text(email or company)
    service_value = _coalesce_text(service)

    result = run_personalization_pipeline(email_value, service_value)

    return (
        result.personalized_line,
        result.prompt_tokens,
        result.completion_tokens,
        result.total_tokens,
        result,
    )


def generate_line(title, company, description, offer, persona, channel, max_words):
    """Compatibility wrapper for legacy callers expecting generate_line."""
    service_context = (
        f"Offer: {_coalesce_text(offer)}\n"
        f"Persona: {_coalesce_text(persona)}\n"
        f"Channel: {_coalesce_text(channel)}\n"
        f"Max words: {max_words}\n"
        f"Title: {_coalesce_text(title)}"
    )

    opener, *_ = generate_opener(
        email=_coalesce_text(company) or _coalesce_text(title),
        service=service_context,
    )

    return opener
