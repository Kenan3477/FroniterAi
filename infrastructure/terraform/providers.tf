# Multi-Cloud Provider Configuration
# Supports AWS, Azure, and GCP with unified resource management

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
    
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
    
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  
  # Remote state configuration
  backend "s3" {
    bucket         = "frontier-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "frontier-terraform-locks"
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_primary_region
  
  default_tags {
    tags = {
      Environment   = var.environment
      Project       = "frontier"
      ManagedBy     = "terraform"
      CostCenter    = var.cost_center
      DataClass     = var.data_classification
    }
  }
}

# AWS Secondary Region Provider
provider "aws" {
  alias  = "secondary"
  region = var.aws_secondary_region
  
  default_tags {
    tags = {
      Environment   = var.environment
      Project       = "frontier"
      ManagedBy     = "terraform"
      CostCenter    = var.cost_center
      DataClass     = var.data_classification
    }
  }
}

# Azure Provider Configuration
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
  
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
}

# Google Cloud Provider Configuration
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_primary_region
  zone    = var.gcp_primary_zone
}

# Google Cloud Secondary Region Provider
provider "google" {
  alias   = "secondary"
  project = var.gcp_project_id
  region  = var.gcp_secondary_region
  zone    = var.gcp_secondary_zone
}

# Kubernetes Provider Configuration
provider "kubernetes" {
  host                   = module.eks_primary.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks_primary.cluster_certificate_authority_data)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks_primary.cluster_name]
  }
}

# Helm Provider Configuration
provider "helm" {
  kubernetes {
    host                   = module.eks_primary.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks_primary.cluster_certificate_authority_data)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks_primary.cluster_name]
    }
  }
}

# Generate random strings for unique resource naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# TLS Private Key for SSH access
resource "tls_private_key" "main" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Local values for common configurations
locals {
  common_tags = {
    Environment   = var.environment
    Project       = "frontier"
    ManagedBy     = "terraform"
    CostCenter    = var.cost_center
    DataClass     = var.data_classification
    CreatedAt     = timestamp()
  }
  
  # Resource naming convention
  name_prefix = "${var.project_name}-${var.environment}"
  
  # Multi-cloud deployment strategy
  primary_cloud   = var.primary_cloud_provider
  secondary_cloud = var.secondary_cloud_provider
  
  # Data sovereignty regions
  data_regions = {
    us   = ["us-east-1", "us-west-2"]
    eu   = ["eu-west-1", "eu-central-1"]
    asia = ["ap-southeast-1", "ap-northeast-1"]
  }
  
  # Auto-scaling parameters
  scaling_config = {
    min_replicas                    = var.min_replicas
    max_replicas                    = var.max_replicas
    target_cpu_utilization         = var.target_cpu_utilization
    target_memory_utilization      = var.target_memory_utilization
    scale_up_cooldown              = var.scale_up_cooldown
    scale_down_cooldown            = var.scale_down_cooldown
  }
  
  # Cost optimization settings
  cost_optimization = {
    enable_spot_instances      = var.enable_spot_instances
    spot_instance_percentage   = var.spot_instance_percentage
    enable_scheduled_scaling   = var.enable_scheduled_scaling
    enable_predictive_scaling  = var.enable_predictive_scaling
  }
  
  # Security and compliance settings
  security_config = {
    enable_encryption_at_rest     = true
    enable_encryption_in_transit  = true
    enable_network_segmentation   = true
    enable_audit_logging          = true
    data_retention_days           = var.data_retention_days
  }
  
  # Monitoring and alerting configuration
  monitoring_config = {
    enable_detailed_monitoring    = var.enable_detailed_monitoring
    metrics_retention_days        = var.metrics_retention_days
    log_retention_days           = var.log_retention_days
    enable_distributed_tracing    = var.enable_distributed_tracing
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

data "azurerm_client_config" "current" {}

data "google_project" "current" {}

# Remote state data sources for shared resources
data "terraform_remote_state" "shared" {
  backend = "s3"
  
  config = {
    bucket = "frontier-terraform-state"
    key    = "shared/terraform.tfstate"
    region = "us-east-1"
  }
}

# Output important configuration values
output "providers_configured" {
  description = "List of configured cloud providers"
  value = {
    aws = {
      primary_region   = var.aws_primary_region
      secondary_region = var.aws_secondary_region
    }
    azure = {
      subscription_id = var.azure_subscription_id
      tenant_id      = var.azure_tenant_id
    }
    gcp = {
      project_id      = var.gcp_project_id
      primary_region  = var.gcp_primary_region
      secondary_region = var.gcp_secondary_region
    }
  }
}

output "common_configuration" {
  description = "Common configuration applied across all providers"
  value = {
    environment         = var.environment
    project_name        = var.project_name
    name_prefix         = local.name_prefix
    data_classification = var.data_classification
    primary_cloud       = local.primary_cloud
    secondary_cloud     = local.secondary_cloud
  }
}

output "feature_flags" {
  description = "Feature flags and configuration settings"
  value = {
    auto_scaling        = local.scaling_config
    cost_optimization   = local.cost_optimization
    security_compliance = local.security_config
    monitoring_config   = local.monitoring_config
  }
}
