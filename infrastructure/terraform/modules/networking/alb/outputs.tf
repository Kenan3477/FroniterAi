# Outputs for ALB Module
# Provides load balancer information for other modules

output "load_balancer_id" {
  description = "ID of the load balancer"
  value       = aws_lb.main.id
}

output "load_balancer_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "load_balancer_arn_suffix" {
  description = "ARN suffix of the load balancer"
  value       = aws_lb.main.arn_suffix
}

output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Hosted zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "load_balancer_security_group_id" {
  description = "ID of the load balancer security group"
  value       = aws_security_group.alb.id
}

output "target_groups" {
  description = "Map of target group attributes"
  value = {
    for k, v in aws_lb_target_group.main : k => {
      id   = v.id
      arn  = v.arn
      name = v.name
      port = v.port
    }
  }
}

output "listeners" {
  description = "Map of listener attributes"
  value = {
    http = {
      id       = aws_lb_listener.http.id
      arn      = aws_lb_listener.http.arn
      port     = aws_lb_listener.http.port
      protocol = aws_lb_listener.http.protocol
    }
    https = var.enable_https ? {
      id       = aws_lb_listener.https[0].id
      arn      = aws_lb_listener.https[0].arn
      port     = aws_lb_listener.https[0].port
      protocol = aws_lb_listener.https[0].protocol
    } : null
  }
}

output "listener_rules" {
  description = "Map of listener rule attributes"
  value = {
    for k, v in aws_lb_listener_rule.main : k => {
      id       = v.id
      arn      = v.arn
      priority = v.priority
    }
  }
}
