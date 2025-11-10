# 🚀 Deploy in 1 Hour - Quick Reference

## Prerequisites (5 min)
```bash
# Install tools
brew install kubectl helm doctl  # or gcloud/aws cli

# Verify
kubectl version --client
helm version
```

## Setup Kubernetes (5 min)

**DigitalOcean (Easiest):**
```bash
doctl auth init
doctl kubernetes cluster create personalizedline \
  --region nyc1 \
  --node-pool "name=workers;size=s-2vcpu-4gb;count=2;auto-scale=true;min-nodes=2;max-nodes=10"
doctl kubernetes cluster kubeconfig save personalizedline
```

**GKE:**
```bash
gcloud auth login
gcloud container clusters create-auto personalizedline --region=us-central1
gcloud container clusters get-credentials personalizedline --region=us-central1
```

**EKS:**
```bash
eksctl create cluster --name personalizedline --region us-east-1 --nodes 2 --nodes-min 2 --nodes-max 10
```

## Install KEDA (5 min)
```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
kubectl create namespace keda
helm install keda kedacore/keda --namespace keda
```

## Build & Push Image (10 min)
```bash
export DOCKER_REGISTRY="docker.io"
export DOCKER_USERNAME="your-username"
export DOCKER_IMAGE="${DOCKER_REGISTRY}/${DOCKER_USERNAME}/personalizedline"

docker login ${DOCKER_REGISTRY}
docker build -f backend/app/Dockerfile -t ${DOCKER_IMAGE}:latest .
docker push ${DOCKER_IMAGE}:latest
```

## Configure Secrets (5 min)
```bash
cp k8s/secrets.yaml.example k8s/secrets.yaml
nano k8s/secrets.yaml  # Add your env vars
```

## Deploy (5 min)
```bash
export DOCKER_IMAGE="${DOCKER_REGISTRY}/${DOCKER_USERNAME}/personalizedline"
export VERSION="latest"
./deploy.sh
```

## Verify (5 min)
```bash
kubectl get pods -n personalizedline
kubectl get scaledobject -n personalizedline
kubectl get svc web -n personalizedline
```

## Test Auto-Scaling (10 min)
```bash
# Port-forward
kubectl port-forward svc/web 8000:80 -n personalizedline &

# Submit jobs
curl -X POST http://localhost:8000/jobs -H "Content-Type: application/json" -d '{"data": "test"}'

# Watch scale
watch kubectl get pods -n personalizedline
```

## Setup CI/CD (15 min)

Add to GitHub Secrets (Settings → Secrets):
- `DOCKER_REGISTRY`: `docker.io`
- `DOCKER_USERNAME`: your username
- `DOCKER_PASSWORD`: your token
- `KUBE_CONFIG`: `cat ~/.kube/config | base64`

Push to main branch - auto-deploys!

---

## Quick Commands

**View logs:**
```bash
kubectl logs -f deployment/web -n personalizedline
kubectl logs -f deployment/rq-worker -n personalizedline
```

**Scale manually:**
```bash
kubectl scale deployment rq-worker --replicas=10 -n personalizedline
```

**Update config:**
```bash
kubectl apply -f k8s/ -n personalizedline
```

**Delete everything:**
```bash
kubectl delete namespace personalizedline
```

---

**Total Time:** 45-60 minutes
**Your workers:** 2 → 1000 auto-scaling based on queue depth
**Cost idle:** ~$6-24/month
**Cost peak:** ~$4-8/hour

✅ Done! See DEPLOYMENT.md for full details.
