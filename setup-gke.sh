#!/bin/bash
set -e

echo "=========================================="
echo "PersonalizedLine GKE Cluster Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}⚠️  kubectl not found. Installing...${NC}"
    gcloud components install kubectl
fi

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}❌ helm is not installed${NC}"
    echo "Install with: brew install helm"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No project selected. Please enter your GCP project ID:${NC}"
    read -p "Project ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

echo "Using project: ${PROJECT_ID}"
echo ""

# Cluster configuration
CLUSTER_NAME=${CLUSTER_NAME:-"personalizedline"}
REGION=${REGION:-"us-central1"}
CLUSTER_TYPE=${CLUSTER_TYPE:-"autopilot"}  # autopilot or standard

echo "Cluster configuration:"
echo "  Name: ${CLUSTER_NAME}"
echo "  Region: ${REGION}"
echo "  Type: ${CLUSTER_TYPE}"
echo ""

read -p "Proceed with this configuration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Enable required APIs
echo ""
echo "🔧 Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
echo -e "${GREEN}✅ APIs enabled${NC}"

# Create cluster
echo ""
if [ "$CLUSTER_TYPE" = "autopilot" ]; then
    echo "🚀 Creating GKE Autopilot cluster (takes ~5-7 minutes)..."
    gcloud container clusters create-auto $CLUSTER_NAME \
        --region=$REGION \
        --release-channel=regular \
        --async

    echo ""
    echo -e "${YELLOW}⏳ Waiting for cluster to be ready...${NC}"
    echo "This takes about 5-7 minutes. You can check status with:"
    echo "  gcloud container clusters list"
    echo ""

    # Wait for cluster to be ready
    while true; do
        STATUS=$(gcloud container clusters list --filter="name:${CLUSTER_NAME}" --format="value(status)")
        if [ "$STATUS" = "RUNNING" ]; then
            break
        fi
        echo "Cluster status: $STATUS (waiting...)"
        sleep 30
    done
else
    echo "🚀 Creating GKE Standard cluster (takes ~5-7 minutes)..."
    gcloud container clusters create $CLUSTER_NAME \
        --region=$REGION \
        --machine-type=n1-standard-2 \
        --num-nodes=1 \
        --enable-autoscaling \
        --min-nodes=1 \
        --max-nodes=10 \
        --enable-autorepair \
        --enable-autoupgrade \
        --disk-size=50 \
        --disk-type=pd-standard
fi

echo -e "${GREEN}✅ Cluster created${NC}"

# Get credentials
echo ""
echo "🔑 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION
echo -e "${GREEN}✅ Credentials configured${NC}"

# Verify cluster
echo ""
echo "📊 Verifying cluster..."
kubectl cluster-info
kubectl get nodes
echo -e "${GREEN}✅ Cluster is ready${NC}"

# Install KEDA
echo ""
echo "📦 Installing KEDA..."
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

kubectl create namespace keda --dry-run=client -o yaml | kubectl apply -f -

helm install keda kedacore/keda \
    --namespace keda \
    --set podIdentity.activeDirectory.identity="keda" \
    --wait

echo ""
echo "⏳ Waiting for KEDA to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/keda-operator -n keda
kubectl wait --for=condition=available --timeout=120s deployment/keda-operator-metrics-apiserver -n keda

echo -e "${GREEN}✅ KEDA installed${NC}"

# Configure Docker for GCR
echo ""
echo "🐳 Configuring Docker for Google Container Registry..."
gcloud auth configure-docker --quiet
echo -e "${GREEN}✅ Docker configured${NC}"

# Create namespace for app
echo ""
echo "📦 Creating application namespace..."
kubectl create namespace personalizedline --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ Namespace created${NC}"

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 GKE Cluster Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Cluster Information:"
echo "  Name: ${CLUSTER_NAME}"
echo "  Region: ${REGION}"
echo "  Project: ${PROJECT_ID}"
echo "  Type: ${CLUSTER_TYPE}"
echo ""
echo "Next Steps:"
echo ""
echo "1. Build and push your Docker image:"
echo "   export PROJECT_ID=${PROJECT_ID}"
echo "   export DOCKER_IMAGE=\"gcr.io/\${PROJECT_ID}/personalizedline\""
echo "   docker build -f backend/app/Dockerfile -t \${DOCKER_IMAGE}:latest ."
echo "   docker push \${DOCKER_IMAGE}:latest"
echo ""
echo "2. Configure secrets:"
echo "   cp k8s/secrets.yaml.example k8s/secrets.yaml"
echo "   nano k8s/secrets.yaml  # Add your environment variables"
echo ""
echo "3. Deploy application:"
echo "   export DOCKER_IMAGE=\"gcr.io/${PROJECT_ID}/personalizedline\""
echo "   export VERSION=\"latest\""
echo "   ./deploy.sh"
echo ""
echo "4. Or use the quick deploy script:"
echo "   ./deploy-gke.sh"
echo ""
echo "To access your cluster later:"
echo "  gcloud container clusters get-credentials ${CLUSTER_NAME} --region=${REGION}"
echo ""
echo "To view in Cloud Console:"
echo "  https://console.cloud.google.com/kubernetes/list?project=${PROJECT_ID}"
echo ""
