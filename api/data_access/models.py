"""
Data Access Layer Models

ORM model definitions for all Frontier business entities with proper
relationships, validation, and serialization capabilities.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Union
from decimal import Decimal
import json

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    Text, JSON, DECIMAL, ForeignKey, Table, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.hybrid import hybrid_property

# Base model class
Base = declarative_base()

# Association tables for many-to-many relationships
user_company_association = Table(
    'user_company_association',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id'), primary_key=True),
    Column('company_id', UUID(as_uuid=True), ForeignKey('companies.id'), primary_key=True),
    Column('role', String(50), default='member'),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

compliance_requirement_framework_association = Table(
    'compliance_requirement_framework_association',
    Base.metadata,
    Column('requirement_id', UUID(as_uuid=True), ForeignKey('compliance_requirements.id'), primary_key=True),
    Column('framework_id', UUID(as_uuid=True), ForeignKey('compliance_frameworks.id'), primary_key=True)
)

risk_category_association = Table(
    'risk_category_association', 
    Base.metadata,
    Column('risk_id', UUID(as_uuid=True), ForeignKey('risks.id'), primary_key=True),
    Column('category_id', UUID(as_uuid=True), ForeignKey('risk_categories.id'), primary_key=True)
)

class BaseModel(Base):
    """Base model with common fields and methods"""
    __abstract__ = True
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    
    # Relationships
    created_by = relationship("UserModel", foreign_keys=[created_by_id], post_update=True)
    updated_by = relationship("UserModel", foreign_keys=[updated_by_id], post_update=True)
    
    def to_dict(self, include_relationships: bool = False) -> Dict[str, Any]:
        """Convert model to dictionary"""
        result = {}
        
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            
            # Handle different data types
            if isinstance(value, datetime):
                result[column.name] = value.isoformat()
            elif isinstance(value, Decimal):
                result[column.name] = float(value)
            elif isinstance(value, uuid.UUID):
                result[column.name] = str(value)
            else:
                result[column.name] = value
        
        # Include relationships if requested
        if include_relationships:
            for relationship_name in self.__mapper__.relationships.keys():
                relationship_value = getattr(self, relationship_name)
                
                if relationship_value is not None:
                    if isinstance(relationship_value, list):
                        result[relationship_name] = [
                            item.to_dict() if hasattr(item, 'to_dict') else str(item)
                            for item in relationship_value
                        ]
                    else:
                        result[relationship_name] = (
                            relationship_value.to_dict() 
                            if hasattr(relationship_value, 'to_dict') 
                            else str(relationship_value)
                        )
        
        return result
    
    def from_dict(self, data: Dict[str, Any]) -> 'BaseModel':
        """Update model from dictionary"""
        for key, value in data.items():
            if hasattr(self, key) and key not in ['id', 'created_at']:
                setattr(self, key, value)
        
        self.updated_at = datetime.now(timezone.utc)
        self.version += 1
        return self
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(id={self.id})>"

class UserModel(BaseModel):
    """User model for authentication and authorization"""
    __tablename__ = 'users'
    
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    
    # Subscription and access control
    subscription_tier = Column(String(20), default='basic', nullable=False)
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    roles = Column(JSON, default=lambda: ['user'])
    permissions = Column(JSON, default=lambda: [])
    
    # Profile information
    profile_data = Column(JSON, default=lambda: {})
    preferences = Column(JSON, default=lambda: {})
    timezone = Column(String(50), default='UTC')
    language = Column(String(10), default='en')
    
    # Status tracking
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    
    # Relationships
    companies = relationship(
        "CompanyModel", 
        secondary=user_company_association,
        back_populates="users"
    )
    
    @validates('email')
    def validate_email(self, key, email):
        """Validate email format"""
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Invalid email format")
        return email.lower()
    
    @validates('subscription_tier')
    def validate_subscription_tier(self, key, tier):
        """Validate subscription tier"""
        valid_tiers = ['basic', 'professional', 'enterprise']
        if tier not in valid_tiers:
            raise ValueError(f"Invalid subscription tier. Must be one of: {valid_tiers}")
        return tier
    
    @hybrid_property
    def is_subscription_active(self):
        """Check if subscription is active"""
        if self.subscription_expires_at is None:
            return True
        return datetime.now(timezone.utc) < self.subscription_expires_at

class IndustryModel(BaseModel):
    """Industry classification model"""
    __tablename__ = 'industries'
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    parent_industry_id = Column(UUID(as_uuid=True), ForeignKey('industries.id'), nullable=True)
    
    # Industry metrics and benchmarks
    benchmarks = Column(JSON, default=lambda: {})
    market_data = Column(JSON, default=lambda: {})
    
    # Relationships
    parent_industry = relationship("IndustryModel", remote_side=[BaseModel.id])
    child_industries = relationship("IndustryModel", back_populates="parent_industry")
    companies = relationship("CompanyModel", back_populates="industry")

class CompanyModel(BaseModel):
    """Company model for business entities"""
    __tablename__ = 'companies'
    
    name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    legal_structure = Column(String(50), nullable=True)
    jurisdiction = Column(String(100), nullable=True)
    tax_id = Column(String(50), nullable=True)
    
    # Contact information
    address = Column(JSON, default=lambda: {})
    website = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Business information
    industry_id = Column(UUID(as_uuid=True), ForeignKey('industries.id'), nullable=True)
    description = Column(Text, nullable=True)
    business_model = Column(String(100), nullable=True)
    size = Column(String(20), nullable=True)  # startup, small, medium, large, enterprise
    founded_date = Column(DateTime(timezone=True), nullable=True)
    
    # Financial information
    fiscal_year_end = Column(String(10), nullable=True)  # MM-DD format
    base_currency = Column(String(3), default='USD')
    
    # Status and metadata
    company_data = Column(JSON, default=lambda: {})
    tags = Column(JSON, default=lambda: [])
    
    # Relationships
    industry = relationship("IndustryModel", back_populates="companies")
    users = relationship(
        "UserModel",
        secondary=user_company_association,
        back_populates="companies"
    )
    financial_statements = relationship("FinancialStatementModel", back_populates="company")
    financial_analyses = relationship("FinancialAnalysisModel", back_populates="company")
    compliance_assessments = relationship("ComplianceAssessmentModel", back_populates="company")
    risk_assessments = relationship("RiskAssessmentModel", back_populates="company")
    strategic_plans = relationship("StrategicPlanModel", back_populates="company")
    
    @validates('size')
    def validate_company_size(self, key, size):
        """Validate company size"""
        if size is not None:
            valid_sizes = ['startup', 'small', 'medium', 'large', 'enterprise']
            if size not in valid_sizes:
                raise ValueError(f"Invalid company size. Must be one of: {valid_sizes}")
        return size

class FinancialStatementModel(BaseModel):
    """Financial statement data model"""
    __tablename__ = 'financial_statements'
    
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False, index=True)
    statement_type = Column(String(50), nullable=False)  # balance_sheet, income_statement, cash_flow
    period_type = Column(String(20), nullable=False)  # annual, quarterly, monthly
    period_end_date = Column(DateTime(timezone=True), nullable=False, index=True)
    fiscal_year = Column(Integer, nullable=False, index=True)
    fiscal_quarter = Column(Integer, nullable=True)
    
    # Statement data
    statement_data = Column(JSON, nullable=False)
    currency = Column(String(3), default='USD')
    
    # Metadata
    source = Column(String(100), nullable=True)
    filing_date = Column(DateTime(timezone=True), nullable=True)
    is_audited = Column(Boolean, default=False)
    auditor_name = Column(String(255), nullable=True)
    
    # Relationships
    company = relationship("CompanyModel", back_populates="financial_statements")
    
    @validates('statement_type')
    def validate_statement_type(self, key, statement_type):
        """Validate statement type"""
        valid_types = ['balance_sheet', 'income_statement', 'cash_flow_statement']
        if statement_type not in valid_types:
            raise ValueError(f"Invalid statement type. Must be one of: {valid_types}")
        return statement_type
    
    @validates('period_type')
    def validate_period_type(self, key, period_type):
        """Validate period type"""
        valid_types = ['annual', 'quarterly', 'monthly']
        if period_type not in valid_types:
            raise ValueError(f"Invalid period type. Must be one of: {valid_types}")
        return period_type

class FinancialAnalysisModel(BaseModel):
    """Financial analysis results model"""
    __tablename__ = 'financial_analyses'
    
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False, index=True)
    analysis_type = Column(String(50), nullable=False)
    analysis_period = Column(String(50), nullable=False)
    
    # Analysis results
    financial_ratios = Column(JSON, default=lambda: {})
    score = Column(Float, nullable=True)
    grade = Column(String(10), nullable=True)
    analysis_summary = Column(Text, nullable=True)
    
    # Detailed results
    liquidity_analysis = Column(JSON, default=lambda: {})
    profitability_analysis = Column(JSON, default=lambda: {})
    efficiency_analysis = Column(JSON, default=lambda: {})
    leverage_analysis = Column(JSON, default=lambda: {})
    market_analysis = Column(JSON, default=lambda: {})
    
    # Recommendations
    recommendations = Column(JSON, default=lambda: [])
    risk_factors = Column(JSON, default=lambda: [])
    strengths = Column(JSON, default=lambda: [])
    weaknesses = Column(JSON, default=lambda: [])
    
    # Metadata
    methodology_version = Column(String(20), nullable=True)
    confidence_score = Column(Float, nullable=True)
    
    # Relationships
    company = relationship("CompanyModel", back_populates="financial_analyses")

class ComplianceFrameworkModel(BaseModel):
    """Compliance framework model"""
    __tablename__ = 'compliance_frameworks'
    
    name = Column(String(255), nullable=False, unique=True, index=True)
    short_name = Column(String(50), nullable=True)
    version = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    
    # Framework details
    framework_type = Column(String(50), nullable=False)  # regulatory, industry, internal
    jurisdiction = Column(String(100), nullable=True)
    industry_id = Column(UUID(as_uuid=True), ForeignKey('industries.id'), nullable=True)
    
    # Framework data
    framework_data = Column(JSON, default=lambda: {})
    requirements_summary = Column(JSON, default=lambda: {})
    
    # Status and dates
    effective_date = Column(DateTime(timezone=True), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    industry = relationship("IndustryModel")
    requirements = relationship(
        "ComplianceRequirementModel",
        secondary=compliance_requirement_framework_association,
        back_populates="frameworks"
    )

class ComplianceRequirementModel(BaseModel):
    """Compliance requirement model"""
    __tablename__ = 'compliance_requirements'
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    requirement_code = Column(String(100), nullable=True, index=True)
    
    # Requirement details
    category = Column(String(100), nullable=False)
    subcategory = Column(String(100), nullable=True)
    priority = Column(String(20), default='medium')  # low, medium, high, critical
    complexity = Column(String(20), default='medium')  # low, medium, high
    
    # Implementation details
    implementation_guidance = Column(Text, nullable=True)
    evidence_requirements = Column(JSON, default=lambda: [])
    testing_procedures = Column(JSON, default=lambda: [])
    
    # Metadata
    requirement_data = Column(JSON, default=lambda: {})
    
    # Relationships
    frameworks = relationship(
        "ComplianceFrameworkModel",
        secondary=compliance_requirement_framework_association,
        back_populates="requirements"
    )

class ComplianceAssessmentModel(BaseModel):
    """Compliance assessment model"""
    __tablename__ = 'compliance_assessments'
    
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False, index=True)
    assessment_name = Column(String(255), nullable=False)
    assessment_type = Column(String(50), nullable=False)
    
    # Assessment details
    scope = Column(JSON, default=lambda: {})
    methodology = Column(String(100), nullable=True)
    assessment_period_start = Column(DateTime(timezone=True), nullable=False)
    assessment_period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Results
    overall_score = Column(Float, nullable=True)
    compliance_level = Column(String(20), nullable=True)  # compliant, partially_compliant, non_compliant
    findings = Column(JSON, default=lambda: [])
    recommendations = Column(JSON, default=lambda: [])
    
    # Status
    status = Column(String(20), default='draft')  # draft, in_progress, completed, approved
    completed_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    company = relationship("CompanyModel", back_populates="compliance_assessments")
    approved_by = relationship("UserModel", foreign_keys=[approved_by_id])

class CompliancePolicyModel(BaseModel):
    """Compliance policy model"""
    __tablename__ = 'compliance_policies'
    
    title = Column(String(500), nullable=False)
    policy_code = Column(String(100), nullable=True, unique=True, index=True)
    description = Column(Text, nullable=False)
    
    # Policy details
    policy_type = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False)
    scope = Column(JSON, default=lambda: {})
    
    # Policy content
    policy_content = Column(Text, nullable=False)
    procedures = Column(JSON, default=lambda: [])
    controls = Column(JSON, default=lambda: [])
    
    # Status and approval
    status = Column(String(20), default='draft')  # draft, review, approved, active, archived
    approved_date = Column(DateTime(timezone=True), nullable=True)
    effective_date = Column(DateTime(timezone=True), nullable=True)
    review_date = Column(DateTime(timezone=True), nullable=True)
    
    # Ownership
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    owner = relationship("UserModel", foreign_keys=[owner_id])

class RiskCategoryModel(BaseModel):
    """Risk category model"""
    __tablename__ = 'risk_categories'
    
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    parent_category_id = Column(UUID(as_uuid=True), ForeignKey('risk_categories.id'), nullable=True)
    
    # Category properties
    risk_type = Column(String(50), nullable=False)  # operational, financial, strategic, compliance
    severity_weights = Column(JSON, default=lambda: {})
    
    # Relationships
    parent_category = relationship("RiskCategoryModel", remote_side=[BaseModel.id])
    child_categories = relationship("RiskCategoryModel", back_populates="parent_category")
    risks = relationship(
        "RiskModel",
        secondary=risk_category_association,
        back_populates="categories"
    )

class RiskModel(BaseModel):
    """Risk model"""
    __tablename__ = 'risks'
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    risk_code = Column(String(100), nullable=True, unique=True, index=True)
    
    # Risk assessment
    impact_level = Column(String(20), nullable=False)  # low, medium, high, critical
    probability = Column(String(20), nullable=False)  # low, medium, high
    risk_score = Column(Float, nullable=True)
    
    # Risk details
    risk_type = Column(String(50), nullable=False)
    potential_impact = Column(Text, nullable=True)
    root_causes = Column(JSON, default=lambda: [])
    triggers = Column(JSON, default=lambda: [])
    
    # Mitigation
    mitigation_strategies = Column(JSON, default=lambda: [])
    controls = Column(JSON, default=lambda: [])
    contingency_plans = Column(JSON, default=lambda: [])
    
    # Ownership and responsibility
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    owner = relationship("UserModel", foreign_keys=[owner_id])
    categories = relationship(
        "RiskCategoryModel",
        secondary=risk_category_association,
        back_populates="risks"
    )

class RiskAssessmentModel(BaseModel):
    """Risk assessment model"""
    __tablename__ = 'risk_assessments'
    
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False, index=True)
    assessment_name = Column(String(255), nullable=False)
    assessment_type = Column(String(50), nullable=False)
    
    # Assessment details
    scope = Column(JSON, default=lambda: {})
    methodology = Column(String(100), nullable=True)
    assessment_date = Column(DateTime(timezone=True), nullable=False)
    
    # Results
    overall_risk_score = Column(Float, nullable=True)
    risk_level = Column(String(20), nullable=True)  # low, medium, high, critical
    risk_appetite = Column(String(20), nullable=True)
    
    # Assessment data
    risk_inventory = Column(JSON, default=lambda: [])
    risk_matrix = Column(JSON, default=lambda: {})
    mitigation_plan = Column(JSON, default=lambda: [])
    
    # Status
    status = Column(String(20), default='draft')
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    company = relationship("CompanyModel", back_populates="risk_assessments")

class MarketDataModel(BaseModel):
    """Market data model"""
    __tablename__ = 'market_data'
    
    data_type = Column(String(50), nullable=False, index=True)
    source = Column(String(100), nullable=False)
    geography = Column(String(100), nullable=True, index=True)
    industry_id = Column(UUID(as_uuid=True), ForeignKey('industries.id'), nullable=True)
    
    # Data content
    data_date = Column(DateTime(timezone=True), nullable=False, index=True)
    data_content = Column(JSON, nullable=False)
    
    # Metadata
    collection_method = Column(String(100), nullable=True)
    confidence_level = Column(Float, nullable=True)
    data_quality_score = Column(Float, nullable=True)
    
    # Relationships
    industry = relationship("IndustryModel")

class StrategicPlanModel(BaseModel):
    """Strategic plan model"""
    __tablename__ = 'strategic_plans'
    
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False, index=True)
    plan_name = Column(String(255), nullable=False)
    plan_type = Column(String(50), nullable=False)
    
    # Plan details
    time_horizon = Column(Integer, nullable=False)  # years
    planning_period_start = Column(DateTime(timezone=True), nullable=False)
    planning_period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Strategic content
    vision = Column(Text, nullable=True)
    mission = Column(Text, nullable=True)
    objectives = Column(JSON, default=lambda: [])
    strategies = Column(JSON, default=lambda: [])
    action_plan = Column(JSON, default=lambda: [])
    
    # Analysis results
    swot_analysis = Column(JSON, default=lambda: {})
    market_analysis = Column(JSON, default=lambda: {})
    competitive_analysis = Column(JSON, default=lambda: {})
    financial_projections = Column(JSON, default=lambda: {})
    
    # Status and approval
    status = Column(String(20), default='draft')
    approved_date = Column(DateTime(timezone=True), nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    company = relationship("CompanyModel", back_populates="strategic_plans")
    approved_by = relationship("UserModel", foreign_keys=[approved_by_id])

class APIRequestModel(BaseModel):
    """API request tracking model"""
    __tablename__ = 'api_requests'
    
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, index=True)
    endpoint = Column(String(255), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    
    # Request details
    request_data = Column(JSON, nullable=True)
    response_status = Column(Integer, nullable=False)
    response_data = Column(JSON, nullable=True)
    
    # Performance metrics
    response_time_ms = Column(Integer, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    
    # Client information
    client_ip = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("UserModel")

class SystemConfigurationModel(BaseModel):
    """System configuration model"""
    __tablename__ = 'system_configurations'
    
    config_key = Column(String(255), nullable=False, unique=True, index=True)
    config_value = Column(JSON, nullable=False)
    description = Column(Text, nullable=True)
    
    # Configuration metadata
    config_type = Column(String(50), nullable=False)  # system, user, feature
    is_sensitive = Column(Boolean, default=False)
    is_required = Column(Boolean, default=False)
    
    # Validation
    validation_rules = Column(JSON, default=lambda: {})
    default_value = Column(JSON, nullable=True)
    
    # Environment and deployment
    environment = Column(String(20), default='all')  # all, development, staging, production

# Create indexes for performance
Index('idx_financial_statements_company_period', 
      FinancialStatementModel.company_id, 
      FinancialStatementModel.period_end_date)

Index('idx_compliance_assessments_company_status',
      ComplianceAssessmentModel.company_id,
      ComplianceAssessmentModel.status)

Index('idx_risk_assessments_company_date',
      RiskAssessmentModel.company_id,
      RiskAssessmentModel.assessment_date)

Index('idx_api_requests_user_endpoint_date',
      APIRequestModel.user_id,
      APIRequestModel.endpoint,
      APIRequestModel.created_at)

Index('idx_market_data_type_date_geography',
      MarketDataModel.data_type,
      MarketDataModel.data_date,
      MarketDataModel.geography)
