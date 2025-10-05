import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[3]))

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://project.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
)

from backend.app import jobs


class FakeResponse:
    def __init__(self, data, status_code=200):
        self.data = data
        self.status_code = status_code


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

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def limit(self, _value):
        return self

    def execute(self):
        if self.name == "jobs":
            if self._action == "select":
                self.supabase.select_calls += 1
                if self._filters.get("id") != self.supabase.job_id:
                    return FakeResponse([])
                return FakeResponse([
                    {"rows_processed": self.supabase.rows_processed}
                ])

            if self._action == "update":
                with self.supabase.lock:
                    self.supabase.update_calls += 1
                    if self._filters.get("id") != self.supabase.job_id:
                        return FakeResponse([])

                    expected = self._filters.get("rows_processed")
                    if expected is not None and expected != self.supabase.rows_processed:
                        return FakeResponse([])

                    if self.supabase.fail_on_update_once:
                        self.supabase.fail_on_update_once -= 1
                        return FakeResponse([])

                    self.supabase.rows_processed = self._payload.get(
                        "rows_processed", self.supabase.rows_processed
                    )
                    self.supabase.progress_percent = self._payload.get(
                        "progress_percent", self.supabase.progress_percent
                    )
                    return FakeResponse([
                        {"rows_processed": self.supabase.rows_processed}
                    ])

        if self.name == "job_logs" and self._action == "insert":
            self.supabase.logs.append(self._payload)
            return FakeResponse([self._payload])

        return FakeResponse([])


class FakeSupabase:
    def __init__(self, job_id="job-1"):
        self.job_id = job_id
        self.rows_processed = 0
        self.progress_percent = 0.0
        self.lock = threading.Lock()
        self.select_calls = 0
        self.update_calls = 0
        self.fail_on_update_once = 0
        self.logs = []

    def table(self, name):
        return FakeTable(self, name)


def test_update_job_progress_no_delta():
    fake = FakeSupabase()
    last_reported, progress = jobs._update_job_progress(
        fake.job_id, 100, 0, 0, supabase_client=fake
    )

    assert last_reported == 0
    assert progress is None
    assert fake.select_calls == 0
    assert fake.update_calls == 0


def test_update_job_progress_retries_on_conflict():
    fake = FakeSupabase()
    fake.fail_on_update_once = 1

    last_reported, progress = jobs._update_job_progress(
        fake.job_id, 100, 5, 0, supabase_client=fake, retry_delay=0
    )

    assert last_reported == 5
    assert progress == {"new_done": 5, "percent": 5.0, "delta": 5}
    assert fake.rows_processed == 5
    assert fake.select_calls >= 2
    assert fake.update_calls >= 2


def test_concurrent_workers_do_not_lose_rows():
    fake = FakeSupabase()
    barrier = threading.Barrier(2)

    def worker(processed):
        last_reported = 0
        barrier.wait()
        _, progress = jobs._update_job_progress(
            fake.job_id, 50, processed, last_reported, supabase_client=fake, retry_delay=0
        )
        return progress["new_done"], progress["delta"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(worker, [5, 5]))

    new_dones = sorted(result[0] for result in results)
    deltas = [result[1] for result in results]

    assert new_dones == [5, 10]
    assert deltas == [5, 5]
    assert fake.rows_processed == 10
    assert len(fake.logs) == 0  # helper does not write logs directly
