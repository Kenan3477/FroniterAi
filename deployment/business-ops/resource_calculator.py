# Business Operations Module - Resource Requirements Calculator

import yaml
import json
from typing import Dict, Any, List
from dataclasses import dataclass
from enum import Enum


class ServiceTier(Enum):
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class DeploymentEnvironment(Enum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"


@dataclass
class ResourceRequirements:
    cpu_request: str
    cpu_limit: str
    memory_request: str
    memory_limit: str
    storage: str
    replicas_min: int
    replicas_max: int


class BusinessOpsResourceCalculator:
    """Calculate resource requirements for business operations module"""
    
    def __init__(self):
        self.base_requirements = {
            ServiceTier.BASIC: {
                "api": ResourceRequirements("100m", "500m", "256Mi", "512Mi", "5Gi", 1, 3),
                "database": ResourceRequirements("250m", "1000m", "512Mi", "2Gi", "20Gi", 1, 1),
                "redis": ResourceRequirements("50m", "200m", "128Mi", "256Mi", "1Gi", 1, 1),
                "ml_service": ResourceRequirements("200m", "1000m", "512Mi", "1Gi", "10Gi", 1, 2),
            },
            ServiceTier.PROFESSIONAL: {
                "api": ResourceRequirements("200m", "1000m", "512Mi", "1Gi", "10Gi", 2, 5),
                "database": ResourceRequirements("500m", "2000m", "1Gi", "4Gi", "50Gi", 1, 2),
                "redis": ResourceRequirements("100m", "500m", "256Mi", "512Mi", "2Gi", 1, 2),
                "ml_service": ResourceRequirements("500m", "2000m", "1Gi", "2Gi", "20Gi", 1, 3),
            },
            ServiceTier.ENTERPRISE: {
                "api": ResourceRequirements("500m", "2000m", "1Gi", "2Gi", "20Gi", 3, 10),
                "database": ResourceRequirements("1000m", "4000m", "2Gi", "8Gi", "100Gi", 2, 3),
                "redis": ResourceRequirements("200m", "1000m", "512Mi", "1Gi", "5Gi", 2, 3),
                "ml_service": ResourceRequirements("1000m", "4000m", "2Gi", "4Gi", "50Gi", 2, 5),
            }
        }
        
        self.environment_multipliers = {
            DeploymentEnvironment.DEV: 0.5,
            DeploymentEnvironment.STAGING: 0.75,
            DeploymentEnvironment.PROD: 1.0
        }
    
    def calculate_requirements(self, 
                             tier: ServiceTier, 
                             environment: DeploymentEnvironment,
                             expected_users: int = 1000,
                             compliance_requirements: List[str] = None) -> Dict[str, ResourceRequirements]:
        """Calculate resource requirements based on tier, environment, and usage patterns"""
        
        base_reqs = self.base_requirements[tier].copy()
        multiplier = self.environment_multipliers[environment]
        
        # User-based scaling
        user_multiplier = max(1.0, expected_users / 1000)
        
        # Compliance overhead
        compliance_multiplier = 1.0
        if compliance_requirements:
            if "gdpr" in compliance_requirements:
                compliance_multiplier += 0.2
            if "sox" in compliance_requirements:
                compliance_multiplier += 0.3
            if "pci_dss" in compliance_requirements:
                compliance_multiplier += 0.25
        
        final_multiplier = multiplier * user_multiplier * compliance_multiplier
        
        # Apply multipliers
        scaled_requirements = {}
        for service, req in base_reqs.items():
            scaled_requirements[service] = ResourceRequirements(
                cpu_request=self._scale_cpu(req.cpu_request, final_multiplier),
                cpu_limit=self._scale_cpu(req.cpu_limit, final_multiplier),
                memory_request=self._scale_memory(req.memory_request, final_multiplier),
                memory_limit=self._scale_memory(req.memory_limit, final_multiplier),
                storage=self._scale_storage(req.storage, final_multiplier),
                replicas_min=max(1, int(req.replicas_min * final_multiplier)),
                replicas_max=max(req.replicas_min, int(req.replicas_max * final_multiplier))
            )
        
        return scaled_requirements
    
    def _scale_cpu(self, cpu_value: str, multiplier: float) -> str:
        """Scale CPU values"""
        if cpu_value.endswith('m'):
            value = int(cpu_value[:-1])
            scaled = max(50, int(value * multiplier))
            return f"{scaled}m"
        else:
            value = float(cpu_value)
            scaled = max(0.1, value * multiplier)
            return f"{scaled:.1f}"
    
    def _scale_memory(self, memory_value: str, multiplier: float) -> str:
        """Scale memory values"""
        if memory_value.endswith('Mi'):
            value = int(memory_value[:-2])
            scaled = max(128, int(value * multiplier))
            return f"{scaled}Mi"
        elif memory_value.endswith('Gi'):
            value = int(memory_value[:-2])
            scaled = max(1, int(value * multiplier))
            return f"{scaled}Gi"
        return memory_value
    
    def _scale_storage(self, storage_value: str, multiplier: float) -> str:
        """Scale storage values"""
        if storage_value.endswith('Gi'):
            value = int(storage_value[:-2])
            scaled = max(5, int(value * multiplier))
            return f"{scaled}Gi"
        return storage_value
    
    def generate_kubernetes_manifests(self, 
                                    requirements: Dict[str, ResourceRequirements],
                                    namespace: str = "business-ops") -> Dict[str, str]:
        """Generate Kubernetes deployment manifests"""
        
        manifests = {}
        
        # API Service Deployment
        api_manifest = self._generate_api_deployment(requirements["api"], namespace)
        manifests["api-deployment.yaml"] = yaml.dump(api_manifest, default_flow_style=False)
        
        # Database Deployment
        db_manifest = self._generate_database_deployment(requirements["database"], namespace)
        manifests["database-deployment.yaml"] = yaml.dump(db_manifest, default_flow_style=False)
        
        # Redis Deployment
        redis_manifest = self._generate_redis_deployment(requirements["redis"], namespace)
        manifests["redis-deployment.yaml"] = yaml.dump(redis_manifest, default_flow_style=False)
        
        # ML Service Deployment
        ml_manifest = self._generate_ml_deployment(requirements["ml_service"], namespace)
        manifests["ml-service-deployment.yaml"] = yaml.dump(ml_manifest, default_flow_style=False)
        
        return manifests
    
    def _generate_api_deployment(self, req: ResourceRequirements, namespace: str) -> Dict[str, Any]:
        """Generate API deployment manifest"""
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": "business-ops-api",
                "namespace": namespace,
                "labels": {
                    "app": "business-ops-api",
                    "component": "api",
                    "tier": "backend"
                }
            },
            "spec": {
                "replicas": req.replicas_min,
                "selector": {
                    "matchLabels": {
                        "app": "business-ops-api"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "business-ops-api",
                            "component": "api"
                        },
                        "annotations": {
                            "prometheus.io/scrape": "true",
                            "prometheus.io/port": "8000",
                            "prometheus.io/path": "/metrics"
                        }
                    },
                    "spec": {
                        "serviceAccountName": "business-ops-api",
                        "securityContext": {
                            "runAsNonRoot": True,
                            "runAsUser": 1001,
                            "fsGroup": 1001
                        },
                        "containers": [{
                            "name": "api",
                            "image": "frontier/business-ops-api:latest",
                            "ports": [
                                {"containerPort": 8000, "name": "http"},
                                {"containerPort": 8001, "name": "metrics"}
                            ],
                            "env": [
                                {
                                    "name": "DATABASE_URL",
                                    "valueFrom": {
                                        "secretKeyRef": {
                                            "name": "business-ops-secrets",
                                            "key": "database-url"
                                        }
                                    }
                                },
                                {
                                    "name": "REDIS_URL",
                                    "valueFrom": {
                                        "secretKeyRef": {
                                            "name": "business-ops-secrets",
                                            "key": "redis-url"
                                        }
                                    }
                                },
                                {
                                    "name": "JWT_SECRET_KEY",
                                    "valueFrom": {
                                        "secretKeyRef": {
                                            "name": "business-ops-secrets",
                                            "key": "jwt-secret"
                                        }
                                    }
                                }
                            ],
                            "resources": {
                                "requests": {
                                    "cpu": req.cpu_request,
                                    "memory": req.memory_request
                                },
                                "limits": {
                                    "cpu": req.cpu_limit,
                                    "memory": req.memory_limit
                                }
                            },
                            "livenessProbe": {
                                "httpGet": {
                                    "path": "/health",
                                    "port": 8000
                                },
                                "initialDelaySeconds": 30,
                                "periodSeconds": 10,
                                "timeoutSeconds": 5,
                                "failureThreshold": 3
                            },
                            "readinessProbe": {
                                "httpGet": {
                                    "path": "/ready",
                                    "port": 8000
                                },
                                "initialDelaySeconds": 5,
                                "periodSeconds": 5,
                                "timeoutSeconds": 3,
                                "failureThreshold": 2
                            },
                            "volumeMounts": [
                                {
                                    "name": "logs",
                                    "mountPath": "/app/logs"
                                },
                                {
                                    "name": "temp-storage",
                                    "mountPath": "/tmp"
                                }
                            ]
                        }],
                        "volumes": [
                            {
                                "name": "logs",
                                "emptyDir": {}
                            },
                            {
                                "name": "temp-storage",
                                "emptyDir": {
                                    "sizeLimit": "1Gi"
                                }
                            }
                        ]
                    }
                }
            }
        }
    
    def _generate_database_deployment(self, req: ResourceRequirements, namespace: str) -> Dict[str, Any]:
        """Generate database deployment manifest"""
        return {
            "apiVersion": "apps/v1",
            "kind": "StatefulSet",
            "metadata": {
                "name": "business-ops-database",
                "namespace": namespace,
                "labels": {
                    "app": "business-ops-database",
                    "component": "database"
                }
            },
            "spec": {
                "serviceName": "business-ops-database",
                "replicas": req.replicas_min,
                "selector": {
                    "matchLabels": {
                        "app": "business-ops-database"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "business-ops-database",
                            "component": "database"
                        }
                    },
                    "spec": {
                        "securityContext": {
                            "runAsUser": 999,
                            "runAsGroup": 999,
                            "fsGroup": 999
                        },
                        "containers": [{
                            "name": "postgresql",
                            "image": "postgres:15.4-alpine",
                            "env": [
                                {
                                    "name": "POSTGRES_DB",
                                    "value": "business_ops"
                                },
                                {
                                    "name": "POSTGRES_USER",
                                    "valueFrom": {
                                        "secretKeyRef": {
                                            "name": "business-ops-secrets",
                                            "key": "db-username"
                                        }
                                    }
                                },
                                {
                                    "name": "POSTGRES_PASSWORD",
                                    "valueFrom": {
                                        "secretKeyRef": {
                                            "name": "business-ops-secrets",
                                            "key": "db-password"
                                        }
                                    }
                                },
                                {
                                    "name": "PGDATA",
                                    "value": "/var/lib/postgresql/data/pgdata"
                                }
                            ],
                            "ports": [{
                                "containerPort": 5432,
                                "name": "postgresql"
                            }],
                            "resources": {
                                "requests": {
                                    "cpu": req.cpu_request,
                                    "memory": req.memory_request
                                },
                                "limits": {
                                    "cpu": req.cpu_limit,
                                    "memory": req.memory_limit
                                }
                            },
                            "volumeMounts": [
                                {
                                    "name": "postgresql-data",
                                    "mountPath": "/var/lib/postgresql/data"
                                },
                                {
                                    "name": "postgresql-config",
                                    "mountPath": "/etc/postgresql/postgresql.conf",
                                    "subPath": "postgresql.conf"
                                }
                            ],
                            "livenessProbe": {
                                "exec": {
                                    "command": [
                                        "pg_isready", "-U", "$(POSTGRES_USER)", "-d", "$(POSTGRES_DB)"
                                    ]
                                },
                                "initialDelaySeconds": 30,
                                "periodSeconds": 10,
                                "timeoutSeconds": 5
                            },
                            "readinessProbe": {
                                "exec": {
                                    "command": [
                                        "pg_isready", "-U", "$(POSTGRES_USER)", "-d", "$(POSTGRES_DB)"
                                    ]
                                },
                                "initialDelaySeconds": 5,
                                "periodSeconds": 5,
                                "timeoutSeconds": 3
                            }
                        }],
                        "volumes": [
                            {
                                "name": "postgresql-config",
                                "configMap": {
                                    "name": "postgresql-config"
                                }
                            }
                        ]
                    }
                },
                "volumeClaimTemplates": [{
                    "metadata": {
                        "name": "postgresql-data"
                    },
                    "spec": {
                        "accessModes": ["ReadWriteOnce"],
                        "storageClassName": "fast-ssd",
                        "resources": {
                            "requests": {
                                "storage": req.storage
                            }
                        }
                    }
                }]
            }
        }
    
    def _generate_redis_deployment(self, req: ResourceRequirements, namespace: str) -> Dict[str, Any]:
        """Generate Redis deployment manifest"""
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": "business-ops-redis",
                "namespace": namespace,
                "labels": {
                    "app": "business-ops-redis",
                    "component": "cache"
                }
            },
            "spec": {
                "replicas": req.replicas_min,
                "selector": {
                    "matchLabels": {
                        "app": "business-ops-redis"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "business-ops-redis",
                            "component": "cache"
                        }
                    },
                    "spec": {
                        "containers": [{
                            "name": "redis",
                            "image": "redis:7.2-alpine",
                            "command": [
                                "redis-server",
                                "/etc/redis/redis.conf"
                            ],
                            "ports": [{
                                "containerPort": 6379,
                                "name": "redis"
                            }],
                            "env": [
                                {
                                    "name": "REDIS_PASSWORD",
                                    "valueFrom": {
                                        "secretKeyRef": {
                                            "name": "business-ops-secrets",
                                            "key": "redis-password"
                                        }
                                    }
                                }
                            ],
                            "resources": {
                                "requests": {
                                    "cpu": req.cpu_request,
                                    "memory": req.memory_request
                                },
                                "limits": {
                                    "cpu": req.cpu_limit,
                                    "memory": req.memory_limit
                                }
                            },
                            "volumeMounts": [
                                {
                                    "name": "redis-data",
                                    "mountPath": "/data"
                                },
                                {
                                    "name": "redis-config",
                                    "mountPath": "/etc/redis/redis.conf",
                                    "subPath": "redis.conf"
                                }
                            ],
                            "livenessProbe": {
                                "exec": {
                                    "command": ["redis-cli", "ping"]
                                },
                                "initialDelaySeconds": 30,
                                "periodSeconds": 10
                            },
                            "readinessProbe": {
                                "exec": {
                                    "command": ["redis-cli", "ping"]
                                },
                                "initialDelaySeconds": 5,
                                "periodSeconds": 5
                            }
                        }],
                        "volumes": [
                            {
                                "name": "redis-data",
                                "persistentVolumeClaim": {
                                    "claimName": "redis-data"
                                }
                            },
                            {
                                "name": "redis-config",
                                "configMap": {
                                    "name": "redis-config"
                                }
                            }
                        ]
                    }
                }
            }
        }
    
    def _generate_ml_deployment(self, req: ResourceRequirements, namespace: str) -> Dict[str, Any]:
        """Generate ML service deployment manifest"""
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": "business-ops-ml",
                "namespace": namespace,
                "labels": {
                    "app": "business-ops-ml",
                    "component": "ml-service"
                }
            },
            "spec": {
                "replicas": req.replicas_min,
                "selector": {
                    "matchLabels": {
                        "app": "business-ops-ml"
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": "business-ops-ml",
                            "component": "ml-service"
                        }
                    },
                    "spec": {
                        "serviceAccountName": "business-ops-ml",
                        "containers": [{
                            "name": "ml-service",
                            "image": "frontier/business-ops-ml:latest",
                            "ports": [{
                                "containerPort": 8080,
                                "name": "http"
                            }],
                            "env": [
                                {
                                    "name": "MODEL_CACHE_SIZE",
                                    "value": "2GB"
                                },
                                {
                                    "name": "BATCH_SIZE",
                                    "value": "32"
                                }
                            ],
                            "resources": {
                                "requests": {
                                    "cpu": req.cpu_request,
                                    "memory": req.memory_request
                                },
                                "limits": {
                                    "cpu": req.cpu_limit,
                                    "memory": req.memory_limit,
                                    "nvidia.com/gpu": "1"
                                }
                            },
                            "volumeMounts": [
                                {
                                    "name": "model-cache",
                                    "mountPath": "/app/models"
                                }
                            ],
                            "livenessProbe": {
                                "httpGet": {
                                    "path": "/health",
                                    "port": 8080
                                },
                                "initialDelaySeconds": 60,
                                "periodSeconds": 30
                            },
                            "readinessProbe": {
                                "httpGet": {
                                    "path": "/ready",
                                    "port": 8080
                                },
                                "initialDelaySeconds": 30,
                                "periodSeconds": 10
                            }
                        }],
                        "volumes": [
                            {
                                "name": "model-cache",
                                "persistentVolumeClaim": {
                                    "claimName": "ml-model-cache"
                                }
                            }
                        ],
                        "nodeSelector": {
                            "accelerator": "nvidia-tesla-t4"
                        },
                        "tolerations": [
                            {
                                "key": "nvidia.com/gpu",
                                "operator": "Exists",
                                "effect": "NoSchedule"
                            }
                        ]
                    }
                }
            }
        }


def main():
    """Generate deployment configurations"""
    calculator = BusinessOpsResourceCalculator()
    
    # Calculate requirements for different scenarios
    scenarios = [
        {
            "name": "dev-basic",
            "tier": ServiceTier.BASIC,
            "environment": DeploymentEnvironment.DEV,
            "users": 100,
            "compliance": []
        },
        {
            "name": "staging-professional", 
            "tier": ServiceTier.PROFESSIONAL,
            "environment": DeploymentEnvironment.STAGING,
            "users": 1000,
            "compliance": ["gdpr"]
        },
        {
            "name": "prod-enterprise",
            "tier": ServiceTier.ENTERPRISE,
            "environment": DeploymentEnvironment.PROD,
            "users": 10000,
            "compliance": ["gdpr", "sox", "pci_dss"]
        }
    ]
    
    for scenario in scenarios:
        print(f"\n=== {scenario['name'].upper()} SCENARIO ===")
        
        requirements = calculator.calculate_requirements(
            tier=scenario["tier"],
            environment=scenario["environment"],
            expected_users=scenario["users"],
            compliance_requirements=scenario["compliance"]
        )
        
        print("\nResource Requirements:")
        for service, req in requirements.items():
            print(f"\n{service.upper()}:")
            print(f"  CPU: {req.cpu_request} (request) / {req.cpu_limit} (limit)")
            print(f"  Memory: {req.memory_request} (request) / {req.memory_limit} (limit)")
            print(f"  Storage: {req.storage}")
            print(f"  Replicas: {req.replicas_min} (min) / {req.replicas_max} (max)")
        
        # Generate Kubernetes manifests
        manifests = calculator.generate_kubernetes_manifests(requirements, f"business-ops-{scenario['name']}")
        
        print(f"\nGenerated {len(manifests)} Kubernetes manifests")
        for manifest_name in manifests.keys():
            print(f"  - {manifest_name}")


if __name__ == "__main__":
    main()
