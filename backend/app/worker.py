import os
import redis
from rq import Worker, Connection

if __name__ == "__main__":
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379")

    redis_conn = redis.from_url(redis_url, decode_responses=False)

    redis_conn = redis.from_url(redis_url)
    with Connection(redis_conn):
        worker = Worker(["default"])
        worker.work()
