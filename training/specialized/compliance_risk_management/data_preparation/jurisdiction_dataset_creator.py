"""
Jurisdiction-Specific Training Dataset Creator

Creates specialized training datasets for different jurisdictions
including legal frameworks, regulatory requirements, and compliance procedures.
"""

import json
import random
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
import logging

from .compliance_data_generator import Jurisdiction, RegulationType, ComplianceArea

logger = logging.getLogger(__name__)

@dataclass
class JurisdictionProfile:
    """Profile defining jurisdiction-specific characteristics"""
    jurisdiction: Jurisdiction
    legal_system: str  # "common_law", "civil_law", "mixed"
    primary_language: str
    regulatory_bodies: List[str]
    key_regulations: List[RegulationType]
    enforcement_style: str  # "principle_based", "rule_based", "risk_based"
    penalty_structure: Dict[str, Any]
    reporting_requirements: List[str]

class JurisdictionDatasetCreator:
    """Creates training datasets specific to different jurisdictions"""
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Define jurisdiction profiles
        self.jurisdiction_profiles = self._initialize_jurisdiction_profiles()
        
        # Load jurisdiction-specific templates
        self._load_jurisdiction_templates()
    
    def _initialize_jurisdiction_profiles(self) -> Dict[Jurisdiction, JurisdictionProfile]:
        """Initialize profiles for different jurisdictions"""
        return {
            Jurisdiction.US_FEDERAL: JurisdictionProfile(
                jurisdiction=Jurisdiction.US_FEDERAL,
                legal_system="common_law",
                primary_language="english",
                regulatory_bodies=["SEC", "FINRA", "CFTC", "OCC", "Federal Reserve"],
                key_regulations=[RegulationType.SOX, RegulationType.DODD_FRANK],
                enforcement_style="rule_based",
                penalty_structure={
                    "civil_penalties": {"min": 10000, "max": 10000000},
                    "criminal_penalties": {"prison_years": {"min": 1, "max": 20}},
                    "disgorgement": True,
                    "cease_and_desist": True
                },
                reporting_requirements=[
                    "Annual 10-K filing", "Quarterly 10-Q filing", 
                    "Current 8-K filing", "Proxy statements"
                ]
            ),
            
            Jurisdiction.EU: JurisdictionProfile(
                jurisdiction=Jurisdiction.EU,
                legal_system="civil_law",
                primary_language="multi_language",
                regulatory_bodies=["ESMA", "EBA", "EIOPA", "ECB", "National regulators"],
                key_regulations=[RegulationType.GDPR, RegulationType.MiFID_II],
                enforcement_style="principle_based",
                penalty_structure={
                    "administrative_fines": {"percentage": 4, "fixed_amount": 20000000},
                    "corrective_measures": True,
                    "suspension_orders": True,
                    "public_warnings": True
                },
                reporting_requirements=[
                    "Data protection impact assessments", "Breach notifications",
                    "Annual compliance reports", "Transaction reporting"
                ]
            ),
            
            Jurisdiction.UK: JurisdictionProfile(
                jurisdiction=Jurisdiction.UK,
                legal_system="common_law",
                primary_language="english",
                regulatory_bodies=["FCA", "PRA", "ICO", "Bank of England"],
                key_regulations=[RegulationType.GDPR, RegulationType.MiFID_II],
                enforcement_style="principle_based",
                penalty_structure={
                    "unlimited_fines": True,
                    "public_censure": True,
                    "prohibition_orders": True,
                    "restitution": True
                },
                reporting_requirements=[
                    "Regulatory returns", "Client asset reports", 
                    "Conduct risk assessments", "Senior managers regime"
                ]
            ),
            
            Jurisdiction.SINGAPORE: JurisdictionProfile(
                jurisdiction=Jurisdiction.SINGAPORE,
                legal_system="common_law",
                primary_language="english",
                regulatory_bodies=["MAS", "ACRA", "PDPC"],
                key_regulations=[RegulationType.BASEL_III, RegulationType.MiFID_II],
                enforcement_style="risk_based",
                penalty_structure={
                    "composition_fines": {"max": 100000},
                    "court_fines": {"max": 1000000},
                    "imprisonment": {"max_years": 7},
                    "prohibition_orders": True
                },
                reporting_requirements=[
                    "MAS returns", "AML/CFT reports", 
                    "Technology risk management", "Outsourcing notifications"
                ]
            )
        }
    
    def _load_jurisdiction_templates(self):
        """Load jurisdiction-specific content templates"""
        self.jurisdiction_templates = {
            Jurisdiction.US_FEDERAL: {
                "legal_phrases": [
                    "pursuant to federal regulations",
                    "in accordance with SEC requirements",
                    "under the Securities Exchange Act",
                    "as mandated by federal law",
                    "subject to federal oversight"
                ],
                "compliance_language": [
                    "material adverse effect",
                    "reasonable assurance",
                    "internal control over financial reporting",
                    "disclosure controls and procedures",
                    "management's assessment"
                ],
                "enforcement_terms": [
                    "cease and desist order",
                    "civil monetary penalty",
                    "disgorgement of profits",
                    "judicial enforcement action",
                    "administrative proceeding"
                ]
            },
            
            Jurisdiction.EU: {
                "legal_phrases": [
                    "in accordance with EU law",
                    "pursuant to European regulation",
                    "under the GDPR framework",
                    "in compliance with EU directives",
                    "subject to harmonized standards"
                ],
                "compliance_language": [
                    "data protection by design",
                    "legitimate interest",
                    "supervisory authority",
                    "cross-border processing",
                    "one-stop-shop mechanism"
                ],
                "enforcement_terms": [
                    "administrative fine",
                    "corrective measures",
                    "suspension of data flows",
                    "certification withdrawal",
                    "public warning"
                ]
            },
            
            Jurisdiction.UK: {
                "legal_phrases": [
                    "under UK financial services law",
                    "in accordance with FCA principles",
                    "pursuant to UK GDPR",
                    "under the regulatory framework",
                    "subject to UK jurisdiction"
                ],
                "compliance_language": [
                    "treating customers fairly",
                    "senior managers regime",
                    "conduct risk management",
                    "client best interest",
                    "reasonable skill and care"
                ],
                "enforcement_terms": [
                    "unlimited financial penalty",
                    "prohibition order",
                    "public censure",
                    "variation of permission",
                    "skilled person review"
                ]
            }
        }
    
    def generate_us_federal_dataset(self, num_documents: int = 100) -> List[Dict[str, Any]]:
        """Generate US federal compliance training dataset"""
        documents = []
        profile = self.jurisdiction_profiles[Jurisdiction.US_FEDERAL]
        templates = self.jurisdiction_templates[Jurisdiction.US_FEDERAL]
        
        for i in range(num_documents):
            doc_type = random.choice([
                "sox_compliance", "dodd_frank_compliance", 
                "sec_filing", "internal_controls", "risk_management"
            ])
            
            content = self._generate_us_content(doc_type, templates)
            
            document = {
                "document_id": f"us_federal_{i+1:04d}",
                "jurisdiction": profile.jurisdiction.value,
                "document_type": doc_type,
                "title": self._generate_us_title(doc_type),
                "content": content,
                "regulatory_body": random.choice(profile.regulatory_bodies),
                "legal_citation": self._generate_us_citation(doc_type),
                "compliance_requirements": self._generate_us_requirements(doc_type),
                "penalties": self._generate_us_penalties(doc_type, profile.penalty_structure),
                "effective_date": (datetime.now() - timedelta(days=random.randint(30, 1095))).isoformat(),
                "metadata": {
                    "legal_system": profile.legal_system,
                    "enforcement_style": profile.enforcement_style,
                    "task_type": "jurisdiction_compliance"
                }
            }
            documents.append(document)
        
        return documents
    
    def _generate_us_content(self, doc_type: str, templates: Dict[str, List[str]]) -> str:
        """Generate US-specific compliance content"""
        legal_phrase = random.choice(templates["legal_phrases"])
        compliance_term = random.choice(templates["compliance_language"])
        
        content_by_type = {
            "sox_compliance": (
                f"Companies must establish and maintain adequate internal control over financial reporting {legal_phrase}. "
                f"Management must provide {compliance_term} regarding the effectiveness of controls. "
                f"External auditors must attest to management's assessment of internal controls. "
                f"Any material weaknesses or significant deficiencies must be disclosed in annual reports."
            ),
            "dodd_frank_compliance": (
                f"Financial institutions must comply with enhanced risk management requirements {legal_phrase}. "
                f"Proprietary trading restrictions apply to banking entities as defined under the Volcker Rule. "
                f"Systemically important financial institutions are subject to enhanced supervision and regulation. "
                f"Consumer protection measures must be implemented for retail financial products."
            ),
            "sec_filing": (
                f"Public companies must file periodic reports {legal_phrase} including annual 10-K and quarterly 10-Q forms. "
                f"Material events must be disclosed promptly in Form 8-K filings. "
                f"Proxy statements must be filed in advance of shareholder meetings. "
                f"All filings must provide {compliance_term} of financial condition and results of operations."
            )
        }
        
        return content_by_type.get(doc_type, f"Standard compliance content {legal_phrase} with {compliance_term}.")
    
    def _generate_us_title(self, doc_type: str) -> str:
        """Generate US-specific document titles"""
        titles = {
            "sox_compliance": "Sarbanes-Oxley Internal Controls Assessment",
            "dodd_frank_compliance": "Dodd-Frank Risk Management Framework",
            "sec_filing": "SEC Periodic Reporting Requirements",
            "internal_controls": "Internal Control Over Financial Reporting",
            "risk_management": "Enterprise Risk Management Policy"
        }
        return titles.get(doc_type, "Federal Compliance Document")
    
    def _generate_us_citation(self, doc_type: str) -> str:
        """Generate US legal citations"""
        citations = {
            "sox_compliance": "Sarbanes-Oxley Act Section 404, 15 U.S.C. § 7262",
            "dodd_frank_compliance": "Dodd-Frank Act Section 619, 12 U.S.C. § 1851",
            "sec_filing": "Securities Exchange Act Section 13, 15 U.S.C. § 78m",
            "internal_controls": "Securities Exchange Act Rule 13a-15, 17 CFR § 240.13a-15",
            "risk_management": "12 CFR Part 252 - Enhanced Prudential Standards"
        }
        return citations.get(doc_type, "Federal Regulation Citation")
    
    def _generate_us_requirements(self, doc_type: str) -> List[str]:
        """Generate US compliance requirements"""
        requirements_by_type = {
            "sox_compliance": [
                "Annual management assessment of internal controls",
                "External auditor attestation report",
                "Documentation of control procedures",
                "Testing of control effectiveness"
            ],
            "dodd_frank_compliance": [
                "Enhanced capital and liquidity standards",
                "Comprehensive risk management framework",
                "Resolution planning (living wills)",
                "Stress testing procedures"
            ],
            "sec_filing": [
                "Timely filing of periodic reports",
                "Accurate and complete financial disclosures",
                "Material event reporting",
                "Audited financial statements"
            ]
        }
        
        return requirements_by_type.get(doc_type, ["Standard compliance requirements"])
    
    def _generate_us_penalties(self, doc_type: str, penalty_structure: Dict[str, Any]) -> Dict[str, Any]:
        """Generate US penalty information"""
        civil_min = penalty_structure["civil_penalties"]["min"]
        civil_max = penalty_structure["civil_penalties"]["max"]
        
        return {
            "civil_penalties": f"${civil_min:,} to ${civil_max:,}",
            "criminal_penalties": "Up to 20 years imprisonment",
            "other_remedies": ["Disgorgement", "Cease and desist orders", "Officer and director bars"],
            "repeat_offense_multiplier": 2.0
        }
    
    def generate_eu_dataset(self, num_documents: int = 100) -> List[Dict[str, Any]]:
        """Generate EU compliance training dataset"""
        documents = []
        profile = self.jurisdiction_profiles[Jurisdiction.EU]
        templates = self.jurisdiction_templates[Jurisdiction.EU]
        
        for i in range(num_documents):
            doc_type = random.choice([
                "gdpr_compliance", "mifid_compliance", 
                "data_protection", "market_conduct", "prudential_requirements"
            ])
            
            content = self._generate_eu_content(doc_type, templates)
            
            document = {
                "document_id": f"eu_{i+1:04d}",
                "jurisdiction": profile.jurisdiction.value,
                "document_type": doc_type,
                "title": self._generate_eu_title(doc_type),
                "content": content,
                "regulatory_body": random.choice(profile.regulatory_bodies),
                "legal_citation": self._generate_eu_citation(doc_type),
                "compliance_requirements": self._generate_eu_requirements(doc_type),
                "penalties": self._generate_eu_penalties(doc_type, profile.penalty_structure),
                "member_state": random.choice([
                    "Germany", "France", "Italy", "Spain", "Netherlands", 
                    "Belgium", "Austria", "Ireland", "Luxembourg"
                ]),
                "language_versions": random.sample([
                    "EN", "DE", "FR", "IT", "ES", "NL"
                ], k=random.randint(2, 4)),
                "effective_date": datetime(2018, 5, 25).isoformat(),  # GDPR effective date
                "metadata": {
                    "legal_system": profile.legal_system,
                    "enforcement_style": profile.enforcement_style,
                    "harmonized": True,
                    "task_type": "jurisdiction_compliance"
                }
            }
            documents.append(document)
        
        return documents
    
    def _generate_eu_content(self, doc_type: str, templates: Dict[str, List[str]]) -> str:
        """Generate EU-specific compliance content"""
        legal_phrase = random.choice(templates["legal_phrases"])
        compliance_term = random.choice(templates["compliance_language"])
        
        content_by_type = {
            "gdpr_compliance": (
                f"Data controllers and processors must ensure compliance with data protection principles {legal_phrase}. "
                f"Processing must have a lawful basis and implement {compliance_term} measures. "
                f"Data subjects have enhanced rights including access, rectification, erasure, and portability. "
                f"Data protection impact assessments are required for high-risk processing activities."
            ),
            "mifid_compliance": (
                f"Investment firms must comply with conduct of business rules {legal_phrase}. "
                f"Best execution requirements apply to client order handling and execution. "
                f"Product governance frameworks must ensure suitable product design and distribution. "
                f"Enhanced investor protection measures apply to retail and professional clients."
            ),
            "data_protection": (
                f"Organizations must implement appropriate technical and organizational measures {legal_phrase}. "
                f"Privacy by design and by default principles must be embedded in processing activities. "
                f"Cross-border data transfers require adequate protection safeguards. "
                f"Breach notification obligations apply to both supervisory authorities and data subjects."
            )
        }
        
        return content_by_type.get(doc_type, f"EU compliance requirements {legal_phrase} with {compliance_term}.")
    
    def _generate_eu_title(self, doc_type: str) -> str:
        """Generate EU-specific document titles"""
        titles = {
            "gdpr_compliance": "General Data Protection Regulation Compliance Guide",
            "mifid_compliance": "Markets in Financial Instruments Directive Implementation",
            "data_protection": "Data Protection Impact Assessment Procedures",
            "market_conduct": "Market Conduct and Investor Protection Framework",
            "prudential_requirements": "Capital Requirements Directive Implementation"
        }
        return titles.get(doc_type, "EU Regulatory Compliance Document")
    
    def _generate_eu_citation(self, doc_type: str) -> str:
        """Generate EU legal citations"""
        citations = {
            "gdpr_compliance": "Regulation (EU) 2016/679 (General Data Protection Regulation)",
            "mifid_compliance": "Directive 2014/65/EU (Markets in Financial Instruments Directive II)",
            "data_protection": "Article 35 GDPR - Data Protection Impact Assessment",
            "market_conduct": "Commission Delegated Regulation (EU) 2017/565",
            "prudential_requirements": "Directive 2013/36/EU (Capital Requirements Directive IV)"
        }
        return citations.get(doc_type, "EU Regulation Citation")
    
    def _generate_eu_requirements(self, doc_type: str) -> List[str]:
        """Generate EU compliance requirements"""
        requirements_by_type = {
            "gdpr_compliance": [
                "Lawful basis for processing personal data",
                "Data subject consent management",
                "Privacy impact assessments for high-risk processing",
                "Breach notification within 72 hours"
            ],
            "mifid_compliance": [
                "Client categorization and suitability assessments",
                "Best execution monitoring and reporting",
                "Product governance arrangements",
                "Conduct risk management frameworks"
            ],
            "data_protection": [
                "Privacy by design implementation",
                "Data protection officer appointment",
                "Records of processing activities",
                "International data transfer safeguards"
            ]
        }
        
        return requirements_by_type.get(doc_type, ["Standard EU compliance requirements"])
    
    def _generate_eu_penalties(self, doc_type: str, penalty_structure: Dict[str, Any]) -> Dict[str, Any]:
        """Generate EU penalty information"""
        return {
            "administrative_fines": "Up to 4% of annual global turnover or €20 million",
            "corrective_measures": ["Suspension of data processing", "Certification withdrawal"],
            "public_warnings": True,
            "enforcement_authority": "Lead supervisory authority under one-stop-shop mechanism"
        }
    
    def create_cross_jurisdiction_comparison_dataset(self, num_comparisons: int = 50) -> List[Dict[str, Any]]:
        """Create dataset comparing compliance across jurisdictions"""
        comparisons = []
        
        jurisdiction_pairs = [
            (Jurisdiction.US_FEDERAL, Jurisdiction.EU),
            (Jurisdiction.US_FEDERAL, Jurisdiction.UK),
            (Jurisdiction.EU, Jurisdiction.UK),
            (Jurisdiction.US_FEDERAL, Jurisdiction.SINGAPORE),
            (Jurisdiction.EU, Jurisdiction.SINGAPORE)
        ]
        
        compliance_areas = [
            "data_protection", "financial_reporting", "market_conduct",
            "risk_management", "consumer_protection"
        ]
        
        for i in range(num_comparisons):
            jurisdiction_a, jurisdiction_b = random.choice(jurisdiction_pairs)
            compliance_area = random.choice(compliance_areas)
            
            comparison = {
                "comparison_id": f"cross_jurisdiction_{i+1:04d}",
                "jurisdiction_a": jurisdiction_a.value,
                "jurisdiction_b": jurisdiction_b.value,
                "compliance_area": compliance_area,
                "similarities": self._generate_similarities(jurisdiction_a, jurisdiction_b, compliance_area),
                "differences": self._generate_differences(jurisdiction_a, jurisdiction_b, compliance_area),
                "key_considerations": self._generate_key_considerations(jurisdiction_a, jurisdiction_b),
                "recommendation": self._generate_cross_jurisdiction_recommendation(jurisdiction_a, jurisdiction_b),
                "metadata": {
                    "comparison_type": "cross_jurisdiction",
                    "task_type": "jurisdiction_comparison"
                }
            }
            comparisons.append(comparison)
        
        return comparisons
    
    def _generate_similarities(self, jurisdiction_a: Jurisdiction, jurisdiction_b: Jurisdiction, area: str) -> List[str]:
        """Generate similarities between jurisdictions"""
        common_similarities = [
            "Both require regular compliance monitoring and reporting",
            "Similar risk-based approach to enforcement",
            "Comparable penalties for serious violations",
            "Both emphasize senior management accountability"
        ]
        
        return random.sample(common_similarities, k=2)
    
    def _generate_differences(self, jurisdiction_a: Jurisdiction, jurisdiction_b: Jurisdiction, area: str) -> List[str]:
        """Generate differences between jurisdictions"""
        profile_a = self.jurisdiction_profiles[jurisdiction_a]
        profile_b = self.jurisdiction_profiles[jurisdiction_b]
        
        differences = [
            f"{jurisdiction_a.value} follows {profile_a.enforcement_style} approach vs {jurisdiction_b.value} {profile_b.enforcement_style} approach",
            f"Different penalty structures and maximum amounts",
            f"Varying regulatory body oversight and supervision",
            f"Different reporting frequency and requirements"
        ]
        
        return differences[:3]
    
    def _generate_key_considerations(self, jurisdiction_a: Jurisdiction, jurisdiction_b: Jurisdiction) -> List[str]:
        """Generate key considerations for cross-jurisdiction compliance"""
        considerations = [
            "Legal entity structure and regulatory permissions",
            "Data localization and cross-border transfer requirements",
            "Regulatory reporting coordination and timing",
            "Local language and documentation requirements",
            "Cultural and business practice differences"
        ]
        
        return random.sample(considerations, k=3)
    
    def _generate_cross_jurisdiction_recommendation(self, jurisdiction_a: Jurisdiction, jurisdiction_b: Jurisdiction) -> str:
        """Generate recommendation for cross-jurisdiction compliance"""
        recommendations = [
            f"Establish unified compliance framework that meets requirements in both {jurisdiction_a.value} and {jurisdiction_b.value}.",
            f"Implement higher standard approach to ensure compliance across both jurisdictions.",
            f"Develop jurisdiction-specific procedures while maintaining common control framework.",
            f"Consider local partnerships or subsidiaries to address jurisdiction-specific requirements."
        ]
        
        return random.choice(recommendations)
    
    def save_jurisdiction_datasets(self) -> Dict[str, str]:
        """Generate and save all jurisdiction-specific datasets"""
        logger.info("Generating jurisdiction-specific training datasets...")
        
        file_paths = {}
        
        # Generate US federal dataset
        us_data = self.generate_us_federal_dataset(100)
        us_file = self.output_dir / "us_federal_compliance_data.json"
        with open(us_file, 'w') as f:
            json.dump(us_data, f, indent=2, default=str)
        file_paths["us_federal"] = str(us_file)
        
        # Generate EU dataset
        eu_data = self.generate_eu_dataset(100)
        eu_file = self.output_dir / "eu_compliance_data.json"
        with open(eu_file, 'w') as f:
            json.dump(eu_data, f, indent=2, default=str)
        file_paths["eu"] = str(eu_file)
        
        # Generate cross-jurisdiction comparisons
        cross_jurisdiction_data = self.create_cross_jurisdiction_comparison_dataset(50)
        cross_file = self.output_dir / "cross_jurisdiction_comparison_data.json"
        with open(cross_file, 'w') as f:
            json.dump(cross_jurisdiction_data, f, indent=2, default=str)
        file_paths["cross_jurisdiction"] = str(cross_file)
        
        logger.info(f"Generated jurisdiction datasets: {list(file_paths.keys())}")
        return file_paths

def main():
    """Example usage of jurisdiction dataset creator"""
    creator = JurisdictionDatasetCreator("./jurisdiction_training_data")
    
    # Generate all jurisdiction datasets
    file_paths = creator.save_jurisdiction_datasets()
    
    print("Generated jurisdiction-specific training datasets:")
    for dataset_type, file_path in file_paths.items():
        print(f"  {dataset_type}: {file_path}")

if __name__ == "__main__":
    main()
