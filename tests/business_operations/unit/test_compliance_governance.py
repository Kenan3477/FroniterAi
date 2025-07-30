"""
Unit Tests for Compliance Governance Capability

Tests for compliance governance methods including:
- Regulatory compliance monitoring
- Policy management
- Audit trail generation
- Risk assessment
- Control framework validation
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch
from typing import Dict, Any, List
from datetime import datetime, timedelta

from modules.business_operations.compliance_governance import (
    ComplianceGovernanceCapability,
    ComplianceFramework,
    PolicyDocument,
    AuditTrail,
    ControlAssessment,
    RegulatoryRequirement
)
from tests.business_operations import (
    BusinessOperationsTestFramework,
    TestDataGenerator,
    ComplianceValidator,
    TEST_CONFIG
)

@pytest.mark.unit
class TestComplianceGovernanceUnit(BusinessOperationsTestFramework):
    """Unit tests for Compliance Governance Capability"""
    
    @pytest.fixture
    def compliance_capability(self):
        """Create compliance governance capability instance"""
        config = {
            "regulatory_frameworks": ["sox", "gdpr", "basel_iii"],
            "audit_frequency": "quarterly",
            "risk_tolerance": "low"
        }
        return ComplianceGovernanceCapability(config)
    
    @pytest.fixture
    def sample_regulatory_requirements(self):
        """Sample regulatory requirements for testing"""
        return [
            {
                "regulation_id": "SOX_404",
                "framework": "sox",
                "title": "Management Assessment of Internal Controls",
                "description": "Annual assessment of effectiveness of internal controls",
                "compliance_level": "mandatory",
                "deadline": "2024-12-31",
                "penalty_severity": "high",
                "control_requirements": [
                    "financial_reporting_controls",
                    "it_general_controls",
                    "entity_level_controls"
                ]
            },
            {
                "regulation_id": "GDPR_Art_32",
                "framework": "gdpr",
                "title": "Security of Processing",
                "description": "Technical and organizational measures for data protection",
                "compliance_level": "mandatory",
                "deadline": "ongoing",
                "penalty_severity": "high",
                "control_requirements": [
                    "data_encryption",
                    "access_controls",
                    "incident_response"
                ]
            },
            {
                "regulation_id": "Basel_III_Pillar_1",
                "framework": "basel_iii",
                "title": "Capital Requirements",
                "description": "Minimum capital adequacy requirements",
                "compliance_level": "mandatory",
                "deadline": "ongoing",
                "penalty_severity": "critical",
                "control_requirements": [
                    "capital_calculation",
                    "risk_measurement",
                    "stress_testing"
                ]
            }
        ]
    
    @pytest.fixture
    def sample_policies(self):
        """Sample policy documents for testing"""
        return [
            {
                "policy_id": "POL_001",
                "title": "Data Privacy Policy",
                "category": "data_protection",
                "version": "2.1",
                "effective_date": "2024-01-01",
                "review_date": "2024-12-31",
                "owner": "Chief Privacy Officer",
                "scope": "organization_wide",
                "status": "active",
                "regulatory_mapping": ["GDPR_Art_5", "GDPR_Art_6", "GDPR_Art_32"],
                "control_objectives": [
                    "data_minimization",
                    "consent_management",
                    "data_subject_rights"
                ]
            },
            {
                "policy_id": "POL_002",
                "title": "Financial Controls Policy",
                "category": "financial_governance",
                "version": "1.5",
                "effective_date": "2024-01-15",
                "review_date": "2024-07-15",
                "owner": "Chief Financial Officer",
                "scope": "finance_department",
                "status": "active",
                "regulatory_mapping": ["SOX_302", "SOX_404"],
                "control_objectives": [
                    "segregation_of_duties",
                    "authorization_controls",
                    "reconciliation_procedures"
                ]
            }
        ]
    
    @pytest.fixture
    def sample_control_environment(self):
        """Sample control environment for testing"""
        return {
            "control_categories": {
                "entity_level": {
                    "controls": [
                        {
                            "control_id": "ELC_001",
                            "description": "Code of Conduct",
                            "effectiveness": "effective",
                            "last_tested": "2024-01-15",
                            "test_frequency": "annual"
                        },
                        {
                            "control_id": "ELC_002", 
                            "description": "Risk Management Framework",
                            "effectiveness": "needs_improvement",
                            "last_tested": "2023-12-01",
                            "test_frequency": "annual"
                        }
                    ]
                },
                "process_level": {
                    "controls": [
                        {
                            "control_id": "PLC_001",
                            "description": "Purchase Authorization",
                            "effectiveness": "effective",
                            "last_tested": "2024-02-01",
                            "test_frequency": "quarterly"
                        },
                        {
                            "control_id": "PLC_002",
                            "description": "Financial Close Process",
                            "effectiveness": "effective",
                            "last_tested": "2024-01-31",
                            "test_frequency": "monthly"
                        }
                    ]
                },
                "it_general": {
                    "controls": [
                        {
                            "control_id": "ITGC_001",
                            "description": "User Access Management",
                            "effectiveness": "effective",
                            "last_tested": "2024-01-20",
                            "test_frequency": "quarterly"
                        },
                        {
                            "control_id": "ITGC_002",
                            "description": "Change Management",
                            "effectiveness": "partially_effective",
                            "last_tested": "2024-01-10",
                            "test_frequency": "quarterly"
                        }
                    ]
                }
            }
        }
    
    def test_regulatory_compliance_assessment(self, compliance_capability, sample_regulatory_requirements):
        """Test regulatory compliance assessment"""
        
        # Current compliance status
        compliance_status = {
            "SOX_404": {
                "implementation_status": "implemented",
                "last_assessment": "2023-12-31",
                "findings": ["minor_documentation_gaps"],
                "remediation_status": "in_progress"
            },
            "GDPR_Art_32": {
                "implementation_status": "implemented",
                "last_assessment": "2024-01-15",
                "findings": [],
                "remediation_status": "complete"
            },
            "Basel_III_Pillar_1": {
                "implementation_status": "partially_implemented",
                "last_assessment": "2023-11-30",
                "findings": ["capital_calculation_methodology", "stress_testing_coverage"],
                "remediation_status": "planned"
            }
        }
        
        # Perform compliance assessment
        assessment_result = compliance_capability.assess_regulatory_compliance(
            regulatory_requirements=sample_regulatory_requirements,
            current_status=compliance_status
        )
        
        # Validate structure
        assert "compliance_score" in assessment_result
        assert "framework_scores" in assessment_result
        assert "gap_analysis" in assessment_result
        assert "remediation_plan" in assessment_result
        assert "risk_rating" in assessment_result
        
        # Validate compliance score calculation
        compliance_score = assessment_result["compliance_score"]
        assert 0 <= compliance_score <= 1.0
        
        # Calculate expected score based on implementation status
        total_requirements = len(sample_regulatory_requirements)
        implemented_score = 1.0  # SOX_404 and GDPR_Art_32
        partial_score = 0.5      # Basel_III_Pillar_1
        expected_score = (implemented_score + implemented_score + partial_score) / total_requirements
        
        # Validate score accuracy
        compliance_validator = ComplianceValidator()
        assert compliance_validator.validate_compliance_score(
            compliance_score, expected_score, tolerance=0.1
        )
        
        # Validate framework scores
        framework_scores = assessment_result["framework_scores"]
        assert "sox" in framework_scores
        assert "gdpr" in framework_scores
        assert "basel_iii" in framework_scores
        
        # GDPR should have highest score (fully compliant)
        assert framework_scores["gdpr"] >= framework_scores["basel_iii"]
        
        # Validate gap analysis
        gap_analysis = assessment_result["gap_analysis"]
        assert len(gap_analysis) > 0
        
        # Should identify Basel III gaps
        basel_gaps = [gap for gap in gap_analysis if gap["framework"] == "basel_iii"]
        assert len(basel_gaps) > 0
    
    def test_policy_management(self, compliance_capability, sample_policies):
        """Test policy management functionality"""
        
        # Policy compliance tracking
        policy_compliance = {
            "POL_001": {
                "acknowledgment_rate": 0.95,
                "training_completion": 0.88,
                "violations": 2,
                "last_review": "2024-01-01"
            },
            "POL_002": {
                "acknowledgment_rate": 0.98,
                "training_completion": 0.92,
                "violations": 0,
                "last_review": "2024-01-15"
            }
        }
        
        # Perform policy analysis
        policy_analysis = compliance_capability.analyze_policy_compliance(
            policies=sample_policies,
            compliance_data=policy_compliance
        )
        
        # Validate structure
        assert "policy_scores" in policy_analysis
        assert "compliance_trends" in policy_analysis
        assert "review_schedule" in policy_analysis
        assert "improvement_recommendations" in policy_analysis
        
        # Validate policy scores
        policy_scores = policy_analysis["policy_scores"]
        assert len(policy_scores) == 2
        
        for score in policy_scores:
            assert "policy_id" in score
            assert "compliance_score" in score
            assert "risk_level" in score
            assert 0 <= score["compliance_score"] <= 1.0
        
        # POL_002 should have higher score (better compliance metrics)
        pol_001_score = next(s["compliance_score"] for s in policy_scores if s["policy_id"] == "POL_001")
        pol_002_score = next(s["compliance_score"] for s in policy_scores if s["policy_id"] == "POL_002")
        assert pol_002_score >= pol_001_score
        
        # Validate review schedule
        review_schedule = policy_analysis["review_schedule"]
        assert len(review_schedule) > 0
        
        # Should identify policies due for review
        current_date = datetime.now()
        for review in review_schedule:
            review_date = datetime.strptime(review["review_date"], "%Y-%m-%d")
            days_until_review = (review_date - current_date).days
            assert "priority" in review
    
    def test_audit_trail_generation(self, compliance_capability):
        """Test audit trail generation and validation"""
        
        # Sample business events
        business_events = [
            {
                "event_id": "evt_001",
                "timestamp": "2024-01-15T10:30:00Z",
                "event_type": "financial_transaction",
                "user_id": "user_123",
                "action": "approve_payment",
                "amount": 50000.00,
                "details": {
                    "vendor": "Supplier ABC",
                    "invoice_number": "INV-2024-001",
                    "approval_level": "senior_manager"
                }
            },
            {
                "event_id": "evt_002",
                "timestamp": "2024-01-15T14:20:00Z",
                "event_type": "data_access",
                "user_id": "user_456",
                "action": "export_customer_data",
                "details": {
                    "data_type": "personal_information",
                    "record_count": 1000,
                    "purpose": "marketing_analysis"
                }
            },
            {
                "event_id": "evt_003",
                "timestamp": "2024-01-16T09:15:00Z",
                "event_type": "system_access",
                "user_id": "user_789",
                "action": "admin_login",
                "details": {
                    "system": "financial_reporting",
                    "ip_address": "192.168.1.100",
                    "session_duration": 3600
                }
            }
        ]
        
        # Generate audit trail
        audit_trail = compliance_capability.generate_audit_trail(
            events=business_events,
            audit_criteria={
                "include_financial": True,
                "include_data_access": True,
                "minimum_amount": 10000.00,
                "sensitive_actions": ["export_customer_data", "admin_login"]
            }
        )
        
        # Validate structure
        assert isinstance(audit_trail, AuditTrail)
        assert audit_trail.trail_entries is not None
        assert audit_trail.integrity_hash is not None
        assert audit_trail.creation_timestamp is not None
        
        # Validate trail entries
        entries = audit_trail.trail_entries
        assert len(entries) == 3  # All events should be included
        
        # Validate entry structure
        for entry in entries:
            assert "event_id" in entry
            assert "timestamp" in entry
            assert "event_hash" in entry
            assert "compliance_tags" in entry
        
        # Validate compliance tagging
        financial_entry = next(e for e in entries if e["event_id"] == "evt_001")
        assert "sox_relevant" in financial_entry["compliance_tags"]
        assert "financial_control" in financial_entry["compliance_tags"]
        
        data_access_entry = next(e for e in entries if e["event_id"] == "evt_002")
        assert "gdpr_relevant" in data_access_entry["compliance_tags"]
        assert "data_protection" in data_access_entry["compliance_tags"]
        
        # Validate integrity hash
        assert audit_trail.integrity_hash is not None
        assert len(audit_trail.integrity_hash) > 0
    
    def test_control_effectiveness_assessment(self, compliance_capability, sample_control_environment):
        """Test control effectiveness assessment"""
        
        # Control test results
        test_results = {
            "ELC_001": {"test_result": "effective", "exceptions": 0, "sample_size": 25},
            "ELC_002": {"test_result": "needs_improvement", "exceptions": 3, "sample_size": 20},
            "PLC_001": {"test_result": "effective", "exceptions": 1, "sample_size": 50},
            "PLC_002": {"test_result": "effective", "exceptions": 0, "sample_size": 100},
            "ITGC_001": {"test_result": "effective", "exceptions": 2, "sample_size": 75},
            "ITGC_002": {"test_result": "partially_effective", "exceptions": 8, "sample_size": 40}
        }
        
        # Assess control effectiveness
        effectiveness_assessment = compliance_capability.assess_control_effectiveness(
            control_environment=sample_control_environment,
            test_results=test_results
        )
        
        # Validate structure
        assert isinstance(effectiveness_assessment, ControlAssessment)
        assert effectiveness_assessment.overall_effectiveness is not None
        assert effectiveness_assessment.category_effectiveness is not None
        assert effectiveness_assessment.control_deficiencies is not None
        assert effectiveness_assessment.remediation_priorities is not None
        
        # Validate overall effectiveness calculation
        overall_effectiveness = effectiveness_assessment.overall_effectiveness
        assert 0 <= overall_effectiveness <= 1.0
        
        # Calculate expected effectiveness based on test results
        effective_controls = 0
        total_controls = 0
        
        for category_data in sample_control_environment["control_categories"].values():
            for control in category_data["controls"]:
                total_controls += 1
                control_id = control["control_id"]
                test_result = test_results[control_id]["test_result"]
                if test_result == "effective":
                    effective_controls += 1
                elif test_result == "partially_effective":
                    effective_controls += 0.5
        
        expected_effectiveness = effective_controls / total_controls
        
        # Validate effectiveness accuracy
        compliance_validator = ComplianceValidator()
        assert compliance_validator.validate_control_effectiveness(
            overall_effectiveness, expected_effectiveness, tolerance=0.1
        )
        
        # Validate category effectiveness
        category_effectiveness = effectiveness_assessment.category_effectiveness
        assert "entity_level" in category_effectiveness
        assert "process_level" in category_effectiveness
        assert "it_general" in category_effectiveness
        
        # Process level should have highest effectiveness (all controls effective)
        assert category_effectiveness["process_level"] >= category_effectiveness["entity_level"]
        assert category_effectiveness["process_level"] >= category_effectiveness["it_general"]
        
        # Validate deficiencies identification
        deficiencies = effectiveness_assessment.control_deficiencies
        assert len(deficiencies) > 0
        
        # Should identify ELC_002 and ITGC_002 as deficiencies
        deficiency_ids = [d["control_id"] for d in deficiencies]
        assert "ELC_002" in deficiency_ids
        assert "ITGC_002" in deficiency_ids
    
    def test_risk_based_monitoring(self, compliance_capability, sample_regulatory_requirements):
        """Test risk-based compliance monitoring"""
        
        # Risk factors for each requirement
        risk_factors = {
            "SOX_404": {
                "inherent_risk": 0.8,
                "control_risk": 0.3,
                "detection_risk": 0.2,
                "business_impact": 0.9,
                "regulatory_focus": 0.7
            },
            "GDPR_Art_32": {
                "inherent_risk": 0.7,
                "control_risk": 0.2,
                "detection_risk": 0.1,
                "business_impact": 0.8,
                "regulatory_focus": 0.9
            },
            "Basel_III_Pillar_1": {
                "inherent_risk": 0.9,
                "control_risk": 0.6,
                "detection_risk": 0.3,
                "business_impact": 1.0,
                "regulatory_focus": 0.8
            }
        }
        
        # Perform risk-based monitoring
        monitoring_plan = compliance_capability.create_risk_based_monitoring_plan(
            regulatory_requirements=sample_regulatory_requirements,
            risk_factors=risk_factors
        )
        
        # Validate structure
        assert "monitoring_priorities" in monitoring_plan
        assert "testing_frequency" in monitoring_plan
        assert "resource_allocation" in monitoring_plan
        assert "escalation_triggers" in monitoring_plan
        
        # Validate monitoring priorities
        priorities = monitoring_plan["monitoring_priorities"]
        assert len(priorities) == 3
        
        # Calculate expected risk scores
        for priority in priorities:
            regulation_id = priority["regulation_id"]
            risk_data = risk_factors[regulation_id]
            
            # Combined risk score calculation
            expected_risk = (
                risk_data["inherent_risk"] * 0.3 +
                risk_data["control_risk"] * 0.2 +
                risk_data["business_impact"] * 0.3 +
                risk_data["regulatory_focus"] * 0.2
            )
            
            actual_risk = priority["risk_score"]
            
            # Validate risk score accuracy
            compliance_validator = ComplianceValidator()
            assert compliance_validator.validate_risk_score(
                actual_risk, expected_risk, tolerance=0.05
            )
        
        # Basel III should have highest priority (highest combined risk)
        basel_priority = next(p for p in priorities if p["regulation_id"] == "Basel_III_Pillar_1")
        gdpr_priority = next(p for p in priorities if p["regulation_id"] == "GDPR_Art_32")
        
        assert basel_priority["risk_score"] >= gdpr_priority["risk_score"]
        
        # Validate testing frequency
        testing_freq = monitoring_plan["testing_frequency"]
        for freq in testing_freq:
            assert "regulation_id" in freq
            assert "frequency" in freq
            assert freq["frequency"] in ["monthly", "quarterly", "semi_annual", "annual"]
    
    def test_compliance_reporting(self, compliance_capability):
        """Test compliance reporting functionality"""
        
        # Compliance data for reporting
        compliance_data = {
            "assessment_period": {
                "start_date": "2024-01-01",
                "end_date": "2024-03-31"
            },
            "compliance_metrics": {
                "overall_compliance_score": 0.87,
                "framework_scores": {
                    "sox": 0.92,
                    "gdpr": 0.95,
                    "basel_iii": 0.74
                },
                "control_effectiveness": 0.89,
                "policy_compliance": 0.91
            },
            "key_findings": [
                {
                    "finding_id": "F001",
                    "severity": "medium",
                    "description": "Incomplete documentation for IT change management",
                    "framework": "sox",
                    "status": "open"
                },
                {
                    "finding_id": "F002",
                    "severity": "high", 
                    "description": "Capital calculation methodology needs enhancement",
                    "framework": "basel_iii",
                    "status": "in_progress"
                }
            ],
            "remediation_status": {
                "total_findings": 15,
                "closed_findings": 8,
                "in_progress": 5,
                "overdue": 2
            }
        }
        
        # Generate compliance report
        compliance_report = compliance_capability.generate_compliance_report(
            compliance_data=compliance_data,
            report_type="executive_summary"
        )
        
        # Validate structure
        assert "executive_summary" in compliance_report
        assert "compliance_scorecard" in compliance_report
        assert "key_metrics" in compliance_report
        assert "findings_summary" in compliance_report
        assert "remediation_status" in compliance_report
        assert "recommendations" in compliance_report
        
        # Validate executive summary
        exec_summary = compliance_report["executive_summary"]
        assert "overall_assessment" in exec_summary
        assert "key_achievements" in exec_summary
        assert "areas_for_improvement" in exec_summary
        
        # Validate scorecard
        scorecard = compliance_report["compliance_scorecard"]
        assert scorecard["overall_score"] == 0.87
        assert "framework_breakdown" in scorecard
        assert "trend_analysis" in scorecard
        
        # Validate findings summary
        findings_summary = compliance_report["findings_summary"]
        assert "total_findings" in findings_summary
        assert "severity_breakdown" in findings_summary
        assert "framework_breakdown" in findings_summary
        
        # Should categorize findings by severity
        severity_breakdown = findings_summary["severity_breakdown"]
        assert "high" in severity_breakdown
        assert "medium" in severity_breakdown
        assert severity_breakdown["high"] == 1
        assert severity_breakdown["medium"] == 1
    
    def test_data_privacy_compliance(self, compliance_capability):
        """Test data privacy compliance validation"""
        
        # Data processing activities
        processing_activities = [
            {
                "activity_id": "DPA_001",
                "purpose": "customer_relationship_management",
                "data_categories": ["contact_information", "transaction_history"],
                "legal_basis": "contract",
                "retention_period": 7,  # years
                "international_transfers": True,
                "adequacy_decision": False,
                "safeguards": ["standard_contractual_clauses"]
            },
            {
                "activity_id": "DPA_002",
                "purpose": "marketing_communications",
                "data_categories": ["contact_information", "preferences"],
                "legal_basis": "consent",
                "retention_period": 3,
                "international_transfers": False,
                "consent_rate": 0.85
            }
        ]
        
        # Validate data privacy compliance
        privacy_assessment = compliance_capability.assess_data_privacy_compliance(
            processing_activities=processing_activities,
            framework="gdpr"
        )
        
        # Validate structure
        assert "privacy_score" in privacy_assessment
        assert "lawfulness_assessment" in privacy_assessment
        assert "data_subject_rights" in privacy_assessment
        assert "international_transfers" in privacy_assessment
        assert "consent_management" in privacy_assessment
        
        # Validate lawfulness assessment
        lawfulness = privacy_assessment["lawfulness_assessment"]
        assert len(lawfulness) == 2
        
        for assessment in lawfulness:
            assert "activity_id" in assessment
            assert "legal_basis_valid" in assessment
            assert "documentation_complete" in assessment
        
        # Contract-based processing should be valid
        crm_assessment = next(a for a in lawfulness if a["activity_id"] == "DPA_001")
        assert crm_assessment["legal_basis_valid"] is True
        
        # Validate international transfers assessment
        transfer_assessment = privacy_assessment["international_transfers"]
        assert "requires_safeguards" in transfer_assessment
        assert "adequacy_gaps" in transfer_assessment
        
        # Should identify need for safeguards
        assert transfer_assessment["requires_safeguards"] is True
        
        # Validate consent management
        consent_mgmt = privacy_assessment["consent_management"]
        assert "consent_rate" in consent_mgmt
        assert "withdrawal_mechanism" in consent_mgmt
        
        # Should track consent rate for marketing activity
        assert consent_mgmt["consent_rate"] == 0.85
    
    @pytest.mark.performance
    def test_compliance_assessment_performance(self, compliance_capability, sample_regulatory_requirements):
        """Test performance of compliance assessment"""
        import time
        
        # Mock compliance status
        compliance_status = {
            req["regulation_id"]: {
                "implementation_status": "implemented",
                "last_assessment": "2024-01-01",
                "findings": [],
                "remediation_status": "complete"
            }
            for req in sample_regulatory_requirements
        }
        
        # Measure assessment performance
        start_time = time.time()
        
        result = compliance_capability.assess_regulatory_compliance(
            regulatory_requirements=sample_regulatory_requirements,
            current_status=compliance_status
        )
        
        end_time = time.time()
        assessment_time = end_time - start_time
        
        # Should complete within performance threshold
        threshold = TEST_CONFIG["performance_thresholds"]["compliance_assessment_time"]
        assert assessment_time < threshold, f"Compliance assessment too slow: {assessment_time:.2f}s"
    
    def test_error_handling(self, compliance_capability):
        """Test error handling for invalid compliance data"""
        
        # Test with missing regulation ID
        invalid_requirements = [
            {
                "framework": "sox",
                "title": "Test Requirement"
                # Missing regulation_id
            }
        ]
        
        with pytest.raises(ValueError, match="Missing regulation_id"):
            compliance_capability.validate_regulatory_requirements(invalid_requirements)
        
        # Test with invalid compliance status
        invalid_status = {
            "REQ_001": {
                "implementation_status": "invalid_status"  # Invalid status
            }
        }
        
        with pytest.raises(ValueError, match="Invalid implementation status"):
            compliance_capability.validate_compliance_status(invalid_status)
        
        # Test with future effective dates
        invalid_policy = {
            "policy_id": "POL_001",
            "effective_date": "2025-12-31",  # Future date
            "review_date": "2024-12-31"      # Before effective date
        }
        
        with pytest.raises(ValueError, match="Review date cannot be before effective date"):
            compliance_capability.validate_policy_dates(invalid_policy)
    
    def test_integration_with_risk_management(self, compliance_capability):
        """Test integration with risk management capabilities"""
        
        # Risk-compliance mapping
        risk_compliance_mapping = {
            "operational_risk": {
                "regulatory_requirements": ["SOX_404", "Basel_III_Pillar_1"],
                "control_categories": ["process_level", "it_general"],
                "risk_rating": "high"
            },
            "data_privacy_risk": {
                "regulatory_requirements": ["GDPR_Art_32", "GDPR_Art_5"],
                "control_categories": ["entity_level", "it_general"],
                "risk_rating": "medium"
            }
        }
        
        # Assess integrated risk-compliance posture
        integrated_assessment = compliance_capability.assess_risk_compliance_alignment(
            risk_mapping=risk_compliance_mapping
        )
        
        # Validate structure
        assert "alignment_score" in integrated_assessment
        assert "coverage_gaps" in integrated_assessment
        assert "control_optimization" in integrated_assessment
        
        # Validate alignment score
        alignment_score = integrated_assessment["alignment_score"]
        assert 0 <= alignment_score <= 1.0
        
        # Validate coverage analysis
        coverage_gaps = integrated_assessment["coverage_gaps"]
        assert "uncovered_risks" in coverage_gaps
        assert "regulatory_gaps" in coverage_gaps
        
        # Validate control optimization recommendations
        control_opt = integrated_assessment["control_optimization"]
        assert "redundant_controls" in control_opt
        assert "efficiency_opportunities" in control_opt
