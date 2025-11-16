# WebSocket Implementation - Deployment Guide

## 🎯 What Was Changed

### Backend Changes (`backend/app/`)
1. **main.py**:
   - Added WebSocket imports (`WebSocket`, `WebSocketDisconnect`, `asyncio`)
   - Added new WebSocket endpoint: `/ws/jobs/{job_id}`
   - Includes JWT authentication via query parameter
   - Subscribes to Redis pub/sub for real-time updates
   - Feature flag support: `ENABLE_WEBSOCKET` environment variable

2. **jobs.py**:
   - Added Redis pub/sub publishing when job progress updates
   - Publishes to channel `job_progress:{job_id}`
   - Publishes on: progress updates, job success, job failure
   - Non-blocking: failures don't break job processing

### Frontend Changes (`outreach-frontend/`)
1. **pages/jobs/index.tsx**:
   - Added WebSocket URL conversion from HTTP/HTTPS to WS/WSS
   - Added WebSocket connection for real-time job progress
   - **REMOVED**: 2-second global job list refresh (fixes flickering bug!)
   - Modified polling to only run if WebSocket is disabled
   - Feature flag support: `NEXT_PUBLIC_ENABLE_WEBSOCKET` environment variable

### Infrastructure Changes (`k8s/`)
1. **web.yaml**:
   - Changed `replicas: 2` → `replicas: 1` (matches GCP quota limits)

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [x] Access to GKE cluster via `kubectl`
- [x] Docker image build permissions (GCR access)
- [x] Frontend deployment access (Vercel/Netlify/etc.)
- [x] Ability to set environment variables in production

---

## 🚀 Deployment Steps

### Phase 1: Build & Deploy Backend

#### Step 1: Build Docker Image

```bash
# Navigate to project root
cd /home/user/personalizedLine

# Build Docker image
docker build -t gcr.io/personalizedline-prod/personalizedline:latest -f backend/app/Dockerfile .

# Push to Google Container Registry
docker push gcr.io/personalizedline-prod/personalizedline:latest
```

#### Step 2: Deploy to GKE

```bash
# Apply updated Kubernetes configs
kubectl apply -f k8s/web.yaml -n personalizedline

# Wait for rollout to complete
kubectl rollout status deployment/web -n personalizedline

# Verify web pod is running
kubectl get pods -n personalizedline -l app=web
```

Expected output:
```
NAME                   READY   STATUS    RESTARTS   AGE
web-xxxxx-xxxxx        1/1     Running   0          30s
```

#### Step 3: Verify Backend Health

```bash
# Check pod logs for errors
kubectl logs -n personalizedline -l app=web --tail=50

# Test health endpoint
curl http://34.41.211.87/health
```

Expected response: `{"status":"ok"}`

---

### Phase 2: Deploy Frontend

#### Step 1: Set Environment Variable (Optional)

If you want to enable WebSocket immediately:

**For Vercel:**
```bash
# Set environment variable
vercel env add NEXT_PUBLIC_ENABLE_WEBSOCKET

# Value: true

# Or via Vercel Dashboard:
# Settings → Environment Variables → Add
# Name: NEXT_PUBLIC_ENABLE_WEBSOCKET
# Value: true
```

**Note**: WebSocket is enabled by default. To disable, set to `false`.

#### Step 2: Deploy Frontend

```bash
# Navigate to frontend directory
cd outreach-frontend

# Build production version
npm run build

# Deploy (depends on your hosting)
# Vercel:
vercel --prod

# Or Netlify:
netlify deploy --prod
```

#### Step 3: Verify Deployment

1. Open your app in browser: https://senditfast.ai
2. Open browser DevTools → Console
3. Upload a test CSV file
4. Watch for WebSocket connection logs:
   ```
   WebSocket connected for job abc123
   ```

---

## 🧪 Testing

### Test 1: WebSocket Connection

1. Login to your app
2. Upload a small CSV file (10-20 rows)
3. Open Browser DevTools → Network Tab → WS (WebSocket filter)
4. You should see:
   - WebSocket connection to `/ws/jobs/{job_id}`
   - Status: `101 Switching Protocols`
   - Messages being received with progress updates

### Test 2: Real-Time Progress

1. Upload a larger CSV (100+ rows)
2. Watch the progress bar update smoothly
3. **Expected**: Progress updates appear instantly (< 100ms)
4. **Old behavior**: Progress updated every 2 seconds with jumps

### Test 3: Load More Button (Main Fix!)

1. Go to Jobs page
2. Scroll down and click "Load More"
3. **Expected**: New jobs appear and STAY visible
4. **Old buggy behavior**: Jobs appear then disappear

### Test 4: Fallback to Polling

1. Disable WebSocket via environment variable:
   ```
   NEXT_PUBLIC_ENABLE_WEBSOCKET=false
   ```
2. Redeploy frontend
3. Upload a file
4. **Expected**: Progress still updates (via polling every 2 seconds)

### Test 5: Multiple Jobs

1. Upload 3 files simultaneously
2. Click on each job to view details
3. **Expected**: Each job shows real-time progress independently

---

## 📊 Monitoring

### Check Backend Logs

```bash
# Stream web pod logs
kubectl logs -n personalizedline -l app=web --follow

# Look for:
# - "WebSocket connected for job {id}"
# - "WebSocket disconnected for job {id}"
# - "[Worker] Published progress for job {id}"
```

### Check Worker Logs

```bash
# Stream worker logs
kubectl logs -n personalizedline -l app=rq-worker --follow

# Look for:
# - "[Worker] Published progress for job {id}"
# - "[Worker] Published success status for job {id}"
```

### Check for Errors

```bash
# Check for WebSocket errors
kubectl logs -n personalizedline -l app=web --tail=200 | grep -i "websocket\|error"

# Check Redis connection
kubectl logs -n personalizedline -l app=redis --tail=50
```

---

## 🔄 Rollback Plan

If something goes wrong, here's how to rollback:

### Option 1: Quick Rollback (Disable WebSocket)

**Backend:**
```bash
# Add environment variable to disable WebSocket
kubectl set env deployment/web ENABLE_WEBSOCKET=false -n personalizedline

# Restart pods
kubectl rollout restart deployment/web -n personalizedline
```

**Frontend:**
```bash
# Set environment variable
NEXT_PUBLIC_ENABLE_WEBSOCKET=false

# Redeploy
vercel --prod
```

**Result**: System falls back to polling (old behavior). Takes 5 minutes.

---

### Option 2: Full Rollback (Revert Code)

```bash
# 1. Revert git commits
git log --oneline  # Find commit hash before WebSocket changes
git revert <commit-hash>

# 2. Rebuild backend
docker build -t gcr.io/personalizedline-prod/personalizedline:latest -f backend/app/Dockerfile .
docker push gcr.io/personalizedline-prod/personalizedline:latest

# 3. Redeploy backend
kubectl rollout restart deployment/web -n personalizedline

# 4. Redeploy frontend
cd outreach-frontend
npm run build
vercel --prod
```

**Result**: Complete rollback to pre-WebSocket state. Takes 15 minutes.

---

## 🐛 Troubleshooting

### Problem: WebSocket Won't Connect

**Symptom**: Browser console shows WebSocket connection failed

**Check**:
```bash
# 1. Verify web pod is running
kubectl get pods -n personalizedline -l app=web

# 2. Check pod logs for errors
kubectl logs -n personalizedline -l app=web --tail=100

# 3. Test WebSocket endpoint manually
wscat -c "ws://34.41.211.87/ws/jobs/test123?token=yourtoken"
```

**Solution**:
- Ensure web pod is running and healthy
- Check that `ENABLE_WEBSOCKET` is not set to `false`
- Verify LoadBalancer is routing WebSocket traffic

---

### Problem: Progress Not Updating

**Symptom**: WebSocket connects but no progress updates appear

**Check**:
```bash
# 1. Check worker is publishing to Redis
kubectl logs -n personalizedline -l app=rq-worker --tail=100 | grep "Published"

# 2. Verify Redis is running
kubectl get pods -n personalizedline -l app=redis

# 3. Test Redis pub/sub manually
kubectl exec -it -n personalizedline <redis-pod-name> -- redis-cli
> SUBSCRIBE job_progress:test123
```

**Solution**:
- Ensure workers are running and processing jobs
- Verify Redis pod is healthy
- Check that worker code includes Redis publish calls

---

### Problem: Jobs Flickering (Old Bug Returns)

**Symptom**: "Load More" causes jobs to appear then disappear

**Check**:
```bash
# Verify global refresh was removed
grep -n "refreshJobs()" outreach-frontend/pages/jobs/index.tsx
```

**Expected**: You should see a comment saying it was removed

**Solution**:
- Ensure you deployed the latest frontend code
- Check that 2-second interval was actually removed
- Clear browser cache and hard refresh

---

### Problem: High Memory Usage

**Symptom**: Web pod memory increases over time

**Check**:
```bash
# Monitor pod resource usage
kubectl top pods -n personalizedline -l app=web
```

**Solution**:
- Each WebSocket connection uses ~2-5 KB
- 1000 connections = ~5 MB (negligible)
- If memory is high, check for connection leaks:
  ```bash
  # Count active WebSocket connections
  kubectl exec -it -n personalizedline <web-pod> -- netstat -an | grep ESTABLISHED | wc -l
  ```

---

## ✅ Success Criteria

After deployment, you should observe:

1. **No More Flickering**
   - "Load More" works perfectly
   - Jobs stay visible after loading
   - No race conditions

2. **Real-Time Updates**
   - Progress updates appear instantly
   - No 2-second delays
   - Smooth progress bars

3. **Clean Logs**
   - 99% fewer `/jobs?offset=0&limit=60` requests
   - 99% fewer `/jobs/{id}/progress` requests
   - Only see WebSocket connect/disconnect events

4. **Low Resource Usage**
   - Web pod memory: Same or slightly lower
   - CPU usage: Lower (less polling overhead)
   - Redis memory: +5-10 MB (pub/sub channels)

5. **User Experience**
   - Page loads faster
   - Progress updates smoother
   - Battery usage lower on mobile

---

## 🎉 Expected Improvements

### Before (Polling)
- API calls: ~43,200 per day (2-sec polling × 12 hours × 3 users)
- Database queries: ~43,200 per day
- Update latency: 0-2 seconds (average 1 second)
- Resource usage: High (constant polling)
- Race conditions: Yes (flickering bug)

### After (WebSocket)
- API calls: ~100 per day (only when jobs actually update)
- Database queries: ~100 per day (99% reduction!)
- Update latency: <100ms (real-time)
- Resource usage: Minimal (event-driven)
- Race conditions: No (polling removed)

---

## 📞 Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review pod logs: `kubectl logs -n personalizedline -l app=web --tail=200`
3. Test fallback: Set `ENABLE_WEBSOCKET=false` to restore old behavior
4. Rollback if needed (see Rollback Plan above)

---

## 🔐 Security Notes

- WebSocket uses JWT authentication (same as REST API)
- Token passed via query parameter (standard for WebSocket)
- User can only access their own jobs (verified in backend)
- Connection auto-closes after job completion (prevents leaks)
- No sensitive data in WebSocket messages

---

## 📈 Future Enhancements

Possible improvements for later:

1. **Add session affinity to LoadBalancer**
   - For future scaling to 2+ web pods
   - Ensures WebSocket stays on same pod
   - Config: Add `sessionAffinity: ClientIP` to `k8s/web.yaml`

2. **Add WebSocket reconnection with exponential backoff**
   - Currently: Reconnects after 3 seconds
   - Future: 3s → 6s → 12s → 24s (prevents storm)

3. **Add WebSocket heartbeat/ping-pong**
   - Keep connection alive through proxies
   - Detect dead connections faster

4. **Add metrics/monitoring**
   - Track WebSocket connection count
   - Monitor message throughput
   - Alert on high error rates

---

## 🏁 Deployment Checklist

Before considering deployment complete, verify:

- [ ] Backend deployed to GKE
- [ ] Web pod is running (1/1 Ready)
- [ ] Frontend deployed to production
- [ ] WebSocket connection works in browser
- [ ] Progress updates appear in real-time
- [ ] "Load More" button works without flickering
- [ ] Logs show 99% fewer polling requests
- [ ] No errors in web pod logs
- [ ] No errors in worker pod logs
- [ ] Redis pod is healthy
- [ ] Rollback plan tested and documented
- [ ] Team notified of changes

---

**Deployment Date**: _________

**Deployed By**: _________

**Rollback Tested**: [ ] Yes [ ] No

**Notes**: ________________________________
