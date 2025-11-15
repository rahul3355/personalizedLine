#!/bin/bash
set -e

echo "======================================"
echo "Deploying Preview Fix to Production"
echo "======================================"

# Get the current git commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "Current commit: $CURRENT_COMMIT"

# Check we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "claude/login-page-preview-card-01WWU1dMyncMGVRzazfnU5iT" ]; then
    echo "ERROR: Not on the correct branch. Current: $CURRENT_BRANCH"
    exit 1
fi

# Set the GCP project and image details (UPDATE THESE!)
# You need to set your actual GCP project ID
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
if [ "$PROJECT_ID" = "your-gcp-project-id" ]; then
    echo "ERROR: Please set GCP_PROJECT_ID environment variable"
    echo "Example: export GCP_PROJECT_ID=my-project-123"
    exit 1
fi

DOCKER_IMAGE="gcr.io/${PROJECT_ID}/personalizedline-backend"
VERSION="${CURRENT_COMMIT}"

echo "Docker image: ${DOCKER_IMAGE}:${VERSION}"

# Build the Docker image
echo ""
echo "[1/4] Building Docker image..."
docker build -f backend/app/Dockerfile -t ${DOCKER_IMAGE}:${VERSION} -t ${DOCKER_IMAGE}:latest .

# Push to GCR
echo ""
echo "[2/4] Pushing to Google Container Registry..."
docker push ${DOCKER_IMAGE}:${VERSION}
docker push ${DOCKER_IMAGE}:latest

# Update Kubernetes deployment
echo ""
echo "[3/4] Updating Kubernetes deployment..."
export DOCKER_IMAGE
export VERSION
kubectl set image deployment/web web=${DOCKER_IMAGE}:${VERSION} -n personalizedline

# Wait for rollout
echo ""
echo "[4/4] Waiting for rollout to complete..."
kubectl rollout status deployment/web -n personalizedline

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Verify the deployment:"
echo "  kubectl get pods -n personalizedline"
echo ""
echo "Test the endpoint:"
echo "  curl -X POST https://api.senditfast.ai/preview/generate \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"selected_email\":\"test@example.com\",\"service\":{\"company\":\"Test\",\"description\":\"Test\"}}'"
