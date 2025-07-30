"""
Compliance Engine Package

Comprehensive compliance checking system for regulatory requirements
including GDPR, HIPAA, SOX, PCI DSS and other regulations.

Features:
- Regulation-specific compliance checkers
- Policy document generators with legal templates
- Risk assessment calculators with Monte Carlo simulations
- Regulatory change monitoring systems
- Industry-specific compliance frameworks
- Audit trail and documentation systems
"""

from .core.compliance_engine import (
    ComplianceEngine,
    ComplianceResult,
    ComplianceAssessment,
    ComplianceStatus,
    RiskLevel,
    RegulationType
)

from .core.regulation_checker import (
    RegulationChecker,
    RegulationUpdate
)

from .regulations.gdpr import GDPRChecker
from .regulations.hipaa import HIPAAChecker
from .regulations.sox import SOXChecker
from .regulations.pci_dss import PCIDSSChecker

from .policy_generator import (
    PolicyGenerator,
    PolicyType,
    PolicyTemplate,
    GeneratedPolicy
)

from .risk_calculator import (
    RiskCalculator,
    RiskAssessment,
    RiskFactor,
    RiskScenario,
    MonteCarloResult,
    RiskCategory,
    RiskLevel as RiskCalcLevel
)

from .audit_trail import (
    AuditTrailManager,
    AuditEvent,
    ComplianceDocument,
    ComplianceEvidence,
    AuditTrail,
    AuditEventType,
    DocumentType
)

__all__ = [
    # Core engine
    "ComplianceEngine",
    "ComplianceResult", 
    "ComplianceAssessment",
    "ComplianceStatus",
    "RiskLevel",
    "RegulationType",
    
    # Base checker
    "RegulationChecker",
    "RegulationUpdate",
    
    # Regulation checkers
    "GDPRChecker",
    "HIPAAChecker",
    "SOXChecker",
    "PCIDSSChecker",
    
    # Policy generator
    "PolicyGenerator",
    "PolicyType",
    "PolicyTemplate", 
    "GeneratedPolicy",
    
    # Risk calculator
    "RiskCalculator",
    "RiskAssessment",
    "RiskFactor",
    "RiskScenario",
    "MonteCarloResult",
    "RiskCategory",
    "RiskCalcLevel",
    
    # Audit trail
    "AuditTrailManager",
    "AuditEvent",
    "ComplianceDocument",
    "ComplianceEvidence",
    "AuditTrail",
    "AuditEventType",
    "DocumentType"
]
