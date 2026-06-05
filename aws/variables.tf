variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "The target AWS Region for resources configuration"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Target stage environment name"
}
