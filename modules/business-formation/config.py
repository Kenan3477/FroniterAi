"""
Configuration for Business Formation Module
"""

# Module metadata
MODULE_CONFIG = {
    "name": "Business Formation Expert",
    "version": "1.0.0",
    "description": "Comprehensive business entity formation with jurisdiction-specific workflows",
    "author": "Frontier AI System",
    "dependencies": [
        "aiohttp>=3.8.0",
        "jinja2>=3.1.0",
        "pydantic>=1.10.0",
        "python-dateutil>=2.8.0",
        "PyYAML>=6.0",
        "certifi>=2022.0.0"
    ]
}

# Supported jurisdictions and their capabilities
JURISDICTION_CONFIG = {
    "supported_jurisdictions": [
        "US_AL", "US_AK", "US_AZ", "US_AR", "US_CA", "US_CO", "US_CT", "US_DE", 
        "US_FL", "US_GA", "US_HI", "US_ID", "US_IL", "US_IN", "US_IA", "US_KS",
        "US_KY", "US_LA", "US_ME", "US_MD", "US_MA", "US_MI", "US_MN", "US_MS",
        "US_MO", "US_MT", "US_NE", "US_NV", "US_NH", "US_NJ", "US_NM", "US_NY",
        "US_NC", "US_ND", "US_OH", "US_OK", "US_OR", "US_PA", "US_RI", "US_SC",
        "US_SD", "US_TN", "US_TX", "US_UT", "US_VT", "US_VA", "US_WA", "US_WV",
        "US_WI", "US_WY", "US_DC", "CA", "UK", "DE", "FR", "SG", "HK", "AU", "NZ"
    ],
    "api_enabled_jurisdictions": [
        "US_DE", "US_CA", "US_NV", "US_NY", "US_TX", "US_FL"
    ],
    "popular_jurisdictions": [
        "US_DE", "US_NV", "US_WY", "US_CA", "US_TX", "US_FL", "US_NY"
    ]
}

# Entity type configuration
ENTITY_CONFIG = {
    "supported_entity_types": [
        "llc", "corporation", "s_corporation", "partnership", 
        "limited_partnership", "sole_proprietorship", "nonprofit",
        "benefit_corporation", "cooperative", "professional_corporation", "series_llc"
    ],
    "popular_entity_types": ["llc", "corporation", "s_corporation"],
    "entity_complexity": {
        "sole_proprietorship": 1,
        "partnership": 2,
        "llc": 3,
        "s_corporation": 4,
        "corporation": 5,
        "nonprofit": 5,
        "benefit_corporation": 5
    }
}

# API configuration
API_CONFIG = {
    "rate_limits": {
        "name_checks_per_hour": 100,
        "filings_per_day": 10,
        "document_generations_per_hour": 50
    },
    "timeouts": {
        "name_check": 30,
        "filing_submission": 120,
        "document_generation": 60
    },
    "retry_policy": {
        "max_retries": 3,
        "backoff_factor": 2,
        "retry_statuses": [429, 500, 502, 503, 504]
    }
}

# Document templates configuration
DOCUMENT_CONFIG = {
    "template_directory": "templates",
    "output_formats": ["pdf", "html", "docx"],
    "default_format": "pdf",
    "template_cache_size": 100,
    "generation_timeout": 60
}

# Compliance configuration
COMPLIANCE_CONFIG = {
    "default_reminder_frequency": "monthly",
    "reminder_lead_times": {
        "critical": [60, 30, 14, 7, 3, 1],
        "high": [30, 14, 7, 1],
        "medium": [30, 7],
        "low": [30]
    },
    "calendar_export_formats": ["json", "csv", "ical"],
    "auto_compliance_tracking": True
}

# Security configuration
SECURITY_CONFIG = {
    "encrypt_sensitive_data": True,
    "secure_document_storage": True,
    "api_key_rotation_days": 90,
    "session_timeout_minutes": 30,
    "audit_logging": True
}

# Performance configuration
PERFORMANCE_CONFIG = {
    "cache_questionnaires": True,
    "cache_jurisdiction_data": True,
    "cache_ttl_seconds": 3600,
    "max_concurrent_filings": 5,
    "max_document_size_mb": 10
}

# Notification configuration
NOTIFICATION_CONFIG = {
    "email_notifications": {
        "enabled": True,
        "templates": {
            "formation_complete": "formation_complete.html",
            "compliance_reminder": "compliance_reminder.html",
            "filing_status_update": "filing_status_update.html"
        }
    },
    "sms_notifications": {
        "enabled": False,
        "critical_only": True
    },
    "dashboard_notifications": {
        "enabled": True,
        "real_time": True
    }
}

# Integration configuration
INTEGRATION_CONFIG = {
    "orchestration_module": True,
    "frontier_core_integration": True,
    "external_apis": {
        "irs_ein_service": False,  # No public API available
        "credit_monitoring": False,
        "banking_partnerships": False
    }
}

# Development configuration
DEV_CONFIG = {
    "mock_government_apis": True,
    "enable_debug_logging": True,
    "test_data_generation": True,
    "sandbox_mode": True
}

# Production configuration
PROD_CONFIG = {
    "mock_government_apis": False,
    "enable_debug_logging": False,
    "test_data_generation": False,
    "sandbox_mode": False,
    "ssl_verification": True,
    "secure_storage": True
}

# Module capabilities for orchestration
MODULE_CAPABILITIES = {
    "query_types": [
        "business_formation_start",
        "entity_type_selection",
        "jurisdiction_analysis",
        "name_availability_check",
        "document_generation",
        "filing_assistance", 
        "compliance_calendar",
        "formation_status",
        "cost_estimation",
        "timeline_estimation"
    ],
    "confidence_keywords": [
        # Formation keywords
        "form", "create", "start", "establish", "incorporate", "organize",
        # Entity keywords  
        "llc", "corporation", "company", "business", "entity", "corp",
        # Legal keywords
        "legal", "documents", "filing", "paperwork", "articles", "certificate",
        # Jurisdiction keywords
        "state", "delaware", "nevada", "california", "jurisdiction",
        # Process keywords
        "compliance", "requirements", "deadlines", "calendar", "ein"
    ],
    "response_types": [
        "questionnaire",
        "information_response", 
        "document_package",
        "status_update",
        "compliance_calendar",
        "cost_breakdown",
        "next_steps"
    ]
}

# Error handling configuration
ERROR_CONFIG = {
    "retry_failed_api_calls": True,
    "fallback_to_manual_process": True,
    "error_notification_threshold": 5,
    "auto_escalation": True,
    "user_friendly_errors": True
}

# Monitoring and analytics
MONITORING_CONFIG = {
    "track_formation_metrics": True,
    "track_api_performance": True,
    "track_user_satisfaction": True,
    "performance_alerts": True,
    "usage_analytics": True,
    "success_rate_monitoring": True
}

# Data retention policy
DATA_RETENTION_CONFIG = {
    "formation_data_retention_years": 7,
    "document_retention_years": 10,
    "api_logs_retention_days": 90,
    "user_session_data_hours": 24,
    "compliance_calendar_retention_years": 5
}

# Module initialization settings
INIT_CONFIG = {
    "auto_load_jurisdiction_data": True,
    "preload_common_templates": True,
    "validate_api_connections": True,
    "initialize_compliance_tracker": True,
    "setup_document_generator": True
}

# Export all configurations
__all__ = [
    "MODULE_CONFIG",
    "JURISDICTION_CONFIG", 
    "ENTITY_CONFIG",
    "API_CONFIG",
    "DOCUMENT_CONFIG",
    "COMPLIANCE_CONFIG",
    "SECURITY_CONFIG",
    "PERFORMANCE_CONFIG",
    "NOTIFICATION_CONFIG",
    "INTEGRATION_CONFIG",
    "DEV_CONFIG",
    "PROD_CONFIG",
    "MODULE_CAPABILITIES",
    "ERROR_CONFIG",
    "MONITORING_CONFIG",
    "DATA_RETENTION_CONFIG",
    "INIT_CONFIG"
]
