"""
Real-time Market Data Integration
Live data feeds for sentiment, market prices, volatility, and macroeconomic indicators
"""

import asyncio
import json
import websockets
from typing import Dict, List, Any, Optional, Callable, AsyncIterator
from datetime import datetime, timedelta
import aiohttp
import logging
from dataclasses import dataclass, asdict
from enum import Enum

from .financial_market_analysis import (
    MarketData, SentimentData, VolatilityMetrics, MacroeconomicFactors,
    AssetClass, MarketSentiment
)

logger = logging.getLogger(__name__)

class DataSourceType(Enum):
    MARKET_PRICES = "market_prices"
    SENTIMENT_NEWS = "sentiment_news"
    SENTIMENT_SOCIAL = "sentiment_social"
    VOLATILITY_VIX = "volatility_vix"
    ECONOMIC_INDICATORS = "economic_indicators"
    ANALYST_REPORTS = "analyst_reports"

@dataclass
class DataFeedConfig:
    source_type: DataSourceType
    endpoint: str
    api_key: Optional[str] = None
    update_interval: int = 60  # seconds
    active: bool = True
    rate_limit: int = 100  # requests per minute
    retry_attempts: int = 3

@dataclass
class RealTimeDataPoint:
    source: str
    data_type: str
    symbol: str
    timestamp: datetime
    value: Any
    metadata: Dict[str, Any]

class MarketDataProvider:
    """Base class for market data providers"""
    
    def __init__(self, config: DataFeedConfig):
        self.config = config
        self.session = None
        self.active_connections = {}
        
    async def connect(self) -> bool:
        """Establish connection to data source"""
        try:
            self.session = aiohttp.ClientSession()
            return True
        except Exception as e:
            logger.error(f"Error connecting to {self.config.source_type}: {e}")
            return False
    
    async def disconnect(self):
        """Close connection to data source"""
        if self.session:
            await self.session.close()
    
    async def fetch_data(self, symbols: List[str]) -> List[RealTimeDataPoint]:
        """Fetch data for specified symbols"""
        raise NotImplementedError
    
    async def subscribe_to_updates(
        self,
        symbols: List[str],
        callback: Callable[[RealTimeDataPoint], None]
    ):
        """Subscribe to real-time updates"""
        raise NotImplementedError

class AlphaVantageProvider(MarketDataProvider):
    """Alpha Vantage market data provider"""
    
    async def fetch_data(self, symbols: List[str]) -> List[RealTimeDataPoint]:
        """Fetch market data from Alpha Vantage"""
        try:
            data_points = []
            
            for symbol in symbols:
                url = f"{self.config.endpoint}/query"
                params = {
                    "function": "GLOBAL_QUOTE",
                    "symbol": symbol,
                    "apikey": self.config.api_key
                }
                
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        global_quote = data.get("Global Quote", {})
                        
                        if global_quote:
                            data_point = RealTimeDataPoint(
                                source="alphavantage",
                                data_type="market_price",
                                symbol=symbol,
                                timestamp=datetime.now(),
                                value={
                                    "price": float(global_quote.get("05. price", 0)),
                                    "change": float(global_quote.get("09. change", 0)),
                                    "change_percent": global_quote.get("10. change percent", "0%"),
                                    "volume": int(global_quote.get("06. volume", 0))
                                },
                                metadata={
                                    "open": float(global_quote.get("02. open", 0)),
                                    "high": float(global_quote.get("03. high", 0)),
                                    "low": float(global_quote.get("04. low", 0)),
                                    "previous_close": float(global_quote.get("08. previous close", 0))
                                }
                            )
                            data_points.append(data_point)
                    
                    # Rate limiting
                    await asyncio.sleep(12)  # Alpha Vantage free tier: 5 calls per minute
            
            return data_points
            
        except Exception as e:
            logger.error(f"Error fetching Alpha Vantage data: {e}")
            return []

class NewsAPIProvider(MarketDataProvider):
    """News API sentiment data provider"""
    
    async def fetch_data(self, symbols: List[str]) -> List[RealTimeDataPoint]:
        """Fetch news sentiment data"""
        try:
            data_points = []
            
            for symbol in symbols:
                url = f"{self.config.endpoint}/everything"
                params = {
                    "q": f"{symbol} OR {symbol.replace('USD', '')} stock market",
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 20,
                    "apiKey": self.config.api_key
                }
                
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        articles = data.get("articles", [])
                        
                        # Analyze sentiment of articles
                        sentiment_score = await self._analyze_news_sentiment(articles)
                        
                        data_point = RealTimeDataPoint(
                            source="newsapi",
                            data_type="sentiment_news",
                            symbol=symbol,
                            timestamp=datetime.now(),
                            value=sentiment_score,
                            metadata={
                                "article_count": len(articles),
                                "time_range": "24h",
                                "key_headlines": [article["title"] for article in articles[:5]]
                            }
                        )
                        data_points.append(data_point)
                
                await asyncio.sleep(1)  # Rate limiting
            
            return data_points
            
        except Exception as e:
            logger.error(f"Error fetching News API data: {e}")
            return []
    
    async def _analyze_news_sentiment(self, articles: List[Dict]) -> Dict[str, Any]:
        """Analyze sentiment of news articles"""
        if not articles:
            return {"sentiment_score": 0.0, "confidence": 0.0, "classification": "neutral"}
        
        # Simple keyword-based sentiment analysis
        positive_keywords = ["bullish", "positive", "growth", "surge", "rally", "gains", "optimistic"]
        negative_keywords = ["bearish", "negative", "decline", "crash", "losses", "pessimistic", "concern"]
        
        positive_count = 0
        negative_count = 0
        total_articles = len(articles)
        
        for article in articles:
            text = f"{article.get('title', '')} {article.get('description', '')}".lower()
            
            for keyword in positive_keywords:
                if keyword in text:
                    positive_count += 1
                    break
            
            for keyword in negative_keywords:
                if keyword in text:
                    negative_count += 1
                    break
        
        # Calculate sentiment score
        if total_articles > 0:
            sentiment_score = (positive_count - negative_count) / total_articles
            confidence = (positive_count + negative_count) / total_articles
        else:
            sentiment_score = 0.0
            confidence = 0.0
        
        # Classify sentiment
        if sentiment_score > 0.2:
            classification = "positive"
        elif sentiment_score < -0.2:
            classification = "negative"
        else:
            classification = "neutral"
        
        return {
            "sentiment_score": sentiment_score,
            "confidence": confidence,
            "classification": classification,
            "positive_mentions": positive_count,
            "negative_mentions": negative_count
        }

class VIXDataProvider(MarketDataProvider):
    """VIX volatility data provider"""
    
    async def fetch_data(self, symbols: List[str] = ["VIX"]) -> List[RealTimeDataPoint]:
        """Fetch VIX volatility data"""
        try:
            # For demonstration - in production, use real VIX data API
            vix_level = await self._get_current_vix()
            
            data_point = RealTimeDataPoint(
                source="vix_provider",
                data_type="volatility_vix",
                symbol="VIX",
                timestamp=datetime.now(),
                value={
                    "vix_level": vix_level,
                    "volatility_regime": self._classify_volatility_regime(vix_level),
                    "uncertainty_level": self._assess_uncertainty_level(vix_level)
                },
                metadata={
                    "term_structure": await self._get_vix_term_structure(),
                    "historical_percentile": await self._get_vix_percentile(vix_level)
                }
            )
            
            return [data_point]
            
        except Exception as e:
            logger.error(f"Error fetching VIX data: {e}")
            return []
    
    async def _get_current_vix(self) -> float:
        """Get current VIX level"""
        # Placeholder - in production, fetch from real API
        return 22.5  # Simulated VIX level
    
    def _classify_volatility_regime(self, vix_level: float) -> str:
        """Classify volatility regime based on VIX level"""
        if vix_level < 12:
            return "very_low"
        elif vix_level < 20:
            return "low"
        elif vix_level < 30:
            return "moderate"
        elif vix_level < 40:
            return "high"
        else:
            return "extreme"
    
    def _assess_uncertainty_level(self, vix_level: float) -> str:
        """Assess market uncertainty level"""
        if vix_level > 30:
            return "high_uncertainty"
        elif vix_level > 20:
            return "moderate_uncertainty"
        else:
            return "low_uncertainty"
    
    async def _get_vix_term_structure(self) -> Dict[str, float]:
        """Get VIX term structure"""
        # Placeholder - in production, fetch real term structure data
        return {
            "vix9d": 21.0,
            "vix": 22.5,
            "vix3m": 24.0,
            "vix6m": 25.5
        }
    
    async def _get_vix_percentile(self, current_vix: float) -> float:
        """Get VIX historical percentile"""
        # Placeholder calculation
        return 0.65  # 65th percentile

class EconomicDataProvider(MarketDataProvider):
    """Economic indicators data provider"""
    
    async def fetch_data(self, symbols: List[str] = ["USD"]) -> List[RealTimeDataPoint]:
        """Fetch economic indicators"""
        try:
            # Fetch key economic indicators
            indicators = await self._get_economic_indicators()
            
            data_point = RealTimeDataPoint(
                source="economic_data",
                data_type="economic_indicators",
                symbol="USD",
                timestamp=datetime.now(),
                value=indicators,
                metadata={
                    "data_sources": ["fed", "bls", "bea"],
                    "last_updated": datetime.now().isoformat(),
                    "reliability_score": 0.9
                }
            )
            
            return [data_point]
            
        except Exception as e:
            logger.error(f"Error fetching economic data: {e}")
            return []
    
    async def _get_economic_indicators(self) -> Dict[str, float]:
        """Get current economic indicators"""
        # Placeholder - in production, fetch from government APIs
        return {
            "gdp_growth": 2.1,
            "inflation_rate": 3.2,
            "unemployment_rate": 3.7,
            "fed_funds_rate": 5.25,
            "consumer_confidence": 102.0,
            "industrial_production": 1.8
        }

class RealTimeDataManager:
    """
    Manages real-time data feeds from multiple sources
    """
    
    def __init__(self):
        self.providers: Dict[DataSourceType, MarketDataProvider] = {}
        self.data_callbacks: List[Callable[[RealTimeDataPoint], None]] = []
        self.active_symbols: Dict[DataSourceType, List[str]] = {}
        self.update_tasks: Dict[DataSourceType, asyncio.Task] = {}
        
        # Initialize default providers
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize data providers with configurations"""
        
        # Market data provider
        market_config = DataFeedConfig(
            source_type=DataSourceType.MARKET_PRICES,
            endpoint="https://www.alphavantage.co",
            api_key="demo",  # Replace with actual API key
            update_interval=60
        )
        self.providers[DataSourceType.MARKET_PRICES] = AlphaVantageProvider(market_config)
        
        # News sentiment provider
        news_config = DataFeedConfig(
            source_type=DataSourceType.SENTIMENT_NEWS,
            endpoint="https://newsapi.org/v2",
            api_key="demo",  # Replace with actual API key
            update_interval=300  # 5 minutes
        )
        self.providers[DataSourceType.SENTIMENT_NEWS] = NewsAPIProvider(news_config)
        
        # VIX data provider
        vix_config = DataFeedConfig(
            source_type=DataSourceType.VOLATILITY_VIX,
            endpoint="https://api.vix-data.com",  # Placeholder
            update_interval=120  # 2 minutes
        )
        self.providers[DataSourceType.VOLATILITY_VIX] = VIXDataProvider(vix_config)
        
        # Economic data provider
        econ_config = DataFeedConfig(
            source_type=DataSourceType.ECONOMIC_INDICATORS,
            endpoint="https://api.economic-data.com",  # Placeholder
            update_interval=3600  # 1 hour
        )
        self.providers[DataSourceType.ECONOMIC_INDICATORS] = EconomicDataProvider(econ_config)
    
    async def start(self):
        """Start all data providers"""
        logger.info("Starting real-time data manager")
        
        for source_type, provider in self.providers.items():
            try:
                success = await provider.connect()
                if success:
                    logger.info(f"Connected to {source_type.value}")
                else:
                    logger.warning(f"Failed to connect to {source_type.value}")
            except Exception as e:
                logger.error(f"Error starting provider {source_type.value}: {e}")
    
    async def stop(self):
        """Stop all data providers"""
        logger.info("Stopping real-time data manager")
        
        # Cancel all update tasks
        for task in self.update_tasks.values():
            task.cancel()
        
        # Disconnect providers
        for provider in self.providers.values():
            try:
                await provider.disconnect()
            except Exception as e:
                logger.error(f"Error stopping provider: {e}")
    
    def subscribe_to_data(
        self,
        callback: Callable[[RealTimeDataPoint], None]
    ):
        """Subscribe to data updates"""
        self.data_callbacks.append(callback)
    
    async def add_symbols(
        self,
        source_type: DataSourceType,
        symbols: List[str]
    ):
        """Add symbols to monitor for a data source"""
        if source_type not in self.active_symbols:
            self.active_symbols[source_type] = []
        
        # Add new symbols
        for symbol in symbols:
            if symbol not in self.active_symbols[source_type]:
                self.active_symbols[source_type].append(symbol)
        
        # Start update task if not already running
        if source_type not in self.update_tasks:
            task = asyncio.create_task(
                self._update_data_loop(source_type)
            )
            self.update_tasks[source_type] = task
        
        logger.info(f"Added symbols {symbols} to {source_type.value}")
    
    async def _update_data_loop(self, source_type: DataSourceType):
        """Continuous data update loop for a source type"""
        provider = self.providers[source_type]
        
        while True:
            try:
                if source_type in self.active_symbols:
                    symbols = self.active_symbols[source_type]
                    data_points = await provider.fetch_data(symbols)
                    
                    # Notify callbacks
                    for data_point in data_points:
                        for callback in self.data_callbacks:
                            try:
                                callback(data_point)
                            except Exception as e:
                                logger.error(f"Error in data callback: {e}")
                
                # Wait for next update
                await asyncio.sleep(provider.config.update_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in update loop for {source_type.value}: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def get_latest_data(
        self,
        source_type: DataSourceType,
        symbol: str
    ) -> Optional[RealTimeDataPoint]:
        """Get latest data point for a symbol"""
        try:
            provider = self.providers[source_type]
            data_points = await provider.fetch_data([symbol])
            return data_points[0] if data_points else None
        except Exception as e:
            logger.error(f"Error getting latest data: {e}")
            return None
    
    async def get_market_snapshot(
        self,
        symbols: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """Get comprehensive market snapshot for symbols"""
        snapshot = {}
        
        for symbol in symbols:
            snapshot[symbol] = {}
            
            # Get market data
            market_data = await self.get_latest_data(
                DataSourceType.MARKET_PRICES, symbol
            )
            if market_data:
                snapshot[symbol]["market"] = market_data.value
            
            # Get sentiment data
            sentiment_data = await self.get_latest_data(
                DataSourceType.SENTIMENT_NEWS, symbol
            )
            if sentiment_data:
                snapshot[symbol]["sentiment"] = sentiment_data.value
        
        # Get VIX data
        vix_data = await self.get_latest_data(
            DataSourceType.VOLATILITY_VIX, "VIX"
        )
        if vix_data:
            snapshot["VIX"] = vix_data.value
        
        # Get economic indicators
        econ_data = await self.get_latest_data(
            DataSourceType.ECONOMIC_INDICATORS, "USD"
        )
        if econ_data:
            snapshot["economic_indicators"] = econ_data.value
        
        return snapshot

# Global instance
real_time_manager = RealTimeDataManager()
