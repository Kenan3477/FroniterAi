"""
Comprehensive Policy Document Generator

Advanced policy document generation system supporting multiple document types,
jurisdictions, and regulatory requirements with automated compliance validation
and jurisdiction-specific variations.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import re
import logging
from pathlib import Path
import jinja2
from markupsafe import Markup

from .core_compliance_framework import (
    Regulation, Industry, Jurisdiction, DocumentType, PolicyDocument,
    ComplianceDatabaseManager
)

logger = logging.getLogger(__name__)

class PolicySection(Enum):
    """Standard policy document sections"""
    INTRODUCTION = "introduction"
    PURPOSE = "purpose"
    SCOPE = "scope"
    DEFINITIONS = "definitions"
    POLICY_STATEMENT = "policy_statement"
    PROCEDURES = "procedures"
    RESPONSIBILITIES = "responsibilities"
    ENFORCEMENT = "enforcement"
    MONITORING = "monitoring"
    REVIEW = "review"
    CONTACT_INFORMATION = "contact_information"
    APPENDICES = "appendices"

@dataclass
class PolicyTemplate:
    """Policy document template structure"""
    template_id: str
    document_type: DocumentType
    name: str
    description: str
    applicable_jurisdictions: List[Jurisdiction]
    applicable_regulations: List[Regulation]
    required_sections: List[PolicySection]
    optional_sections: List[PolicySection]
    template_content: str
    variables: Dict[str, Any]
    compliance_requirements: List[str]
    review_frequency: str
    approval_workflow: List[str]

@dataclass
class PolicyCustomization:
    """Policy customization parameters"""
    organization_name: str
    jurisdiction: Jurisdiction
    industry: Industry
    regulations: List[Regulation]
    business_activities: List[str]
    contact_details: Dict[str, str]
    custom_clauses: Dict[str, str]
    branding_elements: Dict[str, str]
    language_preferences: Dict[str, str]

class PolicyTemplateLibrary:
    """Library of policy document templates"""
    
    def __init__(self):
        self.templates: Dict[DocumentType, Dict[Jurisdiction, PolicyTemplate]] = {}
        self.jinja_env = jinja2.Environment(
            loader=jinja2.DictLoader({}),
            autoescape=jinja2.select_autoescape(['html', 'xml'])
        )
        self._initialize_templates()
    
    def _initialize_templates(self):
        """Initialize policy templates for all document types and jurisdictions"""
        
        # Privacy Policy Templates
        self._create_privacy_policy_templates()
        
        # Terms of Service Templates
        self._create_terms_of_service_templates()
        
        # Cookie Policy Templates
        self._create_cookie_policy_templates()
        
        # Data Processing Agreement Templates
        self._create_dpa_templates()
        
        # GDPR Notice Templates
        self._create_gdpr_notice_templates()
        
        # CCPA Notice Templates
        self._create_ccpa_notice_templates()
        
        # HIPAA Notice Templates
        self._create_hipaa_notice_templates()
        
        # Employee Handbook Templates
        self._create_employee_handbook_templates()
        
        # Vendor Agreement Templates
        self._create_vendor_agreement_templates()
        
        # Incident Response Plan Templates
        self._create_incident_response_templates()
    
    def _create_privacy_policy_templates(self):
        """Create privacy policy templates for different jurisdictions"""
        
        # GDPR Privacy Policy Template
        gdpr_privacy_template = PolicyTemplate(
            template_id="privacy_policy_gdpr",
            document_type=DocumentType.PRIVACY_POLICY,
            name="GDPR Privacy Policy",
            description="GDPR-compliant privacy policy template",
            applicable_jurisdictions=[Jurisdiction.EUROPEAN_UNION],
            applicable_regulations=[Regulation.GDPR],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.SCOPE,
                PolicySection.DEFINITIONS,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.RESPONSIBILITIES,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.APPENDICES],
            template_content=self._get_gdpr_privacy_policy_template(),
            variables={
                "organization_name": "",
                "controller_details": "",
                "dpo_contact": "",
                "data_categories": [],
                "processing_purposes": [],
                "legal_bases": [],
                "retention_periods": {},
                "third_party_recipients": [],
                "transfer_countries": [],
                "data_subject_rights": []
            },
            compliance_requirements=[
                "Article 12-14 transparency requirements",
                "Article 6 lawful basis identification",
                "Article 13-14 information provision",
                "Article 15-22 data subject rights",
                "Article 44-49 international transfers"
            ],
            review_frequency="Annual",
            approval_workflow=["Legal Review", "DPO Approval", "Management Sign-off"]
        )
        
        # CCPA Privacy Policy Template
        ccpa_privacy_template = PolicyTemplate(
            template_id="privacy_policy_ccpa",
            document_type=DocumentType.PRIVACY_POLICY,
            name="CCPA Privacy Policy",
            description="CCPA-compliant privacy policy template",
            applicable_jurisdictions=[Jurisdiction.CALIFORNIA, Jurisdiction.UNITED_STATES],
            applicable_regulations=[Regulation.CCPA],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.SCOPE,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.DEFINITIONS, PolicySection.APPENDICES],
            template_content=self._get_ccpa_privacy_policy_template(),
            variables={
                "organization_name": "",
                "business_contact": "",
                "personal_info_categories": [],
                "sources_of_info": [],
                "business_purposes": [],
                "commercial_purposes": [],
                "third_parties": [],
                "sale_disclosure": False,
                "consumer_rights": []
            },
            compliance_requirements=[
                "CCPA Section 1798.130 consumer rights",
                "CCPA Section 1798.135 opt-out rights",
                "CCPA Section 1798.140 definitions",
                "CCPA Section 1798.100 information disclosure"
            ],
            review_frequency="Annual",
            approval_workflow=["Legal Review", "Privacy Officer Approval", "Management Sign-off"]
        )
        
        # Initialize privacy policy templates
        if DocumentType.PRIVACY_POLICY not in self.templates:
            self.templates[DocumentType.PRIVACY_POLICY] = {}
        
        self.templates[DocumentType.PRIVACY_POLICY][Jurisdiction.EUROPEAN_UNION] = gdpr_privacy_template
        self.templates[DocumentType.PRIVACY_POLICY][Jurisdiction.CALIFORNIA] = ccpa_privacy_template
        self.templates[DocumentType.PRIVACY_POLICY][Jurisdiction.UNITED_STATES] = ccpa_privacy_template
    
    def _create_terms_of_service_templates(self):
        """Create terms of service templates"""
        
        general_terms_template = PolicyTemplate(
            template_id="terms_of_service_general",
            document_type=DocumentType.TERMS_OF_SERVICE,
            name="General Terms of Service",
            description="General terms of service template",
            applicable_jurisdictions=[Jurisdiction.GLOBAL],
            applicable_regulations=[],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.SCOPE,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.RESPONSIBILITIES,
                PolicySection.ENFORCEMENT,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.DEFINITIONS, PolicySection.APPENDICES],
            template_content=self._get_terms_of_service_template(),
            variables={
                "organization_name": "",
                "service_description": "",
                "user_obligations": [],
                "service_limitations": [],
                "payment_terms": {},
                "intellectual_property": "",
                "termination_conditions": [],
                "governing_law": "",
                "dispute_resolution": ""
            },
            compliance_requirements=[
                "Clear service description",
                "User rights and obligations",
                "Limitation of liability",
                "Termination provisions",
                "Governing law specification"
            ],
            review_frequency="Annual",
            approval_workflow=["Legal Review", "Business Review", "Management Approval"]
        )
        
        if DocumentType.TERMS_OF_SERVICE not in self.templates:
            self.templates[DocumentType.TERMS_OF_SERVICE] = {}
        
        self.templates[DocumentType.TERMS_OF_SERVICE][Jurisdiction.GLOBAL] = general_terms_template
    
    def _create_cookie_policy_templates(self):
        """Create cookie policy templates"""
        
        gdpr_cookie_template = PolicyTemplate(
            template_id="cookie_policy_gdpr",
            document_type=DocumentType.COOKIE_POLICY,
            name="GDPR Cookie Policy",
            description="GDPR-compliant cookie policy template",
            applicable_jurisdictions=[Jurisdiction.EUROPEAN_UNION],
            applicable_regulations=[Regulation.GDPR],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.DEFINITIONS,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.APPENDICES],
            template_content=self._get_gdpr_cookie_policy_template(),
            variables={
                "organization_name": "",
                "website_url": "",
                "cookie_types": [],
                "essential_cookies": [],
                "analytics_cookies": [],
                "marketing_cookies": [],
                "third_party_cookies": [],
                "retention_periods": {},
                "consent_mechanism": "",
                "opt_out_instructions": ""
            },
            compliance_requirements=[
                "ePrivacy Directive compliance",
                "GDPR Article 7 consent requirements",
                "Clear cookie categorization",
                "Opt-out mechanisms",
                "Retention period disclosure"
            ],
            review_frequency="Annual",
            approval_workflow=["Privacy Review", "Technical Review", "Legal Approval"]
        )
        
        if DocumentType.COOKIE_POLICY not in self.templates:
            self.templates[DocumentType.COOKIE_POLICY] = {}
        
        self.templates[DocumentType.COOKIE_POLICY][Jurisdiction.EUROPEAN_UNION] = gdpr_cookie_template
    
    def _create_dpa_templates(self):
        """Create Data Processing Agreement templates"""
        
        gdpr_dpa_template = PolicyTemplate(
            template_id="dpa_gdpr",
            document_type=DocumentType.DATA_PROCESSING_AGREEMENT,
            name="GDPR Data Processing Agreement",
            description="GDPR Article 28 compliant DPA template",
            applicable_jurisdictions=[Jurisdiction.EUROPEAN_UNION],
            applicable_regulations=[Regulation.GDPR],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.SCOPE,
                PolicySection.DEFINITIONS,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.RESPONSIBILITIES,
                PolicySection.MONITORING,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.APPENDICES],
            template_content=self._get_gdpr_dpa_template(),
            variables={
                "controller_name": "",
                "processor_name": "",
                "processing_purposes": [],
                "data_categories": [],
                "data_subject_categories": [],
                "retention_period": "",
                "security_measures": [],
                "subprocessor_authorization": "",
                "audit_rights": [],
                "incident_notification": "",
                "data_return_deletion": ""
            },
            compliance_requirements=[
                "GDPR Article 28 processor obligations",
                "GDPR Article 32 security measures",
                "GDPR Article 33 breach notification",
                "GDPR Article 44-49 transfer provisions"
            ],
            review_frequency="Annual",
            approval_workflow=["Privacy Review", "Legal Review", "Procurement Approval"]
        )
        
        if DocumentType.DATA_PROCESSING_AGREEMENT not in self.templates:
            self.templates[DocumentType.DATA_PROCESSING_AGREEMENT] = {}
        
        self.templates[DocumentType.DATA_PROCESSING_AGREEMENT][Jurisdiction.EUROPEAN_UNION] = gdpr_dpa_template
    
    def _create_gdpr_notice_templates(self):
        """Create GDPR notice templates"""
        
        gdpr_notice_template = PolicyTemplate(
            template_id="gdpr_notice",
            document_type=DocumentType.GDPR_NOTICE,
            name="GDPR Data Subject Notice",
            description="GDPR-compliant data subject information notice",
            applicable_jurisdictions=[Jurisdiction.EUROPEAN_UNION],
            applicable_regulations=[Regulation.GDPR],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.DEFINITIONS],
            template_content=self._get_gdpr_notice_template(),
            variables={
                "controller_identity": "",
                "dpo_contact": "",
                "processing_purposes": [],
                "lawful_basis": [],
                "recipients": [],
                "transfer_information": "",
                "retention_period": "",
                "data_subject_rights": [],
                "complaint_authority": ""
            },
            compliance_requirements=[
                "GDPR Article 13-14 transparency",
                "Clear and plain language",
                "All required information elements",
                "Accessible format"
            ],
            review_frequency="As needed",
            approval_workflow=["DPO Review", "Legal Approval"]
        )
        
        if DocumentType.GDPR_NOTICE not in self.templates:
            self.templates[DocumentType.GDPR_NOTICE] = {}
        
        self.templates[DocumentType.GDPR_NOTICE][Jurisdiction.EUROPEAN_UNION] = gdpr_notice_template
    
    def _create_ccpa_notice_templates(self):
        """Create CCPA notice templates"""
        
        ccpa_notice_template = PolicyTemplate(
            template_id="ccpa_notice",
            document_type=DocumentType.CCPA_NOTICE,
            name="CCPA Consumer Notice",
            description="CCPA-compliant consumer notice template",
            applicable_jurisdictions=[Jurisdiction.CALIFORNIA],
            applicable_regulations=[Regulation.CCPA],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.DEFINITIONS],
            template_content=self._get_ccpa_notice_template(),
            variables={
                "business_name": "",
                "contact_information": "",
                "personal_info_collected": [],
                "sources_of_information": [],
                "business_purposes": [],
                "third_party_disclosure": [],
                "sale_of_info": False,
                "consumer_rights": [],
                "non_discrimination": ""
            },
            compliance_requirements=[
                "CCPA Section 1798.100 disclosure requirements",
                "CCPA Section 1798.130 consumer rights",
                "Clear and conspicuous notice",
                "Right to opt-out mechanism"
            ],
            review_frequency="Annual",
            approval_workflow=["Privacy Review", "Legal Approval"]
        )
        
        if DocumentType.CCPA_NOTICE not in self.templates:
            self.templates[DocumentType.CCPA_NOTICE] = {}
        
        self.templates[DocumentType.CCPA_NOTICE][Jurisdiction.CALIFORNIA] = ccpa_notice_template
    
    def _create_hipaa_notice_templates(self):
        """Create HIPAA notice templates"""
        
        hipaa_notice_template = PolicyTemplate(
            template_id="hipaa_notice",
            document_type=DocumentType.HIPAA_NOTICE,
            name="HIPAA Notice of Privacy Practices",
            description="HIPAA-compliant notice of privacy practices",
            applicable_jurisdictions=[Jurisdiction.UNITED_STATES],
            applicable_regulations=[Regulation.HIPAA],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.RESPONSIBILITIES,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.DEFINITIONS],
            template_content=self._get_hipaa_notice_template(),
            variables={
                "covered_entity_name": "",
                "privacy_officer_contact": "",
                "uses_and_disclosures": [],
                "patient_rights": [],
                "amendment_procedures": "",
                "complaint_procedures": "",
                "minimum_necessary": "",
                "business_associates": [],
                "effective_date": ""
            },
            compliance_requirements=[
                "HIPAA Privacy Rule 164.520",
                "Patient rights disclosure",
                "Uses and disclosures description",
                "Complaint procedures",
                "Contact information"
            ],
            review_frequency="As needed",
            approval_workflow=["Privacy Officer Review", "Compliance Approval"]
        )
        
        if DocumentType.HIPAA_NOTICE not in self.templates:
            self.templates[DocumentType.HIPAA_NOTICE] = {}
        
        self.templates[DocumentType.HIPAA_NOTICE][Jurisdiction.UNITED_STATES] = hipaa_notice_template
    
    def _create_employee_handbook_templates(self):
        """Create employee handbook templates"""
        
        general_handbook_template = PolicyTemplate(
            template_id="employee_handbook_general",
            document_type=DocumentType.EMPLOYEE_HANDBOOK,
            name="Employee Handbook",
            description="Comprehensive employee handbook template",
            applicable_jurisdictions=[Jurisdiction.GLOBAL],
            applicable_regulations=[Regulation.GDPR, Regulation.CCPA],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.SCOPE,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.RESPONSIBILITIES,
                PolicySection.ENFORCEMENT,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.DEFINITIONS, PolicySection.APPENDICES],
            template_content=self._get_employee_handbook_template(),
            variables={
                "organization_name": "",
                "company_mission": "",
                "employment_policies": [],
                "code_of_conduct": [],
                "privacy_policies": [],
                "security_policies": [],
                "disciplinary_procedures": [],
                "benefits_information": [],
                "contact_details": {}
            },
            compliance_requirements=[
                "Employment law compliance",
                "Privacy policy inclusion",
                "Security awareness",
                "Code of conduct",
                "Disciplinary procedures"
            ],
            review_frequency="Annual",
            approval_workflow=["HR Review", "Legal Review", "Management Approval"]
        )
        
        if DocumentType.EMPLOYEE_HANDBOOK not in self.templates:
            self.templates[DocumentType.EMPLOYEE_HANDBOOK] = {}
        
        self.templates[DocumentType.EMPLOYEE_HANDBOOK][Jurisdiction.GLOBAL] = general_handbook_template
    
    def _create_vendor_agreement_templates(self):
        """Create vendor agreement templates"""
        
        vendor_agreement_template = PolicyTemplate(
            template_id="vendor_agreement_general",
            document_type=DocumentType.VENDOR_AGREEMENT,
            name="Vendor Agreement",
            description="Standard vendor agreement template",
            applicable_jurisdictions=[Jurisdiction.GLOBAL],
            applicable_regulations=[Regulation.GDPR, Regulation.CCPA, Regulation.ISO_27001],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.SCOPE,
                PolicySection.POLICY_STATEMENT,
                PolicySection.PROCEDURES,
                PolicySection.RESPONSIBILITIES,
                PolicySection.MONITORING,
                PolicySection.ENFORCEMENT,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.DEFINITIONS, PolicySection.APPENDICES],
            template_content=self._get_vendor_agreement_template(),
            variables={
                "organization_name": "",
                "vendor_name": "",
                "services_description": "",
                "performance_standards": [],
                "security_requirements": [],
                "privacy_requirements": [],
                "compliance_obligations": [],
                "audit_rights": [],
                "termination_conditions": [],
                "liability_limitations": ""
            },
            compliance_requirements=[
                "Service level agreements",
                "Security requirements",
                "Privacy obligations",
                "Compliance monitoring",
                "Audit rights"
            ],
            review_frequency="Annual",
            approval_workflow=["Procurement Review", "Legal Review", "Management Approval"]
        )
        
        if DocumentType.VENDOR_AGREEMENT not in self.templates:
            self.templates[DocumentType.VENDOR_AGREEMENT] = {}
        
        self.templates[DocumentType.VENDOR_AGREEMENT][Jurisdiction.GLOBAL] = vendor_agreement_template
    
    def _create_incident_response_templates(self):
        """Create incident response plan templates"""
        
        incident_response_template = PolicyTemplate(
            template_id="incident_response_plan",
            document_type=DocumentType.INCIDENT_RESPONSE_PLAN,
            name="Incident Response Plan",
            description="Comprehensive incident response plan template",
            applicable_jurisdictions=[Jurisdiction.GLOBAL],
            applicable_regulations=[Regulation.GDPR, Regulation.HIPAA, Regulation.ISO_27001],
            required_sections=[
                PolicySection.INTRODUCTION,
                PolicySection.PURPOSE,
                PolicySection.SCOPE,
                PolicySection.DEFINITIONS,
                PolicySection.PROCEDURES,
                PolicySection.RESPONSIBILITIES,
                PolicySection.MONITORING,
                PolicySection.CONTACT_INFORMATION
            ],
            optional_sections=[PolicySection.APPENDICES],
            template_content=self._get_incident_response_template(),
            variables={
                "organization_name": "",
                "incident_types": [],
                "response_team": [],
                "escalation_procedures": [],
                "notification_requirements": [],
                "containment_procedures": [],
                "investigation_procedures": [],
                "recovery_procedures": [],
                "communication_plan": [],
                "external_contacts": {}
            },
            compliance_requirements=[
                "Incident classification",
                "Response procedures",
                "Notification requirements",
                "Documentation requirements",
                "Lessons learned process"
            ],
            review_frequency="Annual",
            approval_workflow=["Security Review", "Legal Review", "Management Approval"]
        )
        
        if DocumentType.INCIDENT_RESPONSE_PLAN not in self.templates:
            self.templates[DocumentType.INCIDENT_RESPONSE_PLAN] = {}
        
        self.templates[DocumentType.INCIDENT_RESPONSE_PLAN][Jurisdiction.GLOBAL] = incident_response_template
    
    def get_template(
        self,
        document_type: DocumentType,
        jurisdiction: Jurisdiction
    ) -> Optional[PolicyTemplate]:
        """Get policy template for document type and jurisdiction"""
        
        if document_type not in self.templates:
            return None
        
        jurisdiction_templates = self.templates[document_type]
        
        # Try exact jurisdiction match first
        if jurisdiction in jurisdiction_templates:
            return jurisdiction_templates[jurisdiction]
        
        # Fall back to global template if available
        if Jurisdiction.GLOBAL in jurisdiction_templates:
            return jurisdiction_templates[Jurisdiction.GLOBAL]
        
        # Return any available template as last resort
        if jurisdiction_templates:
            return next(iter(jurisdiction_templates.values()))
        
        return None
    
    def _get_gdpr_privacy_policy_template(self) -> str:
        """Get GDPR privacy policy template content"""
        return """
# Privacy Policy

## 1. Introduction

{{ organization_name }} ("we," "our," or "us") is committed to protecting your personal data and your privacy rights. This Privacy Policy describes how we collect, use, store, and disclose your personal information when you use our services.

## 2. Controller Information

**Data Controller:** {{ organization_name }}
**Contact Details:** {{ controller_details }}
**Data Protection Officer:** {{ dpo_contact }}

## 3. Personal Data We Collect

We collect the following categories of personal data:
{% for category in data_categories %}
- {{ category }}
{% endfor %}

## 4. Purposes and Legal Basis

We process your personal data for the following purposes:
{% for purpose in processing_purposes %}
- **Purpose:** {{ purpose.name }}
- **Legal Basis:** {{ purpose.legal_basis }}
- **Data Categories:** {{ purpose.data_categories|join(', ') }}
{% endfor %}

## 5. Data Sharing and Recipients

We may share your personal data with:
{% for recipient in third_party_recipients %}
- {{ recipient }}
{% endfor %}

## 6. International Transfers

{% if transfer_countries %}
We transfer personal data to the following countries:
{% for country in transfer_countries %}
- {{ country.name }} (Adequacy: {{ country.adequacy_status }})
{% endfor %}
{% else %}
We do not transfer personal data outside the European Economic Area.
{% endif %}

## 7. Retention Periods

{% for data_type, period in retention_periods.items() %}
- {{ data_type }}: {{ period }}
{% endfor %}

## 8. Your Rights

Under GDPR, you have the following rights:
{% for right in data_subject_rights %}
- {{ right }}
{% endfor %}

To exercise these rights, please contact us using the information provided above.

## 9. Security Measures

We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.

## 10. Contact Information

If you have any questions about this Privacy Policy or our data practices, please contact:

**Data Protection Officer:** {{ dpo_contact }}
**Email:** privacy@{{ organization_name|lower }}.com

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on our website.

**Last Updated:** {{ current_date }}
        """
    
    def _get_ccpa_privacy_policy_template(self) -> str:
        """Get CCPA privacy policy template content"""
        return """
# California Consumer Privacy Act (CCPA) Privacy Notice

## Personal Information We Collect

In the past 12 months, {{ organization_name }} has collected the following categories of personal information:

{% for category in personal_info_categories %}
- **{{ category.name }}:** {{ category.description }}
  - **Sources:** {{ category.sources|join(', ') }}
  - **Business Purpose:** {{ category.business_purpose }}
{% endfor %}

## How We Use Personal Information

We use personal information for the following business purposes:
{% for purpose in business_purposes %}
- {{ purpose }}
{% endfor %}

## Sharing of Personal Information

{% if sale_disclosure %}
We may sell personal information to third parties for commercial purposes.
{% else %}
We do not sell personal information to third parties.
{% endif %}

We may share personal information with:
{% for party in third_parties %}
- {{ party }}
{% endfor %}

## Your California Consumer Rights

California residents have the following rights:

### Right to Know
You have the right to request information about:
- Categories of personal information collected
- Sources of personal information
- Business purposes for collection
- Categories of third parties with whom we share information

### Right to Delete
You have the right to request deletion of your personal information, subject to certain exceptions.

### Right to Opt-Out
{% if sale_disclosure %}
You have the right to opt-out of the sale of your personal information.
{% endif %}

### Right to Non-Discrimination
We will not discriminate against you for exercising your CCPA rights.

## How to Exercise Your Rights

To exercise your rights, you may:
- Email us at: privacy@{{ organization_name|lower }}.com
- Call us at: {{ business_contact.phone }}
- Submit a request through our website

## Contact Information

{{ organization_name }}
{{ business_contact.address }}
Phone: {{ business_contact.phone }}
Email: {{ business_contact.email }}

**Last Updated:** {{ current_date }}
        """
    
    def _get_gdpr_cookie_policy_template(self) -> str:
        """Get GDPR cookie policy template content"""
        return """
# Cookie Policy

## What Are Cookies

Cookies are small text files that are placed on your device when you visit {{ website_url }}. They help us provide you with a better experience by remembering your preferences and understanding how you use our website.

## Types of Cookies We Use

### Essential Cookies
These cookies are necessary for the website to function properly:
{% for cookie in essential_cookies %}
- **{{ cookie.name }}:** {{ cookie.purpose }}
- **Duration:** {{ cookie.duration }}
{% endfor %}

### Analytics Cookies
These cookies help us understand how visitors interact with our website:
{% for cookie in analytics_cookies %}
- **{{ cookie.name }}:** {{ cookie.purpose }}
- **Duration:** {{ cookie.duration }}
- **Third Party:** {{ cookie.third_party }}
{% endfor %}

### Marketing Cookies
These cookies are used to deliver relevant advertisements:
{% for cookie in marketing_cookies %}
- **{{ cookie.name }}:** {{ cookie.purpose }}
- **Duration:** {{ cookie.duration }}
- **Third Party:** {{ cookie.third_party }}
{% endfor %}

## Your Consent

We use {{ consent_mechanism }} to obtain your consent for non-essential cookies. You can withdraw your consent at any time.

## How to Control Cookies

You can control cookies through:
- Our cookie preference center
- Your browser settings
- Third-party opt-out tools

{{ opt_out_instructions }}

## Contact Us

If you have questions about our use of cookies, please contact:
Email: privacy@{{ organization_name|lower }}.com

**Last Updated:** {{ current_date }}
        """
    
    def _get_gdpr_dpa_template(self) -> str:
        """Get GDPR DPA template content"""
        return """
# Data Processing Agreement

This Data Processing Agreement ("DPA") is entered into between {{ controller_name }} ("Controller") and {{ processor_name }} ("Processor") pursuant to Article 28 of the General Data Protection Regulation (EU) 2016/679 ("GDPR").

## 1. Scope and Applicability

This DPA applies to the processing of personal data by the Processor on behalf of the Controller in connection with the provision of services.

## 2. Definitions

Terms used in this DPA shall have the same meaning as defined in the GDPR.

## 3. Processing Details

**Subject Matter:** {{ processing_subject_matter }}
**Duration:** {{ processing_duration }}
**Nature and Purpose:** 
{% for purpose in processing_purposes %}
- {{ purpose }}
{% endfor %}

**Categories of Personal Data:**
{% for category in data_categories %}
- {{ category }}
{% endfor %}

**Categories of Data Subjects:**
{% for category in data_subject_categories %}
- {{ category }}
{% endfor %}

## 4. Processor Obligations

The Processor shall:
- Process personal data only on documented instructions from the Controller
- Ensure confidentiality of personal data
- Implement appropriate technical and organizational measures
- Assist the Controller with data subject rights requests
- Notify the Controller of personal data breaches without undue delay
- Delete or return personal data at the end of the provision of services

## 5. Security Measures

The Processor shall implement the following security measures:
{% for measure in security_measures %}
- {{ measure }}
{% endfor %}

## 6. Subprocessing

{{ subprocessor_authorization }}

## 7. Data Subject Rights

The Processor shall assist the Controller in responding to data subject requests by implementing appropriate technical and organizational measures.

## 8. Personal Data Breach

The Processor shall notify the Controller without undue delay after becoming aware of a personal data breach.

## 9. Data Protection Impact Assessment

The Processor shall provide reasonable assistance to the Controller with data protection impact assessments when required.

## 10. Audits

The Controller shall have the right to conduct audits:
{% for right in audit_rights %}
- {{ right }}
{% endfor %}

## 11. Data Return and Deletion

{{ data_return_deletion }}

## 12. Contact Information

**Controller Contact:** {{ controller_contact }}
**Processor Contact:** {{ processor_contact }}

**Effective Date:** {{ current_date }}
        """
    
    def _get_terms_of_service_template(self) -> str:
        """Get terms of service template content"""
        return """
# Terms of Service

## 1. Acceptance of Terms

By accessing and using the services provided by {{ organization_name }}, you agree to be bound by these Terms of Service.

## 2. Description of Service

{{ service_description }}

## 3. User Obligations

Users must:
{% for obligation in user_obligations %}
- {{ obligation }}
{% endfor %}

## 4. Service Limitations

Our services are subject to the following limitations:
{% for limitation in service_limitations %}
- {{ limitation }}
{% endfor %}

## 5. Payment Terms

{% if payment_terms %}
{{ payment_terms.description }}
- Payment Schedule: {{ payment_terms.schedule }}
- Payment Methods: {{ payment_terms.methods|join(', ') }}
- Refund Policy: {{ payment_terms.refund_policy }}
{% endif %}

## 6. Intellectual Property

{{ intellectual_property }}

## 7. Termination

These terms may be terminated under the following conditions:
{% for condition in termination_conditions %}
- {{ condition }}
{% endfor %}

## 8. Limitation of Liability

{{ liability_limitation }}

## 9. Governing Law

These terms are governed by {{ governing_law }}.

## 10. Dispute Resolution

{{ dispute_resolution }}

## 11. Contact Information

{{ organization_name }}
Email: legal@{{ organization_name|lower }}.com

**Last Updated:** {{ current_date }}
        """
    
    def _get_gdpr_notice_template(self) -> str:
        """Get GDPR notice template content"""
        return """
# Data Subject Information Notice

## Controller Identity

{{ controller_identity }}

## Data Protection Officer

{{ dpo_contact }}

## Processing Information

**Purposes of Processing:**
{% for purpose in processing_purposes %}
- {{ purpose }}
{% endfor %}

**Lawful Basis:**
{% for basis in lawful_basis %}
- {{ basis }}
{% endfor %}

**Recipients:**
{% for recipient in recipients %}
- {{ recipient }}
{% endfor %}

**International Transfers:**
{{ transfer_information }}

**Retention Period:**
{{ retention_period }}

## Your Rights

You have the following rights:
{% for right in data_subject_rights %}
- {{ right }}
{% endfor %}

## Complaint Authority

{{ complaint_authority }}

**Date:** {{ current_date }}
        """
    
    def _get_ccpa_notice_template(self) -> str:
        """Get CCPA notice template content"""
        return """
# CCPA Consumer Notice

## Business Information

{{ business_name }}
{{ contact_information }}

## Personal Information Collected

{% for info in personal_info_collected %}
- {{ info }}
{% endfor %}

## Sources of Information

{% for source in sources_of_information %}
- {{ source }}
{% endfor %}

## Business Purposes

{% for purpose in business_purposes %}
- {{ purpose }}
{% endfor %}

## Third Party Disclosure

{% for disclosure in third_party_disclosure %}
- {{ disclosure }}
{% endfor %}

## Sale of Information

{% if sale_of_info %}
We may sell personal information for commercial purposes.
{% else %}
We do not sell personal information.
{% endif %}

## Consumer Rights

{% for right in consumer_rights %}
- {{ right }}
{% endfor %}

## Non-Discrimination

{{ non_discrimination }}

**Date:** {{ current_date }}
        """
    
    def _get_hipaa_notice_template(self) -> str:
        """Get HIPAA notice template content"""
        return """
# Notice of Privacy Practices

## Covered Entity

{{ covered_entity_name }}

## Privacy Officer

{{ privacy_officer_contact }}

## Uses and Disclosures

We may use and disclose your health information for:
{% for use in uses_and_disclosures %}
- {{ use }}
{% endfor %}

## Your Rights

{% for right in patient_rights %}
- {{ right }}
{% endfor %}

## Amendment Procedures

{{ amendment_procedures }}

## Complaint Procedures

{{ complaint_procedures }}

## Minimum Necessary

{{ minimum_necessary }}

## Business Associates

{% for associate in business_associates %}
- {{ associate }}
{% endfor %}

**Effective Date:** {{ effective_date }}
        """
    
    def _get_employee_handbook_template(self) -> str:
        """Get employee handbook template content"""
        return """
# Employee Handbook

## Welcome to {{ organization_name }}

{{ company_mission }}

## Employment Policies

{% for policy in employment_policies %}
### {{ policy.title }}
{{ policy.content }}
{% endfor %}

## Code of Conduct

{% for conduct in code_of_conduct %}
- {{ conduct }}
{% endfor %}

## Privacy Policies

{% for policy in privacy_policies %}
### {{ policy.title }}
{{ policy.content }}
{% endfor %}

## Security Policies

{% for policy in security_policies %}
### {{ policy.title }}
{{ policy.content }}
{% endfor %}

## Disciplinary Procedures

{% for procedure in disciplinary_procedures %}
- {{ procedure }}
{% endfor %}

## Benefits Information

{% for benefit in benefits_information %}
### {{ benefit.title }}
{{ benefit.description }}
{% endfor %}

## Contact Information

{% for department, contact in contact_details.items() %}
**{{ department }}:** {{ contact }}
{% endfor %}

**Last Updated:** {{ current_date }}
        """
    
    def _get_vendor_agreement_template(self) -> str:
        """Get vendor agreement template content"""
        return """
# Vendor Agreement

## Parties

**Organization:** {{ organization_name }}
**Vendor:** {{ vendor_name }}

## Services Description

{{ services_description }}

## Performance Standards

{% for standard in performance_standards %}
- {{ standard }}
{% endfor %}

## Security Requirements

{% for requirement in security_requirements %}
- {{ requirement }}
{% endfor %}

## Privacy Requirements

{% for requirement in privacy_requirements %}
- {{ requirement }}
{% endfor %}

## Compliance Obligations

{% for obligation in compliance_obligations %}
- {{ obligation }}
{% endfor %}

## Audit Rights

{% for right in audit_rights %}
- {{ right }}
{% endfor %}

## Termination Conditions

{% for condition in termination_conditions %}
- {{ condition }}
{% endfor %}

## Liability Limitations

{{ liability_limitations }}

**Effective Date:** {{ current_date }}
        """
    
    def _get_incident_response_template(self) -> str:
        """Get incident response plan template content"""
        return """
# Incident Response Plan

## Purpose

This plan provides procedures for responding to security incidents at {{ organization_name }}.

## Scope

This plan applies to all:
- Employees and contractors
- Information systems and assets
- Security incidents and breaches

## Incident Types

{% for incident_type in incident_types %}
- **{{ incident_type.name }}:** {{ incident_type.description }}
{% endfor %}

## Response Team

{% for member in response_team %}
- **{{ member.role }}:** {{ member.name }} ({{ member.contact }})
{% endfor %}

## Response Procedures

### 1. Detection and Analysis
- Incident identification
- Initial assessment
- Classification and prioritization

### 2. Containment
{% for procedure in containment_procedures %}
- {{ procedure }}
{% endfor %}

### 3. Investigation
{% for procedure in investigation_procedures %}
- {{ procedure }}
{% endfor %}

### 4. Recovery
{% for procedure in recovery_procedures %}
- {{ procedure }}
{% endfor %}

## Notification Requirements

{% for requirement in notification_requirements %}
- {{ requirement }}
{% endfor %}

## Escalation Procedures

{% for procedure in escalation_procedures %}
- {{ procedure }}
{% endfor %}

## Communication Plan

{% for plan in communication_plan %}
- {{ plan }}
{% endfor %}

## External Contacts

{% for contact_type, contact_info in external_contacts.items() %}
**{{ contact_type }}:** {{ contact_info }}
{% endfor %}

**Last Updated:** {{ current_date }}
        """

class ComprehensivePolicyGenerator:
    """
    Comprehensive policy document generator with jurisdiction-specific 
    customization and regulatory compliance validation
    """
    
    def __init__(self, db_manager: Optional[ComplianceDatabaseManager] = None):
        self.template_library = PolicyTemplateLibrary()
        self.db_manager = db_manager or ComplianceDatabaseManager()
        self.jinja_env = jinja2.Environment(
            loader=jinja2.BaseLoader(),
            autoescape=jinja2.select_autoescape(['html', 'xml'])
        )
    
    def generate_policy_document(
        self,
        document_type: DocumentType,
        customization: PolicyCustomization,
        additional_variables: Optional[Dict[str, Any]] = None
    ) -> PolicyDocument:
        """Generate customized policy document"""
        
        # Get appropriate template
        template = self.template_library.get_template(document_type, customization.jurisdiction)
        
        if not template:
            raise ValueError(f"No template available for {document_type.value} in {customization.jurisdiction.value}")
        
        # Prepare template variables
        template_variables = self._prepare_template_variables(template, customization, additional_variables)
        
        # Render document content
        content = self._render_document_content(template, template_variables)
        
        # Validate compliance requirements
        compliance_validation = self._validate_compliance_requirements(template, customization)
        
        # Generate document metadata
        document_id = f"{document_type.value}_{customization.jurisdiction.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        version = "1.0"
        effective_date = datetime.now()
        next_review_date = self._calculate_next_review_date(template.review_frequency, effective_date)
        
        # Create policy document
        policy_document = PolicyDocument(
            document_id=document_id,
            document_type=document_type,
            title=self._generate_document_title(template, customization),
            version=version,
            effective_date=effective_date,
            last_updated=datetime.now(),
            jurisdiction=customization.jurisdiction,
            regulations_addressed=template.applicable_regulations,
            content=content,
            approval_status="draft",
            approved_by=None,
            approval_date=None,
            review_cycle=template.review_frequency,
            next_review_date=next_review_date
        )
        
        # Store in database
        if self.db_manager:
            self.db_manager.store_policy_document(policy_document)
        
        return policy_document
    
    def _prepare_template_variables(
        self,
        template: PolicyTemplate,
        customization: PolicyCustomization,
        additional_variables: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Prepare variables for template rendering"""
        
        variables = template.variables.copy()
        
        # Add customization data
        variables.update({
            "organization_name": customization.organization_name,
            "jurisdiction": customization.jurisdiction.value,
            "industry": customization.industry.value,
            "current_date": datetime.now().strftime("%B %d, %Y"),
            "current_year": datetime.now().year
        })
        
        # Add contact details
        variables.update(customization.contact_details)
        
        # Add custom clauses
        variables.update(customization.custom_clauses)
        
        # Add branding elements
        variables.update(customization.branding_elements)
        
        # Add jurisdiction-specific variations
        jurisdiction_variables = self._get_jurisdiction_specific_variables(
            customization.jurisdiction, customization.regulations
        )
        variables.update(jurisdiction_variables)
        
        # Add industry-specific content
        industry_variables = self._get_industry_specific_variables(
            customization.industry, customization.business_activities
        )
        variables.update(industry_variables)
        
        # Add any additional variables
        if additional_variables:
            variables.update(additional_variables)
        
        return variables
    
    def _get_jurisdiction_specific_variables(
        self,
        jurisdiction: Jurisdiction,
        regulations: List[Regulation]
    ) -> Dict[str, Any]:
        """Get jurisdiction-specific template variables"""
        
        variables = {}
        
        if jurisdiction == Jurisdiction.EUROPEAN_UNION:
            variables.update({
                "supervisory_authority": "European Data Protection Board",
                "data_protection_authority": "Local Data Protection Authority",
                "currency_symbol": "€",
                "date_format": "DD/MM/YYYY",
                "gdpr_applicable": True,
                "adequacy_countries": [
                    "United Kingdom", "Switzerland", "Canada", "Japan", "South Korea"
                ]
            })
        
        elif jurisdiction == Jurisdiction.CALIFORNIA:
            variables.update({
                "attorney_general": "California Attorney General",
                "currency_symbol": "$",
                "date_format": "MM/DD/YYYY",
                "ccpa_applicable": True,
                "consumer_hotline": "1-800-952-5225"
            })
        
        elif jurisdiction == Jurisdiction.UNITED_STATES:
            variables.update({
                "federal_agency": "Federal Trade Commission",
                "currency_symbol": "$",
                "date_format": "MM/DD/YYYY",
                "state_laws_applicable": True
            })
        
        # Add regulation-specific variables
        for regulation in regulations:
            if regulation == Regulation.GDPR:
                variables.update({
                    "dpo_required": True,
                    "breach_notification_period": "72 hours",
                    "max_fine": "€20 million or 4% of annual global turnover"
                })
            elif regulation == Regulation.CCPA:
                variables.update({
                    "ccpa_threshold": "$25 million annual revenue",
                    "opt_out_required": True,
                    "consumer_request_period": "45 days"
                })
            elif regulation == Regulation.HIPAA:
                variables.update({
                    "privacy_officer_required": True,
                    "breach_notification_period": "60 days",
                    "patient_rights_poster": True
                })
        
        return variables
    
    def _get_industry_specific_variables(
        self,
        industry: Industry,
        business_activities: List[str]
    ) -> Dict[str, Any]:
        """Get industry-specific template variables"""
        
        variables = {}
        
        if industry == Industry.HEALTHCARE:
            variables.update({
                "hipaa_applicable": True,
                "phi_handling": True,
                "medical_record_retention": "6 years minimum",
                "patient_rights": [
                    "Right to access medical records",
                    "Right to request amendments",
                    "Right to request restrictions",
                    "Right to confidential communications"
                ]
            })
        
        elif industry == Industry.FINANCIAL_SERVICES:
            variables.update({
                "sox_applicable": True,
                "pci_dss_applicable": True,
                "financial_record_retention": "7 years",
                "consumer_protection": [
                    "Fair Credit Reporting Act",
                    "Truth in Lending Act",
                    "Equal Credit Opportunity Act"
                ]
            })
        
        elif industry == Industry.TECHNOLOGY:
            variables.update({
                "data_processing_intensive": True,
                "international_transfers": True,
                "ai_ml_processing": "machine learning" in business_activities,
                "cloud_services": "cloud computing" in business_activities
            })
        
        elif industry == Industry.EDUCATION:
            variables.update({
                "ferpa_applicable": True,
                "coppa_applicable": True,
                "student_record_retention": "Permanent for transcripts",
                "parent_consent_required": True
            })
        
        return variables
    
    def _render_document_content(
        self,
        template: PolicyTemplate,
        variables: Dict[str, Any]
    ) -> str:
        """Render document content using template and variables"""
        
        try:
            jinja_template = self.jinja_env.from_string(template.template_content)
            rendered_content = jinja_template.render(**variables)
            return rendered_content.strip()
        
        except Exception as e:
            logger.error(f"Error rendering template: {e}")
            raise ValueError(f"Failed to render policy document: {str(e)}")
    
    def _validate_compliance_requirements(
        self,
        template: PolicyTemplate,
        customization: PolicyCustomization
    ) -> Dict[str, Any]:
        """Validate that generated document meets compliance requirements"""
        
        validation_results = {
            "compliant": True,
            "warnings": [],
            "errors": [],
            "requirements_checked": []
        }
        
        # Check template compliance requirements
        for requirement in template.compliance_requirements:
            validation_results["requirements_checked"].append(requirement)
            
            # Perform specific compliance checks
            if "GDPR" in requirement and Regulation.GDPR in customization.regulations:
                gdpr_validation = self._validate_gdpr_compliance(template, customization)
                validation_results["warnings"].extend(gdpr_validation.get("warnings", []))
                validation_results["errors"].extend(gdpr_validation.get("errors", []))
            
            elif "CCPA" in requirement and Regulation.CCPA in customization.regulations:
                ccpa_validation = self._validate_ccpa_compliance(template, customization)
                validation_results["warnings"].extend(ccpa_validation.get("warnings", []))
                validation_results["errors"].extend(ccpa_validation.get("errors", []))
            
            elif "HIPAA" in requirement and Regulation.HIPAA in customization.regulations:
                hipaa_validation = self._validate_hipaa_compliance(template, customization)
                validation_results["warnings"].extend(hipaa_validation.get("warnings", []))
                validation_results["errors"].extend(hipaa_validation.get("errors", []))
        
        # Set overall compliance status
        if validation_results["errors"]:
            validation_results["compliant"] = False
        
        return validation_results
    
    def _validate_gdpr_compliance(
        self,
        template: PolicyTemplate,
        customization: PolicyCustomization
    ) -> Dict[str, List[str]]:
        """Validate GDPR compliance requirements"""
        
        warnings = []
        errors = []
        
        # Check for required GDPR elements
        if template.document_type == DocumentType.PRIVACY_POLICY:
            required_elements = [
                "controller_details", "dpo_contact", "processing_purposes",
                "legal_bases", "data_subject_rights", "retention_periods"
            ]
            
            for element in required_elements:
                if element not in template.variables or not template.variables[element]:
                    warnings.append(f"GDPR requires {element} to be specified")
        
        # Check for DPO requirement
        if customization.industry in [Industry.HEALTHCARE, Industry.FINANCIAL_SERVICES]:
            if "dpo_contact" not in customization.contact_details:
                warnings.append("DPO contact information recommended for this industry")
        
        return {"warnings": warnings, "errors": errors}
    
    def _validate_ccpa_compliance(
        self,
        template: PolicyTemplate,
        customization: PolicyCustomization
    ) -> Dict[str, List[str]]:
        """Validate CCPA compliance requirements"""
        
        warnings = []
        errors = []
        
        # Check for required CCPA elements
        if template.document_type == DocumentType.PRIVACY_POLICY:
            if customization.jurisdiction == Jurisdiction.CALIFORNIA:
                required_elements = [
                    "personal_info_categories", "consumer_rights", "opt_out_mechanism"
                ]
                
                for element in required_elements:
                    if element not in template.variables:
                        warnings.append(f"CCPA requires {element} disclosure")
        
        return {"warnings": warnings, "errors": errors}
    
    def _validate_hipaa_compliance(
        self,
        template: PolicyTemplate,
        customization: PolicyCustomization
    ) -> Dict[str, List[str]]:
        """Validate HIPAA compliance requirements"""
        
        warnings = []
        errors = []
        
        # Check for required HIPAA elements
        if template.document_type == DocumentType.HIPAA_NOTICE:
            required_elements = [
                "privacy_officer_contact", "patient_rights", "uses_and_disclosures"
            ]
            
            for element in required_elements:
                if element not in template.variables:
                    errors.append(f"HIPAA requires {element} in notice of privacy practices")
        
        return {"warnings": warnings, "errors": errors}
    
    def _generate_document_title(
        self,
        template: PolicyTemplate,
        customization: PolicyCustomization
    ) -> str:
        """Generate document title based on template and customization"""
        
        base_title = template.name
        
        # Add jurisdiction suffix if specific
        if customization.jurisdiction != Jurisdiction.GLOBAL:
            jurisdiction_suffix = customization.jurisdiction.value.replace("_", " ").title()
            base_title = f"{base_title} - {jurisdiction_suffix}"
        
        # Add organization name
        return f"{customization.organization_name} {base_title}"
    
    def _calculate_next_review_date(
        self,
        review_frequency: str,
        effective_date: datetime
    ) -> datetime:
        """Calculate next review date based on frequency"""
        
        frequency_lower = review_frequency.lower()
        
        if "annual" in frequency_lower or "yearly" in frequency_lower:
            return effective_date + timedelta(days=365)
        elif "semi-annual" in frequency_lower or "6 month" in frequency_lower:
            return effective_date + timedelta(days=182)
        elif "quarterly" in frequency_lower or "3 month" in frequency_lower:
            return effective_date + timedelta(days=91)
        elif "monthly" in frequency_lower:
            return effective_date + timedelta(days=30)
        elif "as needed" in frequency_lower:
            return effective_date + timedelta(days=365)  # Default to annual
        else:
            # Default to annual review
            return effective_date + timedelta(days=365)
    
    def generate_policy_suite(
        self,
        document_types: List[DocumentType],
        customization: PolicyCustomization,
        cross_references: bool = True
    ) -> List[PolicyDocument]:
        """Generate a suite of related policy documents"""
        
        generated_documents = []
        
        for document_type in document_types:
            try:
                document = self.generate_policy_document(document_type, customization)
                generated_documents.append(document)
                
            except Exception as e:
                logger.error(f"Failed to generate {document_type.value}: {e}")
                continue
        
        # Add cross-references if requested
        if cross_references and len(generated_documents) > 1:
            self._add_cross_references(generated_documents)
        
        return generated_documents
    
    def _add_cross_references(self, documents: List[PolicyDocument]) -> None:
        """Add cross-references between related policy documents"""
        
        # Create reference mapping
        document_refs = {
            doc.document_type: f"See our {doc.title}" 
            for doc in documents
        }
        
        # Add references to each document
        for document in documents:
            if document.document_type == DocumentType.PRIVACY_POLICY:
                # Add references to cookie policy and terms of service
                refs = []
                if DocumentType.COOKIE_POLICY in document_refs:
                    refs.append(f"Cookie information: {document_refs[DocumentType.COOKIE_POLICY]}")
                if DocumentType.TERMS_OF_SERVICE in document_refs:
                    refs.append(f"Service terms: {document_refs[DocumentType.TERMS_OF_SERVICE]}")
                
                if refs:
                    document.content += "\n\n## Related Documents\n\n" + "\n".join(refs)
    
    def validate_document_compliance(
        self,
        document: PolicyDocument,
        regulations: List[Regulation]
    ) -> Dict[str, Any]:
        """Validate document compliance against specific regulations"""
        
        validation_result = {
            "document_id": document.document_id,
            "document_type": document.document_type.value,
            "regulations_checked": [reg.value for reg in regulations],
            "compliance_status": "compliant",
            "findings": [],
            "recommendations": [],
            "validation_date": datetime.now().isoformat()
        }
        
        # Perform regulation-specific validation
        for regulation in regulations:
            regulation_findings = self._validate_against_regulation(document, regulation)
            validation_result["findings"].extend(regulation_findings)
        
        # Determine overall compliance status
        critical_findings = [f for f in validation_result["findings"] if f.get("severity") == "critical"]
        if critical_findings:
            validation_result["compliance_status"] = "non_compliant"
        elif validation_result["findings"]:
            validation_result["compliance_status"] = "partially_compliant"
        
        # Generate recommendations
        validation_result["recommendations"] = self._generate_compliance_recommendations(
            validation_result["findings"]
        )
        
        return validation_result
    
    def _validate_against_regulation(
        self,
        document: PolicyDocument,
        regulation: Regulation
    ) -> List[Dict[str, Any]]:
        """Validate document against specific regulation requirements"""
        
        findings = []
        content = document.content.lower()
        
        if regulation == Regulation.GDPR:
            # Check GDPR requirements
            gdpr_requirements = [
                {"element": "controller identity", "keywords": ["controller", "data controller"], "required": True},
                {"element": "dpo contact", "keywords": ["data protection officer", "dpo"], "required": False},
                {"element": "processing purposes", "keywords": ["purpose", "processing"], "required": True},
                {"element": "legal basis", "keywords": ["legal basis", "lawful basis"], "required": True},
                {"element": "data subject rights", "keywords": ["rights", "access", "rectification", "erasure"], "required": True},
                {"element": "retention periods", "keywords": ["retention", "storage period"], "required": True}
            ]
            
            for requirement in gdpr_requirements:
                if not any(keyword in content for keyword in requirement["keywords"]):
                    severity = "critical" if requirement["required"] else "warning"
                    findings.append({
                        "regulation": regulation.value,
                        "requirement": requirement["element"],
                        "severity": severity,
                        "description": f"Missing {requirement['element']} information required by GDPR"
                    })
        
        elif regulation == Regulation.CCPA:
            # Check CCPA requirements
            ccpa_requirements = [
                {"element": "categories of information", "keywords": ["categories", "personal information"], "required": True},
                {"element": "consumer rights", "keywords": ["right to know", "right to delete", "opt-out"], "required": True},
                {"element": "non-discrimination", "keywords": ["non-discrimination", "discriminate"], "required": True}
            ]
            
            for requirement in ccpa_requirements:
                if not any(keyword in content for keyword in requirement["keywords"]):
                    findings.append({
                        "regulation": regulation.value,
                        "requirement": requirement["element"],
                        "severity": "critical",
                        "description": f"Missing {requirement['element']} required by CCPA"
                    })
        
        elif regulation == Regulation.HIPAA:
            # Check HIPAA requirements
            hipaa_requirements = [
                {"element": "privacy officer contact", "keywords": ["privacy officer", "contact"], "required": True},
                {"element": "uses and disclosures", "keywords": ["uses", "disclosures"], "required": True},
                {"element": "patient rights", "keywords": ["patient rights", "individual rights"], "required": True}
            ]
            
            for requirement in hipaa_requirements:
                if not any(keyword in content for keyword in requirement["keywords"]):
                    findings.append({
                        "regulation": regulation.value,
                        "requirement": requirement["element"],
                        "severity": "critical",
                        "description": f"Missing {requirement['element']} required by HIPAA"
                    })
        
        return findings
    
    def _generate_compliance_recommendations(
        self,
        findings: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on compliance findings"""
        
        recommendations = []
        
        critical_findings = [f for f in findings if f.get("severity") == "critical"]
        warning_findings = [f for f in findings if f.get("severity") == "warning"]
        
        if critical_findings:
            recommendations.append("Address critical compliance gaps immediately before document approval")
            
            for finding in critical_findings:
                recommendations.append(
                    f"Add {finding['requirement']} information to ensure {finding['regulation']} compliance"
                )
        
        if warning_findings:
            recommendations.append("Consider addressing warning items to improve compliance posture")
        
        if not findings:
            recommendations.append("Document appears compliant with specified regulations")
        
        return recommendations
