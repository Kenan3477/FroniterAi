#!/bin/bash

# Production Infrastructure Verification Script
# Comprehensive validation of all deployment components

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
NAMESPACE="production"
MONITORING_NAMESPACE="monitoring"

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# Function to run a check
run_check() {
    local description="$1"
    local command="$2"
    
    ((TOTAL_CHECKS++))
    
    log_header "$description"
    
    if eval "$command" &>/dev/null; then
        echo "✅ PASS: $description"
        ((PASSED_CHECKS++))
        return 0
    else
        echo "❌ FAIL: $description"
        ((FAILED_CHECKS++))
        return 1
    fi
}

# Function to check file exists
check_file_exists() {
    local file="$1"
    local description="$2"
    
    run_check "$description" "test -f '$file'"
}

# Function to check directory exists
check_directory_exists() {
    local dir="$1"
    local description="$2"
    
    run_check "$description" "test -d '$dir'"
}

# Main verification function
main() {
    echo "🔍 Frontier Production Infrastructure Verification"
    echo "================================================"
    echo
    
    # Check project structure
    log_header "Verifying project structure..."
    check_file_exists "infrastructure/terraform/production.tf" "Terraform production configuration"
    check_file_exists "k8s/deployment.yaml" "Main application deployment"
    check_file_exists "k8s/blue-green-deployment.yaml" "Blue-green deployment configuration"
    check_directory_exists "k8s/monitoring" "Monitoring configurations directory"
    check_file_exists "scripts/deploy-production.sh" "Production deployment script"
    check_file_exists "scripts/blue-green-deploy.sh" "Blue-green deployment script"
    check_file_exists "scripts/automated-backup.sh" "Automated backup script"
    check_directory_exists "disaster-recovery" "Disaster recovery directory"
    
    echo
    
    # Check CI/CD pipeline
    log_header "Verifying CI/CD pipeline..."
    check_file_exists ".github/workflows/production-deployment.yml" "GitHub Actions production pipeline"
    
    echo
    
    # Check documentation
    log_header "Verifying documentation..."
    check_file_exists "PRODUCTION_DEPLOYMENT_GUIDE.md" "Production deployment guide"
    check_file_exists "PRODUCTION_OPTIMIZATION.md" "Production optimization guide"
    check_file_exists "disaster-recovery/README.md" "Disaster recovery documentation"
    
    echo
    
    # Check required tools (if available)
    log_header "Checking required tools..."
    run_check "Terraform installed" "command -v terraform"
    run_check "kubectl installed" "command -v kubectl"
    run_check "AWS CLI installed" "command -v aws"
    run_check "Helm installed" "command -v helm"
    run_check "Docker installed" "command -v docker"
    
    echo
    
    # Check Terraform configuration
    log_header "Validating Terraform configuration..."
    if command -v terraform &>/dev/null; then
        cd infrastructure/terraform
        run_check "Terraform configuration valid" "terraform validate"
        cd ../..
    else
        log_warn "Terraform not available, skipping validation"
    fi
    
    echo
    
    # Check Kubernetes configurations
    log_header "Validating Kubernetes configurations..."
    if command -v kubectl &>/dev/null; then
        run_check "Main deployment YAML valid" "kubectl apply --dry-run=client -f k8s/deployment.yaml"
        run_check "Blue-green deployment YAML valid" "kubectl apply --dry-run=client -f k8s/blue-green-deployment.yaml"
        run_check "Redis deployment YAML valid" "kubectl apply --dry-run=client -f k8s/redis.yaml"
        run_check "Monitoring configurations valid" "kubectl apply --dry-run=client -f k8s/monitoring/"
    else
        log_warn "kubectl not available, skipping Kubernetes validation"
    fi
    
    echo
    
    # Check script permissions
    log_header "Checking script permissions..."
    run_check "Deploy script executable" "test -x scripts/deploy-production.sh"
    run_check "Blue-green script executable" "test -x scripts/blue-green-deploy.sh"
    run_check "Backup script executable" "test -x scripts/automated-backup.sh"
    
    echo
    
    # Check configuration completeness
    log_header "Checking configuration completeness..."
    
    # Check if Terraform has all required components
    if grep -q "module \"vpc\"" infrastructure/terraform/production.tf; then
        echo "✅ PASS: VPC configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: VPC configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if grep -q "module \"eks\"" infrastructure/terraform/production.tf; then
        echo "✅ PASS: EKS configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: EKS configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if grep -q "aws_db_instance" infrastructure/terraform/production.tf; then
        echo "✅ PASS: RDS configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: RDS configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if grep -q "aws_elasticache_replication_group" infrastructure/terraform/production.tf; then
        echo "✅ PASS: ElastiCache configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: ElastiCache configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    
    # Check monitoring configuration
    log_header "Checking monitoring configuration..."
    
    if grep -q "prometheus" k8s/monitoring/prometheus.yaml; then
        echo "✅ PASS: Prometheus configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: Prometheus configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if grep -q "grafana" k8s/monitoring/grafana.yaml; then
        echo "✅ PASS: Grafana configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: Grafana configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if grep -q "alertmanager" k8s/monitoring/alertmanager.yaml; then
        echo "✅ PASS: AlertManager configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: AlertManager configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    
    # Check blue-green deployment
    log_header "Checking blue-green deployment configuration..."
    
    if grep -q "color: blue" k8s/blue-green-deployment.yaml; then
        echo "✅ PASS: Blue deployment configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: Blue deployment configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if grep -q "color: green" k8s/blue-green-deployment.yaml; then
        echo "✅ PASS: Green deployment configuration present"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: Green deployment configuration missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    
    # Check security configurations
    log_header "Checking security configurations..."
    
    if grep -q "NetworkPolicy" k8s/deployment.yaml; then
        echo "✅ PASS: Network policies configured"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: Network policies missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    if grep -q "securityContext" k8s/deployment.yaml; then
        echo "✅ PASS: Security contexts configured"
        ((PASSED_CHECKS++))
    else
        echo "❌ FAIL: Security contexts missing"
        ((FAILED_CHECKS++))
    fi
    ((TOTAL_CHECKS++))
    
    echo
    
    # Final summary
    echo "📊 VERIFICATION SUMMARY"
    echo "======================"
    echo "Total checks: $TOTAL_CHECKS"
    echo "Passed: $PASSED_CHECKS"
    echo "Failed: $FAILED_CHECKS"
    echo
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    if [[ $success_rate -ge 95 ]]; then
        echo -e "${GREEN}🎉 EXCELLENT! Your production infrastructure is ready for deployment.${NC}"
        echo -e "${GREEN}Success rate: $success_rate%${NC}"
        echo
        echo "Next steps:"
        echo "1. Run: ./scripts/deploy-production.sh"
        echo "2. Monitor: Access Grafana dashboard after deployment"
        echo "3. Test: Run blue-green deployment with new version"
    elif [[ $success_rate -ge 80 ]]; then
        echo -e "${YELLOW}⚠️  GOOD! Most components are ready, but some issues need attention.${NC}"
        echo -e "${YELLOW}Success rate: $success_rate%${NC}"
        echo
        echo "Please fix the failed checks before deployment."
    else
        echo -e "${RED}❌ ISSUES DETECTED! Several components need attention before deployment.${NC}"
        echo -e "${RED}Success rate: $success_rate%${NC}"
        echo
        echo "Please address all failed checks before proceeding."
        exit 1
    fi
    
    echo
    echo "📚 Documentation:"
    echo "• Deployment Guide: PRODUCTION_DEPLOYMENT_GUIDE.md"
    echo "• Optimization Guide: PRODUCTION_OPTIMIZATION.md"
    echo "• Disaster Recovery: disaster-recovery/README.md"
    echo
    echo "🔧 Management Scripts:"
    echo "• Deploy: ./scripts/deploy-production.sh"
    echo "• Blue-Green: ./scripts/blue-green-deploy.sh"
    echo "• Backup: ./scripts/automated-backup.sh"
}

# Run verification
main "$@"
