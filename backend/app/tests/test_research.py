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


def _stub_research_calls(monkeypatch, groq_payload: str):
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


def test_perform_research_normalizes_valid_payload(monkeypatch):
    expected_payload = {
        "prospect_info": {
            "name": "Alice Example",
            "title": "Director of Growth",
            "company": "Example Corp",
            "recent_activity": [
                "Presented at the 2024 Customer Success Summit.",
                "Published a case study on AI-driven onboarding.",
            ],
            "relevance_signals": [
                "Evaluating AI personalization tools",
                "Hiring lifecycle marketing managers",
            ],
        }
    }
    groq_payload = """```json\n{\n  \"prospect_info\": {\n    \"name\": \"Alice Example\",\n    \"title\": \"Director of Growth\",\n    \"company\": \"Example Corp\",\n    \"recent_activity\": [\n      \"Presented at the 2024 Customer Success Summit.\",\n      \"Published a case study on AI-driven onboarding.\"\n    ],\n    \"relevance_signals\": [\n      \"Evaluating AI personalization tools\",\n      \"Hiring lifecycle marketing managers\"\n    ]\n  }\n}\n```"""

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("alice@example.com")

    assert json.loads(result) == expected_payload


def test_perform_research_accepts_single_element_array(monkeypatch):
    expected_payload = {
        "prospect_info": {
            "name": "Bob Example",
            "title": "Head of Ops",
            "company": "Example Corp",
            "recent_activity": [],
            "relevance_signals": [],
        }
    }
    groq_payload = json.dumps([expected_payload])

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("bob@example.com")

    assert json.loads(result) == expected_payload


def test_perform_research_rejects_multi_element_array(monkeypatch):
    groq_payload = json.dumps([
        {
            "prospect_info": {
                "name": "Bob Example",
                "title": "Head of Ops",
                "company": "Example Corp",
                "recent_activity": [],
                "relevance_signals": [],
            }
        },
        {
            "prospect_info": {
                "name": "Charlie Example",
                "title": "VP Sales",
                "company": "Another Corp",
                "recent_activity": [],
                "relevance_signals": [],
            }
        }
    ])

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("bob@example.com")

    assert result == research.FALLBACK_MALFORMED_JSON


def test_perform_research_handles_malformed_json(monkeypatch):
    groq_payload = "{\"prospect_info\": {\"name\": \"Carol Example\""

    _stub_research_calls(monkeypatch, groq_payload)

    result = research.perform_research("carol@example.com")

    assert result == research.FALLBACK_MALFORMED_JSON
