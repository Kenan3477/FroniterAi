# Frontier Infrastructure Deployment Guide

This guide provides step-by-step instructions for deploying the Frontier cloud-native infrastructure.

## Prerequisites

### 1. Required Tools
```bash
# Install Terraform (>= 1.5.0)
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 2. AWS Configuration
```bash
# Configure AWS credentials
aws configure
# Or set environment variables:
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-west-2"
```

### 3. Create S3 Backend (One-time setup)
```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://frontier-terraform-state --region us-west-2

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket frontier-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-west-2
```

## Deployment Steps

### 1. Clone and Configure
```bash
# Navigate to infrastructure directory
cd infrastructure/terraform

# Copy example variables (create this file first)
cp terraform.tfvars.example terraform.tfvars

# Edit variables for your environment
nano terraform.tfvars
```

### 2. Environment-Specific Deployment

#### Development Environment
```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=dev" -out=dev.tfplan

# Apply deployment
terraform apply dev.tfplan
```

#### Staging Environment
```bash
# Plan staging deployment
terraform plan -var="environment=staging" -out=staging.tfplan

# Apply staging deployment
terraform apply staging.tfplan
```

#### Production Environment
```bash
# Plan production deployment
terraform plan -var="environment=prod" -out=prod.tfplan

# Apply production deployment
terraform apply prod.tfplan
```

### 3. Post-Deployment Configuration

#### Connect to EKS Cluster
```bash
# Update kubectl config
aws eks update-kubeconfig --region us-west-2 --name frontier-dev-cluster

# Verify connection
kubectl get nodes
kubectl get pods --all-namespaces
```

#### Access Monitoring Stack
```bash
# Get Grafana admin password
terraform output -raw grafana_admin_password

# Forward Grafana port (if not using ingress)
kubectl port-forward -n monitoring svc/prometheus-operator-grafana 3000:80

# Access Grafana at http://localhost:3000
# Username: admin
# Password: <from terraform output>
```

#### Deploy Applications
```bash
# Deploy Frontier application
kubectl apply -f ../kubernetes/environments/dev/

# Check deployment status
kubectl get deployments
kubectl get services
kubectl get ingress
```

## Configuration Reference

### Required Variables (terraform.tfvars)
```hcl
# Project Configuration
project_name = "frontier"
environment  = "dev"
cost_center  = "engineering"

# Network Configuration
vpc_cidr                = "10.0.0.0/16"
public_subnet_cidrs     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs    = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
database_subnet_cidrs   = ["10.0.100.0/24", "10.0.110.0/24", "10.0.120.0/24"]

# EKS Configuration
kubernetes_version = "1.28"
ssh_key_name      = "frontier-key"

# Database Configuration
db_engine         = "postgres"
db_engine_version = "15.4"
db_instance_class = "db.t3.micro"
db_username       = "postgres"
db_name          = "frontier"

# Monitoring Configuration
enable_elk_stack           = true
enable_distributed_tracing = true
grafana_domain            = "grafana.frontier.example.com"
kibana_domain             = "kibana.frontier.example.com"
jaeger_domain             = "jaeger.frontier.example.com"

# Alert Configuration
alert_email_addresses = ["admin@frontier.example.com"]
```

### Optional Variables
```hcl
# Cost Optimization
use_spot_instances = true  # For non-prod environments

# GPU Configuration
gpu_instance_size      = "medium"  # small, medium, large, xlarge
gpu_node_desired_size  = 1
gpu_node_max_size      = 5
gpu_node_min_size      = 0

# Security
enable_flow_logs = true
enable_vpn_gateway = false

# SSL/TLS
enable_https_alb = true
certificate_arn  = "arn:aws:acm:us-west-2:123456789012:certificate/example"
ssl_policy       = "ELBSecurityPolicy-TLS-1-2-2017-01"
```

## Verification Steps

### 1. Infrastructure Health Check
```bash
# Check EKS cluster status
aws eks describe-cluster --name frontier-dev-cluster --region us-west-2

# Check node groups
aws eks describe-nodegroup --cluster-name frontier-dev-cluster --nodegroup-name general

# Check RDS instance
aws rds describe-db-instances --db-instance-identifier frontier-dev-db

# Check load balancer
aws elbv2 describe-load-balancers --names frontier-dev-alb
```

### 2. Kubernetes Health Check
```bash
# Check cluster info
kubectl cluster-info

# Check node status
kubectl get nodes -o wide

# Check system pods
kubectl get pods -n kube-system

# Check monitoring stack
kubectl get pods -n monitoring

# Check ingress controllers
kubectl get pods -n kube-system | grep aws-load-balancer
```

### 3. Application Health Check
```bash
# Check application deployments
kubectl get deployments --all-namespaces

# Check service endpoints
kubectl get svc --all-namespaces

# Check ingress configuration
kubectl get ingress --all-namespaces

# Test application endpoints
curl -k https://your-alb-dns-name/health
```

## Monitoring and Maintenance

### Access Monitoring Dashboards
1. **Grafana**: https://grafana.frontier.example.com
   - Username: admin
   - Password: `terraform output -raw grafana_admin_password`

2. **Kibana**: https://kibana.frontier.example.com
   - Elasticsearch logs and metrics

3. **Jaeger**: https://jaeger.frontier.example.com
   - Distributed tracing

4. **CloudWatch**: AWS Console > CloudWatch > Dashboards
   - AWS native monitoring

### Regular Maintenance Tasks
```bash
# Update EKS cluster
aws eks update-cluster-version --name frontier-dev-cluster --version 1.29

# Update node groups
aws eks update-nodegroup-version --cluster-name frontier-dev-cluster --nodegroup-name general

# Update Helm charts
helm repo update
helm upgrade prometheus-operator prometheus-community/kube-prometheus-stack -n monitoring

# Check for security updates
kubectl get nodes -o wide
aws ecr get-login-token --region us-west-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com
```

## Troubleshooting

### Common Issues

#### 1. EKS Nodes Not Joining
```bash
# Check node group status
aws eks describe-nodegroup --cluster-name frontier-dev-cluster --nodegroup-name general

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name eksctl-frontier-dev-cluster-nodegroup-general

# Check IAM roles
aws iam get-role --role-name frontier-dev-cluster-node-group-role
```

#### 2. Pod Scheduling Issues
```bash
# Check node capacity
kubectl describe nodes

# Check pod resources
kubectl describe pod <pod-name> -n <namespace>

# Check node selectors and taints
kubectl get nodes --show-labels
```

#### 3. Load Balancer Issues
```bash
# Check ALB controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check target group health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>

# Check security groups
aws ec2 describe-security-groups --group-ids <security-group-id>
```

#### 4. Database Connection Issues
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier frontier-dev-db

# Check security groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=*rds*"

# Test connection from pod
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql -h <rds-endpoint> -U postgres
```

## Security Best Practices

### 1. Network Security
- All subnets are properly segmented
- Database in private subnets only
- Security groups follow least privilege
- VPC Flow Logs enabled for monitoring

### 2. Encryption
- EKS cluster encryption at rest (KMS)
- RDS encryption at rest (KMS)
- S3 bucket encryption (KMS)
- Redis encryption at rest and in transit

### 3. Access Control
- IAM roles with minimal permissions
- RBAC configured for Kubernetes
- Service accounts for pod-level permissions
- Secrets managed via AWS Secrets Manager

### 4. Monitoring and Alerting
- CloudWatch monitoring for AWS resources
- Prometheus/Grafana for Kubernetes metrics
- ELK stack for centralized logging
- SNS alerts for critical issues

## Cost Optimization

### 1. Environment-Specific Sizing
- **Dev**: Minimal resources for development
- **Staging**: Medium resources for testing
- **Prod**: Auto-scaling based on demand

### 2. Spot Instances
- Use spot instances for development environments
- Mix of on-demand and spot for cost optimization

### 3. Resource Cleanup
```bash
# Clean up unused resources
kubectl delete pods --field-selector=status.phase=Succeeded
kubectl delete pods --field-selector=status.phase=Failed

# Check resource usage
kubectl top nodes
kubectl top pods --all-namespaces
```

### 4. Cost Monitoring
- AWS Cost Explorer for cost analysis
- CloudWatch billing alarms
- Resource tagging for cost allocation

## Disaster Recovery

### 1. Backup Strategy
- RDS automated backups (7-day retention)
- Point-in-time recovery enabled
- Cross-region backup replication for production

### 2. High Availability
- Multi-AZ deployment for production RDS
- EKS nodes across multiple AZs
- Application Load Balancer across AZs

### 3. Recovery Procedures
```bash
# RDS Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier frontier-prod-db \
  --target-db-instance-identifier frontier-prod-db-restored \
  --restore-time 2024-01-01T12:00:00Z

# EKS cluster recreation
terraform plan -replace="module.eks.aws_eks_cluster.main"
terraform apply
```

## Support and Documentation

### Additional Resources
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [EKS User Guide](https://docs.aws.amazon.com/eks/latest/userguide/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

### Getting Help
1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Check Kubernetes events: `kubectl get events --all-namespaces`
4. Contact the Frontier team for infrastructure-specific issues
