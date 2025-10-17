import os
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

import sys
sys.path.append(str(Path(__file__).resolve().parents[3]))

os.environ.setdefault("SUPABASE_URL", "https://project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
)
os.environ.setdefault("OPENAI_API_KEY", "test-key")

from backend.app import file_streaming as file_streaming_module
from backend.app import main as main_module
from backend.app.main import app, AuthenticatedUser, get_current_user


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id="user-123",
        claims={},
    )
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def xlsx_bytes():
    wb = Workbook()
    ws = wb.active
    ws.append(["company", "title"])
    ws.append(["ACME", "CEO"])
    ws.append(["Globex", "CTO"])
    buffer = BytesIO()
    wb.save(buffer)
    wb.close()
    return buffer.getvalue()


class DummyBucket:
    def __init__(self):
        self.calls = []

    def create_signed_url(self, file_path, expires_in):
        self.calls.append((file_path, expires_in))
        return {"signedURL": "https://example.com/signed"}


class DummyStorage:
    def __init__(self):
        self.bucket = DummyBucket()

    def from_(self, name):
        assert name == "inputs"
        return self.bucket


class DummyTable:
    def __init__(self, name, supabase):
        self.name = name
        self.supabase = supabase
        self._payload = None
        self._filters = {}
        self._single = False
        self._action = None

    def insert(self, payload):
        self._action = "insert"
        self._payload = payload
        return self

    def update(self, payload):
        self._action = "update"
        self._payload = payload
        return self

    def select(self, _columns):
        self._action = "select"
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def limit(self, _value):
        return self

    def single(self):
        self._single = True
        return self

    def execute(self):
        if self.name == "jobs" and self._action == "insert":
            job = dict(self._payload)
            job.setdefault("id", "job-123")
            self.supabase.inserted_jobs.append(job)
            return SimpleNamespace(data=[job])

        if self.name == "profiles":
            user_id = self._filters.get("id")
            profile = self.supabase.profiles.get(user_id)

            if self._action == "select":
                if profile is None:
                    return SimpleNamespace(data=None if self._single else [])
                if self._single:
                    return SimpleNamespace(data=dict(profile))
                return SimpleNamespace(data=[dict(profile)])

            if self._action == "update":
                if profile is None:
                    return SimpleNamespace(data=[])
                expected = self._filters.get("credits_remaining")
                if expected is not None and profile.get("credits_remaining") != expected:
                    return SimpleNamespace(data=[])
                profile.update(self._payload)
                return SimpleNamespace(data=[dict(profile)])

        if self.name == "ledger" and self._action == "insert":
            entry = dict(self._payload)
            self.supabase.ledger_entries.append(entry)
            return SimpleNamespace(data=[entry])

        return SimpleNamespace(data=[])


class DummySupabase:
    def __init__(self):
        self.storage = DummyStorage()
        self.inserted_jobs = []
        self.profiles = {
            "user-123": {
                "credits_remaining": 10,
                "groq_api_key": "test-groq",
                "serper_api_key": "test-serper",
            }
        }
        self.ledger_entries = []

    def table(self, name):
        return DummyTable(name, self)


class DummyRedisLock:
    def __init__(self):
        self._locked = False

    def acquire(self, blocking=True):
        if self._locked:
            return False
        self._locked = True
        return True

    def release(self):
        self._locked = False


class DummyRedis:
    def __init__(self):
        self._locks = {}

    def lock(self, name, timeout=None, blocking_timeout=None):
        if name not in self._locks:
            self._locks[name] = DummyRedisLock()
        return self._locks[name]


class DummyStream:
    status_code = 200

    def __init__(self, data):
        self._data = data

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def aiter_bytes(self, chunk_size):
        yield self._data


class DummyAsyncClient:
    def __init__(self, data, *args, **kwargs):
        self._data = data

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def stream(self, method, url):
        assert method == "GET"
        assert url == "https://example.com/signed"
        return DummyStream(self._data)


@pytest.fixture
def patch_streaming(monkeypatch, xlsx_bytes):
    monkeypatch.setattr(
        file_streaming_module.httpx,
        "AsyncClient",
        lambda *args, **kwargs: DummyAsyncClient(xlsx_bytes, *args, **kwargs),
    )
    supabase = DummySupabase()
    monkeypatch.setattr(main_module, "get_supabase", lambda: supabase)
    monkeypatch.setattr(main_module, "redis_conn", DummyRedis())
    return supabase


def test_parse_headers_with_xlsx(client, patch_streaming):
    response = client.post(
        "/parse_headers",
        json={"file_path": "user-123/uploads/data.xlsx"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["headers"] == ["company", "title"]
    assert data["row_count"] == 2
    assert data["credits_remaining"] == 10
    assert data["has_enough_credits"] is True
    assert data["missing_credits"] == 0


def test_create_job_with_xlsx_counts_rows(client, patch_streaming):
    payload = {
        "file_path": "user-123/uploads/data.xlsx",
        "email_col": "company",
        "service": "standard",
    }
    response = client.post("/jobs", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["rows"] == 2
    supabase = patch_streaming
    assert supabase.inserted_jobs
    assert supabase.inserted_jobs[0]["rows"] == 2
    assert supabase.inserted_jobs[0]["filename"] == "data.xlsx"
    assert supabase.profiles["user-123"]["credits_remaining"] == 8
    assert supabase.inserted_jobs[0]["meta_json"]["credits_deducted"] is True
    assert supabase.inserted_jobs[0]["meta_json"]["credit_cost"] == 2
    assert len(supabase.ledger_entries) == 1
    assert supabase.ledger_entries[0]["change"] == -2
    assert supabase.ledger_entries[0]["reason"].startswith("job deduction:")


def test_create_job_rejects_without_credits(client, patch_streaming):
    patch_streaming.profiles["user-123"]["credits_remaining"] = 1
    payload = {
        "file_path": "user-123/uploads/data.xlsx",
        "email_col": "company",
        "service": "standard",
    }
    response = client.post("/jobs", json=payload)
    assert response.status_code == 402
    data = response.json()["detail"]
    assert data["error"] == "insufficient_credits"
    assert data["row_count"] == 2
    assert data["credits_remaining"] == 1
    assert data["missing_credits"] == 1
