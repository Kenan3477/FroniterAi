"""
Financial Market Analysis Integration Module
Main integration point for AI reasoning, API endpoints, real-time data, and dashboard
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .financial_market_analysis import AIReasoningEngine
from .financial_market_api import FinancialMarketAnalysisAPI, financial_market_api
from .financial_market_graphql import FinancialMarketGraphQL, graphql_router
from .real_time_data_integration import RealTimeDataManager, real_time_manager, DataSourceType
from .financial_market_dashboard import run_financial_dashboard

logger = logging.getLogger(__name__)

class FinancialMarketAnalysisIntegration:
    """
    Main integration class for financial market analysis system
    Coordinates AI reasoning, APIs, real-time data, and dashboard
    """
    
    def __init__(self):
        self.ai_engine = AIReasoningEngine()
        self.data_manager = real_time_manager
        self.api_app = None
        self.dashboard_process = None
        
        # Integration state
        self.active_symbols = ["GOLD", "SPY", "QQQ", "BTC-USD"]
        self.system_status = {
            "ai_engine": "initializing",
            "data_feeds": "initializing", 
            "api_server": "initializing",
            "dashboard": "initializing"
        }
        
        logger.info("Financial Market Analysis Integration initialized")
    
    async def initialize_system(self):
        """Initialize the complete financial market analysis system"""
        logger.info("Starting Financial Market Analysis System initialization...")
        
        try:
            # Initialize AI reasoning engine
            await self._initialize_ai_engine()
            
            # Initialize real-time data feeds
            await self._initialize_data_feeds()
            
            # Initialize API server
            await self._initialize_api_server()
            
            # Setup data callbacks
            self._setup_data_callbacks()
            
            logger.info("Financial Market Analysis System initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing system: {e}")
            raise
    
    async def _initialize_ai_engine(self):
        """Initialize AI reasoning engine"""
        try:
            # AI engine is ready to use
            self.system_status["ai_engine"] = "active"
            logger.info("AI reasoning engine initialized")
            
        except Exception as e:
            self.system_status["ai_engine"] = "error"
            logger.error(f"Error initializing AI engine: {e}")
            raise
    
    async def _initialize_data_feeds(self):
        """Initialize real-time data feeds"""
        try:
            # Start data manager
            await self.data_manager.start()
            
            # Add symbols to monitor
            for symbol in self.active_symbols:
                await self.data_manager.add_symbols(
                    DataSourceType.MARKET_PRICES, [symbol]
                )
                await self.data_manager.add_symbols(
                    DataSourceType.SENTIMENT_NEWS, [symbol]
                )
            
            # Add VIX monitoring
            await self.data_manager.add_symbols(
                DataSourceType.VOLATILITY_VIX, ["VIX"]
            )
            
            # Add economic indicators
            await self.data_manager.add_symbols(
                DataSourceType.ECONOMIC_INDICATORS, ["USD"]
            )
            
            self.system_status["data_feeds"] = "active"
            logger.info("Real-time data feeds initialized")
            
        except Exception as e:
            self.system_status["data_feeds"] = "error"
            logger.error(f"Error initializing data feeds: {e}")
            raise
    
    async def _initialize_api_server(self):
        """Initialize API server with REST and GraphQL endpoints"""
        try:
            # Create FastAPI app
            self.api_app = FastAPI(
                title="Financial Market Analysis API",
                description="AI-powered market analysis with sentiment, volatility, and reasoning",
                version="1.0.0"
            )
            
            # Add CORS middleware
            self.api_app.add_middleware(
                CORSMiddleware,
                allow_origins=["*"],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
            
            # Include REST API routes
            self.api_app.mount("/rest", financial_market_api.get_app())
            
            # Include GraphQL routes
            self.api_app.include_router(graphql_router, prefix="/graphql")
            
            # Add health check
            @self.api_app.get("/health")
            async def health_check():
                return {
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "system_status": self.system_status
                }
            
            # Add system info endpoint
            @self.api_app.get("/info")
            async def system_info():
                return {
                    "name": "Financial Market Analysis API",
                    "version": "1.0.0",
                    "features": [
                        "AI Reasoning Engine",
                        "Multi-source Sentiment Analysis", 
                        "VIX Volatility Analysis",
                        "Technical Indicator Integration",
                        "Fundamental Analysis",
                        "Macroeconomic Factor Analysis",
                        "Gold-specific Analysis",
                        "Real-time Data Feeds",
                        "GraphQL API",
                        "Interactive Dashboard"
                    ],
                    "supported_assets": self.active_symbols,
                    "system_status": self.system_status
                }
            
            self.system_status["api_server"] = "active"
            logger.info("API server initialized")
            
        except Exception as e:
            self.system_status["api_server"] = "error"
            logger.error(f"Error initializing API server: {e}")
            raise
    
    def _setup_data_callbacks(self):
        """Setup callbacks for real-time data processing"""
        
        def process_real_time_data(data_point):
            """Process incoming real-time data"""
            try:
                logger.debug(f"Processing real-time data: {data_point.symbol} - {data_point.data_type}")
                
                # Store data for API access
                if data_point.symbol not in self.latest_data:
                    self.latest_data[data_point.symbol] = {}
                
                self.latest_data[data_point.symbol][data_point.data_type] = {
                    "value": data_point.value,
                    "timestamp": data_point.timestamp,
                    "metadata": data_point.metadata
                }
                
                # Trigger analysis updates if needed
                if data_point.data_type in ["market_price", "sentiment_news", "volatility_vix"]:
                    asyncio.create_task(self._trigger_analysis_update(data_point.symbol))
                    
            except Exception as e:
                logger.error(f"Error processing real-time data: {e}")
        
        # Initialize latest data storage
        self.latest_data = {}
        
        # Subscribe to data updates
        self.data_manager.subscribe_to_data(process_real_time_data)
        
        logger.info("Real-time data callbacks configured")
    
    async def _trigger_analysis_update(self, symbol: str):
        """Trigger AI analysis update for a symbol"""
        try:
            # Avoid too frequent updates
            if not hasattr(self, '_last_analysis_update'):
                self._last_analysis_update = {}
            
            now = datetime.now()
            last_update = self._last_analysis_update.get(symbol)
            
            if last_update and (now - last_update).seconds < 300:  # 5 minute cooldown
                return
            
            self._last_analysis_update[symbol] = now
            
            # Get latest market snapshot
            snapshot = await self.data_manager.get_market_snapshot([symbol])
            
            if snapshot and symbol in snapshot:
                logger.info(f"Triggered analysis update for {symbol}")
                # Analysis would be conducted here and cached for API access
                
        except Exception as e:
            logger.error(f"Error triggering analysis update: {e}")
    
    async def run_api_server(self, host: str = "0.0.0.0", port: int = 8000):
        """Run the API server"""
        if not self.api_app:
            await self._initialize_api_server()
        
        logger.info(f"Starting API server on {host}:{port}")
        
        config = uvicorn.Config(
            app=self.api_app,
            host=host,
            port=port,
            log_level="info"
        )
        
        server = uvicorn.Server(config)
        await server.serve()
    
    def run_dashboard(self):
        """Run the interactive dashboard"""
        logger.info("Starting interactive dashboard")
        try:
            run_financial_dashboard()
            self.system_status["dashboard"] = "active"
        except Exception as e:
            self.system_status["dashboard"] = "error"
            logger.error(f"Error starting dashboard: {e}")
    
    async def get_comprehensive_analysis(
        self,
        symbol: str,
        include_real_time: bool = True
    ) -> Dict[str, Any]:
        """Get comprehensive market analysis for a symbol"""
        try:
            logger.info(f"Generating comprehensive analysis for {symbol}")
            
            # Get real-time data if requested
            market_data = []
            if include_real_time and symbol in self.latest_data:
                latest = self.latest_data[symbol]
                if "market_price" in latest:
                    price_data = latest["market_price"]
                    market_data.append({
                        "symbol": symbol,
                        "timestamp": price_data["timestamp"].isoformat(),
                        "price": price_data["value"]["price"],
                        "volume": price_data["value"]["volume"]
                    })
            
            # Determine asset class
            asset_class = self._determine_asset_class(symbol)
            
            # Conduct AI analysis
            from .financial_market_analysis import AssetClass, MarketData
            
            asset_class_enum = AssetClass(asset_class)
            market_data_objects = [
                MarketData(
                    symbol=data["symbol"],
                    timestamp=datetime.fromisoformat(data["timestamp"]),
                    price=data["price"],
                    volume=data["volume"]
                )
                for data in market_data
            ]
            
            analysis = await self.ai_engine.analyze_market(
                asset=symbol,
                asset_class=asset_class_enum,
                market_data=market_data_objects
            )
            
            # Format response
            return {
                "symbol": symbol,
                "analysis_timestamp": analysis.analysis_timestamp.isoformat(),
                "sentiment_analysis": analysis.sentiment_analysis,
                "volatility_analysis": {
                    "vix_level": analysis.volatility_analysis.vix_level,
                    "volatility_regime": analysis.volatility_analysis.volatility_regime.value,
                    "uncertainty_assessment": "elevated" if analysis.volatility_analysis.vix_level > 25 else "moderate"
                },
                "ai_reasoning": analysis.ai_reasoning,
                "recommendations": analysis.recommendations,
                "confidence_score": analysis.confidence_score,
                "real_time_data_included": include_real_time
            }
            
        except Exception as e:
            logger.error(f"Error generating comprehensive analysis: {e}")
            raise
    
    def _determine_asset_class(self, symbol: str) -> str:
        """Determine asset class for a symbol"""
        if symbol.upper() == "GOLD":
            return "precious_metals"
        elif symbol.upper() in ["SPY", "QQQ", "AAPL", "GOOGL"]:
            return "equities"
        elif "BTC" in symbol.upper():
            return "cryptocurrencies"
        elif "/" in symbol:
            return "currencies"
        else:
            return "equities"  # Default
    
    async def shutdown(self):
        """Shutdown the system gracefully"""
        logger.info("Shutting down Financial Market Analysis System")
        
        try:
            # Stop data feeds
            await self.data_manager.stop()
            self.system_status["data_feeds"] = "stopped"
            
            # Update system status
            self.system_status["ai_engine"] = "stopped"
            self.system_status["api_server"] = "stopped"
            self.system_status["dashboard"] = "stopped"
            
            logger.info("System shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")

# Global integration instance
financial_market_integration = FinancialMarketAnalysisIntegration()

# Convenience functions for external access
async def start_financial_market_system():
    """Start the complete financial market analysis system"""
    await financial_market_integration.initialize_system()
    return financial_market_integration

async def run_api_server(host: str = "0.0.0.0", port: int = 8000):
    """Run the API server"""
    await financial_market_integration.initialize_system()
    await financial_market_integration.run_api_server(host, port)

def run_dashboard():
    """Run the interactive dashboard"""
    financial_market_integration.run_dashboard()

async def get_market_analysis(symbol: str) -> Dict[str, Any]:
    """Get comprehensive market analysis for a symbol"""
    return await financial_market_integration.get_comprehensive_analysis(symbol)

# Command-line interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "api":
            # Run API server
            asyncio.run(run_api_server())
        
        elif command == "dashboard":
            # Run dashboard
            run_dashboard()
        
        elif command == "analyze":
            # Analyze a symbol
            if len(sys.argv) > 2:
                symbol = sys.argv[2]
                async def analyze():
                    result = await get_market_analysis(symbol)
                    print(f"Analysis for {symbol}:")
                    print(f"Sentiment: {result['sentiment_analysis']['sentiment_classification']}")
                    print(f"VIX Level: {result['volatility_analysis']['vix_level']}")
                    print(f"AI Conviction: {result['ai_reasoning']['reasoning_synthesis']['conviction_level']}")
                
                asyncio.run(analyze())
            else:
                print("Usage: python financial_market_integration.py analyze <SYMBOL>")
        
        else:
            print("Available commands: api, dashboard, analyze")
    
    else:
        print("Financial Market Analysis Integration")
        print("Commands:")
        print("  api        - Run API server")
        print("  dashboard  - Run interactive dashboard")
        print("  analyze    - Analyze a symbol")
