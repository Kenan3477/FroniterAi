"""
Frontier Business Operations Module
Enterprise-grade AI for business operations and decision support
"""

from .core import FrontierBusinessOperations
from .financial_analysis import FinancialAnalysisCapability
from .strategic_planning import StrategicPlanningCapability
from .operations_management import OperationsManagementCapability
from .decision_support import DecisionSupportCapability
from .compliance_governance import ComplianceGovernanceCapability
from .domain_extensions import (
    FinanceBankingExtension,
    HealthcareBusinessExtension,
    ManufacturingOperationsExtension,
    TechnologyBusinessExtension
)

__version__ = "1.0.0"
__author__ = "Frontier AI Team"

__all__ = [
    "FrontierBusinessOperations",
    "FinancialAnalysisCapability",
    "StrategicPlanningCapability", 
    "OperationsManagementCapability",
    "DecisionSupportCapability",
    "ComplianceGovernanceCapability",
    "FinanceBankingExtension",
    "HealthcareBusinessExtension",
    "ManufacturingOperationsExtension",
    "TechnologyBusinessExtension"
]
