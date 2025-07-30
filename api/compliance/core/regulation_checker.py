"""
Base Regulation Checker

Abstract base class for implementing regulation-specific compliance checkers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

from .compliance_engine import ComplianceResult, ComplianceStatus, RiskLevel, RegulationType

logger = logging.getLogger(__name__)


@dataclass
class RegulationUpdate:
    """Regulatory update information"""
    regulation: RegulationType
    update_date: datetime
    title: str
    description: str
    impact_level: str  # "high", "medium", "low"
    effective_date: Optional[datetime] = None
    source_url: Optional[str] = None
    requires_action: bool = False


class RegulationChecker(ABC):
    """
    Abstract base class for regulation-specific compliance checkers
    """
    
    def __init__(self, regulation_type: RegulationType):
        self.regulation_type = regulation_type
        self.requirements = self._load_requirements()
        self.last_updated = datetime.now()
    
    @abstractmethod
    def _load_requirements(self) -> Dict[str, Any]:
        """Load regulation-specific requirements"""
        pass
    
    @abstractmethod
    async def check_compliance(
        self,
        company_data: Dict[str, Any],
        scope: str = "full"
    ) -> List[ComplianceResult]:
        """
        Check compliance against regulation requirements
        
        Args:
            company_data: Company information and systems data
            scope: Assessment scope (full, quick, targeted)
            
        Returns:
            List of compliance check results
        """
        pass
    
    @abstractmethod
    async def check_regulatory_updates(
        self,
        period: timedelta = timedelta(days=30)
    ) -> List[RegulationUpdate]:
        """
        Check for regulatory updates in the specified period
        
        Args:
            period: Time period to check for updates
            
        Returns:
            List of regulatory updates
        """
        pass
    
    def _create_result(
        self,
        requirement_id: str,
        requirement_name: str,
        status: ComplianceStatus,
        risk_level: RiskLevel,
        description: str,
        current_state: str,
        required_state: str,
        gap_analysis: str,
        remediation_steps: List[str],
        evidence: Optional[Dict[str, Any]] = None,
        confidence_score: float = 0.0
    ) -> ComplianceResult:
        """Create a standardized compliance result"""
        return ComplianceResult(
            regulation=self.regulation_type,
            requirement_id=requirement_id,
            requirement_name=requirement_name,
            status=status,
            risk_level=risk_level,
            description=description,
            current_state=current_state,
            required_state=required_state,
            gap_analysis=gap_analysis,
            remediation_steps=remediation_steps,
            checked_at=datetime.now(),
            evidence=evidence,
            confidence_score=confidence_score,
            last_updated=datetime.now(),
            next_review_date=datetime.now() + timedelta(days=90)
        )
    
    def _evaluate_data_protection(self, data_handling: Dict[str, Any]) -> ComplianceStatus:
        """Evaluate data protection practices"""
        required_controls = [
            "encryption_at_rest",
            "encryption_in_transit", 
            "access_controls",
            "audit_logging",
            "data_retention_policy"
        ]
        
        implemented_controls = sum(
            1 for control in required_controls 
            if data_handling.get(control, False)
        )
        
        compliance_ratio = implemented_controls / len(required_controls)
        
        if compliance_ratio >= 0.9:
            return ComplianceStatus.COMPLIANT
        elif compliance_ratio >= 0.7:
            return ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            return ComplianceStatus.NON_COMPLIANT
    
    def _evaluate_access_controls(self, access_data: Dict[str, Any]) -> ComplianceStatus:
        """Evaluate access control implementation"""
        required_features = [
            "multi_factor_authentication",
            "role_based_access",
            "regular_access_reviews",
            "principle_of_least_privilege",
            "privileged_access_management"
        ]
        
        implemented_features = sum(
            1 for feature in required_features
            if access_data.get(feature, False)
        )
        
        compliance_ratio = implemented_features / len(required_features)
        
        if compliance_ratio >= 0.8:
            return ComplianceStatus.COMPLIANT
        elif compliance_ratio >= 0.6:
            return ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            return ComplianceStatus.NON_COMPLIANT
    
    def _evaluate_incident_response(self, incident_data: Dict[str, Any]) -> ComplianceStatus:
        """Evaluate incident response capabilities"""
        required_components = [
            "incident_response_plan",
            "notification_procedures",
            "forensic_capabilities",
            "recovery_procedures",
            "regular_testing"
        ]
        
        implemented_components = sum(
            1 for component in required_components
            if incident_data.get(component, False)
        )
        
        compliance_ratio = implemented_components / len(required_components)
        
        if compliance_ratio >= 0.8:
            return ComplianceStatus.COMPLIANT
        elif compliance_ratio >= 0.6:
            return ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            return ComplianceStatus.NON_COMPLIANT
    
    def _determine_risk_level(
        self,
        compliance_status: ComplianceStatus,
        data_sensitivity: str = "medium",
        business_impact: str = "medium"
    ) -> RiskLevel:
        """Determine risk level based on compliance status and context"""
        
        # Base risk from compliance status
        base_risk = {
            ComplianceStatus.COMPLIANT: RiskLevel.MINIMAL,
            ComplianceStatus.PARTIALLY_COMPLIANT: RiskLevel.MEDIUM,
            ComplianceStatus.NON_COMPLIANT: RiskLevel.HIGH,
            ComplianceStatus.UNKNOWN: RiskLevel.MEDIUM,
            ComplianceStatus.REQUIRES_REVIEW: RiskLevel.MEDIUM
        }
        
        risk = base_risk.get(compliance_status, RiskLevel.MEDIUM)
        
        # Adjust based on data sensitivity
        if data_sensitivity == "high" and risk in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            risk = RiskLevel.CRITICAL if risk == RiskLevel.HIGH else RiskLevel.HIGH
        
        # Adjust based on business impact
        if business_impact == "high" and risk in [RiskLevel.MEDIUM, RiskLevel.HIGH]:
            risk = RiskLevel.CRITICAL if risk == RiskLevel.HIGH else RiskLevel.HIGH
        
        return risk
    
    def _get_remediation_steps(
        self,
        requirement_id: str,
        current_state: str,
        required_state: str
    ) -> List[str]:
        """Get specific remediation steps for a requirement"""
        
        # Default remediation steps based on requirement type
        default_steps = {
            "data_protection": [
                "Implement encryption for data at rest and in transit",
                "Establish access controls and authentication mechanisms",
                "Create data retention and deletion policies",
                "Implement audit logging and monitoring"
            ],
            "access_management": [
                "Deploy multi-factor authentication",
                "Implement role-based access controls",
                "Establish regular access reviews",
                "Apply principle of least privilege"
            ],
            "incident_response": [
                "Develop comprehensive incident response plan",
                "Establish notification procedures",
                "Implement forensic capabilities",
                "Create recovery and business continuity procedures"
            ],
            "documentation": [
                "Create comprehensive documentation",
                "Establish regular review processes", 
                "Implement version control",
                "Ensure accessibility and training"
            ]
        }
        
        # Try to match requirement ID to category
        for category, steps in default_steps.items():
            if category in requirement_id.lower():
                return steps
        
        # Fallback generic steps
        return [
            "Conduct detailed gap analysis",
            "Develop remediation plan with timeline",
            "Implement necessary controls",
            "Test and validate implementation",
            "Document procedures and train staff"
        ]
