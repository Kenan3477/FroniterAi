# Variables for RDS Module
# Configures RDS database instances

variable "identifier" {
  description = "The name of the RDS instance"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  type        = string
}

# Engine Configuration
variable "engine" {
  description = "The database engine"
  type        = string
  default     = "postgres"
}

variable "engine_version" {
  description = "The engine version"
  type        = string
  default     = "15.4"
}

variable "instance_class" {
  description = "The instance type of the RDS instance"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "The allocated storage in gibibytes"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "The upper limit to which Amazon RDS can automatically scale"
  type        = number
  default     = 100
}

variable "storage_type" {
  description = "One of standard, gp2, or io1"
  type        = string
  default     = "gp2"
}

variable "storage_encrypted" {
  description = "Specifies whether the DB instance is encrypted"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "The ARN for the KMS encryption key"
  type        = string
  default     = null
}

variable "kms_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 7
}

variable "iops" {
  description = "The amount of provisioned IOPS"
  type        = number
  default     = null
}

# Database Configuration
variable "db_name" {
  description = "The name of the database"
  type        = string
  default     = null
}

variable "username" {
  description = "Username for the master DB user"
  type        = string
  default     = "admin"
}

variable "password" {
  description = "Password for the master DB user"
  type        = string
  default     = null
  sensitive   = true
}

variable "manage_master_user_password" {
  description = "Set to true to allow RDS to manage the master user password in Secrets Manager"
  type        = bool
  default     = true
}

variable "port" {
  description = "The port on which the DB accepts connections"
  type        = number
  default     = 5432
}

# Network Configuration
variable "publicly_accessible" {
  description = "Bool to control if instance is publicly accessible"
  type        = bool
  default     = false
}

variable "allowed_security_groups" {
  description = "List of security group IDs allowed to access the database"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the database"
  type        = list(string)
  default     = []
}

# Parameter and Option Groups
variable "create_db_parameter_group" {
  description = "Whether to create a database parameter group"
  type        = bool
  default     = true
}

variable "parameter_group_name" {
  description = "Name of the parameter group to associate with this instance"
  type        = string
  default     = null
}

variable "parameter_group_family" {
  description = "The DB parameter group family"
  type        = string
  default     = "postgres15"
}

variable "parameters" {
  description = "A list of DB parameters to apply"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "create_db_option_group" {
  description = "Whether to create a database option group"
  type        = bool
  default     = false
}

variable "option_group_name" {
  description = "Name of the option group to associate with this instance"
  type        = string
  default     = null
}

variable "major_engine_version" {
  description = "Specifies the major version of the engine"
  type        = string
  default     = "15"
}

variable "options" {
  description = "A list of options to apply"
  type = list(object({
    option_name = string
    option_settings = list(object({
      name  = string
      value = string
    }))
  }))
  default = []
}

# Backup Configuration
variable "backup_retention_period" {
  description = "The days to retain backups for"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "The daily time range for backups"
  type        = string
  default     = "03:00-04:00"
}

variable "copy_tags_to_snapshot" {
  description = "Copy all tags to snapshots"
  type        = bool
  default     = true
}

variable "delete_automated_backups" {
  description = "Delete automated backups immediately after the DB instance is deleted"
  type        = bool
  default     = true
}

# Maintenance Configuration
variable "maintenance_window" {
  description = "The window to perform maintenance in"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "auto_minor_version_upgrade" {
  description = "Allow automated minor version upgrade"
  type        = bool
  default     = true
}

# High Availability
variable "multi_az" {
  description = "Specifies if the RDS instance is multi-AZ"
  type        = bool
  default     = true
}

variable "availability_zone" {
  description = "The AZ for the RDS instance"
  type        = string
  default     = null
}

# Read Replicas
variable "read_replica_count" {
  description = "Number of read replicas to create"
  type        = number
  default     = 0
}

variable "read_replica_instance_class" {
  description = "Instance class for read replicas"
  type        = string
  default     = null
}

# Monitoring
variable "monitoring_interval" {
  description = "The interval for collecting enhanced monitoring metrics"
  type        = number
  default     = 60
}

variable "enabled_cloudwatch_logs_exports" {
  description = "List of log types to export to CloudWatch"
  type        = list(string)
  default     = ["postgresql"]
}

variable "performance_insights_enabled" {
  description = "Specifies whether Performance Insights are enabled"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Amount of time in days to retain Performance Insights data"
  type        = number
  default     = 7
}

variable "cloudwatch_log_group_retention_in_days" {
  description = "The number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "cloudwatch_log_group_kms_key_id" {
  description = "The ARN of the KMS Key for CloudWatch logs encryption"
  type        = string
  default     = null
}

# Security
variable "deletion_protection" {
  description = "Enable deletion protection on the DB instance"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when deleting"
  type        = bool
  default     = false
}

# Restore Configuration
variable "snapshot_identifier" {
  description = "Specifies whether or not to create this database from a snapshot"
  type        = string
  default     = null
}

variable "restore_to_point_in_time" {
  description = "Configuration for restoring from point in time"
  type = object({
    restore_time                             = string
    source_db_instance_identifier           = string
    source_db_instance_automated_backups_arn = string
    use_latest_restorable_time              = bool
  })
  default = null
}

# CloudWatch Alarm Thresholds
variable "cpu_utilization_threshold" {
  description = "The maximum percentage of CPU utilization"
  type        = number
  default     = 80
}

variable "database_connections_threshold" {
  description = "The maximum number of database connections"
  type        = number
  default     = 80
}

variable "freeable_memory_threshold" {
  description = "The minimum amount of available random access memory in bytes"
  type        = number
  default     = 536870912 # 512MB
}

variable "alarm_actions" {
  description = "The list of actions to execute when this alarm transitions into an ALARM state"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "A mapping of tags to assign to the resource"
  type        = map(string)
  default     = {}
}
