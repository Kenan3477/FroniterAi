# Outputs for RDS Module
# Provides database information for other modules

output "db_instance_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_endpoint" {
  description = "The RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_address" {
  description = "The address of the RDS instance"
  value       = aws_db_instance.main.address
}

output "db_instance_port" {
  description = "The database port"
  value       = aws_db_instance.main.port
}

output "db_instance_name" {
  description = "The database name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_username" {
  description = "The master username for the database"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_instance_engine" {
  description = "The database engine"
  value       = aws_db_instance.main.engine
}

output "db_instance_engine_version" {
  description = "The running version of the database"
  value       = aws_db_instance.main.engine_version
}

output "db_instance_status" {
  description = "The RDS instance status"
  value       = aws_db_instance.main.status
}

output "db_instance_availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = aws_db_instance.main.availability_zone
}

output "db_instance_multi_az" {
  description = "If the RDS instance is multi AZ enabled"
  value       = aws_db_instance.main.multi_az
}

output "db_instance_resource_id" {
  description = "The RDS Resource ID of this instance"
  value       = aws_db_instance.main.resource_id
}

output "db_instance_master_user_secret_arn" {
  description = "The ARN of the master user secret"
  value       = aws_db_instance.main.master_user_secret != null ? aws_db_instance.main.master_user_secret[0].secret_arn : null
}

output "db_instance_master_user_secret_kms_key_id" {
  description = "The KMS key ID of the master user secret"
  value       = aws_db_instance.main.master_user_secret != null ? aws_db_instance.main.master_user_secret[0].kms_key_id : null
}

output "db_security_group_id" {
  description = "The ID of the security group"
  value       = aws_security_group.rds.id
}

output "db_parameter_group_id" {
  description = "The db parameter group name"
  value       = var.create_db_parameter_group ? aws_db_parameter_group.main[0].id : null
}

output "db_option_group_id" {
  description = "The db option group name"
  value       = var.create_db_option_group ? aws_db_option_group.main[0].id : null
}

output "enhanced_monitoring_iam_role_arn" {
  description = "The Amazon Resource Name (ARN) specifying the monitoring role"
  value       = var.monitoring_interval > 0 ? aws_iam_role.enhanced_monitoring[0].arn : null
}

output "kms_key_id" {
  description = "The KMS key ID used to encrypt the storage"
  value       = var.kms_key_id != null ? var.kms_key_id : (length(aws_kms_key.rds) > 0 ? aws_kms_key.rds[0].arn : null)
}

output "read_replica_identifiers" {
  description = "Identifiers of the read replicas"
  value       = aws_db_instance.read_replica[*].id
}

output "read_replica_endpoints" {
  description = "Endpoints of the read replicas"
  value       = aws_db_instance.read_replica[*].endpoint
}

output "cloudwatch_log_groups" {
  description = "Map of CloudWatch log groups"
  value = {
    for k, v in aws_cloudwatch_log_group.database : k => {
      name = v.name
      arn  = v.arn
    }
  }
}
