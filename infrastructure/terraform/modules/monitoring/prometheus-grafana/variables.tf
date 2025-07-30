# Variables for Monitoring Module
# Configures Prometheus, Grafana, and ELK stack

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "monitoring_namespace" {
  description = "Kubernetes namespace for monitoring components"
  type        = string
  default     = "monitoring"
}

# Prometheus Configuration
variable "prometheus_operator_version" {
  description = "Version of the Prometheus Operator Helm chart"
  type        = string
  default     = "51.2.0"
}

variable "prometheus_retention_days" {
  description = "Prometheus data retention period in days"
  type        = string
  default     = "15d"
}

variable "prometheus_storage_size" {
  description = "Storage size for Prometheus"
  type        = string
  default     = "50Gi"
}

# Grafana Configuration
variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
}

variable "grafana_ingress_host" {
  description = "Ingress hostname for Grafana"
  type        = string
  default     = "grafana.example.com"
}

# Alertmanager Configuration
variable "alertmanager_storage_size" {
  description = "Storage size for Alertmanager"
  type        = string
  default     = "10Gi"
}

# Node Exporter and Kube State Metrics
variable "enable_node_exporter" {
  description = "Enable Node Exporter"
  type        = bool
  default     = true
}

variable "enable_kube_state_metrics" {
  description = "Enable Kube State Metrics"
  type        = bool
  default     = true
}

# ELK Stack Configuration
variable "enable_elk_stack" {
  description = "Enable ELK stack for log aggregation"
  type        = bool
  default     = true
}

variable "elasticsearch_version" {
  description = "Version of Elasticsearch Helm chart"
  type        = string
  default     = "8.5.1"
}

variable "elasticsearch_storage_size" {
  description = "Storage size for Elasticsearch"
  type        = string
  default     = "100Gi"
}

variable "elasticsearch_replicas" {
  description = "Number of Elasticsearch replicas"
  type        = number
  default     = 3
}

variable "elasticsearch_heap_size" {
  description = "Heap size for Elasticsearch"
  type        = string
  default     = "1g"
}

variable "kibana_version" {
  description = "Version of Kibana Helm chart"
  type        = string
  default     = "8.5.1"
}

variable "kibana_ingress_host" {
  description = "Ingress hostname for Kibana"
  type        = string
  default     = "kibana.example.com"
}

variable "logstash_version" {
  description = "Version of Logstash Helm chart"
  type        = string
  default     = "8.5.1"
}

variable "logstash_heap_size" {
  description = "Heap size for Logstash"
  type        = string
  default     = "1g"
}

# Fluent Bit Configuration
variable "fluent_bit_version" {
  description = "Version of Fluent Bit Helm chart"
  type        = string
  default     = "0.21.0"
}

# CloudWatch Configuration
variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch logs output"
  type        = bool
  default     = true
}

variable "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  type        = string
  default     = "/aws/eks/cluster-logs"
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "cloudwatch_log_group_kms_key_id" {
  description = "KMS key ID for CloudWatch log group encryption"
  type        = string
  default     = null
}

# Distributed Tracing Configuration
variable "enable_distributed_tracing" {
  description = "Enable Jaeger for distributed tracing"
  type        = bool
  default     = true
}

variable "jaeger_version" {
  description = "Version of Jaeger Helm chart"
  type        = string
  default     = "0.71.0"
}

variable "jaeger_storage_type" {
  description = "Storage type for Jaeger (memory, elasticsearch, cassandra)"
  type        = string
  default     = "elasticsearch"
}

variable "jaeger_ingress_host" {
  description = "Ingress hostname for Jaeger"
  type        = string
  default     = "jaeger.example.com"
}

# Alert Configuration
variable "alert_email_addresses" {
  description = "List of email addresses for monitoring alerts"
  type        = list(string)
  default     = []
}

# Resource References
variable "load_balancer_arn_suffix" {
  description = "ARN suffix of the load balancer for monitoring"
  type        = string
  default     = ""
}

variable "rds_instance_id" {
  description = "RDS instance ID for monitoring"
  type        = string
  default     = ""
}

variable "node_group_names" {
  description = "Set of node group names for monitoring"
  type        = set(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
