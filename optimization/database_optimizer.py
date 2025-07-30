"""
Database Query Optimization and Indexing

Implements database performance optimization including query optimization,
indexing strategies, connection pooling, and query analysis.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import psutil

from api.config import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


class QueryType(Enum):
    """Types of database queries"""
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    INDEX = "INDEX"


@dataclass
class QueryMetrics:
    """Query performance metrics"""
    query_hash: str
    query_type: QueryType
    execution_time: float
    rows_affected: int
    timestamp: datetime
    table_name: Optional[str] = None
    index_used: Optional[str] = None
    cache_hit: bool = False


@dataclass
class IndexRecommendation:
    """Database index recommendation"""
    table_name: str
    columns: List[str]
    index_type: str
    estimated_improvement: float
    query_patterns: List[str]
    priority: int  # 1-10, higher is more important


class QueryAnalyzer:
    """Analyze database queries for optimization opportunities"""
    
    def __init__(self):
        self.query_metrics: List[QueryMetrics] = []
        self.slow_query_threshold = 1.0  # seconds
        self.analysis_window = timedelta(hours=24)
    
    def record_query(self, 
                    query: str, 
                    execution_time: float, 
                    rows_affected: int = 0,
                    table_name: Optional[str] = None,
                    index_used: Optional[str] = None,
                    cache_hit: bool = False):
        """Record query execution metrics"""
        
        query_hash = hashlib.md5(self._normalize_query(query).encode()).hexdigest()
        query_type = self._detect_query_type(query)
        
        metric = QueryMetrics(
            query_hash=query_hash,
            query_type=query_type,
            execution_time=execution_time,
            rows_affected=rows_affected,
            timestamp=datetime.now(),
            table_name=table_name,
            index_used=index_used,
            cache_hit=cache_hit
        )
        
        self.query_metrics.append(metric)
        
        # Log slow queries
        if execution_time > self.slow_query_threshold:
            logger.warning(f"Slow query detected: {execution_time:.3f}s - {query[:100]}...")
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query for consistent hashing"""
        # Remove extra whitespace and convert to lowercase
        normalized = ' '.join(query.lower().split())
        
        # Replace parameter placeholders with generic placeholder
        import re
        normalized = re.sub(r'\$\d+|%s|\?', '?', normalized)
        normalized = re.sub(r"'[^']*'", "'?'", normalized)
        normalized = re.sub(r'\b\d+\b', '?', normalized)
        
        return normalized
    
    def _detect_query_type(self, query: str) -> QueryType:
        """Detect query type from SQL"""
        query_lower = query.lower().strip()
        
        if query_lower.startswith('select'):
            return QueryType.SELECT
        elif query_lower.startswith('insert'):
            return QueryType.INSERT
        elif query_lower.startswith('update'):
            return QueryType.UPDATE
        elif query_lower.startswith('delete'):
            return QueryType.DELETE
        elif 'index' in query_lower:
            return QueryType.INDEX
        else:
            return QueryType.SELECT
    
    def get_slow_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest queries in the analysis window"""
        cutoff_time = datetime.now() - self.analysis_window
        recent_metrics = [m for m in self.query_metrics if m.timestamp > cutoff_time]
        
        # Group by query hash and calculate averages
        query_stats = {}
        for metric in recent_metrics:
            if metric.query_hash not in query_stats:
                query_stats[metric.query_hash] = {
                    'total_time': 0,
                    'count': 0,
                    'max_time': 0,
                    'table_name': metric.table_name,
                    'query_type': metric.query_type.value
                }
            
            stats = query_stats[metric.query_hash]
            stats['total_time'] += metric.execution_time
            stats['count'] += 1
            stats['max_time'] = max(stats['max_time'], metric.execution_time)
        
        # Calculate averages and sort by total impact
        for query_hash, stats in query_stats.items():
            stats['avg_time'] = stats['total_time'] / stats['count']
            stats['impact_score'] = stats['total_time'] * stats['count']
        
        # Sort by impact score and return top queries
        sorted_queries = sorted(
            query_stats.items(),
            key=lambda x: x[1]['impact_score'],
            reverse=True
        )
        
        return [
            {
                'query_hash': query_hash,
                **stats
            }
            for query_hash, stats in sorted_queries[:limit]
        ]
    
    def get_index_recommendations(self) -> List[IndexRecommendation]:
        """Generate index recommendations based on query patterns"""
        recommendations = []
        
        # Analyze frequent WHERE clauses
        where_patterns = self._analyze_where_patterns()
        
        # Analyze JOIN patterns
        join_patterns = self._analyze_join_patterns()
        
        # Analyze ORDER BY patterns
        order_patterns = self._analyze_order_patterns()
        
        # Generate recommendations
        for table, columns in where_patterns.items():
            if len(columns) > 0:
                recommendations.append(IndexRecommendation(
                    table_name=table,
                    columns=list(columns),
                    index_type="btree",
                    estimated_improvement=0.3,  # 30% improvement estimate
                    query_patterns=[f"WHERE {col}" for col in columns],
                    priority=8
                ))
        
        for table, columns in join_patterns.items():
            if len(columns) > 0:
                recommendations.append(IndexRecommendation(
                    table_name=table,
                    columns=list(columns),
                    index_type="btree",
                    estimated_improvement=0.5,  # 50% improvement estimate
                    query_patterns=[f"JOIN on {col}" for col in columns],
                    priority=9
                ))
        
        return sorted(recommendations, key=lambda x: x.priority, reverse=True)
    
    def _analyze_where_patterns(self) -> Dict[str, set]:
        """Analyze WHERE clause patterns"""
        # This is a simplified analysis - in reality you'd parse SQL AST
        patterns = {}
        # Implementation would analyze actual query patterns
        return patterns
    
    def _analyze_join_patterns(self) -> Dict[str, set]:
        """Analyze JOIN patterns"""
        patterns = {}
        # Implementation would analyze JOIN conditions
        return patterns
    
    def _analyze_order_patterns(self) -> Dict[str, set]:
        """Analyze ORDER BY patterns"""
        patterns = {}
        # Implementation would analyze ORDER BY clauses
        return patterns


class ConnectionPoolManager:
    """Manage database connection pooling for optimal performance"""
    
    def __init__(self):
        self.pool_config = {
            'min_connections': 5,
            'max_connections': 20,
            'connection_timeout': 30,
            'idle_timeout': 300,
            'max_lifetime': 3600
        }
        self.active_connections = 0
        self.total_connections_created = 0
        self.connection_metrics = []
    
    async def get_connection(self):
        """Get database connection from pool"""
        start_time = time.time()
        
        try:
            # Simulate getting connection from pool
            await asyncio.sleep(0.01)  # Simulate connection acquisition time
            
            self.active_connections += 1
            connection_time = time.time() - start_time
            
            self.connection_metrics.append({
                'timestamp': datetime.now(),
                'acquisition_time': connection_time,
                'active_connections': self.active_connections
            })
            
            return MockConnection()
            
        except Exception as e:
            logger.error(f"Failed to acquire database connection: {e}")
            raise
    
    async def release_connection(self, connection):
        """Release connection back to pool"""
        try:
            # Simulate connection release
            await asyncio.sleep(0.001)
            self.active_connections = max(0, self.active_connections - 1)
            
        except Exception as e:
            logger.error(f"Failed to release database connection: {e}")
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        recent_metrics = [
            m for m in self.connection_metrics 
            if m['timestamp'] > datetime.now() - timedelta(minutes=5)
        ]
        
        if recent_metrics:
            avg_acquisition_time = sum(m['acquisition_time'] for m in recent_metrics) / len(recent_metrics)
            max_active = max(m['active_connections'] for m in recent_metrics)
        else:
            avg_acquisition_time = 0
            max_active = 0
        
        return {
            'active_connections': self.active_connections,
            'max_connections': self.pool_config['max_connections'],
            'avg_acquisition_time': avg_acquisition_time,
            'max_active_recent': max_active,
            'utilization': self.active_connections / self.pool_config['max_connections']
        }


class MockConnection:
    """Mock database connection for testing"""
    
    def __init__(self):
        self.connected = True
        self.transaction_active = False
    
    async def execute(self, query: str, *params) -> int:
        """Execute query and return affected rows"""
        await asyncio.sleep(0.01)  # Simulate query execution
        return 1
    
    async def fetch_all(self, query: str, *params) -> List[Dict]:
        """Fetch all results"""
        await asyncio.sleep(0.02)  # Simulate data fetch
        return [{'id': 1, 'name': 'test'}]
    
    async def fetch_one(self, query: str, *params) -> Optional[Dict]:
        """Fetch single result"""
        await asyncio.sleep(0.01)
        return {'id': 1, 'name': 'test'}


class DatabaseOptimizer:
    """Main database optimization coordinator"""
    
    def __init__(self):
        self.query_analyzer = QueryAnalyzer()
        self.connection_pool = ConnectionPoolManager()
        self.optimization_enabled = True
        self.index_cache = {}
        self.query_cache = {}
        
    async def initialize(self):
        """Initialize database optimizer"""
        logger.info("Database optimizer initialized")
    
    async def execute_optimized_query(self, 
                                    query: str, 
                                    params: Optional[Tuple] = None,
                                    cache_key: Optional[str] = None) -> Any:
        """Execute query with optimization features"""
        start_time = time.time()
        
        # Check query cache first
        if cache_key and cache_key in self.query_cache:
            cache_entry = self.query_cache[cache_key]
            if datetime.now() < cache_entry['expires_at']:
                self.query_analyzer.record_query(
                    query=query,
                    execution_time=0.001,  # Cache hit is very fast
                    cache_hit=True
                )
                return cache_entry['result']
        
        # Get connection from pool
        connection = await self.connection_pool.get_connection()
        
        try:
            # Execute query
            if query.lower().strip().startswith('select'):
                result = await connection.fetch_all(query, *(params or ()))
            else:
                result = await connection.execute(query, *(params or ()))
            
            execution_time = time.time() - start_time
            
            # Record metrics
            self.query_analyzer.record_query(
                query=query,
                execution_time=execution_time,
                rows_affected=len(result) if isinstance(result, list) else result,
                cache_hit=False
            )
            
            # Cache result if applicable
            if cache_key and query.lower().strip().startswith('select'):
                self.query_cache[cache_key] = {
                    'result': result,
                    'expires_at': datetime.now() + timedelta(minutes=5)
                }
            
            return result
            
        finally:
            await self.connection_pool.release_connection(connection)
    
    async def optimize_indexes(self) -> List[str]:
        """Apply index optimizations"""
        if not self.optimization_enabled:
            return []
        
        recommendations = self.query_analyzer.get_index_recommendations()
        applied_indexes = []
        
        for rec in recommendations[:5]:  # Apply top 5 recommendations
            index_sql = self._generate_index_sql(rec)
            try:
                await self.execute_optimized_query(index_sql)
                applied_indexes.append(index_sql)
                logger.info(f"Applied index optimization: {rec.table_name}.{rec.columns}")
            except Exception as e:
                logger.error(f"Failed to apply index {rec.table_name}.{rec.columns}: {e}")
        
        return applied_indexes
    
    def _generate_index_sql(self, recommendation: IndexRecommendation) -> str:
        """Generate SQL for creating index"""
        index_name = f"idx_{recommendation.table_name}_{'_'.join(recommendation.columns)}"
        columns_str = ', '.join(recommendation.columns)
        
        return f"""
        CREATE INDEX IF NOT EXISTS {index_name}
        ON {recommendation.table_name} ({columns_str})
        """
    
    async def analyze_performance(self) -> Dict[str, Any]:
        """Analyze database performance"""
        slow_queries = self.query_analyzer.get_slow_queries()
        pool_stats = self.connection_pool.get_pool_stats()
        index_recommendations = self.query_analyzer.get_index_recommendations()
        
        # System resource usage
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'query_performance': {
                'slow_queries_count': len(slow_queries),
                'top_slow_queries': slow_queries[:5],
                'total_queries_analyzed': len(self.query_analyzer.query_metrics)
            },
            'connection_pool': pool_stats,
            'index_recommendations': [asdict(rec) for rec in index_recommendations[:10]],
            'system_resources': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'disk_percent': disk.percent,
                'available_memory_gb': memory.available / (1024**3)
            },
            'cache_stats': {
                'query_cache_size': len(self.query_cache),
                'index_cache_size': len(self.index_cache)
            }
        }
    
    async def cleanup_old_metrics(self):
        """Clean up old performance metrics"""
        cutoff_time = datetime.now() - timedelta(days=7)
        
        # Clean query metrics
        self.query_analyzer.query_metrics = [
            m for m in self.query_analyzer.query_metrics 
            if m.timestamp > cutoff_time
        ]
        
        # Clean connection metrics
        self.connection_pool.connection_metrics = [
            m for m in self.connection_pool.connection_metrics
            if m['timestamp'] > cutoff_time
        ]
        
        # Clean query cache
        current_time = datetime.now()
        expired_keys = [
            key for key, entry in self.query_cache.items()
            if current_time >= entry['expires_at']
        ]
        
        for key in expired_keys:
            del self.query_cache[key]
        
        logger.info("Cleaned up old performance metrics and cache entries")


class QueryBuilder:
    """Optimized query builder with performance hints"""
    
    @staticmethod
    def build_financial_analysis_query(company_id: int, period: str) -> Tuple[str, Tuple]:
        """Build optimized query for financial analysis"""
        # Use indexed columns and limit result set
        query = """
        SELECT fa.*, c.industry, c.size
        FROM financial_analysis fa
        INNER JOIN companies c ON fa.company_id = c.id
        WHERE fa.company_id = $1 
        AND fa.analysis_period = $2
        ORDER BY fa.created_at DESC
        LIMIT 100
        """
        return query, (company_id, period)
    
    @staticmethod
    def build_market_data_query(symbols: List[str], start_date: datetime) -> Tuple[str, Tuple]:
        """Build optimized query for market data"""
        placeholders = ', '.join(f'${i+1}' for i in range(len(symbols)))
        query = f"""
        SELECT symbol, price, volume, timestamp
        FROM market_data
        WHERE symbol IN ({placeholders})
        AND timestamp >= ${len(symbols) + 1}
        ORDER BY timestamp DESC, symbol
        """
        return query, (*symbols, start_date)
    
    @staticmethod
    def build_user_analytics_query(user_id: int, days: int = 30) -> Tuple[str, Tuple]:
        """Build optimized query for user analytics"""
        query = """
        SELECT 
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as request_count,
            AVG(response_time) as avg_response_time
        FROM api_requests
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '%s days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        """
        return query, (user_id, days)


# Global database optimizer instance
db_optimizer = DatabaseOptimizer()
