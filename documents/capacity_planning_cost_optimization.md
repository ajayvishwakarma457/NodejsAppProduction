# Capacity Planning & Cost Optimization Guide

This document defines the guidelines and best practices for rightsizing container resources, configuring autoscaling parameters, and optimizing infrastructure costs for the Node.js production application.

---

## 1. Directory Structure

All related files are located under:

```
documents/
└── capacity_planning_cost_optimization.md   # This guide
kubernetes/
├── hpa.yaml                                 # Horizontal Pod Autoscaler config
└── strategies/
    ├── blue-green/                          # Blue-green deployment manifests
    ├── canary/                              # Canary release manifests
    └── ab-testing/                          # A/B traffic split manifests
```

---

## 2. Container Sizing Guidelines (Requests vs. Limits)

Setting appropriate CPU and Memory requests and limits is critical to preventing application slowdowns, resource starvation, and **OOM (Out-Of-Memory) kills**.

- **Requests**: The minimum resource allocation guaranteed to a container. Kubernetes scheduler uses this to decide which node to place the Pod on.
- **Limits**: The maximum resource cap the container is allowed to consume. Exceeding CPU limits results in **CPU throttling**; exceeding Memory limits results in immediate **OOM termination**.

### Baseline Sizing Matrix

| Service Type | CPU Request | CPU Limit | Memory Request | Memory Limit |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway / Router** | `100m` (0.1 core) | `300m` | `256Mi` | `512Mi` |
| **Monolith / Core API** | `250m` (0.25 core) | `1000m` (1 core) | `512Mi` | `1024Mi` |
| **Notification / Worker** | `100m` | `500m` | `256Mi` | `512Mi` |
| **Background Job (BullMQ)** | `50m` | `250m` | `128Mi` | `256Mi` |
| **Cache Layer (Redis Sidecar)** | `50m` | `100m` | `64Mi` | `128Mi` |

### Resource Calculation Formula

Use the following formula to determine CPU/Memory targets based on observed usage:

```
CPU Request  = p50 CPU usage × 1.2  (add 20% headroom)
CPU Limit    = p99 CPU usage × 1.5  (add 50% burst headroom)
Mem Request  = p90 Memory usage × 1.1
Mem Limit    = p99 Memory usage × 1.25
```

> Use Prometheus + Grafana dashboards to query p50/p90/p99 CPU and Memory percentiles.

### Example: Calculating the Monolith Container Resources

```
Observed via Prometheus:
  - p50 CPU: 180m  → CPU Request = 180m × 1.2 = 216m ≈ 250m
  - p99 CPU: 600m  → CPU Limit   = 600m × 1.5 = 900m ≈ 1000m
  - p90 Mem: 400Mi → Mem Request = 400Mi × 1.1 = 440Mi ≈ 512Mi
  - p99 Mem: 750Mi → Mem Limit   = 750Mi × 1.25 = 937Mi ≈ 1024Mi
```

---

## 3. Kubernetes Autoscaling Thresholds (HPA)

We utilize the **Horizontal Pod Autoscaler (HPA)** to scale workloads up or down dynamically based on resource usage metrics.

### HPA Configuration

```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nodejs-monolith-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nodejs-monolith
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75    # Scale up when CPU crosses 75%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80    # Scale up when Memory crosses 80%
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60        # Add at most 2 pods per minute
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120       # Remove at most 1 pod every 2 minutes
```

### HPA Decision Thresholds

| Metric | Scale-Up Threshold | Scale-Down Threshold | Min Pods | Max Pods |
| :--- | :--- | :--- | :--- | :--- |
| CPU Utilization | > 75% avg | < 40% avg for 5 min | 2 | 10 |
| Memory Utilization | > 80% avg | < 50% avg for 5 min | 2 | 10 |
| Custom: Req/sec | > 500 req/s/pod | < 100 req/s/pod | 2 | 10 |

### Vertical Pod Autoscaler (VPA) Recommendations

Use **VPA in recommendation mode** to automatically detect over/under-provisioned containers:

```bash
# Install VPA
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vertical-pod-autoscaler.yaml

# Apply VPA in recommendation-only mode (does NOT restart pods automatically)
cat <<EOF | kubectl apply -f -
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: nodejs-monolith-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nodejs-monolith
  updatePolicy:
    updateMode: "Off"   # Only recommend, don't change
EOF
```

---

## 4. AWS Cost Optimization Checklist

To minimize monthly infrastructure expenditures, apply these cost-reduction strategies.

### A. AWS Compute Savings Plans

| Plan Type | Discount vs On-Demand | Commitment |
| :--- | :--- | :--- |
| Compute Savings Plan | Up to **66%** | 1 or 3 year |
| EC2 Instance Savings Plan | Up to **72%** | 1 or 3 year |
| AWS Lambda (Compute SP) | Up to **17%** | 1 year |

**Action**: Commit to a consistent amount of compute usage (measured in $/hour) for a 1-year or 3-year term.

```bash
# Analyze current spend and generate recommendation
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --lookback-period-in-days SIXTY_DAYS
```

### B. Spot Instances for Stateless Workloads

- Run stateless API pods, BullMQ workers, and Kafka consumers on **EC2 Spot Instances**.
- Save up to **90%** over On-Demand pricing.
- Combine Spot with an On-Demand baseline (70% Spot / 30% On-Demand) to prevent disruptions.

```yaml
# Example: Mixed node group in EKS managed node groups
nodeGroups:
  - name: spot-workers
    instanceTypes: ["m5.xlarge", "m4.xlarge", "m5a.xlarge"]
    spot: true
    minSize: 2
    maxSize: 20
  - name: on-demand-baseline
    instanceType: m5.xlarge
    minSize: 1
    maxSize: 3
```

### C. EBS & Snapshot Garbage Collection

```bash
#!/usr/bin/env bash
# Identify and optionally delete orphaned EBS volumes
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId,Size,CreateTime]' \
  --output table

# Identify snapshots older than 30 days
CUTOFF=$(date -d "30 days ago" +%Y-%m-%dT%H:%M:%S)
aws ec2 describe-snapshots --owner-ids self \
  --query "Snapshots[?StartTime<'${CUTOFF}'].[SnapshotId,StartTime,VolumeSize]" \
  --output table

# Identify idle Elastic Load Balancers (no targets or traffic)
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].[LoadBalancerArn,LoadBalancerName,State.Code]' \
  --output table
```

### D. Right-Sizing EC2 Instances

Use **AWS Compute Optimizer** to get instance resize recommendations:

```bash
aws compute-optimizer get-ec2-instance-recommendations \
  --filters name=Finding,values=Overprovisioned \
  --output table
```

**Typical savings**: 20–40% cost reduction by downsizing overprovisioned instances.

### E. S3 Storage Tiering

| Storage Class | Use Case | Cost (vs S3 Standard) |
| :--- | :--- | :--- |
| S3 Standard | Frequently accessed data | Baseline |
| S3 Standard-IA | Infrequently accessed, rapid retrieval | ~46% cheaper |
| S3 Glacier Instant | Archival, occasional retrieval | ~68% cheaper |
| S3 Glacier Deep Archive | Long-term archival, rarely accessed | ~95% cheaper |

Enable **S3 Intelligent-Tiering** to automatically move objects between tiers:

```bash
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket my-production-bucket \
  --id enable-tiering \
  --intelligent-tiering-configuration '{
    "Id": "enable-tiering",
    "Status": "Enabled",
    "Tierings": [
      {"Days": 90, "AccessTier": "ARCHIVE_ACCESS"},
      {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
    ]
  }'
```

---

## 5. Cost Monitoring & Alerting

### AWS Cost Anomaly Detection

Set up AWS Cost Anomaly Detection to alert on unexpected spending spikes:

```bash
# Create a cost monitor for the entire account
aws ce create-anomaly-monitor \
  --anomaly-monitor '{
    "MonitorName": "NodejsProductionMonitor",
    "MonitorType": "DIMENSIONAL",
    "MonitorDimension": "SERVICE"
  }'

# Create an alert subscription with a $100 threshold
aws ce create-anomaly-subscription \
  --anomaly-subscription '{
    "SubscriptionName": "CostSpikeAlert",
    "MonitorArnList": ["<monitor-arn>"],
    "Subscribers": [{"Address": "team@example.com", "Type": "EMAIL"}],
    "Threshold": 100,
    "Frequency": "DAILY"
  }'
```

### Monthly Budget Alert

```bash
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "MonthlyProductionBudget",
    "BudgetLimit": {"Amount": "500", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[{
    "Notification": {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80
    },
    "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "team@example.com"}]
  }]'
```

---

## 6. Capacity Planning Process

### Monthly Capacity Review Checklist

- [ ] Review Prometheus dashboards for CPU/Memory p50/p90/p99 trends over the past 30 days.
- [ ] Check HPA scale events — are we hitting `maxReplicas` frequently?
- [ ] Review AWS Cost Explorer for top cost drivers.
- [ ] Validate Savings Plan utilization is above 85%.
- [ ] Check for idle/orphaned resources (EBS volumes, Elastic IPs, unused RDS instances).
- [ ] Review S3 bucket storage growth and adjust lifecycle rules.
- [ ] Run `aws compute-optimizer` and apply right-sizing recommendations.
- [ ] Update resource requests/limits if p99 usage has shifted ≥ 20%.

### Quarterly Growth Planning

| Time Horizon | Action |
| :--- | :--- |
| **Current Month** | Monitor & alert on anomalies |
| **Next Quarter** | Forecast based on current growth rate (traffic × 1.3) |
| **6 Months** | Evaluate Savings Plan renewal / new commitment tiers |
| **1 Year** | Reassess architecture (sharding, caching, edge) |

---

## 7. Cost Optimization Quick Wins

| Action | Estimated Saving | Effort |
| :--- | :--- | :--- |
| Enable S3 Intelligent-Tiering | 20–40% on storage | Low |
| Purchase 1-year Compute Savings Plan | 30–66% on compute | Low |
| Move worker pods to Spot Instances | 60–90% on worker compute | Medium |
| Delete unused EBS volumes & snapshots | Variable ($10–$200/mo) | Low |
| Right-size EC2 instances (Compute Optimizer) | 20–40% on EC2 | Medium |
| Compress CloudWatch Logs & reduce retention | 30–50% on logging | Low |
| Enable RDS auto-pause for dev environments | ~100% for dev idle hours | Low |

---

## 8. Node.js-Specific Cost Optimizations

### Reduce Lambda Cold Starts

```javascript
// src/config/warmup.js
// Schedule periodic Lambda invocations to prevent cold starts
export const keepWarmHandler = async (event) => {
  if (event.source === 'aws.events') {
    console.log('Keep-warm invocation — no action needed');
    return { statusCode: 200, body: 'warm' };
  }
  // Regular handler logic
};
```

### Connection Pooling to Reduce DB Costs

```javascript
// Efficient connection pool sizing for cost optimization
// src/config/db.js
const pool = new Pool({
  max: process.env.NODE_ENV === 'production' ? 10 : 3,  // Fewer connections = fewer RDS ACU costs
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Response Caching to Reduce Compute

Enable Redis caching on expensive endpoints to dramatically reduce compute utilization:

```javascript
// Cache expensive endpoint responses for 60 seconds
app.get('/api/v1/reports', cacheMiddleware(60), reportsController.getAll);
```

---

## 9. References

- [AWS Compute Savings Plans](https://aws.amazon.com/savingsplans/)
- [AWS Compute Optimizer](https://aws.amazon.com/compute-optimizer/)
- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes VPA](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- [AWS Cost Anomaly Detection](https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html)
- [S3 Intelligent-Tiering](https://aws.amazon.com/s3/storage-classes/intelligent-tiering/)
