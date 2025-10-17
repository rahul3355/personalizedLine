import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace

sys.path.append(str(Path(__file__).resolve().parents[3]))

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
)

from backend.app import jobs


class FakeResponse:
    def __init__(self, data=None, error=None):
        self.data = data or []
        self.error = error
        self.status_code = 200


class FakeTable:
    def __init__(self, supabase, name):
        self.supabase = supabase
        self.name = name
        self._action = None
        self._payload = None
        self._filters = {}
        self._select = "*"

    def select(self, columns):
        self._action = "select"
        self._select = columns
        return self

    def update(self, payload):
        self._action = "update"
        self._payload = payload
        return self

    def insert(self, payload):
        self._action = "insert"
        self._payload = payload
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def limit(self, _value):
        return self

    def execute(self):
        if self.name == "jobs":
            if self._action == "select":
                job_id = self._filters.get("id")
                with self.supabase.lock:
                    row = self.supabase.jobs.get(job_id)
                    if not row:
                        return FakeResponse([])
                    return FakeResponse([row.copy()])

            if self._action == "update":
                job_id = self._filters.get("id")
                status_filter = self._filters.get("status")
                rows_processed_filter = self._filters.get("rows_processed")

                with self.supabase.lock:
                    row = self.supabase.jobs.get(job_id)
                    if not row:
                        return FakeResponse([])
                    if status_filter is not None and row.get("status") != status_filter:
                        return FakeResponse([])
                    if (
                        rows_processed_filter is not None
                        and row.get("rows_processed") != rows_processed_filter
                    ):
                        return FakeResponse([])

                    row.update(self._payload)
                    if "meta_json" in self._payload and isinstance(
                        self._payload["meta_json"], dict
                    ):
                        row["meta_json"] = dict(self._payload["meta_json"])

                    if (
                        self._payload.get("status") == "in_progress"
                        and status_filter == "queued"
                    ):
                        self.supabase.claim_updates += 1

                    return FakeResponse([row.copy()])

        if self.name == "profiles":
            if self._action == "select":
                user_id = self._filters.get("id")
                with self.supabase.lock:
                    profile = self.supabase.profiles.get(user_id)
                    if not profile:
                        return FakeResponse([])
                    return FakeResponse(
                        [{"credits_remaining": profile.get("credits_remaining", 0)}]
                    )

            if self._action == "update":
                user_id = self._filters.get("id")
                expected = self._filters.get("credits_remaining")
                with self.supabase.lock:
                    profile = self.supabase.profiles.get(user_id)
                    if not profile:
                        return FakeResponse([])
                    if (
                        expected is not None
                        and profile.get("credits_remaining") != expected
                    ):
                        return FakeResponse([])

                    profile.update(self._payload)
                    return FakeResponse([profile.copy()])

        if self.name == "ledger" and self._action == "insert":
            with self.supabase.lock:
                self.supabase.ledger_entries.append(self._payload)
            return FakeResponse([self._payload])

        return FakeResponse([])


class FakeStorageBucket:
    def __init__(self, bucket):
        self.bucket = bucket

    def create_signed_url(self, path, _expires):
        return {"signedURL": f"https://example.com/{self.bucket}/{path}"}


class FakeStorage:
    def from_(self, bucket):
        return FakeStorageBucket(bucket)


class FakeSupabase:
    def __init__(self, job_id="job-1", user_id="user-1"):
        self.job_id = job_id
        self.user_id = user_id
        self.jobs = {
            job_id: {
                "id": job_id,
                "user_id": user_id,
                "status": "queued",
                "meta_json": {"file_path": "inputs/file.csv", "email_col": "email"},
                "rows_processed": 0,
                "progress_percent": 0,
            }
        }
        self.profiles = {
            user_id: {
                "credits_remaining": 10,
                "groq_api_key": "test-groq",
                "serper_api_key": "test-serper",
            }
        }
        self.ledger_entries = []
        self.lock = threading.Lock()
        self.claim_updates = 0
        self.storage = FakeStorage()

    def table(self, name):
        return FakeTable(self, name)


class FakeRedisLock:
    def __init__(self, lock):
        self._lock = lock

    def acquire(self, blocking=True):
        return self._lock.acquire(blocking)

    def release(self):
        self._lock.release()


class FakeRedis:
    def __init__(self):
        self._locks = {}
        self._global = threading.Lock()

    def lock(self, name, timeout=None, blocking_timeout=None):
        with self._global:
            if name not in self._locks:
                self._locks[name] = threading.Lock()
            underlying = self._locks[name]
        return FakeRedisLock(underlying)


class FakeQueue:
    def __init__(self):
        self.calls = []

    def enqueue(self, func, *args, **kwargs):
        self.calls.append((func, args, kwargs))
        return SimpleNamespace(id=len(self.calls))

    def subjob_calls(self):
        return [call for call in self.calls if call[0] is jobs.process_subjob]


class DummyHTTPResponse:
    def __init__(self, content=b"col\nvalue\n"):
        self.content = content

    def raise_for_status(self):
        return None


def fake_persist_chunk_rows(job_id, chunk_id, headers, rows, user_id):
    return f"{job_id}/chunk_{chunk_id}.csv"


def fake_input_iterator(_local_path):
    return ["col"], 1, iter([{"col": "value"}])


def test_process_job_only_one_worker_claims(monkeypatch):
    fake_supabase = FakeSupabase()
    fake_queue = FakeQueue()
    fake_redis = FakeRedis()

    monkeypatch.setattr(jobs, "supabase", fake_supabase)
    monkeypatch.setattr(jobs, "queue", fake_queue)
    monkeypatch.setattr(jobs, "redis_conn", fake_redis)
    monkeypatch.setattr(jobs, "_persist_chunk_rows", fake_persist_chunk_rows)
    monkeypatch.setattr(jobs, "_input_iterator", fake_input_iterator)
    monkeypatch.setattr(jobs, "_get_job_timeout", lambda: 30)
    monkeypatch.setattr(jobs, "requests", SimpleNamespace(get=lambda url, timeout=0: DummyHTTPResponse()))

    barrier = threading.Barrier(2)

    def worker():
        barrier.wait()
        jobs.process_job(fake_supabase.job_id)

    with ThreadPoolExecutor(max_workers=2) as executor:
        list(executor.map(lambda _: worker(), range(2)))

    subjob_calls = fake_queue.subjob_calls()

    assert len(subjob_calls) == 1
    assert fake_supabase.claim_updates == 1
    assert len(fake_supabase.ledger_entries) == 1
    assert fake_supabase.profiles[fake_supabase.user_id]["credits_remaining"] == 9
    assert fake_supabase.jobs[fake_supabase.job_id]["status"] == "in_progress"
    assert fake_supabase.jobs[fake_supabase.job_id]["meta_json"].get("credits_deducted") is True
