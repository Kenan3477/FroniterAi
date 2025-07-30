# AWS IAM Roles and Policies for Frontier Infrastructure

# EKS Cluster IAM Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "frontier-eks-cluster-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "frontier-eks-cluster-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role_policy_attachment" "eks_service_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

# EKS Node Group IAM Role
resource "aws_iam_role" "eks_node_role" {
  name = "frontier-eks-node-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "frontier-eks-node-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# Additional policies for EKS nodes
resource "aws_iam_role_policy" "eks_node_additional_policy" {
  name = "frontier-eks-node-additional-policy-${var.environment}"
  role = aws_iam_role.eks_node_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.frontier_app_bucket.arn,
          "${aws_s3_bucket.frontier_app_bucket.arn}/*",
          aws_s3_bucket.frontier_data_bucket.arn,
          "${aws_s3_bucket.frontier_data_bucket.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}

# RDS Monitoring Role
resource "aws_iam_role" "rds_monitoring_role" {
  name = "frontier-rds-monitoring-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "frontier-rds-monitoring-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring_role.name
}

# AWS Load Balancer Controller IAM Role
resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "frontier-aws-load-balancer-controller-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name = "frontier-aws-load-balancer-controller-${var.environment}"
  }
}

resource "aws_iam_role_policy" "aws_load_balancer_controller_policy" {
  name = "frontier-aws-load-balancer-controller-policy-${var.environment}"
  role = aws_iam_role.aws_load_balancer_controller.id

  policy = file("${path.module}/policies/aws-load-balancer-controller-policy.json")
}

# EBS CSI Driver IAM Role
resource "aws_iam_role" "ebs_csi_driver" {
  name = "frontier-ebs-csi-driver-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub": "system:serviceaccount:kube-system:ebs-csi-controller-sa"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name = "frontier-ebs-csi-driver-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi_driver.name
}

# Cluster Autoscaler IAM Role
resource "aws_iam_role" "cluster_autoscaler" {
  name = "frontier-cluster-autoscaler-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub": "system:serviceaccount:kube-system:cluster-autoscaler"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name = "frontier-cluster-autoscaler-${var.environment}"
  }
}

resource "aws_iam_role_policy" "cluster_autoscaler_policy" {
  name = "frontier-cluster-autoscaler-policy-${var.environment}"
  role = aws_iam_role.cluster_autoscaler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeTags",
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
          "ec2:DescribeLaunchTemplateVersions"
        ]
        Resource = "*"
      }
    ]
  })
}

# OIDC Provider for EKS
data "tls_certificate" "eks" {
  url = aws_eks_cluster.frontier_cluster.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.frontier_cluster.identity[0].oidc[0].issuer

  tags = {
    Name = "frontier-eks-oidc-${var.environment}"
  }
}

# ECR Repository
resource "aws_ecr_repository" "frontier_api" {
  name                 = "frontier/api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key        = aws_kms_key.ecr_encryption_key.arn
  }

  tags = {
    Name = "frontier-api-repo"
  }
}

resource "aws_ecr_repository" "frontier_web" {
  name                 = "frontier/web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key        = aws_kms_key.ecr_encryption_key.arn
  }

  tags = {
    Name = "frontier-web-repo"
  }
}

resource "aws_ecr_repository" "frontier_ml" {
  name                 = "frontier/ml"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key        = aws_kms_key.ecr_encryption_key.arn
  }

  tags = {
    Name = "frontier-ml-repo"
  }
}

# ECR Lifecycle Policies
resource "aws_ecr_lifecycle_policy" "frontier_api_lifecycle" {
  repository = aws_ecr_repository.frontier_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 30 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# KMS Keys
resource "aws_kms_key" "eks_encryption_key" {
  description             = "KMS key for EKS encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "frontier-eks-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "eks_encryption_key_alias" {
  name          = "alias/frontier-eks-${var.environment}"
  target_key_id = aws_kms_key.eks_encryption_key.key_id
}

resource "aws_kms_key" "rds_encryption_key" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "frontier-rds-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "rds_encryption_key_alias" {
  name          = "alias/frontier-rds-${var.environment}"
  target_key_id = aws_kms_key.rds_encryption_key.key_id
}

resource "aws_kms_key" "s3_encryption_key" {
  description             = "KMS key for S3 encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "frontier-s3-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "s3_encryption_key_alias" {
  name          = "alias/frontier-s3-${var.environment}"
  target_key_id = aws_kms_key.s3_encryption_key.key_id
}

resource "aws_kms_key" "ecr_encryption_key" {
  description             = "KMS key for ECR encryption"
  deletion_window_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "frontier-ecr-encryption-key-${var.environment}"
  }
}

resource "aws_kms_alias" "ecr_encryption_key_alias" {
  name          = "alias/frontier-ecr-${var.environment}"
  target_key_id = aws_kms_key.ecr_encryption_key.key_id
}

# Secrets Manager
resource "aws_secretsmanager_secret" "database_credentials" {
  name        = "frontier/database/${var.environment}"
  description = "Database credentials for Frontier ${var.environment}"
  
  kms_key_id = aws_kms_key.rds_encryption_key.arn

  tags = {
    Name = "frontier-database-credentials-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    username = var.database_username
    password = var.database_password
    host     = aws_db_instance.frontier_db.endpoint
    port     = aws_db_instance.frontier_db.port
    dbname   = var.database_name
  })
}

resource "aws_secretsmanager_secret" "redis_credentials" {
  name        = "frontier/redis/${var.environment}"
  description = "Redis credentials for Frontier ${var.environment}"
  
  kms_key_id = aws_kms_key.rds_encryption_key.arn

  tags = {
    Name = "frontier-redis-credentials-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host      = aws_elasticache_replication_group.frontier_redis.primary_endpoint_address
    port      = aws_elasticache_replication_group.frontier_redis.port
    auth_token = var.redis_auth_token
  })
}

# Route53 Hosted Zone (if managing DNS)
resource "aws_route53_zone" "frontier_zone" {
  count = var.create_route53_zone ? 1 : 0
  name  = var.domain_name

  tags = {
    Name = "frontier-zone-${var.environment}"
  }
}

# ACM Certificate
resource "aws_acm_certificate" "frontier_cert" {
  count = var.create_ssl_certificate ? 1 : 0
  
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "frontier-cert-${var.environment}"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "eks_cluster_logs" {
  name              = "/aws/eks/frontier-${var.environment}/cluster"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "frontier-eks-cluster-logs-${var.environment}"
  }
}

resource "aws_cloudwatch_log_group" "application_logs" {
  name              = "/aws/eks/frontier-${var.environment}/application"
  retention_in_days = var.log_retention_in_days

  tags = {
    Name = "frontier-application-logs-${var.environment}"
  }
}
