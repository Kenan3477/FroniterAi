"""
Response Models and Utilities

Standardized response models, error handling, and utility functions
for consistent API responses across all endpoints.
"""

from typing import Any, Dict, List, Optional, Union, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

T = TypeVar('T')


class ResponseStatus(str, Enum):
    """Response status enumeration"""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    PARTIAL = "partial"


class APIResponse(BaseModel, Generic[T]):
    """Standardized API response model"""
    
    success: bool = Field(..., description="Whether the operation was successful")
    data: Optional[T] = Field(None, description="Response data")
    message: str = Field(..., description="Human-readable message")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Response timestamp")
    status: ResponseStatus = Field(default=ResponseStatus.SUCCESS, description="Response status")
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "success": True,
                "data": {"result": "Sample data"},
                "message": "Operation completed successfully",
                "timestamp": "2025-07-24T10:30:00Z",
                "status": "success"
            }
        }


class ErrorResponse(BaseModel):
    """Standardized error response model"""
    
    error: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    status_code: int = Field(..., description="HTTP status code")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Error timestamp")
    path: Optional[str] = Field(None, description="Request path where error occurred")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    trace_id: Optional[str] = Field(None, description="Request trace ID for debugging")
    
    class Config:
        schema_extra = {
            "example": {
                "error": "VALIDATION_ERROR",
                "message": "Invalid request parameters",
                "status_code": 400,
                "timestamp": "2025-07-24T10:30:00Z",
                "path": "/api/v1/business/financial-analysis",
                "details": {"field": "company_data", "issue": "missing required field"}
            }
        }


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response model"""
    
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_prev: bool = Field(..., description="Whether there are previous pages")
    
    class Config:
        schema_extra = {
            "example": {
                "items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}],
                "total": 100,
                "page": 1,
                "size": 20,
                "pages": 5,
                "has_next": True,
                "has_prev": False
            }
        }


# Financial Analysis Response Models
class FinancialRatios(BaseModel):
    """Financial ratios analysis result"""
    
    liquidity_ratios: Dict[str, float] = Field(..., description="Liquidity ratios")
    profitability_ratios: Dict[str, float] = Field(..., description="Profitability ratios")
    leverage_ratios: Dict[str, float] = Field(..., description="Leverage ratios")
    efficiency_ratios: Dict[str, float] = Field(..., description="Efficiency ratios")
    market_ratios: Optional[Dict[str, float]] = Field(None, description="Market ratios")


class FinancialAnalysisResponse(BaseModel):
    """Financial analysis response data"""
    
    company_name: str = Field(..., description="Company name")
    analysis_period: str = Field(..., description="Analysis period")
    financial_ratios: FinancialRatios = Field(..., description="Calculated financial ratios")
    trends: Dict[str, Any] = Field(..., description="Financial trends analysis")
    benchmark_comparison: Optional[Dict[str, Any]] = Field(None, description="Industry benchmark comparison")
    recommendations: List[str] = Field(..., description="Financial recommendations")
    risk_assessment: Dict[str, Any] = Field(..., description="Risk assessment")
    score: float = Field(..., description="Overall financial health score", ge=0, le=100)


# Strategic Planning Response Models
class SWOTAnalysis(BaseModel):
    """SWOT analysis result"""
    
    strengths: List[str] = Field(..., description="Identified strengths")
    weaknesses: List[str] = Field(..., description="Identified weaknesses")
    opportunities: List[str] = Field(..., description="Market opportunities")
    threats: List[str] = Field(..., description="Market threats")


class MarketAnalysis(BaseModel):
    """Market analysis result"""
    
    market_size: Dict[str, Any] = Field(..., description="Market size analysis")
    growth_rate: float = Field(..., description="Market growth rate")
    competitive_landscape: Dict[str, Any] = Field(..., description="Competitive analysis")
    market_trends: List[str] = Field(..., description="Key market trends")
    barriers_to_entry: List[str] = Field(..., description="Market entry barriers")


class StrategicPlanningResponse(BaseModel):
    """Strategic planning response data"""
    
    company_overview: Dict[str, Any] = Field(..., description="Company overview")
    swot_analysis: SWOTAnalysis = Field(..., description="SWOT analysis")
    market_analysis: MarketAnalysis = Field(..., description="Market analysis")
    strategic_objectives: List[str] = Field(..., description="Strategic objectives")
    action_plan: List[Dict[str, Any]] = Field(..., description="Action plan")
    timeline: Dict[str, Any] = Field(..., description="Implementation timeline")
    success_metrics: List[str] = Field(..., description="Success metrics")


# Compliance Response Models
class ComplianceRequirement(BaseModel):
    """Compliance requirement"""
    
    regulation: str = Field(..., description="Regulation name")
    requirement_id: str = Field(..., description="Requirement ID")
    description: str = Field(..., description="Requirement description")
    status: str = Field(..., description="Compliance status")
    priority: str = Field(..., description="Priority level")
    due_date: Optional[str] = Field(None, description="Due date")
    responsible_party: Optional[str] = Field(None, description="Responsible party")


class ComplianceAssessment(BaseModel):
    """Compliance assessment result"""
    
    overall_score: float = Field(..., description="Overall compliance score", ge=0, le=100)
    requirements: List[ComplianceRequirement] = Field(..., description="Compliance requirements")
    gaps: List[str] = Field(..., description="Identified compliance gaps")
    recommendations: List[str] = Field(..., description="Compliance recommendations")
    action_items: List[Dict[str, Any]] = Field(..., description="Action items")


class ComplianceResponse(BaseModel):
    """Compliance check response data"""
    
    organization: str = Field(..., description="Organization name")
    industry: str = Field(..., description="Industry type")
    regulations: List[str] = Field(..., description="Applicable regulations")
    assessment: ComplianceAssessment = Field(..., description="Compliance assessment")
    documentation: List[str] = Field(..., description="Required documentation")
    next_review_date: str = Field(..., description="Next review date")


# Risk Assessment Response Models
class RiskFactor(BaseModel):
    """Individual risk factor"""
    
    name: str = Field(..., description="Risk factor name")
    category: str = Field(..., description="Risk category")
    probability: float = Field(..., description="Probability of occurrence", ge=0, le=1)
    impact: float = Field(..., description="Impact severity", ge=0, le=10)
    risk_score: float = Field(..., description="Calculated risk score")
    mitigation_strategies: List[str] = Field(..., description="Mitigation strategies")


class RiskAssessmentResponse(BaseModel):
    """Risk assessment response data"""
    
    assessment_date: str = Field(..., description="Assessment date")
    overall_risk_score: float = Field(..., description="Overall risk score", ge=0, le=100)
    risk_level: str = Field(..., description="Risk level classification")
    risk_factors: List[RiskFactor] = Field(..., description="Individual risk factors")
    recommendations: List[str] = Field(..., description="Risk mitigation recommendations")
    monitoring_plan: Dict[str, Any] = Field(..., description="Risk monitoring plan")


# Market Analysis Response Models
class MarketMetrics(BaseModel):
    """Market metrics and indicators"""
    
    price: float = Field(..., description="Current price")
    change: float = Field(..., description="Price change")
    change_percent: float = Field(..., description="Percentage change")
    volume: Optional[float] = Field(None, description="Trading volume")
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    volatility: float = Field(..., description="Volatility measure")


class SentimentAnalysis(BaseModel):
    """Sentiment analysis result"""
    
    overall_sentiment: str = Field(..., description="Overall sentiment")
    sentiment_score: float = Field(..., description="Sentiment score", ge=-1, le=1)
    confidence: float = Field(..., description="Confidence level", ge=0, le=1)
    key_themes: List[str] = Field(..., description="Key sentiment themes")
    sources: List[str] = Field(..., description="Data sources")


class MarketAnalysisResponse(BaseModel):
    """Market analysis response data"""
    
    asset: str = Field(..., description="Asset or instrument")
    timestamp: str = Field(..., description="Analysis timestamp")
    metrics: MarketMetrics = Field(..., description="Market metrics")
    sentiment: SentimentAnalysis = Field(..., description="Sentiment analysis")
    technical_indicators: Dict[str, float] = Field(..., description="Technical indicators")
    predictions: Dict[str, Any] = Field(..., description="Market predictions")
    risk_factors: List[str] = Field(..., description="Risk factors")


# AI Reasoning Response Models
class ReasoningStep(BaseModel):
    """Individual reasoning step"""
    
    step_number: int = Field(..., description="Step number")
    description: str = Field(..., description="Step description")
    rationale: str = Field(..., description="Reasoning rationale")
    confidence: float = Field(..., description="Confidence level", ge=0, le=1)
    supporting_data: Optional[Dict[str, Any]] = Field(None, description="Supporting data")


class AIReasoningResponse(BaseModel):
    """AI reasoning response data"""
    
    query: str = Field(..., description="Original query")
    conclusion: str = Field(..., description="Final conclusion")
    confidence: float = Field(..., description="Overall confidence", ge=0, le=1)
    reasoning_steps: List[ReasoningStep] = Field(..., description="Reasoning steps")
    assumptions: List[str] = Field(..., description="Key assumptions")
    limitations: List[str] = Field(..., description="Analysis limitations")
    recommendations: List[str] = Field(..., description="Recommendations")


# Utility Response Models
class ValidationError(BaseModel):
    """Validation error detail"""
    
    field: str = Field(..., description="Field name")
    message: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code")


class HealthStatus(BaseModel):
    """API health status"""
    
    status: str = Field(..., description="Health status")
    timestamp: str = Field(..., description="Check timestamp")
    uptime_seconds: float = Field(..., description="Uptime in seconds")
    version: str = Field(..., description="API version")
    components: Dict[str, str] = Field(..., description="Component statuses")


class MetricsData(BaseModel):
    """API metrics data"""
    
    total_requests: int = Field(..., description="Total requests")
    error_count: int = Field(..., description="Error count")
    success_rate: float = Field(..., description="Success rate")
    average_response_time: float = Field(..., description="Average response time")
    active_connections: int = Field(..., description="Active connections")


# Request Models
class PaginationParams(BaseModel):
    """Pagination parameters"""
    
    page: int = Field(default=1, description="Page number", ge=1)
    size: int = Field(default=20, description="Page size", ge=1, le=100)


class SortParams(BaseModel):
    """Sorting parameters"""
    
    sort_by: str = Field(default="created_at", description="Field to sort by")
    sort_order: str = Field(default="desc", description="Sort order", regex="^(asc|desc)$")


class FilterParams(BaseModel):
    """Common filter parameters"""
    
    start_date: Optional[str] = Field(None, description="Start date filter")
    end_date: Optional[str] = Field(None, description="End date filter")
    category: Optional[str] = Field(None, description="Category filter")
    status: Optional[str] = Field(None, description="Status filter")


# Export all models
__all__ = [
    "APIResponse",
    "ErrorResponse", 
    "PaginatedResponse",
    "FinancialRatios",
    "FinancialAnalysisResponse",
    "SWOTAnalysis",
    "MarketAnalysis",
    "StrategicPlanningResponse",
    "ComplianceRequirement",
    "ComplianceAssessment", 
    "ComplianceResponse",
    "RiskFactor",
    "RiskAssessmentResponse",
    "MarketMetrics",
    "SentimentAnalysis",
    "MarketAnalysisResponse",
    "ReasoningStep",
    "AIReasoningResponse",
    "ValidationError",
    "HealthStatus",
    "MetricsData",
    "PaginationParams",
    "SortParams",
    "FilterParams"
]
