#!/bin/bash
set -e

echo "==================================="
echo "PersonalizedLine Deployment Script"
echo "==================================="

# Variables
DOCKER_IMAGE="${DOCKER_IMAGE:-your-registry/personalizedline}"
VERSION="${VERSION:-latest}"

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed. Aborting." >&2; exit 1; }

echo "✅ Prerequisites checked"

# Create namespace if it doesn't exist
kubectl create namespace personalizedline --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Namespace ready"

# Apply secrets (make sure secrets.yaml exists)
if [ -f "k8s/secrets.yaml" ]; then
    kubectl apply -f k8s/secrets.yaml -n personalizedline
    echo "✅ Secrets applied"
else
    echo "⚠️  Warning: k8s/secrets.yaml not found. Please create it from secrets.yaml.example"
    echo "   Copy secrets.yaml.example to secrets.yaml and fill in your values"
fi

# Deploy Redis
echo "📦 Deploying Redis..."
kubectl apply -f k8s/redis.yaml -n personalizedline

# Wait for Redis
echo "⏳ Waiting for Redis to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/redis -n personalizedline

# Deploy Web service
echo "🌐 Deploying Web API..."
export DOCKER_IMAGE VERSION
envsubst < k8s/web.yaml | kubectl apply -f - -n personalizedline

# Deploy Workers
echo "👷 Deploying Workers..."
envsubst < k8s/worker.yaml | kubectl apply -f - -n personalizedline

# Deploy KEDA autoscaler
echo "📈 Deploying KEDA autoscaler..."
kubectl apply -f k8s/keda-scaler.yaml -n personalizedline

# Wait for deployments
echo "⏳ Waiting for deployments..."
kubectl rollout status deployment/web -n personalizedline --timeout=300s
kubectl rollout status deployment/rq-worker -n personalizedline --timeout=300s

echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "To check status:"
echo "  kubectl get pods -n personalizedline"
echo "  kubectl get scaledobject -n personalizedline"
echo ""
echo "To get web service URL:"
echo "  kubectl get svc web -n personalizedline"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/web -n personalizedline"
echo "  kubectl logs -f deployment/rq-worker -n personalizedline"
echo ""
