"""
Frontier Business Operations Core Module
Main orchestrator for business operations capabilities
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import yaml
import os

logger = logging.getLogger(__name__)

class BusinessDomain(Enum):
    FINANCE_BANKING = "finance_banking"
    HEALTHCARE_BUSINESS = "healthcare_business"
    MANUFACTURING_OPERATIONS = "manufacturing_operations"
    TECHNOLOGY_BUSINESS = "technology_business"
    GENERAL = "general"

class AnalysisType(Enum):
    FINANCIAL = "financial_analysis"
    STRATEGIC = "strategic_planning"
    OPERATIONAL = "operations_management"
    DECISION_SUPPORT = "decision_support"
    COMPLIANCE = "compliance_governance"
    RISK_MANAGEMENT = "compliance_risk_management"

@dataclass
class BusinessContext:
    """Context information for business analysis"""
    company_name: str
    industry: str
    company_size: str  # small, medium, large, enterprise
    domain: BusinessDomain
    region: str
    regulatory_environment: List[str]
    business_model: str
    revenue_model: str
    primary_markets: List[str]
    key_stakeholders: List[str]
    current_challenges: List[str]
    strategic_objectives: List[str]

@dataclass
class AnalysisRequest:
    """Request structure for business analysis"""
    analysis_type: AnalysisType
    context: BusinessContext
    specific_requirements: Dict[str, Any]
    data_sources: List[str]
    output_format: str = "comprehensive"
    priority: str = "normal"  # low, normal, high, urgent
    deadline: Optional[datetime] = None

@dataclass
class AnalysisResult:
    """Result structure for business analysis"""
    request_id: str
    analysis_type: AnalysisType
    timestamp: datetime
    context: BusinessContext
    findings: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]
    confidence_score: float
    supporting_data: Dict[str, Any]
    next_steps: List[str]
    executive_summary: str

class FrontierBusinessOperations:
    """
    Main orchestrator for Frontier Business Operations Module
    Coordinates all business capabilities and domain extensions
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = self._load_config(config_path)
        self.capabilities = {}
        self.domain_extensions = {}
        self.active_requests = {}
        
        # Performance metrics
        self.metrics = {
            "total_analyses": 0,
            "success_rate": 0.0,
            "average_confidence": 0.0,
            "response_time_avg": 0.0
        }
        
        # Initialize all capabilities
        self._initialize_capabilities()
        self._initialize_domain_extensions()
        
        logger.info("Frontier Business Operations Module initialized successfully")
    
    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            if config_path is None:
                config_path = os.path.join(
                    os.path.dirname(__file__), 
                    "..", 
                    "business-operations-config.yaml"
                )
            
            with open(config_path, 'r') as file:
                config = yaml.safe_load(file)
            
            logger.info(f"Configuration loaded from {config_path}")
            return config
            
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            # Return default configuration
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration if file loading fails"""
        return {
            "module_name": "frontier-biz",
            "version": "1.0.0",
            "capabilities": {
                "financial_analysis": ["financial_statement_analysis", "ratio_analysis"],
                "strategic_planning": ["swot_analysis", "market_analysis"],
                "operations_management": ["process_optimization", "supply_chain_analysis"],
                "decision_support": ["data_driven_insights", "predictive_analytics"],
                "compliance_governance": ["regulatory_compliance", "risk_management"]
            }
        }
    
    def _initialize_capabilities(self):
        """Initialize all business capabilities"""
        try:
            # Import capability classes
            from .financial_analysis import FinancialAnalysisCapability
            from .strategic_planning import StrategicPlanningCapability
            from .operations_management import OperationsManagementCapability
            from .decision_support import DecisionSupportCapability
            from .compliance_governance import ComplianceGovernanceCapability
            
            # Initialize capabilities
            self.capabilities[AnalysisType.FINANCIAL] = FinancialAnalysisCapability(self.config)
            self.capabilities[AnalysisType.STRATEGIC] = StrategicPlanningCapability(self.config)
            self.capabilities[AnalysisType.OPERATIONAL] = OperationsManagementCapability(self.config)
            self.capabilities[AnalysisType.DECISION_SUPPORT] = DecisionSupportCapability(self.config)
            self.capabilities[AnalysisType.COMPLIANCE] = ComplianceGovernanceCapability(self.config)
            
            logger.info("All business capabilities initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing capabilities: {e}")
            raise
    
    def _initialize_domain_extensions(self):
        """Initialize domain-specific extensions"""
        try:
            from .domain_extensions import (
                FinanceBankingExtension,
                HealthcareBusinessExtension,
                ManufacturingOperationsExtension,
                TechnologyBusinessExtension
            )
            
            # Initialize domain extensions
            self.domain_extensions[BusinessDomain.FINANCE_BANKING] = FinanceBankingExtension(self.config)
            self.domain_extensions[BusinessDomain.HEALTHCARE_BUSINESS] = HealthcareBusinessExtension(self.config)
            self.domain_extensions[BusinessDomain.MANUFACTURING_OPERATIONS] = ManufacturingOperationsExtension(self.config)
            self.domain_extensions[BusinessDomain.TECHNOLOGY_BUSINESS] = TechnologyBusinessExtension(self.config)
            
            logger.info("All domain extensions initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing domain extensions: {e}")
            raise
    
    async def analyze(self, request: AnalysisRequest) -> AnalysisResult:
        """
        Conduct comprehensive business analysis
        
        Args:
            request: AnalysisRequest object with analysis parameters
            
        Returns:
            AnalysisResult object with findings and recommendations
        """
        try:
            start_time = datetime.now()
            request_id = f"analysis_{start_time.strftime('%Y%m%d_%H%M%S_%f')}"
            
            logger.info(f"Starting analysis {request_id} - Type: {request.analysis_type.value}")
            
            # Store active request
            self.active_requests[request_id] = {
                "request": request,
                "start_time": start_time,
                "status": "processing"
            }
            
            # Get appropriate capability
            capability = self.capabilities.get(request.analysis_type)
            if not capability:
                raise ValueError(f"Unsupported analysis type: {request.analysis_type}")
            
            # Get domain extension if applicable
            domain_extension = self.domain_extensions.get(request.context.domain)
            
            # Conduct core analysis
            core_analysis = await capability.analyze(request.context, request.specific_requirements)
            
            # Apply domain-specific enhancements
            if domain_extension:
                enhanced_analysis = await domain_extension.enhance_analysis(
                    core_analysis, request.context, request.analysis_type
                )
            else:
                enhanced_analysis = core_analysis
            
            # Generate comprehensive result
            result = self._generate_analysis_result(
                request_id, request, enhanced_analysis, start_time
            )
            
            # Update metrics
            self._update_metrics(result, start_time)
            
            # Clean up active request
            self.active_requests[request_id]["status"] = "completed"
            
            logger.info(f"Analysis {request_id} completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error in analysis {request_id}: {e}")
            self.active_requests[request_id]["status"] = "error"
            raise
    
    def _generate_analysis_result(
        self,
        request_id: str,
        request: AnalysisRequest,
        analysis_data: Dict[str, Any],
        start_time: datetime
    ) -> AnalysisResult:
        """Generate comprehensive analysis result"""
        
        # Extract key components from analysis
        findings = analysis_data.get("findings", {})
        recommendations = analysis_data.get("recommendations", [])
        risk_assessment = analysis_data.get("risk_assessment", {})
        confidence_score = analysis_data.get("confidence_score", 0.85)
        supporting_data = analysis_data.get("supporting_data", {})
        
        # Generate next steps
        next_steps = self._generate_next_steps(recommendations, request.analysis_type)
        
        # Generate executive summary
        executive_summary = self._generate_executive_summary(
            findings, recommendations, request.context
        )
        
        return AnalysisResult(
            request_id=request_id,
            analysis_type=request.analysis_type,
            timestamp=datetime.now(),
            context=request.context,
            findings=findings,
            recommendations=recommendations,
            risk_assessment=risk_assessment,
            confidence_score=confidence_score,
            supporting_data=supporting_data,
            next_steps=next_steps,
            executive_summary=executive_summary
        )
    
    def _generate_next_steps(
        self,
        recommendations: List[Dict[str, Any]],
        analysis_type: AnalysisType
    ) -> List[str]:
        """Generate actionable next steps based on recommendations"""
        
        next_steps = []
        
        # Priority recommendations first
        priority_recs = [r for r in recommendations if r.get("priority", "medium") == "high"]
        
        for rec in priority_recs[:3]:  # Top 3 priority items
            next_steps.append(f"Implement {rec.get('action', 'recommended action')}")
        
        # Add analysis-specific next steps
        if analysis_type == AnalysisType.FINANCIAL:
            next_steps.append("Schedule quarterly financial review")
            next_steps.append("Update financial forecasting models")
        elif analysis_type == AnalysisType.STRATEGIC:
            next_steps.append("Conduct stakeholder alignment sessions")
            next_steps.append("Develop detailed implementation roadmap")
        elif analysis_type == AnalysisType.OPERATIONAL:
            next_steps.append("Establish performance monitoring KPIs")
            next_steps.append("Schedule process optimization reviews")
        
        return next_steps[:5]  # Limit to 5 next steps
    
    def _generate_executive_summary(
        self,
        findings: Dict[str, Any],
        recommendations: List[Dict[str, Any]],
        context: BusinessContext
    ) -> str:
        """Generate executive summary of analysis"""
        
        summary_parts = []
        
        # Context
        summary_parts.append(
            f"Analysis conducted for {context.company_name} in the {context.industry} industry."
        )
        
        # Key findings
        if findings:
            key_findings = list(findings.keys())[:3]
            summary_parts.append(
                f"Key findings include: {', '.join(key_findings)}."
            )
        
        # Recommendations count
        if recommendations:
            high_priority = len([r for r in recommendations if r.get("priority") == "high"])
            summary_parts.append(
                f"Analysis generated {len(recommendations)} recommendations, "
                f"with {high_priority} classified as high priority."
            )
        
        # Call to action
        summary_parts.append(
            "Immediate action is recommended on high-priority items to maximize impact."
        )
        
        return " ".join(summary_parts)
    
    def _update_metrics(self, result: AnalysisResult, start_time: datetime):
        """Update performance metrics"""
        self.metrics["total_analyses"] += 1
        
        # Update confidence score average
        total_confidence = (
            self.metrics["average_confidence"] * (self.metrics["total_analyses"] - 1) +
            result.confidence_score
        )
        self.metrics["average_confidence"] = total_confidence / self.metrics["total_analyses"]
        
        # Update response time
        response_time = (datetime.now() - start_time).total_seconds()
        total_response_time = (
            self.metrics["response_time_avg"] * (self.metrics["total_analyses"] - 1) +
            response_time
        )
        self.metrics["response_time_avg"] = total_response_time / self.metrics["total_analyses"]
        
        # Update success rate (assuming success if confidence > 0.7)
        successful_analyses = sum(1 for _ in range(self.metrics["total_analyses"]) 
                                if result.confidence_score > 0.7)
        self.metrics["success_rate"] = successful_analyses / self.metrics["total_analyses"]
    
    async def get_capability_info(self, analysis_type: AnalysisType) -> Dict[str, Any]:
        """Get information about a specific capability"""
        capability = self.capabilities.get(analysis_type)
        if not capability:
            raise ValueError(f"Capability not found: {analysis_type}")
        
        return await capability.get_capability_info()
    
    def get_domain_info(self, domain: BusinessDomain) -> Dict[str, Any]:
        """Get information about a domain extension"""
        extension = self.domain_extensions.get(domain)
        if not extension:
            raise ValueError(f"Domain extension not found: {domain}")
        
        return extension.get_domain_info()
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status and metrics"""
        return {
            "module_name": self.config.get("module_name", "frontier-biz"),
            "version": self.config.get("version", "1.0.0"),
            "status": "operational",
            "capabilities_loaded": len(self.capabilities),
            "domain_extensions_loaded": len(self.domain_extensions),
            "active_requests": len([r for r in self.active_requests.values() 
                                 if r["status"] == "processing"]),
            "performance_metrics": self.metrics,
            "uptime": datetime.now().isoformat()
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform system health check"""
        health_status = {
            "overall_status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "components": {}
        }
        
        # Check each capability
        for analysis_type, capability in self.capabilities.items():
            try:
                capability_health = await capability.health_check()
                health_status["components"][analysis_type.value] = capability_health
            except Exception as e:
                health_status["components"][analysis_type.value] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
                health_status["overall_status"] = "degraded"
        
        # Check domain extensions
        for domain, extension in self.domain_extensions.items():
            try:
                extension_health = extension.health_check()
                health_status["components"][f"domain_{domain.value}"] = extension_health
            except Exception as e:
                health_status["components"][f"domain_{domain.value}"] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
                health_status["overall_status"] = "degraded"
        
        return health_status
    
    def export_analysis(self, request_id: str, format: str = "json") -> str:
        """Export analysis results in specified format"""
        if request_id not in self.active_requests:
            raise ValueError(f"Analysis request not found: {request_id}")
        
        request_data = self.active_requests[request_id]
        
        if format == "json":
            return json.dumps(request_data, indent=2, default=str)
        elif format == "yaml":
            return yaml.dump(request_data, default_flow_style=False)
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    async def batch_analyze(self, requests: List[AnalysisRequest]) -> List[AnalysisResult]:
        """Conduct batch analysis of multiple requests"""
        logger.info(f"Starting batch analysis of {len(requests)} requests")
        
        # Process requests concurrently
        tasks = [self.analyze(request) for request in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and log errors
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error in batch request {i}: {result}")
            else:
                valid_results.append(result)
        
        logger.info(f"Batch analysis completed: {len(valid_results)}/{len(requests)} successful")
        return valid_results
