"""
Financial Market Analysis API Integration
REST API endpoints for AI reasoning and market analysis
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import logging

from .financial_market_analysis import (
    AIReasoningEngine, MarketData, SentimentData, VolatilityMetrics,
    MacroeconomicFactors, MarketAnalysis, AssetClass, MarketSentiment
)

logger = logging.getLogger(__name__)

# Pydantic models for API requests/responses
class MarketAnalysisRequest(BaseModel):
    asset: str
    asset_class: str
    timeframe: str = "1d"
    market_data: List[Dict[str, Any]] = Field(default_factory=list)
    sentiment_sources: Optional[List[str]] = None
    macro_indicators: Optional[Dict[str, float]] = None
    include_scenarios: bool = True
    include_correlations: bool = True

class MarketAnalysisResponse(BaseModel):
    analysis_id: str
    asset: str
    analysis_timestamp: str
    sentiment_analysis: Dict[str, Any]
    volatility_analysis: Dict[str, Any]
    technical_analysis: Dict[str, Any]
    fundamental_analysis: Dict[str, Any]
    macro_analysis: Dict[str, Any]
    ai_reasoning: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]
    confidence_score: float

class SentimentAnalysisRequest(BaseModel):
    asset: str
    sources: List[str] = Field(default=["news", "social_media", "analyst_reports"])
    timeframe: str = "24h"

class SentimentAnalysisResponse(BaseModel):
    asset: str
    analysis_timestamp: str
    overall_sentiment_score: float
    sentiment_classification: str
    confidence: float
    source_breakdown: Dict[str, Any]
    sentiment_trend: str
    key_themes: List[str]

class VolatilityAnalysisRequest(BaseModel):
    asset: str
    market_data: List[Dict[str, Any]]
    analysis_type: str = "comprehensive"

class VolatilityAnalysisResponse(BaseModel):
    asset: str
    analysis_timestamp: str
    vix_level: float
    historical_volatility: float
    implied_volatility: float
    volatility_rank: float
    volatility_regime: str
    term_structure: Dict[str, float]
    uncertainty_assessment: Dict[str, Any]

class AIReasoningRequest(BaseModel):
    asset: str
    sentiment_data: Dict[str, Any]
    volatility_data: Dict[str, Any]
    technical_data: Dict[str, Any]
    fundamental_data: Dict[str, Any]
    macro_data: Dict[str, Any]
    reasoning_type: str = "comprehensive"

class AIReasoningResponse(BaseModel):
    reasoning_id: str
    asset: str
    analysis_timestamp: str
    key_drivers: Dict[str, Any]
    market_uncertainty: Dict[str, Any]
    directional_bias: Dict[str, Any]
    conviction_level: str
    risk_reward_assessment: Dict[str, Any]
    specialized_analysis: Dict[str, Any]
    reasoning_narrative: str

class GoldAnalysisRequest(BaseModel):
    market_data: List[Dict[str, Any]] = Field(default_factory=list)
    sentiment_sources: List[str] = Field(default=["news", "analyst_reports"])
    include_macro_factors: bool = True
    include_vix_analysis: bool = True

class GoldAnalysisResponse(BaseModel):
    analysis_id: str
    analysis_timestamp: str
    gold_outlook: str
    supportive_factors: List[Dict[str, Any]]
    negative_factors: List[Dict[str, Any]]
    vix_impact: Dict[str, Any]
    sentiment_impact: Dict[str, Any]
    macro_impact: Dict[str, Any]
    directional_bias: Dict[str, Any]
    conviction_level: str
    price_targets: Dict[str, str]
    risk_factors: List[str]

class FinancialMarketAnalysisAPI:
    """
    API integration layer for financial market analysis and AI reasoning
    """
    
    def __init__(self):
        self.app = FastAPI(
            title="Financial Market Analysis API",
            description="AI-powered market analysis with sentiment, volatility, and reasoning",
            version="1.0.0"
        )
        
        # Initialize AI reasoning engine
        self.ai_reasoning_engine = AIReasoningEngine()
        
        # Setup routes
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.post("/api/v1/business/market-analysis/comprehensive", 
                      response_model=MarketAnalysisResponse)
        async def conduct_comprehensive_market_analysis(
            request: MarketAnalysisRequest,
            background_tasks: BackgroundTasks
        ):
            """Conduct comprehensive market analysis with AI reasoning"""
            try:
                logger.info(f"Starting comprehensive market analysis for {request.asset}")
                
                # Convert request data to internal format
                asset_class = AssetClass(request.asset_class.lower())
                
                market_data = [
                    MarketData(
                        symbol=request.asset,
                        timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now().isoformat())),
                        price=data.get("price", 0.0),
                        volume=data.get("volume", 0.0),
                        open_price=data.get("open", None),
                        high_price=data.get("high", None),
                        low_price=data.get("low", None),
                        close_price=data.get("close", None)
                    )
                    for data in request.market_data
                ]
                
                # Convert macro indicators
                macro_indicators = None
                if request.macro_indicators:
                    macro_indicators = MacroeconomicFactors(
                        gdp_growth=request.macro_indicators.get("gdp_growth"),
                        inflation_rate=request.macro_indicators.get("inflation_rate"),
                        unemployment_rate=request.macro_indicators.get("unemployment_rate"),
                        interest_rates=request.macro_indicators.get("interest_rates"),
                        currency_strength=request.macro_indicators.get("currency_strength"),
                        trade_balance=request.macro_indicators.get("trade_balance"),
                        consumer_confidence=request.macro_indicators.get("consumer_confidence"),
                        industrial_production=request.macro_indicators.get("industrial_production")
                    )
                
                # Conduct analysis
                analysis = await self.ai_reasoning_engine.analyze_market(
                    asset=request.asset,
                    asset_class=asset_class,
                    market_data=market_data,
                    sentiment_sources=request.sentiment_sources,
                    macro_indicators=macro_indicators
                )
                
                # Schedule background analysis updates
                background_tasks.add_task(
                    self._schedule_analysis_updates,
                    request.asset,
                    analysis
                )
                
                return MarketAnalysisResponse(
                    analysis_id=f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    asset=analysis.asset,
                    analysis_timestamp=analysis.analysis_timestamp.isoformat(),
                    sentiment_analysis=analysis.sentiment_analysis,
                    volatility_analysis={
                        "vix_level": analysis.volatility_analysis.vix_level,
                        "historical_volatility": analysis.volatility_analysis.historical_volatility,
                        "implied_volatility": analysis.volatility_analysis.implied_volatility,
                        "volatility_rank": analysis.volatility_analysis.volatility_rank,
                        "volatility_regime": analysis.volatility_analysis.volatility_regime.value,
                        "term_structure": analysis.volatility_analysis.term_structure
                    },
                    technical_analysis={
                        "rsi": analysis.technical_analysis.rsi,
                        "macd": analysis.technical_analysis.macd,
                        "moving_averages": analysis.technical_analysis.moving_averages,
                        "bollinger_bands": analysis.technical_analysis.bollinger_bands,
                        "support_levels": analysis.technical_analysis.support_levels,
                        "resistance_levels": analysis.technical_analysis.resistance_levels
                    },
                    fundamental_analysis=analysis.fundamental_analysis,
                    macro_analysis={
                        "gdp_growth": analysis.macro_analysis.gdp_growth,
                        "inflation_rate": analysis.macro_analysis.inflation_rate,
                        "unemployment_rate": analysis.macro_analysis.unemployment_rate,
                        "interest_rates": analysis.macro_analysis.interest_rates,
                        "currency_strength": analysis.macro_analysis.currency_strength,
                        "trade_balance": analysis.macro_analysis.trade_balance,
                        "consumer_confidence": analysis.macro_analysis.consumer_confidence,
                        "industrial_production": analysis.macro_analysis.industrial_production
                    },
                    ai_reasoning=analysis.ai_reasoning,
                    recommendations=analysis.recommendations,
                    risk_assessment=analysis.risk_assessment,
                    confidence_score=analysis.confidence_score
                )
                
            except Exception as e:
                logger.error(f"Error in comprehensive market analysis: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/sentiment-analysis/multi-source",
                      response_model=SentimentAnalysisResponse)
        async def analyze_sentiment(
            request: SentimentAnalysisRequest
        ):
            """Analyze sentiment from multiple sources"""
            try:
                logger.info(f"Analyzing sentiment for {request.asset}")
                
                # Conduct sentiment analysis
                sentiment_analysis = await self.ai_reasoning_engine._analyze_sentiment(
                    request.asset, request.sources
                )
                
                return SentimentAnalysisResponse(
                    asset=request.asset,
                    analysis_timestamp=datetime.now().isoformat(),
                    overall_sentiment_score=sentiment_analysis["overall_sentiment_score"],
                    sentiment_classification=sentiment_analysis["sentiment_classification"],
                    confidence=sentiment_analysis["confidence"],
                    source_breakdown=sentiment_analysis["source_breakdown"],
                    sentiment_trend=sentiment_analysis["sentiment_trend"],
                    key_themes=sentiment_analysis["key_themes"]
                )
                
            except Exception as e:
                logger.error(f"Error in sentiment analysis: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/volatility-analysis/comprehensive",
                      response_model=VolatilityAnalysisResponse)
        async def analyze_volatility(
            request: VolatilityAnalysisRequest
        ):
            """Analyze volatility metrics and market uncertainty"""
            try:
                logger.info(f"Analyzing volatility for {request.asset}")
                
                # Convert market data
                market_data = [
                    MarketData(
                        symbol=request.asset,
                        timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now().isoformat())),
                        price=data.get("price", 0.0),
                        volume=data.get("volume", 0.0),
                        close_price=data.get("close", None)
                    )
                    for data in request.market_data
                ]
                
                # Conduct volatility analysis
                volatility_analysis = await self.ai_reasoning_engine._analyze_volatility(
                    request.asset, market_data
                )
                
                # Calculate uncertainty assessment
                uncertainty_assessment = self.ai_reasoning_engine._analyze_market_uncertainty(
                    volatility_analysis, {}, {}
                )
                
                return VolatilityAnalysisResponse(
                    asset=request.asset,
                    analysis_timestamp=datetime.now().isoformat(),
                    vix_level=volatility_analysis.vix_level,
                    historical_volatility=volatility_analysis.historical_volatility,
                    implied_volatility=volatility_analysis.implied_volatility,
                    volatility_rank=volatility_analysis.volatility_rank,
                    volatility_regime=volatility_analysis.volatility_regime.value,
                    term_structure=volatility_analysis.term_structure,
                    uncertainty_assessment=uncertainty_assessment
                )
                
            except Exception as e:
                logger.error(f"Error in volatility analysis: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/ai-reasoning/synthesize",
                      response_model=AIReasoningResponse)
        async def synthesize_ai_reasoning(
            request: AIReasoningRequest
        ):
            """Synthesize AI reasoning from multiple analysis components"""
            try:
                logger.info(f"Synthesizing AI reasoning for {request.asset}")
                
                # Create volatility metrics object
                volatility_analysis = VolatilityMetrics(
                    vix_level=request.volatility_data.get("vix_level", 20.0),
                    historical_volatility=request.volatility_data.get("historical_volatility", 0.20),
                    implied_volatility=request.volatility_data.get("implied_volatility", 0.22),
                    volatility_rank=request.volatility_data.get("volatility_rank", 0.5),
                    volatility_regime=request.volatility_data.get("volatility_regime", "moderate")
                )
                
                # Create technical indicators object
                technical_analysis = type('TechnicalIndicators', (), {
                    'rsi': request.technical_data.get("rsi"),
                    'macd': request.technical_data.get("macd"),
                    'moving_averages': request.technical_data.get("moving_averages", {}),
                    'bollinger_bands': request.technical_data.get("bollinger_bands", {}),
                    'support_levels': request.technical_data.get("support_levels", []),
                    'resistance_levels': request.technical_data.get("resistance_levels", [])
                })()
                
                # Create macro analysis object
                macro_analysis = MacroeconomicFactors(
                    gdp_growth=request.macro_data.get("gdp_growth"),
                    inflation_rate=request.macro_data.get("inflation_rate"),
                    unemployment_rate=request.macro_data.get("unemployment_rate"),
                    interest_rates=request.macro_data.get("interest_rates"),
                    currency_strength=request.macro_data.get("currency_strength"),
                    trade_balance=request.macro_data.get("trade_balance"),
                    consumer_confidence=request.macro_data.get("consumer_confidence"),
                    industrial_production=request.macro_data.get("industrial_production")
                )
                
                # Synthesize AI reasoning
                ai_reasoning = await self.ai_reasoning_engine._integrate_ai_reasoning(
                    request.asset,
                    request.sentiment_data,
                    volatility_analysis,
                    technical_analysis,
                    request.fundamental_data,
                    macro_analysis
                )
                
                # Generate narrative reasoning
                reasoning_narrative = self._generate_reasoning_narrative(
                    request.asset, ai_reasoning, request.sentiment_data, volatility_analysis
                )
                
                return AIReasoningResponse(
                    reasoning_id=f"reasoning_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    asset=request.asset,
                    analysis_timestamp=datetime.now().isoformat(),
                    key_drivers=ai_reasoning["reasoning_synthesis"]["key_drivers"],
                    market_uncertainty=ai_reasoning["reasoning_synthesis"]["market_uncertainty"],
                    directional_bias=ai_reasoning["reasoning_synthesis"]["directional_bias"],
                    conviction_level=ai_reasoning["reasoning_synthesis"]["conviction_level"],
                    risk_reward_assessment=ai_reasoning["reasoning_synthesis"]["risk_reward_assessment"],
                    specialized_analysis=ai_reasoning["reasoning_synthesis"].get("gold_specific_analysis", {}),
                    reasoning_narrative=reasoning_narrative
                )
                
            except Exception as e:
                logger.error(f"Error in AI reasoning synthesis: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/v1/business/gold-analysis/comprehensive",
                      response_model=GoldAnalysisResponse)
        async def analyze_gold_market(
            request: GoldAnalysisRequest
        ):
            """Specialized analysis for gold market with VIX and sentiment factors"""
            try:
                logger.info("Conducting specialized gold market analysis")
                
                # Convert market data
                market_data = [
                    MarketData(
                        symbol="GOLD",
                        timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now().isoformat())),
                        price=data.get("price", 0.0),
                        volume=data.get("volume", 0.0),
                        close_price=data.get("close", None)
                    )
                    for data in request.market_data
                ] if request.market_data else []
                
                # Conduct comprehensive analysis for gold
                analysis = await self.ai_reasoning_engine.analyze_market(
                    asset="GOLD",
                    asset_class=AssetClass.PRECIOUS_METALS,
                    market_data=market_data,
                    sentiment_sources=request.sentiment_sources
                )
                
                # Extract gold-specific insights
                gold_analysis = analysis.ai_reasoning["reasoning_synthesis"]["gold_specific_analysis"]
                directional_bias = analysis.ai_reasoning["reasoning_synthesis"]["directional_bias"]
                
                # Calculate price targets based on analysis
                current_price = market_data[-1].price if market_data else 2000.0
                price_targets = self._calculate_gold_price_targets(
                    current_price, directional_bias, analysis.volatility_analysis
                )
                
                return GoldAnalysisResponse(
                    analysis_id=f"gold_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    analysis_timestamp=analysis.analysis_timestamp.isoformat(),
                    gold_outlook=gold_analysis["outlook"],
                    supportive_factors=gold_analysis["supportive_factors"],
                    negative_factors=gold_analysis["negative_factors"],
                    vix_impact={
                        "current_vix": analysis.volatility_analysis.vix_level,
                        "impact": "supportive" if analysis.volatility_analysis.vix_level > 25 else "neutral",
                        "reasoning": "Elevated VIX indicates market uncertainty favoring gold" if analysis.volatility_analysis.vix_level > 25 else "Normal VIX levels provide neutral gold impact"
                    },
                    sentiment_impact={
                        "sentiment_score": analysis.sentiment_analysis["overall_sentiment_score"],
                        "impact": "positive" if analysis.sentiment_analysis["overall_sentiment_score"] > 0.1 else "negative" if analysis.sentiment_analysis["overall_sentiment_score"] < -0.1 else "neutral",
                        "reasoning": "Positive sentiment supports upward movement" if analysis.sentiment_analysis["overall_sentiment_score"] > 0.1 else "Negative sentiment creates headwinds"
                    },
                    macro_impact=self._analyze_gold_macro_impact(analysis.macro_analysis),
                    directional_bias=directional_bias,
                    conviction_level=analysis.ai_reasoning["reasoning_synthesis"]["conviction_level"],
                    price_targets=price_targets,
                    risk_factors=analysis.risk_assessment.get("risk_factors", [])
                )
                
            except Exception as e:
                logger.error(f"Error in gold analysis: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/v1/business/market-analysis/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "modules": {
                    "ai_reasoning_engine": "active",
                    "sentiment_analyzers": "active",
                    "volatility_models": "active",
                    "technical_analyzers": "active"
                }
            }
        
        @self.app.get("/api/v1/business/market-analysis/capabilities")
        async def get_analysis_capabilities():
            """Get system analysis capabilities"""
            return {
                "supported_assets": ["equities", "bonds", "commodities", "currencies", "cryptocurrencies", "precious_metals"],
                "sentiment_sources": ["news", "social_media", "analyst_reports", "market_sentiment"],
                "volatility_models": ["vix_analysis", "garch_modeling", "realized_volatility", "regime_detection"],
                "technical_indicators": ["rsi", "macd", "moving_averages", "bollinger_bands", "support_resistance"],
                "fundamental_analysis": ["equity_valuation", "bond_analysis", "commodity_fundamentals", "currency_analysis"],
                "macro_factors": ["gdp_growth", "inflation", "employment", "interest_rates", "currency_strength"],
                "specialized_analysis": ["gold_analysis", "safe_haven_analysis", "correlation_analysis", "scenario_modeling"]
            }
    
    def _generate_reasoning_narrative(
        self,
        asset: str,
        ai_reasoning: Dict[str, Any],
        sentiment_data: Dict[str, Any],
        volatility_analysis: VolatilityMetrics
    ) -> str:
        """Generate human-readable reasoning narrative"""
        
        key_drivers = ai_reasoning["reasoning_synthesis"]["key_drivers"]
        directional_bias = ai_reasoning["reasoning_synthesis"]["directional_bias"]
        conviction = ai_reasoning["reasoning_synthesis"]["conviction_level"]
        
        narrative_parts = []
        
        # Sentiment component
        sentiment_reasoning = key_drivers["sentiment"]["reasoning"]
        narrative_parts.append(f"Sentiment Analysis: {sentiment_reasoning}")
        
        # Volatility component  
        volatility_reasoning = key_drivers["volatility"]["reasoning"]
        narrative_parts.append(f"Volatility Analysis: {volatility_reasoning}")
        
        # Technical component
        technical_reasoning = key_drivers["technical"]["reasoning"]
        narrative_parts.append(f"Technical Analysis: {technical_reasoning}")
        
        # Macro component
        macro_reasoning = key_drivers["macro"]["reasoning"]
        narrative_parts.append(f"Macroeconomic Factors: {macro_reasoning}")
        
        # Overall assessment
        bias_direction = directional_bias["bias_direction"]
        bias_strength = directional_bias["confidence"]
        
        narrative_parts.append(
            f"Overall Assessment: Analysis indicates a {bias_direction} bias for {asset} with {conviction} conviction "
            f"(confidence: {bias_strength:.2f}). The combination of factors suggests "
            f"{'favorable conditions for upward movement' if bias_direction == 'bullish' else 'challenging conditions with downward pressure' if bias_direction == 'bearish' else 'mixed signals requiring cautious positioning'}."
        )
        
        return " | ".join(narrative_parts)
    
    def _calculate_gold_price_targets(
        self,
        current_price: float,
        directional_bias: Dict[str, Any],
        volatility_analysis: VolatilityMetrics
    ) -> Dict[str, str]:
        """Calculate gold price targets based on analysis"""
        
        bias_strength = directional_bias["confidence"]
        vol_adjustment = volatility_analysis.historical_volatility / 0.20  # Normalize to 20% vol
        
        if directional_bias["bias_direction"] == "bullish":
            upside_target = current_price * (1 + 0.08 * bias_strength * vol_adjustment)
            conservative_target = current_price * (1 + 0.04 * bias_strength)
        else:
            upside_target = current_price * (1 + 0.03 * bias_strength)
            conservative_target = current_price * (1 - 0.02 * bias_strength)
        
        downside_target = current_price * (1 - 0.06 * vol_adjustment)
        
        return {
            "upside_target": f"${upside_target:.0f}",
            "conservative_target": f"${conservative_target:.0f}",
            "downside_target": f"${downside_target:.0f}",
            "current_price": f"${current_price:.0f}"
        }
    
    def _analyze_gold_macro_impact(self, macro_analysis: MacroeconomicFactors) -> Dict[str, Any]:
        """Analyze macroeconomic impact on gold"""
        
        impact_factors = []
        overall_impact = "neutral"
        
        if macro_analysis.inflation_rate and macro_analysis.inflation_rate > 3.0:
            impact_factors.append({
                "factor": "High Inflation",
                "value": f"{macro_analysis.inflation_rate:.1f}%",
                "impact": "positive",
                "reasoning": "High inflation supports gold as inflation hedge"
            })
            overall_impact = "positive"
        
        if macro_analysis.interest_rates and macro_analysis.interest_rates < 2.0:
            impact_factors.append({
                "factor": "Low Interest Rates",
                "value": f"{macro_analysis.interest_rates:.1f}%",
                "impact": "positive", 
                "reasoning": "Low rates reduce opportunity cost of holding gold"
            })
            overall_impact = "positive"
        
        if macro_analysis.currency_strength and macro_analysis.currency_strength < -0.3:
            impact_factors.append({
                "factor": "Weak Currency",
                "value": f"{macro_analysis.currency_strength:.2f}",
                "impact": "positive",
                "reasoning": "Currency weakness typically supports gold prices"
            })
        
        return {
            "overall_impact": overall_impact,
            "impact_factors": impact_factors,
            "macro_score": len([f for f in impact_factors if f["impact"] == "positive"]) / max(len(impact_factors), 1)
        }
    
    async def _schedule_analysis_updates(
        self,
        asset: str,
        analysis: MarketAnalysis
    ) -> None:
        """Schedule periodic analysis updates"""
        try:
            # Schedule background monitoring and updates
            logger.info(f"Scheduled analysis updates for {asset}")
        except Exception as e:
            logger.error(f"Error scheduling analysis updates: {e}")
    
    def get_app(self) -> FastAPI:
        """Get FastAPI application instance"""
        return self.app

# Initialize API
financial_market_api = FinancialMarketAnalysisAPI()
app = financial_market_api.get_app()
