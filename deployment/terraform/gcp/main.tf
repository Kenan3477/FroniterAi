# GCP Infrastructure Configuration for Frontier
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
}

# Provider configurations
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Data sources
data "google_client_config" "default" {}

data "google_compute_zones" "available" {
  region = var.region
}

# VPC Network
resource "google_compute_network" "frontier_vpc" {
  name                    = "${var.environment}-frontier-vpc"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"

  depends_on = [
    google_project_service.compute_api,
  ]

  lifecycle {
    prevent_destroy = true
  }
}

# Subnet for GKE cluster
resource "google_compute_subnetwork" "gke_subnet" {
  name          = "${var.environment}-gke-subnet"
  ip_cidr_range = var.gke_subnet_cidr
  region        = var.region
  network       = google_compute_network.frontier_vpc.id

  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = var.gke_pods_cidr
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = var.gke_services_cidr
  }

  private_ip_google_access = true
}

# Cloud NAT for private GKE nodes
resource "google_compute_router" "nat_router" {
  name    = "${var.environment}-nat-router"
  region  = var.region
  network = google_compute_network.frontier_vpc.id
}

resource "google_compute_router_nat" "nat_gateway" {
  name                               = "${var.environment}-nat-gateway"
  router                            = google_compute_router.nat_router.name
  region                            = var.region
  nat_ip_allocate_option           = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall rules
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.environment}-allow-internal"
  network = google_compute_network.frontier_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    var.gke_subnet_cidr,
    var.gke_pods_cidr,
    var.gke_services_cidr
  ]
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.environment}-allow-ssh"
  network = google_compute_network.frontier_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["ssh-allowed"]
}

# Enable required APIs
resource "google_project_service" "compute_api" {
  service = "compute.googleapis.com"
}

resource "google_project_service" "container_api" {
  service = "container.googleapis.com"
}

resource "google_project_service" "sql_api" {
  service = "sqladmin.googleapis.com"
}

resource "google_project_service" "redis_api" {
  service = "redis.googleapis.com"
}

resource "google_project_service" "storage_api" {
  service = "storage.googleapis.com"
}

resource "google_project_service" "cloudresourcemanager_api" {
  service = "cloudresourcemanager.googleapis.com"
}

resource "google_project_service" "iam_api" {
  service = "iam.googleapis.com"
}

resource "google_project_service" "monitoring_api" {
  service = "monitoring.googleapis.com"
}

resource "google_project_service" "logging_api" {
  service = "logging.googleapis.com"
}

# GKE Cluster
resource "google_container_cluster" "frontier_cluster" {
  name     = "${var.environment}-frontier-cluster"
  location = var.region

  network    = google_compute_network.frontier_vpc.name
  subnetwork = google_compute_subnetwork.gke_subnet.name

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  # Enable workload identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Network configuration
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = var.gke_master_cidr
  }

  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All networks"
    }
  }

  # Addons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
    dns_cache_config {
      enabled = true
    }
  }

  # Network policy
  network_policy {
    enabled = true
  }

  # Logging and monitoring
  logging_service    = "logging.googleapis.com/kubernetes"
  monitoring_service = "monitoring.googleapis.com/kubernetes"

  # Maintenance policy
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Resource labels
  resource_labels = {
    environment = var.environment
    team        = "frontier"
    managed-by  = "terraform"
  }

  depends_on = [
    google_project_service.container_api,
    google_compute_subnetwork.gke_subnet,
  ]

  lifecycle {
    prevent_destroy = true
  }
}

# GKE Node Pools
resource "google_container_node_pool" "frontier_nodes" {
  name       = "${var.environment}-frontier-nodes"
  location   = var.region
  cluster    = google_container_cluster.frontier_cluster.name
  node_count = var.gke_node_count

  node_config {
    preemptible  = var.environment == "dev"
    machine_type = var.gke_node_machine_type
    disk_size_gb = var.gke_node_disk_size
    disk_type    = "pd-ssd"

    # Service account
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Workload identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Labels
    labels = {
      environment = var.environment
      node-pool   = "frontier-nodes"
    }

    # Taints for specific workloads
    dynamic "taint" {
      for_each = var.environment == "prod" ? [1] : []
      content {
        key    = "dedicated"
        value  = "frontier"
        effect = "NO_SCHEDULE"
      }
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  # Autoscaling
  autoscaling {
    min_node_count = var.gke_min_node_count
    max_node_count = var.gke_max_node_count
  }

  # Node management
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  # Upgrade settings
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  depends_on = [
    google_service_account.gke_nodes,
  ]

  lifecycle {
    ignore_changes = [node_count]
  }
}

# GPU node pool for ML workloads
resource "google_container_node_pool" "gpu_nodes" {
  count      = var.enable_gpu_nodes ? 1 : 0
  name       = "${var.environment}-gpu-nodes"
  location   = var.region
  cluster    = google_container_cluster.frontier_cluster.name
  node_count = var.gpu_node_count

  node_config {
    preemptible  = var.environment == "dev"
    machine_type = var.gpu_machine_type
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    # GPU configuration
    guest_accelerator {
      type  = var.gpu_type
      count = 1
    }

    # Service account
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Workload identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Labels and taints
    labels = {
      environment = var.environment
      node-pool   = "gpu-nodes"
      gpu-type    = var.gpu_type
    }

    taint {
      key    = "nvidia.com/gpu"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  autoscaling {
    min_node_count = 0
    max_node_count = var.gpu_max_node_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  depends_on = [
    google_service_account.gke_nodes,
  ]

  lifecycle {
    ignore_changes = [node_count]
  }
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "frontier_db" {
  name             = "${var.environment}-frontier-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier                        = var.db_tier
    availability_type          = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_type                  = "PD_SSD"
    disk_size                  = var.db_disk_size
    disk_autoresize           = true
    disk_autoresize_limit     = var.db_max_disk_size

    backup_configuration {
      enabled                        = true
      start_time                    = "03:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = var.environment == "prod" ? 30 : 7
      }
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                              = google_compute_network.frontier_vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    database_flags {
      name  = "log_statement"
      value = "all"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 3
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length    = 1024
      record_application_tags = true
      record_client_address  = true
    }
  }

  deletion_protection = var.environment == "prod"

  depends_on = [
    google_project_service.sql_api,
    google_service_networking_connection.private_vpc_connection,
  ]

  lifecycle {
    prevent_destroy = true
  }
}

# Database
resource "google_sql_database" "frontier_database" {
  name     = "frontier"
  instance = google_sql_database_instance.frontier_db.name
}

# Database user
resource "google_sql_user" "frontier_user" {
  name     = "frontier"
  instance = google_sql_database_instance.frontier_db.name
  password = var.db_password
}

# Private service connection for Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.environment}-private-ip-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.frontier_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.frontier_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]

  depends_on = [
    google_project_service.sql_api,
  ]
}

# Redis Memorystore instance
resource "google_redis_instance" "frontier_redis" {
  name           = "${var.environment}-frontier-redis"
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size
  region         = var.region

  location_id             = data.google_compute_zones.available.names[0]
  alternative_location_id = length(data.google_compute_zones.available.names) > 1 ? data.google_compute_zones.available.names[1] : null

  authorized_network = google_compute_network.frontier_vpc.id
  connect_mode      = "PRIVATE_SERVICE_ACCESS"

  redis_version     = "REDIS_7_0"
  display_name     = "${var.environment} Frontier Redis"
  reserved_ip_range = var.redis_ip_range

  # Redis configuration
  redis_configs = {
    maxmemory-policy = "allkeys-lru"
    notify-keyspace-events = "Ex"
  }

  # Maintenance policy
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  depends_on = [
    google_project_service.redis_api,
  ]

  lifecycle {
    prevent_destroy = true
  }
}

# Cloud Storage buckets
resource "google_storage_bucket" "frontend_bucket" {
  name          = "${var.project_id}-${var.environment}-frontend"
  location      = var.region
  force_destroy = var.environment == "dev"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "media_bucket" {
  name          = "${var.project_id}-${var.environment}-media"
  location      = var.region
  force_destroy = var.environment == "dev"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 1095  # 3 years
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}

resource "google_storage_bucket" "backup_bucket" {
  name          = "${var.project_id}-${var.environment}-backup"
  location      = var.region
  force_destroy = var.environment == "dev"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}

# Cloud CDN
resource "google_compute_backend_bucket" "frontend_backend" {
  name        = "${var.environment}-frontend-backend"
  bucket_name = google_storage_bucket.frontend_bucket.name
  enable_cdn  = true

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 3600
    max_ttl          = 86400
    negative_caching  = true

    negative_caching_policy {
      code = 404
      ttl  = 60
    }

    negative_caching_policy {
      code = 410
      ttl  = 60
    }
  }
}

resource "google_compute_url_map" "frontend_url_map" {
  name            = "${var.environment}-frontend-url-map"
  default_service = google_compute_backend_bucket.frontend_backend.id

  host_rule {
    hosts        = [var.frontend_domain]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_bucket.frontend_backend.id
  }
}

resource "google_compute_target_https_proxy" "frontend_proxy" {
  name             = "${var.environment}-frontend-proxy"
  url_map          = google_compute_url_map.frontend_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.frontend_cert.id]
}

resource "google_compute_managed_ssl_certificate" "frontend_cert" {
  name = "${var.environment}-frontend-cert"

  managed {
    domains = [var.frontend_domain]
  }
}

resource "google_compute_global_forwarding_rule" "frontend_forwarding_rule" {
  name       = "${var.environment}-frontend-forwarding-rule"
  target     = google_compute_target_https_proxy.frontend_proxy.id
  port_range = "443"
}

# Container Registry
resource "google_container_registry" "frontier_registry" {
  project  = var.project_id
  location = "US"
}

# Artifact Registry for containers
resource "google_artifact_registry_repository" "frontier_repo" {
  location      = var.region
  repository_id = "${var.environment}-frontier"
  description   = "Frontier container images"
  format        = "DOCKER"

  depends_on = [
    google_project_service.compute_api,
  ]
}

# Configure kubectl to access the cluster
resource "null_resource" "configure_kubectl" {
  depends_on = [google_container_cluster.frontier_cluster]

  provisioner "local-exec" {
    command = "gcloud container clusters get-credentials ${google_container_cluster.frontier_cluster.name} --region ${var.region} --project ${var.project_id}"
  }
}

# Kubernetes provider configuration
provider "kubernetes" {
  host                   = "https://${google_container_cluster.frontier_cluster.endpoint}"
  token                 = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.frontier_cluster.master_auth.0.cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${google_container_cluster.frontier_cluster.endpoint}"
    token                 = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(google_container_cluster.frontier_cluster.master_auth.0.cluster_ca_certificate)
  }
}
