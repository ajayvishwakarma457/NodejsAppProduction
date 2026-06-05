# DocumentDB Subnet Group
resource "aws_docdb_subnet_group" "main" {
  name       = "production-docdb-subnet-group"
  subnet_ids = [aws_subnet.db_1.id, aws_subnet.db_2.id]

  tags = {
    Name = "docdb-subnet-group"
  }
}

# DocumentDB Security Group
resource "aws_security_group" "docdb" {
  name        = "docdb-security-group"
  description = "Allows traffic to DocumentDB cluster"
  vpc_id      = aws_vpc.main.id

  # Allow DocumentDB port (27017) from ECS App Layer
  ingress {
    from_port       = 27017
    to_port         = 27017
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
    Name = "docdb-security-group"
  }
}

# DocumentDB Parameter Group
resource "aws_docdb_cluster_parameter_group" "main" {
  family      = "docdb4.0"
  name        = "production-docdb-parameter-group"
  description = "DocumentDB parameter group for production"

  parameter {
    name  = "tls"
    value = "disabled" # Can set to "enabled" and install CA certs if secure transit is enforced
  }
}

# DocumentDB Cluster (Amazon's MongoDB-compatible RDS Engine)
resource "aws_docdb_cluster" "main" {
  cluster_identifier              = "production-documentdb-cluster"
  engine                          = "docdb"
  master_username                 = "dbadmin"
  master_password                 = "supersecretmasterpassword123"
  backup_retention_period         = 7
  preferred_backup_window         = "02:00-03:00"
  skip_final_snapshot             = true
  db_subnet_group_name            = aws_docdb_subnet_group.main.name
  vpc_security_group_ids          = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.main.name

  tags = {
    Name        = "production-documentdb"
    Environment = var.environment
  }
}

# Cluster Instance(s)
resource "aws_docdb_cluster_instance" "cluster_instances" {
  count              = 2
  identifier         = "production-docdb-instance-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = "db.r5.large"
}

output "documentdb_endpoint" {
  value       = aws_docdb_cluster.main.endpoint
  description = "The DocumentDB cluster endpoint (use this for MONGODB_URI)"
}
