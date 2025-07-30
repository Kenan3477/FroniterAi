# GCP Variables for Frontier Infrastructure

# Project configuration
variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Network configuration
variable "gke_subnet_cidr" {
  description = "CIDR range for GKE subnet"
  type        = string
  default     = "10.1.0.0/24"
}

variable "gke_pods_cidr" {
  description = "CIDR range for GKE pods"
  type        = string
  default     = "10.2.0.0/16"
}

variable "gke_services_cidr" {
  description = "CIDR range for GKE services"
  type        = string
  default     = "10.3.0.0/16"
}

variable "gke_master_cidr" {
  description = "CIDR range for GKE master nodes"
  type        = string
  default     = "10.4.0.0/28"
}

# GKE configuration
variable "gke_node_count" {
  description = "Number of nodes in the GKE cluster"
  type        = number
  default     = 3
}

variable "gke_min_node_count" {
  description = "Minimum number of nodes in the GKE cluster"
  type        = number
  default     = 1
}

variable "gke_max_node_count" {
  description = "Maximum number of nodes in the GKE cluster"
  type        = number
  default     = 10
}

variable "gke_node_machine_type" {
  description = "Machine type for GKE nodes"
  type        = string
  default     = "e2-standard-4"
}

variable "gke_node_disk_size" {
  description = "Disk size for GKE nodes in GB"
  type        = number
  default     = 100
}

# GPU configuration
variable "enable_gpu_nodes" {
  description = "Enable GPU node pool"
  type        = bool
  default     = false
}

variable "gpu_node_count" {
  description = "Number of GPU nodes"
  type        = number
  default     = 0
}

variable "gpu_max_node_count" {
  description = "Maximum number of GPU nodes"
  type        = number
  default     = 3
}

variable "gpu_machine_type" {
  description = "Machine type for GPU nodes"
  type        = string
  default     = "n1-standard-4"
}

variable "gpu_type" {
  description = "GPU type for ML workloads"
  type        = string
  default     = "nvidia-tesla-t4"
}

# Database configuration
variable "db_tier" {
  description = "Database instance tier"
  type        = string
  default     = "db-g1-small"
}

variable "db_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 100
}

variable "db_max_disk_size" {
  description = "Maximum database disk size in GB"
  type        = number
  default     = 500
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Redis configuration
variable "redis_tier" {
  description = "Redis instance tier"
  type        = string
  default     = "STANDARD_HA"
}

variable "redis_memory_size" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

variable "redis_ip_range" {
  description = "IP range for Redis instance"
  type        = string
  default     = "10.5.0.0/29"
}

# Storage configuration
variable "cors_origins" {
  description = "CORS origins for storage buckets"
  type        = list(string)
  default     = ["*"]
}

# Domain configuration
variable "frontend_domain" {
  description = "Domain for the frontend application"
  type        = string
}

variable "api_domain" {
  description = "Domain for the API"
  type        = string
}

# Feature flags
variable "enable_cloud_build" {
  description = "Enable Cloud Build for CI/CD"
  type        = bool
  default     = false
}

variable "enable_monitoring" {
  description = "Enable monitoring and logging"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

# Tags
variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project     = "Frontier"
    ManagedBy   = "Terraform"
  }
}
