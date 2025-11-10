# 🚀 GKE Quick Start - Deploy in 45 Minutes

Fast-track deployment guide for PersonalizedLine on Google Kubernetes Engine.

## What You'll Get

- ✅ 2 workers minimum, auto-scales to 1000
- ✅ 1:10 worker-to-job ratio
- ✅ 30-60 second scaling response
- ✅ ~$20-30/month idle, ~$6-8/hr at peak
- ✅ Full CI/CD pipeline

---

## Prerequisites (5 min)

```bash
# Install tools
brew install --cask google-cloud-sdk
brew install kubectl helm

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable container.googleapis.com containerregistry.googleapis.com
```

---

## Method 1: Automated Setup (Fastest - 30 min)

### Step 1: Create Cluster

```bash
./setup-gke.sh
```

This creates:
- GKE Autopilot cluster
- KEDA autoscaler
- Docker registry access
- Takes ~7 minutes

### Step 2: Build & Deploy

```bash
./deploy-gke.sh
```

This:
- Builds Docker image
- Pushes to GCR
- Deploys all services
- Takes ~10 minutes

### Step 3: Get External IP

```bash
kubectl get svc web -n personalizedline
# Wait for EXTERNAL-IP (2-3 min)
```

**Done! 🎉**

---

## Method 2: Manual Setup (45 min)

### 1. Create Cluster (7 min)

```bash
export PROJECT_ID=$(gcloud config get-value project)

gcloud container clusters create-auto personalizedline \
  --region=us-central1 \
  --release-channel=regular

gcloud container clusters get-credentials personalizedline --region=us-central1
```

### 2. Install KEDA (3 min)

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
kubectl create namespace keda
helm install keda kedacore/keda --namespace keda
```

### 3. Build & Push Image (10 min)

```bash
export PROJECT_ID=$(gcloud config get-value project)
export DOCKER_IMAGE="gcr.io/${PROJECT_ID}/personalizedline"

gcloud auth configure-docker

docker build -f backend/app/Dockerfile -t ${DOCKER_IMAGE}:latest .
docker push ${DOCKER_IMAGE}:latest
```

### 4. Configure Secrets (5 min)

```bash
cp k8s/secrets.yaml.example k8s/secrets.yaml
nano k8s/secrets.yaml  # Add your env vars
```

### 5. Deploy (5 min)

```bash
export VERSION="latest"

kubectl create namespace personalizedline
kubectl apply -f k8s/secrets.yaml -n personalizedline
kubectl apply -f k8s/redis.yaml -n personalizedline

envsubst < k8s/web.yaml | kubectl apply -f - -n personalizedline
envsubst < k8s/worker.yaml | kubectl apply -f - -n personalizedline
kubectl apply -f k8s/keda-scaler.yaml -n personalizedline
```

### 6. Wait for LoadBalancer (3 min)

```bash
kubectl get svc web -n personalizedline -w
# Wait for EXTERNAL-IP, then Ctrl+C
```

---

## Method 3: Terraform (Infrastructure as Code)

### Setup

```bash
cd terraform/gke
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Set project_id
```

### Deploy

```bash
terraform init
terraform plan
terraform apply  # Type 'yes' when prompted
```

### Get Credentials

```bash
terraform output -raw get_credentials_command | bash
```

### Deploy App

```bash
cd ../..
./deploy-gke.sh
```

---

## Verify Deployment

```bash
# Check pods
kubectl get pods -n personalizedline

# Expected output:
# redis-xxx          1/1  Running
# web-xxx            1/1  Running
# web-xxx            1/1  Running
# rq-worker-xxx      1/1  Running
# rq-worker-xxx      1/1  Running

# Check autoscaler
kubectl get scaledobject -n personalizedline

# Get external IP
export WEB_IP=$(kubectl get svc web -n personalizedline -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "API: http://${WEB_IP}"

# Test
curl http://${WEB_IP}/health
```

---

## Test Auto-Scaling (10 min)

```bash
# Port forward
kubectl port-forward svc/web 8000:80 -n personalizedline &

# Submit 100 jobs
for i in {1..100}; do
  curl -X POST http://localhost:8000/jobs \
    -H "Content-Type: application/json" \
    -d "{\"data\": \"test-${i}\"}" &
done

# Watch workers scale up
watch kubectl get pods -n personalizedline -l app=rq-worker

# Should scale to ~10 workers (100 jobs / 10 = 10 workers)
```

---

## Setup CI/CD (15 min)

### 1. Create Service Account

```bash
export PROJECT_ID=$(gcloud config get-value project)

gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud iam service-accounts keys create github-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com
```

### 2. Add GitHub Secrets

Go to: **Settings → Secrets → Actions**

| Secret | Value | How to Get |
|--------|-------|------------|
| `GCP_PROJECT_ID` | Your project ID | `gcloud config get-value project` |
| `GCP_SA_KEY` | Service account key | `cat github-key.json \| base64` |

### 3. Update Workflow

```bash
# Copy GKE-specific workflow
cp .github/workflows/deploy-gke.yml .github/workflows/deploy.yml

# Commit and push
git add .github/workflows/deploy.yml
git commit -m "Setup GKE CI/CD"
git push origin main
```

### 4. Test

Push any change to `main` branch → auto-deploys in 2-3 minutes!

---

## Essential Commands

```bash
# View logs
kubectl logs -f deployment/web -n personalizedline
kubectl logs -f deployment/rq-worker -n personalizedline

# Check scaling
kubectl get hpa -n personalizedline -w
kubectl get scaledobject -n personalizedline

# Scale manually (testing)
kubectl scale deployment rq-worker --replicas=50 -n personalizedline

# Restart deployment
kubectl rollout restart deployment/web -n personalizedline

# Update image
export NEW_VERSION="v2"
kubectl set image deployment/web web=gcr.io/${PROJECT_ID}/personalizedline:${NEW_VERSION} -n personalizedline

# Port forward
kubectl port-forward svc/web 8000:80 -n personalizedline

# Shell into pod
kubectl exec -it deployment/rq-worker -n personalizedline -- /bin/bash

# View all resources
kubectl get all -n personalizedline

# Cloud console
echo "https://console.cloud.google.com/kubernetes/list?project=${PROJECT_ID}"
```

---

## Cost Breakdown

### Autopilot Pricing
| Workers | vCPU | RAM | Cost/Hour | Cost/Month (24/7) |
|---------|------|-----|-----------|-------------------|
| 2 idle  | 0.4  | 400MB | ~$0.05 | ~$36 |
| 100     | 20   | 20GB  | ~$2.24 | - |
| 1000    | 200  | 200GB | ~$22.40 | - |

**You only pay when scaling!**

### Cost Optimization

```bash
# Enable cluster autoscaling
gcloud container clusters update personalizedline \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --region=us-central1

# Use preemptible nodes (Standard cluster only, 80% discount)
# See terraform/gke/README.md

# Set up committed use discounts (57% off)
# https://console.cloud.google.com/compute/commitments
```

---

## Troubleshooting

### Image pull errors

```bash
# Grant GKE access to GCR
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member=serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com \
  --role=roles/storage.objectViewer
```

### Workers not scaling

```bash
# Check KEDA logs
kubectl logs -f deployment/keda-operator -n keda

# Check Redis queue
kubectl exec -it deployment/redis -n personalizedline -- redis-cli LLEN rq:queue:default

# Check scaler
kubectl describe scaledobject rq-worker-scaler -n personalizedline
```

### High costs

```bash
# Check worker count
kubectl get pods -n personalizedline | grep rq-worker | wc -l

# Check resource usage
kubectl top pods -n personalizedline

# Reduce max workers
kubectl edit scaledobject rq-worker-scaler -n personalizedline
# Change maxReplicaCount
```

---

## Cleanup

### Delete Application

```bash
kubectl delete namespace personalizedline
```

### Delete Cluster

```bash
# Using gcloud
gcloud container clusters delete personalizedline --region=us-central1

# Or using Terraform
cd terraform/gke
terraform destroy
```

---

## Next Steps

1. **Add monitoring:** Install Prometheus/Grafana
2. **Custom domain:** Configure Cloud DNS + SSL
3. **Multi-region:** Deploy to multiple regions
4. **Cloud SQL:** Use managed PostgreSQL
5. **Cloud Memorystore:** Use managed Redis

See **GKE-DEPLOY.md** for complete production setup.

---

## Summary

| Task | Time | Command |
|------|------|---------|
| Setup cluster | 7 min | `./setup-gke.sh` |
| Deploy app | 10 min | `./deploy-gke.sh` |
| Setup CI/CD | 15 min | Add GitHub secrets |
| **Total** | **~45 min** | |

**Result:**
- 2-1000 auto-scaling workers
- 1:10 worker-job ratio
- ~$30/month idle
- 2-3 min deployments

🎉 **You're live on GKE!**
