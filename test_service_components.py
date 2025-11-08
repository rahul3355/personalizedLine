"""Test script to verify service components handling."""

import json
import os
import sys
from unittest.mock import MagicMock, patch


# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from backend.app.gpt_helpers import generate_full_email_body


# Test research components (sample from your data)
RESEARCH_COMPONENTS = json.dumps(
    {
        "prospect_info": {
            "name": "David Rowlinson",
            "title": "Co-Founder",
            "company": "My Kind of Cruise",
            "recent_activity": [
                "Cruising has been my passion for 30+ years",
                "Book your next cruise in 90 seconds",
                "Co-founder of the worlds first cruise app",
            ],
            "relevance_signals": [
                "30+ years of experience in travel and tourism",
            ],
        }
    }
)


def test_prompt_excludes_fallback_when_disabled():
    """The Groq prompt should omit fallback instructions when not requested."""

    service_components_no_fallback = json.dumps(
        {
            "core_offer": "AI-powered personalized email outreach at scale",
            "key_differentiator": "Researches prospect data in depth, writes human-sounding emails",
            "cta": "Demo invitation",
            "include_fallback": False,
        }
    )

    fake_response = MagicMock()
    fake_response.raise_for_status.return_value = None
    fake_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": "Generated email body",
                }
            }
        ]
    }

    with patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}, clear=False):
        with patch(
            "backend.app.gpt_helpers.requests.post", return_value=fake_response
        ) as mock_post:
            result = generate_full_email_body(
                RESEARCH_COMPONENTS, service_components_no_fallback
            )

    assert result == "Generated email body"

    prompt = mock_post.call_args.kwargs["json"]["messages"][0]["content"]

    assert "- Always include forward option" not in prompt
    assert "Call-to-action and forward option" not in prompt
    assert "\"fallback_action\"" not in prompt


def _run_manual_tests():
    """Run the legacy print-based checks when executed as a script."""

    print("=" * 80)
    print("TEST 1: Structured Service Components (NEW FORMAT)")
    print("=" * 80)

    service_components_structured = json.dumps(
        {
            "core_offer": "AI-powered personalized email outreach at scale",
            "key_differentiator": "Researches prospect data in depth, writes human-sounding emails",
            "cta": "Demo invitation",
            "include_fallback": True,
        }
    )

    print("\n📧 SERVICE COMPONENTS (Structured):")
    print(service_components_structured)

    email_body = generate_full_email_body(RESEARCH_COMPONENTS, service_components_structured)

    print("\n✉️  GENERATED EMAIL:")
    print(email_body)
    print("\n")

    print("=" * 80)
    print("TEST 1B: Structured Service Components without Fallback")
    print("=" * 80)

    service_components_no_fallback = json.dumps(
        {
            "core_offer": "AI-powered personalized email outreach at scale",
            "key_differentiator": "Researches prospect data in depth, writes human-sounding emails",
            "cta": "Demo invitation",
            "include_fallback": False,
        }
    )

    print("\n📧 SERVICE COMPONENTS (Structured, No Fallback):")
    print(service_components_no_fallback)

    email_body_no_fallback = generate_full_email_body(
        RESEARCH_COMPONENTS, service_components_no_fallback
    )

    print("\n✉️  GENERATED EMAIL:")
    print(email_body_no_fallback)
    print("\n")

    print("=" * 80)
    print("TEST 2: Plain String Service (LEGACY FORMAT)")
    print("=" * 80)

    service_plain = "AI-powered email outreach service"

    print("\n📧 SERVICE COMPONENTS (Plain String):")
    print(service_plain)

    email_body_legacy = generate_full_email_body(RESEARCH_COMPONENTS, service_plain)

    print("\n✉️  GENERATED EMAIL:")
    print(email_body_legacy)
    print("\n")

    print("=" * 80)
    print("✅ Tests completed!")
    print("=" * 80)


if __name__ == "__main__":
    _run_manual_tests()
