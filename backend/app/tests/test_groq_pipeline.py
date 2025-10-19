import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.append(str(Path(__file__).resolve().parents[3]))


class _StubTokenizer:
    def encode(self, text: str):
        return text.split()


class _StubTiktoken:
    def encoding_for_model(self, model_name: str):
        return _StubTokenizer()

    def get_encoding(self, name: str):
        return _StubTokenizer()


sys.modules["tiktoken"] = _StubTiktoken()

from backend.app import groq_pipeline


class _DummyResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self._payload


class _DummySession:
    def __init__(self):
        self.requests = []

    def post(self, url, *, headers=None, json=None, timeout=None):
        self.requests.append({"headers": headers, "json": json, "url": url, "timeout": timeout})
        return _DummyResponse({"organic": []})


def test_serper_search_uses_latest_env(monkeypatch):
    session = _DummySession()

    monkeypatch.setenv("SERPER_API_KEY", "first-key")
    groq_pipeline._serper_search("alice@example.com", session=session)
    assert session.requests[-1]["headers"]["X-API-KEY"] == "first-key"

    monkeypatch.setenv("SERPER_API_KEY", "second-key")
    groq_pipeline._serper_search("bob@example.com", session=session)
    assert session.requests[-1]["headers"]["X-API-KEY"] == "second-key"

    monkeypatch.delenv("SERPER_API_KEY", raising=False)
    with pytest.raises(groq_pipeline.ProspectResearchError) as excinfo:
        groq_pipeline._serper_search("carol@example.com", session=session)
    assert "SERPER_API_KEY is not configured" in str(excinfo.value)


def test_get_groq_client_uses_latest_env(monkeypatch):
    class DummyGroq:
        def __init__(self, api_key):
            self.api_key = api_key

    monkeypatch.setattr(groq_pipeline, "Groq", DummyGroq)

    monkeypatch.setenv("GROQ_API_KEY", "alpha")
    client = groq_pipeline._get_groq_client()
    assert isinstance(client, DummyGroq)
    assert client.api_key == "alpha"

    monkeypatch.setenv("GROQ_API_KEY", "beta")
    client = groq_pipeline._get_groq_client()
    assert client.api_key == "beta"

    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(groq_pipeline.ProspectResearchError) as excinfo:
        groq_pipeline._get_groq_client()
    assert "GROQ_API_KEY is not configured" in str(excinfo.value)


def test_generate_opener_with_env_keys(monkeypatch):
    monkeypatch.setenv("SERPER_API_KEY", "serper-key")
    monkeypatch.setenv("GROQ_API_KEY", "groq-key")

    def fake_serper_search(email: str, session=None):
        return [
            {
                "organic": [
                    {
                        "title": "Profile for Alice",
                        "snippet": "Alice leads AI outreach at Example Corp.",
                    }
                ]
            }
        ]

    class DummyCompletions:
        def __init__(self, responses):
            self._responses = list(responses)

        def create(self, **kwargs):
            content = self._responses.pop(0)
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
            )

    class DummyGroq:
        def __init__(self, api_key):
            self.api_key = api_key
            self.chat = SimpleNamespace(
                completions=DummyCompletions(
                    [
                        json.dumps(
                            {
                                "person": {
                                    "name": "Alice Example",
                                    "info": "Alice runs growth at Example Corp."
                                    " She cares about personalization.",
                                },
                                "company": {
                                    "name": "Example Corp",
                                    "info": "Example builds outreach tools."
                                    " They focus on AI.",
                                },
                            }
                        ),
                        "Here's a tailored opener about Example Corp's outreach work.",
                    ]
                )
            )

    monkeypatch.setattr(groq_pipeline, "Groq", DummyGroq)
    monkeypatch.setattr(groq_pipeline, "_serper_search", fake_serper_search)

    result = groq_pipeline.generate_opener_from_email("alice@example.com")

    assert result.line == "Here's a tailored opener about Example Corp's outreach work."
    assert result.fallback_reason is None
    assert result.llama_run is not None
    assert result.gpt_run is not None


def test_generate_opener_missing_serper_key(monkeypatch):
    monkeypatch.delenv("SERPER_API_KEY", raising=False)

    with pytest.raises(groq_pipeline.ProspectResearchError) as excinfo:
        groq_pipeline.generate_opener_from_email("alice@example.com")

    assert "SERPER_API_KEY is not configured" in str(excinfo.value)
