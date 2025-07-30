# GCP Terraform Variables - Production Environment

# Project configuration
project_id  = "frontier-prod-project"
region      = "us-central1"
environment = "prod"

# Network configuration
gke_subnet_cidr    = "10.1.0.0/24"
gke_pods_cidr      = "10.2.0.0/16"
gke_services_cidr  = "10.3.0.0/16"
gke_master_cidr    = "10.4.0.0/28"

# GKE configuration
gke_node_count        = 5
gke_min_node_count    = 3
gke_max_node_count    = 20
gke_node_machine_type = "e2-standard-4"
gke_node_disk_size    = 100

# GPU configuration
enable_gpu_nodes    = true
gpu_node_count      = 1
gpu_max_node_count  = 5
gpu_machine_type    = "n1-standard-4"
gpu_type           = "nvidia-tesla-t4"

# Database configuration
db_tier          = "db-n1-standard-2"
db_disk_size     = 200
db_max_disk_size = 1000
db_password      = "prod-db-password-from-secret-manager"

# Redis configuration
redis_tier        = "STANDARD_HA"
redis_memory_size = 4
redis_ip_range    = "10.5.0.0/29"

# Storage configuration
cors_origins = ["https://frontier.com", "https://www.frontier.com"]

# Domain configuration
frontend_domain = "frontier.com"
api_domain      = "api.frontier.com"

# Feature flags
enable_cloud_build = true
enable_monitoring  = true
enable_backup      = true

# Tags
tags = {
  Environment = "prod"
  Project     = "Frontier"
  ManagedBy   = "Terraform"
  Team        = "Production"
  BackupRequired = "true"
}
