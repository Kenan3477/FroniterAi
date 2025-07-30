# Frontier Production Infrastructure Deployment Guide

## 🚀 Complete Enterprise Deployment

This guide provides step-by-step instructions for deploying the Frontier financial analysis platform to production infrastructure with enterprise-grade features including auto-scaling, monitoring, blue-green deployment, and disaster recovery.

## 📋 Prerequisites

### Required Tools
- **Terraform** (>= 1.0)
- **kubectl** (>= 1.24)
- **AWS CLI** (>= 2.0)
- **Helm** (>= 3.0)
- **Docker** (>= 20.0)

### AWS Account Setup
- AWS Account with appropriate permissions
- IAM user with administrative access
- AWS CLI configured with credentials

### Domain & SSL (Optional)
- Domain name for production access
- SSL certificate (can be managed by AWS Certificate Manager)

## 🛠️ Installation Steps

### 1. Install Required Tools

#### On Ubuntu/Debian:
```bash
# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm
```

#### On macOS:
```bash
# Install using Homebrew
brew install terraform kubectl awscli helm
```

#### On Windows:
```powershell
# Install using Chocolatey
choco install terraform kubernetes-cli awscli kubernetes-helm
```

### 2. Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Verify configuration
aws sts get-caller-identity
```

### 3. Clone and Setup Project

```bash
# Clone repository
git clone https://github.com/your-org/frontier.git
cd frontier

# Make scripts executable
chmod +x scripts/*.sh
```

## 🚀 Deployment Process

### Option 1: Automated Deployment (Recommended)

```bash
# Full production deployment
./scripts/deploy-production.sh

# With custom parameters
./scripts/deploy-production.sh \
  --environment production \
  --region us-west-2 \
  --cluster frontier-prod-cluster

# Dry run (preview changes)
./scripts/deploy-production.sh --dry-run
```

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Deploy Infrastructure with Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=production" -var="region=us-west-2"

# Apply infrastructure
terraform apply
```

#### Step 2: Configure Kubernetes

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name frontier-prod-cluster

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

#### Step 3: Create Namespaces

```bash
kubectl create namespace production
kubectl create namespace staging
kubectl create namespace monitoring
```

#### Step 4: Deploy Monitoring Stack

```bash
# Deploy Prometheus, Grafana, and AlertManager
kubectl apply -f k8s/monitoring/ -n monitoring

# Wait for deployments
kubectl rollout status deployment/prometheus -n monitoring
kubectl rollout status deployment/grafana -n monitoring
kubectl rollout status deployment/alertmanager -n monitoring
```

#### Step 5: Deploy Application

```bash
# Deploy Redis cache
kubectl apply -f k8s/redis.yaml -n production

# Deploy main application
kubectl apply -f k8s/deployment.yaml -n production

# Deploy AI processor
kubectl apply -f k8s/ai-deployment.yaml -n production

# Setup blue-green deployment
kubectl apply -f k8s/blue-green-deployment.yaml -n production
```

## 🔄 CI/CD Pipeline Setup

### GitHub Actions Setup

1. **Add Repository Secrets:**
   ```
   AWS_ACCESS_KEY_ID: Your AWS access key
   AWS_SECRET_ACCESS_KEY: Your AWS secret key
   SLACK_WEBHOOK_URL: Slack webhook for notifications
   ```

2. **Enable GitHub Actions:**
   - Push code to trigger automatic deployment
   - Monitor deployment progress in Actions tab

### Pipeline Stages

1. **Code Quality & Security**
   - Linting and formatting checks
   - Security vulnerability scanning
   - Unit and integration tests

2. **Build & Push**
   - Docker image building
   - Multi-architecture support
   - Security scanning of images

3. **Deploy to Staging**
   - Automated staging deployment
   - Smoke tests and validation

4. **Deploy to Production**
   - Blue-green deployment strategy
   - Health checks and monitoring
   - Automatic rollback on failure

## 📊 Monitoring & Observability

### Access Monitoring Tools

```bash
# Get Grafana URL
kubectl get service grafana -n monitoring

# Get Grafana admin password
kubectl get secret grafana-secret -n monitoring -o jsonpath='{.data.admin-password}' | base64 -d

# Port forward for local access
kubectl port-forward service/grafana 3000:80 -n monitoring
```

### Key Dashboards

1. **Frontier API Metrics**
   - Request rates and response times
   - Error rates and success rates
   - Resource utilization

2. **Infrastructure Overview**
   - Cluster health and node status
   - Resource usage across nodes
   - Network and storage metrics

3. **Application Performance**
   - Database performance
   - Cache hit rates
   - AI processing metrics

### Alerting Configuration

Alerts are automatically configured for:
- High error rates (>5%)
- Slow response times (>500ms)
- Resource exhaustion
- Service unavailability
- Security incidents

## 🔄 Blue-Green Deployment

### Deploy New Version

```bash
# Deploy new image with blue-green strategy
./scripts/blue-green-deploy.sh deploy ghcr.io/frontier/api:v1.2.3

# Check deployment status
./scripts/blue-green-deploy.sh status

# Manual rollback if needed
./scripts/blue-green-deploy.sh rollback
```

### Deployment Process

1. **New Version Deployment**
   - Deploy to inactive color (blue/green)
   - Run health checks and validation
   - Keep current version serving traffic

2. **Traffic Switch**
   - Switch load balancer to new version
   - Monitor metrics and health
   - Immediate rollback if issues detected

3. **Cleanup**
   - Scale down old version after validation
   - Clean up resources

## 🔒 Security Configuration

### Network Security

- **VPC Isolation**: Private subnets for application tier
- **Security Groups**: Restrictive ingress/egress rules
- **Network Policies**: Pod-to-pod communication control

### Application Security

- **Secrets Management**: Kubernetes secrets for sensitive data
- **RBAC**: Role-based access control
- **Pod Security**: Non-root containers, read-only filesystems

### Data Security

- **Encryption at Rest**: Database and storage encryption
- **Encryption in Transit**: TLS for all communications
- **Backup Encryption**: Encrypted backups in S3

## 🔄 Backup & Disaster Recovery

### Automated Backups

Backups run automatically every 4 hours:
- **Database**: PostgreSQL dumps with point-in-time recovery
- **Application Data**: Persistent volume snapshots
- **Configuration**: Kubernetes manifests and secrets

### Disaster Recovery Testing

```bash
# Run DR drill
./disaster-recovery/automated-dr-test.sh

# Manual database restore
./scripts/restore-database.sh 20241201

# Cluster failover simulation
./disaster-recovery/test-cluster-failover.sh
```

## 🎯 Scaling & Performance

### Auto-scaling Configuration

- **Horizontal Pod Autoscaler**: 3-20 replicas based on CPU/memory
- **Vertical Pod Autoscaler**: Automatic resource recommendations
- **Cluster Autoscaler**: Node scaling based on pod demands

### Performance Optimization

- **Multi-layer Caching**: Redis + in-memory + disk caching
- **Database Optimization**: Connection pooling, query optimization
- **CDN Integration**: Global content delivery
- **AI Request Batching**: Efficient model processing

## 🔍 Troubleshooting

### Common Issues

#### Deployment Failures
```bash
# Check pod status
kubectl get pods -n production

# View pod logs
kubectl logs -f deployment/frontier-api -n production

# Describe problematic pods
kubectl describe pod <pod-name> -n production
```

#### Network Issues
```bash
# Check service endpoints
kubectl get endpoints -n production

# Test internal connectivity
kubectl run test-pod --image=busybox --rm -it -- nslookup frontier-api-service.production.svc.cluster.local
```

#### Performance Issues
```bash
# Check resource usage
kubectl top pods -n production
kubectl top nodes

# View HPA status
kubectl get hpa -n production
```

### Health Checks

```bash
# API health check
curl -f http://<load-balancer-url>/health

# Database connectivity
kubectl exec deployment/frontier-api -n production -- python -c "import psycopg2; print('DB OK')"

# Redis connectivity
kubectl exec deployment/frontier-api -n production -- python -c "import redis; print('Redis OK')"
```

## 📚 Additional Resources

### Documentation
- [Production Optimization Guide](PRODUCTION_OPTIMIZATION.md)
- [Disaster Recovery Procedures](disaster-recovery/README.md)
- [API Documentation](docs/api/README.md)

### Monitoring URLs
- **Grafana**: http://grafana.frontier.com
- **Prometheus**: http://prometheus.frontier.com
- **AlertManager**: http://alerts.frontier.com

### Support Contacts
- **Operations Team**: ops-team@frontier.com
- **Development Team**: dev-team@frontier.com
- **24/7 Support**: support@frontier.com

---

## 🎉 Deployment Complete!

Your Frontier production infrastructure is now deployed with:

✅ **Enterprise-grade Infrastructure**
- Auto-scaling Kubernetes cluster
- High-availability database
- Redis cache cluster
- Load balancers with SSL

✅ **Comprehensive Monitoring**
- Prometheus metrics collection
- Grafana dashboards
- AlertManager notifications
- 24/7 health monitoring

✅ **Production Optimizations**
- Multi-layer caching system
- Database query optimization
- AI request batching
- CDN integration

✅ **DevOps Automation**
- Blue-green deployment pipeline
- Automated testing and validation
- CI/CD with GitHub Actions
- Automated backup system

✅ **Disaster Recovery**
- Multi-region backup strategy
- Automated recovery procedures
- Infrastructure as code
- Regular DR testing

Your system is now ready to handle production workloads with enterprise-level reliability, performance, and security! 🚀
