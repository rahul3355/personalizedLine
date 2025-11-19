# CI/CD Quick Start Guide

## 🚀 3-Step Setup (10 minutes)

### Step 1: Create GCP Service Account (5 min)

```bash
bash setup-github-actions.sh
```

This creates a service account and generates `github-actions-key.json`.

### Step 2: Add Secret to GitHub (2 min)

1. Copy the key:
   ```bash
   cat github-actions-key.json
   ```

2. Go to GitHub:
   - Your repo → Settings → Secrets and variables → Actions → New repository secret

3. Add secret:
   - **Name:** `GCP_SA_KEY`
   - **Value:** (paste entire JSON content)

4. Delete the key file:
   ```bash
   rm github-actions-key.json
   ```

### Step 3: Push to GitHub (1 min)

```bash
git add .github/workflows/ k8s/ .gitignore CI-CD-SETUP.md
git commit -m "Add CI/CD pipeline"
git push origin main
```

**Done!** ✅ Your first deployment starts automatically.

---

## 📦 Daily Usage

### Deploy (Automatic)

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Wait 3-5 minutes. Done! ✨

### Rollback (If Needed)

**GitHub UI:**
- Actions tab → "Rollback GKE Deployment" → Run workflow

**Command Line:**
```bash
kubectl rollout undo deployment/web -n personalizedline
kubectl rollout undo deployment/rq-worker -n personalizedline
```

### Monitor

**GitHub:**
- Actions tab → Click running workflow → Watch logs

**Command Line:**
```bash
kubectl get pods -n personalizedline
kubectl logs -f -l app=web -n personalizedline
```

---

## 🆘 Troubleshooting

**Deployment failed?**
```bash
# Check pod status
kubectl get pods -n personalizedline

# Check logs
kubectl logs -l app=web -n personalizedline

# Check events
kubectl get events -n personalizedline --sort-by='.lastTimestamp' | tail -20
```

**See full documentation:** `CI-CD-SETUP.md`

---

## 📊 What You Get

- ✅ Auto-deploy on push to `main`
- ✅ Docker images tagged with git SHA
- ✅ Zero-downtime deployments
- ✅ Easy rollback (one command or UI click)
- ✅ Deployment history tracking
- ✅ ~10+ hours saved per month!

**Time investment:** 10 minutes setup
**Time saved:** 15-20 minutes per deployment × multiple deploys/day = HUGE! 🎉
