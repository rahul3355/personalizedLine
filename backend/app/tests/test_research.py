import json
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[3]))

from backend.app import research


class DummyResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("HTTP error")

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def ensure_keys(monkeypatch):
    monkeypatch.setenv("SERPER_API_KEY", "test-serper")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq")


def _stub_research_calls(monkeypatch, groq_payload):
    serper_payloads = iter(
        [
            {"organic": [{"title": "Result A", "snippet": "Snippet A."}]},
            {"organic": [{"title": "Result B", "snippet": "Snippet B."}]},
        ]
    )

    def fake_post(url, *args, **kwargs):
        if url == research.SERPER_ENDPOINT:
            return DummyResponse(next(serper_payloads))
        if url == research.GROQ_ENDPOINT:
            return DummyResponse({"choices": [{"message": {"content": groq_payload}}]})
        raise AssertionError(f"Unexpected URL: {url}")

    monkeypatch.setattr(research.requests, "post", fake_post)


def test_perform_research_passthrough(monkeypatch):
    structured_payload = {
        "person": {
            "name": "Alice Example",
            "info": [
                "Runs enterprise marketing at Example Corp.",
                "Previously led demand gen at Beta Systems.",
            ],
        },
        "company": {
            "name": "Example Corp",
            "info": [
                "Scaling a partner ecosystem with regional specialists.",
                "Investing in AI-assisted onboarding for faster time-to-value.",
            ],
            "moat": "Owns proprietary data across 40 integrations.",
        },
    }
    structured_json = json.dumps(structured_payload, indent=2)

    _stub_research_calls(monkeypatch, structured_json)

    result = research.perform_research("alice@example.com")

    assert result == structured_json

    input_headers = ["email", "sif_personalized", "sif_research"]
    row = {"email": "alice@example.com"}
    normalized_row = {
        header: row.get(header, "")
        for header in input_headers
        if header not in {"sif_research", "sif_personalized"}
    }
    normalized_row["sif_research"] = result

    assert normalized_row["sif_research"] == structured_json


def test_perform_research_invalid_json(monkeypatch):
    malformed_payload = json.dumps(
        {
            "prospect_info": {
                "name": None,
                "title": "VP of Revenue",
                "company": "Example Corp",
                "recent_activity": ["Heads RevOps at Example Corp."],
            }
        },
        indent=2,
    )

    _stub_research_calls(monkeypatch, malformed_payload)

    # Set max retries to 3 for this test
    monkeypatch.setenv("GROQ_MAX_RETRIES", "3")

    result = research.perform_research("bob@example.com")

    # After retries, the error message includes "after retries"
    assert result == "Research unavailable: Groq returned malformed JSON after retries."


def test_perform_research_strips_person_moat(monkeypatch):
    groq_payload = json.dumps(
        {
            "person": {
                "name": "Carol Example",
                "info": [
                    "Oversees enterprise accounts at Example Corp.",
                    "Champions customer marketing partnerships.",
                ],
                "moat": "Recognized thought leader in enterprise advocacy.",
            },
            "company": {
                "name": "Example Corp",
                "info": [
                    "Recently expanded its analytics platform into APAC.",
                    "Investing in AI-assisted onboarding for partners.",
                ],
                "moat": "Holds exclusive integrations with major CRM vendors.",
            },
        },
        indent=2,
    )

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("carol@example.com")

    expected = json.dumps(
        {
            "person": {
                "name": "Carol Example",
                "info": [
                    "Oversees enterprise accounts at Example Corp.",
                    "Champions customer marketing partnerships.",
                ],
            },
            "company": {
                "name": "Example Corp",
                "info": [
                    "Recently expanded its analytics platform into APAC.",
                    "Investing in AI-assisted onboarding for partners.",
                ],
                "moat": "Holds exclusive integrations with major CRM vendors.",
            },
        },
        indent=2,
    )

    assert result == expected
    assert json.loads(result) == json.loads(expected)


def test_perform_research_adds_missing_company_moat(monkeypatch):
    groq_payload = json.dumps(
        {
            "person": {
                "name": "Dana Example",
                "info": [
                    "Heads product-led growth at Example Corp.",
                    "Launched the self-serve onboarding motion last quarter.",
                ],
            },
            "company": {
                "name": "Example Corp",
                "info": [
                    "Provides an analytics platform for lifecycle marketers.",
                    "Recently partnered with global agencies for co-marketing.",
                ],
            },
        },
        indent=2,
    )

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("dana@example.com")

    expected = json.dumps(
        {
            "person": {
                "name": "Dana Example",
                "info": [
                    "Heads product-led growth at Example Corp.",
                    "Launched the self-serve onboarding motion last quarter.",
                ],
            },
            "company": {
                "name": "Example Corp",
                "info": [
                    "Provides an analytics platform for lifecycle marketers.",
                    "Recently partnered with global agencies for co-marketing.",
                ],
                "moat": "",
            },
        },
        indent=2,
    )

    assert result == expected
    assert json.loads(result) == json.loads(expected)


def test_valid_research_payload_handles_array(monkeypatch):
    """Test that _is_valid_research_payload handles arrays returned by Groq."""
    # Simulate Groq returning an array with multiple objects
    array_payload = json.dumps([
        {
            "prospect_info": {
                "name": "David Rowlinson",
                "title": "Co-Founder",
                "company": "My Kind of Cruise",
                "recent_activity": ["Activity 1", "Activity 2"],
                "relevance_signals": ["Signal 1"]
            }
        },
        {
            "prospect_info": {
                "name": "My Kind of Cruise",
                "title": "Co-Founder",
                "company": "My Kind of Cruise",
                "recent_activity": ["Company Activity"],
                "relevance_signals": ["Company Signal"]
            }
        }
    ])

    is_valid, normalized = research._is_valid_research_payload(array_payload)

    assert is_valid is True
    assert normalized is not None
    assert normalized["prospect_info"]["name"] == "David Rowlinson"
    assert normalized["prospect_info"]["title"] == "Co-Founder"
    assert normalized["prospect_info"]["company"] == "My Kind of Cruise"


def test_is_valid_research_payload_accepts_prospect_info_schema():
    payload = {
        "prospect_info": {
            "name": "Evan Example",
            "title": "Head of Enablement",
            "company": "Example Corp",
            "recent_activity": ["Launched a new onboarding track"],
            "relevance_signals": ["Hiring RevOps leaders"],
        }
    }

    is_valid, normalized = research._is_valid_research_payload(json.dumps(payload))

    assert is_valid is True
    assert normalized == payload


def test_is_valid_research_payload_coerces_string_lists():
    payload = {
        "prospect_info": {
            "name": "Frankie Example",
            "title": "VP Marketing",
            "company": "Acme Co",
            "recent_activity": "Hosted a partner summit",
            "relevance_signals": ["Raised Series C", 123, None, "Expanding to EMEA"],
        }
    }

    is_valid, normalized = research._is_valid_research_payload(json.dumps(payload))

    assert is_valid is True
    assert normalized["prospect_info"]["recent_activity"] == ["Hosted a partner summit"]
    assert normalized["prospect_info"]["relevance_signals"] == [
        "Raised Series C",
        "Expanding to EMEA",
    ]


def test_is_valid_research_payload_defaults_missing_lists():
    payload = {
        "prospect_info": {
            "name": "Grace Example",
            "title": "Founder",
            "company": "Builder Labs",
        }
    }

    is_valid, normalized = research._is_valid_research_payload(json.dumps(payload))

    assert is_valid is True
    assert normalized["prospect_info"]["recent_activity"] == []
    assert normalized["prospect_info"]["relevance_signals"] == []


def test_perform_research_handles_new_schema(monkeypatch):
    groq_payload = json.dumps(
        {
            "prospect_info": {
                "name": "Harper Example",
                "title": "Director of Sales",
                "company": "Northwind",
                "recent_activity": "Opened a new Austin office",
                "relevance_signals": ["Hiring enablement", {"note": "ignore"}, "Adopting PLG"],
            }
        },
        indent=2,
    )

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("harper@example.com")

    assert json.loads(result) == {
        "prospect_info": {
            "name": "Harper Example",
            "title": "Director of Sales",
            "company": "Northwind",
            "recent_activity": ["Opened a new Austin office"],
            "relevance_signals": ["Hiring enablement", "Adopting PLG"],
        }
    }


def test_perform_research_handles_null_title(monkeypatch):
    """Test that null/None title is converted to empty string."""
    groq_payload = json.dumps(
        {
            "prospect_info": {
                "name": "Dutch Digital Systems",
                "title": None,
                "company": "Dutch Digital Systems Limited",
                "recent_activity": ["Heads RevOps at Example Corp."],
                "relevance_signals": ["insurance industry", "software suite"],
            }
        },
        indent=2,
    )

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("info@dutchdigital.systems")

    parsed = json.loads(result)
    assert parsed["prospect_info"]["name"] == "Dutch Digital Systems"
    assert parsed["prospect_info"]["title"] == ""  # null converted to empty string
    assert parsed["prospect_info"]["company"] == "Dutch Digital Systems Limited"
    assert len(parsed["prospect_info"]["recent_activity"]) == 1
    assert len(parsed["prospect_info"]["relevance_signals"]) == 2
