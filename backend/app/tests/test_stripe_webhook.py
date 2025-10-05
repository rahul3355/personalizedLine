import json
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
)

sys.path.append(str(Path(__file__).resolve().parents[3]))

from backend.app import main


class FakeResponse:
    def __init__(self, data=None):
        self.data = data


class FakeTable:
    def __init__(self, supabase, name):
        self.supabase = supabase
        self.name = name
        self._action = None
        self._payload = None
        self._filters = {}

    def insert(self, payload):
        self._action = "insert"
        self._payload = payload
        return self

    def update(self, payload):
        self._action = "update"
        self._payload = payload
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def execute(self):
        if self.name == "stripe_webhook_events" and self._action == "insert":
            event_id = self._payload.get("event_id")
            if event_id in self.supabase.processed_events:
                raise APIError(
                    {
                        "message": "duplicate",
                        "details": f"Key (event_id)=({event_id}) already exists.",
                        "hint": None,
                        "code": "23505",
                    }
                )
            self.supabase.processed_events.add(event_id)
            self.supabase.event_rows.append(self._payload)
            return FakeResponse(self._payload)

        if self.name == "profiles" and self._action == "update":
            user_id = self._filters.get("id")
            profile = self.supabase.profiles.setdefault(user_id, {})
            profile.update(self._payload)
            return FakeResponse(profile)

        if self.name == "ledger" and self._action == "insert":
            self.supabase.ledger_entries.append(self._payload)
            return FakeResponse(self._payload)

        return FakeResponse()


class FakeSupabase:
    def __init__(self):
        self.processed_events = set()
        self.event_rows = []
        self.profiles = {}
        self.ledger_entries = []

    def table(self, name):
        return FakeTable(self, name)


@pytest.fixture
def webhook_client(monkeypatch):
    fake_supabase = FakeSupabase()
    monkeypatch.setattr(main, "supabase", fake_supabase)

    base_event = {
        "id": "evt_test",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "metadata": {
                    "user_id": "user-123",
                    "plan": "starter",
                },
                "customer": "cus_123",
                "subscription": None,
                "amount_total": 5000,
            }
        },
    }

    def fake_construct_event(payload, signature, secret):
        return json.loads(json.dumps(base_event))

    monkeypatch.setattr(
        main.stripe.Webhook,
        "construct_event",
        staticmethod(fake_construct_event),
    )
    monkeypatch.setattr(main, "sync_stripe_customer", lambda *args, **kwargs: {"synced": True})
    monkeypatch.setattr(main, "_update_profile", lambda *args, **kwargs: None)
    monkeypatch.setattr(main.stripe.Subscription, "retrieve", lambda subscription_id: {})

    main.STRIPE_WEBHOOK_SECRET = "whsec_test"

    client = TestClient(main.app)
    return client, fake_supabase


def test_stripe_webhook_is_idempotent(webhook_client):
    client, fake_supabase = webhook_client

    payload = json.dumps({"test": "payload"})
    headers = {"stripe-signature": "sig_test"}

    first = client.post("/stripe-webhook", data=payload, headers=headers)
    second = client.post("/stripe-webhook", data=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "success"
    assert second.json()["status"] == "already_processed"

    profile = fake_supabase.profiles.get("user-123")
    assert profile is not None
    assert profile["credits_remaining"] == main.CREDITS_MAP["starter"]

    assert len(fake_supabase.ledger_entries) == 1
    assert len(fake_supabase.event_rows) == 1
