"""
Frontier Integration Hub - Main Orchestrator

Central integration system connecting all components:
- Business operations modules
- AI models and ML infrastructure  
- Real-time data feeds
- WebSocket streaming
- Comprehensive monitoring
- Error handling and recovery
"""

import asyncio
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import websockets
import redis.asyncio as redis
from pathlib import Path
import sys
import traceback
import aiohttp
import psutil
from contextlib import asynccontextmanager
import signal

# Add project paths
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(project_root))

# Import all major components
from api.financial_analysis_engines import (
    FinancialRatioAnalyzer,
    CashFlowModeler,
    ValuationModels,
    RiskAssessmentFramework,
    IndustryBenchmarkComparison,
    FinancialStatementAnalyzer
)

from api.compliance import (
    ComplianceEngine,
    GDPRChecker,
    HIPAAChecker,
    SOXChecker,
    PCIDSSChecker,
    PolicyGenerator,
    RiskCalculator,
    AuditTrailManager
)

from orchestration.dynamic_loader import DynamicModuleLoader
from orchestration.module_router import ModuleRouter, ModuleRequest, QueryType
from ml.model_management.registry import ModelRegistry
from api.utils.database import DatabaseManager
from monitoring.performance_monitor import PerformanceMonitor
from api.middleware.rate_limiting import RateLimitManager
from api.config import settings

# Configure comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
    handlers=[
        logging.FileHandler('logs/integration_hub.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class IntegrationStatus(Enum):
    """System integration status"""
    INITIALIZING = "initializing"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    OFFLINE = "offline"


class ComponentType(Enum):
    """Types of system components"""
    API_ENDPOINT = "api_endpoint"
    AI_MODEL = "ai_model"
    DATA_FEED = "data_feed"
    DATABASE = "database"
    CACHE = "cache"
    WEBSOCKET = "websocket"
    MONITORING = "monitoring"
    COMPLIANCE = "compliance"


@dataclass
class ComponentHealth:
    """Health status of system components"""
    component_id: str
    component_type: ComponentType
    status: IntegrationStatus
    last_check: datetime
    response_time: float
    error_count: int
    metrics: Dict[str, Any]
    dependencies: List[str]


@dataclass
class DataFeedConfig:
    """Configuration for real-time data feeds"""
    feed_id: str
    source: str
    endpoint: str
    update_frequency: int  # seconds
    data_format: str
    authentication: Dict[str, str]
    filters: Dict[str, Any]
    enabled: bool


class IntegrationHub:
    """
    Central integration hub connecting all system components
    """
    
    def __init__(self):
        self.status = IntegrationStatus.INITIALIZING
        self.components: Dict[str, ComponentHealth] = {}
        self.data_feeds: Dict[str, DataFeedConfig] = {}
        self.websocket_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
        # Core systems
        self.module_router: Optional[ModuleRouter] = None
        self.model_registry: Optional[ModelRegistry] = None
        self.db_manager: Optional[DatabaseManager] = None
        self.redis_client: Optional[redis.Redis] = None
        self.performance_monitor: Optional[PerformanceMonitor] = None
        
        # Business engines
        self.financial_analyzer: Optional[FinancialRatioAnalyzer] = None
        self.compliance_engine: Optional[ComplianceEngine] = None
        self.risk_calculator: Optional[RiskCalculator] = None
        
        # Data feed handlers
        self.feed_handlers: Dict[str, Callable] = {}
        self.feed_tasks: Dict[str, asyncio.Task] = {}
        
        # WebSocket handlers
        self.ws_handlers: Dict[str, Callable] = {}
        
        # Monitoring and recovery
        self.health_check_interval = 30  # seconds
        self.error_recovery_enabled = True
        self.graceful_shutdown = False
        
        logger.info("Integration Hub initialized")
    
    async def initialize(self):
        """Initialize all system components"""
        try:
            logger.info("Starting Integration Hub initialization")
            
            # 1. Initialize core infrastructure
            await self._initialize_infrastructure()
            
            # 2. Initialize business modules
            await self._initialize_business_modules()
            
            # 3. Initialize AI models
            await self._initialize_ai_models()
            
            # 4. Setup real-time data feeds
            await self._initialize_data_feeds()
            
            # 5. Setup WebSocket infrastructure
            await self._initialize_websockets()
            
            # 6. Initialize monitoring
            await self._initialize_monitoring()
            
            # 7. Setup error handling
            await self._setup_error_handling()
            
            # 8. Start health monitoring
            await self._start_health_monitoring()
            
            self.status = IntegrationStatus.HEALTHY
            logger.info("Integration Hub initialization completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Integration Hub: {e}")
            self.status = IntegrationStatus.CRITICAL
            raise
    
    async def _initialize_infrastructure(self):
        """Initialize core infrastructure components"""
        logger.info("Initializing core infrastructure")
        
        try:
            # Database manager
            self.db_manager = DatabaseManager()
            await self.db_manager.initialize()
            self._register_component("database", ComponentType.DATABASE, self.db_manager)
            
            # Redis for caching and rate limiting
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True
            )
            await self.redis_client.ping()
            self._register_component("redis", ComponentType.CACHE, self.redis_client)
            
            # Module router for AI orchestration
            self.module_router = ModuleRouter()
            await self.module_router.initialize()
            self._register_component("module_router", ComponentType.AI_MODEL, self.module_router)
            
            # Model registry
            self.model_registry = ModelRegistry()
            await self.model_registry.initialize()
            self._register_component("model_registry", ComponentType.AI_MODEL, self.model_registry)
            
            logger.info("Core infrastructure initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize infrastructure: {e}")
            raise
    
    async def _initialize_business_modules(self):
        """Initialize business operation modules"""
        logger.info("Initializing business modules")
        
        try:
            # Financial analysis engines
            self.financial_analyzer = FinancialRatioAnalyzer()
            self._register_component("financial_analyzer", ComponentType.API_ENDPOINT, self.financial_analyzer)
            
            # Compliance engine
            self.compliance_engine = ComplianceEngine()
            self._register_component("compliance_engine", ComponentType.COMPLIANCE, self.compliance_engine)
            
            # Risk calculator
            self.risk_calculator = RiskCalculator()
            self._register_component("risk_calculator", ComponentType.API_ENDPOINT, self.risk_calculator)
            
            logger.info("Business modules initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize business modules: {e}")
            raise
    
    async def _initialize_ai_models(self):
        """Initialize and connect AI models"""
        logger.info("Initializing AI models")
        
        try:
            # Register available models
            models_config = {
                "gpt-4": {
                    "type": "language_model",
                    "capabilities": ["text_generation", "reasoning", "analysis"],
                    "max_tokens": 8192,
                    "endpoint": "openai"
                },
                "claude-3": {
                    "type": "language_model", 
                    "capabilities": ["text_generation", "reasoning", "code"],
                    "max_tokens": 100000,
                    "endpoint": "anthropic"
                },
                "financial_lstm": {
                    "type": "predictive_model",
                    "capabilities": ["financial_forecasting", "trend_analysis"],
                    "input_features": ["price", "volume", "sentiment"],
                    "endpoint": "local"
                }
            }
            
            for model_id, config in models_config.items():
                await self.model_registry.register_model(model_id, config)
                self._register_component(f"model_{model_id}", ComponentType.AI_MODEL, config)
            
            logger.info("AI models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize AI models: {e}")
            raise
    
    async def _initialize_data_feeds(self):
        """Initialize real-time data feeds"""
        logger.info("Initializing real-time data feeds")
        
        try:
            # Configure data feeds
            feed_configs = [
                DataFeedConfig(
                    feed_id="market_data",
                    source="alpha_vantage",
                    endpoint="https://www.alphavantage.co/query",
                    update_frequency=60,
                    data_format="json",
                    authentication={"apikey": settings.ALPHA_VANTAGE_API_KEY},
                    filters={"symbols": ["SPY", "QQQ", "IWM", "GLD"]},
                    enabled=True
                ),
                DataFeedConfig(
                    feed_id="economic_data",
                    source="fed_economic_data",
                    endpoint="https://api.stlouisfed.org/fred/series/observations",
                    update_frequency=3600,  # 1 hour
                    data_format="json",
                    authentication={"api_key": settings.FRED_API_KEY},
                    filters={"series_id": ["GDP", "UNRATE", "CPIAUCSL"]},
                    enabled=True
                ),
                DataFeedConfig(
                    feed_id="news_sentiment",
                    source="news_api",
                    endpoint="https://newsapi.org/v2/everything",
                    update_frequency=300,  # 5 minutes
                    data_format="json",
                    authentication={"apiKey": settings.NEWS_API_KEY},
                    filters={"q": "finance OR economy OR market", "language": "en"},
                    enabled=True
                ),
                DataFeedConfig(
                    feed_id="gold_prices",
                    source="metals_api",
                    endpoint="https://metals-api.com/api/latest",
                    update_frequency=120,  # 2 minutes
                    data_format="json",
                    authentication={"access_key": settings.METALS_API_KEY},
                    filters={"base": "USD", "symbols": "XAU,XAG,XPT,XPD"},
                    enabled=True
                )
            ]
            
            # Register and start data feeds
            for config in feed_configs:
                self.data_feeds[config.feed_id] = config
                if config.enabled:
                    handler = self._create_feed_handler(config)
                    self.feed_handlers[config.feed_id] = handler
                    task = asyncio.create_task(self._run_data_feed(config))
                    self.feed_tasks[config.feed_id] = task
                    
                    self._register_component(
                        f"feed_{config.feed_id}", 
                        ComponentType.DATA_FEED, 
                        config
                    )
            
            logger.info(f"Initialized {len(feed_configs)} data feeds")
            
        except Exception as e:
            logger.error(f"Failed to initialize data feeds: {e}")
            raise
    
    async def _initialize_websockets(self):
        """Initialize WebSocket infrastructure"""
        logger.info("Initializing WebSocket infrastructure")
        
        try:
            # Register WebSocket handlers
            self.ws_handlers = {
                "financial_analysis": self._handle_financial_analysis_ws,
                "market_data": self._handle_market_data_ws,
                "compliance_monitoring": self._handle_compliance_ws,
                "risk_assessment": self._handle_risk_assessment_ws,
                "ai_reasoning": self._handle_ai_reasoning_ws
            }
            
            self._register_component("websocket_server", ComponentType.WEBSOCKET, self.ws_handlers)
            logger.info("WebSocket infrastructure initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize WebSockets: {e}")
            raise
    
    async def _initialize_monitoring(self):
        """Initialize monitoring and performance tracking"""
        logger.info("Initializing monitoring system")
        
        try:
            self.performance_monitor = PerformanceMonitor()
            await self.performance_monitor.initialize()
            self._register_component("performance_monitor", ComponentType.MONITORING, self.performance_monitor)
            
            logger.info("Monitoring system initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize monitoring: {e}")
            raise
    
    async def _setup_error_handling(self):
        """Setup comprehensive error handling and recovery"""
        logger.info("Setting up error handling and recovery")
        
        try:
            # Setup signal handlers for graceful shutdown
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            # Setup exception handlers for different component types
            self.error_handlers = {
                ComponentType.API_ENDPOINT: self._handle_api_error,
                ComponentType.AI_MODEL: self._handle_ai_model_error,
                ComponentType.DATA_FEED: self._handle_data_feed_error,
                ComponentType.DATABASE: self._handle_database_error,
                ComponentType.WEBSOCKET: self._handle_websocket_error
            }
            
            logger.info("Error handling setup completed")
            
        except Exception as e:
            logger.error(f"Failed to setup error handling: {e}")
            raise
    
    async def _start_health_monitoring(self):
        """Start continuous health monitoring"""
        logger.info("Starting health monitoring")
        
        try:
            # Start health check task
            health_task = asyncio.create_task(self._health_check_loop())
            self.feed_tasks["health_monitor"] = health_task
            
            logger.info("Health monitoring started")
            
        except Exception as e:
            logger.error(f"Failed to start health monitoring: {e}")
            raise
    
    def _register_component(self, component_id: str, component_type: ComponentType, component: Any):
        """Register a component for monitoring"""
        self.components[component_id] = ComponentHealth(
            component_id=component_id,
            component_type=component_type,
            status=IntegrationStatus.HEALTHY,
            last_check=datetime.now(),
            response_time=0.0,
            error_count=0,
            metrics={},
            dependencies=[]
        )
        logger.debug(f"Registered component: {component_id}")
    
    def _create_feed_handler(self, config: DataFeedConfig) -> Callable:
        """Create a handler for specific data feed"""
        async def handler(data: Dict[str, Any]):
            try:
                # Process and cache the data
                processed_data = await self._process_feed_data(config.feed_id, data)
                
                # Store in Redis with expiration
                cache_key = f"feed_data:{config.feed_id}"
                await self.redis_client.setex(
                    cache_key, 
                    config.update_frequency * 2,  # Cache for 2x update frequency
                    json.dumps(processed_data)
                )
                
                # Broadcast to WebSocket subscribers
                await self._broadcast_feed_update(config.feed_id, processed_data)
                
                # Update component health
                if config.feed_id in self.components:
                    self.components[f"feed_{config.feed_id}"].last_check = datetime.now()
                    self.components[f"feed_{config.feed_id}"].status = IntegrationStatus.HEALTHY
                
                logger.debug(f"Processed data feed: {config.feed_id}")
                
            except Exception as e:
                logger.error(f"Error processing feed {config.feed_id}: {e}")
                await self._handle_data_feed_error(config.feed_id, e)
        
        return handler
    
    async def _run_data_feed(self, config: DataFeedConfig):
        """Run a data feed continuously"""
        logger.info(f"Starting data feed: {config.feed_id}")
        
        while not self.graceful_shutdown:
            try:
                # Fetch data from source
                data = await self._fetch_feed_data(config)
                
                # Process with handler
                if config.feed_id in self.feed_handlers:
                    await self.feed_handlers[config.feed_id](data)
                
                # Wait for next update
                await asyncio.sleep(config.update_frequency)
                
            except Exception as e:
                logger.error(f"Error in data feed {config.feed_id}: {e}")
                await self._handle_data_feed_error(config.feed_id, e)
                
                # Exponential backoff on error
                await asyncio.sleep(min(config.update_frequency * 2, 300))
    
    async def _fetch_feed_data(self, config: DataFeedConfig) -> Dict[str, Any]:
        """Fetch data from external source"""
        async with aiohttp.ClientSession() as session:
            params = {**config.authentication, **config.filters}
            
            async with session.get(config.endpoint, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"HTTP {response.status}: {await response.text()}")
    
    async def _process_feed_data(self, feed_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw feed data"""
        processed = {
            "feed_id": feed_id,
            "timestamp": datetime.now().isoformat(),
            "data": data,
            "processed_at": time.time()
        }
        
        # Feed-specific processing
        if feed_id == "market_data":
            processed["indicators"] = await self._calculate_market_indicators(data)
        elif feed_id == "news_sentiment":
            processed["sentiment_score"] = await self._analyze_news_sentiment(data)
        elif feed_id == "gold_prices":
            processed["price_change"] = await self._calculate_price_changes(data)
        
        return processed
    
    async def _calculate_market_indicators(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate technical indicators from market data"""
        # Implement technical analysis indicators
        return {
            "rsi": 50.0,  # Placeholder
            "moving_averages": {"sma_20": 100.0, "sma_50": 105.0},
            "volatility": 0.15
        }
    
    async def _analyze_news_sentiment(self, data: Dict[str, Any]) -> float:
        """Analyze sentiment from news data"""
        # Use AI model for sentiment analysis
        if self.module_router:
            request = ModuleRequest(
                query_id=f"sentiment_{int(time.time())}",
                user_id="system",
                query_text=json.dumps(data),
                query_type=QueryType.BUSINESS_ANALYSIS,
                context={"analysis_type": "sentiment"},
                parameters={"return_score": True},
                timestamp=datetime.now()
            )
            result = await self.module_router.route_request(request)
            return result.get("sentiment_score", 0.0)
        return 0.0
    
    async def _calculate_price_changes(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate price changes and trends"""
        return {
            "daily_change_pct": 0.0,
            "weekly_change_pct": 0.0,
            "trend": "neutral"
        }
    
    async def _broadcast_feed_update(self, feed_id: str, data: Dict[str, Any]):
        """Broadcast data feed update to WebSocket subscribers"""
        message = {
            "type": "feed_update",
            "feed_id": feed_id,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        # Send to all connected WebSocket clients subscribed to this feed
        disconnected = []
        for session_id, ws in self.websocket_connections.items():
            try:
                session = self.active_sessions.get(session_id, {})
                subscriptions = session.get("subscriptions", [])
                
                if feed_id in subscriptions:
                    await ws.send(json.dumps(message))
                    
            except websockets.exceptions.ConnectionClosed:
                disconnected.append(session_id)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket {session_id}: {e}")
        
        # Clean up disconnected clients
        for session_id in disconnected:
            if session_id in self.websocket_connections:
                del self.websocket_connections[session_id]
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
    
    async def _health_check_loop(self):
        """Continuous health monitoring loop"""
        while not self.graceful_shutdown:
            try:
                await self._perform_health_checks()
                await asyncio.sleep(self.health_check_interval)
                
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(self.health_check_interval)
    
    async def _perform_health_checks(self):
        """Perform health checks on all components"""
        for component_id, health in self.components.items():
            try:
                start_time = time.time()
                
                # Component-specific health checks
                if health.component_type == ComponentType.DATABASE:
                    await self.db_manager.health_check()
                elif health.component_type == ComponentType.CACHE:
                    await self.redis_client.ping()
                elif health.component_type == ComponentType.AI_MODEL:
                    # Simple ping test for AI models
                    pass
                elif health.component_type == ComponentType.DATA_FEED:
                    # Check last update time
                    cache_key = f"feed_data:{component_id.replace('feed_', '')}"
                    last_update = await self.redis_client.get(cache_key)
                    if not last_update:
                        raise Exception("No recent data")
                
                # Update health metrics
                response_time = time.time() - start_time
                health.response_time = response_time
                health.last_check = datetime.now()
                health.status = IntegrationStatus.HEALTHY
                
                # System metrics
                health.metrics = {
                    "cpu_percent": psutil.cpu_percent(),
                    "memory_percent": psutil.virtual_memory().percent,
                    "disk_usage": psutil.disk_usage('/').percent,
                    "response_time": response_time
                }
                
            except Exception as e:
                logger.warning(f"Health check failed for {component_id}: {e}")
                health.error_count += 1
                health.status = IntegrationStatus.DEGRADED
                
                # Attempt recovery if enabled
                if self.error_recovery_enabled:
                    await self._attempt_component_recovery(component_id, health)
    
    async def _attempt_component_recovery(self, component_id: str, health: ComponentHealth):
        """Attempt to recover a failed component"""
        logger.info(f"Attempting recovery for component: {component_id}")
        
        try:
            if health.component_type == ComponentType.DATA_FEED:
                # Restart data feed
                feed_id = component_id.replace("feed_", "")
                if feed_id in self.feed_tasks:
                    self.feed_tasks[feed_id].cancel()
                    
                    config = self.data_feeds[feed_id]
                    task = asyncio.create_task(self._run_data_feed(config))
                    self.feed_tasks[feed_id] = task
                    
                    logger.info(f"Restarted data feed: {feed_id}")
                    
            elif health.component_type == ComponentType.DATABASE:
                # Reconnect database
                await self.db_manager.reconnect()
                logger.info("Reconnected to database")
                
            elif health.component_type == ComponentType.CACHE:
                # Reconnect Redis
                await self.redis_client.connection_pool.disconnect()
                await self.redis_client.ping()
                logger.info("Reconnected to Redis")
            
            # Reset error count on successful recovery
            health.error_count = 0
            health.status = IntegrationStatus.HEALTHY
            
        except Exception as e:
            logger.error(f"Failed to recover component {component_id}: {e}")
            health.status = IntegrationStatus.CRITICAL
    
    # WebSocket Handlers
    async def _handle_financial_analysis_ws(self, websocket, session_id: str, message: Dict[str, Any]):
        """Handle financial analysis WebSocket requests"""
        try:
            request_type = message.get("type")
            data = message.get("data", {})
            
            if request_type == "analyze_financial_data":
                # Stream financial analysis results
                if self.financial_analyzer:
                    result = await self.financial_analyzer.analyze_financial_statements(data)
                    response = {
                        "type": "financial_analysis_result",
                        "session_id": session_id,
                        "data": result,
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(response))
            
            elif request_type == "subscribe_market_updates":
                # Add to market data subscriptions
                session = self.active_sessions.get(session_id, {})
                subscriptions = session.get("subscriptions", [])
                subscriptions.append("market_data")
                session["subscriptions"] = subscriptions
                self.active_sessions[session_id] = session
                
        except Exception as e:
            logger.error(f"Error in financial analysis WebSocket handler: {e}")
            await self._send_websocket_error(websocket, session_id, str(e))
    
    async def _handle_market_data_ws(self, websocket, session_id: str, message: Dict[str, Any]):
        """Handle market data WebSocket requests"""
        try:
            request_type = message.get("type")
            
            if request_type == "subscribe_symbols":
                symbols = message.get("symbols", [])
                session = self.active_sessions.get(session_id, {})
                session["subscribed_symbols"] = symbols
                self.active_sessions[session_id] = session
                
                # Send initial data
                for symbol in symbols:
                    cache_key = f"market_data:{symbol}"
                    cached_data = await self.redis_client.get(cache_key)
                    if cached_data:
                        response = {
                            "type": "market_data",
                            "symbol": symbol,
                            "data": json.loads(cached_data),
                            "timestamp": datetime.now().isoformat()
                        }
                        await websocket.send(json.dumps(response))
                        
        except Exception as e:
            logger.error(f"Error in market data WebSocket handler: {e}")
            await self._send_websocket_error(websocket, session_id, str(e))
    
    async def _handle_compliance_ws(self, websocket, session_id: str, message: Dict[str, Any]):
        """Handle compliance monitoring WebSocket requests"""
        try:
            request_type = message.get("type")
            data = message.get("data", {})
            
            if request_type == "compliance_assessment":
                if self.compliance_engine:
                    result = await self.compliance_engine.perform_compliance_assessment(
                        organization_data=data,
                        regulations=data.get("regulations", ["GDPR"]),
                        scope="full"
                    )
                    response = {
                        "type": "compliance_result",
                        "session_id": session_id,
                        "data": asdict(result),
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(response))
                    
        except Exception as e:
            logger.error(f"Error in compliance WebSocket handler: {e}")
            await self._send_websocket_error(websocket, session_id, str(e))
    
    async def _handle_risk_assessment_ws(self, websocket, session_id: str, message: Dict[str, Any]):
        """Handle risk assessment WebSocket requests"""
        try:
            request_type = message.get("type")
            data = message.get("data", {})
            
            if request_type == "calculate_risk":
                if self.risk_calculator:
                    result = await self.risk_calculator.calculate_compliance_risk(
                        organization_data=data,
                        regulation=data.get("regulation", "GDPR")
                    )
                    response = {
                        "type": "risk_assessment_result",
                        "session_id": session_id,
                        "data": asdict(result),
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send(json.dumps(response))
                    
        except Exception as e:
            logger.error(f"Error in risk assessment WebSocket handler: {e}")
            await self._send_websocket_error(websocket, session_id, str(e))
    
    async def _handle_ai_reasoning_ws(self, websocket, session_id: str, message: Dict[str, Any]):
        """Handle AI reasoning WebSocket requests"""
        try:
            request_type = message.get("type")
            
            if request_type == "ai_query":
                query = message.get("query", "")
                context = message.get("context", {})
                
                if self.module_router:
                    request = ModuleRequest(
                        query_id=f"ws_{session_id}_{int(time.time())}",
                        user_id=session_id,
                        query_text=query,
                        query_type=QueryType.GENERAL,
                        context=context,
                        parameters={"stream": True},
                        timestamp=datetime.now()
                    )
                    
                    # Stream AI response
                    async for chunk in self.module_router.stream_response(request):
                        response = {
                            "type": "ai_response_chunk",
                            "session_id": session_id,
                            "chunk": chunk,
                            "timestamp": datetime.now().isoformat()
                        }
                        await websocket.send(json.dumps(response))
                        
        except Exception as e:
            logger.error(f"Error in AI reasoning WebSocket handler: {e}")
            await self._send_websocket_error(websocket, session_id, str(e))
    
    async def _send_websocket_error(self, websocket, session_id: str, error_message: str):
        """Send error message via WebSocket"""
        try:
            error_response = {
                "type": "error",
                "session_id": session_id,
                "error": error_message,
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))
        except Exception as e:
            logger.error(f"Failed to send WebSocket error: {e}")
    
    # Error Handlers
    async def _handle_api_error(self, component_id: str, error: Exception):
        """Handle API endpoint errors"""
        logger.error(f"API error in {component_id}: {error}")
        # Implement API-specific error handling
    
    async def _handle_ai_model_error(self, component_id: str, error: Exception):
        """Handle AI model errors"""
        logger.error(f"AI model error in {component_id}: {error}")
        # Implement fallback model selection
        if self.module_router:
            await self.module_router.handle_model_failure(component_id)
    
    async def _handle_data_feed_error(self, component_id: str, error: Exception):
        """Handle data feed errors"""
        logger.error(f"Data feed error in {component_id}: {error}")
        
        # Update component status
        if component_id in self.components:
            self.components[component_id].error_count += 1
            self.components[component_id].status = IntegrationStatus.DEGRADED
    
    async def _handle_database_error(self, component_id: str, error: Exception):
        """Handle database errors"""
        logger.error(f"Database error in {component_id}: {error}")
        # Implement database connection recovery
        if self.db_manager:
            await self.db_manager.handle_connection_error()
    
    async def _handle_websocket_error(self, component_id: str, error: Exception):
        """Handle WebSocket errors"""
        logger.error(f"WebSocket error in {component_id}: {error}")
        # Clean up broken connections
        
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown")
        self.graceful_shutdown = True
    
    async def shutdown(self):
        """Graceful shutdown of all components"""
        logger.info("Starting graceful shutdown")
        self.graceful_shutdown = True
        
        try:
            # Cancel all data feed tasks
            for task in self.feed_tasks.values():
                task.cancel()
            
            # Close WebSocket connections
            for ws in self.websocket_connections.values():
                await ws.close()
            
            # Close database connections
            if self.db_manager:
                await self.db_manager.close()
            
            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()
            
            self.status = IntegrationStatus.OFFLINE
            logger.info("Graceful shutdown completed")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        healthy_components = sum(1 for h in self.components.values() if h.status == IntegrationStatus.HEALTHY)
        total_components = len(self.components)
        
        return {
            "overall_status": self.status.value,
            "components": {
                "total": total_components,
                "healthy": healthy_components,
                "degraded": sum(1 for h in self.components.values() if h.status == IntegrationStatus.DEGRADED),
                "critical": sum(1 for h in self.components.values() if h.status == IntegrationStatus.CRITICAL)
            },
            "data_feeds": {
                "total": len(self.data_feeds),
                "active": len(self.feed_tasks),
                "enabled": sum(1 for f in self.data_feeds.values() if f.enabled)
            },
            "websockets": {
                "active_connections": len(self.websocket_connections),
                "active_sessions": len(self.active_sessions)
            },
            "system_metrics": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent
            },
            "timestamp": datetime.now().isoformat()
        }


# Global integration hub instance
integration_hub = IntegrationHub()


# Convenience functions for external access
async def initialize_integration_hub():
    """Initialize the integration hub"""
    await integration_hub.initialize()


async def get_integration_status():
    """Get current integration status"""
    return integration_hub.get_system_status()


async def shutdown_integration_hub():
    """Shutdown the integration hub"""
    await integration_hub.shutdown()
