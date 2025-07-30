# Frontier Production Disaster Recovery Plan

## 🚨 Emergency Response Procedures

This document outlines the disaster recovery procedures for the Frontier production system, including backup strategies, failover procedures, and recovery protocols.

## 📋 Quick Reference

### Emergency Contacts
- **Operations Team**: ops-team@frontier.com
- **Development Team**: dev-team@frontier.com  
- **Infrastructure Team**: infra-team@frontier.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

### Critical System URLs
- **Production API**: https://api.frontier.com
- **Grafana Dashboard**: https://monitoring.frontier.com
- **AlertManager**: https://alerts.frontier.com
- **AWS Console**: https://console.aws.amazon.com

## 🎯 Recovery Time Objectives (RTO)

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| API Services | 15 minutes | 5 minutes | Critical |
| Database | 30 minutes | 15 minutes | Critical |
| Cache Layer | 10 minutes | 0 minutes | High |
| AI Services | 45 minutes | 30 minutes | High |
| Monitoring | 20 minutes | 10 minutes | Medium |

## 🔄 Backup Strategy

### Automated Backups

#### Database Backups
- **Frequency**: Every 4 hours
- **Retention**: 30 days
- **Location**: S3 bucket `frontier-prod-backups`
- **Encryption**: AES-256

#### Application Data Backups  
- **Frequency**: Daily
- **Retention**: 90 days
- **Location**: S3 bucket `frontier-app-backups`
- **Cross-region replication**: Enabled

#### Configuration Backups
- **Frequency**: On every change
- **Retention**: Indefinite
- **Location**: Git repository + S3

## 🚨 Disaster Scenarios & Response

### Scenario 1: Complete AWS Region Failure

**Symptoms:**
- All services in primary region (us-west-2) unavailable
- DNS resolution failing
- No response from load balancers

**Response Steps:**

1. **Immediate Assessment (0-5 minutes)**
   ```bash
   # Check AWS Service Health Dashboard
   # Verify region-wide outage
   # Activate disaster recovery team
   ```

2. **Failover to Secondary Region (5-30 minutes)**
   ```bash
   # Switch DNS to secondary region
   aws route53 change-resource-record-sets --hosted-zone-id ZXXXXX \
     --change-batch file://failover-dns.json
   
   # Start disaster recovery cluster
   kubectl apply -f disaster-recovery/dr-cluster.yaml
   
   # Restore database from latest backup
   ./scripts/restore-database.sh --region us-east-1 --backup latest
   ```

3. **Validation (30-45 minutes)**
   ```bash
   # Run health checks
   ./scripts/health-check.sh --environment dr
   
   # Validate core functionality
   pytest tests/smoke/ --env=dr
   ```

### Scenario 2: Database Corruption/Failure

**Symptoms:**
- Database connection errors
- Data inconsistency alerts
- Failed database health checks

**Response Steps:**

1. **Immediate Isolation (0-2 minutes)**
   ```bash
   # Stop write operations
   kubectl scale deployment frontier-api --replicas=0 -n production
   
   # Enable read-only mode for existing connections
   psql -h $DB_HOST -c "ALTER SYSTEM SET default_transaction_read_only = on;"
   ```

2. **Assessment (2-10 minutes)**
   ```bash
   # Check database integrity
   psql -h $DB_HOST -c "SELECT pg_database_size('frontier');"
   
   # Review recent backup status
   aws rds describe-db-snapshots --db-instance-identifier frontier-prod
   ```

3. **Recovery (10-30 minutes)**
   ```bash
   # Restore from latest clean backup
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier frontier-prod-restored \
     --db-snapshot-identifier frontier-prod-snapshot-YYYYMMDD
   
   # Update application connection strings
   kubectl patch secret frontier-secrets -n production \
     --patch='{"data":{"database-url":"'$(echo -n $NEW_DB_URL | base64)'"}}'
   ```

### Scenario 3: Kubernetes Cluster Failure

**Symptoms:**
- kubectl commands failing
- Pods not scheduling
- Node communication issues

**Response Steps:**

1. **Quick Assessment (0-3 minutes)**
   ```bash
   # Check cluster status
   kubectl cluster-info
   kubectl get nodes
   
   # Check AWS EKS console
   aws eks describe-cluster --name frontier-prod-cluster
   ```

2. **Emergency Cluster Recovery (3-20 minutes)**
   ```bash
   # Deploy to backup cluster
   kubectl config use-context frontier-backup-cluster
   
   # Apply production configurations
   kubectl apply -f k8s/ -n production
   
   # Scale up services
   kubectl scale deployment frontier-api --replicas=3 -n production
   ```

### Scenario 4: Security Breach

**Symptoms:**
- Unusual access patterns
- Security alerts
- Unauthorized data access

**Response Steps:**

1. **Immediate Containment (0-5 minutes)**
   ```bash
   # Revoke all API keys
   kubectl delete secret frontier-api-keys -n production
   
   # Block suspicious IPs
   kubectl apply -f security/emergency-block.yaml
   
   # Enable emergency read-only mode
   kubectl patch configmap frontier-config -n production \
     --patch='{"data":{"emergency_mode":"true"}}'
   ```

2. **Investigation (5-60 minutes)**
   ```bash
   # Export audit logs
   kubectl logs -l app=frontier-api -n production --since=24h > audit.log
   
   # Check database access logs
   aws rds describe-db-log-files --db-instance-identifier frontier-prod
   ```

3. **Recovery (60+ minutes)**
   ```bash
   # Generate new secrets
   ./scripts/rotate-secrets.sh --force
   
   # Deploy security patches
   kubectl set image deployment/frontier-api frontier-api=frontier/api:security-patch
   ```

## 🔧 Recovery Scripts

### Database Restore Script
```bash
#!/bin/bash
# disaster-recovery/restore-database.sh

set -euo pipefail

BACKUP_DATE=${1:-$(date +%Y%m%d)}
TARGET_REGION=${2:-us-east-1}

echo "Restoring database from backup dated: $BACKUP_DATE"

# Find latest backup
SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --region $TARGET_REGION \
  --query "DBSnapshots[?starts_with(DBSnapshotIdentifier, 'frontier-prod-$BACKUP_DATE')].DBSnapshotIdentifier" \
  --output text | sort | tail -1)

if [[ -z "$SNAPSHOT_ID" ]]; then
  echo "No backup found for date: $BACKUP_DATE"
  exit 1
fi

echo "Using snapshot: $SNAPSHOT_ID"

# Restore database
aws rds restore-db-instance-from-db-snapshot \
  --region $TARGET_REGION \
  --db-instance-identifier "frontier-prod-restored-$(date +%s)" \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --db-instance-class db.r6g.large \
  --multi-az \
  --no-publicly-accessible

echo "Database restore initiated"
```

### Service Health Check Script
```bash
#!/bin/bash
# disaster-recovery/health-check.sh

ENVIRONMENT=${1:-production}
NAMESPACE=${2:-production}

echo "Running health checks for environment: $ENVIRONMENT"

# Check API health
API_ENDPOINT=$(kubectl get service frontier-api-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

if curl -f -s "http://$API_ENDPOINT/health" > /dev/null; then
  echo "✅ API health check passed"
else
  echo "❌ API health check failed"
  exit 1
fi

# Check database connectivity
if kubectl exec -n $NAMESPACE deployment/frontier-api -- python -c "
import psycopg2
import os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cursor = conn.cursor()
cursor.execute('SELECT 1')
print('Database connection successful')
conn.close()
"; then
  echo "✅ Database connectivity check passed"
else
  echo "❌ Database connectivity check failed"
  exit 1
fi

# Check Redis connectivity
if kubectl exec -n $NAMESPACE deployment/frontier-api -- python -c "
import redis
import os
r = redis.from_url(os.environ['REDIS_URL'])
r.ping()
print('Redis connection successful')
"; then
  echo "✅ Redis connectivity check passed"
else
  echo "❌ Redis connectivity check failed"
  exit 1
fi

echo "All health checks passed ✅"
```

### Emergency Rollback Script
```bash
#!/bin/bash
# disaster-recovery/emergency-rollback.sh

NAMESPACE=${1:-production}
PREVIOUS_VERSION=${2:-}

echo "Initiating emergency rollback in namespace: $NAMESPACE"

if [[ -z "$PREVIOUS_VERSION" ]]; then
  # Get previous version from rollout history
  PREVIOUS_VERSION=$(kubectl rollout history deployment/frontier-api -n $NAMESPACE | tail -2 | head -1 | awk '{print $1}')
fi

echo "Rolling back to version: $PREVIOUS_VERSION"

# Rollback deployment
kubectl rollout undo deployment/frontier-api -n $NAMESPACE --to-revision=$PREVIOUS_VERSION

# Wait for rollback to complete
kubectl rollout status deployment/frontier-api -n $NAMESPACE --timeout=300s

# Verify rollback
./health-check.sh $NAMESPACE

echo "Emergency rollback completed ✅"
```

## 📊 Monitoring & Alerting

### Critical Alerts for DR

1. **Region Failure Detection**
   ```yaml
   - alert: RegionFailure
     expr: up{job="kubernetes-apiservers"} == 0
     for: 2m
     labels:
       severity: critical
       runbook: "https://docs.frontier.com/runbooks/region-failure"
   ```

2. **Database Failure Detection**
   ```yaml
   - alert: DatabaseDown
     expr: up{job="postgres-exporter"} == 0
     for: 1m
     labels:
       severity: critical
       runbook: "https://docs.frontier.com/runbooks/database-failure"
   ```

3. **Cluster Failure Detection**
   ```yaml
   - alert: ClusterUnreachable
     expr: up{job="kubernetes-nodes"} < 0.5
     for: 3m
     labels:
       severity: critical
       runbook: "https://docs.frontier.com/runbooks/cluster-failure"
   ```

## 🧪 Testing & Validation

### Monthly DR Drills

1. **Database Failover Test**
   - Schedule: First Sunday of each month
   - Duration: 2 hours
   - Scope: Test database backup/restore procedures

2. **Region Failover Test**
   - Schedule: Quarterly
   - Duration: 4 hours
   - Scope: Full region failover simulation

3. **Security Incident Response**
   - Schedule: Bi-annually
   - Duration: 3 hours
   - Scope: Security breach simulation

### Automated DR Testing
```bash
# disaster-recovery/automated-dr-test.sh
#!/bin/bash

# Run weekly automated DR tests
echo "Starting automated DR test..."

# Test database backup integrity
./test-backup-integrity.sh

# Test cluster backup deployment
./test-cluster-backup.sh

# Test DNS failover
./test-dns-failover.sh

# Generate DR test report
./generate-dr-report.sh

echo "Automated DR test completed"
```

## 📚 Runbooks

### Critical System Recovery
- [Database Recovery Runbook](runbooks/database-recovery.md)
- [Cluster Recovery Runbook](runbooks/cluster-recovery.md)
- [Security Incident Runbook](runbooks/security-incident.md)
- [Network Failure Runbook](runbooks/network-failure.md)

### Communication Templates
- [Incident Declaration](templates/incident-declaration.md)
- [Customer Communication](templates/customer-communication.md)
- [Post-Incident Report](templates/post-incident-report.md)

## 🎯 Recovery Validation Checklist

After any disaster recovery procedure:

- [ ] All services are healthy and responding
- [ ] Database integrity verified
- [ ] Application functionality tested
- [ ] Performance metrics within normal ranges
- [ ] Security controls functioning
- [ ] Monitoring and alerting operational
- [ ] Backup systems running
- [ ] Customer communication sent (if applicable)
- [ ] Post-incident review scheduled
- [ ] Documentation updated

## 🔄 Continuous Improvement

### Post-Incident Process
1. Conduct post-incident review within 24 hours
2. Document lessons learned
3. Update procedures and runbooks
4. Schedule follow-up testing
5. Implement process improvements

### Metrics & KPIs
- Mean Time to Recovery (MTTR)
- Recovery Point Objective (RPO) adherence
- Backup success rate
- DR test success rate
- Incident response time

---

**⚠️ Important**: This disaster recovery plan should be reviewed quarterly and updated based on infrastructure changes, security requirements, and lessons learned from incidents or drills.

**🔒 Security Note**: This document contains sensitive information about system architecture and should be stored securely with appropriate access controls.
