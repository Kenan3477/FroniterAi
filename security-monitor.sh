#!/bin/bash

# Omnivox Security Monitoring Script
# Generated on 2026-02-18T11:49:00.795Z

BACKEND_URL="https://froniterai-production.up.railway.app"
ALERT_EMAIL="admin@omnivox.com"
LOG_FILE="/var/log/omnivox-security.log"

# Function to send alert
send_alert() {
    local message="$1"
    local priority="$2"
    
    echo "[$(date)] $priority: $message" >> $LOG_FILE
    
    # Send email alert (configure with your email service)
    echo "Subject: [OMNIVOX SECURITY] $priority Alert
    
$message

Time: $(date)
Server: $(hostname)
    " | mail -s "[OMNIVOX SECURITY] $priority Alert" $ALERT_EMAIL
    
    # Log to system journal
    logger -t omnivox-security "$priority: $message"
}

# Check for suspicious activity
check_security() {
    echo "[$(date)] Running security check..." >> $LOG_FILE
    
    # Check for failed login attempts
    FAILED_LOGINS=$(curl -s "$BACKEND_URL/api/security/status" | jq -r '.data.stats.totalEvents // 0')
    
    if [ "$FAILED_LOGINS" -gt 10 ]; then
        send_alert "High number of failed login attempts detected: $FAILED_LOGINS" "HIGH"
    fi
    
    # Check for blocked IPs
    BLOCKED_IPS=$(curl -s "$BACKEND_URL/api/security/status" | jq -r '.data.stats.blockedIPs // 0')
    
    if [ "$BLOCKED_IPS" -gt 5 ]; then
        send_alert "Multiple IPs blocked: $BLOCKED_IPS" "MEDIUM"
    fi
    
    # Check system resources
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if [ "${CPU_USAGE%.*}" -gt 90 ]; then
        send_alert "High CPU usage detected: $CPU_USAGE%" "MEDIUM"
    fi
    
    # Check disk space
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    if [ "$DISK_USAGE" -gt 85 ]; then
        send_alert "High disk usage detected: $DISK_USAGE%" "MEDIUM"
    fi
}

# Run security check
check_security

# Schedule this script to run every 5 minutes with cron:
# */5 * * * * /path/to/security-monitor.sh
