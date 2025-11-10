#!/bin/bash
echo "Creating 20 test jobs directly in Redis..."
for i in {1..20}; do
  kubectl exec -it deployment/redis -n personalizedline -- redis-cli RPUSH default "test-job-$i"
done

echo "Jobs created. Watching workers process them..."
sleep 2

echo "Checking which workers picked up jobs:"
kubectl logs -l app=rq-worker -n personalizedline --since=10s | grep "test-job" | awk '{print $1}' | sort | uniq -c
