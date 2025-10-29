import csv
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.append(str(Path(__file__).resolve().parents[3]))

from backend.app import gpt_helpers, jobs


class DummyResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("HTTP error")

    def json(self):
        return self._payload


@pytest.fixture
def sif_research_payload():
    return json.dumps(
        {
            "person": {
                "name": "Alex Example",
                "info": [
                    "Oversees GTM strategy at ExampleCo.",
                    "Recently launched an AI-powered onboarding flow.",
                ],
            },
            "company": {
                "name": "ExampleCo",
                "info": [
                    "Scaling customer success coverage across new regions.",
                    "Investing in automation to cut onboarding time.",
                ],
                "moat": "Owns proprietary implementation benchmarks.",
            },
        }
    )


def test_generate_sif_personalized_line_success(monkeypatch, sif_research_payload):
    monkeypatch.setenv("GROQ_API_KEY", "test-groq")

    captured = {}

    def fake_post(url, *_, **kwargs):
        captured["url"] = url
        captured["payload"] = kwargs["json"]
        return DummyResponse({"choices": [{"message": {"content": "Hook line."}}]})

    monkeypatch.setattr(gpt_helpers.requests, "post", fake_post)

    result = gpt_helpers.generate_sif_personalized_line(
        sif_research_payload, "Service: onboarding accelerators"
    )

    assert result == "Hook line."
    assert captured["url"] == gpt_helpers.GROQ_CHAT_ENDPOINT
    assert captured["payload"]["model"] == gpt_helpers.GROQ_SIF_MODEL
    expected_research = sif_research_payload.strip()
    expected_user_prompt = (
        f"{gpt_helpers.SIF_SYSTEM_PROMPT}\n\n"
        f"Person info:\n{expected_research}\n\n"
        "Service context:\nService: onboarding accelerators"
    )
    assert captured["payload"]["messages"] == [
        {"role": "user", "content": expected_user_prompt},
    ]
    assert captured["payload"]["temperature"] == 0.6
    assert captured["payload"]["top_p"] == 0.95
    assert captured["payload"]["max_completion_tokens"] == 3000


def test_generate_sif_personalized_line_includes_research_block(
    monkeypatch, sif_research_payload
):
    monkeypatch.setenv("GROQ_API_KEY", "test-groq")

    captured = {}

    def fake_post(url, *_, **kwargs):
        captured["payload"] = kwargs["json"]
        return DummyResponse({"choices": [{"message": {"content": "Hook line."}}]})

    monkeypatch.setattr(gpt_helpers.requests, "post", fake_post)

    gpt_helpers.generate_sif_personalized_line(
        sif_research_payload, "Service: onboarding accelerators"
    )

    messages = captured["payload"]["messages"]
    assert len(messages) == 1
    user_message = messages[0]["content"]
    expected_research = sif_research_payload.strip()
    assert user_message.startswith(gpt_helpers.SIF_SYSTEM_PROMPT)
    assert "\n\nPerson info:\n" in user_message
    assert expected_research in user_message
    assert "Keep every sentence short (25 words or fewer) and easy to read." in user_message
    assert (
        "the message directly references how our service context relates to that pain" in user_message
    )
    assert user_message.endswith("Service context:\nService: onboarding accelerators")


def test_generate_sif_personalized_line_missing_key(monkeypatch, sif_research_payload):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    result = gpt_helpers.generate_sif_personalized_line(
        sif_research_payload, "Service: onboarding accelerators"
    )

    assert result == "SIF personalized line unavailable: missing Groq API key."


def test_generate_sif_personalized_line_invalid_payload(monkeypatch, sif_research_payload):
    monkeypatch.setenv("GROQ_API_KEY", "test-groq")

    def fake_post(*_, **__):
        return DummyResponse(["unexpected"])

    monkeypatch.setattr(gpt_helpers.requests, "post", fake_post)

    result = gpt_helpers.generate_sif_personalized_line(
        sif_research_payload, "Service: onboarding accelerators"
    )

    assert result == "SIF personalized line unavailable: failed to generate personalization."


def test_process_subjob_header_order(monkeypatch, tmp_path, sif_research_payload):
    monkeypatch.setenv("GROQ_API_KEY", "test-groq")

    # Stub Supabase interactions to no-op responses.
    class TableStub:
        def select(self, *_, **__):
            return self

        def eq(self, *_, **__):
            return self

        def order(self, *_, **__):
            return self

        def limit(self, *_, **__):
            return self

        def insert(self, *_, **__):
            return self

        def update(self, *_, **__):
            return self

        def execute(self):
            return SimpleNamespace(data=[], error=None)

    class SupabaseStub:
        def table(self, *_):
            return TableStub()

        class Storage:
            def from_(self, *_):
                return self

            def upload(self, *_):
                return SimpleNamespace(status_code=200, json=lambda: {})

            def download(self, *_):
                return b""

            def remove(self, *_):
                return None

        def __init__(self):
            self.storage = SupabaseStub.Storage()

    monkeypatch.setattr(jobs, "supabase", SupabaseStub())
    monkeypatch.setattr(jobs, "_upload_to_storage", lambda *_, **__: None)
    monkeypatch.setattr(jobs, "_remove_from_storage", lambda *_, **__: None)
    monkeypatch.setattr(jobs, "_update_job_progress", lambda *_, **__: (0, None))
    monkeypatch.setattr(jobs, "get_current_job", lambda: None)
    monkeypatch.setattr(jobs, "record_time", lambda *_, **__: 0.0)
    monkeypatch.setattr(jobs, "perform_research", lambda *_: sif_research_payload)
    def fake_post(url, *_, **__):
        return DummyResponse({"choices": [{"message": {"content": "SIF hook."}}]})

    monkeypatch.setattr(gpt_helpers.requests, "post", fake_post)
    monkeypatch.setattr(jobs, "generate_sif_personalized_line", gpt_helpers.generate_sif_personalized_line)

    # Redirect chunk storage into the pytest temp directory.
    raw_dir = tmp_path / "raw_chunks"
    raw_dir.mkdir()
    monkeypatch.setattr(jobs, "RAW_CHUNK_BASE_DIR", str(raw_dir))

    real_join = jobs.os.path.join

    def patched_join(first, *rest):
        if first == "/data/chunks":
            return real_join(str(tmp_path / "chunks"), *rest)
        return real_join(first, *rest)

    monkeypatch.setattr(jobs.os.path, "join", patched_join)

    job_id = "job-123"
    chunk_id = 1
    chunk_path = jobs._chunk_raw_local_path(job_id, chunk_id)
    with open(chunk_path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["company", "email"])
        writer.writerow(["ExampleCo", "alex@example.com"])

    storage_path = jobs.process_subjob(
        job_id,
        chunk_id,
        "ignored.csv",
        {"email_col": "email", "service": "Service: onboarding accelerators"},
        "user-1",
        total_rows=1,
    )

    assert storage_path == "user-1/job-123/chunk_1.csv"

    out_dir = real_join(str(tmp_path / "chunks"), job_id)
    out_file = real_join(out_dir, "chunk_1.csv")

    with open(out_file, newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        headers = next(reader)
        row = next(reader)

    assert headers[-2:] == ["sif_research", "sif_personalized"]
    assert row[-2:] == [sif_research_payload, "SIF hook."]
