#!/bin/bash
set -e

echo "=========================================="
echo "PersonalizedLine GKE Deployment"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No GCP project set${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "Project: ${PROJECT_ID}"

# Set variables
export DOCKER_IMAGE=${DOCKER_IMAGE:-"gcr.io/${PROJECT_ID}/personalizedline"}
export VERSION=${VERSION:-"latest"}

echo "Docker Image: ${DOCKER_IMAGE}:${VERSION}"
echo ""

# Check if image exists
echo "🔍 Checking if Docker image exists..."
if gcloud container images describe ${DOCKER_IMAGE}:${VERSION} &>/dev/null; then
    echo -e "${GREEN}✅ Image found${NC}"
else
    echo -e "${YELLOW}⚠️  Image not found. Building and pushing...${NC}"

    # Configure Docker
    gcloud auth configure-docker --quiet

    # Build
    echo "🏗️  Building Docker image..."
    docker build -f backend/app/Dockerfile -t ${DOCKER_IMAGE}:${VERSION} .

    # Push
    echo "⬆️  Pushing to Google Container Registry..."
    docker push ${DOCKER_IMAGE}:${VERSION}

    echo -e "${GREEN}✅ Image pushed${NC}"
fi

echo ""

# Check secrets
if [ ! -f "k8s/secrets.yaml" ]; then
    echo -e "${YELLOW}⚠️  Warning: k8s/secrets.yaml not found${NC}"
    echo "Creating from template..."
    cp k8s/secrets.yaml.example k8s/secrets.yaml
    echo ""
    echo -e "${RED}❗ IMPORTANT: Edit k8s/secrets.yaml with your actual values${NC}"
    read -p "Press enter when secrets are configured..."
fi

# Create namespace
echo "📦 Creating namespace..."
kubectl create namespace personalizedline --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ Namespace ready${NC}"

# Apply secrets
echo ""
echo "🔐 Applying secrets..."
kubectl apply -f k8s/secrets.yaml -n personalizedline
echo -e "${GREEN}✅ Secrets applied${NC}"

# Deploy Redis
echo ""
echo "💾 Deploying Redis..."
kubectl apply -f k8s/redis.yaml -n personalizedline

echo "⏳ Waiting for Redis..."
kubectl wait --for=condition=available --timeout=120s deployment/redis -n personalizedline
echo -e "${GREEN}✅ Redis ready${NC}"

# Deploy Web
echo ""
echo "🌐 Deploying Web API..."
envsubst < k8s/web.yaml | kubectl apply -f - -n personalizedline

# Deploy Workers
echo ""
echo "👷 Deploying Workers..."
envsubst < k8s/worker.yaml | kubectl apply -f - -n personalizedline

# Deploy KEDA scaler
echo ""
echo "📈 Deploying KEDA autoscaler..."
kubectl apply -f k8s/keda-scaler.yaml -n personalizedline

# Wait for deployments
echo ""
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/web -n personalizedline
kubectl wait --for=condition=available --timeout=300s deployment/rq-worker -n personalizedline

echo -e "${GREEN}✅ All deployments ready${NC}"

# Get external IP
echo ""
echo "🌍 Getting external IP (this may take 2-3 minutes)..."
echo "Waiting for LoadBalancer..."

# Wait for external IP
for i in {1..60}; do
    EXTERNAL_IP=$(kubectl get svc web -n personalizedline -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [ ! -z "$EXTERNAL_IP" ]; then
        break
    fi
    echo -n "."
    sleep 5
done

echo ""

if [ -z "$EXTERNAL_IP" ]; then
    echo -e "${YELLOW}⚠️  External IP not yet assigned${NC}"
    echo "Run this command to get it later:"
    echo "  kubectl get svc web -n personalizedline"
else
    echo -e "${GREEN}✅ External IP assigned: ${EXTERNAL_IP}${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Cluster Status:"
kubectl get pods -n personalizedline
echo ""

echo "ScaledObject Status:"
kubectl get scaledobject -n personalizedline
echo ""

if [ ! -z "$EXTERNAL_IP" ]; then
    echo "🌐 Your API is available at:"
    echo "   http://${EXTERNAL_IP}"
    echo ""
    echo "Test with:"
    echo "   curl http://${EXTERNAL_IP}/health"
    echo ""
fi

echo "📊 Useful Commands:"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/web -n personalizedline"
echo "  kubectl logs -f deployment/rq-worker -n personalizedline"
echo ""
echo "Check auto-scaling:"
echo "  kubectl get hpa -n personalizedline -w"
echo "  kubectl get scaledobject -n personalizedline"
echo ""
echo "View all resources:"
echo "  kubectl get all -n personalizedline"
echo ""
echo "Get external IP:"
echo "  kubectl get svc web -n personalizedline"
echo ""
echo "Port-forward (for local testing):"
echo "  kubectl port-forward svc/web 8000:80 -n personalizedline"
echo ""
echo "Cloud Console:"
echo "  https://console.cloud.google.com/kubernetes/workload?project=${PROJECT_ID}"
echo ""
