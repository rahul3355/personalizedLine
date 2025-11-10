# PersonalizedLine - Kubernetes Deployment Guide

Deploy your auto-scaling job processing system in **under 1 hour**.

## Architecture

```
                                  ┌─────────────┐
                                  │   FastAPI   │
                                  │  Web Server │
                                  └──────┬──────┘
                                         │
                                         ▼
┌──────────┐           ┌──────────────────────────────┐
│  Redis   │◄──────────┤   RQ Workers (Auto-scaling)  │
│  Queue   │           │   Min: 2   │   Max: 1000     │
└──────────┘           │   1 worker per 10 jobs       │
                       └──────────────────────────────┘
                                     ▲
                                     │
                              ┌──────┴──────┐
                              │    KEDA     │
                              │  Scaler     │
                              └─────────────┘
```

## Quick Start (1 Hour Deployment)

### Step 1: Choose Your Cloud Provider (5 minutes)

Pick one based on your needs:

#### **Option A: DigitalOcean (Recommended - Easiest)**
```bash
# Install doctl
brew install doctl  # or: snap install doctl

# Authenticate
doctl auth init

# Create cluster (takes ~4 minutes)
doctl kubernetes cluster create personalizedline \
  --region nyc1 \
  --node-pool "name=workers;size=s-2vcpu-4gb;count=2;auto-scale=true;min-nodes=2;max-nodes=10"

# Get kubeconfig
doctl kubernetes cluster kubeconfig save personalizedline
```

**Cost:** ~$24/month idle, ~$4-5/hr at 1000 workers

#### **Option B: Google GKE (Best Performance)**
```bash
# Install gcloud
brew install google-cloud-sdk

# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Create GKE Autopilot cluster (takes ~5 minutes)
gcloud container clusters create-auto personalizedline \
  --region=us-central1

# Get credentials
gcloud container clusters get-credentials personalizedline --region=us-central1
```

**Cost:** ~$72/month idle, ~$6-8/hr at 1000 workers

#### **Option C: AWS EKS (Most Flexible)**
```bash
# Install eksctl
brew install eksctl

# Create cluster (takes ~15 minutes)
eksctl create cluster \
  --name personalizedline \
  --region us-east-1 \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 10

# Kubeconfig is automatically configured
```

**Cost:** ~$73/month (includes control plane), ~$5-7/hr at 1000 workers

---

### Step 2: Install KEDA (5 minutes)

KEDA is the magic that makes auto-scaling work.

```bash
# Add KEDA Helm repo
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Install KEDA
kubectl create namespace keda
helm install keda kedacore/keda --namespace keda

# Verify installation
kubectl get pods -n keda
```

You should see `keda-operator` and `keda-metrics-apiserver` running.

---

### Step 3: Build and Push Docker Image (10 minutes)

```bash
# Set your Docker registry
export DOCKER_REGISTRY="docker.io"  # or gcr.io, registry.digitalocean.com, etc.
export DOCKER_USERNAME="your-username"
export DOCKER_IMAGE="${DOCKER_REGISTRY}/${DOCKER_USERNAME}/personalizedline"

# Login to Docker registry
docker login ${DOCKER_REGISTRY}

# Build image (multi-stage for speed)
docker build -f backend/app/Dockerfile -t ${DOCKER_IMAGE}:latest .

# Push image
docker push ${DOCKER_IMAGE}:latest

# Set version tag
export VERSION="$(git rev-parse --short HEAD)"
docker tag ${DOCKER_IMAGE}:latest ${DOCKER_IMAGE}:${VERSION}
docker push ${DOCKER_IMAGE}:${VERSION}
```

---

### Step 4: Configure Secrets (5 minutes)

```bash
# Copy example secrets
cp k8s/secrets.yaml.example k8s/secrets.yaml

# Edit with your actual values
nano k8s/secrets.yaml  # or vim, code, etc.

# Add all your environment variables from .env
```

**Example secrets.yaml:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  OPENAI_API_KEY: "sk-..."
  DATABASE_URL: "postgresql://..."
  # Add all your .env variables here
```

---

### Step 5: Deploy to Kubernetes (5 minutes)

```bash
# Make deploy script executable
chmod +x deploy.sh

# Set environment variables
export DOCKER_IMAGE="${DOCKER_REGISTRY}/${DOCKER_USERNAME}/personalizedline"
export VERSION="latest"  # or your git SHA

# Run deployment
./deploy.sh
```

The script will:
- ✅ Create namespace
- ✅ Apply secrets
- ✅ Deploy Redis
- ✅ Deploy Web API
- ✅ Deploy Workers (2 replicas)
- ✅ Configure KEDA auto-scaler

---

### Step 6: Verify Deployment (5 minutes)

```bash
# Check all pods are running
kubectl get pods -n personalizedline

# Check KEDA scaler
kubectl get scaledobject -n personalizedline

# Check services
kubectl get svc -n personalizedline

# Get web service external IP
kubectl get svc web -n personalizedline -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

**Expected output:**
```
NAME                        READY   STATUS    RESTARTS   AGE
redis-xxxxxxxxxx-xxxxx      1/1     Running   0          2m
web-xxxxxxxxxx-xxxxx        1/1     Running   0          2m
web-xxxxxxxxxx-xxxxx        1/1     Running   0          2m
rq-worker-xxxxxxxxxx-xxxxx  1/1     Running   0          2m
rq-worker-xxxxxxxxxx-xxxxx  1/1     Running   0          2m
```

---

### Step 7: Test Auto-Scaling (10 minutes)

```bash
# Port-forward to web service
kubectl port-forward svc/web 8000:80 -n personalizedline &

# Submit a test job (use your API endpoint)
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'

# Watch workers scale up
watch kubectl get pods -n personalizedline

# Check KEDA metrics
kubectl get hpa -n personalizedline
```

**What to expect:**
- **0-10 jobs:** 2 workers (minimum)
- **10-100 jobs:** Scales to 10 workers
- **100-1000 jobs:** Scales to 100 workers
- **1000-10000 jobs:** Scales to 1000 workers

Scaling happens in ~30-60 seconds.

---

### Step 8: Setup CI/CD (15 minutes)

Configure GitHub Actions for automated deployments.

#### Add GitHub Secrets:

Go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|------------|-------|
| `DOCKER_REGISTRY` | `docker.io` or your registry |
| `DOCKER_REGISTRY_URL` | `https://index.docker.io/v1/` |
| `DOCKER_USERNAME` | Your Docker username |
| `DOCKER_PASSWORD` | Your Docker password/token |
| `KUBE_CONFIG` | `cat ~/.kube/config \| base64` |

#### Test CI/CD:

```bash
# Make a change
echo "# Test change" >> README.md

# Commit and push
git add .
git commit -m "Test CI/CD pipeline"
git push origin main

# Watch GitHub Actions
# Go to: https://github.com/your-user/personalizedLine/actions
```

The pipeline will:
1. Build Docker image
2. Push to registry
3. Deploy to Kubernetes
4. Verify rollout

**Total deployment time:** ~2-3 minutes per push

---

## Monitoring & Debugging

### View Logs

```bash
# Web API logs
kubectl logs -f deployment/web -n personalizedline

# Worker logs
kubectl logs -f deployment/rq-worker -n personalizedline

# Redis logs
kubectl logs -f deployment/redis -n personalizedline

# KEDA logs
kubectl logs -f deployment/keda-operator -n keda
```

### Check Auto-Scaling Status

```bash
# Current worker count
kubectl get deployment rq-worker -n personalizedline

# KEDA scaler details
kubectl describe scaledobject rq-worker-scaler -n personalizedline

# HPA (Horizontal Pod Autoscaler) metrics
kubectl get hpa -n personalizedline -w
```

### Common Issues

#### Workers not scaling up:
```bash
# Check Redis queue length
kubectl exec -it deployment/redis -n personalizedline -- redis-cli LLEN rq:queue:default

# Check KEDA metrics
kubectl logs -f deployment/keda-operator -n keda | grep rq-worker
```

#### Image pull errors:
```bash
# Check secrets
kubectl get secrets -n personalizedline

# Create Docker registry secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=${DOCKER_REGISTRY} \
  --docker-username=${DOCKER_USERNAME} \
  --docker-password=${DOCKER_PASSWORD} \
  -n personalizedline

# Add to deployment
# imagePullSecrets:
# - name: regcred
```

---

## Scaling Configuration

### Adjust Worker Limits

Edit `k8s/keda-scaler.yaml`:

```yaml
spec:
  minReplicaCount: 5          # Increase minimum workers
  maxReplicaCount: 2000       # Increase maximum workers
  triggers:
  - type: redis
    metadata:
      listLength: "5"          # 1 worker per 5 jobs (more aggressive)
```

Apply changes:
```bash
kubectl apply -f k8s/keda-scaler.yaml -n personalizedline
```

### Adjust Worker Resources

Edit `k8s/worker.yaml`:

```yaml
resources:
  requests:
    memory: "150Mi"    # Increase if workers need more RAM
    cpu: "150m"
  limits:
    memory: "200Mi"
    cpu: "250m"
```

Apply changes:
```bash
export DOCKER_IMAGE VERSION
envsubst < k8s/worker.yaml | kubectl apply -f - -n personalizedline
```

---

## Cost Optimization

### Idle Cost (2 workers + Redis)
- **DigitalOcean:** ~$24/month
- **GKE Autopilot:** ~$72/month
- **AWS EKS:** ~$73/month

### Peak Cost (1000 workers @ 100MB each)
- **DigitalOcean:** ~$5/hour
- **GKE Autopilot:** ~$7/hour
- **AWS EKS:** ~$6/hour

### Tips to Save Money:

1. **Use spot instances** (AWS/GKE):
   ```bash
   # GKE
   gcloud container node-pools create spot-pool \
     --cluster=personalizedline \
     --spot

   # AWS
   eksctl create nodegroup --cluster=personalizedline --spot
   ```

2. **Set aggressive scale-down**:
   ```yaml
   cooldownPeriod: 60  # Scale down faster when idle
   ```

3. **Use burstable instances** for low baseline usage:
   - AWS: `t3.small` ($0.0208/hr)
   - GKE: `e2-small` ($0.017/hr)
   - DO: `s-1vcpu-2gb` ($12/month)

---

## Production Checklist

- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation (Loki/ELK)
- [ ] Set up alerts (PagerDuty/Slack)
- [ ] Enable pod disruption budgets
- [ ] Configure network policies
- [ ] Set up backup for Redis (persistence)
- [ ] Configure ingress with TLS (cert-manager)
- [ ] Set resource quotas per namespace
- [ ] Enable cluster autoscaling
- [ ] Configure pod security policies

---

## Next Steps

1. **Add Monitoring:**
   ```bash
   helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
   ```

2. **Add Ingress Controller:**
   ```bash
   helm install nginx-ingress ingress-nginx/ingress-nginx -n ingress --create-namespace
   ```

3. **Add Redis Persistence:**
   - Use StatefulSet instead of Deployment
   - Add PersistentVolumeClaim

4. **Multi-region Deployment:**
   - Deploy to multiple clusters
   - Use global load balancer

---

## Support

**Issues?** Check:
- [KEDA Troubleshooting](https://keda.sh/docs/latest/troubleshooting/)
- [Kubernetes Debugging](https://kubernetes.io/docs/tasks/debug/)

**Questions?** File an issue in this repo.

---

**Total Setup Time:** 45-60 minutes
**Deployment Time per Change:** 2-3 minutes
**Auto-scaling Response:** 30-60 seconds

🚀 You're ready to scale!
