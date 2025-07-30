"""
Frontier Real-Time Data Feed Orchestrator

Comprehensive data feed management system providing:
- Multi-source financial data aggregation
- Real-time market data streaming
- Economic indicators monitoring
- News sentiment analysis
- Alternative data integration
- Data quality validation
- Feed health monitoring
"""

import asyncio
import aiohttp
import aioredis
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, asdict, field
from enum import Enum
import statistics
import hashlib
from pathlib import Path
import sys
import pandas as pd
import numpy as np

# Add project path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(project_root))

from api.config import settings

logger = logging.getLogger(__name__)


class DataSourceType(Enum):
    """Types of data sources"""
    MARKET_DATA = "market_data"
    ECONOMIC_DATA = "economic_data"
    NEWS_SENTIMENT = "news_sentiment"
    ALTERNATIVE_DATA = "alternative_data"
    CRYPTOCURRENCY = "cryptocurrency"
    FOREX = "forex"
    COMMODITIES = "commodities"
    OPTIONS = "options"


class DataQuality(Enum):
    """Data quality levels"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class FeedStatus(Enum):
    """Feed operational status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    MAINTENANCE = "maintenance"


@dataclass
class DataPoint:
    """Individual data point structure"""
    source: str
    symbol: str
    timestamp: datetime
    data_type: str
    value: Union[float, str, Dict[str, Any]]
    metadata: Dict[str, Any] = field(default_factory=dict)
    quality: DataQuality = DataQuality.UNKNOWN


@dataclass
class DataFeedConfig:
    """Configuration for a data feed"""
    feed_id: str
    name: str
    source_type: DataSourceType
    endpoint: str
    api_key: Optional[str]
    update_frequency: int  # seconds
    symbols: List[str]
    parameters: Dict[str, Any]
    transformations: List[str]
    quality_checks: List[str]
    enabled: bool
    priority: int  # 1-10, higher is more important
    retry_attempts: int = 3
    timeout: int = 30


@dataclass
class FeedHealth:
    """Health metrics for a data feed"""
    feed_id: str
    status: FeedStatus
    last_update: Optional[datetime]
    update_count: int
    error_count: int
    average_latency: float
    data_quality: DataQuality
    uptime_percentage: float
    next_update: Optional[datetime]


class DataTransformer:
    """Data transformation utilities"""
    
    @staticmethod
    def normalize_price_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize price data across different sources"""
        normalized = {
            "symbol": data.get("symbol", "").upper(),
            "timestamp": data.get("timestamp"),
            "open": float(data.get("open", 0)),
            "high": float(data.get("high", 0)),
            "low": float(data.get("low", 0)),
            "close": float(data.get("close", 0)),
            "volume": int(data.get("volume", 0)),
            "source": data.get("source", "unknown")
        }
        return normalized
    
    @staticmethod
    def calculate_technical_indicators(prices: List[float], period: int = 20) -> Dict[str, float]:
        """Calculate basic technical indicators"""
        if len(prices) < period:
            return {}
        
        recent_prices = prices[-period:]
        
        return {
            "sma": statistics.mean(recent_prices),
            "volatility": statistics.stdev(recent_prices) if len(recent_prices) > 1 else 0.0,
            "rsi": DataTransformer._calculate_rsi(prices, period),
            "price_change": (prices[-1] - prices[-2]) / prices[-2] * 100 if len(prices) > 1 else 0.0
        }
    
    @staticmethod
    def _calculate_rsi(prices: List[float], period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0
        
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [delta if delta > 0 else 0 for delta in deltas]
        losses = [-delta if delta < 0 else 0 for delta in deltas]
        
        avg_gain = statistics.mean(gains[-period:])
        avg_loss = statistics.mean(losses[-period:])
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    @staticmethod
    def analyze_sentiment(text: str) -> Dict[str, Any]:
        """Basic sentiment analysis (placeholder for more sophisticated analysis)"""
        # In a real implementation, this would use NLP libraries or AI models
        positive_words = ["bullish", "growth", "profit", "rise", "increase", "gain", "strong"]
        negative_words = ["bearish", "decline", "loss", "fall", "decrease", "weak", "drop"]
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        total_words = len(text.split())
        sentiment_score = (positive_count - negative_count) / max(total_words, 1)
        
        return {
            "sentiment_score": max(-1.0, min(1.0, sentiment_score)),
            "positive_indicators": positive_count,
            "negative_indicators": negative_count,
            "confidence": min(1.0, (positive_count + negative_count) / max(total_words, 1))
        }


class DataQualityValidator:
    """Data quality validation utilities"""
    
    @staticmethod
    def validate_price_data(data: Dict[str, Any]) -> DataQuality:
        """Validate price data quality"""
        required_fields = ["open", "high", "low", "close", "volume"]
        
        # Check for missing fields
        if not all(field in data for field in required_fields):
            return DataQuality.LOW
        
        try:
            # Check for reasonable values
            ohlc = [float(data[field]) for field in ["open", "high", "low", "close"]]
            volume = float(data["volume"])
            
            # Basic sanity checks
            if any(price <= 0 for price in ohlc):
                return DataQuality.LOW
            
            if data["high"] < max(data["open"], data["close"]) or data["low"] > min(data["open"], data["close"]):
                return DataQuality.LOW
            
            if volume < 0:
                return DataQuality.LOW
            
            # Check for extreme price movements (>50% in a single update)
            if max(ohlc) / min(ohlc) > 1.5:
                return DataQuality.MEDIUM
            
            return DataQuality.HIGH
            
        except (ValueError, TypeError):
            return DataQuality.LOW
    
    @staticmethod
    def validate_economic_data(data: Dict[str, Any]) -> DataQuality:
        """Validate economic data quality"""
        if "value" not in data or "series_id" not in data:
            return DataQuality.LOW
        
        try:
            value = float(data["value"])
            if np.isnan(value) or np.isinf(value):
                return DataQuality.LOW
            
            return DataQuality.HIGH
            
        except (ValueError, TypeError):
            return DataQuality.LOW
    
    @staticmethod
    def check_data_freshness(timestamp: datetime, max_age_minutes: int = 30) -> bool:
        """Check if data is fresh enough"""
        age = (datetime.now() - timestamp).total_seconds() / 60
        return age <= max_age_minutes


class RealTimeDataOrchestrator:
    """
    Main orchestrator for real-time data feeds
    """
    
    def __init__(self):
        self.feeds: Dict[str, DataFeedConfig] = {}
        self.feed_health: Dict[str, FeedHealth] = {}
        self.feed_tasks: Dict[str, asyncio.Task] = {}
        
        # Data storage
        self.redis_client: Optional[aioredis.Redis] = None
        self.data_buffer: Dict[str, List[DataPoint]] = {}
        
        # Feed handlers
        self.source_handlers: Dict[DataSourceType, Callable] = {
            DataSourceType.MARKET_DATA: self._handle_market_data,
            DataSourceType.ECONOMIC_DATA: self._handle_economic_data,
            DataSourceType.NEWS_SENTIMENT: self._handle_news_sentiment,
            DataSourceType.CRYPTOCURRENCY: self._handle_crypto_data,
            DataSourceType.FOREX: self._handle_forex_data,
            DataSourceType.COMMODITIES: self._handle_commodities_data
        }
        
        # Configuration
        self.max_buffer_size = 1000
        self.health_check_interval = 60  # seconds
        self.data_retention_hours = 24
        
        logger.info("Real-Time Data Orchestrator initialized")
    
    async def initialize(self):
        """Initialize the data orchestrator"""
        try:
            # Connect to Redis
            self.redis_client = aioredis.from_url(
                f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            
            # Setup default feeds
            await self._setup_default_feeds()
            
            # Start health monitoring
            asyncio.create_task(self._health_monitoring_loop())
            
            logger.info("Real-Time Data Orchestrator initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Data Orchestrator: {e}")
            raise
    
    async def _setup_default_feeds(self):
        """Setup default data feeds"""
        default_feeds = [
            DataFeedConfig(
                feed_id="alpha_vantage_equity",
                name="Alpha Vantage Stock Data",
                source_type=DataSourceType.MARKET_DATA,
                endpoint="https://www.alphavantage.co/query",
                api_key=getattr(settings, "ALPHA_VANTAGE_API_KEY", None),
                update_frequency=60,
                symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "SPY"],
                parameters={"function": "TIME_SERIES_INTRADAY", "interval": "1min"},
                transformations=["normalize_price", "calculate_indicators"],
                quality_checks=["validate_price_data", "check_freshness"],
                enabled=True,
                priority=8
            ),
            DataFeedConfig(
                feed_id="fred_economic",
                name="FRED Economic Data",
                source_type=DataSourceType.ECONOMIC_DATA,
                endpoint="https://api.stlouisfed.org/fred/series/observations",
                api_key=getattr(settings, "FRED_API_KEY", None),
                update_frequency=3600,  # 1 hour
                symbols=["GDP", "UNRATE", "CPIAUCSL", "FEDFUNDS"],
                parameters={"file_type": "json", "limit": "1"},
                transformations=["normalize_economic"],
                quality_checks=["validate_economic_data"],
                enabled=True,
                priority=6
            ),
            DataFeedConfig(
                feed_id="news_api_sentiment",
                name="News API Sentiment",
                source_type=DataSourceType.NEWS_SENTIMENT,
                endpoint="https://newsapi.org/v2/everything",
                api_key=getattr(settings, "NEWS_API_KEY", None),
                update_frequency=300,  # 5 minutes
                symbols=["financial", "economy", "market"],
                parameters={"language": "en", "sortBy": "publishedAt", "pageSize": "10"},
                transformations=["analyze_sentiment"],
                quality_checks=["check_freshness"],
                enabled=True,
                priority=5
            ),
            DataFeedConfig(
                feed_id="coinbase_crypto",
                name="Coinbase Cryptocurrency",
                source_type=DataSourceType.CRYPTOCURRENCY,
                endpoint="https://api.coinbase.com/v2/exchange-rates",
                api_key=None,
                update_frequency=30,
                symbols=["BTC", "ETH", "LTC", "ADA"],
                parameters={"currency": "USD"},
                transformations=["normalize_crypto"],
                quality_checks=["validate_price_data"],
                enabled=True,
                priority=7
            ),
            DataFeedConfig(
                feed_id="metals_api_commodities",
                name="Metals API Commodities",
                source_type=DataSourceType.COMMODITIES,
                endpoint="https://metals-api.com/api/latest",
                api_key=getattr(settings, "METALS_API_KEY", None),
                update_frequency=120,  # 2 minutes
                symbols=["XAU", "XAG", "XPT", "XPD"],
                parameters={"base": "USD"},
                transformations=["normalize_commodities"],
                quality_checks=["validate_price_data"],
                enabled=True,
                priority=6
            )
        ]
        
        for config in default_feeds:
            await self.add_feed(config)
    
    async def add_feed(self, config: DataFeedConfig):
        """Add a new data feed"""
        try:
            # Validate configuration
            if not config.api_key and config.feed_id not in ["coinbase_crypto"]:
                logger.warning(f"No API key provided for {config.feed_id}, feed disabled")
                config.enabled = False
            
            self.feeds[config.feed_id] = config
            
            # Initialize health tracking
            self.feed_health[config.feed_id] = FeedHealth(
                feed_id=config.feed_id,
                status=FeedStatus.INACTIVE,
                last_update=None,
                update_count=0,
                error_count=0,
                average_latency=0.0,
                data_quality=DataQuality.UNKNOWN,
                uptime_percentage=100.0,
                next_update=None
            )
            
            # Start feed if enabled
            if config.enabled:
                await self.start_feed(config.feed_id)
            
            logger.info(f"Added data feed: {config.name}")
            
        except Exception as e:
            logger.error(f"Error adding feed {config.feed_id}: {e}")
    
    async def start_feed(self, feed_id: str):
        """Start a specific data feed"""
        try:
            if feed_id not in self.feeds:
                raise ValueError(f"Unknown feed: {feed_id}")
            
            config = self.feeds[feed_id]
            
            # Stop existing task if running
            if feed_id in self.feed_tasks:
                self.feed_tasks[feed_id].cancel()
            
            # Start new task
            task = asyncio.create_task(self._run_feed(config))
            self.feed_tasks[feed_id] = task
            
            self.feed_health[feed_id].status = FeedStatus.ACTIVE
            
            logger.info(f"Started data feed: {config.name}")
            
        except Exception as e:
            logger.error(f"Error starting feed {feed_id}: {e}")
            if feed_id in self.feed_health:
                self.feed_health[feed_id].status = FeedStatus.ERROR
    
    async def stop_feed(self, feed_id: str):
        """Stop a specific data feed"""
        try:
            if feed_id in self.feed_tasks:
                self.feed_tasks[feed_id].cancel()
                del self.feed_tasks[feed_id]
            
            if feed_id in self.feed_health:
                self.feed_health[feed_id].status = FeedStatus.INACTIVE
            
            logger.info(f"Stopped data feed: {feed_id}")
            
        except Exception as e:
            logger.error(f"Error stopping feed {feed_id}: {e}")
    
    async def _run_feed(self, config: DataFeedConfig):
        """Run a data feed continuously"""
        while True:
            try:
                start_time = asyncio.get_event_loop().time()
                
                # Fetch data
                await self._fetch_feed_data(config)
                
                # Update health metrics
                latency = asyncio.get_event_loop().time() - start_time
                await self._update_feed_health(config.feed_id, latency, success=True)
                
                # Wait for next update
                await asyncio.sleep(config.update_frequency)
                
            except asyncio.CancelledError:
                logger.info(f"Feed {config.feed_id} cancelled")
                break
            except Exception as e:
                logger.error(f"Error in feed {config.feed_id}: {e}")
                await self._update_feed_health(config.feed_id, 0.0, success=False)
                
                # Exponential backoff on error
                await asyncio.sleep(min(config.update_frequency * 2, 300))
    
    async def _fetch_feed_data(self, config: DataFeedConfig):
        """Fetch data from a specific feed"""
        try:
            handler = self.source_handlers.get(config.source_type)
            if not handler:
                raise ValueError(f"No handler for source type: {config.source_type}")
            
            # Fetch data for each symbol
            for symbol in config.symbols:
                data = await self._make_api_request(config, symbol)
                if data:
                    processed_data = await handler(config, symbol, data)
                    if processed_data:
                        await self._store_data_point(processed_data)
            
        except Exception as e:
            logger.error(f"Error fetching data for {config.feed_id}: {e}")
            raise
    
    async def _make_api_request(self, config: DataFeedConfig, symbol: str) -> Optional[Dict[str, Any]]:
        """Make API request to data source"""
        try:
            # Prepare parameters
            params = config.parameters.copy()
            
            # Add API key if required
            if config.api_key:
                if "alphavantage" in config.endpoint:
                    params["apikey"] = config.api_key
                elif "stlouisfed" in config.endpoint:
                    params["api_key"] = config.api_key
                elif "newsapi" in config.endpoint:
                    params["apiKey"] = config.api_key
                elif "metals-api" in config.endpoint:
                    params["access_key"] = config.api_key
            
            # Add symbol-specific parameters
            if config.source_type == DataSourceType.MARKET_DATA:
                params["symbol"] = symbol
            elif config.source_type == DataSourceType.ECONOMIC_DATA:
                params["series_id"] = symbol
            elif config.source_type == DataSourceType.NEWS_SENTIMENT:
                params["q"] = symbol
            elif config.source_type == DataSourceType.COMMODITIES:
                params["symbols"] = symbol
            
            # Make request
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=config.timeout)) as session:
                async with session.get(config.endpoint, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"API request failed for {config.feed_id}: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error making API request for {config.feed_id}: {e}")
            return None
    
    async def _handle_market_data(self, config: DataFeedConfig, symbol: str, data: Dict[str, Any]) -> Optional[DataPoint]:
        """Handle market data response"""
        try:
            if "alphavantage" in config.endpoint:
                # Alpha Vantage format
                time_series_key = next((k for k in data.keys() if "Time Series" in k), None)
                if not time_series_key or time_series_key not in data:
                    return None
                
                time_series = data[time_series_key]
                if not time_series:
                    return None
                
                # Get latest data point
                latest_time = max(time_series.keys())
                latest_data = time_series[latest_time]
                
                processed_data = {
                    "symbol": symbol,
                    "timestamp": datetime.fromisoformat(latest_time.replace("Z", "+00:00")),
                    "open": float(latest_data.get("1. open", 0)),
                    "high": float(latest_data.get("2. high", 0)),
                    "low": float(latest_data.get("3. low", 0)),
                    "close": float(latest_data.get("4. close", 0)),
                    "volume": int(latest_data.get("5. volume", 0)),
                    "source": config.feed_id
                }
            else:
                # Generic format
                processed_data = DataTransformer.normalize_price_data(data)
            
            # Validate quality
            quality = DataQualityValidator.validate_price_data(processed_data)
            
            # Apply transformations
            if "calculate_indicators" in config.transformations:
                # Get historical prices for indicators
                historical_prices = await self._get_historical_prices(symbol, period=20)
                if historical_prices:
                    indicators = DataTransformer.calculate_technical_indicators(historical_prices)
                    processed_data["indicators"] = indicators
            
            return DataPoint(
                source=config.feed_id,
                symbol=symbol,
                timestamp=processed_data["timestamp"],
                data_type="market_data",
                value=processed_data,
                quality=quality
            )
            
        except Exception as e:
            logger.error(f"Error handling market data for {symbol}: {e}")
            return None
    
    async def _handle_economic_data(self, config: DataFeedConfig, symbol: str, data: Dict[str, Any]) -> Optional[DataPoint]:
        """Handle economic data response"""
        try:
            if "stlouisfed" in config.endpoint:
                # FRED format
                if "observations" not in data or not data["observations"]:
                    return None
                
                latest_obs = data["observations"][-1]
                
                processed_data = {
                    "series_id": symbol,
                    "value": float(latest_obs.get("value", 0)),
                    "date": latest_obs.get("date"),
                    "source": config.feed_id
                }
            else:
                processed_data = data
            
            # Validate quality
            quality = DataQualityValidator.validate_economic_data(processed_data)
            
            return DataPoint(
                source=config.feed_id,
                symbol=symbol,
                timestamp=datetime.now(),
                data_type="economic_data",
                value=processed_data,
                quality=quality
            )
            
        except Exception as e:
            logger.error(f"Error handling economic data for {symbol}: {e}")
            return None
    
    async def _handle_news_sentiment(self, config: DataFeedConfig, symbol: str, data: Dict[str, Any]) -> Optional[DataPoint]:
        """Handle news sentiment data"""
        try:
            if "newsapi" in config.endpoint:
                # News API format
                if "articles" not in data or not data["articles"]:
                    return None
                
                # Analyze sentiment of all articles
                sentiment_scores = []
                for article in data["articles"]:
                    title = article.get("title", "")
                    description = article.get("description", "")
                    content = f"{title} {description}"
                    
                    sentiment = DataTransformer.analyze_sentiment(content)
                    sentiment_scores.append(sentiment["sentiment_score"])
                
                avg_sentiment = statistics.mean(sentiment_scores) if sentiment_scores else 0.0
                
                processed_data = {
                    "query": symbol,
                    "sentiment_score": avg_sentiment,
                    "article_count": len(data["articles"]),
                    "confidence": min(1.0, len(sentiment_scores) / 10),
                    "source": config.feed_id
                }
            else:
                processed_data = data
            
            return DataPoint(
                source=config.feed_id,
                symbol=symbol,
                timestamp=datetime.now(),
                data_type="news_sentiment",
                value=processed_data,
                quality=DataQuality.MEDIUM
            )
            
        except Exception as e:
            logger.error(f"Error handling news sentiment for {symbol}: {e}")
            return None
    
    async def _handle_crypto_data(self, config: DataFeedConfig, symbol: str, data: Dict[str, Any]) -> Optional[DataPoint]:
        """Handle cryptocurrency data"""
        try:
            if "coinbase" in config.endpoint:
                # Coinbase format
                if "data" not in data or "rates" not in data["data"]:
                    return None
                
                rates = data["data"]["rates"]
                if symbol not in rates:
                    return None
                
                processed_data = {
                    "symbol": symbol,
                    "price": float(rates[symbol]),
                    "base": data["data"].get("currency", "USD"),
                    "timestamp": datetime.now(),
                    "source": config.feed_id
                }
            else:
                processed_data = data
            
            return DataPoint(
                source=config.feed_id,
                symbol=symbol,
                timestamp=datetime.now(),
                data_type="cryptocurrency",
                value=processed_data,
                quality=DataQuality.HIGH
            )
            
        except Exception as e:
            logger.error(f"Error handling crypto data for {symbol}: {e}")
            return None
    
    async def _handle_forex_data(self, config: DataFeedConfig, symbol: str, data: Dict[str, Any]) -> Optional[DataPoint]:
        """Handle forex data"""
        # Placeholder implementation
        return None
    
    async def _handle_commodities_data(self, config: DataFeedConfig, symbol: str, data: Dict[str, Any]) -> Optional[DataPoint]:
        """Handle commodities data"""
        try:
            if "metals-api" in config.endpoint:
                # Metals API format
                if "rates" not in data or symbol not in data["rates"]:
                    return None
                
                processed_data = {
                    "symbol": symbol,
                    "price": float(data["rates"][symbol]),
                    "base": data.get("base", "USD"),
                    "timestamp": datetime.now(),
                    "source": config.feed_id
                }
            else:
                processed_data = data
            
            return DataPoint(
                source=config.feed_id,
                symbol=symbol,
                timestamp=datetime.now(),
                data_type="commodities",
                value=processed_data,
                quality=DataQuality.HIGH
            )
            
        except Exception as e:
            logger.error(f"Error handling commodities data for {symbol}: {e}")
            return None
    
    async def _store_data_point(self, data_point: DataPoint):
        """Store data point in Redis and buffer"""
        try:
            # Store in Redis
            cache_key = f"realtime_data:{data_point.source}:{data_point.symbol}"
            data_json = json.dumps(asdict(data_point), default=str)
            
            # Store latest data point
            await self.redis_client.set(cache_key, data_json)
            
            # Store in time series
            ts_key = f"timeseries:{data_point.source}:{data_point.symbol}"
            timestamp = int(data_point.timestamp.timestamp())
            await self.redis_client.zadd(ts_key, {data_json: timestamp})
            
            # Set expiration
            await self.redis_client.expire(ts_key, self.data_retention_hours * 3600)
            
            # Store in buffer
            buffer_key = f"{data_point.source}:{data_point.symbol}"
            if buffer_key not in self.data_buffer:
                self.data_buffer[buffer_key] = []
            
            self.data_buffer[buffer_key].append(data_point)
            
            # Trim buffer
            if len(self.data_buffer[buffer_key]) > self.max_buffer_size:
                self.data_buffer[buffer_key] = self.data_buffer[buffer_key][-self.max_buffer_size:]
            
            # Broadcast to subscribers
            await self._broadcast_data_update(data_point)
            
            logger.debug(f"Stored data point: {data_point.source}:{data_point.symbol}")
            
        except Exception as e:
            logger.error(f"Error storing data point: {e}")
    
    async def _broadcast_data_update(self, data_point: DataPoint):
        """Broadcast data update to WebSocket subscribers"""
        try:
            # Import here to avoid circular imports
            from websockets.websocket_server import websocket_server
            
            broadcast_data = {
                "source": data_point.source,
                "symbol": data_point.symbol,
                "data_type": data_point.data_type,
                "value": data_point.value,
                "quality": data_point.quality.value,
                "timestamp": data_point.timestamp.isoformat()
            }
            
            # Determine channel based on data type
            if data_point.data_type == "market_data":
                channel = "market_data"
            elif data_point.data_type == "economic_data":
                channel = "economic_data"
            elif data_point.data_type == "news_sentiment":
                channel = "news_sentiment"
            else:
                channel = "real_time_data"
            
            # Broadcast via WebSocket
            await websocket_server._broadcast_to_channel(
                channel,
                "data_update",
                broadcast_data
            )
            
        except Exception as e:
            logger.debug(f"Error broadcasting data update: {e}")
    
    async def _get_historical_prices(self, symbol: str, period: int = 20) -> Optional[List[float]]:
        """Get historical prices for technical analysis"""
        try:
            buffer_key = f"alpha_vantage_equity:{symbol}"
            if buffer_key in self.data_buffer:
                recent_points = self.data_buffer[buffer_key][-period:]
                prices = []
                for point in recent_points:
                    if isinstance(point.value, dict) and "close" in point.value:
                        prices.append(float(point.value["close"]))
                return prices
            return None
            
        except Exception as e:
            logger.error(f"Error getting historical prices for {symbol}: {e}")
            return None
    
    async def _update_feed_health(self, feed_id: str, latency: float, success: bool):
        """Update feed health metrics"""
        try:
            if feed_id not in self.feed_health:
                return
            
            health = self.feed_health[feed_id]
            
            if success:
                health.last_update = datetime.now()
                health.update_count += 1
                
                # Update average latency
                if health.average_latency == 0:
                    health.average_latency = latency
                else:
                    health.average_latency = (health.average_latency * 0.9) + (latency * 0.1)
            else:
                health.error_count += 1
                health.status = FeedStatus.ERROR
            
            # Calculate uptime percentage
            total_attempts = health.update_count + health.error_count
            if total_attempts > 0:
                health.uptime_percentage = (health.update_count / total_attempts) * 100
            
            # Calculate next update time
            if feed_id in self.feeds:
                config = self.feeds[feed_id]
                health.next_update = datetime.now() + timedelta(seconds=config.update_frequency)
            
        except Exception as e:
            logger.error(f"Error updating feed health for {feed_id}: {e}")
    
    async def _health_monitoring_loop(self):
        """Monitor health of all feeds"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                current_time = datetime.now()
                
                for feed_id, health in self.feed_health.items():
                    # Check for stale feeds
                    if health.last_update:
                        age = (current_time - health.last_update).total_seconds()
                        config = self.feeds.get(feed_id)
                        
                        if config and age > config.update_frequency * 3:
                            logger.warning(f"Feed {feed_id} appears stale (last update {age:.0f}s ago)")
                            health.status = FeedStatus.ERROR
                    
                    # Check for feeds with high error rates
                    total_attempts = health.update_count + health.error_count
                    if total_attempts > 10:
                        error_rate = health.error_count / total_attempts
                        if error_rate > 0.5:
                            logger.warning(f"Feed {feed_id} has high error rate: {error_rate:.2%}")
                
            except Exception as e:
                logger.error(f"Error in health monitoring loop: {e}")
    
    # Public API methods
    
    async def get_latest_data(self, source: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Get latest data for a specific source and symbol"""
        try:
            cache_key = f"realtime_data:{source}:{symbol}"
            data = await self.redis_client.get(cache_key)
            
            if data:
                return json.loads(data)
            return None
            
        except Exception as e:
            logger.error(f"Error getting latest data for {source}:{symbol}: {e}")
            return None
    
    async def get_historical_data(self, source: str, symbol: str, hours: int = 1) -> List[Dict[str, Any]]:
        """Get historical data for a specific timeframe"""
        try:
            ts_key = f"timeseries:{source}:{symbol}"
            since_timestamp = int((datetime.now() - timedelta(hours=hours)).timestamp())
            
            # Get data from Redis sorted set
            data = await self.redis_client.zrangebyscore(ts_key, since_timestamp, "+inf")
            
            result = []
            for item in data:
                try:
                    result.append(json.loads(item))
                except json.JSONDecodeError:
                    continue
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting historical data for {source}:{symbol}: {e}")
            return []
    
    async def get_feed_status(self) -> Dict[str, Any]:
        """Get status of all feeds"""
        try:
            status = {
                "total_feeds": len(self.feeds),
                "active_feeds": len([f for f in self.feed_health.values() if f.status == FeedStatus.ACTIVE]),
                "error_feeds": len([f for f in self.feed_health.values() if f.status == FeedStatus.ERROR]),
                "feeds": {}
            }
            
            for feed_id, health in self.feed_health.items():
                config = self.feeds.get(feed_id)
                status["feeds"][feed_id] = {
                    "name": config.name if config else feed_id,
                    "status": health.status.value,
                    "last_update": health.last_update.isoformat() if health.last_update else None,
                    "update_count": health.update_count,
                    "error_count": health.error_count,
                    "uptime_percentage": health.uptime_percentage,
                    "average_latency": health.average_latency,
                    "data_quality": health.data_quality.value,
                    "next_update": health.next_update.isoformat() if health.next_update else None
                }
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting feed status: {e}")
            return {"error": str(e)}
    
    async def get_available_symbols(self, source: Optional[str] = None) -> Dict[str, List[str]]:
        """Get available symbols by source"""
        try:
            symbols = {}
            
            for feed_id, config in self.feeds.items():
                if source is None or feed_id == source:
                    symbols[feed_id] = config.symbols
            
            return symbols
            
        except Exception as e:
            logger.error(f"Error getting available symbols: {e}")
            return {}
    
    async def close(self):
        """Clean shutdown of data orchestrator"""
        try:
            # Cancel all feed tasks
            for task in self.feed_tasks.values():
                task.cancel()
            
            # Close Redis connection
            if self.redis_client:
                await self.redis_client.close()
            
            logger.info("Real-Time Data Orchestrator closed")
            
        except Exception as e:
            logger.error(f"Error closing Data Orchestrator: {e}")


# Global data orchestrator instance
data_orchestrator = RealTimeDataOrchestrator()
