# 🚀 Deploy to Google Cloud (GKE) in 1 Hour

Complete guide for deploying PersonalizedLine with auto-scaling workers on Google Kubernetes Engine.

## Why GKE?

- **Best performance** - Fastest scaling, lowest latency
- **Autopilot mode** - Fully managed, no node management
- **Native integration** - Works seamlessly with GCR, Cloud Build
- **Reliability** - 99.95% SLA on multi-zonal clusters
- **Cost** - Competitive pricing with sustained use discounts

---

## Prerequisites (10 minutes)

### 1. Install Google Cloud SDK

**macOS:**
```bash
brew install --cask google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Windows:**
Download from: https://cloud.google.com/sdk/docs/install

### 2. Install kubectl and helm

```bash
gcloud components install kubectl
brew install helm  # or: curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 3. Authenticate with Google Cloud

```bash
# Login
gcloud auth login

# Set your project (create one if needed)
gcloud projects create personalizedline-prod --name="PersonalizedLine Production"
gcloud config set project personalizedline-prod

# Enable billing (required)
# Go to: https://console.cloud.google.com/billing
# Link your project to a billing account

# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
```

---

## Step 1: Create GKE Cluster (5-10 minutes)

Choose between **Autopilot** (recommended) or **Standard**:

### Option A: Autopilot (Recommended - Fully Managed)

```bash
# Create Autopilot cluster
gcloud container clusters create-auto personalizedline \
  --region=us-central1 \
  --release-channel=regular \
  --async

# Monitor creation (takes ~5-7 minutes)
gcloud container clusters list

# Get credentials when ready
gcloud container clusters get-credentials personalizedline --region=us-central1
```

**Benefits:**
- No node management
- Automatic scaling
- Pay only for pods
- Better security defaults
- **Cost:** ~$0.10/hr per vCPU + $0.012/hr per GB RAM

### Option B: Standard (More Control)

```bash
# Create standard cluster with auto-scaling node pool
gcloud container clusters create personalizedline \
  --region=us-central1 \
  --machine-type=n1-standard-2 \
  --num-nodes=1 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --disk-size=50 \
  --disk-type=pd-standard

# Get credentials
gcloud container clusters get-credentials personalizedline --region=us-central1
```

**Benefits:**
- Full control over nodes
- Custom machine types
- Preemptible nodes support
- **Cost:** ~$48/month per node + ~$0.01/hr per pod

### Verify cluster is ready

```bash
kubectl cluster-info
kubectl get nodes
```

---

## Step 2: Install KEDA (5 minutes)

```bash
# Add KEDA Helm repository
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Create namespace for KEDA
kubectl create namespace keda

# Install KEDA
helm install keda kedacore/keda \
  --namespace keda \
  --set podIdentity.activeDirectory.identity="keda"

# Verify installation
kubectl get pods -n keda

# Expected output:
# NAME                                      READY   STATUS    RESTARTS   AGE
# keda-operator-xxxxxxxxxx-xxxxx            1/1     Running   0          1m
# keda-operator-metrics-apiserver-xxxxx     1/1     Running   0          1m
```

---

## Step 3: Build and Push to Google Container Registry (10 minutes)

### Configure Docker for GCR

```bash
# Configure Docker authentication
gcloud auth configure-docker

# Set project ID
export PROJECT_ID=$(gcloud config get-value project)
export DOCKER_IMAGE="gcr.io/${PROJECT_ID}/personalizedline"

echo "Docker image will be: ${DOCKER_IMAGE}"
```

### Build and Push

```bash
# Build the Docker image
docker build -f backend/app/Dockerfile -t ${DOCKER_IMAGE}:latest .

# Tag with git SHA for versioning
export VERSION=$(git rev-parse --short HEAD)
docker tag ${DOCKER_IMAGE}:latest ${DOCKER_IMAGE}:${VERSION}

# Push to GCR
docker push ${DOCKER_IMAGE}:latest
docker push ${DOCKER_IMAGE}:${VERSION}

# Verify image is in GCR
gcloud container images list --repository=gcr.io/${PROJECT_ID}
```

**Alternative: Use Cloud Build (faster)**

```bash
# Submit build to Cloud Build (builds in the cloud)
gcloud builds submit --tag ${DOCKER_IMAGE}:latest .

# This is faster and doesn't use your local resources
```

---

## Step 4: Configure Secrets (5 minutes)

```bash
# Copy example secrets file
cp k8s/secrets.yaml.example k8s/secrets.yaml

# Edit with your actual values
nano k8s/secrets.yaml
```

**Or use Google Secret Manager (recommended for production):**

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets
echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your-database-url" | gcloud secrets create database-url --data-file=-

# Grant GKE access to secrets
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 5: Deploy to GKE (5 minutes)

### Update deployment files for GCR

```bash
# Set environment variables
export PROJECT_ID=$(gcloud config get-value project)
export DOCKER_IMAGE="gcr.io/${PROJECT_ID}/personalizedline"
export VERSION="latest"

# Deploy using the script
./deploy.sh
```

### Or deploy manually:

```bash
# Create namespace
kubectl create namespace personalizedline

# Apply secrets
kubectl apply -f k8s/secrets.yaml -n personalizedline

# Deploy Redis
kubectl apply -f k8s/redis.yaml -n personalizedline

# Deploy Web (replace image placeholder)
envsubst < k8s/web.yaml | kubectl apply -f - -n personalizedline

# Deploy Workers
envsubst < k8s/worker.yaml | kubectl apply -f - -n personalizedline

# Deploy KEDA scaler
kubectl apply -f k8s/keda-scaler.yaml -n personalizedline

# Wait for deployments
kubectl wait --for=condition=available --timeout=300s deployment/web -n personalizedline
kubectl wait --for=condition=available --timeout=300s deployment/rq-worker -n personalizedline
```

---

## Step 6: Expose Web Service (5 minutes)

### Get the external IP:

```bash
# The LoadBalancer will provision a Google Cloud Load Balancer
kubectl get svc web -n personalizedline -w

# Wait for EXTERNAL-IP to appear (takes ~2-3 minutes)
# Press Ctrl+C when you see an IP address
```

### Test the API:

```bash
export WEB_IP=$(kubectl get svc web -n personalizedline -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Your API is available at: http://${WEB_IP}"

# Test health endpoint
curl http://${WEB_IP}/health
```

---

## Step 7: Verify Auto-Scaling (10 minutes)

### Check initial state:

```bash
# Should see 2 workers (minimum)
kubectl get pods -n personalizedline -l app=rq-worker

# Check KEDA scaler
kubectl get scaledobject -n personalizedline

# View scaler details
kubectl describe scaledobject rq-worker-scaler -n personalizedline
```

### Test scaling:

```bash
# Port-forward to web service
kubectl port-forward svc/web 8000:80 -n personalizedline &

# Submit test jobs (replace with your actual endpoint)
for i in {1..100}; do
  curl -X POST http://localhost:8000/jobs \
    -H "Content-Type: application/json" \
    -d "{\"data\": \"test-job-${i}\"}" &
done

# Watch workers scale up
watch kubectl get pods -n personalizedline -l app=rq-worker

# Check Redis queue length
kubectl exec -it deployment/redis -n personalizedline -- redis-cli LLEN rq:queue:default

# View HPA metrics
kubectl get hpa -n personalizedline
```

**Expected behavior:**
- 100 jobs → scales to ~10 workers (1:10 ratio)
- Scaling happens in ~30-60 seconds
- After jobs complete, scales back down to 2 workers

---

## Step 8: Setup CI/CD with Cloud Build (15 minutes)

### Option A: GitHub Actions with GCR (Recommended)

Update your GitHub repository secrets:

```bash
# Create a service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create github-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Get base64 encoded key for GitHub secret
cat github-key.json | base64
```

Add these secrets to GitHub (Settings → Secrets → Actions):

| Secret Name | Value |
|------------|-------|
| `GCP_PROJECT_ID` | Your project ID |
| `GCP_SA_KEY` | Base64 encoded service account key |
| `GKE_CLUSTER_NAME` | `personalizedline` |
| `GKE_REGION` | `us-central1` |

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`. Update it:

```bash
# Use the GKE-specific workflow
cp .github/workflows/deploy-gke.yml .github/workflows/deploy.yml
```

### Option B: Native Cloud Build (Alternative)

```bash
# Create cloudbuild.yaml
cat > cloudbuild.yaml << 'EOF'
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'backend/app/Dockerfile', '-t', 'gcr.io/$PROJECT_ID/personalizedline:$SHORT_SHA', '.']

  # Push the container image to GCR
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/personalizedline:$SHORT_SHA']

  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/kubectl'
    args:
      - 'set'
      - 'image'
      - 'deployment/web'
      - 'web=gcr.io/$PROJECT_ID/personalizedline:$SHORT_SHA'
      - '-n'
      - 'personalizedline'
    env:
      - 'CLOUDSDK_COMPUTE_REGION=us-central1'
      - 'CLOUDSDK_CONTAINER_CLUSTER=personalizedline'

  - name: 'gcr.io/cloud-builders/kubectl'
    args:
      - 'set'
      - 'image'
      - 'deployment/rq-worker'
      - 'worker=gcr.io/$PROJECT_ID/personalizedline:$SHORT_SHA'
      - '-n'
      - 'personalizedline'
    env:
      - 'CLOUDSDK_COMPUTE_REGION=us-central1'
      - 'CLOUDSDK_CONTAINER_CLUSTER=personalizedline'

images:
  - 'gcr.io/$PROJECT_ID/personalizedline:$SHORT_SHA'
EOF

# Connect Cloud Build to GitHub
gcloud alpha builds triggers create github \
  --repo-name=personalizedLine \
  --repo-owner=rahul3355 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## Monitoring & Observability (Optional - 10 minutes)

### Enable Google Cloud Monitoring

```bash
# Monitoring is enabled by default on GKE
# View logs in Cloud Console
echo "Logs: https://console.cloud.google.com/logs/query?project=${PROJECT_ID}"

# View metrics
echo "Metrics: https://console.cloud.google.com/monitoring?project=${PROJECT_ID}"

# Install Workload Identity for better security (optional)
gcloud iam service-accounts create gke-workload \
  --display-name="GKE Workload Identity"

gcloud iam service-accounts add-iam-policy-binding \
  gke-workload@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:${PROJECT_ID}.svc.id.goog[personalizedline/default]"
```

### View logs with kubectl:

```bash
# Tail web logs
kubectl logs -f deployment/web -n personalizedline

# Tail worker logs
kubectl logs -f deployment/rq-worker -n personalizedline

# View all logs
kubectl logs -l app=rq-worker -n personalizedline --tail=100
```

---

## Cost Management

### Autopilot Pricing (Pay per pod):
- **Idle (2 workers + web + redis):** ~$20-30/month
- **Peak (1000 workers):** ~$6-8/hour
- **vCPU:** $0.10/hr per vCPU
- **Memory:** $0.012/hr per GB

### Standard Cluster Pricing:
- **Base cost:** ~$48/month per node (n1-standard-2)
- **Additional pods:** ~$0.01/hr per pod
- **Minimum:** ~$48-96/month (2 nodes)

### Cost Optimization Tips:

```bash
# Use preemptible VMs (80% discount) for workers
gcloud container node-pools create preemptible-pool \
  --cluster=personalizedline \
  --region=us-central1 \
  --machine-type=n1-standard-2 \
  --preemptible \
  --enable-autoscaling \
  --min-nodes=0 \
  --max-nodes=10

# Add node selector to worker deployment
# nodeSelector:
#   cloud.google.com/gke-preemptible: "true"

# Use committed use discounts (57% discount)
# https://console.cloud.google.com/compute/commitments

# Enable cluster autoscaling
gcloud container clusters update personalizedline \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --region=us-central1
```

---

## Troubleshooting

### Pods not starting:

```bash
# Check pod status
kubectl get pods -n personalizedline

# Describe pod for events
kubectl describe pod <pod-name> -n personalizedline

# Check logs
kubectl logs <pod-name> -n personalizedline
```

### Image pull errors:

```bash
# Verify GCR authentication
gcloud auth configure-docker

# Check image exists
gcloud container images list --repository=gcr.io/${PROJECT_ID}

# Grant GKE access to GCR
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/storage.objectViewer
```

### Workers not scaling:

```bash
# Check KEDA operator logs
kubectl logs -f deployment/keda-operator -n keda

# Check scaler status
kubectl get scaledobject -n personalizedline -o yaml

# Verify Redis connection
kubectl exec -it deployment/redis -n personalizedline -- redis-cli ping
```

### High costs:

```bash
# Check current pod count
kubectl get pods -n personalizedline | grep rq-worker | wc -l

# View resource usage
kubectl top pods -n personalizedline

# Check if workers are scaling down
kubectl get hpa -n personalizedline -w

# Reduce max workers if needed
kubectl edit scaledobject rq-worker-scaler -n personalizedline
# Change maxReplicaCount to lower value
```

---

## Production Checklist

- [ ] Enable Google Cloud Armor (DDoS protection)
- [ ] Configure Cloud CDN for static assets
- [ ] Set up Cloud SQL for production database
- [ ] Enable Cloud Logging and Monitoring
- [ ] Configure alerting policies
- [ ] Set up backup for Redis (Cloud Memorystore)
- [ ] Enable Binary Authorization for image security
- [ ] Configure Network Policies
- [ ] Set up Cloud NAT for egress traffic
- [ ] Enable Workload Identity
- [ ] Configure resource quotas
- [ ] Set up multi-region deployment
- [ ] Enable GKE Autopilot security features
- [ ] Configure custom domains with Cloud DNS
- [ ] Set up SSL/TLS with Google-managed certificates

---

## Quick Reference

### Essential Commands:

```bash
# Get cluster credentials
gcloud container clusters get-credentials personalizedline --region=us-central1

# View all resources
kubectl get all -n personalizedline

# Scale workers manually
kubectl scale deployment rq-worker --replicas=20 -n personalizedline

# Update image
kubectl set image deployment/web web=gcr.io/${PROJECT_ID}/personalizedline:new-version -n personalizedline

# Restart deployment
kubectl rollout restart deployment/web -n personalizedline

# View resource usage
kubectl top pods -n personalizedline
kubectl top nodes

# Access Cloud Console
echo "https://console.cloud.google.com/kubernetes/list?project=${PROJECT_ID}"
```

---

## Next Steps

1. **Enable monitoring** - Set up Cloud Monitoring dashboards
2. **Configure alerts** - Get notified when workers scale or errors occur
3. **Set up domain** - Configure custom domain with Cloud DNS
4. **Enable HTTPS** - Use Google-managed SSL certificates
5. **Implement backups** - Use Cloud Memorystore for Redis
6. **Multi-region** - Deploy to multiple regions for HA

---

## Support & Resources

- **GKE Documentation:** https://cloud.google.com/kubernetes-engine/docs
- **KEDA Documentation:** https://keda.sh/docs/
- **GCP Pricing Calculator:** https://cloud.google.com/products/calculator
- **GCP Status:** https://status.cloud.google.com/

---

**Deployment Time:** 45-60 minutes
**Auto-scaling:** 30-60 seconds
**Cost (idle):** ~$20-30/month
**Cost (peak 1000 workers):** ~$6-8/hour

🎉 You're ready to scale on Google Cloud!
