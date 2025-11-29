import redis
from rq import Worker, Connection

if __name__ == "__main__":
    import os
    key = os.getenv("SERPER_API_KEY")
    if key:
        print(f"DEBUG: WORKER STARTUP - SERPER_API_KEY: {key[:4]}...{key[-4:]}", flush=True)
    else:
        print("DEBUG: WORKER STARTUP - SERPER_API_KEY is MISSING", flush=True)

    redis_conn = redis.Redis(host="redis", port=6379)
    with Connection(redis_conn):
        worker = Worker(["default"])
        worker.work()
