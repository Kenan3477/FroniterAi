# RDS Database Module
# Creates RDS database instances with high availability and security

# Random password for database
resource "random_password" "master_password" {
  count = var.manage_master_user_password ? 0 : 1
  
  length  = 16
  special = true
}

# KMS key for RDS encryption (if not provided)
resource "aws_kms_key" "rds" {
  count = var.kms_key_id == null ? 1 : 0
  
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = var.kms_deletion_window
  
  tags = merge(var.tags, {
    Name = "${var.identifier}-rds-key"
    Type = "kms_key"
  })
}

resource "aws_kms_alias" "rds" {
  count = var.kms_key_id == null ? 1 : 0
  
  name          = "alias/${var.identifier}-rds"
  target_key_id = aws_kms_key.rds[0].key_id
}

# DB Subnet Group (created in VPC module, referenced here)
data "aws_db_subnet_group" "main" {
  name = var.db_subnet_group_name
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  count = var.create_db_parameter_group ? 1 : 0
  
  family = var.parameter_group_family
  name   = "${var.identifier}-params"
  
  dynamic "parameter" {
    for_each = var.parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }
  
  tags = merge(var.tags, {
    Name = "${var.identifier}-params"
    Type = "db_parameter_group"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# DB Option Group
resource "aws_db_option_group" "main" {
  count = var.create_db_option_group ? 1 : 0
  
  name                     = "${var.identifier}-options"
  option_group_description = "Option group for ${var.identifier}"
  engine_name              = var.engine
  major_engine_version     = var.major_engine_version
  
  dynamic "option" {
    for_each = var.options
    content {
      option_name = option.value.option_name
      
      dynamic "option_settings" {
        for_each = option.value.option_settings
        content {
          name  = option_settings.value.name
          value = option_settings.value.value
        }
      }
    }
  }
  
  tags = merge(var.tags, {
    Name = "${var.identifier}-options"
    Type = "db_option_group"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.identifier}-rds-"
  vpc_id      = var.vpc_id
  
  # Database access from specified security groups
  dynamic "ingress" {
    for_each = var.allowed_security_groups
    content {
      description     = "Database access from ${ingress.value}"
      from_port       = var.port
      to_port         = var.port
      protocol        = "tcp"
      security_groups = [ingress.value]
    }
  }
  
  # Database access from specified CIDR blocks
  dynamic "ingress" {
    for_each = length(var.allowed_cidr_blocks) > 0 ? [1] : []
    content {
      description = "Database access from CIDR blocks"
      from_port   = var.port
      to_port     = var.port
      protocol    = "tcp"
      cidr_blocks = var.allowed_cidr_blocks
    }
  }
  
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.tags, {
    Name = "${var.identifier}-rds-sg"
    Type = "security_group"
  })
}

# Primary RDS Instance
resource "aws_db_instance" "main" {
  identifier = var.identifier
  
  # Engine configuration
  engine                      = var.engine
  engine_version             = var.engine_version
  instance_class             = var.instance_class
  allocated_storage          = var.allocated_storage
  max_allocated_storage      = var.max_allocated_storage
  storage_type               = var.storage_type
  storage_encrypted          = var.storage_encrypted
  kms_key_id                = var.kms_key_id != null ? var.kms_key_id : aws_kms_key.rds[0].arn
  iops                      = var.iops
  
  # Database configuration
  db_name  = var.db_name
  username = var.username
  password = var.manage_master_user_password ? null : (var.password != null ? var.password : random_password.master_password[0].result)
  port     = var.port
  
  # Master user password management
  manage_master_user_password = var.manage_master_user_password
  master_user_secret_kms_key_id = var.manage_master_user_password ? (var.kms_key_id != null ? var.kms_key_id : aws_kms_key.rds[0].arn) : null
  
  # Network configuration
  db_subnet_group_name   = data.aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = var.publicly_accessible
  
  # Parameter and option groups
  parameter_group_name = var.create_db_parameter_group ? aws_db_parameter_group.main[0].name : var.parameter_group_name
  option_group_name    = var.create_db_option_group ? aws_db_option_group.main[0].name : var.option_group_name
  
  # Backup configuration
  backup_retention_period = var.backup_retention_period
  backup_window          = var.backup_window
  copy_tags_to_snapshot  = var.copy_tags_to_snapshot
  delete_automated_backups = var.delete_automated_backups
  
  # Maintenance configuration
  maintenance_window         = var.maintenance_window
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  
  # High availability
  multi_az               = var.multi_az
  availability_zone      = var.availability_zone
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.enhanced_monitoring[0].arn : null
  enabled_cloudwatch_logs_exports = var.enabled_cloudwatch_logs_exports
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? (var.kms_key_id != null ? var.kms_key_id : aws_kms_key.rds[0].arn) : null
  performance_insights_retention_period = var.performance_insights_retention_period
  
  # Security
  deletion_protection = var.deletion_protection
  skip_final_snapshot = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.identifier}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  # Restore configuration
  snapshot_identifier       = var.snapshot_identifier
  restore_to_point_in_time = var.restore_to_point_in_time != null ? [var.restore_to_point_in_time] : []
  
  tags = merge(var.tags, {
    Name = var.identifier
    Type = "rds_instance"
  })
  
  depends_on = [aws_cloudwatch_log_group.database]
  
  lifecycle {
    ignore_changes = [
      password,
      final_snapshot_identifier
    ]
  }
}

# Read Replicas
resource "aws_db_instance" "read_replica" {
  count = var.read_replica_count
  
  identifier             = "${var.identifier}-read-replica-${count.index + 1}"
  replicate_source_db    = aws_db_instance.main.id
  instance_class         = var.read_replica_instance_class != null ? var.read_replica_instance_class : var.instance_class
  publicly_accessible    = var.publicly_accessible
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  
  # Monitoring
  monitoring_interval = var.monitoring_interval
  monitoring_role_arn = var.monitoring_interval > 0 ? aws_iam_role.enhanced_monitoring[0].arn : null
  performance_insights_enabled = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? (var.kms_key_id != null ? var.kms_key_id : aws_kms_key.rds[0].arn) : null
  
  # Security
  deletion_protection = var.deletion_protection
  skip_final_snapshot = true
  
  tags = merge(var.tags, {
    Name = "${var.identifier}-read-replica-${count.index + 1}"
    Type = "rds_read_replica"
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "database" {
  for_each = toset(var.enabled_cloudwatch_logs_exports)
  
  name              = "/aws/rds/instance/${var.identifier}/${each.value}"
  retention_in_days = var.cloudwatch_log_group_retention_in_days
  kms_key_id       = var.cloudwatch_log_group_kms_key_id
  
  tags = merge(var.tags, {
    Name = "${var.identifier}-${each.value}-logs"
    Type = "log_group"
  })
}

# Enhanced Monitoring IAM Role
resource "aws_iam_role" "enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  
  name = "${var.identifier}-rds-enhanced-monitoring"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "enhanced_monitoring" {
  count = var.monitoring_interval > 0 ? 1 : 0
  
  role       = aws_iam_role.enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "database_cpu" {
  alarm_name          = "${var.identifier}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.cpu_utilization_threshold
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = var.alarm_actions
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "${var.identifier}-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.database_connections_threshold
  alarm_description   = "This metric monitors RDS database connections"
  alarm_actions       = var.alarm_actions
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "database_freeable_memory" {
  alarm_name          = "${var.identifier}-low-freeable-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = var.freeable_memory_threshold
  alarm_description   = "This metric monitors RDS freeable memory"
  alarm_actions       = var.alarm_actions
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }
  
  tags = var.tags
}
