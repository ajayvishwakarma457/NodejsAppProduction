# AWS Infrastructure Guide

This guide details the AWS-specific cloud infrastructure mapped for this project using **Terraform (IaC)**.

---

## 1. Network Topology (VPC Subnetting)

Our network configuration creates an isolated virtual space to secure application workloads:

- **Public Subnets (`10.0.1.0/24`, `10.0.2.0/24`)**:
  - Houses the Application Load Balancers (ALBs) and the EC2 Bastion host.
  - Grants outbound access via an Internet Gateway.
- **Private Subnets (`10.0.10.0/24`, `10.0.11.0/24`)**:
  - Houses the ECS Fargate container application layers.
  - Denies external ingress, routing outbound requests securely through a NAT Gateway.
- **Database Subnets (`10.0.20.0/24`, `10.0.21.0/24`)**:
  - Houses Amazon DocumentDB cluster nodes and Amazon ElastiCache Redis replication instances.
  - Severely restricted by security groups (accepts ingress strictly from private ECS task workloads).

---

## 2. Infrastructure Services

### A. Compute (EC2)
Defined in [aws/ec2.tf](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/aws/ec2.tf).
- Deploys a lightweight `t3.micro` instance running Amazon Linux 2.
- Preconfigured with **AWS Systems Manager (SSM) Integration**, eliminating the need for exposed incoming port `22` SSH keys. Management access is governed via IAM SSM Session Manager sessions.

### B. Microservice Orchestration (ECS / Fargate)
Defined in [aws/ecs.tf](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/aws/ecs.tf).
- **Fargate Launch Type**: Run container workloads serverless, removing EC2 node patch/maintenance tasks.
- **Task Definitions**: CPU, Memory limits, and CloudWatch Logs configurations.
- **ALB Routing**: Directs web ingress to API Gateway tasks.

### C. Database Engine (RDS / DocumentDB)
Defined in [aws/rds.tf](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/aws/rds.tf).
- Spins up a multi-AZ **Amazon DocumentDB cluster** (a managed MongoDB-compatible database engine in the RDS family).
- Restricts incoming calls to port `27017` to database subnets.

### D. Memory Caching (ElastiCache Redis)
Defined in [aws/elasticache.tf](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/aws/elasticache.tf).
- Spins up a multi-AZ replication group running Redis 7.0 for rate-limiting and session cookies caching.
- Exposes port `6379` strictly to the Fargate containers.

### E. Serverless Logic (Lambda)
Defined in [aws/lambda.tf](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/aws/lambda.tf).
- Provisions Lambda execution configurations mapping file storage triggers (like S3 uploads) to serverless processing functions.

---

## 3. Provisioning Instructions

Initialize and validate the Terraform infrastructure state:
```bash
# 1. Initialize providers
cd aws
terraform init

# 2. Check changes plan
terraform plan

# 3. Apply changes to cloud
terraform apply
```
