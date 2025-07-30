#!/bin/bash

# Automated Backup Script for Frontier Production
# Comprehensive backup solution with verification and cleanup

set -euo pipefail

# Configuration
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
S3_BACKUP_BUCKET="frontier-prod-backups"
S3_APP_BUCKET="frontier-app-backups"
RETENTION_DAYS=30
LOG_FILE="/var/log/frontier-backup.log"

# Database configuration
DB_HOST="frontier-prod.cluster-xxxxx.us-west-2.rds.amazonaws.com"
DB_NAME="frontier"
DB_USER="frontier_admin"

# Kubernetes configuration
NAMESPACE="production"
CLUSTER_NAME="frontier-prod-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "${GREEN}$@${NC}"
}

log_warn() {
    log "WARN" "${YELLOW}$@${NC}"
}

log_error() {
    log "ERROR" "${RED}$@${NC}"
}

# Function to create database backup
backup_database() {
    log_info "Starting database backup..."
    
    local backup_file="database_backup_${BACKUP_DATE}.sql"
    local backup_path="/tmp/$backup_file"
    
    # Create database dump
    if PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --file="$backup_path"; then
        
        log_info "Database dump created successfully"
    else
        log_error "Failed to create database dump"
        return 1
    fi
    
    # Compress backup
    gzip "$backup_path"
    backup_path="${backup_path}.gz"
    
    # Upload to S3
    if aws s3 cp "$backup_path" "s3://$S3_BACKUP_BUCKET/database/$backup_file.gz" \
        --storage-class STANDARD_IA \
        --metadata="backup-date=$BACKUP_DATE,type=database"; then
        
        log_info "Database backup uploaded to S3"
    else
        log_error "Failed to upload database backup to S3"
        return 1
    fi
    
    # Verify backup integrity
    if gunzip -t "$backup_path"; then
        log_info "Database backup integrity verified"
    else
        log_error "Database backup integrity check failed"
        return 1
    fi
    
    # Cleanup local file
    rm -f "$backup_path"
    
    log_info "Database backup completed successfully"
    return 0
}

# Function to backup Kubernetes configurations
backup_kubernetes() {
    log_info "Starting Kubernetes configurations backup..."
    
    local backup_dir="/tmp/k8s_backup_${BACKUP_DATE}"
    mkdir -p "$backup_dir"
    
    # Backup all resources in production namespace
    local resources=(
        "deployments"
        "services"
        "configmaps"
        "secrets"
        "ingresses"
        "persistentvolumeclaims"
        "horizontalpodautoscalers"
    )
    
    for resource in "${resources[@]}"; do
        log_info "Backing up $resource..."
        
        if kubectl get "$resource" -n "$NAMESPACE" -o yaml > "$backup_dir/${resource}.yaml"; then
            log_info "Successfully backed up $resource"
        else
            log_warn "Failed to backup $resource"
        fi
    done
    
    # Backup cluster-wide resources
    kubectl get nodes -o yaml > "$backup_dir/nodes.yaml"
    kubectl get storageclasses -o yaml > "$backup_dir/storageclasses.yaml"
    
    # Create tarball
    local tarball="k8s_backup_${BACKUP_DATE}.tar.gz"
    tar -czf "/tmp/$tarball" -C "/tmp" "k8s_backup_${BACKUP_DATE}"
    
    # Upload to S3
    if aws s3 cp "/tmp/$tarball" "s3://$S3_BACKUP_BUCKET/kubernetes/$tarball" \
        --metadata="backup-date=$BACKUP_DATE,type=kubernetes"; then
        
        log_info "Kubernetes backup uploaded to S3"
    else
        log_error "Failed to upload Kubernetes backup to S3"
        return 1
    fi
    
    # Cleanup
    rm -rf "$backup_dir" "/tmp/$tarball"
    
    log_info "Kubernetes backup completed successfully"
    return 0
}

# Function to backup application data
backup_application_data() {
    log_info "Starting application data backup..."
    
    local backup_dir="/tmp/app_data_backup_${BACKUP_DATE}"
    mkdir -p "$backup_dir"
    
    # Backup persistent volume data
    log_info "Backing up persistent volume data..."
    
    # Get list of PVCs
    local pvcs=$(kubectl get pvc -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')
    
    for pvc in $pvcs; do
        log_info "Backing up PVC: $pvc"
        
        # Create temporary pod to access PVC data
        kubectl run backup-pod-$(date +%s) \
            --image=alpine \
            --rm -i --restart=Never \
            --overrides='{"spec":{"containers":[{"name":"backup","image":"alpine","command":["tar","czf","/backup/'$pvc'_'$BACKUP_DATE'.tar.gz","-C","/data","."],"volumeMounts":[{"name":"data","mountPath":"/data"},{"name":"backup","mountPath":"/backup"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"'$pvc'"}},{"name":"backup","hostPath":{"path":"/tmp"}}]}}' \
            -n "$NAMESPACE"
    done
    
    # Upload application logs
    log_info "Backing up application logs..."
    kubectl logs -l app=frontier-api -n "$NAMESPACE" --since=24h > "$backup_dir/application.log"
    
    # Create tarball
    local tarball="app_data_backup_${BACKUP_DATE}.tar.gz"
    tar -czf "/tmp/$tarball" -C "/tmp" "app_data_backup_${BACKUP_DATE}"
    
    # Upload to S3
    if aws s3 cp "/tmp/$tarball" "s3://$S3_APP_BUCKET/data/$tarball" \
        --metadata="backup-date=$BACKUP_DATE,type=application-data"; then
        
        log_info "Application data backup uploaded to S3"
    else
        log_error "Failed to upload application data backup to S3"
        return 1
    fi
    
    # Cleanup
    rm -rf "$backup_dir" "/tmp/$tarball"
    
    log_info "Application data backup completed successfully"
    return 0
}

# Function to backup monitoring data
backup_monitoring() {
    log_info "Starting monitoring data backup..."
    
    local backup_dir="/tmp/monitoring_backup_${BACKUP_DATE}"
    mkdir -p "$backup_dir"
    
    # Backup Prometheus data
    log_info "Backing up Prometheus configuration..."
    kubectl get configmap prometheus-config -n monitoring -o yaml > "$backup_dir/prometheus-config.yaml"
    kubectl get configmap prometheus-rules -n monitoring -o yaml > "$backup_dir/prometheus-rules.yaml"
    
    # Backup Grafana dashboards
    log_info "Backing up Grafana dashboards..."
    kubectl get configmap -n monitoring -l app=grafana -o yaml > "$backup_dir/grafana-dashboards.yaml"
    
    # Backup AlertManager configuration
    log_info "Backing up AlertManager configuration..."
    kubectl get configmap alertmanager-config -n monitoring -o yaml > "$backup_dir/alertmanager-config.yaml"
    
    # Create tarball
    local tarball="monitoring_backup_${BACKUP_DATE}.tar.gz"
    tar -czf "/tmp/$tarball" -C "/tmp" "monitoring_backup_${BACKUP_DATE}"
    
    # Upload to S3
    if aws s3 cp "/tmp/$tarball" "s3://$S3_BACKUP_BUCKET/monitoring/$tarball" \
        --metadata="backup-date=$BACKUP_DATE,type=monitoring"; then
        
        log_info "Monitoring backup uploaded to S3"
    else
        log_error "Failed to upload monitoring backup to S3"
        return 1
    fi
    
    # Cleanup
    rm -rf "$backup_dir" "/tmp/$tarball"
    
    log_info "Monitoring backup completed successfully"
    return 0
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    
    # Cleanup database backups
    aws s3 ls "s3://$S3_BACKUP_BUCKET/database/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $4}' | grep -o '[0-9]\{8\}' | head -1)
        if [[ "$file_date" < "$cutoff_date" ]]; then
            local file_name=$(echo "$line" | awk '{print $4}')
            log_info "Deleting old database backup: $file_name"
            aws s3 rm "s3://$S3_BACKUP_BUCKET/database/$file_name"
        fi
    done
    
    # Cleanup Kubernetes backups
    aws s3 ls "s3://$S3_BACKUP_BUCKET/kubernetes/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $4}' | grep -o '[0-9]\{8\}' | head -1)
        if [[ "$file_date" < "$cutoff_date" ]]; then
            local file_name=$(echo "$line" | awk '{print $4}')
            log_info "Deleting old Kubernetes backup: $file_name"
            aws s3 rm "s3://$S3_BACKUP_BUCKET/kubernetes/$file_name"
        fi
    done
    
    # Cleanup application data backups
    aws s3 ls "s3://$S3_APP_BUCKET/data/" | while read -r line; do
        local file_date=$(echo "$line" | awk '{print $4}' | grep -o '[0-9]\{8\}' | head -1)
        if [[ "$file_date" < "$cutoff_date" ]]; then
            local file_name=$(echo "$line" | awk '{print $4}')
            log_info "Deleting old application data backup: $file_name"
            aws s3 rm "s3://$S3_APP_BUCKET/data/$file_name"
        fi
    done
    
    log_info "Cleanup completed"
}

# Function to send backup notification
send_notification() {
    local status=$1
    local message=$2
    
    local webhook_url="$SLACK_WEBHOOK_URL"
    
    if [[ -n "$webhook_url" ]]; then
        local color="good"
        if [[ "$status" != "success" ]]; then
            color="danger"
        fi
        
        local payload=$(cat <<EOF
{
    "channel": "#ops-alerts",
    "username": "Backup Bot",
    "text": "Frontier Production Backup Report",
    "attachments": [
        {
            "color": "$color",
            "fields": [
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Date",
                    "value": "$BACKUP_DATE",
                    "short": true
                },
                {
                    "title": "Details",
                    "value": "$message",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$webhook_url"
    fi
}

# Main backup function
main() {
    log_info "Starting Frontier production backup process..."
    
    local backup_status="success"
    local error_messages=""
    
    # Source environment variables
    if [[ -f "/etc/frontier/backup.env" ]]; then
        source "/etc/frontier/backup.env"
    fi
    
    # Verify required environment variables
    if [[ -z "${DB_PASSWORD:-}" ]]; then
        log_error "DB_PASSWORD environment variable not set"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Run backup components
    if ! backup_database; then
        backup_status="failed"
        error_messages+="Database backup failed. "
    fi
    
    if ! backup_kubernetes; then
        backup_status="failed"
        error_messages+="Kubernetes backup failed. "
    fi
    
    if ! backup_application_data; then
        backup_status="failed"
        error_messages+="Application data backup failed. "
    fi
    
    if ! backup_monitoring; then
        backup_status="failed"
        error_messages+="Monitoring backup failed. "
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Send notification
    if [[ "$backup_status" == "success" ]]; then
        local message="All backup components completed successfully."
        log_info "Backup process completed successfully"
    else
        local message="Backup process completed with errors: $error_messages"
        log_error "Backup process completed with errors"
    fi
    
    send_notification "$backup_status" "$message"
    
    log_info "Backup process finished"
    
    if [[ "$backup_status" != "success" ]]; then
        exit 1
    fi
}

# Run main function
main "$@"
