"""
Compliance Test Configuration

Centralized configuration for compliance testing framework including:
- Test environment settings
- Performance thresholds and benchmarks
- Regulation-specific test parameters
- Industry compliance standards
- Test data generation settings
- Mock service configurations
"""

import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

# Test Environment Configuration
TEST_ENVIRONMENT = {
    "environment": os.getenv("COMPLIANCE_TEST_ENV", "testing"),
    "debug_mode": os.getenv("DEBUG", "false").lower() == "true",
    "log_level": os.getenv("LOG_LEVEL", "INFO"),
    "test_data_path": os.getenv("TEST_DATA_PATH", "tests/data"),
    "temp_dir": os.getenv("TEMP_DIR", "/tmp/compliance_tests"),
    "database_url": os.getenv("TEST_DATABASE_URL", "sqlite:///test_compliance.db"),
    "mock_external_apis": os.getenv("MOCK_EXTERNAL_APIS", "true").lower() == "true"
}

# Performance Thresholds
PERFORMANCE_THRESHOLDS = {
    # Compliance assessment performance
    "compliance_check_time": 5.0,  # seconds
    "compliance_accuracy": 0.95,   # 95% accuracy required
    "compliance_coverage": 0.90,   # 90% coverage required
    
    # Policy generation performance
    "policy_generation_time": 10.0,  # seconds
    "policy_accuracy": 0.98,         # 98% accuracy required
    "policy_completeness": 0.95,     # 95% completeness required
    
    # Risk assessment performance
    "risk_calculation_time": 8.0,   # seconds
    "risk_accuracy": 0.93,          # 93% accuracy required
    "risk_precision": 0.90,         # 90% precision required
    
    # Regulatory scanning performance
    "regulatory_scan_time": 15.0,   # seconds
    "change_detection_accuracy": 0.96,  # 96% accuracy required
    
    # Integration performance
    "database_query_time": 2.0,     # seconds
    "api_response_time": 3.0,       # seconds
    "notification_delivery_time": 5.0,  # seconds
    
    # System performance
    "memory_usage_limit": 500,      # MB
    "cpu_usage_limit": 80,          # percentage
    "concurrent_users": 100,        # maximum concurrent users
}

# Regulation-Specific Test Parameters
REGULATION_TEST_PARAMETERS = {
    "GDPR": {
        "test_scenarios": [
            "lawful_basis_validation",
            "consent_management",
            "data_subject_rights",
            "data_protection_impact_assessment",
            "breach_notification",
            "cross_border_transfers",
            "data_minimization",
            "privacy_by_design"
        ],
        "compliance_requirements": {
            "dpo_required": True,
            "consent_granular": True,
            "breach_notification_hours": 72,
            "data_subject_response_days": 30,
            "privacy_policy_required": True,
            "legitimate_interests_assessment": True
        },
        "test_jurisdictions": ["EU", "EEA", "UK"],
        "test_data_types": ["personal_data", "special_categories", "pseudonymized"],
        "penalty_calculation": {
            "max_fine_percentage": 4,  # 4% of annual revenue
            "max_fine_amount": 20000000  # €20 million
        }
    },
    
    "CCPA": {
        "test_scenarios": [
            "consumer_rights_validation",
            "opt_out_mechanisms",
            "data_sale_disclosure",
            "privacy_policy_requirements",
            "service_provider_agreements",
            "third_party_disclosures",
            "deletion_requests",
            "non_discrimination"
        ],
        "compliance_requirements": {
            "privacy_policy_required": True,
            "opt_out_link_required": True,
            "deletion_capability": True,
            "data_portability": True,
            "response_time_days": 45,
            "verification_required": True
        },
        "test_jurisdictions": ["California"],
        "test_data_types": ["personal_information", "sensitive_personal_information"],
        "business_thresholds": {
            "annual_revenue": 25000000,  # $25 million
            "personal_info_consumers": 50000,
            "revenue_from_selling": 0.5  # 50% of revenue
        }
    },
    
    "HIPAA": {
        "test_scenarios": [
            "covered_entity_compliance",
            "business_associate_agreements",
            "minimum_necessary_rule",
            "patient_access_rights",
            "breach_notification",
            "administrative_safeguards",
            "physical_safeguards",
            "technical_safeguards"
        ],
        "compliance_requirements": {
            "privacy_officer_required": True,
            "security_officer_required": True,
            "workforce_training": True,
            "access_controls": True,
            "audit_logs": True,
            "encryption_required": True
        },
        "test_jurisdictions": ["US"],
        "test_data_types": ["phi", "electronic_phi", "de_identified"],
        "breach_thresholds": {
            "notification_individuals_days": 60,
            "notification_hhs_days": 60,
            "notification_media_threshold": 500
        }
    },
    
    "SOX": {
        "test_scenarios": [
            "internal_controls_testing",
            "financial_reporting_accuracy",
            "audit_committee_independence",
            "management_assessment",
            "auditor_independence",
            "disclosure_controls",
            "whistleblower_protection",
            "section_404_compliance"
        ],
        "compliance_requirements": {
            "ceo_certification": True,
            "cfo_certification": True,
            "internal_control_assessment": True,
            "audit_committee_required": True,
            "independent_auditor": True,
            "quarterly_reviews": True
        },
        "test_jurisdictions": ["US"],
        "test_entity_types": ["public_company", "foreign_company_us_listed"],
        "control_frameworks": ["COSO", "COBIT"]
    },
    
    "PCI_DSS": {
        "test_scenarios": [
            "cardholder_data_protection",
            "payment_card_environment",
            "vulnerability_management",
            "access_control_measures",
            "network_monitoring",
            "information_security_policy",
            "encryption_requirements",
            "penetration_testing"
        ],
        "compliance_requirements": {
            "firewall_configuration": True,
            "default_passwords_changed": True,
            "cardholder_data_protection": True,
            "data_transmission_encryption": True,
            "antivirus_software": True,
            "access_restrictions": True
        },
        "test_jurisdictions": ["Global"],
        "merchant_levels": [1, 2, 3, 4],
        "validation_requirements": {
            "level_1": "annual_assessment",
            "level_2": "annual_saq",
            "level_3": "annual_saq",
            "level_4": "annual_saq"
        }
    }
}

# Industry Compliance Standards
INDUSTRY_COMPLIANCE_STANDARDS = {
    "financial_services": {
        "primary_regulations": ["SOX", "PCI_DSS", "GDPR"],
        "additional_standards": ["ISO_27001", "NIST_Cybersecurity"],
        "risk_tolerance": "low",
        "audit_frequency": "quarterly",
        "compliance_score_threshold": 0.95,
        "mandatory_controls": [
            "data_encryption",
            "access_logging",
            "incident_response",
            "business_continuity",
            "vendor_management"
        ]
    },
    
    "healthcare": {
        "primary_regulations": ["HIPAA", "GDPR", "HITECH"],
        "additional_standards": ["ISO_27799", "NIST_800_66"],
        "risk_tolerance": "very_low",
        "audit_frequency": "monthly",
        "compliance_score_threshold": 0.98,
        "mandatory_controls": [
            "phi_protection",
            "access_controls",
            "audit_logging",
            "breach_detection",
            "employee_training"
        ]
    },
    
    "technology": {
        "primary_regulations": ["GDPR", "CCPA", "SOX"],
        "additional_standards": ["ISO_27001", "SOC_2"],
        "risk_tolerance": "medium",
        "audit_frequency": "bi_annual",
        "compliance_score_threshold": 0.90,
        "mandatory_controls": [
            "data_protection",
            "privacy_by_design",
            "security_testing",
            "incident_response"
        ]
    },
    
    "retail": {
        "primary_regulations": ["PCI_DSS", "GDPR", "CCPA"],
        "additional_standards": ["ISO_27001"],
        "risk_tolerance": "medium",
        "audit_frequency": "annual",
        "compliance_score_threshold": 0.88,
        "mandatory_controls": [
            "payment_security",
            "customer_data_protection",
            "inventory_management",
            "fraud_detection"
        ]
    },
    
    "manufacturing": {
        "primary_regulations": ["GDPR", "ISO_9001"],
        "additional_standards": ["ISO_14001", "OHSAS_18001"],
        "risk_tolerance": "medium",
        "audit_frequency": "annual",
        "compliance_score_threshold": 0.85,
        "mandatory_controls": [
            "quality_management",
            "environmental_compliance",
            "safety_protocols",
            "supplier_compliance"
        ]
    },
    
    "education": {
        "primary_regulations": ["FERPA", "COPPA", "GDPR"],
        "additional_standards": ["ISO_27001"],
        "risk_tolerance": "low",
        "audit_frequency": "annual",
        "compliance_score_threshold": 0.92,
        "mandatory_controls": [
            "student_data_protection",
            "parent_consent",
            "access_controls",
            "data_retention_policies"
        ]
    }
}

# Test Data Generation Settings
TEST_DATA_GENERATION = {
    "organization_profiles": {
        "count_per_industry": 10,
        "size_distribution": {
            "small": 0.4,    # <50 employees
            "medium": 0.35,  # 50-500 employees
            "large": 0.20,   # 500-5000 employees
            "enterprise": 0.05  # >5000 employees
        },
        "geographic_distribution": {
            "north_america": 0.40,
            "europe": 0.35,
            "asia_pacific": 0.15,
            "other": 0.10
        }
    },
    
    "compliance_scenarios": {
        "assessment_types": [
            "initial_assessment",
            "periodic_review",
            "incident_triggered",
            "regulatory_change",
            "third_party_audit"
        ],
        "complexity_levels": ["basic", "intermediate", "advanced", "comprehensive"],
        "failure_scenarios": {
            "rate": 0.20,  # 20% of tests should include failures
            "types": ["missing_controls", "inadequate_policies", "technical_gaps"]
        }
    },
    
    "risk_scenarios": {
        "risk_categories": [
            "cybersecurity",
            "operational",
            "regulatory",
            "financial",
            "reputational",
            "strategic"
        ],
        "likelihood_distribution": {
            "low": 0.30,
            "medium": 0.50,
            "high": 0.15,
            "critical": 0.05
        },
        "impact_distribution": {
            "minimal": 0.25,
            "minor": 0.35,
            "moderate": 0.25,
            "major": 0.10,
            "severe": 0.05
        }
    }
}

# Mock Service Configurations
MOCK_SERVICE_CONFIGURATIONS = {
    "regulatory_apis": {
        "gdpr_api": {
            "base_url": "https://api.gdpr-compliance.example.com",
            "response_delay": 0.5,  # seconds
            "success_rate": 0.95,
            "mock_responses": {
                "amendments": [
                    {
                        "date": "2023-01-15",
                        "description": "Data transfer guidelines update",
                        "impact": "medium"
                    }
                ]
            }
        },
        
        "ccpa_api": {
            "base_url": "https://api.ccpa-compliance.example.com",
            "response_delay": 0.3,
            "success_rate": 0.98,
            "mock_responses": {
                "updates": [
                    {
                        "date": "2023-02-10",
                        "description": "CPRA enforcement guidelines",
                        "impact": "high"
                    }
                ]
            }
        }
    },
    
    "notification_services": {
        "email_service": {
            "provider": "mock_smtp",
            "delivery_delay": 1.0,  # seconds
            "success_rate": 0.99,
            "bounce_rate": 0.02
        },
        
        "slack_service": {
            "webhook_url": "https://hooks.slack.com/mock",
            "delivery_delay": 0.5,
            "success_rate": 0.97
        },
        
        "dashboard_service": {
            "update_delay": 0.1,
            "success_rate": 0.995
        }
    },
    
    "document_services": {
        "template_engine": {
            "generation_delay": 2.0,  # seconds
            "success_rate": 0.98,
            "template_types": [
                "privacy_policy",
                "terms_of_service",
                "cookie_policy",
                "data_processing_agreement"
            ]
        },
        
        "document_storage": {
            "storage_delay": 0.5,
            "success_rate": 0.999,
            "retrieval_delay": 0.2
        }
    }
}

# Test Execution Settings
TEST_EXECUTION_SETTINGS = {
    "parallel_execution": {
        "max_workers": 4,
        "regulation_tests_parallel": True,
        "integration_tests_parallel": False,
        "performance_tests_parallel": False
    },
    
    "test_data_cleanup": {
        "cleanup_after_each_test": True,
        "preserve_test_artifacts": False,
        "cleanup_temp_files": True
    },
    
    "retry_configuration": {
        "max_retries": 3,
        "retry_delay": 1.0,  # seconds
        "retry_exponential_backoff": True,
        "retryable_failures": [
            "network_timeout",
            "temporary_service_unavailable",
            "rate_limit_exceeded"
        ]
    },
    
    "timeout_settings": {
        "default_test_timeout": 30,  # seconds
        "integration_test_timeout": 60,
        "performance_test_timeout": 120,
        "long_running_test_timeout": 300
    }
}

# Reporting Configuration
REPORTING_CONFIGURATION = {
    "test_reports": {
        "formats": ["html", "xml", "json"],
        "include_screenshots": False,
        "include_logs": True,
        "include_performance_metrics": True
    },
    
    "compliance_reports": {
        "auto_generate": True,
        "include_recommendations": True,
        "include_risk_assessment": True,
        "regulatory_mapping": True
    },
    
    "coverage_reports": {
        "minimum_coverage": 0.85,  # 85%
        "include_regulation_coverage": True,
        "include_control_coverage": True,
        "exclude_mock_code": True
    }
}

# Security Test Configuration
SECURITY_TEST_CONFIGURATION = {
    "penetration_testing": {
        "enabled": True,
        "test_authentication": True,
        "test_authorization": True,
        "test_input_validation": True,
        "test_session_management": True
    },
    
    "vulnerability_scanning": {
        "enabled": True,
        "scan_dependencies": True,
        "scan_configurations": True,
        "severity_threshold": "medium"
    },
    
    "data_protection_testing": {
        "encryption_testing": True,
        "data_masking_testing": True,
        "access_control_testing": True,
        "audit_trail_testing": True
    }
}

def get_test_config() -> Dict[str, Any]:
    """Get complete test configuration"""
    return {
        "environment": TEST_ENVIRONMENT,
        "performance_thresholds": PERFORMANCE_THRESHOLDS,
        "regulation_parameters": REGULATION_TEST_PARAMETERS,
        "industry_standards": INDUSTRY_COMPLIANCE_STANDARDS,
        "test_data_generation": TEST_DATA_GENERATION,
        "mock_services": MOCK_SERVICE_CONFIGURATIONS,
        "execution_settings": TEST_EXECUTION_SETTINGS,
        "reporting": REPORTING_CONFIGURATION,
        "security_testing": SECURITY_TEST_CONFIGURATION
    }

def get_regulation_config(regulation: str) -> Optional[Dict[str, Any]]:
    """Get configuration for specific regulation"""
    return REGULATION_TEST_PARAMETERS.get(regulation)

def get_industry_config(industry: str) -> Optional[Dict[str, Any]]:
    """Get configuration for specific industry"""
    return INDUSTRY_COMPLIANCE_STANDARDS.get(industry)

def get_performance_threshold(metric: str) -> Optional[float]:
    """Get performance threshold for specific metric"""
    return PERFORMANCE_THRESHOLDS.get(metric)
