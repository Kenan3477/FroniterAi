# Variables for ALB Module
# Configures Application Load Balancer

variable "load_balancer_name" {
  description = "Name of the Application Load Balancer"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "internal" {
  description = "Whether the load balancer is internal"
  type        = bool
  default     = false
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection on the load balancer"
  type        = bool
  default     = true
}

variable "enable_http2" {
  description = "Enable HTTP/2 on the load balancer"
  type        = bool
  default     = true
}

variable "enable_waf_fail_open" {
  description = "Enable WAF fail open"
  type        = bool
  default     = false
}

variable "drop_invalid_header_fields" {
  description = "Drop invalid header fields"
  type        = bool
  default     = true
}

variable "enable_access_logs" {
  description = "Enable access logs"
  type        = bool
  default     = true
}

variable "access_logs_bucket" {
  description = "S3 bucket for access logs"
  type        = string
  default     = ""
}

variable "access_logs_prefix" {
  description = "S3 prefix for access logs"
  type        = string
  default     = "alb-logs"
}

variable "enable_https" {
  description = "Enable HTTPS listener"
  type        = bool
  default     = true
}

variable "ssl_policy" {
  description = "SSL policy for HTTPS listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS-1-2-2017-01"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate"
  type        = string
  default     = ""
}

variable "default_target_group" {
  description = "Name of the default target group"
  type        = string
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the load balancer"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "waf_web_acl_arn" {
  description = "ARN of WAF Web ACL to associate"
  type        = string
  default     = null
}

variable "target_groups" {
  description = "Map of target group configurations"
  type = map(object({
    port        = number
    protocol    = string
    target_type = string
    health_check = object({
      enabled             = bool
      healthy_threshold   = number
      interval            = number
      matcher             = string
      path                = string
      port                = string
      protocol            = string
      timeout             = number
      unhealthy_threshold = number
    })
    stickiness = object({
      type            = string
      cookie_duration = number
      enabled         = bool
    })
  }))
  default = {}
}

variable "listener_rules" {
  description = "Map of listener rule configurations"
  type = map(object({
    priority = number
    action = object({
      type         = string
      target_group = string
      redirect = object({
        host        = string
        path        = string
        port        = string
        protocol    = string
        query       = string
        status_code = string
      })
      fixed_response = object({
        content_type = string
        message_body = string
        status_code  = string
      })
    })
    conditions = list(object({
      type               = string
      values             = list(string)
      http_header_name   = string
      query_strings      = list(object({
        key   = string
        value = string
      }))
    }))
  }))
  default = {}
}

variable "route53_records" {
  description = "Map of Route53 record configurations"
  type = map(object({
    zone_id                = string
    name                   = string
    evaluate_target_health = bool
  }))
  default = {}
}

# CloudWatch alarm thresholds
variable "target_response_time_threshold" {
  description = "Threshold for target response time alarm (seconds)"
  type        = number
  default     = 1.0
}

variable "unhealthy_host_count_threshold" {
  description = "Threshold for unhealthy host count alarm"
  type        = number
  default     = 0
}

variable "http_5xx_count_threshold" {
  description = "Threshold for HTTP 5XX count alarm"
  type        = number
  default     = 10
}

variable "alarm_actions" {
  description = "List of ARNs to notify when alarms trigger"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
