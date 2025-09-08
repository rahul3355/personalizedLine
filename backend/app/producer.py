from rq import Queue
import redis
from worker import process_row

import os, redis
redis_url = os.getenv("REDIS_URL", "redis://redis:6379")
redis_conn = redis.from_url(redis_url)

q = Queue(connection=redis_conn)

for i in range(1, 21):
    job = q.enqueue(process_row, i)
    print(f"Queued row {i}, job id={job.id}")
