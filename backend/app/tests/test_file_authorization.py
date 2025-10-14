import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure project root on path so imports resolve when running in isolation
import sys
sys.path.append(str(Path(__file__).resolve().parents[3]))

os.environ.setdefault("SUPABASE_URL", "https://project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
)
os.environ.setdefault("OPENAI_API_KEY", "test-key")

from backend.app.main import app, AuthenticatedUser, get_current_user  # noqa: E402


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        user_id="user-123",
        claims={}
    )
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client():
    return TestClient(app)


def test_parse_headers_rejects_mismatched_path(client):
    response = client.post("/parse_headers", json={"file_path": "other-user/data.csv"})
    assert response.status_code == 403


def test_create_job_rejects_mismatched_path(client):
    payload = {
        "file_path": "other-user/data.csv",
        "company_col": "company",
        "desc_col": "description",
        "industry_col": "industry",
        "title_col": "title",
        "size_col": "size",
        "email_col": "email",
        "service": "service-name",
    }
    response = client.post("/jobs", json=payload)
    assert response.status_code == 403
