#!/bin/bash
set -e

NAMESPACE="personalizedline"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Creating namespace '${NAMESPACE}'"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Applying secrets"
kubectl apply -f k8s/secrets.yaml -n ${NAMESPACE}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploying Redis"
kubectl apply -f k8s/redis.yaml -n ${NAMESPACE}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Waiting for Redis to be ready"
kubectl wait --for=condition=available --timeout=120s deployment/redis -n ${NAMESPACE}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploying Web Service"
envsubst < k8s/web.yaml | kubectl apply -f - -n ${NAMESPACE}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploying RQ Workers"
envsubst < k8s/worker.yaml | kubectl apply -f - -n ${NAMESPACE}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploying KEDA ScaledObject"
kubectl apply -f k8s/keda-scaler.yaml -n ${NAMESPACE}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deployment Complete!"
echo ""
echo "Check status with: kubectl get pods -n ${NAMESPACE}"
echo "Get external IP with: kubectl get svc web -n ${NAMESPACE}"