# Multi-Channel Alerting System
# Comprehensive alerting through Slack, Email, and SMS channels

# SNS Topics for Different Alert Types
resource "aws_sns_topic" "critical_alerts" {
  name         = "frontier-critical-alerts"
  display_name = "Frontier Critical Alerts"
  
  delivery_policy = jsonencode({
    "http" = {
      "defaultHealthyRetryPolicy" = {
        "minDelayTarget"     = 20
        "maxDelayTarget"     = 20
        "numRetries"         = 3
        "numMaxDelayRetries" = 0
        "numMinDelayRetries" = 0
        "numNoDelayRetries"  = 0
        "backoffFunction"    = "linear"
      }
      "disableSubscriptionOverrides" = false
    }
  })
  
  tags = {
    Name        = "Frontier Critical Alerts"
    Environment = "production"
    AlertLevel  = "critical"
  }
}

resource "aws_sns_topic" "warning_alerts" {
  name         = "frontier-warning-alerts"
  display_name = "Frontier Warning Alerts"
  
  tags = {
    Name        = "Frontier Warning Alerts"
    Environment = "production"
    AlertLevel  = "warning"
  }
}

resource "aws_sns_topic" "info_alerts" {
  name         = "frontier-info-alerts"
  display_name = "Frontier Info Alerts"
  
  tags = {
    Name        = "Frontier Info Alerts"
    Environment = "production"
    AlertLevel  = "info"
  }
}

# Email Subscriptions
resource "aws_sns_topic_subscription" "critical_email_devops" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = "devops@frontier-business.com"
}

resource "aws_sns_topic_subscription" "critical_email_oncall" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = "oncall@frontier-business.com"
}

resource "aws_sns_topic_subscription" "warning_email_team" {
  topic_arn = aws_sns_topic.warning_alerts.arn
  protocol  = "email"
  endpoint  = "team@frontier-business.com"
}

# SMS Subscriptions for Critical Alerts
resource "aws_sns_topic_subscription" "critical_sms_primary" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "sms"
  endpoint  = "+1234567890"  # Replace with actual phone number
}

resource "aws_sns_topic_subscription" "critical_sms_secondary" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "sms"
  endpoint  = "+1234567891"  # Replace with actual phone number
}

# Lambda Function for Slack Integration
resource "aws_lambda_function" "slack_notifier" {
  filename         = "slack_notifier.zip"
  function_name    = "frontier-slack-notifier"
  role            = aws_iam_role.lambda_alerting.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      SLACK_WEBHOOK_URL = var.slack_webhook_url
      ENVIRONMENT       = "production"
    }
  }
  
  tags = {
    Name        = "Frontier Slack Notifier"
    Environment = "production"
  }
}

# Slack Webhook Integration
resource "aws_sns_topic_subscription" "critical_slack" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.slack_notifier.arn
}

resource "aws_sns_topic_subscription" "warning_slack" {
  topic_arn = aws_sns_topic.warning_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.slack_notifier.arn
}

# Lambda Permission for SNS
resource "aws_lambda_permission" "allow_sns_critical" {
  statement_id  = "AllowExecutionFromSNSCritical"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_notifier.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.critical_alerts.arn
}

resource "aws_lambda_permission" "allow_sns_warning" {
  statement_id  = "AllowExecutionFromSNSWarning"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.slack_notifier.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.warning_alerts.arn
}

# CloudWatch Alarms for API Health
resource "aws_cloudwatch_metric_alarm" "api_high_error_rate" {
  alarm_name          = "frontier-api-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors API 5xx error rate"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  ok_actions          = [aws_sns_topic.info_alerts.arn]
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    LoadBalancer = aws_lb.frontier_api.arn_suffix
  }
  
  tags = {
    Name        = "API High Error Rate"
    Environment = "production"
    Severity    = "critical"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_high_response_time" {
  alarm_name          = "frontier-api-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors API response time"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  ok_actions          = [aws_sns_topic.info_alerts.arn]
  
  dimensions = {
    LoadBalancer = aws_lb.frontier_api.arn_suffix
  }
  
  tags = {
    Name        = "API High Response Time"
    Environment = "production"
    Severity    = "warning"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_low_request_count" {
  alarm_name          = "frontier-api-low-request-count"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = "900"  # 15 minutes
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors if API is receiving requests"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  treat_missing_data  = "breaching"
  
  dimensions = {
    LoadBalancer = aws_lb.frontier_api.arn_suffix
  }
  
  tags = {
    Name        = "API Low Request Count"
    Environment = "production"
    Severity    = "warning"
  }
}

# Database Alarms
resource "aws_cloudwatch_metric_alarm" "db_high_cpu" {
  alarm_name          = "frontier-db-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors database CPU utilization"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  ok_actions          = [aws_sns_topic.info_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.frontier_primary.id
  }
  
  tags = {
    Name        = "Database High CPU"
    Environment = "production"
    Severity    = "critical"
  }
}

resource "aws_cloudwatch_metric_alarm" "db_high_connections" {
  alarm_name          = "frontier-db-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors database connection count"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.frontier_primary.id
  }
  
  tags = {
    Name        = "Database High Connections"
    Environment = "production"
    Severity    = "warning"
  }
}

resource "aws_cloudwatch_metric_alarm" "db_low_freeable_memory" {
  alarm_name          = "frontier-db-low-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "1073741824"  # 1GB in bytes
  alarm_description   = "This metric monitors database available memory"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.frontier_primary.id
  }
  
  tags = {
    Name        = "Database Low Memory"
    Environment = "production"
    Severity    = "critical"
  }
}

# Redis Alarms
resource "aws_cloudwatch_metric_alarm" "redis_high_cpu" {
  alarm_name          = "frontier-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.frontier_redis.id
  }
  
  tags = {
    Name        = "Redis High CPU"
    Environment = "production"
    Severity    = "warning"
  }
}

# Kubernetes Pod Alarms (Custom Metrics)
resource "aws_cloudwatch_metric_alarm" "k8s_pod_restart_rate" {
  alarm_name          = "frontier-k8s-high-pod-restarts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "PodRestarts"
  namespace           = "Kubernetes/Pods"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors Kubernetes pod restart rate"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
  treat_missing_data  = "notBreaching"
  
  tags = {
    Name        = "High Pod Restart Rate"
    Environment = "production"
    Severity    = "warning"
  }
}

# Custom Elasticsearch Alarms
resource "aws_cloudwatch_metric_alarm" "elasticsearch_cluster_health" {
  alarm_name          = "frontier-elasticsearch-cluster-unhealthy"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ClusterStatus.yellow"
  namespace           = "Elasticsearch/Health"
  period              = "60"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "This metric monitors Elasticsearch cluster health"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
  treat_missing_data  = "breaching"
  
  tags = {
    Name        = "Elasticsearch Cluster Unhealthy"
    Environment = "production"
    Severity    = "critical"
  }
}

# Lambda Function for Enhanced Alert Processing
resource "aws_lambda_function" "alert_processor" {
  filename         = "alert_processor.zip"
  function_name    = "frontier-alert-processor"
  role            = aws_iam_role.lambda_alerting.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 60
  memory_size     = 512
  
  environment {
    variables = {
      ELASTICSEARCH_ENDPOINT = "https://elasticsearch.elk-stack.svc.cluster.local:9200"
      SLACK_WEBHOOK_URL      = var.slack_webhook_url
      PAGERDUTY_API_KEY      = var.pagerduty_api_key
      ENVIRONMENT            = "production"
    }
  }
  
  tags = {
    Name        = "Frontier Alert Processor"
    Environment = "production"
  }
}

# EventBridge Rule for Alert Aggregation
resource "aws_cloudwatch_event_rule" "alert_aggregation" {
  name        = "frontier-alert-aggregation"
  description = "Aggregate multiple alerts to prevent spam"
  
  event_pattern = jsonencode({
    source      = ["aws.cloudwatch"]
    detail-type = ["CloudWatch Alarm State Change"]
    detail = {
      state = {
        value = ["ALARM"]
      }
    }
  })
  
  tags = {
    Name        = "Alert Aggregation Rule"
    Environment = "production"
  }
}

resource "aws_cloudwatch_event_target" "alert_processor_target" {
  rule      = aws_cloudwatch_event_rule.alert_aggregation.name
  target_id = "AlertProcessorTarget"
  arn       = aws_lambda_function.alert_processor.arn
}

# Lambda Permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_processor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.alert_aggregation.arn
}

# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_alerting" {
  name = "frontier-lambda-alerting-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "Lambda Alerting Role"
    Environment = "production"
  }
}

resource "aws_iam_role_policy" "lambda_alerting_policy" {
  name = "frontier-lambda-alerting-policy"
  role = aws_iam_role.lambda_alerting.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.critical_alerts.arn,
          aws_sns_topic.warning_alerts.arn,
          aws_sns_topic.info_alerts.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "es:ESHttpGet",
          "es:ESHttpPost"
        ]
        Resource = "*"
      }
    ]
  })
}

# CloudWatch Dashboard for Monitoring
resource "aws_cloudwatch_dashboard" "frontier_monitoring" {
  dashboard_name = "Frontier-Production-Monitoring"
  
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
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.frontier_api.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "API Gateway Metrics"
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
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.frontier_primary.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeableMemory", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Database Metrics"
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
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", aws_elasticache_replication_group.frontier_redis.id],
            [".", "CacheHits", ".", "."],
            [".", "CacheMisses", ".", "."],
            [".", "NetworkBytesIn", ".", "."],
            [".", "NetworkBytesOut", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis Metrics"
        }
      }
    ]
  })
}

# Variables for external configuration
variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
}

variable "pagerduty_api_key" {
  description = "PagerDuty API key for critical alerts"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

# Outputs
output "critical_alerts_topic_arn" {
  description = "ARN of the critical alerts SNS topic"
  value       = aws_sns_topic.critical_alerts.arn
}

output "warning_alerts_topic_arn" {
  description = "ARN of the warning alerts SNS topic"
  value       = aws_sns_topic.warning_alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL to the CloudWatch dashboard"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.frontier_monitoring.dashboard_name}"
}
