# Main Infrastructure Configuration for Frontier
# Orchestrates the complete cloud-native infrastructure deployment

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  
  backend "s3" {
    bucket         = "frontier-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Local values for configuration
locals {
  # Environment-specific configurations
  environment_configs = {
    dev = {
      instance_type = "t3.medium"
      min_size     = 1
      max_size     = 3
      desired_size = 2
      enable_monitoring = false
      enable_backup = false
    }
    staging = {
      instance_type = "t3.large"
      min_size     = 2
      max_size     = 6
      desired_size = 3
      enable_monitoring = true
      enable_backup = true
    }
    prod = {
      instance_type = "c5.xlarge"
      min_size     = 3
      max_size     = 20
      desired_size = 5
      enable_monitoring = true
      enable_backup = true
    }
  }
  
  # Current environment configuration
  env_config = local.environment_configs[var.environment]
  
  # Availability zones
  availability_zones = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Data sovereignty compliance
  data_sovereignty_config = {
    us = {
      allowed_regions = ["us-west-2", "us-east-1"]
      compliance_frameworks = ["SOC2", "HIPAA"]
    }
    eu = {
      allowed_regions = ["eu-west-1", "eu-central-1"]
      compliance_frameworks = ["GDPR", "SOC2"]
    }
    asia = {
      allowed_regions = ["ap-southeast-1", "ap-northeast-1"]
      compliance_frameworks = ["SOC2"]
    }
  }
  
  # Common tags
  common_tags = {
    Project             = var.project_name
    Environment         = var.environment
    CostCenter         = var.cost_center
    DataClassification = var.data_classification
    ManagedBy          = "terraform"
    Owner              = "frontier-team"
    CreatedAt          = timestamp()
  }
  
  # GPU instance configuration for Frontier AI workloads
  gpu_instance_types = {
    small  = "g4dn.xlarge"
    medium = "g4dn.2xlarge"
    large  = "p3.2xlarge"
    xlarge = "p3.8xlarge"
  }
  
  # Cluster name
  cluster_name = "${var.project_name}-${var.environment}-cluster"
}

# KMS Key for encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for ${var.project_name} ${var.environment}"
  deletion_window_in_days = var.kms_deletion_window
  enable_key_rotation     = true
  
  tags = local.common_tags
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.project_name}-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}

# VPC and Networking
module "vpc" {
  source = "./modules/networking/vpc"
  
  name_prefix                = "${var.project_name}-${var.environment}"
  vpc_cidr                  = var.vpc_cidr
  availability_zones        = local.availability_zones
  public_subnet_cidrs       = var.public_subnet_cidrs
  private_subnet_cidrs      = var.private_subnet_cidrs
  database_subnet_cidrs     = var.database_subnet_cidrs
  enable_nat_gateway        = var.enable_nat_gateway
  enable_vpn_gateway        = var.enable_vpn_gateway
  enable_flow_logs          = var.enable_flow_logs
  flow_logs_retention_days  = var.flow_logs_retention_days
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/compute/eks"
  
  cluster_name                            = local.cluster_name
  kubernetes_version                     = var.kubernetes_version
  vpc_id                                 = module.vpc.vpc_id
  public_subnet_ids                      = module.vpc.public_subnet_ids
  private_subnet_ids                     = module.vpc.private_subnet_ids
  endpoint_private_access                = var.eks_endpoint_private_access
  endpoint_public_access                 = var.eks_endpoint_public_access
  public_access_cidrs                    = var.eks_public_access_cidrs
  cluster_security_group_ingress_cidrs   = [module.vpc.vpc_cidr_block]
  ssh_access_cidrs                       = [module.vpc.vpc_cidr_block]
  ssh_key_name                          = var.ssh_key_name
  kms_key_arn                           = aws_kms_key.main.arn
  cluster_log_types                     = var.eks_cluster_log_types
  log_retention_days                    = var.log_retention_days
  
  # Node Groups
  node_groups = {
    general = {
      instance_types             = [local.env_config.instance_type]
      ami_type                  = "AL2_x86_64"
      capacity_type             = var.use_spot_instances ? "SPOT" : "ON_DEMAND"
      disk_size                 = 50
      desired_size              = local.env_config.desired_size
      max_size                  = local.env_config.max_size
      min_size                  = local.env_config.min_size
      max_unavailable_percentage = 25
      gpu_enabled               = false
      labels = {
        role = "general"
        environment = var.environment
      }
    }
    
    gpu = {
      instance_types             = [local.gpu_instance_types[var.gpu_instance_size]]
      ami_type                  = "AL2_x86_64_GPU"
      capacity_type             = "ON_DEMAND"
      disk_size                 = 100
      desired_size              = var.gpu_node_desired_size
      max_size                  = var.gpu_node_max_size
      min_size                  = var.gpu_node_min_size
      max_unavailable_percentage = 25
      gpu_enabled               = true
      labels = {
        role = "gpu"
        environment = var.environment
        "nvidia.com/gpu" = "true"
      }
    }
  }
  
  # Fargate Profiles
  fargate_profiles = {
    frontend = {
      namespace = "frontend"
      labels = {
        app = "frontend"
      }
    }
  }
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/networking/alb"
  
  load_balancer_name        = "${var.project_name}-${var.environment}-alb"
  vpc_id                   = module.vpc.vpc_id
  public_subnet_ids        = module.vpc.public_subnet_ids
  private_subnet_ids       = module.vpc.private_subnet_ids
  internal                 = false
  enable_deletion_protection = var.environment == "prod"
  enable_https             = var.enable_https_alb
  ssl_policy              = var.ssl_policy
  certificate_arn         = var.certificate_arn
  default_target_group    = "frontend"
  enable_access_logs      = true
  access_logs_bucket      = aws_s3_bucket.alb_logs.bucket
  access_logs_prefix      = "alb-logs"
  
  target_groups = {
    frontend = {
      port        = 80
      protocol    = "HTTP"
      target_type = "ip"
      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }
      stickiness = {
        type            = "lb_cookie"
        cookie_duration = 86400
        enabled         = false
      }
    }
    
    api = {
      port        = 8080
      protocol    = "HTTP"
      target_type = "ip"
      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/api/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }
      stickiness = {
        type            = "lb_cookie"
        cookie_duration = 86400
        enabled         = false
      }
    }
  }
  
  listener_rules = {
    api = {
      priority = 100
      action = {
        type         = "forward"
        target_group = "api"
        redirect = {
          host        = ""
          path        = ""
          port        = ""
          protocol    = ""
          query       = ""
          status_code = ""
        }
        fixed_response = {
          content_type = ""
          message_body = ""
          status_code  = ""
        }
      }
      conditions = [
        {
          type               = "path-pattern"
          values             = ["/api/*"]
          http_header_name   = ""
          query_strings      = []
        }
      ]
    }
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  
  tags = local.common_tags
}

# RDS Database
module "rds" {
  source = "./modules/data/rds"
  
  identifier              = "${var.project_name}-${var.environment}-db"
  vpc_id                 = module.vpc.vpc_id
  db_subnet_group_name   = module.vpc.db_subnet_group_name
  engine                 = var.db_engine
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = var.db_max_allocated_storage
  storage_encrypted      = true
  kms_key_id            = aws_kms_key.main.arn
  db_name               = var.db_name
  username              = var.db_username
  manage_master_user_password = true
  port                  = var.db_port
  backup_retention_period = var.db_backup_retention_period
  backup_window         = var.db_backup_window
  maintenance_window    = var.db_maintenance_window
  multi_az              = var.environment == "prod"
  read_replica_count    = var.environment == "prod" ? 2 : 0
  deletion_protection   = var.environment == "prod"
  skip_final_snapshot   = var.environment != "prod"
  
  allowed_security_groups = [module.eks.cluster_primary_security_group_id]
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  performance_insights_enabled    = true
  monitoring_interval            = 60
  
  alarm_actions = [aws_sns_topic.alerts.arn]
  
  tags = local.common_tags
}

# Redis Cache
resource "aws_elasticache_replication_group" "main" {
  replication_group_id         = "${var.project_name}-${var.environment}-redis"
  description                  = "Redis cluster for ${var.project_name} ${var.environment}"
  
  node_type                   = var.redis_node_type
  port                        = 6379
  parameter_group_name        = aws_elasticache_parameter_group.redis.name
  subnet_group_name           = module.vpc.cache_subnet_group_name
  security_group_ids          = [aws_security_group.redis.id]
  
  num_cache_clusters          = var.environment == "prod" ? 3 : 1
  
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                  = random_password.redis_auth.result
  kms_key_id                 = aws_kms_key.main.arn
  
  automatic_failover_enabled  = var.environment == "prod"
  multi_az_enabled           = var.environment == "prod"
  
  snapshot_retention_limit    = var.redis_snapshot_retention_limit
  snapshot_window            = var.redis_snapshot_window
  maintenance_window         = var.redis_maintenance_window
  
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
  
  tags = local.common_tags
}

# S3 Buckets
resource "aws_s3_bucket" "app_storage" {
  bucket = "${var.project_name}-${var.environment}-app-storage-${random_id.bucket_suffix.hex}"
  
  tags = local.common_tags
}

resource "aws_s3_bucket" "alb_logs" {
  bucket = "${var.project_name}-${var.environment}-alb-logs-${random_id.bucket_suffix.hex}"
  
  tags = local.common_tags
}

resource "aws_s3_bucket" "backup" {
  bucket = "${var.project_name}-${var.environment}-backup-${random_id.bucket_suffix.hex}"
  
  tags = local.common_tags
}

# Monitoring Stack
module "monitoring" {
  count = local.env_config.enable_monitoring ? 1 : 0
  source = "./modules/monitoring/prometheus-grafana"
  
  cluster_name                = local.cluster_name
  aws_region                 = data.aws_region.current.name
  grafana_admin_password     = random_password.grafana_admin.result
  grafana_ingress_host       = var.grafana_domain
  kibana_ingress_host        = var.kibana_domain
  jaeger_ingress_host        = var.jaeger_domain
  enable_elk_stack           = var.enable_elk_stack
  enable_distributed_tracing = var.enable_distributed_tracing
  enable_cloudwatch_logs     = true
  cloudwatch_log_group_name  = "/aws/eks/${local.cluster_name}/cluster"
  
  load_balancer_arn_suffix   = module.alb.load_balancer_arn_suffix
  rds_instance_id           = module.rds.db_instance_id
  node_group_names          = toset(keys(module.eks.node_groups))
  
  alert_email_addresses = var.alert_email_addresses
  
  tags = local.common_tags
  
  depends_on = [module.eks]
}

# Supporting Resources
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "random_password" "redis_auth" {
  length  = 32
  special = true
}

resource "random_password" "grafana_admin" {
  length  = 16
  special = true
}

resource "aws_elasticache_parameter_group" "redis" {
  family = "redis7.x"
  name   = "${var.project_name}-${var.environment}-redis-params"
  
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  tags = local.common_tags
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-${var.environment}-redis-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.cluster_primary_security_group_id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  })
}

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-redis/slow-log"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.main.arn
  
  tags = local.common_tags
}

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
  
  tags = local.common_tags
}

# S3 Bucket configurations
resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.main.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ALB Logs bucket configuration
resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  
  rule {
    id     = "delete_old_logs"
    status = "Enabled"
    
    expiration {
      days = 90
    }
    
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}
