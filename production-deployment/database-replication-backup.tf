# Database Replication and Backup Infrastructure
# PostgreSQL with Multi-Region Replication and Automated Backups

# Primary Database Configuration (Terraform)
resource "aws_db_instance" "frontier_primary" {
  identifier = "frontier-primary-db"
  
  # Engine Configuration
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  # Storage Configuration
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.frontier_db.arn
  
  # Database Configuration
  db_name  = "frontier_production"
  username = var.db_master_username
  password = var.db_master_password
  port     = 5432
  
  # High Availability
  multi_az               = true
  availability_zone      = "us-east-1a"
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Security
  vpc_security_group_ids = [aws_security_group.frontier_db.id]
  db_subnet_group_name   = aws_db_subnet_group.frontier.name
  
  # Monitoring and Logging
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn
  
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Automated Backups
  copy_tags_to_snapshot = true
  delete_automated_backups = false
  deletion_protection = true
  
  tags = {
    Name        = "Frontier Primary Database"
    Environment = "production"
    Region      = "us-east-1"
    Tier        = "primary"
  }
}

# Read Replica in Secondary Region (US-West-2)
resource "aws_db_instance" "frontier_read_replica_west" {
  identifier = "frontier-replica-west"
  
  # Replica Configuration
  replicate_source_db = aws_db_instance.frontier_primary.identifier
  instance_class      = "db.r6g.large"
  
  # Regional Configuration
  availability_zone = "us-west-2a"
  
  # Security
  vpc_security_group_ids = [aws_security_group.frontier_db_west.id]
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring_west.arn
  
  performance_insights_enabled = true
  
  tags = {
    Name        = "Frontier Read Replica West"
    Environment = "production"
    Region      = "us-west-2"
    Tier        = "replica"
  }
  
  provider = aws.west
}

# Read Replica in Europe (EU-West-1)
resource "aws_db_instance" "frontier_read_replica_europe" {
  identifier = "frontier-replica-europe"
  
  # Replica Configuration
  replicate_source_db = aws_db_instance.frontier_primary.identifier
  instance_class      = "db.r6g.large"
  
  # Regional Configuration
  availability_zone = "eu-west-1a"
  
  # Security
  vpc_security_group_ids = [aws_security_group.frontier_db_europe.id]
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring_europe.arn
  
  performance_insights_enabled = true
  
  tags = {
    Name        = "Frontier Read Replica Europe"
    Environment = "production"
    Region      = "eu-west-1"
    Tier        = "replica"
  }
  
  provider = aws.europe
}

# Redis Cluster for Caching (Primary Region)
resource "aws_elasticache_replication_group" "frontier_redis_primary" {
  replication_group_id       = "frontier-redis-primary"
  description                = "Frontier Redis Cluster - Primary"
  
  # Cluster Configuration
  node_type               = "cache.r7g.large"
  port                    = 6379
  parameter_group_name    = aws_elasticache_parameter_group.frontier_redis.name
  
  # High Availability
  num_cache_clusters         = 3
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Security
  subnet_group_name       = aws_elasticache_subnet_group.frontier.name
  security_group_ids      = [aws_security_group.frontier_redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token              = var.redis_auth_token
  
  # Backup Configuration
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  tags = {
    Name        = "Frontier Redis Primary"
    Environment = "production"
    Region      = "us-east-1"
  }
}

# Automated Backup Lambda Function
resource "aws_lambda_function" "db_backup" {
  filename         = "db_backup.zip"
  function_name    = "frontier-db-backup"
  role            = aws_iam_role.lambda_backup.arn
  handler         = "backup.lambda_handler"
  runtime         = "python3.11"
  timeout         = 300
  
  environment {
    variables = {
      PRIMARY_DB_IDENTIFIER = aws_db_instance.frontier_primary.identifier
      BACKUP_BUCKET        = aws_s3_bucket.frontier_backups.bucket
      SLACK_WEBHOOK_URL    = var.slack_webhook_url
    }
  }
  
  tags = {
    Name        = "Frontier DB Backup"
    Environment = "production"
  }
}

# CloudWatch Event Rule for Scheduled Backups
resource "aws_cloudwatch_event_rule" "db_backup_schedule" {
  name                = "frontier-db-backup-schedule"
  description         = "Trigger database backup every 6 hours"
  schedule_expression = "rate(6 hours)"
  
  tags = {
    Name        = "Frontier DB Backup Schedule"
    Environment = "production"
  }
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.db_backup_schedule.name
  target_id = "TriggerLambda"
  arn       = aws_lambda_function.db_backup.arn
}

# S3 Bucket for Database Backups
resource "aws_s3_bucket" "frontier_backups" {
  bucket = "frontier-database-backups-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "Frontier Database Backups"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "frontier_backups" {
  bucket = aws_s3_bucket.frontier_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontier_backups" {
  bucket = aws_s3_bucket.frontier_backups.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.frontier_backups.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "frontier_backups" {
  bucket = aws_s3_bucket.frontier_backups.id
  
  rule {
    id     = "backup_lifecycle"
    status = "Enabled"
    
    # Daily backups kept for 30 days
    expiration {
      days = 30
    }
    
    # Weekly backups moved to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    # Monthly backups moved to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    # Yearly backups moved to Deep Archive after 365 days
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }
}

# Database Backup Script
locals {
  backup_script = <<-EOT
import boto3
import json
import os
import datetime
import requests
from typing import Dict, Any

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Automated database backup function
    Creates RDS snapshots and uploads custom backups to S3
    """
    
    # Initialize AWS clients
    rds = boto3.client('rds')
    s3 = boto3.client('s3')
    
    # Configuration
    db_identifier = os.environ['PRIMARY_DB_IDENTIFIER']
    backup_bucket = os.environ['BACKUP_BUCKET']
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    snapshot_id = f"{db_identifier}-backup-{timestamp}"
    
    try:
        # Create RDS snapshot
        print(f"Creating RDS snapshot: {snapshot_id}")
        rds.create_db_snapshot(
            DBSnapshotIdentifier=snapshot_id,
            DBInstanceIdentifier=db_identifier,
            Tags=[
                {'Key': 'Type', 'Value': 'AutomatedBackup'},
                {'Key': 'CreatedBy', 'Value': 'Lambda'},
                {'Key': 'Timestamp', 'Value': timestamp}
            ]
        )
        
        # Wait for snapshot to complete (optional for large DBs)
        waiter = rds.get_waiter('db_snapshot_completed')
        waiter.wait(
            DBSnapshotIdentifier=snapshot_id,
            WaiterConfig={'Delay': 30, 'MaxAttempts': 120}
        )
        
        # Create backup metadata
        backup_metadata = {
            'snapshot_id': snapshot_id,
            'db_identifier': db_identifier,
            'timestamp': timestamp,
            'status': 'completed',
            'type': 'automated_snapshot'
        }
        
        # Upload metadata to S3
        s3.put_object(
            Bucket=backup_bucket,
            Key=f"metadata/{timestamp}_backup_metadata.json",
            Body=json.dumps(backup_metadata, indent=2),
            ContentType='application/json'
        )
        
        # Send success notification
        if slack_webhook:
            send_slack_notification(
                slack_webhook,
                f"✅ Database backup completed successfully: {snapshot_id}",
                "good"
            )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Backup completed successfully',
                'snapshot_id': snapshot_id,
                'timestamp': timestamp
            })
        }
        
    except Exception as e:
        error_message = f"Database backup failed: {str(e)}"
        print(error_message)
        
        # Send error notification
        if slack_webhook:
            send_slack_notification(
                slack_webhook,
                f"❌ Database backup failed: {error_message}",
                "danger"
            )
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Backup failed',
                'error': str(e),
                'timestamp': timestamp
            })
        }

def send_slack_notification(webhook_url: str, message: str, color: str):
    """Send notification to Slack"""
    payload = {
        'attachments': [{
            'color': color,
            'fields': [{
                'title': 'Frontier Database Backup',
                'value': message,
                'short': False
            }],
            'footer': 'Frontier Production System',
            'ts': int(datetime.datetime.now().timestamp())
        }]
    }
    
    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        response.raise_for_status()
        print(f"Slack notification sent successfully")
    except Exception as e:
        print(f"Failed to send Slack notification: {e}")

# Cross-region backup replication
def replicate_backup_cross_region(snapshot_id: str, source_region: str, target_region: str):
    """Replicate snapshot to another region for disaster recovery"""
    source_rds = boto3.client('rds', region_name=source_region)
    target_rds = boto3.client('rds', region_name=target_region)
    
    # Copy snapshot to target region
    target_snapshot_id = f"{snapshot_id}-{target_region}"
    
    target_rds.copy_db_snapshot(
        SourceDBSnapshotIdentifier=f"arn:aws:rds:{source_region}:account:snapshot:{snapshot_id}",
        TargetDBSnapshotIdentifier=target_snapshot_id,
        Tags=[
            {'Key': 'Type', 'Value': 'CrossRegionBackup'},
            {'Key': 'SourceRegion', 'Value': source_region},
            {'Key': 'TargetRegion', 'Value': target_region}
        ]
    )
    
    return target_snapshot_id
EOT
}

# Point-in-Time Recovery Configuration
resource "aws_db_instance" "frontier_pitr" {
  identifier = "frontier-pitr-restore"
  
  # Restore Configuration (example)
  # restore_to_point_in_time {
  #   source_db_instance_identifier = aws_db_instance.frontier_primary.identifier
  #   restore_time                  = "2025-01-01T12:00:00Z"
  # }
  
  instance_class = "db.r6g.xlarge"
  
  tags = {
    Name        = "Frontier PITR Restore"
    Environment = "production"
    Purpose     = "disaster_recovery"
  }
  
  count = 0  # Only create when needed
}

# Database Monitoring and Alerting
resource "aws_cloudwatch_metric_alarm" "db_cpu_utilization" {
  alarm_name          = "frontier-db-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors db cpu utilization"
  alarm_actions       = [aws_sns_topic.frontier_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.frontier_primary.id
  }
  
  tags = {
    Name        = "Frontier DB CPU Alert"
    Environment = "production"
  }
}

resource "aws_cloudwatch_metric_alarm" "db_connection_count" {
  alarm_name          = "frontier-db-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors db connection count"
  alarm_actions       = [aws_sns_topic.frontier_alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.frontier_primary.id
  }
}

# KMS Key for Database Encryption
resource "aws_kms_key" "frontier_db" {
  description             = "KMS key for Frontier database encryption"
  deletion_window_in_days = 7
  
  tags = {
    Name        = "Frontier DB Encryption Key"
    Environment = "production"
  }
}

resource "aws_kms_alias" "frontier_db" {
  name          = "alias/frontier-db-encryption"
  target_key_id = aws_kms_key.frontier_db.key_id
}

# Random ID for unique resource naming
resource "random_id" "bucket_suffix" {
  byte_length = 4
}
