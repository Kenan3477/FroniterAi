# Global Variables for Frontier Infrastructure
# These variables are used across all modules and environments

# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "frontier"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "cost_center" {
  description = "Cost center for billing allocation"
  type        = string
  default     = "engineering"
}

variable "data_classification" {
  description = "Data classification level"
  type        = string
  default     = "confidential"
  
  validation {
    condition     = contains(["public", "internal", "confidential", "restricted"], var.data_classification)
    error_message = "Data classification must be one of: public, internal, confidential, restricted."
  }
}

# Multi-Cloud Configuration
variable "primary_cloud_provider" {
  description = "Primary cloud provider"
  type        = string
  default     = "aws"
  
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.primary_cloud_provider)
    error_message = "Primary cloud provider must be one of: aws, azure, gcp."
  }
}

variable "secondary_cloud_provider" {
  description = "Secondary cloud provider for disaster recovery"
  type        = string
  default     = "azure"
  
  validation {
    condition     = contains(["aws", "azure", "gcp"], var.secondary_cloud_provider)
    error_message = "Secondary cloud provider must be one of: aws, azure, gcp."
  }
}

# AWS Configuration
variable "aws_primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_secondary_region" {
  description = "Secondary AWS region for disaster recovery"
  type        = string
  default     = "us-west-2"
}

variable "aws_account_id" {
  description = "AWS Account ID"
  type        = string
  sensitive   = true
}

# Azure Configuration
variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
  sensitive   = true
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
  sensitive   = true
}

variable "azure_primary_region" {
  description = "Primary Azure region"
  type        = string
  default     = "East US"
}

variable "azure_secondary_region" {
  description = "Secondary Azure region for disaster recovery"
  type        = string
  default     = "West US 2"
}

# Google Cloud Configuration
variable "gcp_project_id" {
  description = "GCP project ID"
  type        = string
  sensitive   = true
}

variable "gcp_primary_region" {
  description = "Primary GCP region"
  type        = string
  default     = "us-central1"
}

variable "gcp_secondary_region" {
  description = "Secondary GCP region for disaster recovery"
  type        = string
  default     = "us-west1"
}

variable "gcp_primary_zone" {
  description = "Primary GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "gcp_secondary_zone" {
  description = "Secondary GCP zone"
  type        = string
  default     = "us-west1-a"
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# Auto-Scaling Configuration
variable "min_replicas" {
  description = "Minimum number of replicas for auto-scaling"
  type        = number
  default     = 2
}

variable "max_replicas" {
  description = "Maximum number of replicas for auto-scaling"
  type        = number
  default     = 50
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization percentage for auto-scaling"
  type        = number
  default     = 70
  
  validation {
    condition     = var.target_cpu_utilization > 0 && var.target_cpu_utilization <= 100
    error_message = "Target CPU utilization must be between 1 and 100."
  }
}

variable "target_memory_utilization" {
  description = "Target memory utilization percentage for auto-scaling"
  type        = number
  default     = 80
  
  validation {
    condition     = var.target_memory_utilization > 0 && var.target_memory_utilization <= 100
    error_message = "Target memory utilization must be between 1 and 100."
  }
}

variable "scale_up_cooldown" {
  description = "Cooldown period for scaling up (in seconds)"
  type        = number
  default     = 300
}

variable "scale_down_cooldown" {
  description = "Cooldown period for scaling down (in seconds)"
  type        = number
  default     = 300
}

# Compute Configuration
variable "node_instance_types" {
  description = "Instance types for worker nodes"
  type        = list(string)
  default     = ["m5.large", "m5.xlarge", "m5.2xlarge"]
}

variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = true
}

variable "spot_instance_percentage" {
  description = "Percentage of spot instances in the cluster"
  type        = number
  default     = 70
  
  validation {
    condition     = var.spot_instance_percentage >= 0 && var.spot_instance_percentage <= 100
    error_message = "Spot instance percentage must be between 0 and 100."
  }
}

# Database Configuration
variable "database_engine" {
  description = "Database engine (postgres, mysql)"
  type        = string
  default     = "postgres"
  
  validation {
    condition     = contains(["postgres", "mysql"], var.database_engine)
    error_message = "Database engine must be either postgres or mysql."
  }
}

variable "database_instance_class" {
  description = "Database instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "database_allocated_storage" {
  description = "Database allocated storage in GB"
  type        = number
  default     = 100
}

variable "database_max_allocated_storage" {
  description = "Database maximum allocated storage in GB"
  type        = number
  default     = 1000
}

variable "enable_database_backup" {
  description = "Enable automated database backups"
  type        = bool
  default     = true
}

variable "database_backup_retention_period" {
  description = "Database backup retention period in days"
  type        = number
  default     = 30
}

# Security Configuration
variable "enable_encryption_at_rest" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "enable_encryption_in_transit" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

variable "enable_network_segmentation" {
  description = "Enable network segmentation"
  type        = bool
  default     = true
}

variable "enable_web_application_firewall" {
  description = "Enable Web Application Firewall"
  type        = bool
  default     = true
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the infrastructure"
  type        = list(string)
  default     = []
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = true
}

variable "enable_distributed_tracing" {
  description = "Enable distributed tracing"
  type        = bool
  default     = true
}

variable "metrics_retention_days" {
  description = "Metrics retention period in days"
  type        = number
  default     = 90
}

variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 30
}

variable "data_retention_days" {
  description = "Data retention period in days for compliance"
  type        = number
  default     = 2555  # 7 years
}

# Cost Optimization Configuration
variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling based on time patterns"
  type        = bool
  default     = true
}

variable "enable_predictive_scaling" {
  description = "Enable predictive scaling based on ML models"
  type        = bool
  default     = true
}

variable "cost_optimization_level" {
  description = "Cost optimization level (basic, standard, aggressive)"
  type        = string
  default     = "standard"
  
  validation {
    condition     = contains(["basic", "standard", "aggressive"], var.cost_optimization_level)
    error_message = "Cost optimization level must be one of: basic, standard, aggressive."
  }
}

# Disaster Recovery Configuration
variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = true
}

variable "rpo_target_minutes" {
  description = "Recovery Point Objective (RPO) target in minutes"
  type        = number
  default     = 60
}

variable "rto_target_minutes" {
  description = "Recovery Time Objective (RTO) target in minutes"
  type        = number
  default     = 240  # 4 hours
}

# Data Sovereignty Configuration
variable "data_residency_requirements" {
  description = "Data residency requirements by region"
  type = map(object({
    allowed_regions = list(string)
    compliance_frameworks = list(string)
  }))
  default = {
    us = {
      allowed_regions = ["us-east-1", "us-west-2"]
      compliance_frameworks = ["SOC2", "HIPAA"]
    }
    eu = {
      allowed_regions = ["eu-west-1", "eu-central-1"]
      compliance_frameworks = ["GDPR", "ISO27001"]
    }
    asia = {
      allowed_regions = ["ap-southeast-1", "ap-northeast-1"]
      compliance_frameworks = ["ISO27001"]
    }
  }
}

# Feature Flags
variable "enable_canary_deployments" {
  description = "Enable canary deployment strategy"
  type        = bool
  default     = true
}

variable "enable_blue_green_deployments" {
  description = "Enable blue-green deployment strategy"
  type        = bool
  default     = true
}

variable "enable_chaos_engineering" {
  description = "Enable chaos engineering experiments"
  type        = bool
  default     = false
}

variable "enable_performance_testing" {
  description = "Enable automated performance testing"
  type        = bool
  default     = true
}

# Application Configuration
variable "frontier_modules" {
  description = "Frontier modules to deploy"
  type = map(object({
    enabled = bool
    replicas = number
    resources = object({
      cpu_request = string
      memory_request = string
      cpu_limit = string
      memory_limit = string
    })
  }))
  default = {
    visual_design = {
      enabled = true
      replicas = 3
      resources = {
        cpu_request = "500m"
        memory_request = "1Gi"
        cpu_limit = "2000m"
        memory_limit = "4Gi"
      }
    }
    self_improvement = {
      enabled = true
      replicas = 2
      resources = {
        cpu_request = "1000m"
        memory_request = "2Gi"
        cpu_limit = "4000m"
        memory_limit = "8Gi"
      }
    }
    code_quality = {
      enabled = true
      replicas = 2
      resources = {
        cpu_request = "500m"
        memory_request = "1Gi"
        cpu_limit = "2000m"
        memory_limit = "4Gi"
      }
    }
    image_generation = {
      enabled = true
      replicas = 3
      resources = {
        cpu_request = "2000m"
        memory_request = "4Gi"
        cpu_limit = "8000m"
        memory_limit = "16Gi"
      }
    }
    audio_video = {
      enabled = true
      replicas = 2
      resources = {
        cpu_request = "2000m"
        memory_request = "4Gi"
        cpu_limit = "8000m"
        memory_limit = "16Gi"
      }
    }
    business_operations = {
      enabled = true
      replicas = 2
      resources = {
        cpu_request = "1000m"
        memory_request = "2Gi"
        cpu_limit = "4000m"
        memory_limit = "8Gi"
      }
    }
  }
}

# API Gateway Configuration
variable "api_gateway_throttle_rate" {
  description = "API Gateway throttle rate (requests per second)"
  type        = number
  default     = 10000
}

variable "api_gateway_throttle_burst" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 50000
}

# Cache Configuration
variable "enable_redis_cluster" {
  description = "Enable Redis cluster for caching"
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 3
}
