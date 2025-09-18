import pytest
from fastapi.testclient import TestClient
from .main import app

client = TestClient(app)

# --- Mock Data ---
FAKE_USER_ID = "11111111-1111-1111-1111-111111111111"

@pytest.fixture(autouse=True)
def mock_supabase(mocker):
    """Mock Supabase responses for all tests"""

    # Mock profiles
    mocker.patch("main.supabase.table", autospec=True)

    def fake_table(name):
        class FakeExec:
            def __init__(self, data=None, count=None):
                self.data = data or []
                self.count = count

            def execute(self):
                return self

        if name == "profiles":
            return lambda: FakeExec(data=[{"credits_remaining": 1000}])
        if name == "jobs":
            return lambda: FakeExec(data=[], count=12)  # 12 jobs
        if name == "files":
            return lambda: FakeExec(data=[], count=5)   # 5 files
        if name == "ledger":
            return lambda: FakeExec(data=[])            # no rewards claimed
        return lambda: FakeExec()

    mocker.patch("main.supabase.table", side_effect=fake_table)

# --- Tests ---

def test_rewards_status_claimable():
    response = client.get("/rewards/status", params={"user_id": FAKE_USER_ID})
    assert response.status_code == 200
    data = response.json()

    # streak should be claimable (5 >= 4)
    assert "streak" in data["claimable"]
    assert data["rewards"]["streak"]["eligible"] is True

def test_rewards_claim_streak():
    response = client.post("/rewards/claim", params={
        "user_id": FAKE_USER_ID,
        "reward_type": "streak"
    })
    assert response.status_code == 200
    data = response.json()

    # should succeed
    assert data["success"] is True
    assert data["reward"] == "streak"
