# Monitoring Module with Prometheus and Grafana
# Creates comprehensive monitoring stack for Kubernetes and AWS resources

# Namespace for monitoring
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.monitoring_namespace
    
    labels = {
      name = var.monitoring_namespace
      purpose = "monitoring"
    }
  }
}

# Prometheus Operator using Helm
resource "helm_release" "prometheus_operator" {
  name       = "prometheus-operator"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = var.prometheus_operator_version
  
  values = [
    templatefile("${path.module}/values/prometheus-operator.yaml", {
      prometheus_retention = var.prometheus_retention_days
      prometheus_storage_size = var.prometheus_storage_size
      grafana_admin_password = var.grafana_admin_password
      grafana_ingress_host = var.grafana_ingress_host
      alertmanager_storage_size = var.alertmanager_storage_size
      enable_node_exporter = var.enable_node_exporter
      enable_kube_state_metrics = var.enable_kube_state_metrics
    })
  ]
  
  depends_on = [kubernetes_namespace.monitoring]
}

# ELK Stack for Log Aggregation
resource "helm_release" "elasticsearch" {
  count = var.enable_elk_stack ? 1 : 0
  
  name       = "elasticsearch"
  repository = "https://helm.elastic.co"
  chart      = "elasticsearch"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = var.elasticsearch_version
  
  values = [
    templatefile("${path.module}/values/elasticsearch.yaml", {
      elasticsearch_storage_size = var.elasticsearch_storage_size
      elasticsearch_replicas = var.elasticsearch_replicas
      elasticsearch_heap_size = var.elasticsearch_heap_size
    })
  ]
  
  depends_on = [kubernetes_namespace.monitoring]
}

resource "helm_release" "kibana" {
  count = var.enable_elk_stack ? 1 : 0
  
  name       = "kibana"
  repository = "https://helm.elastic.co"
  chart      = "kibana"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = var.kibana_version
  
  values = [
    templatefile("${path.module}/values/kibana.yaml", {
      kibana_ingress_host = var.kibana_ingress_host
    })
  ]
  
  depends_on = [helm_release.elasticsearch]
}

resource "helm_release" "logstash" {
  count = var.enable_elk_stack ? 1 : 0
  
  name       = "logstash"
  repository = "https://helm.elastic.co"
  chart      = "logstash"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = var.logstash_version
  
  values = [
    templatefile("${path.module}/values/logstash.yaml", {
      logstash_heap_size = var.logstash_heap_size
    })
  ]
  
  depends_on = [helm_release.elasticsearch]
}

# Fluent Bit for Log Collection
resource "helm_release" "fluent_bit" {
  name       = "fluent-bit"
  repository = "https://fluent.github.io/helm-charts"
  chart      = "fluent-bit"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = var.fluent_bit_version
  
  values = [
    templatefile("${path.module}/values/fluent-bit.yaml", {
      enable_elk_output = var.enable_elk_stack
      enable_cloudwatch_output = var.enable_cloudwatch_logs
      aws_region = var.aws_region
      cloudwatch_log_group = var.cloudwatch_log_group_name
    })
  ]
  
  depends_on = [kubernetes_namespace.monitoring]
}

# Jaeger for Distributed Tracing
resource "helm_release" "jaeger" {
  count = var.enable_distributed_tracing ? 1 : 0
  
  name       = "jaeger"
  repository = "https://jaegertracing.github.io/helm-charts"
  chart      = "jaeger"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  version    = var.jaeger_version
  
  values = [
    templatefile("${path.module}/values/jaeger.yaml", {
      jaeger_storage_type = var.jaeger_storage_type
      jaeger_ingress_host = var.jaeger_ingress_host
    })
  ]
  
  depends_on = [kubernetes_namespace.monitoring]
}

# Custom ServiceMonitor for Frontier application
resource "kubernetes_manifest" "frontier_service_monitor" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "frontier-metrics"
      namespace = kubernetes_namespace.monitoring.metadata[0].name
      labels = {
        app = "frontier"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "frontier"
        }
      }
      endpoints = [
        {
          port = "metrics"
          path = "/metrics"
          interval = "30s"
        }
      ]
      namespaceSelector = {
        matchNames = ["default", "frontier"]
      }
    }
  }
  
  depends_on = [helm_release.prometheus_operator]
}

# PrometheusRule for Frontier alerts
resource "kubernetes_manifest" "frontier_prometheus_rules" {
  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "frontier-alerts"
      namespace = kubernetes_namespace.monitoring.metadata[0].name
      labels = {
        app = "frontier"
        prometheus = "kube-prometheus"
        role = "alert-rules"
      }
    }
    spec = {
      groups = [
        {
          name = "frontier.rules"
          rules = [
            {
              alert = "FrontierHighCPU"
              expr  = "rate(container_cpu_usage_seconds_total{container=\"frontier\"}[5m]) > 0.8"
              for   = "5m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary     = "Frontier CPU usage is high"
                description = "Frontier CPU usage is above 80% for more than 5 minutes"
              }
            },
            {
              alert = "FrontierHighMemory"
              expr  = "container_memory_usage_bytes{container=\"frontier\"} / container_spec_memory_limit_bytes{container=\"frontier\"} > 0.9"
              for   = "5m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary     = "Frontier memory usage is high"
                description = "Frontier memory usage is above 90% for more than 5 minutes"
              }
            },
            {
              alert = "FrontierPodRestarts"
              expr  = "rate(kube_pod_container_status_restarts_total{container=\"frontier\"}[15m]) > 0"
              for   = "0m"
              labels = {
                severity = "warning"
              }
              annotations = {
                summary     = "Frontier pod is restarting"
                description = "Frontier pod has restarted {{ $value }} times in the last 15 minutes"
              }
            },
            {
              alert = "FrontierServiceDown"
              expr  = "up{job=\"frontier\"} == 0"
              for   = "1m"
              labels = {
                severity = "critical"
              }
              annotations = {
                summary     = "Frontier service is down"
                description = "Frontier service has been down for more than 1 minute"
              }
            }
          ]
        }
      ]
    }
  }
  
  depends_on = [helm_release.prometheus_operator]
}

# CloudWatch Log Group for Kubernetes logs
resource "aws_cloudwatch_log_group" "kubernetes" {
  count = var.enable_cloudwatch_logs ? 1 : 0
  
  name              = var.cloudwatch_log_group_name
  retention_in_days = var.cloudwatch_log_retention_days
  kms_key_id       = var.cloudwatch_log_group_kms_key_id
  
  tags = merge(var.tags, {
    Name = var.cloudwatch_log_group_name
    Type = "log_group"
    Purpose = "kubernetes-monitoring"
  })
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.cluster_name}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/EKS", "cluster_failed_request_count", "ClusterName", var.cluster_name],
            ["AWS/EKS", "cluster_request_total", "ClusterName", var.cluster_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "EKS Cluster Requests"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.load_balancer_arn_suffix],
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.load_balancer_arn_suffix]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id],
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", var.rds_instance_id]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Database Metrics"
          period  = 300
        }
      }
    ]
  })
  
  tags = var.tags
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.cluster_name}-alerts"
  
  tags = merge(var.tags, {
    Name = "${var.cluster_name}-alerts"
    Type = "sns_topic"
    Purpose = "monitoring-alerts"
  })
}

# SNS Topic Subscription for Email
resource "aws_sns_topic_subscription" "email_alerts" {
  for_each = toset(var.alert_email_addresses)
  
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# CloudWatch Alarms for EKS
resource "aws_cloudwatch_metric_alarm" "eks_cluster_health" {
  alarm_name          = "${var.cluster_name}-cluster-health"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "cluster_failed_request_count"
  namespace           = "AWS/EKS"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors EKS cluster failed requests"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ClusterName = var.cluster_name
  }
  
  tags = var.tags
}

# CloudWatch Alarms for Node Groups
resource "aws_cloudwatch_metric_alarm" "node_group_cpu" {
  for_each = var.node_group_names
  
  alarm_name          = "${var.cluster_name}-${each.value}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors EC2 CPU utilization for node group ${each.value}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    AutoScalingGroupName = "${var.cluster_name}-${each.value}"
  }
  
  tags = var.tags
}
