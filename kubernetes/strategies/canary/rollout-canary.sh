#!/usr/bin/env bash
# rollout-canary.sh
# Automates progressive canary traffic routing using Ingress weights.

set -euo pipefail

INGRESS_NAME="nodejs-monolith-canary-ingress"
NAMESPACE="default"
DRY_RUN=${DRY_RUN:-false}
STEP_INTERVAL_SEC=${STEP_INTERVAL_SEC:-5} # Short interval for demo purposes

echo "=== Canary Progressive Rollout Started ==="

# Check kubectl dependency
if ! command -v kubectl &> /dev/null; then
  echo "WARNING: kubectl not found. Simulating actions (Dry Run Mode)..."
  DRY_RUN=true
fi

# Define weight promotion steps
WEIGHT_STEPS=(10 25 50 75 100)

for WEIGHT in "${WEIGHT_STEPS[@]}"; do
  echo "Promoting canary weight to: ${WEIGHT}%"
  
  if [ "$DRY_RUN" = "true" ]; then
    echo "[Simulation] Patching Ingress ${INGRESS_NAME} to weight ${WEIGHT}%"
  else
    kubectl patch ingress "$INGRESS_NAME" -n "$NAMESPACE" \
      --type='json' \
      -p="[{\"op\": \"replace\", \"path\": \"/metadata/annotations/nginx.ingress.kubernetes.io~1canary-weight\", \"value\": \"${WEIGHT}\"}]"
  fi
  
  echo "Verifying deployment stability at weight ${WEIGHT}%..."
  
  # Check system logs/error rates
  # In production, check Prometheus metrics here (e.g. error rate < 1%)
  # For demonstration, simulate verification
  if [ "$DRY_RUN" = "true" ]; then
    echo "[Simulation] Metric checks OK: Error rates are 0%."
  else
    # Sleep to allow metrics gathering
    sleep "$STEP_INTERVAL_SEC"
    
    # Simple check for running pods
    UNHEALTHY_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=nodejs-monolith,track=canary -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
    if [ -n "$UNHEALTHY_PODS" ]; then
      echo "ERROR: Canary pods are unhealthy! Initiating rollback..."
      
      # Rollback weight to 0%
      kubectl patch ingress "$INGRESS_NAME" -n "$NAMESPACE" \
        --type='json' \
        -p="[{\"op\": \"replace\", \"path\": \"/metadata/annotations/nginx.ingress.kubernetes.io~1canary-weight\", \"value\": \"0\"}]"
      echo "Canary weight reset to 0%. Rollback complete."
      exit 1
    fi
  fi
  
  sleep "$STEP_INTERVAL_SEC"
done

echo "Canary deployment successfully scaled to 100%!"
echo "=== Canary Progressive Rollout Finished ==="
