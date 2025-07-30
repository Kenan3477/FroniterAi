# Main Infrastructure Orchestration
# This file orchestrates all infrastructure components across multiple cloud providers

# Local values for resource organization
locals {
  # Environment-specific configurations
  env_config = {
    dev = {
      min_replicas     = 1
      max_replicas     = 10
      instance_types   = ["t3.medium", "t3.large"]
      database_class   = "db.t3.micro"
      enable_monitoring = false
    }
    staging = {
      min_replicas     = 2
      max_replicas     = 20
      instance_types   = ["m5.large", "m5.xlarge"]
      database_class   = "db.r6g.large"
      enable_monitoring = true
    }
    prod = {
      min_replicas     = 3
      max_replicas     = 100
      instance_types   = ["m5.large", "m5.xlarge", "m5.2xlarge"]
      database_class   = "db.r6g.xlarge"
      enable_monitoring = true
    }
  }
  
  current_env = local.env_config[var.environment]
  
  # Availability zones configuration
  az_count = min(length(data.aws_availability_zones.available.names), 3)
  azs      = slice(data.aws_availability_zones.available.names, 0, local.az_count)
  
  # Data sovereignty configuration
  current_region_compliance = var.data_residency_requirements[
    startswith(var.aws_primary_region, "us") ? "us" :
    startswith(var.aws_primary_region, "eu") ? "eu" : "asia"
  ]

  # GPU instance configurations for Frontier AI workloads
  gpu_instances = {
    inference = {
      instance_type = "p5.48xlarge"  # 8x H100 GPUs
      min_size      = 32
      max_size      = 256
      desired_size  = 64
    }
    training = {
      instance_type = "p5.48xlarge"
      min_size      = 16
      max_size      = 128
      desired_size  = 32
    }
  }
}

# Provider configuration
provider "aws" {
  region = var.region
  
  default_tags {
    tags = local.common_tags
  }
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.region}a", "${var.region}b", "${var.region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  enable_dns_support = true
  
  tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
  
  public_subnet_tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                    = "1"
  }
  
  private_subnet_tags = {
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/internal-elb"           = "1"
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = var.cluster_name
  cluster_version = "1.28"
  
  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  
  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
  
  # EKS Managed Node Groups
  eks_managed_node_groups = {
    # CPU nodes for management workloads
    management = {
      instance_types = ["m6i.2xlarge"]
      
      min_size     = 3
      max_size     = 10
      desired_size = 5
      
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
      
      taints = {
        dedicated = {
          key    = "management"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
    }
    
    # GPU nodes for AI inference
    gpu_inference = {
      instance_types = [local.gpu_instances.inference.instance_type]
      
      min_size     = local.gpu_instances.inference.min_size
      max_size     = local.gpu_instances.inference.max_size
      desired_size = local.gpu_instances.inference.desired_size
      
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 500
            volume_type           = "gp3"
            iops                  = 16000
            throughput            = 1000
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
      
      # Additional EBS volumes for model storage
      additional_block_device_mappings = {
        xvdb = {
          device_name = "/dev/xvdb"
          ebs = {
            volume_size           = 2000  # 2TB for models
            volume_type           = "gp3"
            iops                  = 16000
            throughput            = 1000
            encrypted             = true
            delete_on_termination = false
          }
        }
      }
      
      taints = {
        dedicated = {
          key    = "gpu-inference"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
      
      labels = {
        "node.kubernetes.io/instance-type" = local.gpu_instances.inference.instance_type
        "nvidia.com/gpu.count"             = "8"
        "frontier.ai/workload-type"        = "inference"
      }
    }
    
    # GPU nodes for training (separate pool)
    gpu_training = {
      instance_types = [local.gpu_instances.training.instance_type]
      
      min_size     = local.gpu_instances.training.min_size
      max_size     = local.gpu_instances.training.max_size
      desired_size = local.gpu_instances.training.desired_size
      
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 1000
            volume_type           = "gp3"
            iops                  = 16000
            throughput            = 1000
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
      
      taints = {
        dedicated = {
          key    = "gpu-training"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
      
      labels = {
        "node.kubernetes.io/instance-type" = local.gpu_instances.training.instance_type
        "nvidia.com/gpu.count"             = "8"
        "frontier.ai/workload-type"        = "training"
      }
    }
  }
  
  # aws-auth configmap
  manage_aws_auth_configmap = true
  
  aws_auth_roles = [
    {
      rolearn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TeamRole"
      username = "team-role"
      groups   = ["system:masters"]
    },
  ]
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {}

# S3 Buckets for data storage
resource "aws_s3_bucket" "model_artifacts" {
  bucket = "${var.cluster_name}-model-artifacts"
}

resource "aws_s3_bucket_versioning" "model_artifacts" {
  bucket = aws_s3_bucket.model_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "model_artifacts" {
  bucket = aws_s3_bucket.model_artifacts.id
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket" "training_data" {
  bucket = "${var.cluster_name}-training-data"
}

resource "aws_s3_bucket_versioning" "training_data" {
  bucket = aws_s3_bucket.training_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "training_data" {
  bucket = aws_s3_bucket.training_data.id
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# ElastiCache for Redis (caching layer)
resource "aws_elasticache_subnet_group" "frontier_cache" {
  name       = "${var.cluster_name}-cache-subnet"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_replication_group" "frontier_cache" {
  description          = "Frontier AI Redis Cache"
  replication_group_id = "${var.cluster_name}-cache"
  
  port               = 6379
  parameter_group_name = "default.redis7"
  node_type          = "cache.r7g.2xlarge"
  num_cache_clusters = 3
  
  subnet_group_name = aws_elasticache_subnet_group.frontier_cache.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  tags = local.common_tags
}

# Security Groups
resource "aws_security_group" "redis" {
  name_prefix = "${var.cluster_name}-redis"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = local.common_tags
}

# Application Load Balancer
resource "aws_lb" "frontier_alb" {
  name               = "${var.cluster_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets
  
  enable_deletion_protection = false
  
  tags = local.common_tags
}

resource "aws_security_group" "alb" {
  name_prefix = "${var.cluster_name}-alb"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = local.common_tags
}

# RDS for metadata storage
resource "aws_db_subnet_group" "frontier_db" {
  name       = "${var.cluster_name}-db-subnet"
  subnet_ids = module.vpc.private_subnets
  
  tags = local.common_tags
}

resource "aws_db_instance" "frontier_metadata" {
  identifier     = "${var.cluster_name}-metadata"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  db_name  = "frontier"
  username = "frontieradmin"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.frontier_db.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  skip_final_snapshot = true
  
  tags = local.common_tags
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.cluster_name}-rds"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }
  
  tags = local.common_tags
}

# Outputs
output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "model_artifacts_bucket" {
  description = "S3 bucket for model artifacts"
  value       = aws_s3_bucket.model_artifacts.bucket
}

output "training_data_bucket" {
  description = "S3 bucket for training data"
  value       = aws_s3_bucket.training_data.bucket
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.frontier_cache.primary_endpoint_address
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.frontier_metadata.endpoint
  sensitive   = true
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.frontier_alb.dns_name
}
