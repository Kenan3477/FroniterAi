"""
Dynamic Module Loading System
Handles on-demand loading, scaling, and management of Frontier AI modules
"""

import asyncio
import json
import logging
import yaml
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Set
from pathlib import Path
import docker
import kubernetes
from kubernetes import client, config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModuleState(Enum):
    """Module deployment states"""
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    SCALING = "scaling"
    ERROR = "error"
    UNLOADING = "unloading"

class LoadingStrategy(Enum):
    """Module loading strategies"""
    ON_DEMAND = "on_demand"          # Load when first request arrives
    PREDICTIVE = "predictive"        # Load based on usage patterns
    PREEMPTIVE = "preemptive"        # Keep commonly used modules loaded
    SCHEDULED = "scheduled"          # Load/unload on schedule

@dataclass
class ModuleSpec:
    """Specification for a loadable module"""
    module_id: str
    module_type: str
    image: str
    version: str
    resource_requirements: Dict[str, Any]
    health_check_path: str = "/health"
    startup_timeout: int = 300  # seconds
    min_replicas: int = 1
    max_replicas: int = 10
    target_cpu_utilization: int = 70
    environment_variables: Dict[str, str] = field(default_factory=dict)
    volumes: List[Dict[str, str]] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    
    @classmethod
    def from_yaml(cls, yaml_path: str) -> 'ModuleSpec':
        """Load module spec from YAML file"""
        with open(yaml_path, 'r') as f:
            data = yaml.safe_load(f)
        
        return cls(
            module_id=data['module_id'],
            module_type=data['module_type'],
            image=data['image'],
            version=data['version'],
            resource_requirements=data['resource_requirements'],
            health_check_path=data.get('health_check_path', '/health'),
            startup_timeout=data.get('startup_timeout', 300),
            min_replicas=data.get('min_replicas', 1),
            max_replicas=data.get('max_replicas', 10),
            target_cpu_utilization=data.get('target_cpu_utilization', 70),
            environment_variables=data.get('environment_variables', {}),
            volumes=data.get('volumes', []),
            dependencies=data.get('dependencies', [])
        )

@dataclass
class ModuleInstance:
    """Runtime instance of a loaded module"""
    instance_id: str
    module_spec: ModuleSpec
    state: ModuleState
    endpoint: Optional[str] = None
    pod_name: Optional[str] = None
    service_name: Optional[str] = None
    deployment_name: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_health_check: Optional[datetime] = None
    health_status: bool = False
    current_replicas: int = 0
    request_count: int = 0
    error_count: int = 0
    avg_response_time: float = 0.0

@dataclass
class LoadingMetrics:
    """Metrics for module loading decisions"""
    request_frequency: float  # requests per minute
    avg_response_time: float  # milliseconds
    success_rate: float       # percentage
    resource_utilization: Dict[str, float]  # CPU, memory, etc.
    queue_length: int         # pending requests
    last_request_time: datetime
    prediction_confidence: float  # 0.0 to 1.0

class UsagePredictor:
    """Predicts module usage patterns for proactive loading"""
    
    def __init__(self):
        self.usage_history: Dict[str, List[Dict]] = {}
        self.patterns: Dict[str, Dict] = {}
        self.prediction_window = timedelta(minutes=15)
        
    def record_usage(self, module_id: str, timestamp: datetime, 
                    request_count: int, response_time: float):
        """Record module usage for pattern analysis"""
        if module_id not in self.usage_history:
            self.usage_history[module_id] = []
        
        self.usage_history[module_id].append({
            'timestamp': timestamp,
            'request_count': request_count,
            'response_time': response_time,
            'hour': timestamp.hour,
            'day_of_week': timestamp.weekday()
        })
        
        # Keep only recent history (last 7 days)
        cutoff_time = timestamp - timedelta(days=7)
        self.usage_history[module_id] = [
            record for record in self.usage_history[module_id]
            if record['timestamp'] > cutoff_time
        ]
    
    def predict_usage(self, module_id: str, 
                     prediction_time: Optional[datetime] = None) -> LoadingMetrics:
        """Predict future usage for a module"""
        if prediction_time is None:
            prediction_time = datetime.utcnow() + self.prediction_window
        
        if module_id not in self.usage_history:
            return LoadingMetrics(
                request_frequency=0.0,
                avg_response_time=1000.0,
                success_rate=1.0,
                resource_utilization={},
                queue_length=0,
                last_request_time=datetime.utcnow(),
                prediction_confidence=0.0
            )
        
        history = self.usage_history[module_id]
        
        # Time-based pattern analysis
        target_hour = prediction_time.hour
        target_day = prediction_time.weekday()
        
        similar_periods = [
            record for record in history
            if record['hour'] == target_hour and record['day_of_week'] == target_day
        ]
        
        if not similar_periods:
            # Fall back to general patterns
            similar_periods = history[-20:]  # Last 20 records
        
        # Calculate predictions
        if similar_periods:
            avg_requests = sum(r['request_count'] for r in similar_periods) / len(similar_periods)
            avg_response = sum(r['response_time'] for r in similar_periods) / len(similar_periods)
            confidence = min(len(similar_periods) / 10.0, 1.0)  # More data = higher confidence
        else:
            avg_requests = 0.0
            avg_response = 1000.0
            confidence = 0.0
        
        return LoadingMetrics(
            request_frequency=avg_requests,
            avg_response_time=avg_response,
            success_rate=0.95,  # Default assumption
            resource_utilization={'cpu': 0.5, 'memory': 0.6},
            queue_length=0,
            last_request_time=history[-1]['timestamp'] if history else datetime.utcnow(),
            prediction_confidence=confidence
        )
    
    def get_loading_recommendation(self, module_id: str) -> Dict[str, Any]:
        """Get recommendation for whether to load a module"""
        prediction = self.predict_usage(module_id)
        
        # Decision logic
        should_load = False
        reason = "low_predicted_usage"
        
        if prediction.request_frequency > 5.0:  # More than 5 requests per minute expected
            should_load = True
            reason = "high_predicted_frequency"
        elif prediction.prediction_confidence > 0.8 and prediction.request_frequency > 1.0:
            should_load = True
            reason = "confident_prediction"
        
        return {
            'should_load': should_load,
            'reason': reason,
            'confidence': prediction.prediction_confidence,
            'predicted_frequency': prediction.request_frequency,
            'predicted_response_time': prediction.avg_response_time
        }

class KubernetesManager:
    """Manages Kubernetes deployments for modules"""
    
    def __init__(self, namespace: str = "frontier-modules"):
        self.namespace = namespace
        self.apps_v1 = None
        self.core_v1 = None
        self.autoscaling_v2 = None
        
        try:
            # Try to load in-cluster config first
            config.load_incluster_config()
        except:
            # Fall back to local kubeconfig
            config.load_kube_config()
        
        self.apps_v1 = client.AppsV1Api()
        self.core_v1 = client.CoreV1Api()
        self.autoscaling_v2 = client.AutoscalingV2Api()
        
        # Ensure namespace exists
        self._ensure_namespace()
    
    def _ensure_namespace(self):
        """Ensure the namespace exists"""
        try:
            self.core_v1.read_namespace(name=self.namespace)
        except client.ApiException as e:
            if e.status == 404:
                # Create namespace
                namespace_body = client.V1Namespace(
                    metadata=client.V1ObjectMeta(name=self.namespace)
                )
                self.core_v1.create_namespace(body=namespace_body)
                logger.info(f"Created namespace: {self.namespace}")
    
    async def deploy_module(self, module_spec: ModuleSpec) -> ModuleInstance:
        """Deploy a module to Kubernetes"""
        instance_id = f"{module_spec.module_id}-{int(datetime.utcnow().timestamp())}"
        deployment_name = f"{module_spec.module_id}-deployment"
        service_name = f"{module_spec.module_id}-service"
        
        try:
            # Create deployment
            deployment = self._create_deployment_manifest(module_spec, deployment_name)
            self.apps_v1.create_namespaced_deployment(
                namespace=self.namespace,
                body=deployment
            )
            
            # Create service
            service = self._create_service_manifest(module_spec, service_name, deployment_name)
            self.core_v1.create_namespaced_service(
                namespace=self.namespace,
                body=service
            )
            
            # Create HPA (Horizontal Pod Autoscaler)
            hpa = self._create_hpa_manifest(module_spec, deployment_name)
            self.autoscaling_v2.create_namespaced_horizontal_pod_autoscaler(
                namespace=self.namespace,
                body=hpa
            )
            
            # Create module instance
            instance = ModuleInstance(
                instance_id=instance_id,
                module_spec=module_spec,
                state=ModuleState.LOADING,
                deployment_name=deployment_name,
                service_name=service_name,
                endpoint=f"http://{service_name}.{self.namespace}.svc.cluster.local:8080"
            )
            
            logger.info(f"Deployed module {module_spec.module_id} as {deployment_name}")
            return instance
            
        except Exception as e:
            logger.error(f"Failed to deploy module {module_spec.module_id}: {e}")
            raise
    
    def _create_deployment_manifest(self, module_spec: ModuleSpec, 
                                  deployment_name: str) -> client.V1Deployment:
        """Create Kubernetes deployment manifest"""
        
        # Convert resource requirements
        resources = client.V1ResourceRequirements(
            requests=module_spec.resource_requirements.get('requests', {}),
            limits=module_spec.resource_requirements.get('limits', {})
        )
        
        # Environment variables
        env_vars = [
            client.V1EnvVar(name=k, value=v)
            for k, v in module_spec.environment_variables.items()
        ]
        
        # Add standard environment variables
        env_vars.extend([
            client.V1EnvVar(name="MODULE_ID", value=module_spec.module_id),
            client.V1EnvVar(name="MODULE_TYPE", value=module_spec.module_type),
            client.V1EnvVar(name="HEALTH_CHECK_PATH", value=module_spec.health_check_path)
        ])
        
        # Volume mounts
        volume_mounts = []
        volumes = []
        
        for i, vol_config in enumerate(module_spec.volumes):
            volume_name = f"volume-{i}"
            volume_mounts.append(
                client.V1VolumeMount(
                    name=volume_name,
                    mount_path=vol_config['mount_path']
                )
            )
            
            if vol_config['type'] == 'configMap':
                volumes.append(
                    client.V1Volume(
                        name=volume_name,
                        config_map=client.V1ConfigMapVolumeSource(
                            name=vol_config['source']
                        )
                    )
                )
            elif vol_config['type'] == 'secret':
                volumes.append(
                    client.V1Volume(
                        name=volume_name,
                        secret=client.V1SecretVolumeSource(
                            secret_name=vol_config['source']
                        )
                    )
                )
        
        # Health checks
        health_check = client.V1Probe(
            http_get=client.V1HTTPGetAction(
                path=module_spec.health_check_path,
                port=8080
            ),
            initial_delay_seconds=30,
            period_seconds=10,
            timeout_seconds=5,
            failure_threshold=3
        )
        
        # Container specification
        container = client.V1Container(
            name=module_spec.module_id,
            image=f"{module_spec.image}:{module_spec.version}",
            ports=[client.V1ContainerPort(container_port=8080)],
            env=env_vars,
            resources=resources,
            volume_mounts=volume_mounts if volume_mounts else None,
            liveness_probe=health_check,
            readiness_probe=health_check
        )
        
        # Pod template
        pod_template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(
                labels={
                    "app": module_spec.module_id,
                    "module-type": module_spec.module_type,
                    "version": module_spec.version
                }
            ),
            spec=client.V1PodSpec(
                containers=[container],
                volumes=volumes if volumes else None
            )
        )
        
        # Deployment specification
        deployment_spec = client.V1DeploymentSpec(
            replicas=module_spec.min_replicas,
            selector=client.V1LabelSelector(
                match_labels={"app": module_spec.module_id}
            ),
            template=pod_template
        )
        
        # Complete deployment
        deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(
                name=deployment_name,
                labels={
                    "module-id": module_spec.module_id,
                    "module-type": module_spec.module_type
                }
            ),
            spec=deployment_spec
        )
        
        return deployment
    
    def _create_service_manifest(self, module_spec: ModuleSpec, 
                               service_name: str, deployment_name: str) -> client.V1Service:
        """Create Kubernetes service manifest"""
        
        service_spec = client.V1ServiceSpec(
            selector={"app": module_spec.module_id},
            ports=[
                client.V1ServicePort(
                    name="http",
                    port=8080,
                    target_port=8080,
                    protocol="TCP"
                )
            ],
            type="ClusterIP"
        )
        
        service = client.V1Service(
            api_version="v1",
            kind="Service",
            metadata=client.V1ObjectMeta(
                name=service_name,
                labels={
                    "module-id": module_spec.module_id,
                    "module-type": module_spec.module_type
                }
            ),
            spec=service_spec
        )
        
        return service
    
    def _create_hpa_manifest(self, module_spec: ModuleSpec, 
                           deployment_name: str) -> client.V2HorizontalPodAutoscaler:
        """Create Horizontal Pod Autoscaler manifest"""
        
        hpa_spec = client.V2HorizontalPodAutoscalerSpec(
            scale_target_ref=client.V2CrossVersionObjectReference(
                api_version="apps/v1",
                kind="Deployment",
                name=deployment_name
            ),
            min_replicas=module_spec.min_replicas,
            max_replicas=module_spec.max_replicas,
            metrics=[
                client.V2MetricSpec(
                    type="Resource",
                    resource=client.V2ResourceMetricSource(
                        name="cpu",
                        target=client.V2MetricTarget(
                            type="Utilization",
                            average_utilization=module_spec.target_cpu_utilization
                        )
                    )
                )
            ]
        )
        
        hpa = client.V2HorizontalPodAutoscaler(
            api_version="autoscaling/v2",
            kind="HorizontalPodAutoscaler",
            metadata=client.V1ObjectMeta(
                name=f"{deployment_name}-hpa"
            ),
            spec=hpa_spec
        )
        
        return hpa
    
    async def get_module_status(self, instance: ModuleInstance) -> Dict[str, Any]:
        """Get current status of a deployed module"""
        try:
            # Get deployment status
            deployment = self.apps_v1.read_namespaced_deployment(
                name=instance.deployment_name,
                namespace=self.namespace
            )
            
            # Get pod status
            pods = self.core_v1.list_namespaced_pod(
                namespace=self.namespace,
                label_selector=f"app={instance.module_spec.module_id}"
            )
            
            # Get service status
            service = self.core_v1.read_namespaced_service(
                name=instance.service_name,
                namespace=self.namespace
            )
            
            ready_replicas = deployment.status.ready_replicas or 0
            total_replicas = deployment.status.replicas or 0
            
            pod_statuses = []
            for pod in pods.items:
                pod_statuses.append({
                    'name': pod.metadata.name,
                    'phase': pod.status.phase,
                    'ready': all(
                        condition.status == "True" 
                        for condition in (pod.status.conditions or [])
                        if condition.type == "Ready"
                    ),
                    'created': pod.metadata.creation_timestamp
                })
            
            return {
                'deployment_status': {
                    'ready_replicas': ready_replicas,
                    'total_replicas': total_replicas,
                    'available_replicas': deployment.status.available_replicas or 0,
                    'updated_replicas': deployment.status.updated_replicas or 0
                },
                'pod_statuses': pod_statuses,
                'service_endpoint': f"{service.metadata.name}.{self.namespace}.svc.cluster.local:8080",
                'overall_health': ready_replicas == total_replicas and ready_replicas > 0
            }
            
        except Exception as e:
            logger.error(f"Failed to get status for {instance.instance_id}: {e}")
            return {'error': str(e), 'overall_health': False}
    
    async def scale_module(self, instance: ModuleInstance, target_replicas: int) -> bool:
        """Scale module to target replica count"""
        try:
            # Update deployment
            deployment = self.apps_v1.read_namespaced_deployment(
                name=instance.deployment_name,
                namespace=self.namespace
            )
            
            deployment.spec.replicas = target_replicas
            
            self.apps_v1.patch_namespaced_deployment(
                name=instance.deployment_name,
                namespace=self.namespace,
                body=deployment
            )
            
            logger.info(f"Scaled {instance.deployment_name} to {target_replicas} replicas")
            return True
            
        except Exception as e:
            logger.error(f"Failed to scale {instance.deployment_name}: {e}")
            return False
    
    async def unload_module(self, instance: ModuleInstance) -> bool:
        """Remove module deployment from Kubernetes"""
        try:
            # Delete HPA
            try:
                self.autoscaling_v2.delete_namespaced_horizontal_pod_autoscaler(
                    name=f"{instance.deployment_name}-hpa",
                    namespace=self.namespace
                )
            except client.ApiException:
                pass  # HPA might not exist
            
            # Delete service
            self.core_v1.delete_namespaced_service(
                name=instance.service_name,
                namespace=self.namespace
            )
            
            # Delete deployment
            self.apps_v1.delete_namespaced_deployment(
                name=instance.deployment_name,
                namespace=self.namespace
            )
            
            logger.info(f"Unloaded module {instance.instance_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unload module {instance.instance_id}: {e}")
            return False

class ModuleLoader:
    """Main dynamic module loading system"""
    
    def __init__(self, config_path: str = "config/module-specs"):
        self.config_path = Path(config_path)
        self.k8s_manager = KubernetesManager()
        self.usage_predictor = UsagePredictor()
        
        # Module registry
        self.module_specs: Dict[str, ModuleSpec] = {}
        self.loaded_modules: Dict[str, ModuleInstance] = {}
        
        # Loading configuration
        self.loading_strategy = LoadingStrategy.ON_DEMAND
        self.max_concurrent_loads = 3
        self.module_idle_timeout = timedelta(minutes=30)
        self.health_check_interval = timedelta(seconds=30)
        
        # Background tasks
        self.background_tasks: Set[asyncio.Task] = set()
        
        # Load module specifications
        self._load_module_specs()
        
        # Start background processes
        self._start_background_tasks()
    
    def _load_module_specs(self):
        """Load all module specifications from config files"""
        if not self.config_path.exists():
            logger.warning(f"Module specs directory not found: {self.config_path}")
            return
        
        for spec_file in self.config_path.glob("*.yaml"):
            try:
                module_spec = ModuleSpec.from_yaml(str(spec_file))
                self.module_specs[module_spec.module_id] = module_spec
                logger.info(f"Loaded spec for module: {module_spec.module_id}")
            except Exception as e:
                logger.error(f"Failed to load spec from {spec_file}: {e}")
    
    def _start_background_tasks(self):
        """Start background monitoring and management tasks"""
        # Health monitoring task
        task = asyncio.create_task(self._health_monitor_loop())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)
        
        # Predictive loading task
        if self.loading_strategy in [LoadingStrategy.PREDICTIVE, LoadingStrategy.PREEMPTIVE]:
            task = asyncio.create_task(self._predictive_loading_loop())
            self.background_tasks.add(task)
            task.add_done_callback(self.background_tasks.discard)
        
        # Cleanup task
        task = asyncio.create_task(self._cleanup_loop())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)
    
    async def load_module(self, module_id: str, force: bool = False) -> Optional[ModuleInstance]:
        """Load a module dynamically"""
        if module_id in self.loaded_modules and not force:
            instance = self.loaded_modules[module_id]
            if instance.state == ModuleState.LOADED:
                return instance
        
        if module_id not in self.module_specs:
            logger.error(f"No specification found for module: {module_id}")
            return None
        
        module_spec = self.module_specs[module_id]
        
        try:
            logger.info(f"Loading module: {module_id}")
            
            # Check dependencies
            await self._ensure_dependencies(module_spec)
            
            # Deploy module
            instance = await self.k8s_manager.deploy_module(module_spec)
            self.loaded_modules[module_id] = instance
            
            # Wait for module to be ready
            await self._wait_for_ready(instance)
            
            instance.state = ModuleState.LOADED
            logger.info(f"Module {module_id} loaded successfully")
            
            return instance
            
        except Exception as e:
            logger.error(f"Failed to load module {module_id}: {e}")
            if module_id in self.loaded_modules:
                self.loaded_modules[module_id].state = ModuleState.ERROR
            return None
    
    async def _ensure_dependencies(self, module_spec: ModuleSpec):
        """Ensure all module dependencies are loaded"""
        for dep_module_id in module_spec.dependencies:
            if dep_module_id not in self.loaded_modules:
                logger.info(f"Loading dependency: {dep_module_id}")
                await self.load_module(dep_module_id)
    
    async def _wait_for_ready(self, instance: ModuleInstance, timeout: int = 300):
        """Wait for module to be ready"""
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            status = await self.k8s_manager.get_module_status(instance)
            
            if status.get('overall_health', False):
                instance.health_status = True
                instance.last_health_check = datetime.utcnow()
                return
            
            await asyncio.sleep(5)
        
        raise TimeoutError(f"Module {instance.module_spec.module_id} failed to become ready within {timeout} seconds")
    
    async def unload_module(self, module_id: str) -> bool:
        """Unload a module"""
        if module_id not in self.loaded_modules:
            return True
        
        instance = self.loaded_modules[module_id]
        instance.state = ModuleState.UNLOADING
        
        try:
            success = await self.k8s_manager.unload_module(instance)
            if success:
                del self.loaded_modules[module_id]
                logger.info(f"Module {module_id} unloaded successfully")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to unload module {module_id}: {e}")
            instance.state = ModuleState.ERROR
            return False
    
    async def get_or_load_module(self, module_id: str) -> Optional[ModuleInstance]:
        """Get module if loaded, otherwise load it"""
        if module_id in self.loaded_modules:
            instance = self.loaded_modules[module_id]
            if instance.state == ModuleState.LOADED and instance.health_status:
                return instance
        
        return await self.load_module(module_id)
    
    def record_module_usage(self, module_id: str, request_count: int = 1, 
                           response_time: float = 0.0):
        """Record module usage for prediction"""
        self.usage_predictor.record_usage(
            module_id, datetime.utcnow(), request_count, response_time
        )
        
        # Update instance metrics
        if module_id in self.loaded_modules:
            instance = self.loaded_modules[module_id]
            instance.request_count += request_count
            
            # Update rolling average response time
            if instance.request_count > 1:
                instance.avg_response_time = (
                    (instance.avg_response_time * (instance.request_count - 1) + response_time) /
                    instance.request_count
                )
            else:
                instance.avg_response_time = response_time
    
    async def _health_monitor_loop(self):
        """Background task to monitor module health"""
        while True:
            try:
                for module_id, instance in list(self.loaded_modules.items()):
                    if instance.state == ModuleState.LOADED:
                        status = await self.k8s_manager.get_module_status(instance)
                        instance.health_status = status.get('overall_health', False)
                        instance.last_health_check = datetime.utcnow()
                        
                        if not instance.health_status:
                            logger.warning(f"Module {module_id} health check failed")
                            instance.error_count += 1
                
                await asyncio.sleep(self.health_check_interval.total_seconds())
                
            except Exception as e:
                logger.error(f"Error in health monitor loop: {e}")
                await asyncio.sleep(60)
    
    async def _predictive_loading_loop(self):
        """Background task for predictive module loading"""
        while True:
            try:
                for module_id in self.module_specs:
                    if module_id not in self.loaded_modules:
                        recommendation = self.usage_predictor.get_loading_recommendation(module_id)
                        
                        if recommendation['should_load'] and recommendation['confidence'] > 0.7:
                            logger.info(f"Predictively loading module {module_id}: {recommendation['reason']}")
                            await self.load_module(module_id)
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Error in predictive loading loop: {e}")
                await asyncio.sleep(300)
    
    async def _cleanup_loop(self):
        """Background task to cleanup idle modules"""
        while True:
            try:
                current_time = datetime.utcnow()
                
                for module_id, instance in list(self.loaded_modules.items()):
                    # Skip if module is in use recently
                    prediction = self.usage_predictor.predict_usage(module_id)
                    time_since_last_request = current_time - prediction.last_request_time
                    
                    if (time_since_last_request > self.module_idle_timeout and 
                        prediction.request_frequency < 1.0):  # Less than 1 request per minute
                        
                        logger.info(f"Unloading idle module: {module_id}")
                        await self.unload_module(module_id)
                
                await asyncio.sleep(600)  # Check every 10 minutes
                
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
                await asyncio.sleep(600)
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        status = {
            'timestamp': datetime.utcnow().isoformat(),
            'loading_strategy': self.loading_strategy.value,
            'total_specs': len(self.module_specs),
            'loaded_modules': len(self.loaded_modules),
            'module_details': {}
        }
        
        for module_id, instance in self.loaded_modules.items():
            k8s_status = await self.k8s_manager.get_module_status(instance)
            
            status['module_details'][module_id] = {
                'state': instance.state.value,
                'health_status': instance.health_status,
                'request_count': instance.request_count,
                'error_count': instance.error_count,
                'avg_response_time': instance.avg_response_time,
                'current_replicas': k8s_status.get('deployment_status', {}).get('ready_replicas', 0),
                'endpoint': instance.endpoint,
                'created_at': instance.created_at.isoformat(),
                'last_health_check': instance.last_health_check.isoformat() if instance.last_health_check else None
            }
        
        return status
    
    async def shutdown(self):
        """Graceful shutdown of the module loader"""
        logger.info("Shutting down module loader...")
        
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.background_tasks:
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        # Unload all modules
        for module_id in list(self.loaded_modules.keys()):
            await self.unload_module(module_id)
        
        logger.info("Module loader shutdown complete")

# Example usage
if __name__ == "__main__":
    async def main():
        # Create module loader
        loader = ModuleLoader()
        
        # Example: Load a module
        instance = await loader.load_module("business-operations")
        if instance:
            print(f"Loaded module: {instance.instance_id}")
            
            # Simulate usage
            loader.record_module_usage("business-operations", 1, 150.0)
            
            # Get status
            status = await loader.get_system_status()
            print(f"System status: {json.dumps(status, indent=2)}")
        
        # Cleanup
        await loader.shutdown()

    # Run example
    asyncio.run(main())
