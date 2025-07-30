# GCP Outputs for Frontier Infrastructure

# Network outputs
output "vpc_id" {
  description = "ID of the VPC network"
  value       = google_compute_network.frontier_vpc.id
}

output "vpc_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.frontier_vpc.name
}

output "subnet_id" {
  description = "ID of the GKE subnet"
  value       = google_compute_subnetwork.gke_subnet.id
}

output "subnet_name" {
  description = "Name of the GKE subnet"
  value       = google_compute_subnetwork.gke_subnet.name
}

# GKE cluster outputs
output "cluster_name" {
  description = "Name of the GKE cluster"
  value       = google_container_cluster.frontier_cluster.name
}

output "cluster_endpoint" {
  description = "Endpoint of the GKE cluster"
  value       = google_container_cluster.frontier_cluster.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "CA certificate of the GKE cluster"
  value       = google_container_cluster.frontier_cluster.master_auth.0.cluster_ca_certificate
  sensitive   = true
}

output "cluster_location" {
  description = "Location of the GKE cluster"
  value       = google_container_cluster.frontier_cluster.location
}

# Database outputs
output "db_instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.frontier_db.name
}

output "db_connection_name" {
  description = "Connection name of the Cloud SQL instance"
  value       = google_sql_database_instance.frontier_db.connection_name
}

output "db_private_ip" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.frontier_db.private_ip_address
}

output "database_name" {
  description = "Name of the database"
  value       = google_sql_database.frontier_database.name
}

output "database_user" {
  description = "Database username"
  value       = google_sql_user.frontier_user.name
}

# Redis outputs
output "redis_instance_id" {
  description = "ID of the Redis instance"
  value       = google_redis_instance.frontier_redis.id
}

output "redis_host" {
  description = "Host of the Redis instance"
  value       = google_redis_instance.frontier_redis.host
}

output "redis_port" {
  description = "Port of the Redis instance"
  value       = google_redis_instance.frontier_redis.port
}

output "redis_auth_string" {
  description = "Auth string for Redis instance"
  value       = google_redis_instance.frontier_redis.auth_string
  sensitive   = true
}

# Storage outputs
output "frontend_bucket_name" {
  description = "Name of the frontend storage bucket"
  value       = google_storage_bucket.frontend_bucket.name
}

output "frontend_bucket_url" {
  description = "URL of the frontend storage bucket"
  value       = google_storage_bucket.frontend_bucket.url
}

output "media_bucket_name" {
  description = "Name of the media storage bucket"
  value       = google_storage_bucket.media_bucket.name
}

output "media_bucket_url" {
  description = "URL of the media storage bucket"
  value       = google_storage_bucket.media_bucket.url
}

output "backup_bucket_name" {
  description = "Name of the backup storage bucket"
  value       = google_storage_bucket.backup_bucket.name
}

output "backup_bucket_url" {
  description = "URL of the backup storage bucket"
  value       = google_storage_bucket.backup_bucket.url
}

# CDN outputs
output "frontend_ip_address" {
  description = "IP address of the frontend load balancer"
  value       = google_compute_global_forwarding_rule.frontend_forwarding_rule.ip_address
}

output "frontend_url" {
  description = "URL of the frontend application"
  value       = "https://${var.frontend_domain}"
}

# Container Registry outputs
output "container_registry_url" {
  description = "URL of the Container Registry"
  value       = google_container_registry.frontier_registry.bucket_self_link
}

output "artifact_registry_url" {
  description = "URL of the Artifact Registry"
  value       = google_artifact_registry_repository.frontier_repo.name
}

# Service Account outputs
output "gke_service_account_email" {
  description = "Email of the GKE service account"
  value       = google_service_account.gke_nodes.email
}

output "workload_identity_service_account_email" {
  description = "Email of the Workload Identity service account"
  value       = google_service_account.workload_identity.email
}

output "monitoring_service_account_email" {
  description = "Email of the monitoring service account"
  value       = google_service_account.monitoring.email
}

output "cicd_service_account_email" {
  description = "Email of the CI/CD service account"
  value       = google_service_account.cicd.email
}

# KMS outputs
output "kms_key_id" {
  description = "ID of the KMS key"
  value       = google_kms_crypto_key.frontier_key.id
}

output "kms_key_name" {
  description = "Name of the KMS key"
  value       = google_kms_crypto_key.frontier_key.name
}

# Secret Manager outputs
output "db_password_secret_id" {
  description = "Secret Manager ID for database password"
  value       = google_secret_manager_secret.db_password.secret_id
}

output "redis_auth_secret_id" {
  description = "Secret Manager ID for Redis auth"
  value       = google_secret_manager_secret.redis_auth.secret_id
}

output "jwt_secret_secret_id" {
  description = "Secret Manager ID for JWT secret"
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

# Kubernetes configuration
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.frontier_cluster.name} --region ${var.region} --project ${var.project_id}"
}

# Environment information
output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP region"
  value       = var.region
}

# DNS information
output "dns_records_to_create" {
  description = "DNS records that need to be created"
  value = {
    frontend = {
      name = var.frontend_domain
      type = "A"
      value = google_compute_global_forwarding_rule.frontend_forwarding_rule.ip_address
    }
  }
}

# Monitoring URLs
output "monitoring_urls" {
  description = "URLs for monitoring and management"
  value = {
    console_url = "https://console.cloud.google.com/kubernetes/clusters/details/${var.region}/${google_container_cluster.frontier_cluster.name}/details?project=${var.project_id}"
    logs_url    = "https://console.cloud.google.com/logs/query?project=${var.project_id}"
    metrics_url = "https://console.cloud.google.com/monitoring?project=${var.project_id}"
  }
}
