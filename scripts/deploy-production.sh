#!/bin/bash

# Frontier Production Infrastructure Deployment Script
# Complete deployment orchestration for cloud infrastructure

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"
K8S_DIR="$PROJECT_ROOT/k8s"

# Default values
ENVIRONMENT="production"
REGION="us-west-2"
CLUSTER_NAME="frontier-prod-cluster"
DRY_RUN=false
FORCE_APPLY=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws")
    fi
    
    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install the missing tools and try again"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check Terraform version
    local tf_version=$(terraform version -json | jq -r '.terraform_version')
    log_info "Using Terraform version: $tf_version"
    
    # Check kubectl version
    local kubectl_version=$(kubectl version --client -o json | jq -r '.clientVersion.gitVersion')
    log_info "Using kubectl version: $kubectl_version"
    
    log_info "Prerequisites check passed ✅"
}

# Function to deploy Terraform infrastructure
deploy_terraform() {
    log_header "Deploying Terraform infrastructure..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init -upgrade
    
    # Validate configuration
    log_info "Validating Terraform configuration..."
    terraform validate
    
    # Plan deployment
    log_info "Creating Terraform plan..."
    terraform plan -out=tfplan -var="environment=$ENVIRONMENT" -var="region=$REGION"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Dry run mode - skipping Terraform apply"
        return 0
    fi
    
    # Apply infrastructure
    if [[ "$FORCE_APPLY" == "true" ]]; then
        log_warn "Force apply mode - applying without confirmation"
        terraform apply -auto-approve tfplan
    else
        log_info "Applying Terraform plan..."
        terraform apply tfplan
    fi
    
    # Output important values
    log_info "Infrastructure deployment completed ✅"
    log_info "Cluster endpoint: $(terraform output -raw cluster_endpoint)"
    log_info "Load balancer DNS: $(terraform output -raw load_balancer_dns)"
    
    cd "$PROJECT_ROOT"
}

# Function to configure kubectl
configure_kubectl() {
    log_header "Configuring kubectl..."
    
    # Update kubeconfig
    log_info "Updating kubeconfig for cluster: $CLUSTER_NAME"
    aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"
    
    # Verify cluster access
    log_info "Verifying cluster access..."
    kubectl cluster-info
    
    # Check nodes
    log_info "Checking cluster nodes..."
    kubectl get nodes -o wide
    
    log_info "kubectl configuration completed ✅"
}

# Function to create namespaces
create_namespaces() {
    log_header "Creating Kubernetes namespaces..."
    
    local namespaces=("production" "staging" "monitoring")
    
    for namespace in "${namespaces[@]}"; do
        log_info "Creating namespace: $namespace"
        kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
        
        # Label namespace
        kubectl label namespace "$namespace" name="$namespace" --overwrite
    done
    
    log_info "Namespaces created ✅"
}

# Function to deploy monitoring stack
deploy_monitoring() {
    log_header "Deploying monitoring stack..."
    
    # Deploy monitoring namespace resources
    kubectl apply -f "$K8S_DIR/monitoring/" -n monitoring
    
    # Wait for Prometheus to be ready
    log_info "Waiting for Prometheus to be ready..."
    kubectl rollout status deployment/prometheus -n monitoring --timeout=300s
    
    # Wait for Grafana to be ready
    log_info "Waiting for Grafana to be ready..."
    kubectl rollout status deployment/grafana -n monitoring --timeout=300s
    
    # Wait for AlertManager to be ready
    log_info "Waiting for AlertManager to be ready..."
    kubectl rollout status deployment/alertmanager -n monitoring --timeout=300s
    
    log_info "Monitoring stack deployed ✅"
}

# Function to deploy application
deploy_application() {
    log_header "Deploying Frontier application..."
    
    # Create secrets (if they don't exist)
    create_secrets
    
    # Deploy Redis cache
    log_info "Deploying Redis cache..."
    kubectl apply -f "$K8S_DIR/redis.yaml" -n production
    
    # Wait for Redis to be ready
    kubectl rollout status statefulset/redis-cluster -n production --timeout=300s
    
    # Deploy main application
    log_info "Deploying main application..."
    kubectl apply -f "$K8S_DIR/deployment.yaml" -n production
    
    # Deploy AI processor
    log_info "Deploying AI processor..."
    kubectl apply -f "$K8S_DIR/ai-deployment.yaml" -n production
    
    # Wait for deployments to be ready
    kubectl rollout status deployment/frontier-api -n production --timeout=600s
    kubectl rollout status deployment/frontier-ai-processor -n production --timeout=600s
    
    log_info "Application deployed ✅"
}

# Function to create secrets
create_secrets() {
    log_info "Creating application secrets..."
    
    # Check if secrets already exist
    if kubectl get secret frontier-secrets -n production &> /dev/null; then
        log_info "Secrets already exist, skipping creation"
        return 0
    fi
    
    # Get database connection info from Terraform outputs
    cd "$TERRAFORM_DIR"
    local db_endpoint=$(terraform output -raw db_endpoint)
    local db_password=$(terraform output -raw db_password)
    local redis_endpoint=$(terraform output -raw redis_endpoint)
    local redis_auth=$(terraform output -raw redis_auth_token)
    cd "$PROJECT_ROOT"
    
    # Create database URL
    local database_url="postgresql://frontier_admin:${db_password}@${db_endpoint}:5432/frontier"
    local redis_url="redis://:${redis_auth}@${redis_endpoint}:6379/0"
    
    # Generate secret key
    local secret_key=$(openssl rand -base64 32)
    
    # Create secret
    kubectl create secret generic frontier-secrets \
        --from-literal=database-url="$database_url" \
        --from-literal=redis-url="$redis_url" \
        --from-literal=secret-key="$secret_key" \
        -n production
    
    log_info "Secrets created ✅"
}

# Function to setup blue-green deployment
setup_blue_green() {
    log_header "Setting up blue-green deployment..."
    
    # Deploy blue-green configuration
    kubectl apply -f "$K8S_DIR/blue-green-deployment.yaml" -n production
    
    # Make deploy script executable
    chmod +x "$PROJECT_ROOT/scripts/blue-green-deploy.sh"
    
    log_info "Blue-green deployment setup completed ✅"
}

# Function to run health checks
run_health_checks() {
    log_header "Running health checks..."
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check API health
    local api_endpoint=$(kubectl get service frontier-api-service -n production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [[ -n "$api_endpoint" ]]; then
        log_info "API endpoint: http://$api_endpoint"
        
        # Wait for load balancer to be ready
        log_info "Waiting for load balancer to be ready..."
        sleep 60
        
        # Health check with retry
        local max_retries=10
        local retry_count=0
        
        while [[ $retry_count -lt $max_retries ]]; do
            if curl -f -s "http://$api_endpoint/health" > /dev/null; then
                log_info "API health check passed ✅"
                break
            else
                log_warn "API health check failed, retrying... ($((retry_count + 1))/$max_retries)"
                sleep 30
                ((retry_count++))
            fi
        done
        
        if [[ $retry_count -eq $max_retries ]]; then
            log_error "API health check failed after $max_retries attempts"
            return 1
        fi
    else
        log_warn "Load balancer endpoint not yet available"
    fi
    
    # Check monitoring
    local grafana_endpoint=$(kubectl get service grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    if [[ -n "$grafana_endpoint" ]]; then
        log_info "Grafana endpoint: http://$grafana_endpoint"
    fi
    
    log_info "Health checks completed ✅"
}

# Function to setup backup system
setup_backup_system() {
    log_header "Setting up backup system..."
    
    # Make backup script executable
    chmod +x "$PROJECT_ROOT/scripts/automated-backup.sh"
    
    # Create backup configuration
    cat > /tmp/backup-cronjob.yaml << EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: frontier-backup
  namespace: production
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - /bin/bash
            - -c
            - |
              # Install required tools
              yum update -y
              yum install -y postgresql-client gzip tar kubectl
              
              # Run backup script
              /scripts/automated-backup.sh
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backup-config
              mountPath: /etc/frontier
            env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: frontier-secrets
                  key: db-password
          volumes:
          - name: backup-scripts
            configMap:
              name: backup-scripts
              defaultMode: 0755
          - name: backup-config
            secret:
              name: backup-config
          restartPolicy: OnFailure
EOF
    
    # Create backup scripts configmap
    kubectl create configmap backup-scripts \
        --from-file="$PROJECT_ROOT/scripts/automated-backup.sh" \
        -n production --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply backup cronjob
    kubectl apply -f /tmp/backup-cronjob.yaml
    
    log_info "Backup system setup completed ✅"
}

# Function to display deployment summary
display_summary() {
    log_header "Deployment Summary"
    
    echo
    echo "🎉 Frontier Production Infrastructure Deployment Completed!"
    echo
    echo "📊 Infrastructure Components:"
    echo "  • EKS Cluster: $CLUSTER_NAME"
    echo "  • Region: $REGION"
    echo "  • Environment: $ENVIRONMENT"
    echo
    echo "🚀 Deployed Services:"
    echo "  • Frontier API (with auto-scaling)"
    echo "  • AI Processing Service"
    echo "  • Redis Cache Cluster"
    echo "  • PostgreSQL Database (RDS)"
    echo "  • Prometheus Monitoring"
    echo "  • Grafana Dashboards"
    echo "  • AlertManager"
    echo
    echo "🔄 Automation Features:"
    echo "  • Blue-Green Deployment Pipeline"
    echo "  • Auto-scaling (2-20 instances)"
    echo "  • Automated Backups (every 4 hours)"
    echo "  • Health Monitoring & Alerting"
    echo "  • Disaster Recovery Procedures"
    echo
    echo "🔗 Access Points:"
    local api_endpoint=$(kubectl get service frontier-api-service -n production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")
    local grafana_endpoint=$(kubectl get service grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "Pending...")
    
    echo "  • API: http://$api_endpoint"
    echo "  • Grafana: http://$grafana_endpoint"
    echo "  • Documentation: http://$api_endpoint/docs"
    echo
    echo "🛠️  Management Commands:"
    echo "  • Deploy new version: ./scripts/blue-green-deploy.sh deploy <image>"
    echo "  • Check status: ./scripts/blue-green-deploy.sh status"
    echo "  • View logs: kubectl logs -f deployment/frontier-api -n production"
    echo "  • Scale up: kubectl scale deployment frontier-api --replicas=5 -n production"
    echo
    echo "📚 Documentation:"
    echo "  • Production Optimization: PRODUCTION_OPTIMIZATION.md"
    echo "  • Disaster Recovery: disaster-recovery/README.md"
    echo "  • Deployment Guide: infrastructure/DEPLOYMENT.md"
    echo
}

# Function to show help
show_help() {
    echo "Frontier Production Infrastructure Deployment Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -e, --environment ENVIRONMENT    Deployment environment (default: production)"
    echo "  -r, --region REGION             AWS region (default: us-west-2)"
    echo "  -c, --cluster CLUSTER_NAME      EKS cluster name (default: frontier-prod-cluster)"
    echo "  -d, --dry-run                   Perform dry run without applying changes"
    echo "  -f, --force                     Force apply without confirmation"
    echo "  -h, --help                      Show this help message"
    echo
    echo "Examples:"
    echo "  $0                              # Deploy to production with defaults"
    echo "  $0 --dry-run                    # Dry run deployment"
    echo "  $0 --environment staging        # Deploy to staging environment"
    echo "  $0 --region us-east-1           # Deploy to different region"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -c|--cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE_APPLY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main deployment function
main() {
    log_header "Frontier Production Infrastructure Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $REGION"
    log_info "Cluster: $CLUSTER_NAME"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Running in dry-run mode"
    fi
    
    echo
    
    # Execute deployment steps
    check_prerequisites
    deploy_terraform
    configure_kubectl
    create_namespaces
    deploy_monitoring
    deploy_application
    setup_blue_green
    setup_backup_system
    run_health_checks
    
    echo
    display_summary
    
    log_info "🎯 Deployment completed successfully!"
}

# Execute main function
main "$@"
