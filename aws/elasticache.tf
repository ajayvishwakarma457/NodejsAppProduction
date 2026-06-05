# Redis Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "production-redis-subnet-group"
  subnet_ids = [aws_subnet.db_1.id, aws_subnet.db_2.id]
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "redis-security-group"
  description = "Allows Redis access from ECS tasks"
  vpc_id      = aws_vpc.main.id

  # Allow 6379 from ECS App tasks
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "redis-security-group"
  }
}

# Redis Cluster
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "production-redis"
  description          = "Redis cluster for session states and rate limits"
  node_type                     = "cache.t4g.micro"
  port                          = 6379
  parameter_group_name          = "default.redis7"
  subnet_group_name             = aws_elasticache_subnet_group.redis.name
  security_group_ids            = [aws_security_group.redis.id]
  automatic_failover_enabled    = true

  num_node_groups         = 1
  replicas_per_node_group = 1

  tags = {
    Name        = "production-redis"
    Environment = var.environment
  }
}

output "redis_primary_endpoint" {
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  description = "Primary endpoint address for the Redis cluster"
}
