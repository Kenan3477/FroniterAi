# Frontier AI Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Frontier AI hybrid architecture across development, staging, and production environments.

## Prerequisites

### Required Tools
```bash
# Install required tools
kubectl >= 1.28
terraform >= 1.0
helm >= 3.0
docker >= 24.0
aws-cli >= 2.0
```

### AWS Credentials
```bash
# Configure AWS credentials
aws configure
# Or use IAM roles for production deployments
```

### Required Permissions
```yaml
required_aws_permissions:
  - ec2:*
  - eks:*
  - iam:*
  - s3:*
  - elasticache:*
  - rds:*
  - vpc:*
  - cloudformation:*
```

## Infrastructure Deployment

### 1. Deploy Base Infrastructure

```bash
# Clone the repository
git clone <repository-url>
cd Frontier/infrastructure/terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var="environment=production" -var="region=us-east-1"

# Deploy infrastructure
terraform apply -var="environment=production" -var="region=us-east-1"
```

### 2. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name frontier-ai-cluster

# Verify connection
kubectl get nodes
```

### 3. Install GPU Operators

```bash
# Add NVIDIA Helm repository
helm repo add nvidia https://nvidia.github.io/gpu-operator
helm repo update

# Install NVIDIA GPU Operator
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace \
  --set driver.enabled=true
```

## Application Deployment

### 1. Create Namespaces

```bash
# Create application namespaces
kubectl create namespace frontier-core
kubectl create namespace frontier-modules
kubectl create namespace frontier-multimodal
kubectl create namespace monitoring
```

### 2. Deploy Foundation Model

```yaml
# frontier-core/foundation-model-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontier-1-foundation
  namespace: frontier-core
spec:
  replicas: 8
  selector:
    matchLabels:
      app: frontier-1-foundation
  template:
    metadata:
      labels:
        app: frontier-1-foundation
    spec:
      nodeSelector:
        frontier.ai/workload-type: inference
      tolerations:
      - key: "gpu-inference"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
      containers:
      - name: frontier-1
        image: frontier-ai/foundation-model:v1.0.0
        resources:
          requests:
            nvidia.com/gpu: 8
            memory: "500Gi"
            cpu: "32"
          limits:
            nvidia.com/gpu: 8
            memory: "600Gi"
            cpu: "64"
        env:
        - name: MODEL_PATH
          value: "/models/frontier-1"
        - name: BATCH_SIZE
          value: "64"
        - name: MAX_SEQUENCE_LENGTH
          value: "131072"
        volumeMounts:
        - name: model-storage
          mountPath: /models
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: grpc
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: frontier-models-pvc
```

### 3. Deploy Specialized Modules

```bash
# Deploy business operations module
kubectl apply -f deployments/business-module.yaml

# Deploy web development module
kubectl apply -f deployments/web-dev-module.yaml

# Deploy marketing/creative module
kubectl apply -f deployments/marketing-module.yaml
```

### 4. Deploy Multimodal Components

```bash
# Deploy vision processing
kubectl apply -f deployments/vision-processor.yaml

# Deploy audio processing
kubectl apply -f deployments/audio-processor.yaml

# Deploy video processing
kubectl apply -f deployments/video-processor.yaml
```

## Service Configuration

### 1. API Gateway Setup

```yaml
# api-gateway/gateway-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontier-api-gateway
  namespace: frontier-core
spec:
  replicas: 6
  selector:
    matchLabels:
      app: frontier-api-gateway
  template:
    metadata:
      labels:
        app: frontier-api-gateway
    spec:
      containers:
      - name: api-gateway
        image: frontier-ai/api-gateway:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: FOUNDATION_MODEL_ENDPOINT
          value: "http://frontier-1-foundation:8080"
        - name: BUSINESS_MODULE_ENDPOINT
          value: "http://frontier-biz:8080"
        - name: DEV_MODULE_ENDPOINT
          value: "http://frontier-dev:8080"
        - name: CREATIVE_MODULE_ENDPOINT
          value: "http://frontier-creative:8080"
        - name: REDIS_ENDPOINT
          valueFrom:
            secretKeyRef:
              name: redis-config
              key: endpoint
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
```

### 2. Load Balancer Configuration

```yaml
# Load balancer service
apiVersion: v1
kind: Service
metadata:
  name: frontier-api-service
  namespace: frontier-core
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  - port: 443
    targetPort: 8080
    protocol: TCP
  selector:
    app: frontier-api-gateway
```

## Monitoring and Observability

### 1. Deploy Prometheus Stack

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values monitoring/prometheus-values.yaml
```

### 2. Deploy Grafana Dashboards

```bash
# Apply custom Grafana dashboards
kubectl apply -f monitoring/grafana-dashboards/
```

### 3. Configure Log Aggregation

```bash
# Deploy Fluentd for log collection
kubectl apply -f monitoring/logging/fluentd-daemonset.yaml

# Deploy Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace monitoring \
  --values monitoring/elasticsearch-values.yaml

# Deploy Kibana
helm install kibana elastic/kibana \
  --namespace monitoring \
  --values monitoring/kibana-values.yaml
```

## Security Configuration

### 1. Network Policies

```yaml
# Network policy for inter-service communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontier-network-policy
  namespace: frontier-core
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: frontier-core
    - namespaceSelector:
        matchLabels:
          name: frontier-modules
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: frontier-core
    - namespaceSelector:
        matchLabels:
          name: frontier-modules
```

### 2. Pod Security Standards

```yaml
# Pod security policy
apiVersion: v1
kind: Namespace
metadata:
  name: frontier-core
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 3. Service Mesh (Optional)

```bash
# Install Istio service mesh
curl -L https://istio.io/downloadIstio | sh -
istioctl install --set values.defaultRevision=default

# Enable sidecar injection
kubectl label namespace frontier-core istio-injection=enabled
kubectl label namespace frontier-modules istio-injection=enabled
```

## Scaling Configuration

### 1. Horizontal Pod Autoscaler

```yaml
# HPA for foundation model
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontier-1-hpa
  namespace: frontier-core
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontier-1-foundation
  minReplicas: 4
  maxReplicas: 32
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2. Cluster Autoscaler

```bash
# Deploy cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure for Frontier cluster
kubectl -n kube-system annotate deployment.apps/cluster-autoscaler cluster-autoscaler.kubernetes.io/safe-to-evict="false"
kubectl -n kube-system edit deployment.apps/cluster-autoscaler
```

## Data Pipeline Deployment

### 1. Apache Kafka

```bash
# Deploy Kafka using Strimzi operator
kubectl apply -f 'https://strimzi.io/install/latest?namespace=kafka'
kubectl apply -f data-pipeline/kafka-cluster.yaml
```

### 2. Apache Spark

```bash
# Deploy Spark operator
helm repo add spark-operator https://googlecloudplatform.github.io/spark-on-k8s-operator
helm install spark-operator spark-operator/spark-operator \
  --namespace spark-operator \
  --create-namespace
```

## Backup and Disaster Recovery

### 1. Velero Backup

```bash
# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket frontier-ai-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1

# Create backup schedule
velero schedule create daily-backup --schedule="0 1 * * *"
```

### 2. Database Backups

```bash
# Configure automated RDS backups (already configured in Terraform)
# Additional point-in-time recovery setup
aws rds modify-db-instance \
  --db-instance-identifier frontier-ai-cluster-metadata \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"
```

## Health Checks and Testing

### 1. Deployment Verification

```bash
# Check all pods are running
kubectl get pods --all-namespaces

# Check services
kubectl get svc --all-namespaces

# Check ingress
kubectl get ingress --all-namespaces
```

### 2. API Health Checks

```bash
# Test foundation model endpoint
curl -X POST http://<load-balancer-dns>/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, world!", "max_tokens": 100}'

# Test business module
curl -X POST http://<load-balancer-dns>/api/v1/business/financial-analysis \
  -H "Content-Type: application/json" \
  -d '{"data": "sample financial data"}'
```

### 3. Load Testing

```bash
# Use k6 for load testing
k6 run --vus 100 --duration 30s load-tests/api-load-test.js
```

## Maintenance and Updates

### 1. Rolling Updates

```bash
# Update foundation model
kubectl set image deployment/frontier-1-foundation \
  frontier-1=frontier-ai/foundation-model:v1.1.0 \
  -n frontier-core

# Check rollout status
kubectl rollout status deployment/frontier-1-foundation -n frontier-core
```

### 2. Infrastructure Updates

```bash
# Update Terraform infrastructure
terraform plan -var="environment=production"
terraform apply -var="environment=production"
```

## Troubleshooting

### Common Issues

1. **GPU Not Available**
   ```bash
   # Check GPU operator status
   kubectl get pods -n gpu-operator
   
   # Check node GPU capacity
   kubectl describe nodes | grep nvidia.com/gpu
   ```

2. **Model Loading Failures**
   ```bash
   # Check persistent volume claims
   kubectl get pvc -n frontier-core
   
   # Check model file permissions
   kubectl exec -it <pod-name> -n frontier-core -- ls -la /models/
   ```

3. **High Memory Usage**
   ```bash
   # Check memory metrics
   kubectl top pods -n frontier-core
   
   # Adjust resource limits if needed
   kubectl patch deployment frontier-1-foundation -p '{"spec":{"template":{"spec":{"containers":[{"name":"frontier-1","resources":{"limits":{"memory":"800Gi"}}}]}}}}'
   ```

### Support and Documentation

- **Internal Documentation**: `/docs/`
- **API Documentation**: `http://<load-balancer-dns>/docs`
- **Monitoring Dashboards**: `http://<grafana-endpoint>`
- **Log Analysis**: `http://<kibana-endpoint>`

This deployment guide ensures a robust, scalable, and maintainable Frontier AI system deployment.
