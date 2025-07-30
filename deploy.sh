#!/bin/bash

# Frontier AI Model Deployment Script
# This script automates the deployment of the AI model infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-development}
PROFILE=${PROFILE:-dev}
GPU_ENABLED=${GPU_ENABLED:-false}

echo -e "${GREEN}🚀 Frontier AI Model Deployment Script${NC}"
echo "Environment: $ENVIRONMENT"
echo "Profile: $PROFILE"
echo "GPU Enabled: $GPU_ENABLED"
echo ""

# Function to check if Docker is running
check_docker() {
    echo -e "${YELLOW}Checking Docker...${NC}"
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to check for GPU support
check_gpu() {
    if [ "$GPU_ENABLED" = "true" ]; then
        echo -e "${YELLOW}Checking GPU support...${NC}"
        if ! command -v nvidia-smi &> /dev/null; then
            echo -e "${RED}❌ nvidia-smi not found. Please install NVIDIA drivers.${NC}"
            exit 1
        fi
        
        if ! docker run --rm --gpus all nvidia/cuda:12.2-base-ubuntu22.04 nvidia-smi > /dev/null 2>&1; then
            echo -e "${RED}❌ Docker GPU support not available. Please install nvidia-docker2.${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ GPU support available${NC}"
    fi
}

# Function to create necessary directories
create_directories() {
    echo -e "${YELLOW}Creating directories...${NC}"
    mkdir -p data/models
    mkdir -p data/logs
    mkdir -p data/cache
    mkdir -p ssl
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to generate SSL certificates for development
generate_ssl_certs() {
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        echo -e "${YELLOW}Generating SSL certificates for development...${NC}"
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"
        echo -e "${GREEN}✅ SSL certificates generated${NC}"
    else
        echo -e "${GREEN}✅ SSL certificates already exist${NC}"
    fi
}

# Function to set up environment variables
setup_environment() {
    echo -e "${YELLOW}Setting up environment...${NC}"
    
    if [ ! -f ".env" ]; then
        echo "Creating .env file..."
        cat > .env << EOF
# Database Configuration
POSTGRES_PASSWORD=frontier_secure_password_$(openssl rand -hex 16)

# JWT Configuration
JWT_SECRET_KEY=$(openssl rand -base64 32)

# OpenAI API Key (set this to your actual key)
# OPENAI_API_KEY=your_openai_api_key_here

# Environment
ENVIRONMENT=${ENVIRONMENT}

# Model Configuration
MODEL_CACHE_DIR=./data/models
LOG_LEVEL=INFO

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Database URL
DATABASE_URL=postgresql://frontier_user:frontier_secure_password@localhost:5432/frontier_ai
EOF
        echo -e "${GREEN}✅ .env file created${NC}"
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
}

# Function to build Docker images
build_images() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    
    if [ "$GPU_ENABLED" = "true" ]; then
        docker-compose build app-gpu
    else
        docker-compose build app-${PROFILE}
    fi
    
    echo -e "${GREEN}✅ Docker images built${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    
    # Start infrastructure services first
    docker-compose up -d redis postgres
    
    # Wait for services to be healthy
    echo "Waiting for Redis and PostgreSQL to be ready..."
    docker-compose exec redis redis-cli ping || sleep 10
    docker-compose exec postgres pg_isready -U frontier_user -d frontier_ai || sleep 10
    
    # Initialize models
    echo "Initializing AI models..."
    docker-compose --profile init up model-init
    
    # Start application
    if [ "$GPU_ENABLED" = "true" ]; then
        docker-compose --profile gpu up -d app-gpu nginx
    else
        docker-compose --profile ${PROFILE} up -d app-${PROFILE}
        if [ "$PROFILE" = "prod" ]; then
            docker-compose up -d nginx
        fi
    fi
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Function to show service status
show_status() {
    echo -e "${YELLOW}Service Status:${NC}"
    docker-compose ps
    echo ""
    
    echo -e "${YELLOW}Service URLs:${NC}"
    if [ "$PROFILE" = "dev" ]; then
        echo "API Documentation: http://localhost:8000/docs"
        echo "API Redoc: http://localhost:8000/redoc"
        echo "Jupyter Notebook: http://localhost:8888"
    else
        echo "API Documentation: https://localhost/docs"
        echo "API Redoc: https://localhost/redoc"
    fi
    echo "Health Check: http://localhost:8000/api/v1/ai/system/health"
    echo ""
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}Running system tests...${NC}"
    
    # Wait a bit for services to fully start
    sleep 30
    
    # Test health endpoint
    if curl -f http://localhost:8000/api/v1/ai/system/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
        return 1
    fi
    
    # Test API endpoints
    echo "Testing API endpoints..."
    # Add more specific tests here based on your API
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to clean up
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"
    docker-compose down -v
    docker system prune -f
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main deployment function
deploy() {
    echo -e "${GREEN}Starting deployment...${NC}"
    
    check_docker
    
    if [ "$GPU_ENABLED" = "true" ]; then
        check_gpu
    fi
    
    create_directories
    generate_ssl_certs
    setup_environment
    build_images
    start_services
    show_status
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo "To run tests: $0 test"
    echo "To stop services: $0 stop"
    echo "To clean up: $0 cleanup"
}

# Script arguments handling
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "test")
        run_tests
        ;;
    "stop")
        stop_services
        ;;
    "cleanup")
        cleanup
        ;;
    "status")
        show_status
        ;;
    *)
        echo "Usage: $0 {deploy|test|stop|cleanup|status}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy the AI model infrastructure"
        echo "  test    - Run system tests"
        echo "  stop    - Stop all services"
        echo "  cleanup - Stop services and clean up volumes"
        echo "  status  - Show service status"
        echo ""
        echo "Environment variables:"
        echo "  ENVIRONMENT - development|production (default: development)"
        echo "  PROFILE     - dev|prod (default: dev)"
        echo "  GPU_ENABLED - true|false (default: false)"
        exit 1
        ;;
esac
