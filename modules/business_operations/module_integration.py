"""
Business Operations Module Orchestrator Integration

Integration layer that connects the business operations module with
the overall Frontier system orchestrator, providing seamless access
to business analysis capabilities across the platform.
"""

from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from .core import FrontierBusinessOperations, BusinessDomain, AnalysisType

class IntegrationStatus(Enum):
    """Integration status levels"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    INITIALIZING = "initializing"

@dataclass
class ModuleIntegration:
    """Module integration configuration"""
    module_name: str
    version: str
    status: IntegrationStatus
    capabilities: List[str]
    last_health_check: datetime
    error_message: Optional[str] = None

class BusinessOperationsOrchestrator:
    """
    Integration orchestrator for business operations module
    
    Provides standardized interface for module discovery, health monitoring,
    and capability routing within the broader Frontier ecosystem.
    """
    
    def __init__(self):
        self.module_name = "business_operations"
        self.version = "1.0.0"
        self.business_ops = None
        self.integration_status = IntegrationStatus.INITIALIZING
        self.last_health_check = datetime.now()
        self.supported_capabilities = []
        
    def initialize_module(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Initialize the business operations module
        
        Args:
            config_path: Optional path to configuration file
            
        Returns:
            Initialization results and module status
        """
        try:
            # Initialize business operations module
            self.business_ops = FrontierBusinessOperations(config_path)
            
            # Get supported capabilities
            self.supported_capabilities = self._discover_capabilities()
            
            # Update status
            self.integration_status = IntegrationStatus.CONNECTED
            self.last_health_check = datetime.now()
            
            return {
                'status': 'success',
                'module_name': self.module_name,
                'version': self.version,
                'capabilities': self.supported_capabilities,
                'integration_status': self.integration_status.value,
                'initialization_time': datetime.now()
            }
            
        except Exception as e:
            self.integration_status = IntegrationStatus.ERROR
            return {
                'status': 'error',
                'module_name': self.module_name,
                'error_message': str(e),
                'integration_status': self.integration_status.value
            }
    
    def get_module_info(self) -> ModuleIntegration:
        """Get module integration information"""
        return ModuleIntegration(
            module_name=self.module_name,
            version=self.version,
            status=self.integration_status,
            capabilities=self.supported_capabilities,
            last_health_check=self.last_health_check,
            error_message=None if self.integration_status != IntegrationStatus.ERROR else "Module error"
        )
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform module health check
        
        Returns:
            Health status and performance metrics
        """
        try:
            if not self.business_ops:
                return {
                    'status': 'unhealthy',
                    'message': 'Module not initialized',
                    'timestamp': datetime.now()
                }
            
            # Perform health check
            health_status = self.business_ops.health_check()
            
            # Update integration status
            if health_status.get('status') == 'healthy':
                self.integration_status = IntegrationStatus.CONNECTED
            else:
                self.integration_status = IntegrationStatus.ERROR
            
            self.last_health_check = datetime.now()
            
            return {
                'status': health_status.get('status', 'unknown'),
                'module_name': self.module_name,
                'capabilities_status': health_status.get('capabilities', {}),
                'performance_metrics': health_status.get('performance_metrics', {}),
                'timestamp': self.last_health_check,
                'integration_status': self.integration_status.value
            }
            
        except Exception as e:
            self.integration_status = IntegrationStatus.ERROR
            return {
                'status': 'unhealthy',
                'module_name': self.module_name,
                'error_message': str(e),
                'timestamp': datetime.now(),
                'integration_status': self.integration_status.value
            }
    
    def process_analysis_request(
        self,
        analysis_type: str,
        business_context: Dict[str, Any],
        analysis_parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process business analysis request through orchestrator
        
        Args:
            analysis_type: Type of analysis to perform
            business_context: Business context for analysis
            analysis_parameters: Additional analysis parameters
            
        Returns:
            Analysis results or error information
        """
        try:
            if not self.business_ops:
                return {
                    'status': 'error',
                    'message': 'Business operations module not initialized',
                    'timestamp': datetime.now()
                }
            
            # Validate analysis type
            if not self._validate_analysis_type(analysis_type):
                return {
                    'status': 'error',
                    'message': f'Unsupported analysis type: {analysis_type}',
                    'supported_types': [at.value for at in AnalysisType],
                    'timestamp': datetime.now()
                }
            
            # Create analysis request
            analysis_request = {
                'analysis_type': analysis_type,
                'business_context': business_context,
                'parameters': analysis_parameters or {},
                'request_id': f"req_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'timestamp': datetime.now()
            }
            
            # Process analysis
            results = self.business_ops.analyze(
                business_context=business_context,
                analysis_type=analysis_type,
                **analysis_request['parameters']
            )
            
            # Add orchestrator metadata
            results['orchestrator_metadata'] = {
                'module_name': self.module_name,
                'module_version': self.version,
                'request_id': analysis_request['request_id'],
                'processing_time': datetime.now(),
                'integration_status': self.integration_status.value
            }
            
            return results
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Analysis processing failed: {str(e)}',
                'analysis_type': analysis_type,
                'timestamp': datetime.now(),
                'orchestrator_metadata': {
                    'module_name': self.module_name,
                    'error_type': type(e).__name__
                }
            }
    
    def get_capability_info(self, capability_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about module capabilities
        
        Args:
            capability_name: Specific capability to query (optional)
            
        Returns:
            Capability information and metadata
        """
        try:
            if not self.business_ops:
                return {
                    'status': 'error',
                    'message': 'Module not initialized'
                }
            
            if capability_name:
                # Get specific capability info
                capability_info = self.business_ops.get_capability_info(capability_name)
                return {
                    'status': 'success',
                    'capability': capability_name,
                    'info': capability_info,
                    'module_name': self.module_name
                }
            else:
                # Get all capabilities info
                all_capabilities = {}
                for capability in self.supported_capabilities:
                    all_capabilities[capability] = self.business_ops.get_capability_info(capability)
                
                return {
                    'status': 'success',
                    'module_name': self.module_name,
                    'capabilities': all_capabilities,
                    'total_capabilities': len(self.supported_capabilities)
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to get capability info: {str(e)}',
                'module_name': self.module_name
            }
    
    def list_supported_domains(self) -> Dict[str, Any]:
        """
        List supported business domains and their capabilities
        
        Returns:
            Domain information and capabilities
        """
        try:
            if not self.business_ops:
                return {
                    'status': 'error',
                    'message': 'Module not initialized'
                }
            
            # Get domain information
            domains = {}
            for domain in BusinessDomain:
                domain_info = self.business_ops.get_domain_capabilities(domain.value)
                domains[domain.value] = domain_info
            
            return {
                'status': 'success',
                'module_name': self.module_name,
                'supported_domains': domains,
                'total_domains': len(domains)
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to list domains: {str(e)}',
                'module_name': self.module_name
            }
    
    def _discover_capabilities(self) -> List[str]:
        """Discover available capabilities in the module"""
        if not self.business_ops:
            return []
        
        capabilities = []
        
        # Core capabilities
        for analysis_type in AnalysisType:
            capabilities.append(analysis_type.value)
        
        # Domain capabilities
        for domain in BusinessDomain:
            capabilities.append(f"domain_{domain.value}")
        
        return capabilities
    
    def _validate_analysis_type(self, analysis_type: str) -> bool:
        """Validate that analysis type is supported"""
        supported_types = [at.value for at in AnalysisType]
        return analysis_type in supported_types
    
    def shutdown(self) -> Dict[str, Any]:
        """
        Gracefully shutdown the module
        
        Returns:
            Shutdown status and cleanup results
        """
        try:
            shutdown_time = datetime.now()
            
            # Perform cleanup if needed
            if self.business_ops:
                # Module cleanup would go here
                pass
            
            # Update status
            self.integration_status = IntegrationStatus.DISCONNECTED
            self.business_ops = None
            
            return {
                'status': 'success',
                'message': 'Module shutdown completed',
                'module_name': self.module_name,
                'shutdown_time': shutdown_time,
                'integration_status': self.integration_status.value
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Shutdown failed: {str(e)}',
                'module_name': self.module_name,
                'integration_status': self.integration_status.value
            }

# Global orchestrator instance
_business_ops_orchestrator = None

def get_business_operations_orchestrator() -> BusinessOperationsOrchestrator:
    """Get or create the global business operations orchestrator instance"""
    global _business_ops_orchestrator
    
    if _business_ops_orchestrator is None:
        _business_ops_orchestrator = BusinessOperationsOrchestrator()
    
    return _business_ops_orchestrator

def register_with_module_registry(registry: Dict[str, Any]) -> bool:
    """
    Register business operations module with the main module registry
    
    Args:
        registry: Main Frontier module registry
        
    Returns:
        Registration success status
    """
    try:
        orchestrator = get_business_operations_orchestrator()
        
        # Register module in registry
        registry['business_operations'] = {
            'orchestrator': orchestrator,
            'module_info': orchestrator.get_module_info(),
            'initialization_function': orchestrator.initialize_module,
            'health_check_function': orchestrator.health_check,
            'shutdown_function': orchestrator.shutdown,
            'supported_capabilities': orchestrator.supported_capabilities,
            'module_type': 'business_intelligence',
            'priority': 'high',
            'dependencies': [],
            'registration_time': datetime.now()
        }
        
        return True
        
    except Exception as e:
        print(f"Failed to register business operations module: {str(e)}")
        return False
