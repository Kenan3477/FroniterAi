# Financial Operations Module Configuration

# Core module settings
MODULE_CONFIG = {
    "name": "Financial Operations Module",
    "version": "1.0.0",
    "description": "Comprehensive financial management, accounting, tax optimization, and automation",
    "author": "Frontier AI",
    "module_type": "specialized",
    "confidence_threshold": 0.7,
    "max_response_time_ms": 5000,
    "cache_results": True,
    "cache_ttl_minutes": 60
}

# Accounting system configuration
ACCOUNTING_CONFIG = {
    "default_currency": "USD",
    "fiscal_year_end": "12-31",
    "accounting_method": "accrual",  # accrual or cash
    "chart_of_accounts": {
        "auto_generate": True,
        "numbering_system": "4_digit",
        "starting_numbers": {
            "assets": 1000,
            "liabilities": 2000,
            "equity": 3000,
            "revenue": 4000,
            "expenses": 5000
        }
    },
    "supported_entities": [
        "sole_proprietorship",
        "partnership", 
        "llc",
        "s_corporation",
        "c_corporation",
        "nonprofit"
    ],
    "supported_industries": [
        "technology",
        "healthcare",
        "finance",
        "retail",
        "manufacturing",
        "services",
        "real_estate",
        "agriculture",
        "energy",
        "education"
    ]
}

# Tax optimization settings
TAX_CONFIG = {
    "current_tax_year": 2024,
    "standard_deduction": {
        "single": 14600,
        "married_filing_jointly": 29200,
        "married_filing_separately": 14600,
        "head_of_household": 21900
    },
    "corporate_tax_rate": 0.21,
    "self_employment_tax_rate": 0.1413,
    "section_179_limit": 1220000,  # 2024 limit
    "bonus_depreciation_rate": 0.80,  # 2024 rate
    "mileage_rate": 0.67,  # 2024 business mileage rate
    "meal_deduction_rate": 0.50,  # 50% deductible
    "home_office_simplified_rate": 5.00,  # $5 per square foot
    "strategy_confidence_threshold": 0.8,
    "update_frequency_days": 30  # Update tax rates monthly
}

# Financial projection settings
PROJECTION_CONFIG = {
    "default_projection_months": 36,
    "scenario_types": ["conservative", "base", "optimistic"],
    "growth_models": ["linear", "exponential", "s_curve", "seasonal"],
    "confidence_levels": {
        "conservative": 0.85,
        "base": 0.70,
        "optimistic": 0.55
    },
    "industry_benchmarks": {
        "update_frequency_days": 90,
        "data_sources": ["industry_reports", "public_filings", "survey_data"]
    },
    "seasonal_factors": {
        "retail": {
            "q1": 0.9, "q2": 1.0, "q3": 1.0, "q4": 1.4
        },
        "b2b_services": {
            "q1": 1.1, "q2": 1.0, "q3": 0.8, "q4": 1.1
        }
    }
}

# Funding strategy configuration
FUNDING_CONFIG = {
    "valuation_methods": [
        "revenue_multiple",
        "dcf", 
        "berkus_method",
        "risk_factor_summation",
        "comparable_company"
    ],
    "funding_stages": [
        "pre_seed",
        "seed", 
        "series_a",
        "series_b",
        "series_c",
        "growth",
        "ipo_ready"
    ],
    "funding_types": [
        "equity",
        "debt",
        "revenue_based",
        "grant",
        "crowdfunding"
    ],
    "due_diligence_requirements": {
        "financial_statements": ["balance_sheet", "income_statement", "cash_flow"],
        "legal_documents": ["articles_of_incorporation", "bylaws", "contracts"],
        "operational_metrics": ["kpis", "customer_data", "market_analysis"]
    },
    "investor_database": {
        "update_frequency_days": 30,
        "include_contact_info": False,
        "track_success_rates": True
    }
}

# Cash flow management settings
CASH_FLOW_CONFIG = {
    "default_forecast_days": 90,
    "minimum_cash_threshold": 10000,
    "payment_patterns": {
        "b2b_enterprise": {"avg_days": 45, "std_dev": 15},
        "b2b_smb": {"avg_days": 30, "std_dev": 10}, 
        "b2c": {"avg_days": 0, "std_dev": 5},
        "government": {"avg_days": 60, "std_dev": 20}
    },
    "collection_strategies": [
        "early_payment_discounts",
        "automated_reminders",
        "payment_plan_options",
        "factoring_services"
    ],
    "cash_shortage_alerts": {
        "warning_days": 30,
        "critical_days": 15,
        "emergency_days": 7
    }
}

# Expense management configuration
EXPENSE_CONFIG = {
    "categorization": {
        "auto_categorize": True,
        "confidence_threshold": 0.7,
        "require_approval_above": 1000,
        "require_receipt_above": 75
    },
    "supported_categories": [
        "office_expenses",
        "travel_meals", 
        "vehicle_transportation",
        "marketing_advertising",
        "professional_services",
        "utilities",
        "rent_lease",
        "insurance",
        "supplies",
        "equipment",
        "software_subscriptions",
        "payroll_benefits"
    ],
    "ocr_processing": {
        "enabled": True,
        "supported_formats": ["jpg", "jpeg", "png", "pdf"],
        "max_file_size_mb": 10,
        "confidence_threshold": 0.6
    },
    "compliance_flags": [
        "large_amount",
        "missing_receipt", 
        "missing_business_purpose",
        "round_number",
        "weekend_expense",
        "low_confidence"
    ],
    "approval_workflows": {
        "enabled": True,
        "approval_limits": {
            "employee": 500,
            "manager": 2000,
            "director": 10000
        }
    }
}

# Report generation settings
REPORTING_CONFIG = {
    "default_formats": ["json", "csv", "pdf", "excel"],
    "report_types": [
        "tax_summary",
        "monthly_analysis", 
        "compliance_review",
        "budget_variance",
        "cash_flow_analysis",
        "expense_breakdown"
    ],
    "scheduling": {
        "auto_generate": True,
        "monthly_reports": True,
        "quarterly_reports": True,
        "annual_reports": True
    },
    "distribution": {
        "email_reports": True,
        "dashboard_updates": True,
        "api_notifications": True
    }
}

# Security and compliance
SECURITY_CONFIG = {
    "data_encryption": {
        "at_rest": True,
        "in_transit": True,
        "algorithm": "AES-256"
    },
    "access_control": {
        "role_based": True,
        "multi_factor_auth": True,
        "session_timeout_minutes": 60
    },
    "audit_logging": {
        "enabled": True,
        "log_all_transactions": True,
        "retention_days": 2555  # 7 years for financial records
    },
    "compliance_standards": [
        "SOX",  # Sarbanes-Oxley
        "GAAP", # Generally Accepted Accounting Principles
        "IRS",  # Internal Revenue Service requirements
        "GDPR"  # General Data Protection Regulation
    ],
    "data_backup": {
        "frequency": "daily",
        "retention_years": 7,
        "offsite_backup": True
    }
}

# Performance and monitoring
PERFORMANCE_CONFIG = {
    "response_time_targets": {
        "accounting_setup": 2000,      # 2 seconds
        "tax_optimization": 3000,      # 3 seconds
        "financial_projections": 4000, # 4 seconds
        "expense_categorization": 500,  # 500ms
        "receipt_processing": 3000     # 3 seconds
    },
    "throughput_targets": {
        "concurrent_users": 1000,
        "transactions_per_minute": 10000,
        "reports_per_hour": 500
    },
    "monitoring": {
        "real_time_metrics": True,
        "performance_alerts": True,
        "error_tracking": True,
        "usage_analytics": True
    },
    "caching": {
        "enabled": True,
        "redis_config": {
            "host": "localhost",
            "port": 6379,
            "db": 0
        },
        "cache_policies": {
            "chart_of_accounts": 3600,    # 1 hour
            "tax_strategies": 1800,       # 30 minutes
            "industry_benchmarks": 86400   # 24 hours
        }
    }
}

# Integration settings
INTEGRATION_CONFIG = {
    "accounting_software": {
        "supported": [
            "quickbooks",
            "xero",
            "netsuite", 
            "sage",
            "freshbooks",
            "wave"
        ],
        "sync_frequency": "real_time",
        "two_way_sync": True
    },
    "banking": {
        "supported_banks": ["chase", "bank_of_america", "wells_fargo", "citi"],
        "open_banking_apis": True,
        "transaction_import": True,
        "balance_monitoring": True
    },
    "payment_processors": {
        "supported": ["stripe", "square", "paypal", "authorize_net"],
        "webhook_processing": True,
        "fee_tracking": True
    },
    "tax_software": {
        "supported": ["turbotax_business", "lacerte", "proseries"],
        "export_formats": ["json", "csv", "xml"],
        "schedule_generation": True
    }
}

# API configuration
API_CONFIG = {
    "version": "v1",
    "base_url": "/api/financial-operations",
    "rate_limiting": {
        "requests_per_minute": 1000,
        "burst_limit": 100
    },
    "authentication": {
        "method": "jwt",
        "token_expiry_hours": 24
    },
    "endpoints": {
        "chart_of_accounts": "/accounting/chart-of-accounts",
        "tax_optimization": "/tax/optimization",
        "projections": "/projections/create",
        "funding": "/funding/analyze",
        "cash_flow": "/cash-flow/forecast",
        "expenses": "/expenses/categorize",
        "reports": "/reports/generate",
        "receipts": "/receipts/process"
    },
    "webhooks": {
        "enabled": True,
        "events": [
            "expense_categorized",
            "report_generated",
            "tax_strategy_identified",
            "cash_shortage_detected"
        ]
    }
}

# Machine learning configuration
ML_CONFIG = {
    "models": {
        "expense_categorization": {
            "algorithm": "random_forest",
            "confidence_threshold": 0.7,
            "retrain_frequency_days": 30
        },
        "fraud_detection": {
            "algorithm": "isolation_forest",
            "anomaly_threshold": 0.1
        },
        "cash_flow_prediction": {
            "algorithm": "lstm",
            "lookback_days": 90,
            "forecast_days": 30
        }
    },
    "training_data": {
        "minimum_samples": 1000,
        "validation_split": 0.2,
        "test_split": 0.1
    },
    "feature_engineering": {
        "text_vectorization": "tfidf",
        "numerical_scaling": "standard",
        "categorical_encoding": "one_hot"
    }
}

# Notification settings
NOTIFICATION_CONFIG = {
    "channels": ["email", "slack", "webhook", "dashboard"],
    "triggers": {
        "cash_shortage_warning": {
            "threshold_days": 30,
            "severity": "warning"
        },
        "large_expense_detected": {
            "threshold_amount": 5000,
            "severity": "info"
        },
        "tax_deadline_approaching": {
            "days_before": 30,
            "severity": "warning"
        },
        "compliance_issue_detected": {
            "severity": "critical"
        }
    },
    "delivery_preferences": {
        "immediate": ["critical"],
        "daily_digest": ["warning", "info"],
        "weekly_summary": ["info"]
    }
}

# Default query responses for common financial questions
DEFAULT_RESPONSES = {
    "business_formation": "I can help you set up the complete financial foundation for your new business, including chart of accounts, tax optimization strategies, and financial projections.",
    
    "tax_season": "I'll analyze your business expenses and identify all available deductions to minimize your tax liability while ensuring compliance.",
    
    "funding_preparation": "I can create financial projections, valuation analysis, and funding recommendations to help you prepare for investment rounds.",
    
    "cash_flow_issues": "I'll forecast your cash flow and provide specific recommendations to optimize working capital and prevent cash shortages.",
    
    "expense_management": "I can automate expense categorization, ensure tax compliance, and generate comprehensive expense reports for better financial control."
}

# Module capabilities summary
MODULE_CAPABILITIES = {
    "accounting_system_setup": {
        "description": "Generate industry-specific chart of accounts and configure accounting systems",
        "confidence_range": [0.85, 0.95],
        "processing_time_ms": [1000, 3000]
    },
    
    "tax_optimization": {
        "description": "Analyze business structure and expenses for maximum tax efficiency", 
        "confidence_range": [0.80, 0.95],
        "processing_time_ms": [2000, 4000]
    },
    
    "financial_projections": {
        "description": "Create detailed financial models and scenario analysis",
        "confidence_range": [0.70, 0.90],
        "processing_time_ms": [3000, 5000]
    },
    
    "funding_strategy": {
        "description": "Provide funding recommendations, valuation analysis, and investor matching",
        "confidence_range": [0.75, 0.85],
        "processing_time_ms": [2000, 4000]
    },
    
    "cash_flow_management": {
        "description": "Forecast cash flow and optimize working capital management",
        "confidence_range": [0.80, 0.90],
        "processing_time_ms": [1500, 3000]
    },
    
    "expense_automation": {
        "description": "Automate expense categorization, receipt processing, and compliance tracking",
        "confidence_range": [0.85, 0.95],
        "processing_time_ms": [500, 2000]
    }
}
