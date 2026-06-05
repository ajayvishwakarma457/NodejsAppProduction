# Kubernetes Deployment Guide

This document describes the Kubernetes manifests and operational guidelines for deploying the application services in a production-ready Kubernetes environment (like Minikube, Kind, GKE, EKS, or AKS).

---

## 1. Directory Structure

All Kubernetes manifests are located in the `kubernetes/` folder at the root of the repository:

```
kubernetes/
├── configmap.yaml                # Shared environmental configuration values
├── secrets.yaml                  # Application credentials and secure secret keys (using stringData)
├── monolith-deployment.yaml      # Monolith App (Deployment, ClusterIP Service, HPA)
├── api-gateway-deployment.yaml   # API Gateway (Deployment, ClusterIP Service, HPA)
├── user-service-deployment.yaml  # User Service (Deployment, multi-port HTTP/gRPC Service, HPA)
└── notification-service-deployment.yaml # Notification Service (Deployment, ClusterIP Service, HPA)
```

---

## 2. Shared Configuration (ConfigMaps & Secrets)

The containers consume configuration variables loaded directly into the runtime environments using `envFrom`:

### ConfigMap (`kubernetes/configmap.yaml`)
Stores non-sensitive values like:
- `NODE_ENV`: production
- `LOKI_HOST`: Loki endpoint for logs routing
- `SYNTHETIC_PROBER_ENABLED`: Enables synthetic monitoring Uptime loops
- `DB_HOST`: Host address of the MongoDB server

### Secret (`kubernetes/secrets.yaml`)
Stores sensitive credentials using `stringData` (which Kubernetes automatically base64-encodes upon ingestion):
- `MONGODB_URI`: Full connection string (containing passwords/hosts)
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: Secrets for session authentication token validation
- `GOOGLE_CLIENT_SECRET`: OAuth verification secret keys
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: S3 storage connection keys

---

## 3. Manifest Details

### Deployments & Replicas
Each deployment configures:
- **Replica count**: Defaults to `2` to ensure high-availability.
- **Update strategy**: `RollingUpdate` with `maxSurge` and `maxUnavailable` parameters capped at `25%` to prevent downtime during updates.
- **Resource Requests & Limits**: Capped to protect cluster integrity and prevent resource exhaustion:
  - `requests`: `100m` CPU, `256Mi` memory
  - `limits`: `500m` CPU, `512Mi` memory
- **Probes**: Configures `livenessProbe` and `readinessProbe` checking the native `/health` check route of each container.

### Services
Each container exposes its internal server ports:
- **Monolith**: REST Port `5000` (`ClusterIP` name: `nodejs-monolith-service`)
- **API Gateway**: REST Port `6000` (`ClusterIP` name: `nodejs-api-gateway-service`)
- **User Service**: REST Port `6001` & gRPC Port `50051` (`ClusterIP` name: `nodejs-user-service`)
- **Notification Service**: REST Port `6002` (`ClusterIP` name: `nodejs-notification-service`)

### Horizontal Pod Autoscaling (HPA)
Utilizes `autoscaling/v2` to scale service deployment replicas automatically between `2` and `10` instances when average resource utilization exceeds:
- **CPU**: 75%
- **Memory**: 80%

---

## 4. Operational Instructions

### A. Dry-Run Verification
Validate files for syntax and structure before applying:
```bash
kubectl apply --dry-run=client -f kubernetes/
```

### B. Deployment Commands
Deploy the manifests in order of dependencies:
```bash
# 1. Apply configuration first
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml

# 2. Deploy service components
kubectl apply -f kubernetes/monolith-deployment.yaml
kubectl apply -f kubernetes/api-gateway-deployment.yaml
kubectl apply -f kubernetes/user-service-deployment.yaml
kubectl apply -f kubernetes/notification-service-deployment.yaml
```

### C. Status Auditing
Verify deployment statuses:
```bash
# View all running resources
kubectl get all

# Monitor active HPAs
kubectl get hpa

# Stream runtime container logs
kubectl logs -f deployment/nodejs-api-gateway
```
