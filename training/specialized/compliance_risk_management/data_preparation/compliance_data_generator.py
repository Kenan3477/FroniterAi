"""
Compliance Risk Management Data Generator

Specialized data preparation for compliance and risk management training
including regulation-specific datasets, jurisdiction-specific content,
and synthetic data generation for compliance scenarios.
"""

import json
import random
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class RegulationType(Enum):
    """Types of regulations supported"""
    SOX = "sox"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    BASEL_III = "basel_iii"
    DODD_FRANK = "dodd_frank"
    MiFID_II = "mifid_ii"
    COSO = "coso"
    ISO_27001 = "iso_27001"
    NIST = "nist"

class Jurisdiction(Enum):
    """Supported jurisdictions"""
    US_FEDERAL = "us_federal"
    US_STATE = "us_state"
    EU = "eu"
    UK = "uk"
    CANADA = "canada"
    AUSTRALIA = "australia"
    SINGAPORE = "singapore"
    JAPAN = "japan"
    CHINA = "china"
    INTERNATIONAL = "international"

class ComplianceArea(Enum):
    """Compliance focus areas"""
    FINANCIAL_REPORTING = "financial_reporting"
    DATA_PROTECTION = "data_protection"
    INFORMATION_SECURITY = "information_security"
    OPERATIONAL_RISK = "operational_risk"
    CREDIT_RISK = "credit_risk"
    MARKET_RISK = "market_risk"
    LIQUIDITY_RISK = "liquidity_risk"
    ANTI_MONEY_LAUNDERING = "aml"
    KNOW_YOUR_CUSTOMER = "kyc"
    ENVIRONMENTAL = "environmental"

@dataclass
class ComplianceDocument:
    """Structure for compliance training documents"""
    document_id: str
    regulation_type: RegulationType
    jurisdiction: Jurisdiction
    compliance_area: ComplianceArea
    title: str
    content: str
    requirements: List[str]
    risk_level: str  # "low", "medium", "high", "critical"
    industry: Optional[str] = None
    effective_date: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class RiskScenario:
    """Structure for risk assessment scenarios"""
    scenario_id: str
    risk_type: str
    description: str
    likelihood: float  # 0.0 to 1.0
    impact: float  # 0.0 to 1.0
    mitigation_strategies: List[str]
    compliance_frameworks: List[RegulationType]
    jurisdiction: Jurisdiction
    industry: Optional[str] = None

class ComplianceDataGenerator:
    """Generator for compliance and risk management training data"""
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Load regulation templates and requirements
        self._load_regulation_templates()
        self._load_risk_scenarios()
        
    def _load_regulation_templates(self):
        """Load regulation-specific templates and requirements"""
        self.regulation_templates = {
            RegulationType.SOX: {
                "requirements": [
                    "Internal controls over financial reporting",
                    "Management assessment of internal controls",
                    "External auditor attestation",
                    "CEO and CFO certifications",
                    "Disclosure controls and procedures"
                ],
                "sections": [
                    "Section 302 - Corporate responsibility for financial reports",
                    "Section 404 - Management assessment of internal controls",
                    "Section 409 - Real time issuer disclosures",
                    "Section 906 - Corporate responsibility for financial reports"
                ],
                "keywords": [
                    "internal controls", "financial reporting", "audit committee",
                    "material weakness", "significant deficiency", "PCAOB"
                ]
            },
            RegulationType.GDPR: {
                "requirements": [
                    "Lawful basis for processing",
                    "Data subject consent",
                    "Data protection impact assessment",
                    "Privacy by design and by default",
                    "Data breach notification"
                ],
                "sections": [
                    "Article 6 - Lawfulness of processing",
                    "Article 7 - Conditions for consent",
                    "Article 25 - Data protection by design and by default",
                    "Article 33 - Notification of data breach"
                ],
                "keywords": [
                    "personal data", "data subject", "controller", "processor",
                    "consent", "legitimate interest", "data breach"
                ]
            },
            RegulationType.BASEL_III: {
                "requirements": [
                    "Capital adequacy ratios",
                    "Leverage ratio",
                    "Liquidity coverage ratio",
                    "Net stable funding ratio",
                    "Counterparty credit risk"
                ],
                "sections": [
                    "Pillar 1 - Minimum capital requirements",
                    "Pillar 2 - Supervisory review process",
                    "Pillar 3 - Market discipline"
                ],
                "keywords": [
                    "capital ratio", "tier 1 capital", "common equity",
                    "risk-weighted assets", "leverage ratio", "liquidity"
                ]
            }
        }
    
    def _load_risk_scenarios(self):
        """Load predefined risk scenario templates"""
        self.risk_scenario_templates = {
            "operational": [
                "System failure disrupting critical business operations",
                "Key personnel departure affecting business continuity",
                "Fraud or unauthorized transactions",
                "Third-party vendor service disruption"
            ],
            "compliance": [
                "Regulatory examination findings",
                "Policy violations by employees",
                "Inadequate compliance training",
                "Changes in regulatory requirements"
            ],
            "financial": [
                "Credit default by major counterparty",
                "Market volatility affecting portfolio value",
                "Liquidity shortage during stress conditions",
                "Interest rate risk exposure"
            ],
            "information_security": [
                "Data breach exposing customer information",
                "Cyberattack on critical systems",
                "Insider threat compromising data integrity",
                "Ransomware affecting business operations"
            ]
        }
    
    def generate_sox_documents(self, num_documents: int = 100) -> List[ComplianceDocument]:
        """Generate SOX compliance training documents"""
        documents = []
        sox_template = self.regulation_templates[RegulationType.SOX]
        
        for i in range(num_documents):
            # Generate realistic SOX content
            section = random.choice(sox_template["sections"])
            requirements = random.sample(sox_template["requirements"], k=random.randint(2, 4))
            
            content = self._generate_sox_content(section, requirements)
            
            doc = ComplianceDocument(
                document_id=f"sox_{i+1:04d}",
                regulation_type=RegulationType.SOX,
                jurisdiction=random.choice([Jurisdiction.US_FEDERAL, Jurisdiction.US_STATE]),
                compliance_area=ComplianceArea.FINANCIAL_REPORTING,
                title=f"SOX Compliance: {section}",
                content=content,
                requirements=requirements,
                risk_level=random.choice(["medium", "high", "critical"]),
                industry=random.choice(["financial_services", "technology", "healthcare", "manufacturing"]),
                effective_date=datetime.now() - timedelta(days=random.randint(30, 365)),
                metadata={
                    "section": section,
                    "audit_frequency": random.choice(["quarterly", "annual"]),
                    "materiality_threshold": random.uniform(0.01, 0.05)
                }
            )
            documents.append(doc)
        
        return documents
    
    def _generate_sox_content(self, section: str, requirements: List[str]) -> str:
        """Generate realistic SOX compliance content"""
        content_templates = [
            "The company must establish and maintain internal controls over financial reporting to ensure accuracy and reliability of financial statements. ",
            "Management is responsible for assessing the effectiveness of internal controls and identifying any material weaknesses or significant deficiencies. ",
            "The audit committee must oversee the financial reporting process and maintain direct responsibility for compensation and oversight of external auditors. ",
            "All financial disclosures must be reviewed and approved by appropriate personnel before public release. ",
            "Documentation of control procedures must be maintained and updated regularly to reflect changes in business processes. "
        ]
        
        content = random.choice(content_templates)
        content += f"This document addresses {section} requirements including: "
        content += ", ".join(requirements) + ". "
        
        # Add specific control procedures
        controls = [
            "Segregation of duties between authorization, recording, and custody functions",
            "Regular reconciliation of accounts and investigation of discrepancies",
            "Approval hierarchies for significant transactions and adjustments",
            "Periodic testing of automated controls and manual oversight procedures",
            "Documentation of control deficiencies and remediation efforts"
        ]
        
        content += "Key control procedures include: " + "; ".join(random.sample(controls, k=3)) + ". "
        
        # Add compliance assessment
        content += "Regular assessment of control effectiveness is required, with findings documented and reported to management and the audit committee. "
        content += "Any identified deficiencies must be addressed promptly with appropriate remediation plans."
        
        return content
    
    def generate_gdpr_documents(self, num_documents: int = 100) -> List[ComplianceDocument]:
        """Generate GDPR compliance training documents"""
        documents = []
        gdpr_template = self.regulation_templates[RegulationType.GDPR]
        
        for i in range(num_documents):
            article = random.choice(gdpr_template["sections"])
            requirements = random.sample(gdpr_template["requirements"], k=random.randint(2, 3))
            
            content = self._generate_gdpr_content(article, requirements)
            
            doc = ComplianceDocument(
                document_id=f"gdpr_{i+1:04d}",
                regulation_type=RegulationType.GDPR,
                jurisdiction=random.choice([Jurisdiction.EU, Jurisdiction.UK]),
                compliance_area=ComplianceArea.DATA_PROTECTION,
                title=f"GDPR Compliance: {article}",
                content=content,
                requirements=requirements,
                risk_level=random.choice(["medium", "high"]),
                industry=random.choice(["technology", "healthcare", "financial_services", "retail"]),
                effective_date=datetime(2018, 5, 25),
                metadata={
                    "article": article,
                    "data_categories": random.choice([
                        ["personal_identifiers", "contact_information"],
                        ["financial_data", "transaction_history"],
                        ["health_data", "biometric_data"],
                        ["location_data", "behavioral_data"]
                    ]),
                    "processing_purpose": random.choice([
                        "service_provision", "marketing", "analytics", "compliance"
                    ])
                }
            )
            documents.append(doc)
        
        return documents
    
    def _generate_gdpr_content(self, article: str, requirements: List[str]) -> str:
        """Generate realistic GDPR compliance content"""
        content = f"Under {article} of the General Data Protection Regulation, organizations must ensure compliance with data protection requirements. "
        
        content += "Personal data processing must have a lawful basis and data subjects must be informed about how their data is used. "
        
        # Add specific requirements
        content += f"Key requirements include: {', '.join(requirements)}. "
        
        # Add data subject rights
        rights = [
            "Right to access personal data",
            "Right to rectification of inaccurate data",
            "Right to erasure (right to be forgotten)",
            "Right to restrict processing",
            "Right to data portability",
            "Right to object to processing"
        ]
        
        content += f"Data subjects have the following rights: {'; '.join(random.sample(rights, k=3))}. "
        
        # Add compliance measures
        measures = [
            "Privacy impact assessments for high-risk processing",
            "Data protection by design and by default",
            "Appointment of data protection officer where required",
            "Maintenance of records of processing activities",
            "Implementation of appropriate technical and organizational measures"
        ]
        
        content += f"Organizations must implement: {'; '.join(random.sample(measures, k=2))}. "
        content += "Violations may result in administrative fines up to 4% of annual global turnover or €20 million, whichever is higher."
        
        return content
    
    def generate_risk_scenarios(self, num_scenarios: int = 50) -> List[RiskScenario]:
        """Generate risk assessment scenarios"""
        scenarios = []
        
        for i in range(num_scenarios):
            risk_type = random.choice(list(self.risk_scenario_templates.keys()))
            description = random.choice(self.risk_scenario_templates[risk_type])
            
            # Generate realistic risk metrics
            likelihood = self._generate_likelihood_score(risk_type)
            impact = self._generate_impact_score(risk_type)
            
            # Generate mitigation strategies
            mitigation = self._generate_mitigation_strategies(risk_type)
            
            # Map to relevant compliance frameworks
            frameworks = self._map_risk_to_frameworks(risk_type)
            
            scenario = RiskScenario(
                scenario_id=f"risk_{i+1:04d}",
                risk_type=risk_type,
                description=description,
                likelihood=likelihood,
                impact=impact,
                mitigation_strategies=mitigation,
                compliance_frameworks=frameworks,
                jurisdiction=random.choice(list(Jurisdiction)),
                industry=random.choice([
                    "financial_services", "healthcare", "technology", 
                    "manufacturing", "retail", "energy"
                ])
            )
            scenarios.append(scenario)
        
        return scenarios
    
    def _generate_likelihood_score(self, risk_type: str) -> float:
        """Generate realistic likelihood scores based on risk type"""
        base_scores = {
            "operational": 0.3,
            "compliance": 0.2,
            "financial": 0.25,
            "information_security": 0.4
        }
        
        base = base_scores.get(risk_type, 0.25)
        return max(0.05, min(0.95, base + random.gauss(0, 0.1)))
    
    def _generate_impact_score(self, risk_type: str) -> float:
        """Generate realistic impact scores based on risk type"""
        base_scores = {
            "operational": 0.6,
            "compliance": 0.7,
            "financial": 0.8,
            "information_security": 0.75
        }
        
        base = base_scores.get(risk_type, 0.6)
        return max(0.1, min(1.0, base + random.gauss(0, 0.15)))
    
    def _generate_mitigation_strategies(self, risk_type: str) -> List[str]:
        """Generate appropriate mitigation strategies for risk type"""
        strategies = {
            "operational": [
                "Implement business continuity planning",
                "Cross-train key personnel",
                "Establish backup systems and procedures",
                "Regular testing of contingency plans",
                "Vendor management and due diligence"
            ],
            "compliance": [
                "Enhanced compliance training programs",
                "Regular policy updates and communication",
                "Compliance monitoring and testing",
                "Escalation procedures for violations",
                "External compliance assessments"
            ],
            "financial": [
                "Diversification of counterparty exposure",
                "Stress testing and scenario analysis",
                "Hedging strategies for market risks",
                "Liquidity management procedures",
                "Credit risk assessment and monitoring"
            ],
            "information_security": [
                "Multi-factor authentication implementation",
                "Regular security assessments and penetration testing",
                "Employee cybersecurity training",
                "Data encryption and access controls",
                "Incident response and recovery procedures"
            ]
        }
        
        return random.sample(strategies.get(risk_type, strategies["operational"]), k=3)
    
    def _map_risk_to_frameworks(self, risk_type: str) -> List[RegulationType]:
        """Map risk types to relevant compliance frameworks"""
        mapping = {
            "operational": [RegulationType.SOX, RegulationType.COSO],
            "compliance": [RegulationType.SOX, RegulationType.GDPR, RegulationType.HIPAA],
            "financial": [RegulationType.BASEL_III, RegulationType.DODD_FRANK, RegulationType.SOX],
            "information_security": [RegulationType.GDPR, RegulationType.NIST, RegulationType.ISO_27001]
        }
        
        relevant_frameworks = mapping.get(risk_type, [RegulationType.SOX])
        return random.sample(relevant_frameworks, k=min(2, len(relevant_frameworks)))
    
    def generate_policy_documents(self, num_policies: int = 30) -> List[Dict[str, Any]]:
        """Generate policy document templates for training"""
        policies = []
        
        policy_types = [
            "Information Security Policy",
            "Data Retention Policy",
            "Anti-Money Laundering Policy",
            "Code of Conduct",
            "Risk Management Policy",
            "Business Continuity Policy",
            "Vendor Management Policy",
            "Conflict of Interest Policy"
        ]
        
        for i in range(num_policies):
            policy_type = random.choice(policy_types)
            
            policy = {
                "policy_id": f"policy_{i+1:04d}",
                "title": policy_type,
                "version": f"{random.randint(1, 5)}.{random.randint(0, 9)}",
                "effective_date": (datetime.now() - timedelta(days=random.randint(30, 730))).isoformat(),
                "review_date": (datetime.now() + timedelta(days=random.randint(30, 365))).isoformat(),
                "owner": random.choice(["Legal", "Compliance", "Risk Management", "IT Security"]),
                "scope": random.choice(["All employees", "Management", "IT staff", "Customer-facing staff"]),
                "content": self._generate_policy_content(policy_type),
                "compliance_frameworks": [fw.value for fw in self._map_policy_to_frameworks(policy_type)],
                "risk_level": random.choice(["low", "medium", "high"]),
                "training_required": random.choice([True, False]),
                "attestation_required": random.choice([True, False])
            }
            policies.append(policy)
        
        return policies
    
    def _generate_policy_content(self, policy_type: str) -> str:
        """Generate realistic policy content"""
        content_templates = {
            "Information Security Policy": (
                "This policy establishes requirements for protecting information assets and maintaining confidentiality, "
                "integrity, and availability of data. All employees must follow security procedures including strong "
                "password requirements, secure handling of sensitive information, and prompt reporting of security incidents. "
                "Access to systems and data must be based on business need and principle of least privilege."
            ),
            "Data Retention Policy": (
                "This policy defines requirements for retention and disposal of business records and data. "
                "Records must be retained for minimum periods as required by law and business needs. "
                "Personal data must be deleted when no longer needed for the original purpose. "
                "Secure disposal methods must be used for sensitive information."
            ),
            "Risk Management Policy": (
                "This policy establishes the framework for identifying, assessing, and managing risks that could "
                "impact business objectives. Risk assessments must be conducted regularly and risk mitigation "
                "strategies implemented as appropriate. Risk tolerance levels are defined by senior management "
                "and risk appetite statements guide decision-making."
            )
        }
        
        return content_templates.get(policy_type, "Standard policy content addressing compliance requirements and operational procedures.")
    
    def _map_policy_to_frameworks(self, policy_type: str) -> List[RegulationType]:
        """Map policy types to relevant compliance frameworks"""
        mapping = {
            "Information Security Policy": [RegulationType.GDPR, RegulationType.NIST, RegulationType.ISO_27001],
            "Data Retention Policy": [RegulationType.GDPR, RegulationType.HIPAA],
            "Anti-Money Laundering Policy": [RegulationType.DODD_FRANK],
            "Code of Conduct": [RegulationType.SOX],
            "Risk Management Policy": [RegulationType.BASEL_III, RegulationType.COSO, RegulationType.SOX],
            "Business Continuity Policy": [RegulationType.SOX, RegulationType.BASEL_III]
        }
        
        return mapping.get(policy_type, [RegulationType.SOX])
    
    def generate_regulatory_change_data(self, num_changes: int = 20) -> List[Dict[str, Any]]:
        """Generate regulatory change notifications for training"""
        changes = []
        
        change_types = [
            "New regulation introduced",
            "Amendment to existing regulation",
            "Enforcement guidance updated",
            "Compliance deadline extended",
            "Penalty structure revised",
            "Reporting requirements modified"
        ]
        
        for i in range(num_changes):
            change = {
                "change_id": f"reg_change_{i+1:04d}",
                "regulation": random.choice(list(RegulationType)).value,
                "jurisdiction": random.choice(list(Jurisdiction)).value,
                "change_type": random.choice(change_types),
                "effective_date": (datetime.now() + timedelta(days=random.randint(30, 365))).isoformat(),
                "notification_date": datetime.now().isoformat(),
                "impact_level": random.choice(["low", "medium", "high"]),
                "affected_areas": random.sample([
                    "financial_reporting", "data_protection", "risk_management",
                    "operational_procedures", "disclosure_requirements"
                ], k=random.randint(1, 3)),
                "summary": self._generate_change_summary(),
                "action_required": random.choice([True, False]),
                "compliance_deadline": (datetime.now() + timedelta(days=random.randint(60, 180))).isoformat()
            }
            changes.append(change)
        
        return changes
    
    def _generate_change_summary(self) -> str:
        """Generate regulatory change summary"""
        summaries = [
            "New reporting requirements for enhanced disclosure of risk metrics and management procedures.",
            "Updated guidance on implementation of control procedures and documentation standards.",
            "Revised penalty structure with increased fines for non-compliance violations.",
            "Extended compliance deadline to allow for system updates and staff training.",
            "Modified data protection requirements including enhanced consent mechanisms.",
            "New cybersecurity standards for protection of sensitive customer information."
        ]
        
        return random.choice(summaries)
    
    def save_training_datasets(self) -> Dict[str, str]:
        """Generate and save all compliance training datasets"""
        logger.info("Generating compliance training datasets...")
        
        file_paths = {}
        
        # Generate SOX documents
        sox_docs = self.generate_sox_documents(100)
        sox_data = [self._document_to_training_format(doc) for doc in sox_docs]
        sox_file = self.output_dir / "sox_training_data.json"
        with open(sox_file, 'w') as f:
            json.dump(sox_data, f, indent=2, default=str)
        file_paths["sox"] = str(sox_file)
        
        # Generate GDPR documents
        gdpr_docs = self.generate_gdpr_documents(100)
        gdpr_data = [self._document_to_training_format(doc) for doc in gdpr_docs]
        gdpr_file = self.output_dir / "gdpr_training_data.json"
        with open(gdpr_file, 'w') as f:
            json.dump(gdpr_data, f, indent=2, default=str)
        file_paths["gdpr"] = str(gdpr_file)
        
        # Generate risk scenarios
        risk_scenarios = self.generate_risk_scenarios(50)
        risk_data = [self._scenario_to_training_format(scenario) for scenario in risk_scenarios]
        risk_file = self.output_dir / "risk_scenarios_training_data.json"
        with open(risk_file, 'w') as f:
            json.dump(risk_data, f, indent=2, default=str)
        file_paths["risk_scenarios"] = str(risk_file)
        
        # Generate policy documents
        policies = self.generate_policy_documents(30)
        policy_file = self.output_dir / "policy_training_data.json"
        with open(policy_file, 'w') as f:
            json.dump(policies, f, indent=2, default=str)
        file_paths["policies"] = str(policy_file)
        
        # Generate regulatory changes
        reg_changes = self.generate_regulatory_change_data(20)
        changes_file = self.output_dir / "regulatory_changes_training_data.json"
        with open(changes_file, 'w') as f:
            json.dump(reg_changes, f, indent=2, default=str)
        file_paths["regulatory_changes"] = str(changes_file)
        
        logger.info(f"Generated compliance training datasets: {list(file_paths.keys())}")
        return file_paths
    
    def _document_to_training_format(self, doc: ComplianceDocument) -> Dict[str, Any]:
        """Convert compliance document to training format"""
        return {
            "input": f"Analyze the following compliance document for {doc.regulation_type.value} requirements:\n\n{doc.content}",
            "output": f"This document addresses {doc.regulation_type.value} compliance in the {doc.compliance_area.value} area. "
                     f"Key requirements include: {'; '.join(doc.requirements)}. "
                     f"Risk level: {doc.risk_level}. "
                     f"This applies to {doc.jurisdiction.value} jurisdiction"
                     + (f" in the {doc.industry} industry." if doc.industry else "."),
            "metadata": {
                "document_id": doc.document_id,
                "regulation_type": doc.regulation_type.value,
                "jurisdiction": doc.jurisdiction.value,
                "compliance_area": doc.compliance_area.value,
                "risk_level": doc.risk_level,
                "industry": doc.industry,
                "task_type": "compliance_analysis"
            }
        }
    
    def _scenario_to_training_format(self, scenario: RiskScenario) -> Dict[str, Any]:
        """Convert risk scenario to training format"""
        return {
            "input": f"Assess the following risk scenario:\n\n{scenario.description}\n\n"
                    f"Provide risk assessment and mitigation recommendations.",
            "output": f"Risk Assessment: Likelihood {scenario.likelihood:.2f}, Impact {scenario.impact:.2f}. "
                     f"Risk Level: {self._calculate_risk_level(scenario.likelihood, scenario.impact)}. "
                     f"Recommended mitigation strategies: {'; '.join(scenario.mitigation_strategies)}. "
                     f"Relevant compliance frameworks: {', '.join([fw.value for fw in scenario.compliance_frameworks])}.",
            "metadata": {
                "scenario_id": scenario.scenario_id,
                "risk_type": scenario.risk_type,
                "likelihood": scenario.likelihood,
                "impact": scenario.impact,
                "jurisdiction": scenario.jurisdiction.value,
                "industry": scenario.industry,
                "task_type": "risk_assessment"
            }
        }
    
    def _calculate_risk_level(self, likelihood: float, impact: float) -> str:
        """Calculate risk level from likelihood and impact"""
        risk_score = likelihood * impact
        if risk_score >= 0.6:
            return "High"
        elif risk_score >= 0.3:
            return "Medium"
        else:
            return "Low"

def main():
    """Example usage of compliance data generator"""
    generator = ComplianceDataGenerator("./compliance_training_data")
    
    # Generate all training datasets
    file_paths = generator.save_training_datasets()
    
    print("Generated compliance training datasets:")
    for dataset_type, file_path in file_paths.items():
        print(f"  {dataset_type}: {file_path}")

if __name__ == "__main__":
    main()
