"""
Policy Document Generation Tests

Comprehensive test suite for policy document generation including:
- Template validation and customization
- Jurisdiction-specific policy generation
- Multi-regulation policy compliance
- Document completeness validation
- Legal language verification
- Version management and approval workflows
"""

import pytest
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json

from . import (
    TestDataGenerator, ComplianceValidator, ComplianceTestMetrics,
    measure_execution_time
)

class TestPolicyGeneration:
    """Test policy document generation capabilities"""
    
    @pytest.mark.policy_generation
    def test_privacy_policy_generation(self, test_organizations):
        """Test privacy policy generation for different organizations"""
        
        for org_type, org_data in test_organizations.items():
            policy_request = {
                "document_type": "privacy_policy",
                "organization": org_data,
                "jurisdiction": org_data["geography"][0], 
                "regulations": self._get_applicable_regulations(org_type, org_data["geography"]),
                "customizations": {
                    "branding": {"company_name": org_data["name"]},
                    "contact_info": {"email": "privacy@testcompany.com"},
                    "data_retention": "7_years"
                }
            }
            
            result = self._generate_policy_document(policy_request)
            
            # Validate policy generation
            assert result["success"] is True
            assert result["document"]["document_type"] == "privacy_policy"
            assert org_data["name"] in result["document"]["content"]
            
            # Validate content completeness
            validation_result = ComplianceValidator.validate_policy_document(
                result["document"],
                "privacy_policy", 
                policy_request["jurisdiction"]
            )
            
            assert validation_result["completeness_score"] >= 0.9
            assert validation_result["has_jurisdiction_specifics"] is True
    
    @pytest.mark.policy_generation
    def test_terms_of_service_generation(self, test_organizations):
        """Test terms of service generation"""
        
        for org_type, org_data in test_organizations.items():
            if org_type in ["technology", "retail"]:  # Service-oriented businesses
                tos_request = {
                    "document_type": "terms_of_service",
                    "organization": org_data,
                    "service_type": "digital_platform",
                    "jurisdiction": org_data["geography"][0],
                    "business_model": "subscription" if org_type == "technology" else "marketplace",
                    "user_obligations": ["account_security", "acceptable_use", "payment_terms"],
                    "liability_limitations": True,
                    "dispute_resolution": "arbitration"
                }
                
                result = self._generate_policy_document(tos_request)
                
                assert result["success"] is True
                assert "acceptance" in result["document"]["content"].lower()
                assert "termination" in result["document"]["content"].lower()
                assert "liability" in result["document"]["content"].lower()
    
    @pytest.mark.policy_generation
    def test_cookie_policy_generation(self, test_organizations):
        """Test cookie policy generation"""
        
        tech_org = test_organizations["technology"]
        cookie_request = {
            "document_type": "cookie_policy",
            "organization": tech_org,
            "jurisdiction": "european_union",  # GDPR requires cookie consent
            "cookie_types": ["necessary", "analytics", "marketing", "functional"],
            "third_party_cookies": True,
            "consent_mechanism": "opt_in",
            "retention_periods": {
                "necessary": "session",
                "analytics": "2_years",
                "marketing": "1_year"
            }
        }
        
        result = self._generate_policy_document(cookie_request)
        
        assert result["success"] is True
        assert "cookies" in result["document"]["content"].lower()
        assert "consent" in result["document"]["content"].lower()
        
        # Validate GDPR compliance for cookies
        content_lower = result["document"]["content"].lower()
        assert "opt-in" in content_lower or "opt in" in content_lower
        assert "withdrawal" in content_lower or "withdraw" in content_lower
    
    @pytest.mark.policy_generation
    def test_data_processing_agreement_generation(self, test_organizations):
        """Test Data Processing Agreement (DPA) generation"""
        
        tech_org = test_organizations["technology"]
        dpa_request = {
            "document_type": "data_processing_agreement",
            "data_controller": tech_org,
            "data_processor": {
                "name": "Cloud Service Provider Inc",
                "jurisdiction": "united_states",
                "certifications": ["SOC2", "ISO27001"]
            },
            "processing_purposes": ["cloud_hosting", "data_analytics"],
            "data_categories": ["customer_data", "usage_data"],
            "retention_period": "contract_duration_plus_3_years",
            "international_transfers": True,
            "adequate_country": False,
            "transfer_mechanism": "standard_contractual_clauses"
        }
        
        result = self._generate_policy_document(dpa_request)
        
        assert result["success"] is True
        content = result["document"]["content"].lower()
        assert "data controller" in content
        assert "data processor" in content
        assert "processing purposes" in content
        assert "standard contractual clauses" in content
    
    @pytest.mark.policy_generation
    def test_jurisdiction_specific_variations(self):
        """Test jurisdiction-specific policy variations"""
        
        base_org = TestDataGenerator.get_organization_profiles()["technology"]
        
        jurisdictions_to_test = [
            "united_states",
            "european_union", 
            "california",
            "canada",
            "united_kingdom"
        ]
        
        for jurisdiction in jurisdictions_to_test:
            policy_request = {
                "document_type": "privacy_policy",
                "organization": base_org,
                "jurisdiction": jurisdiction,
                "regulations": self._get_jurisdiction_regulations(jurisdiction)
            }
            
            result = self._generate_policy_document(policy_request)
            
            assert result["success"] is True
            
            # Validate jurisdiction-specific content
            content = result["document"]["content"].lower()
            jurisdiction_indicators = self._get_jurisdiction_indicators(jurisdiction)
            
            # At least one jurisdiction indicator should be present
            assert any(indicator in content for indicator in jurisdiction_indicators)
    
    @pytest.mark.policy_generation
    def test_multi_regulation_compliance(self):
        """Test policy generation with multiple regulation compliance"""
        
        global_org = {
            "name": "Global Tech Corporation",
            "industry": "technology",
            "size": "enterprise",
            "geography": ["united_states", "european_union", "california"],
            "data_types": ["user_data", "financial_data", "health_data"],
            "business_activities": ["software_services", "data_processing", "e_commerce"]
        }
        
        multi_regulation_request = {
            "document_type": "privacy_policy",
            "organization": global_org,
            "jurisdiction": "global",
            "regulations": ["GDPR", "CCPA", "HIPAA"],
            "comprehensive_compliance": True
        }
        
        result = self._generate_policy_document(multi_regulation_request)
        
        assert result["success"] is True
        content = result["document"]["content"].lower()
        
        # Check for regulation-specific content
        assert "gdpr" in content or "general data protection regulation" in content
        assert "ccpa" in content or "california consumer privacy act" in content
        assert "hipaa" in content or "health insurance portability" in content
        
        # Validate comprehensive compliance
        validator = ComplianceValidator()
        
        for regulation in multi_regulation_request["regulations"]:
            compliance_result = validator.validate_regulation_compliance(
                regulation, 
                ["privacy_policy"], 
                {"content": content}
            )
            assert compliance_result["compliance_score"] >= 0.8
    
    @pytest.mark.policy_generation
    def test_policy_version_management(self):
        """Test policy document version management"""
        
        org = TestDataGenerator.get_organization_profiles()["technology"]
        
        # Generate initial policy version
        initial_request = {
            "document_type": "privacy_policy",
            "organization": org,
            "jurisdiction": "united_states",
            "version": "1.0"
        }
        
        initial_result = self._generate_policy_document(initial_request)
        assert initial_result["success"] is True
        assert initial_result["document"]["version"] == "1.0"
        
        # Generate updated policy version
        updated_request = {
            "document_type": "privacy_policy", 
            "organization": org,
            "jurisdiction": "united_states",
            "version": "1.1",
            "previous_version": "1.0",
            "changes": ["Added CCPA compliance", "Updated data retention policies"],
            "change_summary": "Enhanced privacy protections and California compliance"
        }
        
        updated_result = self._generate_policy_document(updated_request)
        assert updated_result["success"] is True
        assert updated_result["document"]["version"] == "1.1"
        assert "change_log" in updated_result["document"]
    
    @pytest.mark.policy_generation
    def test_industry_specific_customizations(self, test_organizations):
        """Test industry-specific policy customizations"""
        
        industry_customizations = {
            "healthcare": {
                "additional_sections": ["hipaa_compliance", "patient_rights"],
                "data_types": ["protected_health_information"],
                "retention_requirements": "medical_records_retention"
            },
            "financial_services": {
                "additional_sections": ["financial_privacy", "gramm_leach_bliley"],
                "data_types": ["financial_information"],
                "retention_requirements": "financial_records_retention"
            },
            "education": {
                "additional_sections": ["ferpa_compliance", "student_privacy"],
                "data_types": ["educational_records"],
                "retention_requirements": "educational_records_retention"
            }
        }
        
        for industry, customization in industry_customizations.items():
            if industry in test_organizations:
                org = test_organizations[industry]
                
                policy_request = {
                    "document_type": "privacy_policy",
                    "organization": org,
                    "industry_specific": True,
                    "customizations": customization
                }
                
                result = self._generate_policy_document(policy_request)
                
                assert result["success"] is True
                content = result["document"]["content"].lower()
                
                # Validate industry-specific content
                for section in customization["additional_sections"]:
                    section_keywords = section.replace("_", " ")
                    assert section_keywords in content
    
    @pytest.mark.policy_generation
    @pytest.mark.performance
    @measure_execution_time
    def test_policy_generation_performance(self, performance_thresholds):
        """Test policy generation performance"""
        
        org = TestDataGenerator.get_organization_profiles()["technology"]
        
        policy_types = [
            "privacy_policy",
            "terms_of_service", 
            "cookie_policy",
            "data_processing_agreement"
        ]
        
        for policy_type in policy_types:
            start_time = time.time()
            
            request = {
                "document_type": policy_type,
                "organization": org,
                "jurisdiction": "united_states"
            }
            
            result = self._generate_policy_document(request)
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            # Assert performance threshold
            threshold = performance_thresholds["policy_generation_time"]
            assert execution_time < threshold, (
                f"Policy generation for {policy_type} took {execution_time:.2f}s, "
                f"exceeding threshold of {threshold}s"
            )
            
            assert result["success"] is True
    
    def _generate_policy_document(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate policy document generation"""
        
        # Simulate processing time based on complexity
        complexity_factors = len(request.get("regulations", [])) + len(str(request))
        processing_time = min(0.1 + (complexity_factors * 0.01), 2.0)
        time.sleep(processing_time)
        
        # Generate mock policy content
        content = self._generate_policy_content(request)
        
        document = {
            "document_id": f"DOC-{int(time.time())}",
            "document_type": request["document_type"],
            "title": self._get_document_title(request["document_type"]),
            "version": request.get("version", "1.0"),
            "effective_date": datetime.now().isoformat(),
            "jurisdiction": request.get("jurisdiction", "united_states"),
            "regulations_addressed": request.get("regulations", []),
            "content": content,
            "approval_status": "draft",
            "word_count": len(content.split()),
            "change_log": request.get("changes", [])
        }
        
        return {
            "success": True,
            "document": document,
            "generation_time": processing_time,
            "customizations_applied": len(request.get("customizations", {}))
        }
    
    def _generate_policy_content(self, request: Dict[str, Any]) -> str:
        """Generate mock policy content"""
        
        doc_type = request["document_type"]
        org_name = request.get("organization", {}).get("name", "Test Organization")
        jurisdiction = request.get("jurisdiction", "united_states")
        
        base_content = {
            "privacy_policy": f"""
Privacy Policy for {org_name}

1. Introduction
This privacy policy describes how {org_name} collects, uses, and protects your personal information.

2. Data Collection
We collect information you provide directly to us and information we obtain automatically.

3. Data Use
We use your information to provide and improve our services.

4. Data Sharing
We may share your information with service providers and as required by law.

5. Your Rights
You have certain rights regarding your personal information.

6. Contact Information
For privacy questions, contact us at privacy@{org_name.lower().replace(' ', '')}.com
""",
            "terms_of_service": f"""
Terms of Service for {org_name}

1. Acceptance of Terms
By using our services, you agree to these terms.

2. Description of Services
{org_name} provides digital services and platforms.

3. User Obligations
Users must comply with applicable laws and our policies.

4. Intellectual Property
All content and materials are owned by {org_name}.

5. Limitation of Liability
Our liability is limited as described herein.

6. Termination
We may terminate access for violations of these terms.
""",
            "cookie_policy": f"""
Cookie Policy for {org_name}

1. What Are Cookies
Cookies are small text files stored on your device.

2. Types of Cookies We Use
We use necessary, analytics, and marketing cookies.

3. Cookie Consent
We obtain consent for non-essential cookies.

4. Managing Cookies
You can control cookies through your browser settings.

5. Third-Party Cookies
Some cookies are set by third-party services.
""",
            "data_processing_agreement": f"""
Data Processing Agreement with {org_name}

1. Parties
This agreement is between the data controller and data processor.

2. Processing Purposes
Data is processed for specified business purposes.

3. Data Categories
Personal data categories are defined and limited.

4. Security Measures
Appropriate technical and organizational measures are implemented.

5. International Transfers
Data transfers comply with applicable regulations.
"""
        }
        
        content = base_content.get(doc_type, f"Policy document for {org_name}")
        
        # Add jurisdiction-specific content
        if jurisdiction == "european_union":
            content += "\n\nGDPR Compliance: This policy complies with the General Data Protection Regulation."
        elif jurisdiction == "california":
            content += "\n\nCCPA Compliance: This policy complies with the California Consumer Privacy Act."
        elif jurisdiction == "united_states" and "hipaa" in str(request).lower():
            content += "\n\nHIPAA Compliance: This policy complies with the Health Insurance Portability and Accountability Act."
        
        # Add regulation-specific content
        regulations = request.get("regulations", [])
        for regulation in regulations:
            content += f"\n\n{regulation.upper()} Compliance: This policy addresses {regulation} requirements."
        
        return content
    
    def _get_document_title(self, doc_type: str) -> str:
        """Get document title based on type"""
        titles = {
            "privacy_policy": "Privacy Policy",
            "terms_of_service": "Terms of Service",
            "cookie_policy": "Cookie Policy", 
            "data_processing_agreement": "Data Processing Agreement",
            "gdpr_notice": "GDPR Privacy Notice",
            "ccpa_notice": "CCPA Consumer Notice"
        }
        return titles.get(doc_type, "Policy Document")
    
    def _get_applicable_regulations(self, org_type: str, geographies: List[str]) -> List[str]:
        """Get applicable regulations for organization"""
        regulations = []
        
        # Geographic regulations
        if "european_union" in geographies:
            regulations.append("GDPR")
        if "california" in geographies or "united_states" in geographies:
            regulations.append("CCPA")
        
        # Industry-specific regulations
        if org_type == "healthcare":
            regulations.append("HIPAA")
        elif org_type == "financial_services":
            regulations.extend(["SOX", "GLBA"])
        elif org_type == "education":
            regulations.append("FERPA")
        
        return regulations
    
    def _get_jurisdiction_regulations(self, jurisdiction: str) -> List[str]:
        """Get regulations applicable to jurisdiction"""
        jurisdiction_regs = {
            "united_states": ["CCPA", "HIPAA", "COPPA"],
            "european_union": ["GDPR"],
            "california": ["CCPA", "CPRA"],
            "canada": ["PIPEDA"],
            "united_kingdom": ["UK_GDPR", "DPA"]
        }
        return jurisdiction_regs.get(jurisdiction, [])
    
    def _get_jurisdiction_indicators(self, jurisdiction: str) -> List[str]:
        """Get text indicators for jurisdiction-specific content"""
        indicators = {
            "united_states": ["united states", "federal", "state law"],
            "european_union": ["european union", "gdpr", "data protection"],
            "california": ["california", "ccpa", "consumer privacy"],
            "canada": ["canada", "pipeda", "privacy act"],
            "united_kingdom": ["united kingdom", "uk gdpr", "ico"]
        }
        return indicators.get(jurisdiction, [])
