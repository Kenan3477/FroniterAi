"""
Compliance and Risk Management API Integration
REST API endpoints for compliance and risk management functionality
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import logging

from .compliance_risk_management import ComplianceRiskManagement, IndustryType, ComplianceFramework
from .industry_specific_compliance import IndustrySpecificCompliance
from .advanced_risk_assessment import AdvancedRiskAssessment, RiskCategory
from .policy_document_generator import (
    AutomatedPolicyGenerator, OrganizationProfile, 
    DocumentType, JurisdictionType
)

logger = logging.getLogger(__name__)

# Pydantic models for API requests/responses
class ComplianceAssessmentRequest(BaseModel):
    organization_name: str
    industry: str
    frameworks: List[str]
    organization_data: Dict[str, Any] = Field(default_factory=dict)

class ComplianceAssessmentResponse(BaseModel):
    assessment_id: str
    organization: str
    industry: str
    overall_score: float
    compliance_status: str
    framework_results: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    assessment_date: str

class RiskAssessmentRequest(BaseModel):
    organization_name: str
    assessment_type: str = "comprehensive"
    organization_data: Dict[str, Any] = Field(default_factory=dict)
    include_scenarios: bool = True

class RiskAssessmentResponse(BaseModel):
    assessment_id: str
    organization: str
    overall_risk_profile: Dict[str, Any]
    risk_categories: Dict[str, Any]
    key_risks: List[Dict[str, Any]]
    risk_scenarios: Optional[Dict[str, Any]] = None
    recommendations: List[Dict[str, Any]]

class PolicyGenerationRequest(BaseModel):
    organization_name: str
    legal_name: str
    industry: str
    jurisdiction: str
    business_type: str
    website_url: str
    contact_email: str
    contact_address: str
    document_type: str
    data_types_collected: List[str] = Field(default_factory=list)
    data_processing_purposes: List[str] = Field(default_factory=list)
    custom_clauses: Optional[List[str]] = None

class PolicyGenerationResponse(BaseModel):
    document_id: str
    document_type: str
    organization: str
    jurisdiction: str
    effective_date: str
    content: str
    validation: Dict[str, Any]
    compliance_score: float

class RegulatoryMonitoringRequest(BaseModel):
    industry: str
    jurisdictions: List[str]
    frameworks: List[str]
    monitoring_keywords: List[str] = Field(default_factory=list)

class RegulatoryMonitoringResponse(BaseModel):
    monitoring_id: str
    industry: str
    jurisdictions: List[str]
    frameworks: List[str]
    recent_changes: List[Dict[str, Any]]
    impact_assessments: List[Dict[str, Any]]
    recommendations: List[str]

class ComplianceRiskAPI:
    """
    API integration layer for compliance and risk management
    """
    
    def __init__(self):
        self.app = FastAPI(
            title="Compliance and Risk Management API",
            description="Enterprise compliance and risk management system",
            version="1.0.0"
        )
        
        # Initialize core modules
        self.compliance_manager = ComplianceRiskManagement()
        self.industry_compliance = IndustrySpecificCompliance()
        self.risk_assessment = AdvancedRiskAssessment()
        self.policy_generator = AutomatedPolicyGenerator()
        
        # Setup routes
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.post("/api/v1/business/compliance-risk-mgmt/assess", 
                      response_model=ComplianceAssessmentResponse)
        async def conduct_compliance_assessment(
            request: ComplianceAssessmentRequest,
            background_tasks: BackgroundTasks
        ):
            """Conduct comprehensive compliance assessment"""
            try:
                logger.info(f"Starting compliance assessment for {request.organization_name}")
                
                # Map string to enum
                industry = IndustryType(request.industry.lower().replace(" ", "_"))
                frameworks = [ComplianceFramework(f.upper()) for f in request.frameworks]
                
                # Conduct assessment
                result = await self.compliance_manager.conduct_compliance_assessment(
                    industry=industry,
                    frameworks=frameworks,
                    organization_data=request.organization_data
                )
                
                # Generate recommendations
                recommendations = await self.compliance_manager.generate_compliance_recommendations(
                    result
                )
                
                # Schedule background update
                background_tasks.add_task(
                    self._update_compliance_database,
                    request.organization_name,
                    result
                )
                
                return ComplianceAssessmentResponse(
                    assessment_id=result["assessment_id"],
                    organization=request.organization_name,
                    industry=request.industry,
                    overall_score=result["overall_score"],
                    compliance_status=result["compliance_status"],
                    framework_results=result["framework_results"],
                    recommendations=recommendations,
                    assessment_date=result["assessment_date"]
                )
                
            except Exception as e:
                logger.error(f"Error in compliance assessment: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/industry-compliance/assess",
                      response_model=ComplianceAssessmentResponse)
        async def conduct_industry_specific_assessment(
            request: ComplianceAssessmentRequest
        ):
            """Conduct industry-specific compliance assessment"""
            try:
                logger.info(f"Starting industry-specific assessment for {request.organization_name}")
                
                industry = IndustryType(request.industry.lower().replace(" ", "_"))
                
                result = await self.industry_compliance.conduct_industry_specific_assessment(
                    industry=industry,
                    organization_data=request.organization_data
                )
                
                return ComplianceAssessmentResponse(
                    assessment_id=f"industry_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    organization=request.organization_name,
                    industry=request.industry,
                    overall_score=result.get("overall_score", 0),
                    compliance_status="Compliant" if result.get("overall_score", 0) >= 80 else "Non-Compliant",
                    framework_results=result,
                    recommendations=[],
                    assessment_date=result.get("assessment_date", datetime.now().isoformat())
                )
                
            except Exception as e:
                logger.error(f"Error in industry assessment: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/risk-assessment/comprehensive",
                      response_model=RiskAssessmentResponse)
        async def conduct_risk_assessment(
            request: RiskAssessmentRequest,
            background_tasks: BackgroundTasks
        ):
            """Conduct comprehensive risk assessment"""
            try:
                logger.info(f"Starting risk assessment for {request.organization_name}")
                
                result = await self.risk_assessment.conduct_comprehensive_risk_assessment(
                    organization_data=request.organization_data
                )
                
                # Schedule background risk monitoring
                background_tasks.add_task(
                    self._setup_risk_monitoring,
                    request.organization_name,
                    result
                )
                
                return RiskAssessmentResponse(
                    assessment_id=result["assessment_id"],
                    organization=request.organization_name,
                    overall_risk_profile=result["overall_risk_profile"],
                    risk_categories=result["risk_categories"],
                    key_risks=result["key_risks"],
                    risk_scenarios=result.get("risk_scenarios") if request.include_scenarios else None,
                    recommendations=result["recommendations"]
                )
                
            except Exception as e:
                logger.error(f"Error in risk assessment: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/policy-generator/privacy-policy",
                      response_model=PolicyGenerationResponse)
        async def generate_privacy_policy(
            request: PolicyGenerationRequest
        ):
            """Generate privacy policy document"""
            try:
                logger.info(f"Generating privacy policy for {request.organization_name}")
                
                # Create organization profile
                organization = OrganizationProfile(
                    name=request.organization_name,
                    legal_name=request.legal_name,
                    industry=request.industry,
                    jurisdiction=JurisdictionType(request.jurisdiction.lower().replace(" ", "_")),
                    business_type=request.business_type,
                    website_url=request.website_url,
                    contact_email=request.contact_email,
                    contact_address=request.contact_address,
                    data_types_collected=request.data_types_collected,
                    data_processing_purposes=request.data_processing_purposes
                )
                
                # Generate policy
                result = await self.policy_generator.generate_privacy_policy(
                    organization=organization,
                    custom_clauses=request.custom_clauses
                )
                
                # Calculate compliance score based on validation
                compliance_score = self._calculate_compliance_score(result["validation"])
                
                return PolicyGenerationResponse(
                    document_id=f"privacy_policy_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    document_type=result["document_type"],
                    organization=result["organization"],
                    jurisdiction=result["jurisdiction"],
                    effective_date=result["effective_date"],
                    content=result["content"],
                    validation=result["validation"],
                    compliance_score=compliance_score
                )
                
            except Exception as e:
                logger.error(f"Error generating privacy policy: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/policy-generator/terms-of-service",
                      response_model=PolicyGenerationResponse)
        async def generate_terms_of_service(
            request: PolicyGenerationRequest
        ):
            """Generate terms of service document"""
            try:
                logger.info(f"Generating terms of service for {request.organization_name}")
                
                # Create organization profile
                organization = OrganizationProfile(
                    name=request.organization_name,
                    legal_name=request.legal_name,
                    industry=request.industry,
                    jurisdiction=JurisdictionType(request.jurisdiction.lower().replace(" ", "_")),
                    business_type=request.business_type,
                    website_url=request.website_url,
                    contact_email=request.contact_email,
                    contact_address=request.contact_address
                )
                
                # Generate terms
                result = await self.policy_generator.generate_terms_of_service(
                    organization=organization
                )
                
                # Calculate compliance score
                compliance_score = self._calculate_compliance_score(result["validation"])
                
                return PolicyGenerationResponse(
                    document_id=f"terms_service_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    document_type=result["document_type"],
                    organization=result["organization"],
                    jurisdiction=result["jurisdiction"],
                    effective_date=result["effective_date"],
                    content=result["content"],
                    validation=result["validation"],
                    compliance_score=compliance_score
                )
                
            except Exception as e:
                logger.error(f"Error generating terms of service: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/regulatory-monitoring/setup",
                      response_model=RegulatoryMonitoringResponse)
        async def setup_regulatory_monitoring(
            request: RegulatoryMonitoringRequest,
            background_tasks: BackgroundTasks
        ):
            """Setup regulatory change monitoring"""
            try:
                logger.info(f"Setting up regulatory monitoring for {request.industry}")
                
                # Setup monitoring
                monitoring_id = f"monitoring_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                # Get recent regulatory changes
                recent_changes = await self.compliance_manager.monitor_regulatory_changes(
                    industry=IndustryType(request.industry.lower().replace(" ", "_")),
                    frameworks=[ComplianceFramework(f.upper()) for f in request.frameworks]
                )
                
                # Generate impact assessments
                impact_assessments = await self._generate_impact_assessments(
                    recent_changes, request.industry
                )
                
                # Schedule background monitoring
                background_tasks.add_task(
                    self._schedule_regulatory_monitoring,
                    monitoring_id,
                    request
                )
                
                return RegulatoryMonitoringResponse(
                    monitoring_id=monitoring_id,
                    industry=request.industry,
                    jurisdictions=request.jurisdictions,
                    frameworks=request.frameworks,
                    recent_changes=recent_changes,
                    impact_assessments=impact_assessments,
                    recommendations=[
                        "Review compliance procedures quarterly",
                        "Update policies based on regulatory changes",
                        "Train staff on new requirements"
                    ]
                )
                
            except Exception as e:
                logger.error(f"Error setting up regulatory monitoring: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/v1/business/compliance-risk-mgmt/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "modules": {
                    "compliance_manager": "active",
                    "industry_compliance": "active",
                    "risk_assessment": "active",
                    "policy_generator": "active"
                }
            }
        
        @self.app.get("/api/v1/business/compliance-risk-mgmt/capabilities")
        async def get_capabilities():
            """Get system capabilities"""
            return {
                "supported_industries": [industry.value for industry in IndustryType],
                "supported_frameworks": [framework.value for framework in ComplianceFramework],
                "supported_jurisdictions": [jurisdiction.value for jurisdiction in JurisdictionType],
                "document_types": [doc_type.value for doc_type in DocumentType],
                "risk_categories": [category.value for category in RiskCategory]
            }
    
    async def _update_compliance_database(
        self,
        organization_name: str,
        assessment_result: Dict[str, Any]
    ) -> None:
        """Update compliance database with assessment results"""
        try:
            # Store assessment results in database
            await self.compliance_manager.store_compliance_assessment(
                organization_name, assessment_result
            )
        except Exception as e:
            logger.error(f"Error updating compliance database: {e}")
    
    async def _setup_risk_monitoring(
        self,
        organization_name: str,
        risk_assessment: Dict[str, Any]
    ) -> None:
        """Setup ongoing risk monitoring"""
        try:
            # Setup risk monitoring based on assessment
            key_risks = risk_assessment.get("key_risks", [])
            
            # Schedule regular risk updates
            for risk in key_risks:
                if risk.get("current_score", 0) >= 15:  # High risk
                    # Schedule more frequent monitoring
                    pass
        except Exception as e:
            logger.error(f"Error setting up risk monitoring: {e}")
    
    async def _generate_impact_assessments(
        self,
        regulatory_changes: List[Dict[str, Any]],
        industry: str
    ) -> List[Dict[str, Any]]:
        """Generate impact assessments for regulatory changes"""
        
        impact_assessments = []
        
        for change in regulatory_changes:
            impact = {
                "change_id": change.get("change_id"),
                "regulation": change.get("title"),
                "impact_level": self._assess_impact_level(change, industry),
                "affected_areas": self._identify_affected_areas(change),
                "implementation_timeline": change.get("effective_date"),
                "estimated_cost": self._estimate_implementation_cost(change),
                "recommended_actions": self._generate_recommended_actions(change)
            }
            impact_assessments.append(impact)
        
        return impact_assessments
    
    def _assess_impact_level(self, change: Dict[str, Any], industry: str) -> str:
        """Assess impact level of regulatory change"""
        # Simplified impact assessment
        severity = change.get("severity", "medium")
        scope = change.get("scope", "limited")
        
        if severity == "high" and scope == "broad":
            return "Critical"
        elif severity == "high" or scope == "broad":
            return "High"
        elif severity == "medium":
            return "Medium"
        else:
            return "Low"
    
    def _identify_affected_areas(self, change: Dict[str, Any]) -> List[str]:
        """Identify business areas affected by regulatory change"""
        # Simplified area identification
        keywords = change.get("description", "").lower()
        
        affected_areas = []
        
        if any(word in keywords for word in ["data", "privacy", "information"]):
            affected_areas.append("Data Management")
        if any(word in keywords for word in ["financial", "reporting", "accounting"]):
            affected_areas.append("Financial Reporting")
        if any(word in keywords for word in ["security", "cybersecurity", "protection"]):
            affected_areas.append("Information Security")
        if any(word in keywords for word in ["employee", "workplace", "safety"]):
            affected_areas.append("Human Resources")
        
        return affected_areas or ["General Business Operations"]
    
    def _estimate_implementation_cost(self, change: Dict[str, Any]) -> str:
        """Estimate implementation cost for regulatory change"""
        # Simplified cost estimation
        impact_level = change.get("severity", "medium")
        
        cost_mappings = {
            "high": "$50,000 - $200,000",
            "medium": "$10,000 - $50,000",
            "low": "$1,000 - $10,000"
        }
        
        return cost_mappings.get(impact_level, "$5,000 - $25,000")
    
    def _generate_recommended_actions(self, change: Dict[str, Any]) -> List[str]:
        """Generate recommended actions for regulatory change"""
        return [
            "Conduct gap analysis against current practices",
            "Update relevant policies and procedures",
            "Train affected staff on new requirements",
            "Implement necessary technical controls",
            "Schedule compliance review and testing"
        ]
    
    async def _schedule_regulatory_monitoring(
        self,
        monitoring_id: str,
        request: RegulatoryMonitoringRequest
    ) -> None:
        """Schedule ongoing regulatory monitoring"""
        try:
            # Setup periodic monitoring tasks
            logger.info(f"Scheduled regulatory monitoring {monitoring_id}")
        except Exception as e:
            logger.error(f"Error scheduling monitoring: {e}")
    
    def _calculate_compliance_score(self, validation: Dict[str, Any]) -> float:
        """Calculate compliance score from validation results"""
        
        if validation.get("is_compliant", False):
            missing_count = len(validation.get("missing_requirements", []))
            
            if missing_count == 0:
                return 95.0
            elif missing_count <= 2:
                return 85.0
            elif missing_count <= 5:
                return 75.0
            else:
                return 65.0
        else:
            return 50.0
    
    def get_app(self) -> FastAPI:
        """Get FastAPI application instance"""
        return self.app

# Initialize API
compliance_risk_api = ComplianceRiskAPI()
app = compliance_risk_api.get_app()
