"""
Database Schema Definitions for Frontier Business Operations

This module defines the complete database schema for all business operations
capabilities including compliance, risk management, financial analysis, and more.
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float, JSON,
    ForeignKey, Table, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

Base = declarative_base()

# Association tables for many-to-many relationships
user_roles_association = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

company_industries_association = Table(
    'company_industries',
    Base.metadata,
    Column('company_id', Integer, ForeignKey('companies.id'), primary_key=True),
    Column('industry_id', Integer, ForeignKey('industries.id'), primary_key=True)
)

policy_compliance_frameworks_association = Table(
    'policy_compliance_frameworks',
    Base.metadata,
    Column('policy_id', Integer, ForeignKey('compliance_policies.id'), primary_key=True),
    Column('framework_id', Integer, ForeignKey('compliance_frameworks.id'), primary_key=True)
)

# Core User Management
class User(Base):
    """User accounts and authentication"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50))
    last_name = Column(String(50))
    subscription_tier = Column(String(20), default='basic', nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    roles = relationship("Role", secondary=user_roles_association, back_populates="users")
    api_requests = relationship("APIRequest", back_populates="user")
    companies = relationship("Company", back_populates="owner")
    
    __table_args__ = (
        CheckConstraint('subscription_tier IN ("basic", "professional", "enterprise")', 
                       name='valid_subscription_tier'),
        Index('idx_user_email_active', 'email', 'is_active'),
    )

class Role(Base):
    """User roles and permissions"""
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    permissions = Column(JSON)  # Store permissions as JSON
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    users = relationship("User", secondary=user_roles_association, back_populates="roles")

# Company and Industry Management
class Industry(Base):
    """Industry classifications"""
    __tablename__ = 'industries'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True)  # NAICS or SIC code
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey('industries.id'))
    
    # Self-referential relationship for industry hierarchy
    children = relationship("Industry", backref=backref('parent', remote_side=[id]))
    companies = relationship("Company", secondary=company_industries_association, back_populates="industries")

class Company(Base):
    """Company profiles and information"""
    __tablename__ = 'companies'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, index=True)
    legal_name = Column(String(200))
    entity_type = Column(String(50))
    ein = Column(String(20), unique=True)
    jurisdiction = Column(String(100))
    incorporation_date = Column(DateTime)
    description = Column(Text)
    website = Column(String(255))
    headquarters_address = Column(JSON)
    employee_count = Column(Integer)
    annual_revenue = Column(Float)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="companies")
    industries = relationship("Industry", secondary=company_industries_association, back_populates="companies")
    financial_statements = relationship("FinancialStatement", back_populates="company")
    compliance_assessments = relationship("ComplianceAssessment", back_populates="company")
    risk_assessments = relationship("RiskAssessment", back_populates="company")
    
    __table_args__ = (
        Index('idx_company_name_active', 'name', 'is_active'),
        Index('idx_company_owner', 'owner_id'),
    )

# Financial Analysis Schema
class FinancialStatement(Base):
    """Financial statements and data"""
    __tablename__ = 'financial_statements'
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    statement_type = Column(String(50), nullable=False)  # balance_sheet, income_statement, cash_flow
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_quarter = Column(Integer)
    currency = Column(String(3), default='USD')
    data = Column(JSON, nullable=False)  # Raw financial data
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="financial_statements")
    analyses = relationship("FinancialAnalysis", back_populates="financial_statement")
    
    __table_args__ = (
        CheckConstraint('statement_type IN ("balance_sheet", "income_statement", "cash_flow")', 
                       name='valid_statement_type'),
        Index('idx_financial_statement_company_period', 'company_id', 'period_end'),
        UniqueConstraint('company_id', 'statement_type', 'period_end', 
                        name='unique_company_statement_period'),
    )

class FinancialAnalysis(Base):
    """Financial analysis results"""
    __tablename__ = 'financial_analyses'
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    financial_statement_id = Column(Integer, ForeignKey('financial_statements.id'))
    analysis_type = Column(String(50), nullable=False)
    analyst_id = Column(Integer, ForeignKey('users.id'))
    
    # Analysis results
    financial_ratios = Column(JSON)
    industry_benchmarks = Column(JSON)
    trend_analysis = Column(JSON)
    valuation_metrics = Column(JSON)
    risk_indicators = Column(JSON)
    overall_score = Column(Float)
    
    # Metadata
    methodology = Column(String(100))
    confidence_level = Column(Float)
    analysis_date = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    company = relationship("Company")
    financial_statement = relationship("FinancialStatement", back_populates="analyses")
    analyst = relationship("User")
    
    __table_args__ = (
        Index('idx_financial_analysis_company_date', 'company_id', 'analysis_date'),
        CheckConstraint('overall_score >= 0 AND overall_score <= 100', 
                       name='valid_score_range'),
    )

# Compliance Risk Management Schema
class ComplianceFramework(Base):
    """Regulatory and compliance frameworks"""
    __tablename__ = 'compliance_frameworks'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True)
    description = Column(Text)
    jurisdiction = Column(String(100))
    category = Column(String(50))  # regulatory, industry, internal
    version = Column(String(20))
    effective_date = Column(DateTime)
    requirements = Column(JSON)  # Framework requirements structure
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    assessments = relationship("ComplianceAssessment", back_populates="framework")
    policies = relationship("CompliancePolicy", secondary=policy_compliance_frameworks_association, 
                           back_populates="frameworks")
    
    __table_args__ = (
        CheckConstraint('category IN ("regulatory", "industry", "internal")', 
                       name='valid_framework_category'),
        Index('idx_framework_jurisdiction_active', 'jurisdiction', 'is_active'),
    )

class ComplianceRequirement(Base):
    """Individual compliance requirements"""
    __tablename__ = 'compliance_requirements'
    
    id = Column(Integer, primary_key=True)
    framework_id = Column(Integer, ForeignKey('compliance_frameworks.id'), nullable=False)
    requirement_id = Column(String(50), nullable=False)  # Framework-specific ID
    title = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    subcategory = Column(String(100))
    control_type = Column(String(50))  # preventive, detective, corrective
    priority = Column(String(20), default='medium')
    implementation_guidance = Column(Text)
    evidence_requirements = Column(JSON)
    
    # Relationships
    framework = relationship("ComplianceFramework")
    assessment_items = relationship("ComplianceAssessmentItem", back_populates="requirement")
    
    __table_args__ = (
        CheckConstraint('control_type IN ("preventive", "detective", "corrective")', 
                       name='valid_control_type'),
        CheckConstraint('priority IN ("low", "medium", "high", "critical")', 
                       name='valid_priority'),
        Index('idx_requirement_framework_category', 'framework_id', 'category'),
        UniqueConstraint('framework_id', 'requirement_id', 
                        name='unique_framework_requirement'),
    )

class ComplianceAssessment(Base):
    """Compliance assessments and audits"""
    __tablename__ = 'compliance_assessments'
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    framework_id = Column(Integer, ForeignKey('compliance_frameworks.id'), nullable=False)
    assessor_id = Column(Integer, ForeignKey('users.id'))
    
    # Assessment details
    assessment_type = Column(String(50), default='self_assessment')
    assessment_scope = Column(Text)
    assessment_date = Column(DateTime, default=func.now())
    status = Column(String(20), default='in_progress')
    
    # Results
    overall_compliance_score = Column(Float)
    compliant_requirements = Column(Integer, default=0)
    non_compliant_requirements = Column(Integer, default=0)
    partially_compliant_requirements = Column(Integer, default=0)
    not_applicable_requirements = Column(Integer, default=0)
    
    # Risk assessment
    risk_level = Column(String(20))
    critical_findings = Column(JSON)
    recommendations = Column(JSON)
    
    # Metadata
    methodology = Column(String(100))
    evidence_collected = Column(JSON)
    next_assessment_due = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="compliance_assessments")
    framework = relationship("ComplianceFramework", back_populates="assessments")
    assessor = relationship("User")
    assessment_items = relationship("ComplianceAssessmentItem", back_populates="assessment")
    
    __table_args__ = (
        CheckConstraint('assessment_type IN ("self_assessment", "internal_audit", "external_audit")', 
                       name='valid_assessment_type'),
        CheckConstraint('status IN ("draft", "in_progress", "completed", "approved")', 
                       name='valid_assessment_status'),
        CheckConstraint('risk_level IN ("low", "medium", "high", "critical")', 
                       name='valid_risk_level'),
        Index('idx_assessment_company_framework', 'company_id', 'framework_id'),
        Index('idx_assessment_date_status', 'assessment_date', 'status'),
    )

class ComplianceAssessmentItem(Base):
    """Individual assessment items for requirements"""
    __tablename__ = 'compliance_assessment_items'
    
    id = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey('compliance_assessments.id'), nullable=False)
    requirement_id = Column(Integer, ForeignKey('compliance_requirements.id'), nullable=False)
    
    # Assessment results
    compliance_status = Column(String(20), nullable=False)
    evidence_provided = Column(JSON)
    assessor_notes = Column(Text)
    risk_rating = Column(String(20))
    remediation_required = Column(Boolean, default=False)
    remediation_plan = Column(Text)
    remediation_due_date = Column(DateTime)
    
    # Metadata
    assessed_date = Column(DateTime, default=func.now())
    assessed_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    assessment = relationship("ComplianceAssessment", back_populates="assessment_items")
    requirement = relationship("ComplianceRequirement", back_populates="assessment_items")
    assessor = relationship("User")
    
    __table_args__ = (
        CheckConstraint('compliance_status IN ("compliant", "non_compliant", "partially_compliant", "not_applicable")', 
                       name='valid_compliance_status'),
        CheckConstraint('risk_rating IN ("low", "medium", "high", "critical")', 
                       name='valid_risk_rating'),
        Index('idx_assessment_item_status', 'assessment_id', 'compliance_status'),
        UniqueConstraint('assessment_id', 'requirement_id', 
                        name='unique_assessment_requirement'),
    )

class CompliancePolicy(Base):
    """Generated and managed compliance policies"""
    __tablename__ = 'compliance_policies'
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    title = Column(String(200), nullable=False)
    policy_type = Column(String(50), nullable=False)
    version = Column(String(20), default='1.0')
    
    # Policy content
    content = Column(Text, nullable=False)
    summary = Column(Text)
    scope = Column(Text)
    objectives = Column(JSON)
    procedures = Column(JSON)
    controls = Column(JSON)
    
    # Status and workflow
    status = Column(String(20), default='draft')
    approved_by = Column(Integer, ForeignKey('users.id'))
    approved_date = Column(DateTime)
    effective_date = Column(DateTime)
    review_date = Column(DateTime)
    expiry_date = Column(DateTime)
    
    # Generation metadata
    generated_by = Column(String(50))  # ai, template, manual
    template_id = Column(String(100))
    generation_parameters = Column(JSON)
    
    # Relationships
    company = relationship("Company")
    approver = relationship("User")
    frameworks = relationship("ComplianceFramework", 
                            secondary=policy_compliance_frameworks_association, 
                            back_populates="policies")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('status IN ("draft", "review", "approved", "active", "expired", "superseded")', 
                       name='valid_policy_status'),
        CheckConstraint('generated_by IN ("ai", "template", "manual")', 
                       name='valid_generation_method'),
        Index('idx_policy_company_status', 'company_id', 'status'),
        Index('idx_policy_review_date', 'review_date'),
    )

# Risk Assessment Schema
class RiskCategory(Base):
    """Risk categories and classifications"""
    __tablename__ = 'risk_categories'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey('risk_categories.id'))
    
    # Risk category attributes
    impact_factors = Column(JSON)
    likelihood_factors = Column(JSON)
    
    # Self-referential relationship
    children = relationship("RiskCategory", backref=backref('parent', remote_side=[id]))
    risks = relationship("Risk", back_populates="category")

class Risk(Base):
    """Individual risks identified"""
    __tablename__ = 'risks'
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    category_id = Column(Integer, ForeignKey('risk_categories.id'), nullable=False)
    
    # Risk details
    title = Column(String(200), nullable=False)
    description = Column(Text)
    risk_source = Column(String(100))  # internal, external, compliance, operational
    
    # Risk assessment
    inherent_likelihood = Column(Integer)  # 1-5 scale
    inherent_impact = Column(Integer)     # 1-5 scale
    inherent_risk_score = Column(Float)
    
    residual_likelihood = Column(Integer)  # After controls
    residual_impact = Column(Integer)
    residual_risk_score = Column(Float)
    
    # Risk response
    risk_appetite = Column(String(20))  # accept, mitigate, transfer, avoid
    mitigation_strategies = Column(JSON)
    
    # Status and ownership
    status = Column(String(20), default='identified')
    owner_id = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    company = relationship("Company")
    category = relationship("RiskCategory", back_populates="risks")
    owner = relationship("User")
    assessments = relationship("RiskAssessment", back_populates="risk")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('inherent_likelihood >= 1 AND inherent_likelihood <= 5', 
                       name='valid_inherent_likelihood'),
        CheckConstraint('inherent_impact >= 1 AND inherent_impact <= 5', 
                       name='valid_inherent_impact'),
        CheckConstraint('risk_appetite IN ("accept", "mitigate", "transfer", "avoid")', 
                       name='valid_risk_appetite'),
        CheckConstraint('status IN ("identified", "assessed", "mitigated", "monitored", "closed")', 
                       name='valid_risk_status'),
        Index('idx_risk_company_category', 'company_id', 'category_id'),
        Index('idx_risk_score', 'inherent_risk_score', 'residual_risk_score'),
    )

class RiskAssessment(Base):
    """Risk assessment results and history"""
    __tablename__ = 'risk_assessments'
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    risk_id = Column(Integer, ForeignKey('risks.id'))
    assessor_id = Column(Integer, ForeignKey('users.id'))
    
    # Assessment details
    assessment_date = Column(DateTime, default=func.now())
    assessment_type = Column(String(50))  # comprehensive, focused, periodic
    methodology = Column(String(100))
    
    # Assessment results
    risk_matrix = Column(JSON)
    heat_map_data = Column(JSON)
    top_risks = Column(JSON)
    risk_trends = Column(JSON)
    
    # Recommendations
    immediate_actions = Column(JSON)
    long_term_strategies = Column(JSON)
    monitoring_requirements = Column(JSON)
    
    # Overall assessment
    overall_risk_level = Column(String(20))
    risk_tolerance_alignment = Column(Boolean)
    
    # Relationships
    company = relationship("Company", back_populates="risk_assessments")
    risk = relationship("Risk", back_populates="assessments")
    assessor = relationship("User")
    
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        CheckConstraint('assessment_type IN ("comprehensive", "focused", "periodic")', 
                       name='valid_assessment_type'),
        CheckConstraint('overall_risk_level IN ("low", "medium", "high", "critical")', 
                       name='valid_overall_risk_level'),
        Index('idx_risk_assessment_company_date', 'company_id', 'assessment_date'),
    )

# Market Intelligence Schema
class MarketData(Base):
    """Market intelligence and analysis data"""
    __tablename__ = 'market_data'
    
    id = Column(Integer, primary_key=True)
    data_type = Column(String(50), nullable=False)  # market_size, trends, competitors
    industry_id = Column(Integer, ForeignKey('industries.id'))
    geography = Column(String(100))
    time_period = Column(String(50))
    
    # Data content
    data_points = Column(JSON, nullable=False)
    sources = Column(JSON)
    reliability_score = Column(Float)
    
    # Metadata
    collected_date = Column(DateTime, default=func.now())
    expiry_date = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    industry = relationship("Industry")
    
    __table_args__ = (
        CheckConstraint('data_type IN ("market_size", "trends", "competitors", "growth_rates", "demographics")', 
                       name='valid_data_type'),
        Index('idx_market_data_type_geography', 'data_type', 'geography'),
        Index('idx_market_data_industry_period', 'industry_id', 'time_period'),
    )

# Strategic Planning Schema
class StrategicPlan(Base):
    """Strategic planning documents and analysis"""
    __tablename__ = 'strategic_plans'
    
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    plan_name = Column(String(200), nullable=False)
    plan_type = Column(String(50))  # annual, multi_year, project_specific
    time_horizon = Column(Integer)  # Years
    
    # Strategic analysis
    swot_analysis = Column(JSON)
    market_analysis = Column(JSON)
    competitive_analysis = Column(JSON)
    financial_projections = Column(JSON)
    
    # Strategic elements
    vision = Column(Text)
    mission = Column(Text)
    objectives = Column(JSON)
    strategies = Column(JSON)
    action_plans = Column(JSON)
    kpis = Column(JSON)
    
    # Status and approval
    status = Column(String(20), default='draft')
    approved_by = Column(Integer, ForeignKey('users.id'))
    approved_date = Column(DateTime)
    
    # Relationships
    company = relationship("Company")
    approver = relationship("User")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint('plan_type IN ("annual", "multi_year", "project_specific")', 
                       name='valid_plan_type'),
        CheckConstraint('status IN ("draft", "review", "approved", "active", "completed", "archived")', 
                       name='valid_plan_status'),
        Index('idx_strategic_plan_company_status', 'company_id', 'status'),
    )

# API Usage and Monitoring Schema
class APIRequest(Base):
    """API request logging and monitoring"""
    __tablename__ = 'api_requests'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    
    # Request details
    endpoint = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False)
    request_ip = Column(String(45))
    user_agent = Column(String(500))
    
    # Timing and performance
    request_timestamp = Column(DateTime, default=func.now(), nullable=False)
    response_time_ms = Column(Integer)
    
    # Response details
    status_code = Column(Integer)
    response_size_bytes = Column(Integer)
    
    # Rate limiting
    rate_limit_key = Column(String(100))
    rate_limit_remaining = Column(Integer)
    
    # Error tracking
    error_type = Column(String(100))
    error_message = Column(Text)
    
    # Relationships
    user = relationship("User", back_populates="api_requests")
    
    __table_args__ = (
        Index('idx_api_request_user_timestamp', 'user_id', 'request_timestamp'),
        Index('idx_api_request_endpoint_status', 'endpoint', 'status_code'),
        Index('idx_api_request_timestamp', 'request_timestamp'),
    )

# System Configuration and Settings
class SystemConfiguration(Base):
    """System-wide configuration settings"""
    __tablename__ = 'system_configurations'
    
    id = Column(Integer, primary_key=True)
    category = Column(String(50), nullable=False)
    key = Column(String(100), nullable=False)
    value = Column(JSON)
    description = Column(Text)
    is_sensitive = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('category', 'key', name='unique_config_key'),
        Index('idx_config_category', 'category'),
    )

# Database versioning and migrations
class DatabaseMigration(Base):
    """Database migration tracking"""
    __tablename__ = 'database_migrations'
    
    id = Column(Integer, primary_key=True)
    migration_id = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    version = Column(String(20), nullable=False)
    applied_at = Column(DateTime, default=func.now())
    applied_by = Column(String(100))
    execution_time_ms = Column(Integer)
    rollback_sql = Column(Text)
    
    __table_args__ = (
        Index('idx_migration_version', 'version'),
        Index('idx_migration_applied_at', 'applied_at'),
    )
