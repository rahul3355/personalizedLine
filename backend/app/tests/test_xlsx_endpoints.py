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

    def insert(self, payload):
        self._payload = payload
        return self

    def execute(self):
        if self.name == "jobs" and self._payload is not None:
            job = dict(self._payload)
            job.setdefault("id", "job-123")
            self.supabase.inserted_jobs.append(job)
            return SimpleNamespace(data=[job])
        return SimpleNamespace(data=[])


class DummySupabase:
    def __init__(self):
        self.storage = DummyStorage()
        self.inserted_jobs = []

    def table(self, name):
        return DummyTable(name, self)


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
    return supabase


def test_parse_headers_with_xlsx(client, patch_streaming):
    response = client.post(
        "/parse_headers",
        json={"file_path": "user-123/uploads/data.xlsx"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["headers"] == ["company", "title"]


def test_create_job_with_xlsx_counts_rows(client, patch_streaming):
    payload = {
        "file_path": "user-123/uploads/data.xlsx",
        "company_col": "company",
        "desc_col": "title",
        "industry_col": "company",
        "title_col": "title",
        "size_col": "company",
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
