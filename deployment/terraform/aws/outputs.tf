# AWS Infrastructure Outputs

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.frontier_vpc.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.frontier_vpc.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public_subnets[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private_subnets[*].id
}

# EKS Outputs
output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.frontier_cluster.id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.frontier_cluster.arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.frontier_cluster.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.frontier_cluster.vpc_config[0].cluster_security_group_id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster OIDC Issuer"
  value       = aws_eks_cluster.frontier_cluster.identity[0].oidc[0].issuer
}

output "cluster_primary_security_group_id" {
  description = "The cluster primary security group ID created by EKS"
  value       = aws_eks_cluster.frontier_cluster.vpc_config[0].cluster_security_group_id
}

output "node_group_arn" {
  description = "Amazon Resource Name (ARN) of the EKS Node Group"
  value       = aws_eks_node_group.frontier_nodes.arn
}

output "node_group_status" {
  description = "Status of the EKS Node Group"
  value       = aws_eks_node_group.frontier_nodes.status
}

# Database Outputs
output "rds_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.frontier_db.id
}

output "rds_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.frontier_db.arn
}

output "rds_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.frontier_db.endpoint
  sensitive   = true
}

output "rds_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.frontier_db.port
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.frontier_db.db_name
}

# Redis Outputs
output "redis_cluster_id" {
  description = "ElastiCache Redis cluster ID"
  value       = aws_elasticache_replication_group.frontier_redis.id
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.frontier_redis.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_replication_group.frontier_redis.port
}

# S3 Outputs
output "app_bucket_name" {
  description = "Name of the S3 bucket for application assets"
  value       = aws_s3_bucket.frontier_app_bucket.bucket
}

output "app_bucket_arn" {
  description = "ARN of the S3 bucket for application assets"
  value       = aws_s3_bucket.frontier_app_bucket.arn
}

output "data_bucket_name" {
  description = "Name of the S3 bucket for data storage"
  value       = aws_s3_bucket.frontier_data_bucket.bucket
}

output "data_bucket_arn" {
  description = "ARN of the S3 bucket for data storage"
  value       = aws_s3_bucket.frontier_data_bucket.arn
}

output "backup_bucket_name" {
  description = "Name of the S3 bucket for backups"
  value       = aws_s3_bucket.frontier_backup_bucket.bucket
}

output "backup_bucket_arn" {
  description = "ARN of the S3 bucket for backups"
  value       = aws_s3_bucket.frontier_backup_bucket.arn
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontier_cdn.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.frontier_cdn.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontier_cdn.domain_name
}

# Load Balancer Outputs
output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.frontier_alb.arn
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.frontier_alb.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.frontier_alb.zone_id
}

# ECR Outputs
output "ecr_api_repository_url" {
  description = "URL of the ECR repository for API"
  value       = aws_ecr_repository.frontier_api.repository_url
}

output "ecr_web_repository_url" {
  description = "URL of the ECR repository for Web"
  value       = aws_ecr_repository.frontier_web.repository_url
}

output "ecr_ml_repository_url" {
  description = "URL of the ECR repository for ML"
  value       = aws_ecr_repository.frontier_ml.repository_url
}

# IAM Outputs
output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster_role.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node group IAM role"
  value       = aws_iam_role.eks_node_role.arn
}

output "aws_load_balancer_controller_role_arn" {
  description = "ARN of the AWS Load Balancer Controller IAM role"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

output "ebs_csi_driver_role_arn" {
  description = "ARN of the EBS CSI driver IAM role"
  value       = aws_iam_role.ebs_csi_driver.arn
}

output "cluster_autoscaler_role_arn" {
  description = "ARN of the Cluster Autoscaler IAM role"
  value       = aws_iam_role.cluster_autoscaler.arn
}

# KMS Outputs
output "eks_encryption_key_arn" {
  description = "ARN of the KMS key for EKS encryption"
  value       = aws_kms_key.eks_encryption_key.arn
}

output "rds_encryption_key_arn" {
  description = "ARN of the KMS key for RDS encryption"
  value       = aws_kms_key.rds_encryption_key.arn
}

output "s3_encryption_key_arn" {
  description = "ARN of the KMS key for S3 encryption"
  value       = aws_kms_key.s3_encryption_key.arn
}

output "ecr_encryption_key_arn" {
  description = "ARN of the KMS key for ECR encryption"
  value       = aws_kms_key.ecr_encryption_key.arn
}

# Secrets Manager Outputs
output "database_secret_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.database_credentials.arn
}

output "redis_secret_arn" {
  description = "ARN of the Redis credentials secret"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

# Route53 Outputs (conditional)
output "route53_zone_id" {
  description = "Route53 zone ID"
  value       = var.create_route53_zone ? aws_route53_zone.frontier_zone[0].zone_id : null
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = var.create_route53_zone ? aws_route53_zone.frontier_zone[0].name_servers : null
}

# ACM Outputs (conditional)
output "ssl_certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = var.create_ssl_certificate ? aws_acm_certificate.frontier_cert[0].arn : null
}

# CloudWatch Outputs
output "eks_cluster_log_group_name" {
  description = "Name of the EKS cluster CloudWatch log group"
  value       = aws_cloudwatch_log_group.eks_cluster_logs.name
}

output "application_log_group_name" {
  description = "Name of the application CloudWatch log group"
  value       = aws_cloudwatch_log_group.application_logs.name
}

# Environment Configuration Summary
output "environment_summary" {
  description = "Summary of the deployed environment"
  value = {
    environment         = var.environment
    region             = var.aws_region
    vpc_cidr           = var.vpc_cidr
    kubernetes_version = var.kubernetes_version
    node_count         = var.node_desired_size
    rds_instance_class = var.rds_instance_class
    redis_node_type    = var.redis_node_type
  }
}

# Connection Information
output "connection_info" {
  description = "Connection information for the deployed infrastructure"
  value = {
    cluster_name    = aws_eks_cluster.frontier_cluster.name
    cluster_endpoint = aws_eks_cluster.frontier_cluster.endpoint
    cluster_region  = var.aws_region
    database_endpoint = aws_db_instance.frontier_db.endpoint
    redis_endpoint  = aws_elasticache_replication_group.frontier_redis.primary_endpoint_address
    alb_dns_name   = aws_lb.frontier_alb.dns_name
    cloudfront_domain = aws_cloudfront_distribution.frontier_cdn.domain_name
  }
  sensitive = true
}
