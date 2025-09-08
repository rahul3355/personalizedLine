import redis
import rq
import uuid
import os
from backend.app.jobs import process_job

# -----------------------------
# Redis connection
# -----------------------------
redis_conn = redis.Redis(host="redis", port=6379, decode_responses=True)
queue = rq.Queue("default", connection=redis_conn)

# -----------------------------
# Producer Logic
# -----------------------------

def enqueue_job(job_id: str = None):
    """
    Enqueue a new top-level job for processing.
    If job_id not provided, generate a UUID.
    """
    if not job_id:
        job_id = str(uuid.uuid4())

    print(f"[Producer] Enqueuing job {job_id}")

    # Enqueue main dispatcher job
    job_ref = queue.enqueue(process_job, job_id)

    print(f"[Producer] Job enqueued: {job_ref.id}")
    return job_ref


if __name__ == "__main__":
    # Simple test when running producer standalone
    test_id = str(uuid.uuid4())
    enqueue_job(test_id)
