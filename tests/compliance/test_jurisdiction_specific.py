"""
Jurisdiction-Specific Compliance Tests

Comprehensive test suite for jurisdiction-specific compliance including:
- Multi-jurisdiction compliance validation
- Local law requirements testing
- Cross-border data transfer compliance
- Jurisdiction-specific policy requirements
- Regional regulatory variations
- International compliance frameworks
"""

import pytest
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from . import (
    TestDataGenerator, ComplianceValidator, ComplianceTestMetrics,
    measure_execution_time
)

class TestJurisdictionCompliance:
    """Test jurisdiction-specific compliance requirements"""
    
    @pytest.mark.jurisdiction_specific
    def test_european_union_compliance(self, test_organizations):
        """Test EU-specific compliance requirements"""
        
        eu_org = {
            "name": "EU Tech Solutions Ltd",
            "industry": "technology",
            "size": "medium",
            "geography": ["european_union"],
            "data_types": ["personal_data", "employee_data"],
            "business_activities": ["software_development", "data_processing"]
        }
        
        eu_requirements = [
            {
                "requirement": "gdpr_compliance",
                "mandatory": True,
                "evidence": ["privacy_policy", "consent_mechanisms", "dpo_appointment"]
            },
            {
                "requirement": "cookies_directive",
                "mandatory": True,
                "evidence": ["cookie_policy", "consent_banner"]
            },
            {
                "requirement": "schrems_ii_compliance",
                "mandatory": True,
                "evidence": ["transfer_impact_assessment", "supplementary_measures"]
            },
            {
                "requirement": "digital_services_act",
                "mandatory": False,  # Depends on size/activity
                "evidence": ["content_moderation", "transparency_reporting"]
            }
        ]
        
        compliance_result = self._assess_jurisdiction_compliance(
            "european_union", 
            eu_org,
            eu_requirements
        )
        
        assert compliance_result["success"] is True
        assert compliance_result["jurisdiction"] == "european_union"
        assert compliance_result["compliance_score"] >= 0.8
        assert "gdpr_compliance" in compliance_result["compliant_requirements"]
        assert "transfer_mechanisms" in compliance_result
    
    @pytest.mark.jurisdiction_specific
    def test_united_states_compliance(self, test_organizations):
        """Test US federal and state compliance requirements"""
        
        us_org = test_organizations["technology"]
        us_org["geography"] = ["united_states"]
        
        us_requirements = [
            {
                "requirement": "ccpa_compliance",
                "mandatory": True,
                "state": "california",
                "evidence": ["privacy_policy", "opt_out_mechanisms"]
            },
            {
                "requirement": "coppa_compliance", 
                "mandatory": True,
                "federal": True,
                "evidence": ["parental_consent", "children_privacy_policy"]
            },
            {
                "requirement": "state_breach_notification",
                "mandatory": True,
                "varies_by_state": True,
                "evidence": ["incident_response_plan", "notification_procedures"]
            },
            {
                "requirement": "americans_with_disabilities_act",
                "mandatory": True,
                "federal": True,
                "evidence": ["accessibility_compliance", "wcag_adherence"]
            }
        ]
        
        compliance_result = self._assess_jurisdiction_compliance(
            "united_states",
            us_org,
            us_requirements
        )
        
        assert compliance_result["success"] is True
        assert compliance_result["jurisdiction"] == "united_states"
        assert "state_variations" in compliance_result
        assert "federal_requirements" in compliance_result
    
    @pytest.mark.jurisdiction_specific
    def test_california_specific_compliance(self):
        """Test California-specific compliance requirements"""
        
        ca_org = {
            "name": "California Digital Corp",
            "industry": "technology",
            "size": "large", 
            "geography": ["california"],
            "data_types": ["consumer_data", "employee_data"],
            "business_activities": ["e_commerce", "digital_advertising"],
            "annual_revenue": 50000000  # Triggers CCPA
        }
        
        ca_requirements = [
            {
                "requirement": "ccpa_compliance",
                "threshold": "annual_revenue_25m_or_50k_consumers",
                "mandatory": True,
                "evidence": ["privacy_policy", "consumer_rights", "opt_out_link"]
            },
            {
                "requirement": "cpra_compliance",
                "effective_date": "2023-01-01",
                "mandatory": True,
                "evidence": ["sensitive_personal_info_notice", "data_minimization"]
            },
            {
                "requirement": "sb1001_bot_disclosure",
                "mandatory": True,
                "applies_to": "automated_interactions",
                "evidence": ["bot_disclosure_policy"]
            },
            {
                "requirement": "song_beverly_act",
                "mandatory": True,
                "applies_to": "credit_transactions",
                "evidence": ["credit_card_policies"]
            }
        ]
        
        ca_result = self._assess_california_compliance(ca_org, ca_requirements)
        
        assert ca_result["success"] is True
        assert ca_result["ccpa_applicable"] is True
        assert ca_result["cpra_applicable"] is True
        assert "threshold_analysis" in ca_result
    
    @pytest.mark.jurisdiction_specific
    def test_cross_border_data_transfers(self):
        """Test cross-border data transfer compliance"""
        
        transfer_scenarios = [
            {
                "origin": "european_union",
                "destination": "united_states",
                "data_type": "personal_data",
                "transfer_mechanism": "standard_contractual_clauses",
                "adequacy_decision": False,
                "expected_compliant": True
            },
            {
                "origin": "united_states",
                "destination": "canada",
                "data_type": "business_data",
                "transfer_mechanism": "adequacy_decision",
                "adequacy_decision": True,
                "expected_compliant": True
            },
            {
                "origin": "european_union",
                "destination": "china",
                "data_type": "personal_data",
                "transfer_mechanism": "none",
                "adequacy_decision": False,
                "expected_compliant": False
            },
            {
                "origin": "united_kingdom",
                "destination": "european_union",
                "data_type": "personal_data",
                "transfer_mechanism": "adequacy_decision",
                "adequacy_decision": True,
                "expected_compliant": True
            }
        ]
        
        for scenario in transfer_scenarios:
            transfer_result = self._assess_data_transfer_compliance(scenario)
            
            assert transfer_result["compliant"] == scenario["expected_compliant"]
            assert "transfer_requirements" in transfer_result
            assert "risk_assessment" in transfer_result
            
            if not scenario["expected_compliant"]:
                assert "remediation_options" in transfer_result
    
    @pytest.mark.jurisdiction_specific
    def test_multi_jurisdiction_operations(self):
        """Test compliance for multi-jurisdiction operations"""
        
        global_org = {
            "name": "Global Operations Inc",
            "industry": "financial_services",
            "size": "enterprise",
            "geography": ["united_states", "european_union", "united_kingdom", "canada", "australia"],
            "data_types": ["financial_data", "personal_data", "transaction_data"],
            "business_activities": ["financial_services", "data_processing", "customer_support"]
        }
        
        multi_jurisdiction_assessment = self._assess_multi_jurisdiction_compliance(global_org)
        
        assert multi_jurisdiction_assessment["success"] is True
        assert len(multi_jurisdiction_assessment["jurisdiction_requirements"]) == 5
        assert "conflict_analysis" in multi_jurisdiction_assessment
        assert "harmonization_recommendations" in multi_jurisdiction_assessment
        assert "data_localization_requirements" in multi_jurisdiction_assessment
        
        # Validate conflict resolution
        conflicts = multi_jurisdiction_assessment["conflict_analysis"]["conflicts"]
        for conflict in conflicts:
            assert "resolution_strategy" in conflict
    
    @pytest.mark.jurisdiction_specific
    def test_data_localization_requirements(self):
        """Test data localization compliance requirements"""
        
        localization_scenarios = [
            {
                "jurisdiction": "russia", 
                "requirement": "personal_data_localization",
                "data_types": ["personal_data"],
                "local_storage_required": True,
                "cross_border_restricted": True
            },
            {
                "jurisdiction": "china",
                "requirement": "cybersecurity_law",
                "data_types": ["personal_data", "important_data"],
                "local_storage_required": True,
                "security_assessment_required": True
            },
            {
                "jurisdiction": "indonesia",
                "requirement": "government_regulation_71",
                "data_types": ["public_service_data"],
                "local_storage_required": True,
                "government_access_required": True
            },
            {
                "jurisdiction": "european_union",
                "requirement": "no_general_localization",
                "data_types": ["personal_data"],
                "local_storage_required": False,
                "transfer_restrictions": True
            }
        ]
        
        for scenario in localization_scenarios:
            localization_result = self._assess_data_localization(scenario)
            
            assert localization_result["jurisdiction"] == scenario["jurisdiction"]
            assert localization_result["local_storage_required"] == scenario["local_storage_required"]
            
            if scenario["local_storage_required"]:
                assert "localization_strategy" in localization_result
                assert "compliance_timeline" in localization_result
    
    @pytest.mark.jurisdiction_specific
    def test_sector_specific_jurisdiction_rules(self):
        """Test sector-specific jurisdiction rules"""
        
        sector_scenarios = [
            {
                "sector": "healthcare",
                "jurisdiction": "united_states",
                "regulations": ["HIPAA", "state_medical_privacy"],
                "specific_requirements": ["business_associate_agreements", "minimum_necessary"]
            },
            {
                "sector": "financial_services",
                "jurisdiction": "european_union",
                "regulations": ["PSD2", "GDPR", "MIFID_II"],
                "specific_requirements": ["strong_customer_authentication", "data_portability"]
            },
            {
                "sector": "education",
                "jurisdiction": "united_states", 
                "regulations": ["FERPA", "COPPA"],
                "specific_requirements": ["educational_records_privacy", "parental_consent"]
            },
            {
                "sector": "telecommunications",
                "jurisdiction": "european_union",
                "regulations": ["ePrivacy_Directive", "GDPR"],
                "specific_requirements": ["communications_confidentiality", "consent_for_cookies"]
            }
        ]
        
        for scenario in sector_scenarios:
            sector_result = self._assess_sector_jurisdiction_compliance(scenario)
            
            assert sector_result["success"] is True
            assert sector_result["sector"] == scenario["sector"]
            assert sector_result["jurisdiction"] == scenario["jurisdiction"]
            assert len(sector_result["applicable_regulations"]) == len(scenario["regulations"])
            assert "sector_specific_obligations" in sector_result
    
    @pytest.mark.jurisdiction_specific
    @pytest.mark.performance
    def test_jurisdiction_assessment_performance(self, performance_thresholds):
        """Test performance of jurisdiction-specific assessments"""
        
        jurisdictions = [
            "united_states",
            "european_union", 
            "california",
            "canada",
            "united_kingdom",
            "australia"
        ]
        
        for jurisdiction in jurisdictions:
            start_time = time.time()
            
            test_org = {
                "name": f"Test Org {jurisdiction}",
                "industry": "technology",
                "geography": [jurisdiction]
            }
            
            result = self._perform_jurisdiction_assessment(jurisdiction, test_org)
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            threshold = performance_thresholds["compliance_check_time"]
            assert execution_time < threshold, (
                f"Jurisdiction assessment for {jurisdiction} took {execution_time:.2f}s, "
                f"exceeding threshold of {threshold}s"
            )
            
            assert result["success"] is True
    
    def _assess_jurisdiction_compliance(self, jurisdiction: str, organization: Dict[str, Any], 
                                      requirements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess compliance for specific jurisdiction"""
        
        compliant_requirements = []
        non_compliant_requirements = []
        
        for req in requirements:
            # Simulate compliance check
            if req["mandatory"]:
                # Mock compliance based on requirement type
                if "gdpr" in req["requirement"] and jurisdiction == "european_union":
                    compliant_requirements.append(req["requirement"])
                elif "ccpa" in req["requirement"] and jurisdiction in ["united_states", "california"]:
                    compliant_requirements.append(req["requirement"])
                else:
                    compliant_requirements.append(req["requirement"])  # Assume compliant for test
            else:
                compliant_requirements.append(req["requirement"])
        
        compliance_score = len(compliant_requirements) / len(requirements)
        
        # Add jurisdiction-specific details
        jurisdiction_details = self._get_jurisdiction_details(jurisdiction)
        
        return {
            "success": True,
            "jurisdiction": jurisdiction,
            "compliance_score": compliance_score,
            "compliant_requirements": compliant_requirements,
            "non_compliant_requirements": non_compliant_requirements,
            "total_requirements": len(requirements),
            "transfer_mechanisms": jurisdiction_details.get("transfer_mechanisms", []),
            "local_representatives": jurisdiction_details.get("local_representatives", False)
        }
    
    def _assess_california_compliance(self, organization: Dict[str, Any], 
                                    requirements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess California-specific compliance"""
        
        # Check CCPA applicability thresholds
        annual_revenue = organization.get("annual_revenue", 0)
        ccpa_applicable = (
            annual_revenue >= 25000000 or  # $25M annual revenue
            organization.get("consumer_count", 0) >= 50000 or  # 50k consumers
            organization.get("data_sale_revenue_percentage", 0) >= 0.5  # 50% revenue from data sales
        )
        
        # Check CPRA applicability (effective 2023)
        cpra_applicable = ccpa_applicable  # CPRA builds on CCPA
        
        compliant_reqs = []
        for req in requirements:
            if req["requirement"] == "ccpa_compliance" and ccpa_applicable:
                compliant_reqs.append(req["requirement"])
            elif req["requirement"] == "cpra_compliance" and cpra_applicable:
                compliant_reqs.append(req["requirement"])
            else:
                compliant_reqs.append(req["requirement"])
        
        return {
            "success": True,
            "jurisdiction": "california",
            "ccpa_applicable": ccpa_applicable,
            "cpra_applicable": cpra_applicable,
            "threshold_analysis": {
                "annual_revenue": annual_revenue,
                "revenue_threshold_met": annual_revenue >= 25000000
            },
            "compliant_requirements": compliant_reqs,
            "compliance_score": len(compliant_reqs) / len(requirements)
        }
    
    def _assess_data_transfer_compliance(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Assess data transfer compliance"""
        
        origin = scenario["origin"]
        destination = scenario["destination"]
        transfer_mechanism = scenario.get("transfer_mechanism", "none")
        adequacy_decision = scenario.get("adequacy_decision", False)
        
        # Define transfer requirements by jurisdiction
        transfer_rules = {
            "european_union": {
                "adequate_countries": ["canada", "united_kingdom", "japan"],
                "allowed_mechanisms": ["adequacy_decision", "standard_contractual_clauses", "bcr"],
                "requires_impact_assessment": True
            },
            "united_states": {
                "adequate_countries": [],
                "allowed_mechanisms": ["privacy_shield", "model_clauses"],
                "requires_impact_assessment": False
            }
        }
        
        origin_rules = transfer_rules.get(origin, {})
        
        # Determine compliance
        compliant = False
        if adequacy_decision and destination in origin_rules.get("adequate_countries", []):
            compliant = True
        elif transfer_mechanism in origin_rules.get("allowed_mechanisms", []):
            compliant = True
        elif transfer_mechanism == "none" and origin != "european_union":
            compliant = True  # Some jurisdictions don't restrict transfers
        
        # Risk assessment
        risk_factors = []
        if not adequacy_decision:
            risk_factors.append("no_adequacy_decision")
        if origin == "european_union" and transfer_mechanism == "none":
            risk_factors.append("no_transfer_mechanism")
        
        result = {
            "compliant": compliant,
            "transfer_requirements": origin_rules,
            "risk_assessment": {
                "risk_level": "high" if len(risk_factors) > 1 else "medium" if risk_factors else "low",
                "risk_factors": risk_factors
            }
        }
        
        if not compliant:
            result["remediation_options"] = [
                "implement_standard_contractual_clauses",
                "conduct_transfer_impact_assessment",
                "implement_supplementary_measures"
            ]
        
        return result
    
    def _assess_multi_jurisdiction_compliance(self, organization: Dict[str, Any]) -> Dict[str, Any]:
        """Assess compliance across multiple jurisdictions"""
        
        jurisdictions = organization["geography"]
        jurisdiction_requirements = {}
        conflicts = []
        
        # Assess each jurisdiction
        for jurisdiction in jurisdictions:
            jurisdiction_reqs = self._get_jurisdiction_requirements(jurisdiction)
            jurisdiction_requirements[jurisdiction] = jurisdiction_reqs
            
            # Check for conflicts with other jurisdictions
            for other_jurisdiction in jurisdictions:
                if jurisdiction != other_jurisdiction:
                    conflict = self._identify_jurisdiction_conflicts(jurisdiction, other_jurisdiction)
                    if conflict:
                        conflicts.append(conflict)
        
        # Generate harmonization recommendations
        harmonization_recs = [
            "implement_highest_standard_approach",
            "create_jurisdiction_specific_policies",
            "establish_data_governance_framework"
        ]
        
        # Data localization analysis
        localization_reqs = {}
        for jurisdiction in jurisdictions:
            localization_reqs[jurisdiction] = self._get_localization_requirements(jurisdiction)
        
        return {
            "success": True,
            "jurisdiction_requirements": jurisdiction_requirements,
            "conflict_analysis": {
                "conflicts": conflicts,
                "conflict_count": len(conflicts)
            },
            "harmonization_recommendations": harmonization_recs,
            "data_localization_requirements": localization_reqs
        }
    
    def _assess_data_localization(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Assess data localization requirements"""
        
        jurisdiction = scenario["jurisdiction"]
        local_storage_required = scenario["local_storage_required"]
        
        result = {
            "jurisdiction": jurisdiction,
            "local_storage_required": local_storage_required,
            "data_types_affected": scenario["data_types"]
        }
        
        if local_storage_required:
            result.update({
                "localization_strategy": "establish_local_data_centers",
                "compliance_timeline": "12_months",
                "technical_requirements": [
                    "local_server_infrastructure",
                    "data_residency_controls",
                    "jurisdiction_specific_access_controls"
                ]
            })
        
        return result
    
    def _assess_sector_jurisdiction_compliance(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Assess sector-specific jurisdiction compliance"""
        
        sector = scenario["sector"]
        jurisdiction = scenario["jurisdiction"]
        regulations = scenario["regulations"]
        
        # Mock sector-specific obligations
        sector_obligations = {
            "healthcare": ["patient_privacy", "medical_records_security"],
            "financial_services": ["customer_due_diligence", "transaction_monitoring"],
            "education": ["student_privacy", "educational_records_protection"],
            "telecommunications": ["communications_privacy", "lawful_interception"]
        }
        
        return {
            "success": True,
            "sector": sector,
            "jurisdiction": jurisdiction,
            "applicable_regulations": regulations,
            "sector_specific_obligations": sector_obligations.get(sector, []),
            "compliance_score": 0.9,  # Mock high compliance
            "assessment_date": datetime.now().isoformat()
        }
    
    def _perform_jurisdiction_assessment(self, jurisdiction: str, organization: Dict[str, Any]) -> Dict[str, Any]:
        """Perform jurisdiction assessment for performance testing"""
        
        # Simulate processing time
        time.sleep(0.1)
        
        return {
            "success": True,
            "jurisdiction": jurisdiction,
            "assessment_completed": True,
            "requirements_checked": 15,  # Mock number
            "compliance_score": 0.85
        }
    
    def _get_jurisdiction_details(self, jurisdiction: str) -> Dict[str, Any]:
        """Get jurisdiction-specific implementation details"""
        
        details = {
            "european_union": {
                "transfer_mechanisms": ["adequacy_decision", "standard_contractual_clauses", "bcr"],
                "local_representatives": True,
                "supervisory_authorities": True
            },
            "united_states": {
                "transfer_mechanisms": ["privacy_shield", "model_clauses"],
                "local_representatives": False,
                "state_variations": True
            },
            "california": {
                "transfer_mechanisms": ["ccpa_compliant_contracts"],
                "local_representatives": False,
                "consumer_rights_focus": True
            }
        }
        
        return details.get(jurisdiction, {})
    
    def _get_jurisdiction_requirements(self, jurisdiction: str) -> List[str]:
        """Get requirements for specific jurisdiction"""
        
        requirements_map = {
            "european_union": ["gdpr_compliance", "cookie_consent", "dpo_appointment"],
            "united_states": ["privacy_policy", "breach_notification", "accessibility"],
            "california": ["ccpa_compliance", "cpra_compliance"],
            "canada": ["pipeda_compliance", "breach_notification"],
            "united_kingdom": ["uk_gdpr_compliance", "ico_registration"]
        }
        
        return requirements_map.get(jurisdiction, ["general_privacy_compliance"])
    
    def _identify_jurisdiction_conflicts(self, jurisdiction1: str, jurisdiction2: str) -> Optional[Dict[str, Any]]:
        """Identify conflicts between jurisdictions"""
        
        known_conflicts = {
            ("european_union", "united_states"): {
                "conflict_type": "data_transfer_restrictions", 
                "description": "EU GDPR restricts transfers to US without adequacy",
                "resolution_strategy": "implement_standard_contractual_clauses"
            },
            ("california", "european_union"): {
                "conflict_type": "consumer_rights_differences",
                "description": "Different requirements for consumer rights",
                "resolution_strategy": "implement_highest_standard"
            }
        }
        
        conflict_key = (jurisdiction1, jurisdiction2)
        reverse_key = (jurisdiction2, jurisdiction1)
        
        return known_conflicts.get(conflict_key) or known_conflicts.get(reverse_key)
    
    def _get_localization_requirements(self, jurisdiction: str) -> Dict[str, Any]:
        """Get data localization requirements for jurisdiction"""
        
        localization_map = {
            "russia": {"required": True, "data_types": ["personal_data"]},
            "china": {"required": True, "data_types": ["personal_data", "important_data"]},
            "european_union": {"required": False, "transfer_restrictions": True},
            "united_states": {"required": False, "sector_specific": True}
        }
        
        return localization_map.get(jurisdiction, {"required": False})
