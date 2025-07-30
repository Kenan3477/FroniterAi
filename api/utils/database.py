"""
Database Utilities

Database connection management, ORM models, and utility functions
for data persistence across the API.
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List, AsyncGenerator
from datetime import datetime
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey

from ..config import settings

logger = logging.getLogger(__name__)

# Create base class for ORM models
Base = declarative_base()

# Database engine and session
engine = None
async_session_maker = None


class DatabaseManager:
    """Database connection and session management"""
    
    def __init__(self):
        self.engine = None
        self.session_maker = None
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize database connection"""
        
        try:
            # Create database directory if using SQLite
            if settings.DATABASE_URL.startswith("sqlite"):
                db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
                Path(db_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Create async engine
            self.engine = create_async_engine(
                settings.DATABASE_URL,
                echo=settings.DATABASE_ECHO,
                pool_pre_ping=True,
                pool_recycle=3600
            )
            
            # Create session maker
            self.session_maker = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Create tables
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            self.is_initialized = True
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    async def get_session(self) -> AsyncSession:
        """Get database session"""
        
        if not self.is_initialized:
            await self.initialize()
        
        return self.session_maker()
    
    async def close(self):
        """Close database connections"""
        
        if self.engine:
            await self.engine.dispose()
            logger.info("Database connections closed")


# Global database manager
db_manager = DatabaseManager()


# ORM Models
class APIUser(Base):
    """API User model"""
    
    __tablename__ = "api_users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    subscription_tier = Column(String(20), default="free", nullable=False)
    roles = Column(JSON, default=list)
    is_active = Column(Boolean, default=True, nullable=False)
    api_key = Column(String(100), unique=True, index=True)
    request_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    last_request = Column(DateTime)
    
    # Relationships
    analysis_requests = relationship("AnalysisRequest", back_populates="user")
    api_usage_logs = relationship("APIUsageLog", back_populates="user")


class AnalysisRequest(Base):
    """Analysis request tracking"""
    
    __tablename__ = "analysis_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("api_users.id"), nullable=False)
    request_id = Column(String(100), unique=True, index=True, nullable=False)
    endpoint = Column(String(100), nullable=False)
    request_type = Column(String(50), nullable=False)
    input_data = Column(JSON)
    output_data = Column(JSON)
    status = Column(String(20), default="pending")
    error_message = Column(Text)
    processing_time_ms = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    user = relationship("APIUser", back_populates="analysis_requests")


class APIUsageLog(Base):
    """API usage logging"""
    
    __tablename__ = "api_usage_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("api_users.id"))
    request_id = Column(String(100), index=True)
    endpoint = Column(String(100), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Float)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_size = Column(Integer)
    response_size = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("APIUser", back_populates="api_usage_logs")


class ComplianceAssessmentRecord(Base):
    """Compliance assessment records"""
    
    __tablename__ = "compliance_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("api_users.id"), nullable=False)
    organization_name = Column(String(200), nullable=False)
    industry = Column(String(100), nullable=False)
    regulations = Column(JSON, nullable=False)
    assessment_data = Column(JSON, nullable=False)
    overall_score = Column(Float)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    next_review_date = Column(DateTime)


class RiskAssessmentRecord(Base):
    """Risk assessment records"""
    
    __tablename__ = "risk_assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("api_users.id"), nullable=False)
    assessment_type = Column(String(50), nullable=False)
    organization_name = Column(String(200))
    risk_factors = Column(JSON, nullable=False)
    overall_risk_score = Column(Float)
    risk_level = Column(String(20))
    assessment_data = Column(JSON, nullable=False)
    recommendations = Column(JSON)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PolicyDocument(Base):
    """Policy document records"""
    
    __tablename__ = "policy_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("api_users.id"), nullable=False)
    document_type = Column(String(50), nullable=False)
    organization_name = Column(String(200), nullable=False)
    jurisdiction = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    metadata = Column(JSON)
    version = Column(String(20), default="1.0")
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime)
    approved_by = Column(String(100))


class MarketDataCache(Base):
    """Market data caching"""
    
    __tablename__ = "market_data_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    data_type = Column(String(50), nullable=False)
    data = Column(JSON, nullable=False)
    source = Column(String(50))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, index=True)


class SystemMetrics(Base):
    """System performance metrics"""
    
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_type = Column(String(50), nullable=False, index=True)
    metric_name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    metadata = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


# Database utility functions
async def get_database_connection() -> AsyncSession:
    """Get database session dependency"""
    
    async with db_manager.get_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_user(
    username: str,
    email: str,
    password_hash: str,
    subscription_tier: str = "free",
    roles: List[str] = None
) -> APIUser:
    """Create a new user"""
    
    async with db_manager.get_session() as session:
        user = APIUser(
            username=username,
            email=email,
            password_hash=password_hash,
            subscription_tier=subscription_tier,
            roles=roles or ["user"]
        )
        
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        return user


async def get_user_by_username(username: str) -> Optional[APIUser]:
    """Get user by username"""
    
    async with db_manager.get_session() as session:
        result = await session.execute(
            sa.select(APIUser).where(APIUser.username == username)
        )
        return result.scalar_one_or_none()


async def get_user_by_api_key(api_key: str) -> Optional[APIUser]:
    """Get user by API key"""
    
    async with db_manager.get_session() as session:
        result = await session.execute(
            sa.select(APIUser).where(APIUser.api_key == api_key)
        )
        return result.scalar_one_or_none()


async def log_api_usage(
    user_id: Optional[int],
    request_id: str,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: float,
    ip_address: str,
    user_agent: str,
    request_size: int = 0,
    response_size: int = 0
):
    """Log API usage"""
    
    async with db_manager.get_session() as session:
        log_entry = APIUsageLog(
            user_id=user_id,
            request_id=request_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            ip_address=ip_address,
            user_agent=user_agent,
            request_size=request_size,
            response_size=response_size
        )
        
        session.add(log_entry)
        await session.commit()


async def create_analysis_request(
    user_id: int,
    request_id: str,
    endpoint: str,
    request_type: str,
    input_data: Dict[str, Any]
) -> AnalysisRequest:
    """Create analysis request record"""
    
    async with db_manager.get_session() as session:
        analysis_request = AnalysisRequest(
            user_id=user_id,
            request_id=request_id,
            endpoint=endpoint,
            request_type=request_type,
            input_data=input_data
        )
        
        session.add(analysis_request)
        await session.commit()
        await session.refresh(analysis_request)
        
        return analysis_request


async def update_analysis_request(
    request_id: str,
    output_data: Dict[str, Any],
    status: str = "completed",
    error_message: str = None,
    processing_time_ms: float = None
):
    """Update analysis request with results"""
    
    async with db_manager.get_session() as session:
        result = await session.execute(
            sa.select(AnalysisRequest).where(AnalysisRequest.request_id == request_id)
        )
        analysis_request = result.scalar_one_or_none()
        
        if analysis_request:
            analysis_request.output_data = output_data
            analysis_request.status = status
            analysis_request.error_message = error_message
            analysis_request.processing_time_ms = processing_time_ms
            analysis_request.completed_at = datetime.utcnow()
            
            await session.commit()


async def save_compliance_assessment(
    user_id: int,
    organization_name: str,
    industry: str,
    regulations: List[str],
    assessment_data: Dict[str, Any],
    overall_score: float,
    next_review_date: datetime = None
) -> ComplianceAssessmentRecord:
    """Save compliance assessment"""
    
    async with db_manager.get_session() as session:
        assessment = ComplianceAssessmentRecord(
            user_id=user_id,
            organization_name=organization_name,
            industry=industry,
            regulations=regulations,
            assessment_data=assessment_data,
            overall_score=overall_score,
            next_review_date=next_review_date
        )
        
        session.add(assessment)
        await session.commit()
        await session.refresh(assessment)
        
        return assessment


async def save_risk_assessment(
    user_id: int,
    assessment_type: str,
    organization_name: str,
    risk_factors: List[Dict[str, Any]],
    overall_risk_score: float,
    risk_level: str,
    assessment_data: Dict[str, Any],
    recommendations: List[str] = None
) -> RiskAssessmentRecord:
    """Save risk assessment"""
    
    async with db_manager.get_session() as session:
        assessment = RiskAssessmentRecord(
            user_id=user_id,
            assessment_type=assessment_type,
            organization_name=organization_name,
            risk_factors=risk_factors,
            overall_risk_score=overall_risk_score,
            risk_level=risk_level,
            assessment_data=assessment_data,
            recommendations=recommendations
        )
        
        session.add(assessment)
        await session.commit()
        await session.refresh(assessment)
        
        return assessment


async def cache_market_data(
    symbol: str,
    data_type: str,
    data: Dict[str, Any],
    source: str,
    expires_at: datetime
):
    """Cache market data"""
    
    async with db_manager.get_session() as session:
        # Delete existing cache entry
        await session.execute(
            sa.delete(MarketDataCache).where(
                sa.and_(
                    MarketDataCache.symbol == symbol,
                    MarketDataCache.data_type == data_type
                )
            )
        )
        
        # Create new cache entry
        cache_entry = MarketDataCache(
            symbol=symbol,
            data_type=data_type,
            data=data,
            source=source,
            expires_at=expires_at
        )
        
        session.add(cache_entry)
        await session.commit()


async def get_cached_market_data(symbol: str, data_type: str) -> Optional[Dict[str, Any]]:
    """Get cached market data"""
    
    async with db_manager.get_session() as session:
        result = await session.execute(
            sa.select(MarketDataCache).where(
                sa.and_(
                    MarketDataCache.symbol == symbol,
                    MarketDataCache.data_type == data_type,
                    MarketDataCache.expires_at > datetime.utcnow()
                )
            )
        )
        
        cache_entry = result.scalar_one_or_none()
        return cache_entry.data if cache_entry else None


async def record_system_metric(
    metric_type: str,
    metric_name: str,
    value: float,
    metadata: Dict[str, Any] = None
):
    """Record system metric"""
    
    async with db_manager.get_session() as session:
        metric = SystemMetrics(
            metric_type=metric_type,
            metric_name=metric_name,
            value=value,
            metadata=metadata
        )
        
        session.add(metric)
        await session.commit()


async def cleanup_old_data(days_to_keep: int = 90):
    """Cleanup old data"""
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
    
    async with db_manager.get_session() as session:
        # Clean up old API usage logs
        await session.execute(
            sa.delete(APIUsageLog).where(APIUsageLog.timestamp < cutoff_date)
        )
        
        # Clean up old market data cache
        await session.execute(
            sa.delete(MarketDataCache).where(MarketDataCache.timestamp < cutoff_date)
        )
        
        # Clean up old system metrics
        await session.execute(
            sa.delete(SystemMetrics).where(SystemMetrics.timestamp < cutoff_date)
        )
        
        await session.commit()
        logger.info(f"Cleaned up data older than {days_to_keep} days")


# Initialize database on module import
async def initialize_database():
    """Initialize database"""
    await db_manager.initialize()


# Export commonly used functions
__all__ = [
    "get_database_connection",
    "create_user",
    "get_user_by_username", 
    "get_user_by_api_key",
    "log_api_usage",
    "create_analysis_request",
    "update_analysis_request",
    "save_compliance_assessment",
    "save_risk_assessment",
    "cache_market_data",
    "get_cached_market_data",
    "record_system_metric",
    "cleanup_old_data",
    "initialize_database",
    "db_manager"
]
