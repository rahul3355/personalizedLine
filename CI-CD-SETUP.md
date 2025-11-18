# CI/CD Pipeline Setup Guide

This guide will help you set up automatic deployments to GKE using GitHub Actions.

## 📋 Overview

**What you get:**
- ✅ Automatic deployment to GKE on every push to `main`
- ✅ Docker image tagging with git commit SHA (for easy rollback)
- ✅ Zero-downtime deployments (using Kubernetes rolling updates)
- ✅ One-click rollback via GitHub UI
- ✅ Deployment history tracking

**What happens on push:**
1. GitHub Actions triggers automatically
2. Builds Docker image (tagged with git SHA)
3. Pushes to Google Container Registry
4. Updates deployments on GKE (web + worker)
5. Waits for rollout to complete
6. Reports success/failure

**Time:** ~3-5 minutes per deployment

---

## 🚀 Initial Setup (One-Time)

### Step 1: Create GCP Service Account

Run the setup script from your project root:

```bash
bash setup-github-actions.sh
```

This script will:
- Create a service account named `github-actions-deployer`
- Grant necessary permissions (GKE, GCR access)
- Generate a JSON key file: `github-actions-key.json`

**Note:** Keep this key file secure! It will be used in the next step.

### Step 2: Add Secret to GitHub

1. **Copy the key content:**
   ```bash
   cat github-actions-key.json
   ```

2. **Go to your GitHub repository:**
   - Navigate to: `Settings` → `Secrets and variables` → `Actions`
   - Click: `New repository secret`

3. **Add the secret:**
   - **Name:** `GCP_SA_KEY`
   - **Value:** Paste the entire contents of `github-actions-key.json`
   - Click: `Add secret`

4. **Delete the key file locally (for security):**
   ```bash
   rm github-actions-key.json
   ```

### Step 3: Push the CI/CD Configuration

```bash
git add .github/workflows/ k8s/ .gitignore
git commit -m "Add CI/CD pipeline for automatic GKE deployments"
git push origin main
```

**That's it!** The first deployment will trigger automatically.

---

## 📦 How to Deploy

### Automatic Deployment

Simply push to the `main` branch:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

GitHub Actions will:
1. Detect changes in `backend/`, `k8s/`, or workflow files
2. Build and deploy automatically
3. Notify you of success/failure

### Monitor Deployment

**In GitHub:**
- Go to: `Actions` tab in your repository
- Click on the running workflow
- Watch live logs

**From command line:**
```bash
# Watch deployment progress
kubectl rollout status deployment/web -n personalizedline
kubectl rollout status deployment/rq-worker -n personalizedline

# Check pod status
kubectl get pods -n personalizedline
```

---

## 🔄 How to Rollback

### Option 1: GitHub UI (Easiest)

1. Go to: `Actions` tab → `Rollback GKE Deployment`
2. Click: `Run workflow`
3. Select:
   - **Service:** `both` (or `web`/`worker` individually)
   - **Revision:** Leave empty for previous version
4. Click: `Run workflow`

### Option 2: Command Line

```bash
# Rollback both services to previous version
kubectl rollout undo deployment/web -n personalizedline
kubectl rollout undo deployment/rq-worker -n personalizedline

# Rollback to specific revision
kubectl rollout undo deployment/web --to-revision=3 -n personalizedline

# View rollout history
kubectl rollout history deployment/web -n personalizedline
```

---

## 🔍 Troubleshooting

### Deployment Failed

1. **Check GitHub Actions logs:**
   - Go to `Actions` tab → Click on failed workflow
   - Review error messages

2. **Common issues:**

   **Build failed:**
   ```
   Error: Docker build failed
   ```
   - Check `backend/app/Dockerfile` for syntax errors
   - Ensure all required files are committed

   **Push to GCR failed:**
   ```
   Error: unauthorized
   ```
   - Verify `GCP_SA_KEY` secret is correct
   - Check service account has `storage.admin` role

   **Deployment failed:**
   ```
   Error: deployment "web" exceeded its progress deadline
   ```
   - Check pod logs: `kubectl logs -l app=web -n personalizedline`
   - Check events: `kubectl get events -n personalizedline`

3. **Check pod status:**
   ```bash
   kubectl get pods -n personalizedline
   kubectl describe pod <pod-name> -n personalizedline
   kubectl logs <pod-name> -n personalizedline
   ```

### Rollback Failed

If rollback fails, you can manually specify an image:

```bash
# List recent images
gcloud container images list-tags gcr.io/personalizedline-prod/personalizedline --limit=10

# Manually set image to specific SHA
kubectl set image deployment/web \
  web=gcr.io/personalizedline-prod/personalizedline:<git-sha> \
  -n personalizedline
```

---

## 📊 Deployment History

### View Deployment History

```bash
# View rollout history
kubectl rollout history deployment/web -n personalizedline
kubectl rollout history deployment/rq-worker -n personalizedline

# View specific revision details
kubectl rollout history deployment/web --revision=5 -n personalizedline
```

### Check Current Image Version

```bash
# See which image is currently deployed
kubectl get deployment web -n personalizedline -o jsonpath='{.spec.template.spec.containers[0].image}'
kubectl get deployment rq-worker -n personalizedline -o jsonpath='{.spec.template.spec.containers[0].image}'
```

---

## 🔧 Configuration

### Workflow Triggers

The deployment workflow triggers on:
- Push to `main` branch
- Changes in `backend/**`, `k8s/**`, or workflow files

**To disable auto-deploy temporarily:**
1. Go to: `Actions` tab → `Deploy to GKE` workflow
2. Click: `⋮` (three dots) → `Disable workflow`

### Environment Variables

Edit `.github/workflows/deploy-gke.yml` to customize:

```yaml
env:
  PROJECT_ID: personalizedline-prod      # GCP project ID
  GKE_CLUSTER: personalized-cluster      # GKE cluster name
  GKE_REGION: us-central1                # GKE region
  GKE_NAMESPACE: personalizedline        # Kubernetes namespace
  IMAGE_NAME: personalizedline           # Docker image name
```

---

## 🎯 Best Practices

### Before Pushing

1. **Test locally:**
   ```bash
   docker-compose up
   # Test your changes
   ```

2. **Check for errors:**
   ```bash
   # Python linting (if you have it)
   pylint backend/app/
   ```

3. **Write descriptive commit messages:**
   ```bash
   git commit -m "Fix authentication bug in /api/login endpoint"
   # This appears in deployment annotations!
   ```

### After Deployment

1. **Verify health:**
   ```bash
   # Check health endpoint
   curl https://your-domain.com/health

   # Check pod status
   kubectl get pods -n personalizedline
   ```

2. **Monitor logs:**
   ```bash
   # Tail logs
   kubectl logs -f -l app=web -n personalizedline
   kubectl logs -f -l app=rq-worker -n personalizedline
   ```

### Image Cleanup

Old images accumulate in GCR. Clean them up periodically:

```bash
# List images (sorted by date)
gcloud container images list-tags gcr.io/personalizedline-prod/personalizedline \
  --format='table(tags,timestamp.datetime)' \
  --sort-by=~timestamp

# Delete images older than 30 days (keep latest)
gcloud container images list-tags gcr.io/personalizedline-prod/personalizedline \
  --filter="timestamp.datetime < $(date -d '30 days ago' --iso-8601)" \
  --format="get(digest)" | \
  xargs -I {} gcloud container images delete gcr.io/personalizedline-prod/personalizedline@{} --quiet
```

---

## 📚 Additional Resources

- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **GKE Docs:** https://cloud.google.com/kubernetes-engine/docs
- **Kubernetes Deployments:** https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

---

## 🆘 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Check Kubernetes events: `kubectl get events -n personalizedline`
4. Check pod logs: `kubectl logs -l app=web -n personalizedline`

---

## 📝 Summary

**Setup:** One-time (~10 minutes)
- Run `setup-github-actions.sh`
- Add `GCP_SA_KEY` to GitHub Secrets
- Push workflow files

**Deploy:** Automatic
- Push to `main`
- Wait 3-5 minutes
- Done!

**Rollback:** One-click
- GitHub Actions tab → Run rollback workflow
- Or: `kubectl rollout undo deployment/web -n personalizedline`

**Your workflow is now 10x faster!** 🚀
