#!/usr/bin/env bash
# promote.sh
# Automates the promotion swap for blue-green deployments.

set -euo pipefail

ACTIVE_SVC="nodejs-monolith-active"
PREVIEW_SVC="nodejs-monolith-preview"
NAMESPACE="default"
DRY_RUN=${DRY_RUN:-false}

echo "=== Blue-Green Promotion Started ==="

# Check kubectl dependency unless in dry run or no kubectl mock mode
if ! command -v kubectl &> /dev/null; then
  echo "WARNING: kubectl not found. Simulating actions (Dry Run Mode)..."
  DRY_RUN=true
fi

# Determine current active and preview colors
if [ "$DRY_RUN" = "true" ]; then
  CURRENT_ACTIVE="blue"
  CURRENT_PREVIEW="green"
  echo "[Simulation] Active selector: color=${CURRENT_ACTIVE}"
  echo "[Simulation] Preview selector: color=${CURRENT_PREVIEW}"
else
  CURRENT_ACTIVE=$(kubectl get svc "$ACTIVE_SVC" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}')
  CURRENT_PREVIEW=$(kubectl get svc "$PREVIEW_SVC" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}')
  echo "Current Active: ${CURRENT_ACTIVE}"
  echo "Current Preview (Idle): ${CURRENT_PREVIEW}"
fi

if [ "$CURRENT_ACTIVE" = "$CURRENT_PREVIEW" ]; then
  echo "ERROR: Active and Preview colors are identical! Manual resolution required."
  exit 1
fi

# Verify health of the preview/idle deployment before promotion
echo "Running health checks on preview service (${CURRENT_PREVIEW})..."

# Simulate or request endpoint response
if [ "$DRY_RUN" = "true" ]; then
  echo "[Simulation] Health checks passed for ${CURRENT_PREVIEW} deployment!"
else
  # Wait for rollout status on preview deployment
  echo "Waiting for rollout of deployment nodejs-monolith-${CURRENT_PREVIEW}..."
  kubectl rollout status deployment/nodejs-monolith-"${CURRENT_PREVIEW}" -n "$NAMESPACE" --timeout=120s
  
  # Port-forward or hit internal service health endpoint
  # For demo purposes, we execute a brief curl check inside the cluster or check pod statuses
  UNHEALTHY_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=nodejs-monolith,color="${CURRENT_PREVIEW}" -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
  if [ -n "$UNHEALTHY_PODS" ]; then
    echo "ERROR: Some pods in the preview deployment are not in Running state: $UNHEALTHY_PODS"
    exit 1
  fi
  echo "Preview deployment is healthy."
fi

# Perform switch
echo "Swapping service targets..."
if [ "$DRY_RUN" = "true" ]; then
  echo "[Simulation] Patching active service to point to: ${CURRENT_PREVIEW}"
  echo "[Simulation] Patching preview service to point to: ${CURRENT_ACTIVE}"
  echo "[Simulation] Promotion complete!"
else
  kubectl patch svc "$ACTIVE_SVC" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"${CURRENT_PREVIEW}\"}}}"
  kubectl patch svc "$PREVIEW_SVC" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"${CURRENT_ACTIVE}\"}}}"
  echo "Promotion complete! Traffic successfully shifted to ${CURRENT_PREVIEW}."
fi
echo "=== Blue-Green Promotion Finished ==="
