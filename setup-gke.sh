#!/usr/bin/env bash
set -euo pipefail

log() { printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
trap 'echo >&2 "[ERROR] Script aborted on line $LINENO."; exit 1' ERR

for cmd in gcloud kubectl helm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: \"$cmd\" is required but not on PATH." >&2
    exit 1
  fi
done

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project --quiet 2>/dev/null || true)}"
if [[ -z "$PROJECT_ID" ]]; then
  read -rp "Google Cloud project ID: " PROJECT_ID
fi

DEFAULT_REGION="${REGION:-us-central1}"
read -rp "GKE region [$DEFAULT_REGION]: " input_region
REGION="${input_region:-$DEFAULT_REGION}"

DEFAULT_CLUSTER="${CLUSTER_NAME:-personalizedline-cluster}"
read -rp "Cluster name [$DEFAULT_CLUSTER]: " input_cluster
CLUSTER_NAME="${input_cluster:-$DEFAULT_CLUSTER}"

echo
echo "About to create a GKE Autopilot cluster with the following settings:"
echo "  Project ID : $PROJECT_ID"
echo "  Region     : $REGION"
echo "  Cluster    : $CLUSTER_NAME"
read -rp "Proceed? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

log "Selecting project $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

if gcloud container clusters describe "$CLUSTER_NAME" --region "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  log "Cluster \"$CLUSTER_NAME\" already exists; skipping creation."
else
  log "Creating Autopilot cluster \"$CLUSTER_NAME\" in $REGION (this can take 5–7 minutes)…"
  gcloud container clusters create-auto "$CLUSTER_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION"
fi

log "Fetching kubeconfig credentials"
gcloud container clusters get-credentials "$CLUSTER_NAME" --region "$REGION" --project "$PROJECT_ID"

log "Ensuring keda namespace exists"
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: keda
EOF

log "Installing or upgrading KEDA via Helm"
helm repo add kedacore https://kedacore.github.io/charts --force-update
helm repo update
helm upgrade --install keda kedacore/keda --namespace keda

log "Cluster summary"
gcloud container clusters list --project "$PROJECT_ID"
kubectl get nodes
kubectl get pods -n keda

log "GKE Cluster Setup Complete!"
