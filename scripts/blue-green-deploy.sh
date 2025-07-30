#!/bin/bash

# Blue-Green Deployment Script for Frontier Production
# Automated zero-downtime deployment with health checks and rollback capability

set -euo pipefail

# Configuration
NAMESPACE="production"
APP_NAME="frontier-api"
SERVICE_NAME="frontier-api-service"
HEALTH_CHECK_TIMEOUT=300
MONITORING_PERIOD=300

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

log_blue() {
    echo -e "${BLUE}[BLUE]${NC} $1"
}

# Function to get current active color
get_current_color() {
    kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo ""
}

# Function to get the inactive color
get_inactive_color() {
    local current_color=$(get_current_color)
    if [[ "$current_color" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to check deployment health
check_deployment_health() {
    local color=$1
    local deployment_name="${APP_NAME}-${color}"
    
    log_info "Checking health of $deployment_name deployment..."
    
    # Check if deployment exists
    if ! kubectl get deployment $deployment_name -n $NAMESPACE >/dev/null 2>&1; then
        log_error "Deployment $deployment_name does not exist"
        return 1
    fi
    
    # Wait for deployment to be ready
    if ! kubectl rollout status deployment/$deployment_name -n $NAMESPACE --timeout=${HEALTH_CHECK_TIMEOUT}s; then
        log_error "Deployment $deployment_name failed to become ready"
        return 1
    fi
    
    # Check if all replicas are ready
    local ready_replicas=$(kubectl get deployment $deployment_name -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment $deployment_name -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    
    if [[ "$ready_replicas" != "$desired_replicas" ]]; then
        log_error "Not all replicas are ready. Ready: $ready_replicas, Desired: $desired_replicas"
        return 1
    fi
    
    log_info "Deployment $deployment_name is healthy. Ready: $ready_replicas/$desired_replicas"
    return 0
}

# Function to run health checks
run_health_checks() {
    local color=$1
    local deployment_name="${APP_NAME}-${color}"
    
    log_info "Running health checks for $color deployment..."
    
    # Get a pod from the deployment
    local pod_name=$(kubectl get pods -n $NAMESPACE -l app=$APP_NAME,color=$color -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$pod_name" ]]; then
        log_error "No pods found for $color deployment"
        return 1
    fi
    
    # Port forward to test directly
    log_info "Setting up port forward to test $color deployment..."
    kubectl port-forward pod/$pod_name 8080:8000 -n $NAMESPACE &
    local pf_pid=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    # Run health checks
    local health_check_passed=true
    
    # Basic health check
    if ! curl -f -s http://localhost:8080/health >/dev/null; then
        log_error "Health check failed for $color deployment"
        health_check_passed=false
    else
        log_info "Health check passed for $color deployment"
    fi
    
    # API status check
    if ! curl -f -s http://localhost:8080/status >/dev/null; then
        log_error "Status check failed for $color deployment"
        health_check_passed=false
    else
        log_info "Status check passed for $color deployment"
    fi
    
    # Cleanup port forward
    kill $pf_pid 2>/dev/null || true
    
    if [[ "$health_check_passed" == "true" ]]; then
        log_info "All health checks passed for $color deployment"
        return 0
    else
        log_error "Health checks failed for $color deployment"
        return 1
    fi
}

# Function to switch traffic
switch_traffic() {
    local new_color=$1
    
    log_info "Switching traffic to $new_color deployment..."
    
    # Update service selector
    kubectl patch service $SERVICE_NAME -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"color\":\"$new_color\"}}}"
    
    log_info "Traffic switched to $new_color deployment"
}

# Function to monitor deployment
monitor_deployment() {
    local color=$1
    local monitoring_period=$MONITORING_PERIOD
    
    log_info "Monitoring $color deployment for $monitoring_period seconds..."
    
    local start_time=$(date +%s)
    while true; do
        local current_time=$(date +%s)
        local elapsed_time=$((current_time - start_time))
        
        if [[ $elapsed_time -ge $monitoring_period ]]; then
            break
        fi
        
        # Check deployment health
        if ! check_deployment_health $color; then
            log_error "Deployment health check failed during monitoring"
            return 1
        fi
        
        # Check service endpoints
        local endpoints=$(kubectl get endpoints $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.subsets[0].addresses[*].ip}' | wc -w)
        if [[ $endpoints -eq 0 ]]; then
            log_error "No service endpoints available"
            return 1
        fi
        
        log_info "Monitoring... Elapsed: ${elapsed_time}s, Endpoints: $endpoints"
        sleep 30
    done
    
    log_info "Monitoring completed successfully"
    return 0
}

# Function to cleanup old deployment
cleanup_old_deployment() {
    local old_color=$1
    local old_deployment="${APP_NAME}-${old_color}"
    
    log_info "Scaling down old $old_color deployment..."
    
    # Scale down to 0 replicas
    kubectl scale deployment $old_deployment --replicas=0 -n $NAMESPACE || true
    
    log_info "Old $old_color deployment scaled down"
}

# Function to rollback
rollback() {
    local current_color=$1
    local previous_color=$2
    
    log_warn "Rolling back from $current_color to $previous_color..."
    
    # Scale up previous deployment
    kubectl scale deployment "${APP_NAME}-${previous_color}" --replicas=3 -n $NAMESPACE
    
    # Wait for previous deployment to be ready
    if check_deployment_health $previous_color; then
        # Switch traffic back
        switch_traffic $previous_color
        log_info "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed - previous deployment is not healthy"
        return 1
    fi
}

# Main deployment function
deploy() {
    local new_image=$1
    
    if [[ -z "$new_image" ]]; then
        log_error "Usage: $0 deploy <image>"
        exit 1
    fi
    
    log_info "Starting blue-green deployment with image: $new_image"
    
    # Get current and target colors
    local current_color=$(get_current_color)
    local target_color=$(get_inactive_color)
    
    if [[ -z "$current_color" ]]; then
        log_warn "No current active deployment found, defaulting to blue"
        current_color="blue"
        target_color="green"
    fi
    
    log_info "Current active: $current_color, Target: $target_color"
    
    # Update target deployment with new image
    log_info "Updating $target_color deployment with new image..."
    kubectl set image deployment/${APP_NAME}-${target_color} ${APP_NAME}=$new_image -n $NAMESPACE
    
    # Scale up target deployment
    log_info "Scaling up $target_color deployment..."
    kubectl scale deployment ${APP_NAME}-${target_color} --replicas=3 -n $NAMESPACE
    
    # Check target deployment health
    if ! check_deployment_health $target_color; then
        log_error "Target deployment health check failed"
        cleanup_old_deployment $target_color
        exit 1
    fi
    
    # Run health checks on target deployment
    if ! run_health_checks $target_color; then
        log_error "Health checks failed for target deployment"
        cleanup_old_deployment $target_color
        exit 1
    fi
    
    # Switch traffic to target deployment
    switch_traffic $target_color
    
    # Monitor new deployment
    if ! monitor_deployment $target_color; then
        log_error "Monitoring failed - rolling back"
        rollback $target_color $current_color
        exit 1
    fi
    
    # Cleanup old deployment
    cleanup_old_deployment $current_color
    
    log_info "🚀 Blue-green deployment completed successfully!"
    log_info "Active deployment: $target_color"
    log_info "Image: $new_image"
}

# Function to show status
status() {
    local current_color=$(get_current_color)
    local inactive_color=$(get_inactive_color)
    
    echo
    log_info "=== Frontier Blue-Green Deployment Status ==="
    echo
    
    if [[ -n "$current_color" ]]; then
        log_info "Active deployment: $current_color"
        
        # Show active deployment details
        echo "Active ($current_color) deployment:"
        kubectl get deployment ${APP_NAME}-${current_color} -n $NAMESPACE -o wide
        echo
        
        # Show inactive deployment details
        echo "Inactive ($inactive_color) deployment:"
        kubectl get deployment ${APP_NAME}-${inactive_color} -n $NAMESPACE -o wide
        echo
        
        # Show service details
        echo "Service details:"
        kubectl get service $SERVICE_NAME -n $NAMESPACE -o wide
        echo
        
        # Show endpoints
        echo "Service endpoints:"
        kubectl get endpoints $SERVICE_NAME -n $NAMESPACE
        echo
    else
        log_warn "No active deployment found"
    fi
}

# Function to show help
help() {
    echo "Frontier Blue-Green Deployment Script"
    echo
    echo "Usage:"
    echo "  $0 deploy <image>    - Deploy new image using blue-green strategy"
    echo "  $0 status            - Show current deployment status"
    echo "  $0 rollback          - Rollback to previous version"
    echo "  $0 help              - Show this help message"
    echo
    echo "Examples:"
    echo "  $0 deploy ghcr.io/frontier/api:v1.2.3"
    echo "  $0 status"
    echo "  $0 rollback"
}

# Main script logic
case "${1:-help}" in
    deploy)
        deploy "${2:-}"
        ;;
    status)
        status
        ;;
    rollback)
        current_color=$(get_current_color)
        previous_color=$(get_inactive_color)
        rollback $current_color $previous_color
        ;;
    help)
        help
        ;;
    *)
        echo "Unknown command: ${1:-}"
        help
        exit 1
        ;;
esac
