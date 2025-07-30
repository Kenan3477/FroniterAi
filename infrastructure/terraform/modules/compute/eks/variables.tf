# Variables for EKS Module
# Configures Amazon EKS cluster and node groups

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
}

variable "vpc_id" {
  description = "ID of the VPC where the cluster will be created"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "endpoint_private_access" {
  description = "Enable private API server endpoint"
  type        = bool
  default     = true
}

variable "endpoint_public_access" {
  description = "Enable public API server endpoint"
  type        = bool
  default     = true
}

variable "public_access_cidrs" {
  description = "List of CIDR blocks that can access the public endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_security_group_ingress_cidrs" {
  description = "List of CIDR blocks for cluster security group ingress"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "ssh_access_cidrs" {
  description = "List of CIDR blocks for SSH access to nodes"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "ssh_key_name" {
  description = "EC2 Key Pair name for SSH access to nodes"
  type        = string
  default     = ""
}

variable "kms_key_arn" {
  description = "ARN of KMS key for EKS encryption"
  type        = string
}

variable "cluster_log_types" {
  description = "List of control plane logging types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 30
}

variable "node_groups" {
  description = "Map of node group configurations"
  type = map(object({
    instance_types             = list(string)
    ami_type                  = string
    capacity_type             = string
    disk_size                 = number
    desired_size              = number
    max_size                  = number
    min_size                  = number
    max_unavailable_percentage = number
    gpu_enabled               = bool
    labels                    = map(string)
  }))
  default = {}
}

variable "fargate_profiles" {
  description = "Map of Fargate profile configurations"
  type = map(object({
    namespace = string
    labels    = map(string)
  }))
  default = {}
}

# EKS Add-on versions
variable "coredns_version" {
  description = "CoreDNS add-on version"
  type        = string
  default     = "v1.10.1-eksbuild.2"
}

variable "kube_proxy_version" {
  description = "Kube-proxy add-on version"
  type        = string
  default     = "v1.28.1-eksbuild.1"
}

variable "vpc_cni_version" {
  description = "VPC CNI add-on version"
  type        = string
  default     = "v1.14.1-eksbuild.1"
}

variable "ebs_csi_version" {
  description = "EBS CSI driver add-on version"
  type        = string
  default     = "v1.23.0-eksbuild.1"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
