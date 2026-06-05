# Infrastructure as Code: Terraform Guide

This document describes the design principles, state management strategies, and execution steps for managing the cloud infrastructure as code (IaC) using **Terraform**.

---

## 1. Directory Structure

Our Terraform files are modularly structured inside the `aws/` directory:

```
aws/
├── main.tf              # Provider configuration, VPC, subnet divisions, and routing tables
├── ec2.tf               # Bastion/Management host with Systems Manager (SSM) integration
├── ecs.tf               # ECS Fargate Cluster, Task Definitions, ALB, Target Groups
├── rds.tf               # Amazon DocumentDB (MongoDB-compatible RDS) cluster configuration
├── elasticache.tf       # ElastiCache Redis Cluster for application session and limits caching
├── lambda.tf            # Serverless Lambda logic and S3 integration roles
└── variables.tf         # Global input variables (AWS Region, Environment tags)
```

---

## 2. Production State Management & Locking

To ensure team collaboration, prevent concurrent resource updates, and preserve historical state revisions, we use an **AWS S3 Backend with DynamoDB State Locking**.

### Backend Configuration (`aws/main.tf`)
Add the following backend block to your `terraform` block in production:

```terraform
terraform {
  backend "s3" {
    bucket         = "production-terraform-state-bucket"
    key            = "platform/state.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-locks"
    encrypt        = true
  }
}
```

- **S3 Bucket**: Stores the state files encrypted at rest.
- **DynamoDB Table**: Uses a Partition Key named `LockID` (string type) to manage distributed locking.

---

## 3. Best Practices & Variables Setup

Global parameters should be configured in `variables.tf` or passed dynamically via `terraform.tfvars`:

### Input Variables (`aws/variables.tf`)
```terraform
variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS Region for resources provisioning"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Target stage environment tag"
}
```

### Production Variables (`aws/production.tfvars`)
Avoid hardcoding parameters inside resource files. Create a `production.tfvars` file for production-specific overrides:
```hcl
aws_region  = "us-east-1"
environment = "production"
```

---

## 4. Execution Workflow

To apply infrastructure modifications safely, execute the following commands inside the `aws/` folder:

```bash
# 1. Initialize backend and plugins
terraform init

# 2. Format and align code layout
terraform fmt

# 3. Perform schema syntax and validation audits
terraform validate

# 4. Generate planning report containing resource changes
terraform plan -var-file="production.tfvars" -out=tfplan

# 5. Apply the generated plan file
terraform apply tfplan
```
