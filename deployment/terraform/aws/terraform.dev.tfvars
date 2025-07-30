# Environment-specific Terraform configurations for AWS

# Development Environment
environment         = "dev"
aws_region         = "us-west-2"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = [
  "10.0.1.0/24",
  "10.0.2.0/24"
]
private_subnet_cidrs = [
  "10.0.10.0/24",
  "10.0.20.0/24"
]

# EKS Configuration
kubernetes_version = "1.28"
node_capacity_type = "ON_DEMAND"
node_ami_type     = "AL2_x86_64"
node_instance_types = ["t3.medium"]
node_desired_size = 2
node_max_size     = 5
node_min_size     = 1
node_max_unavailable = 1

# Database Configuration
postgres_version = "14.9"
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20
rds_max_allocated_storage = 100
database_name = "frontier_dev"
database_username = "frontier_admin"
rds_backup_retention_period = 3
rds_backup_window = "03:00-04:00"
rds_maintenance_window = "sun:04:00-sun:05:00"

# Redis Configuration
redis_node_type = "cache.t3.micro"
redis_num_cache_nodes = 1
redis_snapshot_retention_limit = 1
redis_snapshot_window = "03:00-05:00"

# Domain Configuration
create_route53_zone = false
create_ssl_certificate = false
domain_name = ""

# Logging
log_retention_in_days = 7

# Additional Tags
additional_tags = {
  CostCenter = "Development"
  Team       = "Engineering"
  Purpose    = "Development Environment"
}
