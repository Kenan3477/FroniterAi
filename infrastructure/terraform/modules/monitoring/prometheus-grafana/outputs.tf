# Outputs for Monitoring Module
# Provides monitoring stack information

output "monitoring_namespace" {
  description = "Namespace where monitoring components are deployed"
  value       = kubernetes_namespace.monitoring.metadata[0].name
}

output "prometheus_operator_status" {
  description = "Status of Prometheus Operator Helm release"
  value       = helm_release.prometheus_operator.status
}

output "prometheus_operator_version" {
  description = "Version of deployed Prometheus Operator"
  value       = helm_release.prometheus_operator.version
}

output "elasticsearch_status" {
  description = "Status of Elasticsearch Helm release"
  value       = var.enable_elk_stack ? helm_release.elasticsearch[0].status : null
}

output "kibana_status" {
  description = "Status of Kibana Helm release"
  value       = var.enable_elk_stack ? helm_release.kibana[0].status : null
}

output "logstash_status" {
  description = "Status of Logstash Helm release"
  value       = var.enable_elk_stack ? helm_release.logstash[0].status : null
}

output "fluent_bit_status" {
  description = "Status of Fluent Bit Helm release"
  value       = helm_release.fluent_bit.status
}

output "jaeger_status" {
  description = "Status of Jaeger Helm release"
  value       = var.enable_distributed_tracing ? helm_release.jaeger[0].status : null
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.kubernetes[0].name : null
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch log group"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.kubernetes[0].arn : null
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "grafana_url" {
  description = "URL to access Grafana"
  value       = "https://${var.grafana_ingress_host}"
}

output "kibana_url" {
  description = "URL to access Kibana"
  value       = var.enable_elk_stack ? "https://${var.kibana_ingress_host}" : null
}

output "jaeger_url" {
  description = "URL to access Jaeger"
  value       = var.enable_distributed_tracing ? "https://${var.jaeger_ingress_host}" : null
}

output "monitoring_endpoints" {
  description = "Map of monitoring service endpoints"
  value = {
    grafana     = "https://${var.grafana_ingress_host}"
    kibana      = var.enable_elk_stack ? "https://${var.kibana_ingress_host}" : null
    jaeger      = var.enable_distributed_tracing ? "https://${var.jaeger_ingress_host}" : null
    cloudwatch  = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
  }
}
