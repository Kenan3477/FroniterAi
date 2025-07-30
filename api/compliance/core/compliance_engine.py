"""
Core Compliance Engine

Main orchestration engine for compliance checking, risk assessment,
and regulatory monitoring across multiple frameworks.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Any, Optional, Union
import asyncio
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class ComplianceStatus(str, Enum):
    """Compliance status levels"""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PARTIALLY_COMPLIANT = "partially_compliant"
    UNKNOWN = "unknown"
    REQUIRES_REVIEW = "requires_review"


class RiskLevel(str, Enum):
    """Risk severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    MINIMAL = "minimal"


class RegulationType(str, Enum):
    """Supported regulation types"""
    GDPR = "gdpr"
    HIPAA = "hipaa"
    SOX = "sox"
    PCI_DSS = "pci_dss"
    CCPA = "ccpa"
    ISO_27001 = "iso_27001"
    NIST = "nist"
    CUSTOM = "custom"


@dataclass
class ComplianceResult:
    """Individual compliance check result"""
    regulation: RegulationType
    requirement_id: str
    requirement_name: str
    status: ComplianceStatus
    risk_level: RiskLevel
    
    # Detailed information
    description: str
    current_state: str
    required_state: str
    gap_analysis: str
    remediation_steps: List[str]
    
    # Metadata
    checked_at: datetime
    evidence: Optional[Dict[str, Any]] = None
    confidence_score: float = 0.0
    last_updated: Optional[datetime] = None
    next_review_date: Optional[datetime] = None


@dataclass
class ComplianceAssessment:
    """Complete compliance assessment results"""
    company_name: str
    assessment_date: datetime
    regulations_checked: List[RegulationType]
    
    # Overall scores
    overall_status: ComplianceStatus
    compliance_score: float  # 0-100
    risk_score: float       # 0-100
    
    # Detailed results
    results: List[ComplianceResult]
    critical_issues: List[ComplianceResult]
    recommendations: List[str]
    
    # Metrics
    total_requirements: int
    compliant_requirements: int
    non_compliant_requirements: int
    
    # Timeline
    estimated_remediation_time: timedelta
    next_assessment_date: datetime


class ComplianceEngine:
    """
    Main compliance engine for orchestrating compliance checks,
    risk assessments, and regulatory monitoring.
    """
    
    def __init__(self):
        self.regulation_checkers = {}
        self.policy_generators = {}
        self.risk_calculators = {}
        self.audit_trail = None
        
        self._initialize_checkers()
        self._load_compliance_frameworks()
    
    def _initialize_checkers(self):
        """Initialize all regulation checkers"""
        from ..regulations.gdpr import GDPRChecker
        from ..regulations.hipaa import HIPAAChecker
        from ..regulations.sox import SOXChecker
        from ..regulations.pci_dss import PCIDSSChecker
        
        self.regulation_checkers = {
            RegulationType.GDPR: GDPRChecker(),
            RegulationType.HIPAA: HIPAAChecker(),
            RegulationType.SOX: SOXChecker(),
            RegulationType.PCI_DSS: PCIDSSChecker()
        }
    
    def _load_compliance_frameworks(self):
        """Load industry-specific compliance frameworks"""
        from ..frameworks.financial_services import FinancialServicesFramework
        from ..frameworks.healthcare import HealthcareFramework
        from ..frameworks.technology import TechnologyFramework
        
        self.frameworks = {
            "financial_services": FinancialServicesFramework(),
            "healthcare": HealthcareFramework(),
            "technology": TechnologyFramework()
        }
    
    async def perform_compliance_assessment(
        self,
        company_data: Dict[str, Any],
        regulations: List[RegulationType],
        assessment_scope: str = "full"
    ) -> ComplianceAssessment:
        """
        Perform comprehensive compliance assessment
        
        Args:
            company_data: Company information and systems data
            regulations: List of regulations to check
            assessment_scope: Scope of assessment (full, quick, targeted)
            
        Returns:
            Complete compliance assessment results
        """
        logger.info(f"Starting compliance assessment for {company_data.get('name', 'Unknown')}")
        
        assessment_date = datetime.now()
        all_results = []
        
        # Run compliance checks for each regulation
        for regulation in regulations:
            if regulation in self.regulation_checkers:
                checker = self.regulation_checkers[regulation]
                regulation_results = await checker.check_compliance(
                    company_data, 
                    scope=assessment_scope
                )
                all_results.extend(regulation_results)
        
        # Calculate overall scores
        compliance_score = self._calculate_compliance_score(all_results)
        risk_score = self._calculate_risk_score(all_results)
        overall_status = self._determine_overall_status(all_results)
        
        # Identify critical issues
        critical_issues = [
            result for result in all_results 
            if result.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]
        ]
        
        # Generate recommendations
        recommendations = await self._generate_recommendations(all_results, company_data)
        
        # Calculate metrics
        total_requirements = len(all_results)
        compliant_requirements = len([r for r in all_results if r.status == ComplianceStatus.COMPLIANT])
        non_compliant_requirements = len([r for r in all_results if r.status == ComplianceStatus.NON_COMPLIANT])
        
        # Estimate remediation timeline
        remediation_time = self._estimate_remediation_time(critical_issues)
        next_assessment = assessment_date + timedelta(days=90)  # Quarterly assessments
        
        assessment = ComplianceAssessment(
            company_name=company_data.get("name", "Unknown"),
            assessment_date=assessment_date,
            regulations_checked=regulations,
            overall_status=overall_status,
            compliance_score=compliance_score,
            risk_score=risk_score,
            results=all_results,
            critical_issues=critical_issues,
            recommendations=recommendations,
            total_requirements=total_requirements,
            compliant_requirements=compliant_requirements,
            non_compliant_requirements=non_compliant_requirements,
            estimated_remediation_time=remediation_time,
            next_assessment_date=next_assessment
        )
        
        # Log assessment to audit trail
        await self._log_assessment(assessment)
        
        return assessment
    
    async def monitor_regulatory_changes(
        self,
        regulations: List[RegulationType],
        monitoring_period: timedelta = timedelta(days=30)
    ) -> Dict[str, Any]:
        """
        Monitor regulatory changes and updates
        
        Args:
            regulations: Regulations to monitor
            monitoring_period: Period to check for changes
            
        Returns:
            Regulatory change monitoring results
        """
        logger.info("Starting regulatory change monitoring")
        
        changes = {}
        for regulation in regulations:
            if regulation in self.regulation_checkers:
                checker = self.regulation_checkers[regulation]
                regulation_changes = await checker.check_regulatory_updates(monitoring_period)
                if regulation_changes:
                    changes[regulation.value] = regulation_changes
        
        return {
            "monitoring_date": datetime.now(),
            "period_monitored": monitoring_period,
            "regulations_monitored": [r.value for r in regulations],
            "changes_detected": changes,
            "total_changes": sum(len(c) for c in changes.values()),
            "requires_assessment_update": len(changes) > 0
        }
    
    async def generate_compliance_policies(
        self,
        company_data: Dict[str, Any],
        regulations: List[RegulationType],
        policy_types: List[str] = None
    ) -> Dict[str, Any]:
        """
        Generate compliance policy documents
        
        Args:
            company_data: Company information
            regulations: Applicable regulations
            policy_types: Specific policy types to generate
            
        Returns:
            Generated policy documents
        """
        from ..core.policy_generator import PolicyGenerator
        
        generator = PolicyGenerator()
        policies = await generator.generate_policies(
            company_data, 
            regulations, 
            policy_types
        )
        
        return policies
    
    async def calculate_compliance_risk(
        self,
        assessment: ComplianceAssessment,
        business_context: Dict[str, Any] = None,
        monte_carlo_iterations: int = 10000
    ) -> Dict[str, Any]:
        """
        Calculate compliance risk using Monte Carlo simulation
        
        Args:
            assessment: Compliance assessment results
            business_context: Business context for risk calculation
            monte_carlo_iterations: Number of Monte Carlo iterations
            
        Returns:
            Risk calculation results
        """
        from ..core.risk_calculator import RiskCalculator
        
        calculator = RiskCalculator()
        risk_analysis = await calculator.calculate_compliance_risk(
            assessment,
            business_context,
            monte_carlo_iterations
        )
        
        return risk_analysis
    
    def _calculate_compliance_score(self, results: List[ComplianceResult]) -> float:
        """Calculate overall compliance score (0-100)"""
        if not results:
            return 0.0
        
        compliant = len([r for r in results if r.status == ComplianceStatus.COMPLIANT])
        partially_compliant = len([r for r in results if r.status == ComplianceStatus.PARTIALLY_COMPLIANT])
        
        score = (compliant + (partially_compliant * 0.5)) / len(results) * 100
        return round(score, 2)
    
    def _calculate_risk_score(self, results: List[ComplianceResult]) -> float:
        """Calculate overall risk score (0-100)"""
        if not results:
            return 0.0
        
        risk_weights = {
            RiskLevel.CRITICAL: 100,
            RiskLevel.HIGH: 80,
            RiskLevel.MEDIUM: 60,
            RiskLevel.LOW: 40,
            RiskLevel.MINIMAL: 20
        }
        
        total_risk = sum(risk_weights.get(result.risk_level, 0) for result in results)
        max_possible_risk = len(results) * risk_weights[RiskLevel.CRITICAL]
        
        score = (total_risk / max_possible_risk) * 100 if max_possible_risk > 0 else 0
        return round(score, 2)
    
    def _determine_overall_status(self, results: List[ComplianceResult]) -> ComplianceStatus:
        """Determine overall compliance status"""
        if not results:
            return ComplianceStatus.UNKNOWN
        
        critical_non_compliant = any(
            r.status == ComplianceStatus.NON_COMPLIANT and r.risk_level == RiskLevel.CRITICAL
            for r in results
        )
        
        if critical_non_compliant:
            return ComplianceStatus.NON_COMPLIANT
        
        compliance_rate = self._calculate_compliance_score(results)
        
        if compliance_rate >= 95:
            return ComplianceStatus.COMPLIANT
        elif compliance_rate >= 70:
            return ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            return ComplianceStatus.NON_COMPLIANT
    
    async def _generate_recommendations(
        self,
        results: List[ComplianceResult],
        company_data: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # High-priority recommendations for critical issues
        critical_issues = [r for r in results if r.risk_level == RiskLevel.CRITICAL]
        for issue in critical_issues:
            recommendations.append(
                f"URGENT: {issue.requirement_name} - {issue.remediation_steps[0] if issue.remediation_steps else 'Immediate review required'}"
            )
        
        # General recommendations
        non_compliant = [r for r in results if r.status == ComplianceStatus.NON_COMPLIANT]
        if len(non_compliant) > 5:
            recommendations.append("Consider engaging a compliance consultant for comprehensive remediation")
        
        if len(non_compliant) > 0:
            recommendations.append("Establish regular compliance monitoring and review processes")
        
        return recommendations[:10]  # Limit to top 10 recommendations
    
    def _estimate_remediation_time(self, critical_issues: List[ComplianceResult]) -> timedelta:
        """Estimate time required for remediation"""
        # Simple estimation based on number and complexity of issues
        base_time = timedelta(days=30)  # Base 30 days
        additional_time = timedelta(days=14 * len(critical_issues))  # 2 weeks per critical issue
        
        return base_time + additional_time
    
    async def _log_assessment(self, assessment: ComplianceAssessment):
        """Log assessment to audit trail"""
        if self.audit_trail:
            await self.audit_trail.log_compliance_assessment(assessment)
        else:
            logger.info(f"Compliance assessment completed for {assessment.company_name}")
