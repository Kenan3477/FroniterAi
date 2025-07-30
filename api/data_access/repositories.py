"""
Domain-Specific Repositories

Repository implementations for all Frontier business domain models
with specialized methods and business logic for each entity type.
"""

from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from .base_repository import BaseRepository, RepositoryConfig
from .models import (
    UserModel, CompanyModel, IndustryModel, EntityTypeModel,
    StateModel, CountryModel, ServiceModel, FinancialStatementModel,
    ComplianceFrameworkModel, RiskModel, AuditLogModel, DocumentModel,
    NotificationModel, SubscriptionModel, PaymentModel, SupportTicketModel,
    CompanyIndustryModel, CompanyServiceModel, UserRoleModel
)
from .cache_manager import CacheManager
from .validators import (
    UserValidator, CompanyValidator, FinancialValidator,
    ComplianceValidator, RiskValidator
)
from .exceptions import EntityNotFoundException, ValidationException

class UserRepository(BaseRepository[UserModel]):
    """Repository for user operations"""
    
    def __init__(
        self, 
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[RepositoryConfig] = None
    ):
        super().__init__(
            session=session,
            model=UserModel,
            cache_manager=cache_manager,
            validator=UserValidator(),
            config=config
        )
    
    async def find_by_email(self, email: str) -> Optional[UserModel]:
        """Find user by email address"""
        return await self.find_one_by({'email': email})
    
    async def find_by_username(self, username: str) -> Optional[UserModel]:
        """Find user by username"""
        return await self.find_one_by({'username': username})
    
    async def email_exists(self, email: str) -> bool:
        """Check if email already exists"""
        user = await self.find_by_email(email)
        return user is not None
    
    async def username_exists(self, username: str) -> bool:
        """Check if username already exists"""
        user = await self.find_by_username(username)
        return user is not None
    
    async def get_active_users(self) -> List[UserModel]:
        """Get all active users"""
        return await self.find_by({'is_active': True})
    
    async def get_users_by_role(self, role: str) -> List[UserModel]:
        """Get users by role"""
        try:
            query = (
                self.session.query(UserModel)
                .join(UserRoleModel)
                .filter(UserRoleModel.role_name == role)
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation("get_users_by_role_error", role=role, error=str(e))
            raise
    
    async def update_last_login(self, user_id: Union[str, UUID]) -> bool:
        """Update user's last login timestamp"""
        try:
            user = await self.get_by_id_or_fail(user_id)
            user.last_login_at = datetime.utcnow()
            
            if self.config.auto_commit:
                self.session.commit()
            
            # Update cache
            cache_key = self._get_cache_key(user_id)
            await self._cache_set(cache_key, user)
            
            return True
            
        except Exception as e:
            self._log_operation("update_last_login_error", user_id=user_id, error=str(e))
            return False
    
    async def deactivate_user(self, user_id: Union[str, UUID]) -> bool:
        """Deactivate user account"""
        return await self.update(user_id, {
            'is_active': False,
            'deactivated_at': datetime.utcnow()
        }) is not None
    
    async def get_users_created_between(
        self, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[UserModel]:
        """Get users created within date range"""
        try:
            query = (
                self.session.query(UserModel)
                .filter(UserModel.created_at.between(start_date, end_date))
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation(
                "get_users_created_between_error", 
                start_date=start_date, 
                end_date=end_date, 
                error=str(e)
            )
            raise

class CompanyRepository(BaseRepository[CompanyModel]):
    """Repository for company operations"""
    
    def __init__(
        self, 
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[RepositoryConfig] = None
    ):
        super().__init__(
            session=session,
            model=CompanyModel,
            cache_manager=cache_manager,
            validator=CompanyValidator(),
            config=config
        )
    
    async def find_by_name(self, name: str) -> Optional[CompanyModel]:
        """Find company by name"""
        return await self.find_one_by({'name': name})
    
    async def find_by_ein(self, ein: str) -> Optional[CompanyModel]:
        """Find company by EIN"""
        return await self.find_one_by({'ein': ein})
    
    async def get_companies_by_state(self, state_id: Union[str, UUID]) -> List[CompanyModel]:
        """Get companies by state"""
        return await self.find_by({'state_id': state_id})
    
    async def get_companies_by_industry(self, industry_id: Union[str, UUID]) -> List[CompanyModel]:
        """Get companies by industry"""
        try:
            query = (
                self.session.query(CompanyModel)
                .join(CompanyIndustryModel)
                .filter(CompanyIndustryModel.industry_id == industry_id)
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation(
                "get_companies_by_industry_error", 
                industry_id=industry_id, 
                error=str(e)
            )
            raise
    
    async def get_companies_by_entity_type(self, entity_type_id: Union[str, UUID]) -> List[CompanyModel]:
        """Get companies by entity type"""
        return await self.find_by({'entity_type_id': entity_type_id})
    
    async def get_companies_by_owner(self, owner_id: Union[str, UUID]) -> List[CompanyModel]:
        """Get companies owned by user"""
        return await self.find_by({'owner_id': owner_id})
    
    async def search_companies(
        self, 
        search_term: str,
        state_id: Optional[Union[str, UUID]] = None,
        industry_id: Optional[Union[str, UUID]] = None,
        entity_type_id: Optional[Union[str, UUID]] = None
    ) -> List[CompanyModel]:
        """Search companies with optional filters"""
        try:
            builder = self.query()
            
            # Add search
            if search_term:
                builder.search(search_term, ['name', 'description'])
            
            # Add filters
            if state_id:
                builder.filter('state_id', 'eq', state_id)
            if industry_id:
                builder.join(CompanyIndustryModel).filter('industry_id', 'eq', industry_id)
            if entity_type_id:
                builder.filter('entity_type_id', 'eq', entity_type_id)
            
            return builder.all()
            
        except Exception as e:
            self._log_operation(
                "search_companies_error", 
                search_term=search_term, 
                error=str(e)
            )
            raise
    
    async def get_active_companies(self) -> List[CompanyModel]:
        """Get all active companies"""
        return await self.find_by({'status': 'active'})
    
    async def get_companies_needing_compliance_review(self) -> List[CompanyModel]:
        """Get companies that need compliance review"""
        try:
            # Companies with compliance review due within 30 days
            review_date = datetime.utcnow() + timedelta(days=30)
            
            query = (
                self.session.query(CompanyModel)
                .filter(
                    or_(
                        CompanyModel.next_compliance_review <= review_date,
                        CompanyModel.next_compliance_review.is_(None)
                    )
                )
                .filter(CompanyModel.status == 'active')
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation("get_companies_needing_compliance_review_error", error=str(e))
            raise

class FinancialStatementRepository(BaseRepository[FinancialStatementModel]):
    """Repository for financial statement operations"""
    
    def __init__(
        self, 
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[RepositoryConfig] = None
    ):
        super().__init__(
            session=session,
            model=FinancialStatementModel,
            cache_manager=cache_manager,
            validator=FinancialValidator(),
            config=config
        )
    
    async def get_by_company(self, company_id: Union[str, UUID]) -> List[FinancialStatementModel]:
        """Get financial statements by company"""
        return await self.find_by({'company_id': company_id})
    
    async def get_latest_by_company(self, company_id: Union[str, UUID]) -> Optional[FinancialStatementModel]:
        """Get latest financial statement for company"""
        try:
            query = (
                self.session.query(FinancialStatementModel)
                .filter(FinancialStatementModel.company_id == company_id)
                .order_by(FinancialStatementModel.statement_date.desc())
            )
            
            return query.first()
            
        except Exception as e:
            self._log_operation(
                "get_latest_by_company_error", 
                company_id=company_id, 
                error=str(e)
            )
            raise
    
    async def get_by_period(
        self, 
        company_id: Union[str, UUID],
        start_date: datetime,
        end_date: datetime
    ) -> List[FinancialStatementModel]:
        """Get financial statements for specific period"""
        try:
            query = (
                self.session.query(FinancialStatementModel)
                .filter(FinancialStatementModel.company_id == company_id)
                .filter(FinancialStatementModel.statement_date.between(start_date, end_date))
                .order_by(FinancialStatementModel.statement_date.desc())
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation(
                "get_by_period_error", 
                company_id=company_id,
                start_date=start_date,
                end_date=end_date,
                error=str(e)
            )
            raise
    
    async def calculate_financial_ratios(
        self, 
        company_id: Union[str, UUID]
    ) -> Dict[str, float]:
        """Calculate financial ratios for company"""
        try:
            latest_statement = await self.get_latest_by_company(company_id)
            
            if not latest_statement:
                return {}
            
            ratios = {}
            
            # Current Ratio = Current Assets / Current Liabilities
            if latest_statement.current_liabilities and latest_statement.current_liabilities != 0:
                ratios['current_ratio'] = (
                    latest_statement.current_assets / latest_statement.current_liabilities
                )
            
            # Debt to Equity = Total Liabilities / Total Equity
            if latest_statement.total_equity and latest_statement.total_equity != 0:
                ratios['debt_to_equity'] = (
                    latest_statement.total_liabilities / latest_statement.total_equity
                )
            
            # Return on Assets = Net Income / Total Assets
            if latest_statement.total_assets and latest_statement.total_assets != 0:
                ratios['return_on_assets'] = (
                    latest_statement.net_income / latest_statement.total_assets
                )
            
            # Return on Equity = Net Income / Total Equity
            if latest_statement.total_equity and latest_statement.total_equity != 0:
                ratios['return_on_equity'] = (
                    latest_statement.net_income / latest_statement.total_equity
                )
            
            return ratios
            
        except Exception as e:
            self._log_operation(
                "calculate_financial_ratios_error", 
                company_id=company_id, 
                error=str(e)
            )
            raise

class ComplianceFrameworkRepository(BaseRepository[ComplianceFrameworkModel]):
    """Repository for compliance framework operations"""
    
    def __init__(
        self, 
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[RepositoryConfig] = None
    ):
        super().__init__(
            session=session,
            model=ComplianceFrameworkModel,
            cache_manager=cache_manager,
            validator=ComplianceValidator(),
            config=config
        )
    
    async def get_by_industry(self, industry_id: Union[str, UUID]) -> List[ComplianceFrameworkModel]:
        """Get compliance frameworks by industry"""
        return await self.find_by({'industry_id': industry_id})
    
    async def get_by_country(self, country_id: Union[str, UUID]) -> List[ComplianceFrameworkModel]:
        """Get compliance frameworks by country"""
        return await self.find_by({'country_id': country_id})
    
    async def get_active_frameworks(self) -> List[ComplianceFrameworkModel]:
        """Get all active compliance frameworks"""
        return await self.find_by({'is_active': True})
    
    async def search_frameworks(
        self, 
        search_term: str,
        industry_id: Optional[Union[str, UUID]] = None,
        country_id: Optional[Union[str, UUID]] = None
    ) -> List[ComplianceFrameworkModel]:
        """Search compliance frameworks"""
        try:
            builder = self.query()
            
            # Add search
            if search_term:
                builder.search(search_term, ['name', 'description', 'requirements'])
            
            # Add filters
            if industry_id:
                builder.filter('industry_id', 'eq', industry_id)
            if country_id:
                builder.filter('country_id', 'eq', country_id)
            
            builder.filter('is_active', 'eq', True)
            
            return builder.all()
            
        except Exception as e:
            self._log_operation(
                "search_frameworks_error", 
                search_term=search_term, 
                error=str(e)
            )
            raise

class RiskRepository(BaseRepository[RiskModel]):
    """Repository for risk operations"""
    
    def __init__(
        self, 
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[RepositoryConfig] = None
    ):
        super().__init__(
            session=session,
            model=RiskModel,
            cache_manager=cache_manager,
            validator=RiskValidator(),
            config=config
        )
    
    async def get_by_company(self, company_id: Union[str, UUID]) -> List[RiskModel]:
        """Get risks by company"""
        return await self.find_by({'company_id': company_id})
    
    async def get_high_priority_risks(self, company_id: Union[str, UUID]) -> List[RiskModel]:
        """Get high priority risks for company"""
        try:
            query = (
                self.session.query(RiskModel)
                .filter(RiskModel.company_id == company_id)
                .filter(RiskModel.priority.in_(['high', 'critical']))
                .filter(RiskModel.status != 'resolved')
                .order_by(RiskModel.impact_score.desc())
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation(
                "get_high_priority_risks_error", 
                company_id=company_id, 
                error=str(e)
            )
            raise
    
    async def get_risks_by_category(
        self, 
        company_id: Union[str, UUID],
        category: str
    ) -> List[RiskModel]:
        """Get risks by category"""
        return await self.find_by({
            'company_id': company_id,
            'category': category
        })
    
    async def calculate_risk_score(self, company_id: Union[str, UUID]) -> Dict[str, Any]:
        """Calculate overall risk score for company"""
        try:
            risks = await self.get_by_company(company_id)
            
            if not risks:
                return {
                    'total_score': 0,
                    'risk_level': 'low',
                    'active_risks': 0,
                    'high_priority_risks': 0
                }
            
            active_risks = [r for r in risks if r.status != 'resolved']
            total_score = sum(r.impact_score * r.probability_score for r in active_risks)
            high_priority_count = len([r for r in active_risks if r.priority in ['high', 'critical']])
            
            # Determine risk level
            if total_score >= 80:
                risk_level = 'critical'
            elif total_score >= 60:
                risk_level = 'high'
            elif total_score >= 40:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            return {
                'total_score': total_score,
                'risk_level': risk_level,
                'active_risks': len(active_risks),
                'high_priority_risks': high_priority_count
            }
            
        except Exception as e:
            self._log_operation(
                "calculate_risk_score_error", 
                company_id=company_id, 
                error=str(e)
            )
            raise

class DocumentRepository(BaseRepository[DocumentModel]):
    """Repository for document operations"""
    
    def __init__(
        self, 
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[RepositoryConfig] = None
    ):
        super().__init__(
            session=session,
            model=DocumentModel,
            cache_manager=cache_manager,
            config=config
        )
    
    async def get_by_company(self, company_id: Union[str, UUID]) -> List[DocumentModel]:
        """Get documents by company"""
        return await self.find_by({'company_id': company_id})
    
    async def get_by_type(
        self, 
        company_id: Union[str, UUID],
        document_type: str
    ) -> List[DocumentModel]:
        """Get documents by type"""
        return await self.find_by({
            'company_id': company_id,
            'document_type': document_type
        })
    
    async def get_expired_documents(self) -> List[DocumentModel]:
        """Get expired documents"""
        try:
            current_date = datetime.utcnow()
            
            query = (
                self.session.query(DocumentModel)
                .filter(DocumentModel.expiry_date <= current_date)
                .filter(DocumentModel.status == 'active')
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation("get_expired_documents_error", error=str(e))
            raise
    
    async def get_expiring_soon(self, days: int = 30) -> List[DocumentModel]:
        """Get documents expiring within specified days"""
        try:
            future_date = datetime.utcnow() + timedelta(days=days)
            
            query = (
                self.session.query(DocumentModel)
                .filter(DocumentModel.expiry_date <= future_date)
                .filter(DocumentModel.expiry_date > datetime.utcnow())
                .filter(DocumentModel.status == 'active')
                .order_by(DocumentModel.expiry_date.asc())
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation("get_expiring_soon_error", days=days, error=str(e))
            raise

class AuditLogRepository(BaseRepository[AuditLogModel]):
    """Repository for audit log operations"""
    
    def __init__(
        self, 
        session: Session,
        cache_manager: Optional[CacheManager] = None,
        config: Optional[RepositoryConfig] = None
    ):
        super().__init__(
            session=session,
            model=AuditLogModel,
            cache_manager=cache_manager,
            config=config
        )
    
    async def get_by_entity(
        self, 
        entity_type: str,
        entity_id: Union[str, UUID]
    ) -> List[AuditLogModel]:
        """Get audit logs by entity"""
        return await self.find_by({
            'entity_type': entity_type,
            'entity_id': str(entity_id)
        })
    
    async def get_by_user(self, user_id: Union[str, UUID]) -> List[AuditLogModel]:
        """Get audit logs by user"""
        return await self.find_by({'user_id': user_id})
    
    async def get_by_action(self, action: str) -> List[AuditLogModel]:
        """Get audit logs by action"""
        return await self.find_by({'action': action})
    
    async def get_recent_activity(
        self, 
        hours: int = 24,
        limit: int = 100
    ) -> List[AuditLogModel]:
        """Get recent activity"""
        try:
            since_date = datetime.utcnow() - timedelta(hours=hours)
            
            query = (
                self.session.query(AuditLogModel)
                .filter(AuditLogModel.created_at >= since_date)
                .order_by(AuditLogModel.created_at.desc())
                .limit(limit)
            )
            
            return query.all()
            
        except Exception as e:
            self._log_operation("get_recent_activity_error", hours=hours, error=str(e))
            raise

# Additional specialized repositories can be added here for other models
# following the same pattern...
