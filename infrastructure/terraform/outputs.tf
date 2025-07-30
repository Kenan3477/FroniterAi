# Outputs for Main Infrastructure
# Provides key information about deployed resources

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = module.vpc.database_subnet_ids
}

# EKS Outputs
output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider"
  value       = module.eks.oidc_provider_arn
}

output "node_groups" {
  description = "EKS node groups"
  value       = module.eks.node_groups
}

# Load Balancer Outputs
output "load_balancer_dns_name" {
  description = "The DNS name of the load balancer"
  value       = module.alb.load_balancer_dns_name
}

output "load_balancer_arn" {
  description = "The ARN of the load balancer"
  value       = module.alb.load_balancer_arn
}

output "load_balancer_zone_id" {
  description = "The canonical hosted zone ID of the load balancer"
  value       = module.alb.load_balancer_zone_id
}

output "target_groups" {
  description = "ARNs of the target groups"
  value       = module.alb.target_groups
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = module.rds.db_instance_id
}

output "rds_master_user_secret_arn" {
  description = "ARN of the master user secret"
  value       = module.rds.db_instance_master_user_secret_arn
  sensitive   = true
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "redis_auth_token" {
  description = "Redis auth token"
  value       = random_password.redis_auth.result
  sensitive   = true
}

# S3 Outputs
output "app_storage_bucket" {
  description = "Name of the application storage bucket"
  value       = aws_s3_bucket.app_storage.bucket
}

output "alb_logs_bucket" {
  description = "Name of the ALB logs bucket"
  value       = aws_s3_bucket.alb_logs.bucket
}

output "backup_bucket" {
  description = "Name of the backup bucket"
  value       = aws_s3_bucket.backup.bucket
}

# Monitoring Outputs
output "monitoring_endpoints" {
  description = "Monitoring service endpoints"
  value       = length(module.monitoring) > 0 ? module.monitoring[0].monitoring_endpoints : null
}

output "grafana_admin_password" {
  description = "Grafana admin password"
  value       = random_password.grafana_admin.result
  sensitive   = true
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = length(module.monitoring) > 0 ? module.monitoring[0].cloudwatch_dashboard_url : null
}

# Security Outputs
output "kms_key_id" {
  description = "The globally unique identifier for the key"
  value       = aws_kms_key.main.key_id
}

output "kms_key_arn" {
  description = "The Amazon Resource Name (ARN) of the key"
  value       = aws_kms_key.main.arn
}

output "sns_alerts_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

# Environment Information
output "environment" {
  description = "Current environment"
  value       = var.environment
}

output "region" {
  description = "AWS region"
  value       = data.aws_region.current.name
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# Connectivity Information
output "kubectl_config" {
  description = "kubectl config command"
  value       = "aws eks update-kubeconfig --region ${data.aws_region.current.name} --name ${module.eks.cluster_name}"
}

output "application_urls" {
  description = "Application access URLs"
  value = {
    load_balancer = "https://${module.alb.load_balancer_dns_name}"
    grafana      = length(module.monitoring) > 0 ? "https://${var.grafana_domain}" : "Not configured"
    kibana       = length(module.monitoring) > 0 && var.enable_elk_stack ? "https://${var.kibana_domain}" : "Not configured"
    jaeger       = length(module.monitoring) > 0 && var.enable_distributed_tracing ? "https://${var.jaeger_domain}" : "Not configured"
  }
}

# Cost Information
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    environment = var.environment
    note       = "Actual costs may vary based on usage patterns"
    components = {
      eks_cluster         = "$73/month"
      node_groups        = "Variable based on instance types and count"
      rds_database       = "Variable based on instance class and Multi-AZ"
      redis_cache        = "Variable based on node type and count"
      load_balancer      = "$22/month"
      nat_gateway        = "$32/month per gateway"
      s3_storage         = "Variable based on usage"
      data_transfer      = "Variable based on usage"
      monitoring_stack   = "Variable based on retention and ingestion"
    }
  }
}

# Compliance Information
output "compliance_status" {
  description = "Compliance and security features enabled"
  value = {
    encryption_at_rest     = "Enabled (KMS)"
    encryption_in_transit  = "Enabled"
    vpc_flow_logs         = var.enable_flow_logs ? "Enabled" : "Disabled"
    multi_az_database     = var.environment == "prod" ? "Enabled" : "Disabled"
    backup_enabled        = local.env_config.enable_backup ? "Enabled" : "Disabled"
    monitoring_enabled    = local.env_config.enable_monitoring ? "Enabled" : "Disabled"
    data_sovereignty      = "Configured for ${startswith(data.aws_region.current.name, "us") ? "US" : startswith(data.aws_region.current.name, "eu") ? "EU" : "Asia"}"
  }
}

# Quick Start Commands
output "quick_start_commands" {
  description = "Commands to get started with the infrastructure"
  value = {
    connect_to_cluster = "aws eks update-kubeconfig --region ${data.aws_region.current.name} --name ${module.eks.cluster_name}"
    view_nodes        = "kubectl get nodes"
    view_pods         = "kubectl get pods --all-namespaces"
    access_grafana    = length(module.monitoring) > 0 ? "Username: admin, Password: ${random_password.grafana_admin.result}" : "Monitoring not enabled"
    check_alb         = "kubectl get ingress --all-namespaces"
  }
  sensitive = true
}
