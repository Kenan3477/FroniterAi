# GCP Service Accounts and IAM Configuration for Frontier

# Service account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.environment}-gke-nodes"
  display_name = "${var.environment} GKE Nodes Service Account"
  description  = "Service account for GKE nodes in ${var.environment} environment"
}

# Service account for Workload Identity
resource "google_service_account" "workload_identity" {
  account_id   = "${var.environment}-workload-identity"
  display_name = "${var.environment} Workload Identity Service Account"
  description  = "Service account for Kubernetes workloads using Workload Identity"
}

# Service account for monitoring
resource "google_service_account" "monitoring" {
  account_id   = "${var.environment}-monitoring"
  display_name = "${var.environment} Monitoring Service Account"
  description  = "Service account for monitoring and logging"
}

# Service account for CI/CD
resource "google_service_account" "cicd" {
  account_id   = "${var.environment}-cicd"
  display_name = "${var.environment} CI/CD Service Account"
  description  = "Service account for CI/CD pipelines"
}

# IAM bindings for GKE nodes
resource "google_project_iam_member" "gke_nodes_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_registry" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# IAM bindings for workload identity
resource "google_project_iam_member" "workload_identity_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

resource "google_project_iam_member" "workload_identity_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

resource "google_project_iam_member" "workload_identity_redis" {
  project = var.project_id
  role    = "roles/redis.editor"
  member  = "serviceAccount:${google_service_account.workload_identity.email}"
}

# IAM bindings for monitoring
resource "google_project_iam_member" "monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.monitoring.email}"
}

resource "google_project_iam_member" "monitoring_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.monitoring.email}"
}

resource "google_project_iam_member" "monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.monitoring.email}"
}

# IAM bindings for CI/CD
resource "google_project_iam_member" "cicd_container_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.cicd.email}"
}

resource "google_project_iam_member" "cicd_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cicd.email}"
}

resource "google_project_iam_member" "cicd_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cicd.email}"
}

resource "google_project_iam_member" "cicd_gke_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.cicd.email}"
}

# Workload Identity binding
resource "google_service_account_iam_binding" "workload_identity_binding" {
  service_account_id = google_service_account.workload_identity.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[frontier/frontier-api]",
    "serviceAccount:${var.project_id}.svc.id.goog[frontier/frontier-web]",
    "serviceAccount:${var.project_id}.svc.id.goog[frontier/frontier-ml]",
  ]
}

# Kubernetes service accounts
resource "kubernetes_service_account" "frontier_api" {
  metadata {
    name      = "frontier-api"
    namespace = "frontier"
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.workload_identity.email
    }
  }

  depends_on = [google_container_cluster.frontier_cluster]
}

resource "kubernetes_service_account" "frontier_web" {
  metadata {
    name      = "frontier-web"
    namespace = "frontier"
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.workload_identity.email
    }
  }

  depends_on = [google_container_cluster.frontier_cluster]
}

resource "kubernetes_service_account" "frontier_ml" {
  metadata {
    name      = "frontier-ml"
    namespace = "frontier"
    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.workload_identity.email
    }
  }

  depends_on = [google_container_cluster.frontier_cluster]
}

# KMS key for encryption
resource "google_kms_key_ring" "frontier_keyring" {
  name     = "${var.environment}-frontier-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "frontier_key" {
  name     = "${var.environment}-frontier-key"
  key_ring = google_kms_key_ring.frontier_keyring.id

  lifecycle {
    prevent_destroy = true
  }
}

# IAM binding for KMS key
resource "google_kms_crypto_key_iam_binding" "frontier_key_binding" {
  crypto_key_id = google_kms_crypto_key.frontier_key.id
  role         = "roles/cloudkms.cryptoKeyEncrypterDecrypter"

  members = [
    "serviceAccount:${google_service_account.workload_identity.email}",
    "serviceAccount:${google_service_account.gke_nodes.email}",
  ]
}

# Secret Manager secrets
resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.environment}-db-password"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

resource "google_secret_manager_secret" "redis_auth" {
  secret_id = "${var.environment}-redis-auth"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "redis_auth_version" {
  secret      = google_secret_manager_secret.redis_auth.id
  secret_data = random_password.redis_auth.result
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${var.environment}-jwt-secret"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "jwt_secret_version" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

# Random passwords
resource "random_password" "redis_auth" {
  length  = 32
  special = true
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# IAM bindings for Secret Manager
resource "google_secret_manager_secret_iam_binding" "db_password_access" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"

  members = [
    "serviceAccount:${google_service_account.workload_identity.email}",
  ]
}

resource "google_secret_manager_secret_iam_binding" "redis_auth_access" {
  secret_id = google_secret_manager_secret.redis_auth.secret_id
  role      = "roles/secretmanager.secretAccessor"

  members = [
    "serviceAccount:${google_service_account.workload_identity.email}",
  ]
}

resource "google_secret_manager_secret_iam_binding" "jwt_secret_access" {
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"

  members = [
    "serviceAccount:${google_service_account.workload_identity.email}",
  ]
}

# Cloud Build trigger service account
resource "google_service_account" "cloud_build" {
  count        = var.enable_cloud_build ? 1 : 0
  account_id   = "${var.environment}-cloud-build"
  display_name = "${var.environment} Cloud Build Service Account"
  description  = "Service account for Cloud Build triggers"
}

resource "google_project_iam_member" "cloud_build_editor" {
  count   = var.enable_cloud_build ? 1 : 0
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.cloud_build[0].email}"
}

resource "google_project_iam_member" "cloud_build_gke" {
  count   = var.enable_cloud_build ? 1 : 0
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.cloud_build[0].email}"
}

resource "google_project_iam_member" "cloud_build_storage" {
  count   = var.enable_cloud_build ? 1 : 0
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloud_build[0].email}"
}

# Network security policies
resource "google_compute_security_policy" "frontier_security_policy" {
  name = "${var.environment}-frontier-security-policy"

  # Rate limiting rule
  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
  }

  # Default rule
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

# IAM conditions for environment isolation
resource "google_project_iam_binding" "environment_isolation" {
  project = var.project_id
  role    = "roles/container.viewer"

  members = [
    "serviceAccount:${google_service_account.gke_nodes.email}",
  ]

  condition {
    title       = "${var.environment} Environment Access"
    description = "Restricts access to ${var.environment} environment resources"
    expression  = "resource.name.startsWith('projects/${var.project_id}/locations/${var.region}/clusters/${var.environment}-')"
  }
}
