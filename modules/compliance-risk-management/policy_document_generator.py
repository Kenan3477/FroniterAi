"""
Automated Policy Document Generator
Generates privacy policies, terms of service, and compliance documentation
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
import re

logger = logging.getLogger(__name__)

class DocumentType(Enum):
    PRIVACY_POLICY = "privacy_policy"
    TERMS_OF_SERVICE = "terms_of_service"
    COOKIE_POLICY = "cookie_policy"
    DATA_PROCESSING_AGREEMENT = "data_processing_agreement"
    GDPR_NOTICE = "gdpr_notice"
    CCPA_NOTICE = "ccpa_notice"
    HIPAA_NOTICE = "hipaa_notice"
    EMPLOYEE_HANDBOOK = "employee_handbook"
    VENDOR_AGREEMENT = "vendor_agreement"
    INCIDENT_RESPONSE_PLAN = "incident_response_plan"

class JurisdictionType(Enum):
    UNITED_STATES = "us"
    EUROPEAN_UNION = "eu"
    CALIFORNIA = "ca"
    UNITED_KINGDOM = "uk"
    CANADA = "canada"
    AUSTRALIA = "australia"
    SINGAPORE = "singapore"
    GLOBAL = "global"

@dataclass
class OrganizationProfile:
    """Organization profile for policy generation"""
    name: str
    legal_name: str
    industry: str
    jurisdiction: JurisdictionType
    business_type: str  # B2B, B2C, B2B2C
    website_url: str
    contact_email: str
    contact_address: str
    data_protection_officer: Optional[str] = None
    privacy_officer: Optional[str] = None
    
    # Data processing details
    data_types_collected: List[str] = field(default_factory=list)
    data_processing_purposes: List[str] = field(default_factory=list)
    data_sharing_practices: List[str] = field(default_factory=list)
    data_retention_periods: Dict[str, str] = field(default_factory=dict)
    
    # Services and features
    services_offered: List[str] = field(default_factory=list)
    third_party_services: List[str] = field(default_factory=list)
    cookies_used: List[str] = field(default_factory=list)
    
    # Compliance requirements
    applicable_regulations: List[str] = field(default_factory=list)
    age_restrictions: Optional[int] = None
    international_transfers: bool = False

@dataclass
class PolicyTemplate:
    """Template for generating policy documents"""
    document_type: DocumentType
    jurisdiction: JurisdictionType
    template_content: str
    required_sections: List[str]
    optional_sections: List[str]
    legal_requirements: List[str]
    customization_fields: Dict[str, str]
    last_updated: datetime

class AutomatedPolicyGenerator:
    """
    Automated generator for legal and compliance documents
    with jurisdiction-specific templates and requirements
    """
    
    def __init__(self):
        self.templates: Dict[str, PolicyTemplate] = {}
        self.legal_requirements = {}
        self.regulation_mappings = {}
        self._initialize_templates()
        self._initialize_legal_requirements()
    
    def _initialize_templates(self) -> None:
        """Initialize policy document templates"""
        
        # Privacy Policy Templates
        self.templates["privacy_policy_us"] = PolicyTemplate(
            document_type=DocumentType.PRIVACY_POLICY,
            jurisdiction=JurisdictionType.UNITED_STATES,
            template_content=self._get_us_privacy_policy_template(),
            required_sections=[
                "Information We Collect",
                "How We Use Information",
                "Information Sharing",
                "Data Security",
                "Your Rights",
                "Contact Information"
            ],
            optional_sections=[
                "Cookies and Tracking",
                "Children's Privacy",
                "International Transfers",
                "State-Specific Rights"
            ],
            legal_requirements=[
                "CCPA compliance for California residents",
                "COPPA compliance for children under 13",
                "State privacy law compliance"
            ],
            customization_fields={
                "organization_name": "string",
                "contact_email": "string",
                "effective_date": "date",
                "data_types": "list",
                "purposes": "list"
            },
            last_updated=datetime.now()
        )
        
        self.templates["privacy_policy_eu"] = PolicyTemplate(
            document_type=DocumentType.PRIVACY_POLICY,
            jurisdiction=JurisdictionType.EUROPEAN_UNION,
            template_content=self._get_eu_privacy_policy_template(),
            required_sections=[
                "Legal Basis for Processing",
                "Data Subject Rights",
                "Data Retention",
                "International Transfers",
                "Data Protection Officer",
                "Supervisory Authority"
            ],
            optional_sections=[
                "Automated Decision Making",
                "Marketing Communications",
                "Third Country Transfers"
            ],
            legal_requirements=[
                "GDPR Article 13/14 compliance",
                "Lawful basis identification",
                "Data subject rights information",
                "DPO contact details"
            ],
            customization_fields={
                "organization_name": "string",
                "dpo_contact": "string",
                "legal_basis": "string",
                "retention_periods": "dict"
            },
            last_updated=datetime.now()
        )
        
        # Terms of Service Templates
        self.templates["terms_of_service_us"] = PolicyTemplate(
            document_type=DocumentType.TERMS_OF_SERVICE,
            jurisdiction=JurisdictionType.UNITED_STATES,
            template_content=self._get_us_terms_template(),
            required_sections=[
                "Acceptance of Terms",
                "Description of Service",
                "User Accounts",
                "Prohibited Uses",
                "Limitation of Liability",
                "Governing Law"
            ],
            optional_sections=[
                "Subscription Terms",
                "Intellectual Property",
                "Termination",
                "Dispute Resolution"
            ],
            legal_requirements=[
                "Clear terms acceptance",
                "Liability limitations",
                "Governing law specification"
            ],
            customization_fields={
                "service_name": "string",
                "governing_state": "string",
                "dispute_resolution": "string"
            },
            last_updated=datetime.now()
        )
    
    def _initialize_legal_requirements(self) -> None:
        """Initialize legal requirements by jurisdiction and regulation"""
        
        self.legal_requirements = {
            JurisdictionType.UNITED_STATES: {
                "privacy_policy": [
                    "CCPA: Right to know, delete, opt-out",
                    "COPPA: Parental consent for children under 13",
                    "HIPAA: PHI protection notices (if applicable)",
                    "State laws: Various state privacy requirements"
                ],
                "terms_of_service": [
                    "Clear acceptance mechanism",
                    "Limitation of liability clauses",
                    "Governing law specification",
                    "DMCA compliance (if applicable)"
                ]
            },
            JurisdictionType.EUROPEAN_UNION: {
                "privacy_policy": [
                    "GDPR Article 13/14: Transparency requirements",
                    "Legal basis for each processing purpose",
                    "Data subject rights enumeration",
                    "DPO contact information",
                    "Supervisory authority details"
                ],
                "terms_of_service": [
                    "Unfair contract terms directive compliance",
                    "Consumer rights directive compliance",
                    "Digital services act compliance",
                    "Cooling-off period for distance contracts"
                ]
            },
            JurisdictionType.CALIFORNIA: {
                "privacy_policy": [
                    "CCPA: Categories of personal information",
                    "CCPA: Business purposes for collection",
                    "CCPA: Consumer rights and exercise methods",
                    "CPRA: Sensitive personal information handling",
                    "CalOPPA: Privacy policy requirements"
                ]
            }
        }
        
        self.regulation_mappings = {
            "GDPR": {
                "applicable_jurisdictions": [JurisdictionType.EUROPEAN_UNION],
                "required_notices": ["legal_basis", "data_subject_rights", "retention_periods"],
                "mandatory_sections": ["purpose_limitation", "data_minimization"]
            },
            "CCPA": {
                "applicable_jurisdictions": [JurisdictionType.CALIFORNIA, JurisdictionType.UNITED_STATES],
                "required_notices": ["categories_collected", "business_purposes", "consumer_rights"],
                "mandatory_sections": ["right_to_know", "right_to_delete", "right_to_opt_out"]
            },
            "HIPAA": {
                "applicable_jurisdictions": [JurisdictionType.UNITED_STATES],
                "required_notices": ["phi_uses", "patient_rights", "complaint_procedures"],
                "mandatory_sections": ["notice_of_privacy_practices"]
            }
        }
    
    async def generate_privacy_policy(
        self,
        organization: OrganizationProfile,
        custom_clauses: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Generate a comprehensive privacy policy"""
        
        try:
            logger.info(f"Generating privacy policy for {organization.name}")
            
            # Select appropriate template
            template_key = f"privacy_policy_{organization.jurisdiction.value}"
            if template_key not in self.templates:
                template_key = "privacy_policy_us"  # Default fallback
            
            template = self.templates[template_key]
            
            # Generate policy content
            policy_content = await self._generate_policy_content(
                template, organization, custom_clauses
            )
            
            # Validate against legal requirements
            validation_results = self._validate_policy_compliance(
                policy_content, organization.jurisdiction, DocumentType.PRIVACY_POLICY
            )
            
            return {
                "document_type": "Privacy Policy",
                "organization": organization.name,
                "jurisdiction": organization.jurisdiction.value,
                "effective_date": datetime.now().isoformat(),
                "content": policy_content,
                "validation": validation_results,
                "template_used": template_key,
                "customizations_applied": len(custom_clauses) if custom_clauses else 0
            }
            
        except Exception as e:
            logger.error(f"Error generating privacy policy: {e}")
            raise
    
    async def generate_terms_of_service(
        self,
        organization: OrganizationProfile,
        service_specific_terms: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive terms of service"""
        
        try:
            logger.info(f"Generating terms of service for {organization.name}")
            
            # Select appropriate template
            template_key = f"terms_of_service_{organization.jurisdiction.value}"
            if template_key not in self.templates:
                template_key = "terms_of_service_us"  # Default fallback
            
            template = self.templates[template_key]
            
            # Generate terms content
            terms_content = await self._generate_terms_content(
                template, organization, service_specific_terms
            )
            
            # Validate against legal requirements
            validation_results = self._validate_policy_compliance(
                terms_content, organization.jurisdiction, DocumentType.TERMS_OF_SERVICE
            )
            
            return {
                "document_type": "Terms of Service",
                "organization": organization.name,
                "jurisdiction": organization.jurisdiction.value,
                "effective_date": datetime.now().isoformat(),
                "content": terms_content,
                "validation": validation_results,
                "template_used": template_key,
                "service_terms_included": bool(service_specific_terms)
            }
            
        except Exception as e:
            logger.error(f"Error generating terms of service: {e}")
            raise
    
    async def generate_cookie_policy(
        self,
        organization: OrganizationProfile
    ) -> Dict[str, Any]:
        """Generate comprehensive cookie policy"""
        
        try:
            logger.info(f"Generating cookie policy for {organization.name}")
            
            cookie_content = await self._generate_cookie_policy_content(organization)
            
            return {
                "document_type": "Cookie Policy",
                "organization": organization.name,
                "effective_date": datetime.now().isoformat(),
                "content": cookie_content,
                "cookies_documented": len(organization.cookies_used)
            }
            
        except Exception as e:
            logger.error(f"Error generating cookie policy: {e}")
            raise
    
    async def generate_gdpr_privacy_notice(
        self,
        organization: OrganizationProfile,
        processing_activities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate GDPR-compliant privacy notice"""
        
        try:
            logger.info(f"Generating GDPR privacy notice for {organization.name}")
            
            notice_content = await self._generate_gdpr_notice_content(
                organization, processing_activities
            )
            
            return {
                "document_type": "GDPR Privacy Notice",
                "organization": organization.name,
                "effective_date": datetime.now().isoformat(),
                "content": notice_content,
                "processing_activities": len(processing_activities)
            }
            
        except Exception as e:
            logger.error(f"Error generating GDPR notice: {e}")
            raise
    
    async def _generate_policy_content(
        self,
        template: PolicyTemplate,
        organization: OrganizationProfile,
        custom_clauses: Optional[List[str]] = None
    ) -> str:
        """Generate policy content from template"""
        
        content = template.template_content
        
        # Replace placeholders with organization data
        replacements = {
            "{ORGANIZATION_NAME}": organization.name,
            "{LEGAL_NAME}": organization.legal_name,
            "{CONTACT_EMAIL}": organization.contact_email,
            "{WEBSITE_URL}": organization.website_url,
            "{EFFECTIVE_DATE}": datetime.now().strftime("%B %d, %Y"),
            "{CONTACT_ADDRESS}": organization.contact_address,
            "{DPO_CONTACT}": organization.data_protection_officer or "Not applicable",
            "{DATA_TYPES}": self._format_list(organization.data_types_collected),
            "{PROCESSING_PURPOSES}": self._format_list(organization.data_processing_purposes),
            "{THIRD_PARTIES}": self._format_list(organization.data_sharing_practices)
        }
        
        for placeholder, value in replacements.items():
            content = content.replace(placeholder, value)
        
        # Add custom clauses if provided
        if custom_clauses:
            custom_section = "\n\n## Additional Terms\n\n"
            for clause in custom_clauses:
                custom_section += f"- {clause}\n"
            content += custom_section
        
        return content
    
    async def _generate_terms_content(
        self,
        template: PolicyTemplate,
        organization: OrganizationProfile,
        service_terms: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate terms of service content"""
        
        content = template.template_content
        
        # Replace placeholders
        replacements = {
            "{SERVICE_NAME}": organization.services_offered[0] if organization.services_offered else "our service",
            "{ORGANIZATION_NAME}": organization.name,
            "{CONTACT_EMAIL}": organization.contact_email,
            "{GOVERNING_LAW}": self._get_governing_law(organization.jurisdiction),
            "{EFFECTIVE_DATE}": datetime.now().strftime("%B %d, %Y")
        }
        
        for placeholder, value in replacements.items():
            content = content.replace(placeholder, value)
        
        # Add service-specific terms
        if service_terms:
            service_section = "\n\n## Service-Specific Terms\n\n"
            for term_type, term_content in service_terms.items():
                service_section += f"### {term_type.replace('_', ' ').title()}\n{term_content}\n\n"
            content += service_section
        
        return content
    
    async def _generate_cookie_policy_content(
        self,
        organization: OrganizationProfile
    ) -> str:
        """Generate cookie policy content"""
        
        content = f"""# Cookie Policy

**Effective Date:** {datetime.now().strftime("%B %d, %Y")}

## What Are Cookies

{organization.name} ("we", "our", or "us") uses cookies on {organization.website_url} (the "Service"). By using the Service, you consent to the use of cookies.

Our Cookie Policy explains what cookies are, how we use cookies, how third-parties we may partner with may use cookies on the Service, your choices regarding cookies and further information about cookies.

## How We Use Cookies

We use cookies for the following purposes:

"""
        
        # Add cookie categories
        cookie_categories = {
            "Essential Cookies": "These cookies are essential for the operation of our Service and cannot be disabled.",
            "Analytics Cookies": "These cookies help us understand how visitors interact with our Service.",
            "Marketing Cookies": "These cookies are used to deliver advertisements relevant to you.",
            "Preference Cookies": "These cookies allow our Service to remember your preferences."
        }
        
        for category, description in cookie_categories.items():
            content += f"### {category}\n{description}\n\n"
        
        # Add specific cookies if documented
        if organization.cookies_used:
            content += "## Specific Cookies We Use\n\n"
            for cookie in organization.cookies_used:
                content += f"- **{cookie}**: [Purpose and duration]\n"
        
        content += f"""
## Your Choices Regarding Cookies

You can choose to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer.

## Contact Us

If you have any questions about this Cookie Policy, please contact us at {organization.contact_email}.
"""
        
        return content
    
    async def _generate_gdpr_notice_content(
        self,
        organization: OrganizationProfile,
        processing_activities: List[Dict[str, Any]]
    ) -> str:
        """Generate GDPR-compliant privacy notice"""
        
        content = f"""# Privacy Notice (GDPR)

**Data Controller:** {organization.legal_name}
**Contact:** {organization.contact_email}
**Data Protection Officer:** {organization.data_protection_officer or 'Not appointed'}
**Effective Date:** {datetime.now().strftime("%B %d, %Y")}

## Your Rights Under GDPR

As a data subject, you have the following rights:

1. **Right to be informed** - You have the right to be informed about how your personal data is being used.
2. **Right of access** - You have the right to request access to your personal data.
3. **Right to rectification** - You have the right to have inaccurate personal data corrected.
4. **Right to erasure** - You have the right to request deletion of your personal data.
5. **Right to restrict processing** - You have the right to restrict how your personal data is processed.
6. **Right to data portability** - You have the right to receive your personal data in a portable format.
7. **Right to object** - You have the right to object to processing of your personal data.
8. **Rights related to automated decision making** - You have rights regarding automated decision-making and profiling.

## Processing Activities

"""
        
        for activity in processing_activities:
            content += f"""### {activity.get('purpose', 'Processing Activity')}

- **Legal Basis:** {activity.get('legal_basis', 'Not specified')}
- **Data Categories:** {', '.join(activity.get('data_categories', []))}
- **Retention Period:** {activity.get('retention_period', 'Not specified')}
- **Recipients:** {', '.join(activity.get('recipients', ['None']))}

"""
        
        content += f"""
## International Transfers

{'We transfer personal data outside the EU/EEA.' if organization.international_transfers else 'We do not transfer personal data outside the EU/EEA.'}

## Contact Information

To exercise your rights or ask questions about this notice, contact:

**Data Controller:** {organization.legal_name}
**Email:** {organization.contact_email}
**Address:** {organization.contact_address}

**Supervisory Authority:** You have the right to lodge a complaint with your local supervisory authority.
"""
        
        return content
    
    def _validate_policy_compliance(
        self,
        content: str,
        jurisdiction: JurisdictionType,
        document_type: DocumentType
    ) -> Dict[str, Any]:
        """Validate policy compliance against legal requirements"""
        
        validation_results = {
            "is_compliant": True,
            "missing_requirements": [],
            "recommendations": [],
            "jurisdiction": jurisdiction.value,
            "document_type": document_type.value
        }
        
        # Get legal requirements for jurisdiction and document type
        requirements = self.legal_requirements.get(jurisdiction, {}).get(
            document_type.value.replace("_", " "), []
        )
        
        # Check for required elements (simplified validation)
        required_terms = {
            DocumentType.PRIVACY_POLICY: [
                "personal data", "information", "privacy", "contact",
                "rights", "processing", "collection"
            ],
            DocumentType.TERMS_OF_SERVICE: [
                "terms", "service", "agreement", "liability",
                "governing law", "termination"
            ]
        }
        
        if document_type in required_terms:
            content_lower = content.lower()
            for term in required_terms[document_type]:
                if term not in content_lower:
                    validation_results["missing_requirements"].append(f"Missing reference to '{term}'")
                    validation_results["is_compliant"] = False
        
        # Add jurisdiction-specific recommendations
        if jurisdiction == JurisdictionType.EUROPEAN_UNION:
            validation_results["recommendations"].append("Ensure GDPR Article 13/14 compliance")
            validation_results["recommendations"].append("Include DPO contact information")
        elif jurisdiction == JurisdictionType.CALIFORNIA:
            validation_results["recommendations"].append("Ensure CCPA consumer rights disclosure")
            validation_results["recommendations"].append("Include opt-out mechanism")
        
        return validation_results
    
    def _format_list(self, items: List[str]) -> str:
        """Format list items for policy text"""
        if not items:
            return "None specified"
        return ", ".join(items)
    
    def _get_governing_law(self, jurisdiction: JurisdictionType) -> str:
        """Get governing law text for jurisdiction"""
        
        law_mappings = {
            JurisdictionType.UNITED_STATES: "the laws of the United States",
            JurisdictionType.CALIFORNIA: "the laws of the State of California",
            JurisdictionType.EUROPEAN_UNION: "the laws of the European Union",
            JurisdictionType.UNITED_KINGDOM: "the laws of England and Wales",
            JurisdictionType.CANADA: "the laws of Canada",
            JurisdictionType.AUSTRALIA: "the laws of Australia"
        }
        
        return law_mappings.get(jurisdiction, "applicable local laws")
    
    def _get_us_privacy_policy_template(self) -> str:
        """Get US privacy policy template"""
        return """# Privacy Policy

**Effective Date:** {EFFECTIVE_DATE}

{ORGANIZATION_NAME} ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.

## Information We Collect

We may collect the following types of information:

{DATA_TYPES}

## How We Use Your Information

We use the information we collect for the following purposes:

{PROCESSING_PURPOSES}

## Information Sharing and Disclosure

We may share your information with:

{THIRD_PARTIES}

## Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Your Rights

Depending on your location, you may have certain rights regarding your personal information, including:

- Right to access your personal information
- Right to correct inaccurate information
- Right to delete your information
- Right to opt-out of certain processing

## Contact Us

If you have questions about this Privacy Policy, please contact us at {CONTACT_EMAIL}.

**{ORGANIZATION_NAME}**
{CONTACT_ADDRESS}
"""
    
    def _get_eu_privacy_policy_template(self) -> str:
        """Get EU GDPR privacy policy template"""
        return """# Privacy Policy (GDPR)

**Data Controller:** {LEGAL_NAME}
**Data Protection Officer:** {DPO_CONTACT}
**Effective Date:** {EFFECTIVE_DATE}

## Legal Basis for Processing

We process your personal data based on the following legal bases:

- Consent (Article 6(1)(a) GDPR)
- Contract performance (Article 6(1)(b) GDPR)
- Legal obligation (Article 6(1)(c) GDPR)
- Legitimate interests (Article 6(1)(f) GDPR)

## Data We Process

We process the following categories of personal data:

{DATA_TYPES}

## Purposes of Processing

We process your personal data for:

{PROCESSING_PURPOSES}

## Data Subject Rights

Under GDPR, you have the right to:

1. Access your personal data (Article 15)
2. Rectify inaccurate data (Article 16)
3. Erase your data (Article 17)
4. Restrict processing (Article 18)
5. Data portability (Article 20)
6. Object to processing (Article 21)
7. Withdraw consent (Article 7(3))

## Data Retention

We retain your personal data only as long as necessary for the purposes outlined in this policy.

## International Transfers

Any transfers of your personal data outside the EU/EEA are subject to appropriate safeguards.

## Contact Information

**Data Controller:** {LEGAL_NAME}
**Email:** {CONTACT_EMAIL}
**Address:** {CONTACT_ADDRESS}
**DPO:** {DPO_CONTACT}

You have the right to lodge a complaint with your supervisory authority.
"""
    
    def _get_us_terms_template(self) -> str:
        """Get US terms of service template"""
        return """# Terms of Service

**Effective Date:** {EFFECTIVE_DATE}

## Acceptance of Terms

By accessing and using {SERVICE_NAME}, you accept and agree to be bound by the terms and provision of this agreement.

## Description of Service

{ORGANIZATION_NAME} provides {SERVICE_NAME} to help users [describe service].

## User Accounts

You are responsible for safeguarding the password and for maintaining the confidentiality of your account.

## Prohibited Uses

You may not use our service:
- For any unlawful purpose or to solicit others to take unlawful actions
- To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances
- To infringe upon or violate our intellectual property rights or the intellectual property rights of others

## Limitation of Liability

{ORGANIZATION_NAME} shall not be held liable for any indirect, incidental, special, consequential, or punitive damages.

## Governing Law

These Terms shall be interpreted and governed by {GOVERNING_LAW}.

## Contact Information

Questions about the Terms of Service should be sent to us at {CONTACT_EMAIL}.
"""
