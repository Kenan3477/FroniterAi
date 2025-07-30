"""
Compliance Check Router

RESTful endpoints for regulatory compliance checking, audit support,
and compliance framework assessment across multiple industries and regulations.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field, validator

from ..middleware.auth import get_current_user, require_permission, require_subscription_tier
from ..utils.response_models import APIResponse, ComplianceResponse, ComplianceAssessment, ComplianceRequirement
from ..utils.database import create_analysis_request, update_analysis_request, save_compliance_assessment
from ..config import SubscriptionTier

logger = logging.getLogger(__name__)

router = APIRouter()


# Request Models
class OrganizationProfile(BaseModel):
    """Organization profile for compliance assessment"""
    
    name: str = Field(..., description="Organization name", min_length=1, max_length=200)
    industry: str = Field(..., description="Primary industry", min_length=1, max_length=100)
    size: str = Field(..., description="Organization size", regex="^(small|medium|large|enterprise)$")
    geography: List[str] = Field(..., description="Geographic locations")
    data_types: List[str] = Field(..., description="Types of data processed")
    business_activities: List[str] = Field(..., description="Key business activities")
    
    @validator("geography")
    def validate_geography(cls, v):
        if not v:
            raise ValueError("At least one geographic location must be specified")
        return v


class ComplianceCheckRequest(BaseModel):
    """Compliance check request model"""
    
    organization: OrganizationProfile = Field(..., description="Organization profile")
    regulations: List[str] = Field(..., description="Regulations to check compliance against")
    assessment_scope: List[str] = Field(
        default=["policies", "procedures", "technical_controls", "documentation"],
        description="Scope of compliance assessment"
    )
    current_controls: Optional[Dict[str, Any]] = Field(None, description="Current compliance controls")
    assessment_date: Optional[str] = Field(None, description="Assessment date")


class ComplianceFrameworkRequest(BaseModel):
    """Compliance framework assessment request"""
    
    organization_name: str = Field(..., description="Organization name")
    framework: str = Field(..., description="Compliance framework (e.g., ISO27001, SOC2)")
    current_maturity: str = Field(
        default="basic",
        description="Current compliance maturity level",
        regex="^(basic|developing|defined|managed|optimizing)$"
    )
    target_maturity: str = Field(
        default="managed",
        description="Target compliance maturity level",
        regex="^(basic|developing|defined|managed|optimizing)$"
    )
    assessment_areas: List[str] = Field(
        default=["governance", "risk_management", "controls", "monitoring"],
        description="Areas to assess"
    )


class RegulatoryChangeRequest(BaseModel):
    """Regulatory change monitoring request"""
    
    jurisdictions: List[str] = Field(..., description="Jurisdictions to monitor")
    regulations: List[str] = Field(..., description="Regulations to monitor")
    notification_preferences: Dict[str, Any] = Field(
        default={"email": True, "urgency_threshold": "medium"},
        description="Notification preferences"
    )


# Compliance Assessment Engine
class ComplianceAssessmentEngine:
    """Core compliance assessment engine"""
    
    # Regulation-specific requirements
    REGULATION_REQUIREMENTS = {
        "GDPR": {
            "lawful_basis": {"description": "Establish lawful basis for processing", "priority": "high"},
            "consent_management": {"description": "Implement consent management system", "priority": "high"},
            "data_subject_rights": {"description": "Enable data subject rights", "priority": "high"},
            "privacy_by_design": {"description": "Implement privacy by design", "priority": "medium"},
            "dpo_appointment": {"description": "Appoint Data Protection Officer", "priority": "medium"},
            "impact_assessments": {"description": "Conduct Data Protection Impact Assessments", "priority": "medium"},
            "breach_notification": {"description": "Implement breach notification procedures", "priority": "high"},
            "record_keeping": {"description": "Maintain records of processing activities", "priority": "medium"}
        },
        "CCPA": {
            "privacy_policy": {"description": "Update privacy policy for CCPA compliance", "priority": "high"},
            "consumer_rights": {"description": "Implement consumer rights mechanisms", "priority": "high"},
            "data_deletion": {"description": "Enable data deletion capabilities", "priority": "high"},
            "opt_out_mechanisms": {"description": "Provide opt-out mechanisms", "priority": "medium"},
            "vendor_management": {"description": "Update vendor agreements", "priority": "medium"},
            "employee_training": {"description": "Train employees on CCPA requirements", "priority": "medium"}
        },
        "HIPAA": {
            "administrative_safeguards": {"description": "Implement administrative safeguards", "priority": "high"},
            "physical_safeguards": {"description": "Implement physical safeguards", "priority": "high"},
            "technical_safeguards": {"description": "Implement technical safeguards", "priority": "high"},
            "business_associate_agreements": {"description": "Execute business associate agreements", "priority": "high"},
            "breach_notification": {"description": "Implement breach notification procedures", "priority": "high"},
            "access_controls": {"description": "Implement access controls", "priority": "medium"},
            "audit_controls": {"description": "Implement audit controls", "priority": "medium"},
            "risk_assessment": {"description": "Conduct regular risk assessments", "priority": "medium"}
        },
        "SOX": {
            "internal_controls": {"description": "Establish internal controls over financial reporting", "priority": "high"},
            "management_assessment": {"description": "Management assessment of controls", "priority": "high"},
            "auditor_attestation": {"description": "External auditor attestation", "priority": "high"},
            "deficiency_remediation": {"description": "Remediate control deficiencies", "priority": "medium"},
            "documentation": {"description": "Document control procedures", "priority": "medium"},
            "testing_procedures": {"description": "Implement control testing procedures", "priority": "medium"}
        },
        "PCI_DSS": {
            "network_security": {"description": "Secure network and systems", "priority": "high"},
            "cardholder_data_protection": {"description": "Protect cardholder data", "priority": "high"},
            "vulnerability_management": {"description": "Maintain vulnerability management program", "priority": "high"},
            "access_control": {"description": "Implement strong access control measures", "priority": "high"},
            "network_monitoring": {"description": "Regularly monitor and test networks", "priority": "medium"},
            "information_security": {"description": "Maintain information security policy", "priority": "medium"}
        }
    }
    
    @classmethod
    def assess_regulation_compliance(
        cls, 
        regulation: str, 
        organization: OrganizationProfile,
        current_controls: Dict[str, Any]
    ) -> List[ComplianceRequirement]:
        """Assess compliance for a specific regulation"""
        
        requirements = []
        reg_requirements = cls.REGULATION_REQUIREMENTS.get(regulation, {})
        
        for req_id, req_details in reg_requirements.items():
            # Determine current status based on controls
            status = cls._assess_requirement_status(req_id, current_controls)
            
            # Set due date based on priority
            due_date = cls._calculate_due_date(req_details["priority"])
            
            requirement = ComplianceRequirement(
                regulation=regulation,
                requirement_id=req_id,
                description=req_details["description"],
                status=status,
                priority=req_details["priority"],
                due_date=due_date,
                responsible_party="Compliance Team"
            )
            
            requirements.append(requirement)
        
        return requirements
    
    @staticmethod
    def _assess_requirement_status(requirement_id: str, current_controls: Dict[str, Any]) -> str:
        """Assess the current status of a compliance requirement"""
        
        # Check if control exists and is implemented
        control = current_controls.get(requirement_id, {})
        
        if control.get("implemented", False):
            if control.get("tested", False) and control.get("effective", False):
                return "compliant"
            else:
                return "partially_compliant"
        else:
            return "non_compliant"
    
    @staticmethod
    def _calculate_due_date(priority: str) -> str:
        """Calculate due date based on priority"""
        
        now = datetime.now()
        
        if priority == "high":
            due_date = now + timedelta(days=30)
        elif priority == "medium":
            due_date = now + timedelta(days=90)
        else:
            due_date = now + timedelta(days=180)
        
        return due_date.isoformat()
    
    @classmethod
    def calculate_compliance_score(cls, requirements: List[ComplianceRequirement]) -> float:
        """Calculate overall compliance score"""
        
        if not requirements:
            return 0.0
        
        total_weight = 0
        weighted_score = 0
        
        for req in requirements:
            # Weight based on priority
            weight = {"high": 3, "medium": 2, "low": 1}.get(req.priority, 1)
            
            # Score based on status
            score = {
                "compliant": 100,
                "partially_compliant": 50,
                "non_compliant": 0
            }.get(req.status, 0)
            
            weighted_score += score * weight
            total_weight += weight
        
        return weighted_score / total_weight if total_weight > 0 else 0.0
    
    @classmethod
    def identify_compliance_gaps(cls, requirements: List[ComplianceRequirement]) -> List[str]:
        """Identify compliance gaps"""
        
        gaps = []
        
        non_compliant = [req for req in requirements if req.status == "non_compliant"]
        partially_compliant = [req for req in requirements if req.status == "partially_compliant"]
        
        if non_compliant:
            gaps.append(f"{len(non_compliant)} requirements are non-compliant")
        
        if partially_compliant:
            gaps.append(f"{len(partially_compliant)} requirements are partially compliant")
        
        # High priority gaps
        high_priority_gaps = [req for req in requirements 
                             if req.priority == "high" and req.status != "compliant"]
        
        if high_priority_gaps:
            gaps.append(f"{len(high_priority_gaps)} high-priority requirements need attention")
        
        return gaps
    
    @classmethod
    def generate_recommendations(
        cls, 
        requirements: List[ComplianceRequirement],
        organization: OrganizationProfile
    ) -> List[str]:
        """Generate compliance recommendations"""
        
        recommendations = []
        
        # Priority-based recommendations
        high_priority_non_compliant = [
            req for req in requirements 
            if req.priority == "high" and req.status == "non_compliant"
        ]
        
        if high_priority_non_compliant:
            recommendations.append(
                "Immediately address high-priority non-compliant requirements"
            )
        
        # Industry-specific recommendations
        if organization.industry.lower() in ["healthcare", "medical"]:
            recommendations.append("Consider implementing HIPAA-specific training programs")
        
        if organization.industry.lower() in ["financial", "banking", "fintech"]:
            recommendations.append("Implement comprehensive financial data protection measures")
        
        # Size-specific recommendations
        if organization.size in ["small", "medium"]:
            recommendations.append("Consider using compliance management software to automate processes")
        
        # General recommendations
        recommendations.extend([
            "Conduct regular compliance audits and assessments",
            "Implement continuous monitoring for compliance status",
            "Establish clear roles and responsibilities for compliance management",
            "Develop incident response procedures for compliance violations"
        ])
        
        return recommendations
    
    @classmethod
    def create_action_items(cls, requirements: List[ComplianceRequirement]) -> List[Dict[str, Any]]:
        """Create action items for compliance improvement"""
        
        action_items = []
        
        # Sort by priority and status
        sorted_requirements = sorted(
            requirements,
            key=lambda x: (
                {"high": 0, "medium": 1, "low": 2}.get(x.priority, 2),
                {"non_compliant": 0, "partially_compliant": 1, "compliant": 2}.get(x.status, 2)
            )
        )
        
        for req in sorted_requirements[:10]:  # Top 10 action items
            if req.status != "compliant":
                action_item = {
                    "requirement": req.requirement_id,
                    "description": req.description,
                    "priority": req.priority,
                    "current_status": req.status,
                    "due_date": req.due_date,
                    "estimated_effort": cls._estimate_effort(req),
                    "resources_needed": cls._estimate_resources(req)
                }
                action_items.append(action_item)
        
        return action_items
    
    @staticmethod
    def _estimate_effort(requirement: ComplianceRequirement) -> str:
        """Estimate effort required for compliance requirement"""
        
        effort_mapping = {
            "high": "High (4-8 weeks)",
            "medium": "Medium (2-4 weeks)", 
            "low": "Low (1-2 weeks)"
        }
        
        return effort_mapping.get(requirement.priority, "Medium (2-4 weeks)")
    
    @staticmethod
    def _estimate_resources(requirement: ComplianceRequirement) -> List[str]:
        """Estimate resources needed for compliance requirement"""
        
        base_resources = ["Compliance team", "Legal review"]
        
        if "technical" in requirement.description.lower():
            base_resources.append("IT/Security team")
        
        if "training" in requirement.description.lower():
            base_resources.append("Training coordinator")
        
        if requirement.priority == "high":
            base_resources.append("Senior management oversight")
        
        return base_resources


# API Endpoints
@router.post("/compliance", response_model=APIResponse[ComplianceResponse])
async def perform_compliance_check(
    request: ComplianceCheckRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Perform comprehensive compliance assessment across multiple regulations.
    
    This endpoint analyzes organizational compliance against specified regulations and provides:
    - Detailed compliance requirements assessment
    - Compliance score and gap analysis
    - Actionable recommendations
    - Implementation roadmap
    """
    
    try:
        # Create analysis request record
        analysis_request = await create_analysis_request(
            user_id=current_user.get("user_id", 0),
            request_id=f"cc_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            endpoint="/compliance",
            request_type="compliance_check",
            input_data=request.dict()
        )
        
        engine = ComplianceAssessmentEngine()
        all_requirements = []
        
        # Assess each regulation
        for regulation in request.regulations:
            reg_requirements = engine.assess_regulation_compliance(
                regulation,
                request.organization,
                request.current_controls or {}
            )
            all_requirements.extend(reg_requirements)
        
        # Calculate overall compliance score
        overall_score = engine.calculate_compliance_score(all_requirements)
        
        # Identify gaps and generate recommendations
        gaps = engine.identify_compliance_gaps(all_requirements)
        recommendations = engine.generate_recommendations(all_requirements, request.organization)
        action_items = engine.create_action_items(all_requirements)
        
        # Create compliance assessment
        assessment = ComplianceAssessment(
            overall_score=overall_score,
            requirements=all_requirements,
            gaps=gaps,
            recommendations=recommendations,
            action_items=action_items
        )
        
        # Determine next review date
        next_review = datetime.now() + timedelta(days=365)  # Annual review
        
        # Required documentation
        documentation = [
            "Compliance policies and procedures",
            "Risk assessment documentation",
            "Control implementation evidence",
            "Training records",
            "Audit reports",
            "Incident response procedures"
        ]
        
        # Create response
        compliance_response = ComplianceResponse(
            organization=request.organization.name,
            industry=request.organization.industry,
            regulations=request.regulations,
            assessment=assessment,
            documentation=documentation,
            next_review_date=next_review.isoformat()
        )
        
        # Save assessment to database
        background_tasks.add_task(
            save_compliance_assessment,
            current_user.get("user_id", 0),
            request.organization.name,
            request.organization.industry,
            request.regulations,
            assessment.dict(),
            overall_score,
            next_review
        )
        
        # Update analysis request with results
        background_tasks.add_task(
            update_analysis_request,
            analysis_request.request_id,
            compliance_response.dict(),
            "completed"
        )
        
        return APIResponse(
            success=True,
            data=compliance_response,
            message="Compliance assessment completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Compliance assessment failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Compliance assessment failed: {str(e)}"
        )


@router.post("/compliance-framework", response_model=APIResponse[Dict[str, Any]])
@require_subscription_tier(SubscriptionTier.PROFESSIONAL)
async def assess_compliance_framework(
    request: ComplianceFrameworkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Assess compliance framework maturity and implementation.
    
    Requires Professional or Enterprise subscription.
    """
    
    try:
        # Framework-specific assessment areas
        framework_areas = {
            "ISO27001": [
                "Information Security Policy",
                "Risk Management", 
                "Asset Management",
                "Access Control",
                "Incident Management",
                "Business Continuity"
            ],
            "SOC2": [
                "Security",
                "Availability", 
                "Processing Integrity",
                "Confidentiality",
                "Privacy"
            ],
            "NIST": [
                "Identify",
                "Protect",
                "Detect", 
                "Respond",
                "Recover"
            ]
        }
        
        areas = framework_areas.get(request.framework, request.assessment_areas)
        
        # Maturity level scoring
        maturity_scores = {
            "basic": 1,
            "developing": 2,
            "defined": 3,
            "managed": 4,
            "optimizing": 5
        }
        
        current_score = maturity_scores.get(request.current_maturity, 1)
        target_score = maturity_scores.get(request.target_maturity, 4)
        
        # Assessment results
        assessment_results = []
        for area in areas:
            area_result = {
                "area": area,
                "current_maturity": request.current_maturity,
                "target_maturity": request.target_maturity,
                "gap_score": target_score - current_score,
                "recommendations": [
                    f"Develop {area.lower()} policies and procedures",
                    f"Implement {area.lower()} controls",
                    f"Establish {area.lower()} monitoring"
                ]
            }
            assessment_results.append(area_result)
        
        # Implementation roadmap
        roadmap = {
            "phase_1": {
                "timeline": "0-3 months",
                "focus": "Foundation building",
                "activities": ["Policy development", "Initial training", "Basic controls"]
            },
            "phase_2": {
                "timeline": "3-9 months", 
                "focus": "Implementation",
                "activities": ["Control implementation", "Process establishment", "Staff training"]
            },
            "phase_3": {
                "timeline": "9-12 months",
                "focus": "Optimization",
                "activities": ["Continuous monitoring", "Process improvement", "Regular audits"]
            }
        }
        
        result = {
            "organization": request.organization_name,
            "framework": request.framework,
            "assessment_date": datetime.now().isoformat(),
            "maturity_assessment": {
                "current_level": request.current_maturity,
                "target_level": request.target_maturity,
                "overall_gap": target_score - current_score
            },
            "area_assessments": assessment_results,
            "implementation_roadmap": roadmap,
            "estimated_timeline": f"{max(6, (target_score - current_score) * 3)} months",
            "success_metrics": [
                "Framework certification achieved",
                "Audit findings reduced",
                "Incident response time improved",
                "Stakeholder confidence increased"
            ]
        }
        
        return APIResponse(
            success=True,
            data=result,
            message="Compliance framework assessment completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Framework assessment failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Framework assessment failed: {str(e)}"
        )


@router.get("/regulatory-updates", response_model=APIResponse[Dict[str, Any]])
async def get_regulatory_updates(
    jurisdiction: str = Query(..., description="Jurisdiction (e.g., 'US', 'EU')"),
    regulation: Optional[str] = Query(None, description="Specific regulation"),
    days_back: int = Query(30, description="Days to look back for updates"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get recent regulatory updates and changes.
    """
    
    try:
        # Simulated regulatory updates (in real implementation, this would come from regulatory databases)
        updates = [
            {
                "date": "2024-07-15",
                "regulation": "GDPR",
                "jurisdiction": "EU",
                "type": "guidance",
                "title": "Updated guidance on consent mechanisms",
                "summary": "European Data Protection Board released updated guidance on valid consent collection",
                "impact": "medium",
                "action_required": "Review consent collection processes"
            },
            {
                "date": "2024-07-10",
                "regulation": "CCPA", 
                "jurisdiction": "US",
                "type": "amendment",
                "title": "CPRA implementation requirements",
                "summary": "California Privacy Rights Act implementation deadline approaching",
                "impact": "high",
                "action_required": "Ensure CPRA compliance by deadline"
            },
            {
                "date": "2024-07-05",
                "regulation": "SOX",
                "jurisdiction": "US", 
                "type": "enforcement",
                "title": "Increased focus on cybersecurity controls",
                "summary": "SEC emphasizing cybersecurity risk management in SOX assessments",
                "impact": "medium",
                "action_required": "Review cybersecurity control documentation"
            }
        ]
        
        # Filter updates based on parameters
        filtered_updates = []
        for update in updates:
            if jurisdiction.upper() in update["jurisdiction"]:
                if not regulation or regulation.upper() in update["regulation"]:
                    filtered_updates.append(update)
        
        result = {
            "jurisdiction": jurisdiction,
            "regulation": regulation,
            "query_date": datetime.now().isoformat(),
            "updates_found": len(filtered_updates),
            "updates": filtered_updates,
            "summary": {
                "high_impact": len([u for u in filtered_updates if u["impact"] == "high"]),
                "medium_impact": len([u for u in filtered_updates if u["impact"] == "medium"]),
                "low_impact": len([u for u in filtered_updates if u["impact"] == "low"])
            }
        }
        
        return APIResponse(
            success=True,
            data=result,
            message="Regulatory updates retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to retrieve regulatory updates: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve regulatory updates: {str(e)}"
        )


@router.get("/compliance-templates", response_model=APIResponse[Dict[str, Any]])
async def get_compliance_templates(
    regulation: str = Query(..., description="Regulation name"),
    template_type: str = Query("policy", description="Template type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get compliance document templates for specific regulations.
    """
    
    try:
        # Template categories
        template_categories = {
            "policy": "Policy documents and procedures",
            "checklist": "Compliance checklists and assessments", 
            "training": "Training materials and programs",
            "audit": "Audit procedures and documentation"
        }
        
        # Sample templates (in real implementation, these would be comprehensive documents)
        templates = {
            "GDPR": {
                "policy": [
                    "Data Protection Policy Template",
                    "Privacy Policy Template",
                    "Data Subject Rights Procedure",
                    "Breach Notification Procedure"
                ],
                "checklist": [
                    "GDPR Compliance Checklist",
                    "Data Protection Impact Assessment Template",
                    "Vendor Assessment Checklist"
                ]
            },
            "CCPA": {
                "policy": [
                    "Consumer Privacy Policy Template",
                    "Data Deletion Procedure",
                    "Opt-Out Mechanism Procedure"
                ],
                "checklist": [
                    "CCPA Compliance Checklist",
                    "Consumer Rights Assessment"
                ]
            },
            "HIPAA": {
                "policy": [
                    "HIPAA Privacy Policy Template",
                    "Security Policy Template", 
                    "Breach Notification Policy"
                ],
                "checklist": [
                    "HIPAA Security Rule Checklist",
                    "Privacy Rule Compliance Checklist"
                ]
            }
        }
        
        regulation_templates = templates.get(regulation.upper(), {})
        category_templates = regulation_templates.get(template_type, [])
        
        result = {
            "regulation": regulation,
            "template_type": template_type,
            "template_category": template_categories.get(template_type, "Unknown"),
            "available_templates": category_templates,
            "total_templates": len(category_templates),
            "download_instructions": "Templates can be downloaded individually or as a complete package"
        }
        
        return APIResponse(
            success=True,
            data=result,
            message="Compliance templates retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to retrieve compliance templates: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve compliance templates: {str(e)}"
        )
