# Production Environment Configuration for AWS

# Environment Configuration
environment         = "prod"
aws_region         = "us-west-2"

# VPC Configuration
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = [
  "10.0.1.0/24",
  "10.0.2.0/24",
  "10.0.3.0/24"
]
private_subnet_cidrs = [
  "10.0.10.0/24",
  "10.0.20.0/24",
  "10.0.30.0/24"
]

# EKS Configuration
kubernetes_version = "1.28"
cluster_endpoint_public_access_cidrs = ["YOUR_OFFICE_IP/32"]  # Restrict access
node_capacity_type = "ON_DEMAND"
node_ami_type     = "AL2_x86_64"
node_instance_types = ["m5.large", "m5.xlarge"]
node_desired_size = 5
node_max_size     = 20
node_min_size     = 3
node_max_unavailable = 2

# Database Configuration
postgres_version = "14.9"
rds_instance_class = "db.r5.large"
rds_allocated_storage = 200
rds_max_allocated_storage = 1000
database_name = "frontier_prod"
database_username = "frontier_admin"
rds_backup_retention_period = 30
rds_backup_window = "03:00-04:00"
rds_maintenance_window = "sun:04:00-sun:05:00"

# Redis Configuration
redis_node_type = "cache.r5.large"
redis_num_cache_nodes = 3
redis_snapshot_retention_limit = 7
redis_snapshot_window = "03:00-05:00"

# Domain Configuration
create_route53_zone = true
create_ssl_certificate = true
domain_name = "yourdomain.com"  # Replace with actual domain

# Logging
log_retention_in_days = 30

# Additional Tags
additional_tags = {
  CostCenter    = "Production"
  Team          = "Engineering"
  Purpose       = "Production Environment"
  Compliance    = "Required"
  Backup        = "Required"
  Monitoring    = "Critical"
}
