import json
import sys
import textwrap
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
    structured_json = textwrap.dedent(
        """
        {
          "person": {
            "name": "Alice Example",
            "info": [
              "Runs enterprise marketing at Example Corp.",
              "Previously led demand gen at Beta Systems."
            ]
          },
          "company": {
            "name": "Example Corp",
            "info": [
              "Scaling a partner ecosystem with regional specialists.",
              "Investing in AI-assisted onboarding for faster time-to-value."
            ],
            "moat": "Owns proprietary data across 40 integrations."
          }
        }
        """
    ).strip()

    _stub_research_calls(monkeypatch, structured_json)

    result = research.perform_research("alice@example.com")

    assert result == structured_json

    input_headers = ["email", "sif_personalized", "sif_research", "personalized_line"]
    row = {"email": "alice@example.com"}
    normalized_row = {
        header: row.get(header, "")
        for header in input_headers
        if header not in {"personalized_line", "sif_research", "sif_personalized"}
    }
    normalized_row["sif_research"] = result

    assert normalized_row["sif_research"] == structured_json


def test_perform_research_invalid_json(monkeypatch):
    malformed_payload = textwrap.dedent(
        """
        {
          "person": {
            "name": "Bob Example",
            "info": [
              "Heads RevOps at Example Corp.",
              "Previously managed global enablement at Gamma."
            ]
          },
          "company": {
            "name": "Example Corp",
            "info": [
              "Offers a unified analytics platform for marketing teams.",
              "Recently launched an AI assistant for campaign planning."
            ]
          }
        }
        """
    ).strip()

    _stub_research_calls(monkeypatch, malformed_payload)

    result = research.perform_research("bob@example.com")

    assert result == "Research unavailable: Groq returned malformed JSON."
