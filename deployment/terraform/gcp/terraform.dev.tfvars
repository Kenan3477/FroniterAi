# GCP Terraform Variables - Development Environment

# Project configuration
project_id  = "frontier-dev-project"
region      = "us-central1"
environment = "dev"

# Network configuration
gke_subnet_cidr    = "10.1.0.0/24"
gke_pods_cidr      = "10.2.0.0/16"
gke_services_cidr  = "10.3.0.0/16"
gke_master_cidr    = "10.4.0.0/28"

# GKE configuration
gke_node_count        = 2
gke_min_node_count    = 1
gke_max_node_count    = 5
gke_node_machine_type = "e2-standard-2"
gke_node_disk_size    = 50

# GPU configuration (disabled for dev)
enable_gpu_nodes    = false
gpu_node_count      = 0
gpu_max_node_count  = 2
gpu_machine_type    = "n1-standard-2"
gpu_type           = "nvidia-tesla-t4"

# Database configuration
db_tier          = "db-f1-micro"
db_disk_size     = 20
db_max_disk_size = 100
db_password      = "dev-db-password-change-me"

# Redis configuration
redis_tier        = "BASIC"
redis_memory_size = 1
redis_ip_range    = "10.5.0.0/29"

# Storage configuration
cors_origins = ["http://localhost:3000", "https://dev.frontier.com"]

# Domain configuration
frontend_domain = "dev.frontier.com"
api_domain      = "api-dev.frontier.com"

# Feature flags
enable_cloud_build = true
enable_monitoring  = true
enable_backup      = false

# Tags
tags = {
  Environment = "dev"
  Project     = "Frontier"
  ManagedBy   = "Terraform"
  Team        = "Development"
}
