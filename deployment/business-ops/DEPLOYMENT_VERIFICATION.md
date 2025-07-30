# Business Operations Deployment Verification and Health Check Documentation

## Overview

This document provides comprehensive verification procedures and health checks for the Business Operations module deployment. These procedures ensure that all components are functioning correctly and meeting compliance requirements.

## Deployment Verification Checklist

### 1. Infrastructure Verification

#### Resource Deployment
- [ ] Verify all namespaces are created: `business-ops`, `business-ops-eu`, `business-ops-us`, `business-ops-secrets`, `business-ops-dr`
- [ ] Confirm resource calculator is deployed and accessible
- [ ] Validate scaling policies are applied (HPA, VPA, KEDA)
- [ ] Check monitoring stack deployment (Prometheus, Grafana, AlertManager)
- [ ] Verify database clusters are running in all regions

```bash
# Check namespace creation
kubectl get namespaces | grep business-ops

# Verify resource calculator deployment
kubectl get deployment resource-calculator -n business-ops

# Check scaling policies
kubectl get hpa,vpa -n business-ops
kubectl get scaledobject -n business-ops

# Verify monitoring stack
kubectl get pods -n business-ops | grep -E "(prometheus|grafana|alertmanager)"

# Check database clusters
kubectl get clusters.postgresql.cnpg.io -A
```

#### Secret Management
- [ ] External Secrets Operator is installed and configured
- [ ] All ExternalSecrets are synced and healthy
- [ ] Vault configuration is properly deployed
- [ ] SSL/TLS certificates are valid and auto-renewing
- [ ] Secret rotation is scheduled and functioning

```bash
# Check External Secrets status
kubectl get externalsecrets -n business-ops
kubectl describe externalsecret business-ops-database-secret -n business-ops

# Verify Vault deployment
kubectl get pods -n business-ops-secrets | grep vault

# Check certificate status
kubectl get certificates -n business-ops
kubectl describe certificate business-ops-internal-tls -n business-ops

# Verify secret rotation CronJob
kubectl get cronjob secret-rotation -n business-ops-secrets
```

### 2. Application Health Verification

#### API Services
- [ ] Business Operations API is responding in all regions
- [ ] Health endpoints return 200 status
- [ ] Authentication is working correctly
- [ ] Rate limiting is functioning
- [ ] SSL/TLS certificates are valid

```bash
# Test API health endpoints
curl -k https://business-ops-api.business-ops.svc.cluster.local:8080/health
curl -k https://business-ops-api-eu.business-ops-eu.svc.cluster.local:8080/health
curl -k https://business-ops-api-us.business-ops-us.svc.cluster.local:8080/health

# Test authentication
curl -X POST https://business-ops-api.business-ops.svc.cluster.local:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Check SSL certificate validity
openssl s_client -connect business-ops-api.business-ops.svc.cluster.local:8080 -servername business-ops-api.business-ops.svc.cluster.local
```

#### Database Connectivity
- [ ] Primary database is accessible and responding
- [ ] Standby databases are replicating correctly
- [ ] Database migrations have completed successfully
- [ ] Audit triggers are functioning
- [ ] Backup procedures are working

```bash
# Test database connectivity
kubectl exec -it business-ops-database-0 -n business-ops -- psql -U postgres -d business_ops -c "SELECT version();"

# Check replication status
kubectl exec -it business-ops-database-0 -n business-ops -- psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Verify migration status
kubectl logs job/db-migration -n business-ops

# Check audit trigger functionality
kubectl exec -it business-ops-database-0 -n business-ops -- psql -U postgres -d business_ops -c "SELECT count(*) FROM audit.transaction_audit;"

# Verify backup job status
kubectl get cronjob database-backup -n business-ops
kubectl logs job/database-backup-$(date +%Y%m%d) -n business-ops
```

### 3. Compliance Verification

#### Data Sovereignty
- [ ] Regional deployments are running in correct geographical locations
- [ ] Data residency policies are enforced
- [ ] Cross-border data transfer restrictions are active
- [ ] GDPR compliance controls are functioning
- [ ] SOX compliance controls are active

```bash
# Verify regional node scheduling
kubectl get pods -n business-ops-eu -o wide
kubectl get pods -n business-ops-us -o wide

# Check data residency enforcement
kubectl get networkpolicy data-residency-enforcement -n business-ops-eu

# Verify compliance annotations
kubectl get deployments -n business-ops-eu -o jsonpath='{.items[*].metadata.annotations}'

# Check Kyverno policy enforcement
kubectl get cpol enforce-data-residency
```

#### Security Controls
- [ ] Pod Security Policies/Standards are enforced
- [ ] Network policies are active and restricting traffic
- [ ] RBAC is properly configured
- [ ] Service mesh security (if applicable) is functioning
- [ ] Audit logging is capturing all required events

```bash
# Check Pod Security Standards
kubectl get pods -n business-ops -o jsonpath='{.items[*].metadata.labels}' | grep security

# Verify network policies
kubectl get networkpolicy -A
kubectl describe networkpolicy secrets-network-policy -n business-ops

# Check RBAC configuration
kubectl get roles,rolebindings -n business-ops
kubectl auth can-i get secrets --as=system:serviceaccount:business-ops:default -n business-ops

# Verify audit logging
kubectl logs -n kube-system audit-policy-webhook
```

### 4. Performance and Scaling Verification

#### Auto-scaling
- [ ] HPA is responding to CPU/memory metrics
- [ ] VPA is providing resource recommendations
- [ ] KEDA is scaling based on queue metrics
- [ ] Custom metrics are being collected
- [ ] Scaling policies respect resource constraints

```bash
# Test HPA scaling
kubectl get hpa -n business-ops -w

# Generate load to test scaling
kubectl run load-test --image=busybox --rm -it --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://business-ops-api:8080/api/v1/transactions; done"

# Check VPA recommendations
kubectl get vpa -n business-ops -o yaml

# Verify KEDA scaling
kubectl get scaledobject -n business-ops
kubectl describe scaledobject business-ops-queue-scaler -n business-ops

# Check custom metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .
```

#### Performance Metrics
- [ ] Response times are within acceptable limits
- [ ] Throughput meets requirements
- [ ] Error rates are below thresholds
- [ ] Resource utilization is optimal
- [ ] Database performance is acceptable

```bash
# Check performance metrics in Grafana
curl "http://grafana.business-ops.svc.cluster.local:3000/api/dashboards/db/business-ops-performance"

# Query Prometheus for key metrics
curl "http://prometheus.business-ops.svc.cluster.local:9090/api/v1/query?query=http_request_duration_seconds{job='business-ops-api'}"
curl "http://prometheus.business-ops.svc.cluster.local:9090/api/v1/query?query=rate(http_requests_total{job='business-ops-api'}[5m])"
```

## Health Check Scripts

### Automated Health Check Script

```bash
#!/bin/bash
# business-ops-health-check.sh

set -euo pipefail

NAMESPACE=${1:-business-ops}
TIMEOUT=${2:-300}

echo "Starting Business Operations Health Check for namespace: $NAMESPACE"

# Function to check pod readiness
check_pod_readiness() {
    local app_name=$1
    echo "Checking $app_name pods..."
    
    kubectl wait --for=condition=ready pod -l app=$app_name -n $NAMESPACE --timeout=${TIMEOUT}s
    
    if [ $? -eq 0 ]; then
        echo "✅ $app_name pods are ready"
    else
        echo "❌ $app_name pods are not ready"
        return 1
    fi
}

# Function to check service endpoints
check_service_endpoints() {
    local service_name=$1
    local endpoint_path=${2:-/health}
    
    echo "Checking $service_name service endpoints..."
    
    local service_ip=$(kubectl get service $service_name -n $NAMESPACE -o jsonpath='{.spec.clusterIP}')
    local service_port=$(kubectl get service $service_name -n $NAMESPACE -o jsonpath='{.spec.ports[0].port}')
    
    if curl -s -o /dev/null -w "%{http_code}" http://$service_ip:$service_port$endpoint_path | grep -q "200"; then
        echo "✅ $service_name service is responding"
    else
        echo "❌ $service_name service is not responding"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo "Checking database connectivity..."
    
    kubectl exec -n $NAMESPACE business-ops-database-0 -- pg_isready -U postgres
    
    if [ $? -eq 0 ]; then
        echo "✅ Database is ready"
    else
        echo "❌ Database is not ready"
        return 1
    fi
}

# Function to check external secrets
check_external_secrets() {
    echo "Checking external secrets..."
    
    local secrets_status=$(kubectl get externalsecrets -n $NAMESPACE -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}')
    
    if [[ "$secrets_status" == *"False"* ]]; then
        echo "❌ Some external secrets are not ready"
        kubectl get externalsecrets -n $NAMESPACE
        return 1
    else
        echo "✅ All external secrets are ready"
    fi
}

# Function to check compliance status
check_compliance() {
    echo "Checking compliance status..."
    
    # Check if compliance monitoring is active
    local compliance_pods=$(kubectl get pods -n $NAMESPACE -l component=compliance --no-headers | wc -l)
    
    if [ $compliance_pods -gt 0 ]; then
        echo "✅ Compliance monitoring is active"
    else
        echo "❌ Compliance monitoring is not active"
        return 1
    fi
}

# Main health check execution
main() {
    echo "========================================="
    echo "Business Operations Health Check Report"
    echo "Namespace: $NAMESPACE"
    echo "Timestamp: $(date)"
    echo "========================================="
    
    # Check core components
    check_pod_readiness "business-ops-api" || exit 1
    check_pod_readiness "business-ops-ml" || exit 1
    
    # Check services
    check_service_endpoints "business-ops-api" "/health" || exit 1
    check_service_endpoints "business-ops-ml" "/health" || exit 1
    
    # Check database
    check_database || exit 1
    
    # Check secrets management
    check_external_secrets || exit 1
    
    # Check compliance
    check_compliance || exit 1
    
    echo "========================================="
    echo "✅ All health checks passed successfully!"
    echo "========================================="
}

main "$@"
```

### Database Health Check Script

```bash
#!/bin/bash
# database-health-check.sh

set -euo pipefail

NAMESPACE=${1:-business-ops}

echo "Performing comprehensive database health check..."

# Check database connection
echo "Testing database connection..."
kubectl exec -n $NAMESPACE business-ops-database-0 -- psql -U postgres -d business_ops -c "SELECT 1;"

# Check replication lag
echo "Checking replication lag..."
kubectl exec -n $NAMESPACE business-ops-database-0 -- psql -U postgres -c "
SELECT 
    client_addr,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS send_lag,
    pg_wal_lsn_diff(sent_lsn, flush_lsn) AS flush_lag,
    pg_wal_lsn_diff(flush_lsn, replay_lsn) AS replay_lag
FROM pg_stat_replication;"

# Check database size and growth
echo "Checking database size..."
kubectl exec -n $NAMESPACE business-ops-database-0 -- psql -U postgres -d business_ops -c "
SELECT 
    pg_size_pretty(pg_database_size('business_ops')) AS database_size,
    pg_size_pretty(pg_total_relation_size('transactions')) AS transactions_table_size;"

# Check backup status
echo "Checking backup status..."
kubectl logs -n $NAMESPACE -l app=database-backup --tail=50

# Check audit trail functionality
echo "Testing audit trail..."
kubectl exec -n $NAMESPACE business-ops-database-0 -- psql -U postgres -d business_ops -c "
INSERT INTO transactions (id, amount, currency, created_at) 
VALUES ('test-' || extract(epoch from now()), 100.00, 'USD', now());

SELECT count(*) FROM audit.transaction_audit WHERE table_name = 'transactions' AND created_at > now() - interval '1 minute';"

echo "Database health check completed successfully!"
```

### Compliance Health Check Script

```python
#!/usr/bin/env python3
# compliance-health-check.py

import subprocess
import json
import sys
from datetime import datetime

def run_kubectl_command(command):
    """Run kubectl command and return output"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(f"Error: {e.stderr}")
        return None

def check_data_residency():
    """Check data residency compliance"""
    print("Checking data residency compliance...")
    
    regions = {
        'business-ops-eu': 'eu-west-1',
        'business-ops-us': 'us-east-1'
    }
    
    for namespace, expected_region in regions.items():
        pods_output = run_kubectl_command(f"kubectl get pods -n {namespace} -o json")
        if pods_output:
            pods_data = json.loads(pods_output)
            for pod in pods_data['items']:
                node_name = pod['spec'].get('nodeName', '')
                if expected_region not in node_name:
                    print(f"❌ Pod {pod['metadata']['name']} in {namespace} is not in expected region {expected_region}")
                    return False
    
    print("✅ Data residency compliance verified")
    return True

def check_encryption_status():
    """Check encryption status"""
    print("Checking encryption status...")
    
    # Check TLS certificates
    cert_output = run_kubectl_command("kubectl get certificates -A -o json")
    if cert_output:
        certs_data = json.loads(cert_output)
        for cert in certs_data['items']:
            conditions = cert.get('status', {}).get('conditions', [])
            ready_condition = next((c for c in conditions if c['type'] == 'Ready'), None)
            if not ready_condition or ready_condition['status'] != 'True':
                print(f"❌ Certificate {cert['metadata']['name']} is not ready")
                return False
    
    print("✅ Encryption status verified")
    return True

def check_audit_logging():
    """Check audit logging functionality"""
    print("Checking audit logging...")
    
    # Check if audit logs are being generated
    audit_query = """
    SELECT count(*) as audit_count 
    FROM audit.transaction_audit 
    WHERE created_at > now() - interval '1 hour';
    """
    
    audit_output = run_kubectl_command(
        f"kubectl exec -n business-ops business-ops-database-0 -- "
        f"psql -U postgres -d business_ops -t -c \"{audit_query}\""
    )
    
    if audit_output and int(audit_output.strip()) > 0:
        print("✅ Audit logging is functioning")
        return True
    else:
        print("❌ No recent audit logs found")
        return False

def check_compliance_monitoring():
    """Check compliance monitoring alerts"""
    print("Checking compliance monitoring...")
    
    # Check if compliance monitoring pods are running
    monitoring_output = run_kubectl_command(
        "kubectl get pods -A -l component=compliance -o json"
    )
    
    if monitoring_output:
        monitoring_data = json.loads(monitoring_output)
        running_pods = sum(1 for pod in monitoring_data['items'] 
                          if pod['status']['phase'] == 'Running')
        
        if running_pods > 0:
            print("✅ Compliance monitoring is active")
            return True
    
    print("❌ Compliance monitoring is not active")
    return False

def generate_compliance_report():
    """Generate comprehensive compliance report"""
    print("=" * 50)
    print("Business Operations Compliance Health Check")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 50)
    
    checks = [
        ("Data Residency", check_data_residency),
        ("Encryption Status", check_encryption_status),
        ("Audit Logging", check_audit_logging),
        ("Compliance Monitoring", check_compliance_monitoring)
    ]
    
    results = []
    for check_name, check_func in checks:
        print(f"\n{check_name}:")
        result = check_func()
        results.append((check_name, result))
    
    print("\n" + "=" * 50)
    print("COMPLIANCE SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for check_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{check_name}: {status}")
        if not result:
            all_passed = False
    
    if all_passed:
        print("\n✅ All compliance checks passed!")
        sys.exit(0)
    else:
        print("\n❌ Some compliance checks failed!")
        sys.exit(1)

if __name__ == "__main__":
    generate_compliance_report()
```

## Monitoring and Alerting

### Key Performance Indicators (KPIs)

1. **Availability**: 99.9% uptime target
2. **Response Time**: < 200ms for API calls
3. **Error Rate**: < 0.1% for all requests
4. **Compliance**: 100% audit trail coverage
5. **Security**: Zero unauthorized access attempts

### Critical Alerts

- Database replication lag > 5 minutes
- API response time > 500ms
- Failed backup for > 24 hours
- Compliance violation detected
- Cross-region connectivity lost

## Troubleshooting Guide

### Common Issues and Solutions

1. **Pod Scheduling Issues**
   - Check node selectors and tolerations
   - Verify resource quotas and limits
   - Ensure compliance node labels are correct

2. **Database Connection Issues**
   - Verify secret synchronization
   - Check network policies
   - Confirm SSL/TLS certificate validity

3. **Scaling Issues**
   - Check HPA/VPA configuration
   - Verify custom metrics availability
   - Ensure resource quotas allow scaling

4. **Compliance Violations**
   - Review audit logs for unauthorized access
   - Check data residency enforcement
   - Verify encryption status

## Deployment Rollback Procedures

In case of deployment issues, follow these rollback procedures:

1. **Application Rollback**
   ```bash
   kubectl rollout undo deployment/business-ops-api -n business-ops
   kubectl rollout status deployment/business-ops-api -n business-ops
   ```

2. **Database Rollback**
   ```bash
   # Restore from latest backup
   kubectl exec -it business-ops-database-0 -n business-ops -- \
     pg_restore -d business_ops /backups/latest-backup.sql
   ```

3. **Configuration Rollback**
   ```bash
   # Restore previous ConfigMap version
   kubectl apply -f previous-config.yaml
   kubectl rollout restart deployment/business-ops-api -n business-ops
   ```

This documentation ensures comprehensive verification and ongoing health monitoring of the Business Operations deployment, maintaining high availability and compliance standards.
