import redis
from rq import Worker, Connection

if __name__ == "__main__":
    redis_conn = redis.Redis(host="redis", port=6379)
    with Connection(redis_conn):
        worker = Worker(["default"])
        worker.work()

