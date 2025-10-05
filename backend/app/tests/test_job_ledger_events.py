import os
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[3]))

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
)

from backend.app import jobs  # noqa: E402


class FakeResponse:
    def __init__(self, data=None, error=None):
        self.data = data or []
        self.error = error


class FakeTable:
    def __init__(self, supabase, name):
        self.supabase = supabase
        self.name = name
        self._action = None
        self._payload = None
        self._filters = {}

    def select(self, _columns):
        self._action = "select"
        return self

    def update(self, payload):
        self._action = "update"
        self._payload = payload
        return self

    def insert(self, payload):
        self._action = "insert"
        self._payload = payload
        return self

    def delete(self):
        self._action = "delete"
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def limit(self, _value):
        return self

    def execute(self):
        return self.supabase._execute(self.name, self._action, self._payload, self._filters)


class FakeSupabase:
    def __init__(self, *, job_id, user_id, balance, cost, meta=None):
        self.job_id = job_id
        self.user_id = user_id
        meta = meta or {
            "credit_cost": cost,
            "credits_deducted": False,
            "credits_refunded": False,
            "file_path": "test.csv",
        }
        self.jobs = {
            job_id: {
                "id": job_id,
                "user_id": user_id,
                "meta_json": meta,
            }
        }
        self.profiles = {user_id: {"id": user_id, "credits_remaining": balance}}
        self.ledger_rows = []
        self.job_ledger_events = {}

    def table(self, name):
        return FakeTable(self, name)

    # Storage interface placeholders for compatibility
    class storage:
        @staticmethod
        def from_(_bucket):
            raise NotImplementedError

    def _execute(self, name, action, payload, filters):
        if name == "jobs":
            return self._execute_jobs(action, payload, filters)
        if name == "profiles":
            return self._execute_profiles(action, payload, filters)
        if name == "ledger":
            return self._execute_ledger(action, payload, filters)
        if name == "job_ledger_events":
            return self._execute_job_ledger_events(action, payload, filters)
        raise NotImplementedError(name)

    def _execute_jobs(self, action, payload, filters):
        job_id = filters.get("id")
        if action == "select":
            if job_id and job_id not in self.jobs:
                return FakeResponse([])
            rows = [
                {
                    "id": job_id or self.job_id,
                    "user_id": self.user_id,
                    "meta_json": self.jobs[job_id or self.job_id]["meta_json"],
                }
            ]
            return FakeResponse(rows)

        if action == "update":
            if not job_id or job_id not in self.jobs:
                return FakeResponse([])
            self.jobs[job_id].update(payload)
            return FakeResponse([self.jobs[job_id]])

        return FakeResponse([])

    def _execute_profiles(self, action, payload, filters):
        user_id = filters.get("id")
        if user_id not in self.profiles:
            return FakeResponse([])
        profile = self.profiles[user_id]

        if action == "select":
            return FakeResponse([{ "credits_remaining": profile["credits_remaining"] }])

        if action == "update":
            expected = filters.get("credits_remaining")
            if expected is not None and profile["credits_remaining"] != expected:
                return FakeResponse([])
            profile.update(payload)
            return FakeResponse([{ "credits_remaining": profile["credits_remaining"] }])

        return FakeResponse([])

    def _execute_ledger(self, action, payload, _filters):
        if action != "insert":
            return FakeResponse([])
        ledger_id = f"ledger-{len(self.ledger_rows) + 1}"
        row = {"id": ledger_id, **payload}
        self.ledger_rows.append(row)
        return FakeResponse([row])

    def _execute_job_ledger_events(self, action, payload, filters):
        job_id = filters.get("job_id")
        event_type = filters.get("event_type")
        if payload:
            job_id = job_id or payload.get("job_id")
            event_type = event_type or payload.get("event_type")
        key = (job_id, event_type)
        if action == "insert":
            if key in self.job_ledger_events:
                return FakeResponse([], error={"message": "duplicate key value violates unique constraint"})
            row = {"job_id": key[0], "event_type": key[1], "ledger_id": payload.get("ledger_id")}
            self.job_ledger_events[key] = row
            return FakeResponse([row])

        if action == "update":
            row = self.job_ledger_events.get(key)
            if not row:
                return FakeResponse([])
            row.update(payload)
            return FakeResponse([row])

        if action == "delete":
            self.job_ledger_events.pop(key, None)
            return FakeResponse([])

        return FakeResponse([])


@pytest.fixture(autouse=True)
def fast_sleep(monkeypatch):
    monkeypatch.setattr(jobs.time, "sleep", lambda _seconds: None)


def test_refund_job_credits_is_idempotent(monkeypatch):
    job_id = "job-123"
    user_id = "user-123"
    fake = FakeSupabase(job_id=job_id, user_id=user_id, balance=5, cost=3, meta={
        "credit_cost": 3,
        "credits_deducted": True,
        "credits_refunded": False,
    })

    monkeypatch.setattr(jobs, "supabase", fake)

    assert jobs.refund_job_credits(job_id, user_id, "test") is True
    assert fake.profiles[user_id]["credits_remaining"] == 8
    assert len(fake.ledger_rows) == 1
    assert fake.ledger_rows[0]["external_id"] == f"job_refund:{job_id}"
    assert fake.job_ledger_events[(job_id, "job_refund")]["ledger_id"] == "ledger-1"

    # Simulate metadata not marking the refund while the event record exists.
    fake.jobs[job_id]["meta_json"]["credits_refunded"] = False

    assert jobs.refund_job_credits(job_id, user_id, "test") is False
    assert fake.profiles[user_id]["credits_remaining"] == 8
    assert len(fake.ledger_rows) == 1


def test_deduct_job_credits_is_idempotent(monkeypatch):
    job_id = "job-456"
    user_id = "user-456"
    fake = FakeSupabase(job_id=job_id, user_id=user_id, balance=10, cost=4)

    monkeypatch.setattr(jobs, "supabase", fake)

    meta = fake.jobs[job_id]["meta_json"]
    deducted, previous_balance = jobs._deduct_job_credits(
        job_id,
        user_id,
        4,
        meta,
        supabase_client=fake,
    )

    assert deducted is True
    assert previous_balance == 10
    assert fake.profiles[user_id]["credits_remaining"] == 6
    assert len(fake.ledger_rows) == 1
    assert fake.ledger_rows[0]["external_id"] == f"job_deduction:{job_id}"
    assert fake.job_ledger_events[(job_id, "job_deduction")]["ledger_id"] == "ledger-1"

    fake.profiles[user_id]["credits_remaining"] = 6
    fake.jobs[job_id]["meta_json"]["credits_deducted"] = False

    deducted_again, previous_balance_again = jobs._deduct_job_credits(
        job_id,
        user_id,
        4,
        fake.jobs[job_id]["meta_json"],
        supabase_client=fake,
    )

    assert deducted_again is False
    assert previous_balance_again is None
    assert fake.profiles[user_id]["credits_remaining"] == 6
    assert len(fake.ledger_rows) == 1
    assert fake.job_ledger_events[(job_id, "job_deduction")]["ledger_id"] == "ledger-1"
    assert fake.jobs[job_id]["meta_json"]["credits_deducted"] is True
