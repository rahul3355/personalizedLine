import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import sys

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

sys.path.append(str(Path(__file__).resolve().parents[3]))
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
)

from backend.app.main import AuthenticatedUser, get_current_user, jwt


def _make_token(
    secret: str,
    expires_in: timedelta,
    overrides: Optional[Dict[str, Any]] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "user-123",
        "iss": "https://project.supabase.co/auth/v1",
        "aud": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + expires_in).timestamp()),
    }
    if overrides:
        payload.update(overrides)
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture(autouse=True)
def configure_env(monkeypatch):
    secret = "super-secret"
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_JWT_AUD", "authenticated")
    monkeypatch.delenv("SUPABASE_JWT_ISS", raising=False)
    yield secret


def test_get_current_user_accepts_valid_token(configure_env):
    secret = configure_env
    token = _make_token(secret, expires_in=timedelta(minutes=5))

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    current_user = get_current_user(credentials)

    assert isinstance(current_user, AuthenticatedUser)
    assert current_user.user_id == "user-123"
    assert current_user.claims["aud"] == "authenticated"


def test_get_current_user_rejects_expired_token(configure_env):
    secret = configure_env
    token = _make_token(secret, expires_in=timedelta(minutes=-5))
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc:
        get_current_user(credentials)

    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


def test_get_current_user_rejects_tampered_signature(configure_env):
    secret = configure_env
    valid_token = _make_token(secret, expires_in=timedelta(minutes=5))
    tampered_token = valid_token[:-1] + ("A" if valid_token[-1] != "A" else "B")
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=tampered_token)

    with pytest.raises(HTTPException) as exc:
        get_current_user(credentials)

    assert exc.value.status_code == 401
    assert "invalid token" in exc.value.detail.lower()
