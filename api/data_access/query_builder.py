"""
Query Builder

Advanced query construction system for complex database operations
with support for dynamic filtering, sorting, pagination, and joins.
"""

from typing import Any, Dict, List, Optional, Union, Type, Callable
from sqlalchemy import and_, or_, not_, asc, desc, func, text
from sqlalchemy.orm import Query, joinedload, selectinload, contains_eager
from sqlalchemy.sql import operators
from dataclasses import dataclass
from enum import Enum
import logging

from .models import BaseModel
from .exceptions import QueryBuilderException

logger = logging.getLogger(__name__)

class FilterOperator(Enum):
    """Filter operators for query building"""
    EQ = "eq"           # Equal
    NE = "ne"           # Not equal
    GT = "gt"           # Greater than
    GTE = "gte"         # Greater than or equal
    LT = "lt"           # Less than
    LTE = "lte"         # Less than or equal
    LIKE = "like"       # Pattern matching
    ILIKE = "ilike"     # Case-insensitive pattern matching
    IN = "in"           # In list
    NOT_IN = "not_in"   # Not in list
    IS_NULL = "is_null" # Is null
    IS_NOT_NULL = "is_not_null"  # Is not null
    BETWEEN = "between" # Between values
    CONTAINS = "contains"  # Contains (for arrays/JSON)
    STARTS_WITH = "starts_with"  # Starts with
    ENDS_WITH = "ends_with"      # Ends with

class SortDirection(Enum):
    """Sort directions"""
    ASC = "asc"
    DESC = "desc"

class JoinType(Enum):
    """Join types"""
    INNER = "inner"
    LEFT = "left"
    RIGHT = "right"
    OUTER = "outer"

@dataclass
class FilterCondition:
    """Filter condition definition"""
    field: str
    operator: FilterOperator
    value: Any
    case_sensitive: bool = True
    
    def __post_init__(self):
        """Validate filter condition"""
        if self.operator in [FilterOperator.IS_NULL, FilterOperator.IS_NOT_NULL]:
            self.value = None
        elif self.operator == FilterOperator.BETWEEN:
            if not isinstance(self.value, (list, tuple)) or len(self.value) != 2:
                raise ValueError("BETWEEN operator requires a list/tuple of two values")
        elif self.operator in [FilterOperator.IN, FilterOperator.NOT_IN]:
            if not isinstance(self.value, (list, tuple)):
                raise ValueError(f"{self.operator.value} operator requires a list/tuple of values")

@dataclass
class SortCondition:
    """Sort condition definition"""
    field: str
    direction: SortDirection = SortDirection.ASC
    nulls_first: bool = False

@dataclass
class JoinCondition:
    """Join condition definition"""
    model: Type[BaseModel]
    join_type: JoinType = JoinType.INNER
    on_condition: Optional[str] = None
    alias: Optional[str] = None

@dataclass
class PaginationParams:
    """Pagination parameters"""
    page: int = 1
    page_size: int = 20
    max_page_size: int = 1000
    
    def __post_init__(self):
        """Validate pagination parameters"""
        if self.page < 1:
            self.page = 1
        if self.page_size < 1:
            self.page_size = 20
        if self.page_size > self.max_page_size:
            self.page_size = self.max_page_size
    
    @property
    def offset(self) -> int:
        """Calculate offset for SQL query"""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """Get limit for SQL query"""
        return self.page_size

@dataclass
class QueryResult:
    """Query result with metadata"""
    items: List[Any]
    total_count: int
    page: int
    page_size: int
    has_next: bool
    has_previous: bool
    
    @property
    def total_pages(self) -> int:
        """Calculate total number of pages"""
        if self.page_size == 0:
            return 0
        return (self.total_count + self.page_size - 1) // self.page_size

class QueryBuilder:
    """Advanced query builder for complex database operations"""
    
    def __init__(self, model: Type[BaseModel], session):
        self.model = model
        self.session = session
        self._query = session.query(model)
        self._filters: List[FilterCondition] = []
        self._sorts: List[SortCondition] = []
        self._joins: List[JoinCondition] = []
        self._includes: List[str] = []
        self._group_by: List[str] = []
        self._having: List[FilterCondition] = []
        self._distinct_fields: List[str] = []
        self._pagination: Optional[PaginationParams] = None
        self._raw_sql_conditions: List[str] = []
        
        # Query optimization flags
        self._enable_query_cache = True
        self._enable_lazy_loading = True
        self._query_timeout = 30
    
    def filter(
        self, 
        field: str, 
        operator: Union[FilterOperator, str], 
        value: Any = None,
        case_sensitive: bool = True
    ) -> 'QueryBuilder':
        """Add filter condition"""
        if isinstance(operator, str):
            try:
                operator = FilterOperator(operator)
            except ValueError:
                raise QueryBuilderException(
                    message=f"Unknown filter operator: {operator}",
                    operation="filter"
                )
        
        condition = FilterCondition(
            field=field,
            operator=operator,
            value=value,
            case_sensitive=case_sensitive
        )
        
        self._filters.append(condition)
        return self
    
    def filter_by(self, **kwargs) -> 'QueryBuilder':
        """Add multiple equality filters"""
        for field, value in kwargs.items():
            self.filter(field, FilterOperator.EQ, value)
        return self
    
    def filter_in(self, field: str, values: List[Any]) -> 'QueryBuilder':
        """Add IN filter"""
        return self.filter(field, FilterOperator.IN, values)
    
    def filter_not_in(self, field: str, values: List[Any]) -> 'QueryBuilder':
        """Add NOT IN filter"""
        return self.filter(field, FilterOperator.NOT_IN, values)
    
    def filter_like(self, field: str, pattern: str, case_sensitive: bool = True) -> 'QueryBuilder':
        """Add LIKE filter"""
        operator = FilterOperator.LIKE if case_sensitive else FilterOperator.ILIKE
        return self.filter(field, operator, pattern, case_sensitive)
    
    def filter_null(self, field: str, is_null: bool = True) -> 'QueryBuilder':
        """Add null filter"""
        operator = FilterOperator.IS_NULL if is_null else FilterOperator.IS_NOT_NULL
        return self.filter(field, operator)
    
    def filter_between(self, field: str, start: Any, end: Any) -> 'QueryBuilder':
        """Add BETWEEN filter"""
        return self.filter(field, FilterOperator.BETWEEN, [start, end])
    
    def filter_date_range(
        self, 
        field: str, 
        start_date: Any, 
        end_date: Any
    ) -> 'QueryBuilder':
        """Add date range filter"""
        return self.filter_between(field, start_date, end_date)
    
    def search(self, query: str, fields: List[str]) -> 'QueryBuilder':
        """Add full-text search across multiple fields"""
        if not query or not fields:
            return self
        
        search_conditions = []
        for field in fields:
            search_conditions.append(
                FilterCondition(
                    field=field,
                    operator=FilterOperator.ILIKE,
                    value=f"%{query}%",
                    case_sensitive=False
                )
            )
        
        # Create OR condition for search
        self._add_or_filter_group(search_conditions)
        return self
    
    def sort(
        self, 
        field: str, 
        direction: Union[SortDirection, str] = SortDirection.ASC,
        nulls_first: bool = False
    ) -> 'QueryBuilder':
        """Add sort condition"""
        if isinstance(direction, str):
            try:
                direction = SortDirection(direction)
            except ValueError:
                raise QueryBuilderException(
                    message=f"Unknown sort direction: {direction}",
                    operation="sort"
                )
        
        condition = SortCondition(
            field=field,
            direction=direction,
            nulls_first=nulls_first
        )
        
        self._sorts.append(condition)
        return self
    
    def sort_by(self, **kwargs) -> 'QueryBuilder':
        """Add multiple sort conditions"""
        for field, direction in kwargs.items():
            self.sort(field, direction)
        return self
    
    def order_by(self, *fields) -> 'QueryBuilder':
        """Add multiple ascending sort conditions"""
        for field in fields:
            self.sort(field, SortDirection.ASC)
        return self
    
    def join(
        self, 
        model: Type[BaseModel], 
        join_type: Union[JoinType, str] = JoinType.INNER,
        on_condition: Optional[str] = None,
        alias: Optional[str] = None
    ) -> 'QueryBuilder':
        """Add join condition"""
        if isinstance(join_type, str):
            try:
                join_type = JoinType(join_type)
            except ValueError:
                raise QueryBuilderException(
                    message=f"Unknown join type: {join_type}",
                    operation="join"
                )
        
        condition = JoinCondition(
            model=model,
            join_type=join_type,
            on_condition=on_condition,
            alias=alias
        )
        
        self._joins.append(condition)
        return self
    
    def include(self, *relationships) -> 'QueryBuilder':
        """Include relationships in query (eager loading)"""
        self._includes.extend(relationships)
        return self
    
    def group_by(self, *fields) -> 'QueryBuilder':
        """Add GROUP BY clause"""
        self._group_by.extend(fields)
        return self
    
    def having(
        self, 
        field: str, 
        operator: Union[FilterOperator, str], 
        value: Any
    ) -> 'QueryBuilder':
        """Add HAVING clause"""
        if isinstance(operator, str):
            operator = FilterOperator(operator)
        
        condition = FilterCondition(
            field=field,
            operator=operator,
            value=value
        )
        
        self._having.append(condition)
        return self
    
    def distinct(self, *fields) -> 'QueryBuilder':
        """Add DISTINCT clause"""
        self._distinct_fields.extend(fields)
        return self
    
    def paginate(
        self, 
        page: int = 1, 
        page_size: int = 20,
        max_page_size: int = 1000
    ) -> 'QueryBuilder':
        """Add pagination"""
        self._pagination = PaginationParams(
            page=page,
            page_size=page_size,
            max_page_size=max_page_size
        )
        return self
    
    def raw_sql(self, condition: str) -> 'QueryBuilder':
        """Add raw SQL condition"""
        self._raw_sql_conditions.append(condition)
        return self
    
    def _add_or_filter_group(self, conditions: List[FilterCondition]):
        """Add OR filter group (internal method)"""
        # This would be implemented to handle OR conditions
        # For now, we'll add each condition separately
        for condition in conditions:
            self._filters.append(condition)
    
    def _apply_filters(self, query: Query) -> Query:
        """Apply filter conditions to query"""
        for condition in self._filters:
            try:
                field_attr = getattr(self.model, condition.field)
                
                if condition.operator == FilterOperator.EQ:
                    query = query.filter(field_attr == condition.value)
                elif condition.operator == FilterOperator.NE:
                    query = query.filter(field_attr != condition.value)
                elif condition.operator == FilterOperator.GT:
                    query = query.filter(field_attr > condition.value)
                elif condition.operator == FilterOperator.GTE:
                    query = query.filter(field_attr >= condition.value)
                elif condition.operator == FilterOperator.LT:
                    query = query.filter(field_attr < condition.value)
                elif condition.operator == FilterOperator.LTE:
                    query = query.filter(field_attr <= condition.value)
                elif condition.operator == FilterOperator.LIKE:
                    query = query.filter(field_attr.like(condition.value))
                elif condition.operator == FilterOperator.ILIKE:
                    query = query.filter(field_attr.ilike(condition.value))
                elif condition.operator == FilterOperator.IN:
                    query = query.filter(field_attr.in_(condition.value))
                elif condition.operator == FilterOperator.NOT_IN:
                    query = query.filter(~field_attr.in_(condition.value))
                elif condition.operator == FilterOperator.IS_NULL:
                    query = query.filter(field_attr.is_(None))
                elif condition.operator == FilterOperator.IS_NOT_NULL:
                    query = query.filter(field_attr.isnot(None))
                elif condition.operator == FilterOperator.BETWEEN:
                    query = query.filter(
                        field_attr.between(condition.value[0], condition.value[1])
                    )
                elif condition.operator == FilterOperator.STARTS_WITH:
                    query = query.filter(field_attr.like(f"{condition.value}%"))
                elif condition.operator == FilterOperator.ENDS_WITH:
                    query = query.filter(field_attr.like(f"%{condition.value}"))
                elif condition.operator == FilterOperator.CONTAINS:
                    # For JSON fields or text fields
                    query = query.filter(field_attr.like(f"%{condition.value}%"))
                    
            except AttributeError:
                raise QueryBuilderException(
                    message=f"Field '{condition.field}' not found in model {self.model.__name__}",
                    operation="apply_filters"
                )
            except Exception as e:
                raise QueryBuilderException(
                    message=f"Error applying filter: {e}",
                    operation="apply_filters",
                    inner_exception=e
                )
        
        return query
    
    def _apply_sorts(self, query: Query) -> Query:
        """Apply sort conditions to query"""
        for condition in self._sorts:
            try:
                field_attr = getattr(self.model, condition.field)
                
                if condition.direction == SortDirection.ASC:
                    order_clause = asc(field_attr)
                else:
                    order_clause = desc(field_attr)
                
                if condition.nulls_first:
                    order_clause = order_clause.nullsfirst()
                else:
                    order_clause = order_clause.nullslast()
                
                query = query.order_by(order_clause)
                
            except AttributeError:
                raise QueryBuilderException(
                    message=f"Field '{condition.field}' not found in model {self.model.__name__}",
                    operation="apply_sorts"
                )
        
        return query
    
    def _apply_joins(self, query: Query) -> Query:
        """Apply join conditions to query"""
        for condition in self._joins:
            try:
                if condition.join_type == JoinType.INNER:
                    query = query.join(condition.model)
                elif condition.join_type == JoinType.LEFT:
                    query = query.outerjoin(condition.model)
                # Add other join types as needed
                
            except Exception as e:
                raise QueryBuilderException(
                    message=f"Error applying join: {e}",
                    operation="apply_joins",
                    inner_exception=e
                )
        
        return query
    
    def _apply_includes(self, query: Query) -> Query:
        """Apply eager loading for relationships"""
        for relationship in self._includes:
            try:
                query = query.options(joinedload(relationship))
            except Exception as e:
                logger.warning(f"Could not eager load relationship '{relationship}': {e}")
        
        return query
    
    def _apply_group_by(self, query: Query) -> Query:
        """Apply GROUP BY clause"""
        for field in self._group_by:
            try:
                field_attr = getattr(self.model, field)
                query = query.group_by(field_attr)
            except AttributeError:
                raise QueryBuilderException(
                    message=f"Field '{field}' not found in model {self.model.__name__}",
                    operation="apply_group_by"
                )
        
        return query
    
    def _apply_having(self, query: Query) -> Query:
        """Apply HAVING clause"""
        for condition in self._having:
            try:
                field_attr = getattr(self.model, condition.field)
                
                if condition.operator == FilterOperator.EQ:
                    query = query.having(field_attr == condition.value)
                elif condition.operator == FilterOperator.GT:
                    query = query.having(field_attr > condition.value)
                # Add other operators as needed
                
            except AttributeError:
                raise QueryBuilderException(
                    message=f"Field '{condition.field}' not found in model {self.model.__name__}",
                    operation="apply_having"
                )
        
        return query
    
    def _apply_raw_sql(self, query: Query) -> Query:
        """Apply raw SQL conditions"""
        for condition in self._raw_sql_conditions:
            query = query.filter(text(condition))
        
        return query
    
    def build(self) -> Query:
        """Build the final query"""
        query = self._query
        
        # Apply all conditions
        query = self._apply_filters(query)
        query = self._apply_joins(query)
        query = self._apply_includes(query)
        query = self._apply_group_by(query)
        query = self._apply_having(query)
        query = self._apply_sorts(query)
        query = self._apply_raw_sql(query)
        
        # Apply DISTINCT
        if self._distinct_fields:
            if len(self._distinct_fields) == 1:
                field_attr = getattr(self.model, self._distinct_fields[0])
                query = query.distinct(field_attr)
            else:
                query = query.distinct()
        
        return query
    
    def count(self) -> int:
        """Get count of matching records"""
        query = self.build()
        # Remove ordering for count query
        query = query.order_by(None)
        return query.count()
    
    def exists(self) -> bool:
        """Check if any records match the criteria"""
        return self.count() > 0
    
    def first(self) -> Optional[BaseModel]:
        """Get first matching record"""
        query = self.build()
        return query.first()
    
    def first_or_fail(self) -> BaseModel:
        """Get first matching record or raise exception"""
        result = self.first()
        if result is None:
            raise QueryBuilderException(
                message="No matching record found",
                operation="first_or_fail"
            )
        return result
    
    def all(self) -> List[BaseModel]:
        """Get all matching records"""
        query = self.build()
        
        if self._pagination:
            query = query.offset(self._pagination.offset).limit(self._pagination.limit)
        
        return query.all()
    
    def paginate_result(self) -> QueryResult:
        """Get paginated results with metadata"""
        if not self._pagination:
            raise QueryBuilderException(
                message="Pagination not configured",
                operation="paginate_result"
            )
        
        # Get total count
        total_count = self.count()
        
        # Get paginated results
        items = self.all()
        
        # Calculate pagination metadata
        has_next = (self._pagination.page * self._pagination.page_size) < total_count
        has_previous = self._pagination.page > 1
        
        return QueryResult(
            items=items,
            total_count=total_count,
            page=self._pagination.page,
            page_size=self._pagination.page_size,
            has_next=has_next,
            has_previous=has_previous
        )
    
    def get_sql(self) -> str:
        """Get the SQL query string"""
        query = self.build()
        return str(query.statement.compile(compile_kwargs={"literal_binds": True}))
    
    def explain(self) -> str:
        """Get query execution plan"""
        query = self.build()
        explain_query = self.session.execute(
            text(f"EXPLAIN {self.get_sql()}")
        )
        return "\n".join(row[0] for row in explain_query.fetchall())
    
    def clone(self) -> 'QueryBuilder':
        """Create a copy of the query builder"""
        new_builder = QueryBuilder(self.model, self.session)
        new_builder._filters = self._filters.copy()
        new_builder._sorts = self._sorts.copy()
        new_builder._joins = self._joins.copy()
        new_builder._includes = self._includes.copy()
        new_builder._group_by = self._group_by.copy()
        new_builder._having = self._having.copy()
        new_builder._distinct_fields = self._distinct_fields.copy()
        new_builder._raw_sql_conditions = self._raw_sql_conditions.copy()
        new_builder._pagination = self._pagination
        
        return new_builder

class QueryBuilderFactory:
    """Factory for creating query builders"""
    
    def __init__(self, session):
        self.session = session
    
    def for_model(self, model: Type[BaseModel]) -> QueryBuilder:
        """Create query builder for specific model"""
        return QueryBuilder(model, self.session)
    
    def create_search_query(
        self, 
        model: Type[BaseModel], 
        search_term: str,
        search_fields: List[str],
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 20
    ) -> QueryBuilder:
        """Create a search query with common parameters"""
        builder = self.for_model(model)
        
        # Add search
        if search_term and search_fields:
            builder.search(search_term, search_fields)
        
        # Add filters
        if filters:
            for field, value in filters.items():
                if isinstance(value, list):
                    builder.filter_in(field, value)
                else:
                    builder.filter(field, FilterOperator.EQ, value)
        
        # Add pagination
        builder.paginate(page, page_size)
        
        return builder
