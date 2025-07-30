"""
Financial Market Analysis GraphQL Integration
Advanced query capabilities with complex relationships and real-time subscriptions
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, AsyncIterator
from datetime import datetime, timedelta
import strawberry
from strawberry.fastapi import GraphQLRouter
from strawberry.subscriptions import GRAPHQL_TRANSPORT_WS_PROTOCOL, GRAPHQL_WS_PROTOCOL
import logging

from .financial_market_analysis import (
    AIReasoningEngine, MarketData, SentimentData, VolatilityMetrics,
    MacroeconomicFactors, MarketAnalysis, AssetClass, MarketSentiment
)

logger = logging.getLogger(__name__)

# GraphQL Types
@strawberry.type
class MarketDataType:
    symbol: str
    timestamp: str
    price: float
    volume: float
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    close_price: Optional[float] = None

@strawberry.type
class SentimentAnalysisType:
    overall_sentiment_score: float
    sentiment_classification: str
    confidence: float
    source_breakdown: strawberry.scalars.JSON
    sentiment_trend: str
    key_themes: List[str]

@strawberry.type
class VolatilityAnalysisType:
    vix_level: float
    historical_volatility: float
    implied_volatility: float
    volatility_rank: float
    volatility_regime: str
    term_structure: strawberry.scalars.JSON
    uncertainty_level: str

@strawberry.type
class TechnicalAnalysisType:
    rsi: Optional[float]
    macd: strawberry.scalars.JSON
    moving_averages: strawberry.scalars.JSON
    bollinger_bands: strawberry.scalars.JSON
    support_levels: List[float]
    resistance_levels: List[float]
    trend_direction: str
    momentum: str

@strawberry.type
class FundamentalAnalysisType:
    equity_metrics: Optional[strawberry.scalars.JSON]
    bond_metrics: Optional[strawberry.scalars.JSON]
    commodity_metrics: Optional[strawberry.scalars.JSON]
    currency_metrics: Optional[strawberry.scalars.JSON]
    valuation_assessment: str
    quality_score: float

@strawberry.type
class MacroeconomicAnalysisType:
    gdp_growth: Optional[float]
    inflation_rate: Optional[float]
    unemployment_rate: Optional[float]
    interest_rates: Optional[float]
    currency_strength: Optional[float]
    trade_balance: Optional[float]
    consumer_confidence: Optional[float]
    industrial_production: Optional[float]
    macro_sentiment: str

@strawberry.type
class AIReasoningType:
    reasoning_synthesis: strawberry.scalars.JSON
    key_drivers: strawberry.scalars.JSON
    market_uncertainty: strawberry.scalars.JSON
    directional_bias: strawberry.scalars.JSON
    conviction_level: str
    risk_reward_assessment: strawberry.scalars.JSON
    scenario_analysis: strawberry.scalars.JSON
    reasoning_narrative: str

@strawberry.type
class RecommendationType:
    action: str
    target_asset: str
    position_size: float
    entry_price: Optional[float]
    stop_loss: Optional[float]
    take_profit: Optional[float]
    time_horizon: str
    confidence: float
    rationale: str

@strawberry.type
class RiskAssessmentType:
    overall_risk_level: str
    risk_factors: List[str]
    var_estimate: float
    max_drawdown_estimate: float
    correlation_risks: strawberry.scalars.JSON
    liquidity_risk: str
    concentration_risk: str

@strawberry.type
class ComprehensiveMarketAnalysisType:
    analysis_id: str
    asset: str
    asset_class: str
    analysis_timestamp: str
    sentiment_analysis: SentimentAnalysisType
    volatility_analysis: VolatilityAnalysisType
    technical_analysis: TechnicalAnalysisType
    fundamental_analysis: FundamentalAnalysisType
    macroeconomic_analysis: MacroeconomicAnalysisType
    ai_reasoning: AIReasoningType
    recommendations: List[RecommendationType]
    risk_assessment: RiskAssessmentType
    confidence_score: float

@strawberry.type
class GoldSpecificAnalysisType:
    outlook: str
    vix_impact_assessment: strawberry.scalars.JSON
    safe_haven_demand: strawberry.scalars.JSON
    inflation_hedge_analysis: strawberry.scalars.JSON
    currency_correlation: strawberry.scalars.JSON
    supportive_factors: List[strawberry.scalars.JSON]
    negative_factors: List[strawberry.scalars.JSON]
    price_targets: strawberry.scalars.JSON
    conviction_level: str

@strawberry.type
class MarketAlertType:
    alert_id: str
    asset: str
    alert_type: str
    severity: str
    message: str
    triggered_at: str
    conditions: strawberry.scalars.JSON

@strawberry.type
class MarketCorrelationAnalysisType:
    base_asset: str
    correlated_assets: List[str]
    correlation_matrix: strawberry.scalars.JSON
    correlation_trends: strawberry.scalars.JSON
    regime_analysis: strawberry.scalars.JSON

# Input Types
@strawberry.input
class MarketDataInput:
    symbol: str
    price: float
    volume: float = 0.0
    timestamp: Optional[str] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    close_price: Optional[float] = None

@strawberry.input
class MacroIndicatorsInput:
    gdp_growth: Optional[float] = None
    inflation_rate: Optional[float] = None
    unemployment_rate: Optional[float] = None
    interest_rates: Optional[float] = None
    currency_strength: Optional[float] = None
    trade_balance: Optional[float] = None
    consumer_confidence: Optional[float] = None
    industrial_production: Optional[float] = None

@strawberry.input
class AnalysisOptionsInput:
    include_scenarios: bool = True
    include_correlations: bool = True
    include_specialized_analysis: bool = True
    analysis_depth: str = "comprehensive"
    time_horizon: str = "medium_term"

class FinancialMarketGraphQL:
    """
    GraphQL integration for financial market analysis with advanced querying
    """
    
    def __init__(self):
        self.ai_reasoning_engine = AIReasoningEngine()
        self.active_subscriptions = {}
        
    @strawberry.type
    class Query:
        
        @strawberry.field
        async def comprehensive_market_analysis(
            self,
            asset: str,
            asset_class: str,
            market_data: List[MarketDataInput],
            sentiment_sources: Optional[List[str]] = None,
            macro_indicators: Optional[MacroIndicatorsInput] = None,
            options: Optional[AnalysisOptionsInput] = None
        ) -> ComprehensiveMarketAnalysisType:
            """Conduct comprehensive market analysis for an asset"""
            
            try:
                # Initialize engine if needed
                engine = AIReasoningEngine()
                
                # Convert inputs to internal format
                asset_class_enum = AssetClass(asset_class.lower())
                
                market_data_list = [
                    MarketData(
                        symbol=data.symbol,
                        timestamp=datetime.fromisoformat(data.timestamp) if data.timestamp else datetime.now(),
                        price=data.price,
                        volume=data.volume,
                        open_price=data.open_price,
                        high_price=data.high_price,
                        low_price=data.low_price,
                        close_price=data.close_price
                    )
                    for data in market_data
                ]
                
                # Convert macro indicators
                macro_indicators_obj = None
                if macro_indicators:
                    macro_indicators_obj = MacroeconomicFactors(
                        gdp_growth=macro_indicators.gdp_growth,
                        inflation_rate=macro_indicators.inflation_rate,
                        unemployment_rate=macro_indicators.unemployment_rate,
                        interest_rates=macro_indicators.interest_rates,
                        currency_strength=macro_indicators.currency_strength,
                        trade_balance=macro_indicators.trade_balance,
                        consumer_confidence=macro_indicators.consumer_confidence,
                        industrial_production=macro_indicators.industrial_production
                    )
                
                # Conduct analysis
                analysis = await engine.analyze_market(
                    asset=asset,
                    asset_class=asset_class_enum,
                    market_data=market_data_list,
                    sentiment_sources=sentiment_sources,
                    macro_indicators=macro_indicators_obj
                )
                
                # Convert to GraphQL types
                return ComprehensiveMarketAnalysisType(
                    analysis_id=f"gql_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    asset=analysis.asset,
                    asset_class=analysis.asset_class.value,
                    analysis_timestamp=analysis.analysis_timestamp.isoformat(),
                    sentiment_analysis=SentimentAnalysisType(
                        overall_sentiment_score=analysis.sentiment_analysis["overall_sentiment_score"],
                        sentiment_classification=analysis.sentiment_analysis["sentiment_classification"],
                        confidence=analysis.sentiment_analysis["confidence"],
                        source_breakdown=analysis.sentiment_analysis["source_breakdown"],
                        sentiment_trend=analysis.sentiment_analysis["sentiment_trend"],
                        key_themes=analysis.sentiment_analysis["key_themes"]
                    ),
                    volatility_analysis=VolatilityAnalysisType(
                        vix_level=analysis.volatility_analysis.vix_level,
                        historical_volatility=analysis.volatility_analysis.historical_volatility,
                        implied_volatility=analysis.volatility_analysis.implied_volatility,
                        volatility_rank=analysis.volatility_analysis.volatility_rank,
                        volatility_regime=analysis.volatility_analysis.volatility_regime.value,
                        term_structure=analysis.volatility_analysis.term_structure,
                        uncertainty_level="high" if analysis.volatility_analysis.vix_level > 25 else "moderate" if analysis.volatility_analysis.vix_level > 20 else "low"
                    ),
                    technical_analysis=TechnicalAnalysisType(
                        rsi=analysis.technical_analysis.rsi,
                        macd=analysis.technical_analysis.macd,
                        moving_averages=analysis.technical_analysis.moving_averages,
                        bollinger_bands=analysis.technical_analysis.bollinger_bands,
                        support_levels=analysis.technical_analysis.support_levels,
                        resistance_levels=analysis.technical_analysis.resistance_levels,
                        trend_direction="bullish" if analysis.technical_analysis.rsi and analysis.technical_analysis.rsi > 50 else "bearish",
                        momentum="strong" if analysis.technical_analysis.rsi and abs(analysis.technical_analysis.rsi - 50) > 20 else "moderate"
                    ),
                    fundamental_analysis=FundamentalAnalysisType(
                        equity_metrics=analysis.fundamental_analysis.get("equity_metrics"),
                        bond_metrics=analysis.fundamental_analysis.get("bond_metrics"),
                        commodity_metrics=analysis.fundamental_analysis.get("commodity_metrics"),
                        currency_metrics=analysis.fundamental_analysis.get("currency_metrics"),
                        valuation_assessment=analysis.fundamental_analysis.get("valuation_assessment", "neutral"),
                        quality_score=analysis.fundamental_analysis.get("quality_score", 0.5)
                    ),
                    macroeconomic_analysis=MacroeconomicAnalysisType(
                        gdp_growth=analysis.macro_analysis.gdp_growth,
                        inflation_rate=analysis.macro_analysis.inflation_rate,
                        unemployment_rate=analysis.macro_analysis.unemployment_rate,
                        interest_rates=analysis.macro_analysis.interest_rates,
                        currency_strength=analysis.macro_analysis.currency_strength,
                        trade_balance=analysis.macro_analysis.trade_balance,
                        consumer_confidence=analysis.macro_analysis.consumer_confidence,
                        industrial_production=analysis.macro_analysis.industrial_production,
                        macro_sentiment="positive" if analysis.macro_analysis.gdp_growth and analysis.macro_analysis.gdp_growth > 2.0 else "negative" if analysis.macro_analysis.gdp_growth and analysis.macro_analysis.gdp_growth < 0 else "neutral"
                    ),
                    ai_reasoning=AIReasoningType(
                        reasoning_synthesis=analysis.ai_reasoning["reasoning_synthesis"],
                        key_drivers=analysis.ai_reasoning["reasoning_synthesis"]["key_drivers"],
                        market_uncertainty=analysis.ai_reasoning["reasoning_synthesis"]["market_uncertainty"],
                        directional_bias=analysis.ai_reasoning["reasoning_synthesis"]["directional_bias"],
                        conviction_level=analysis.ai_reasoning["reasoning_synthesis"]["conviction_level"],
                        risk_reward_assessment=analysis.ai_reasoning["reasoning_synthesis"]["risk_reward_assessment"],
                        scenario_analysis=analysis.ai_reasoning["reasoning_synthesis"].get("scenario_analysis", {}),
                        reasoning_narrative=analysis.ai_reasoning["reasoning_synthesis"]["narrative"]
                    ),
                    recommendations=[
                        RecommendationType(
                            action=rec["action"],
                            target_asset=rec["target_asset"],
                            position_size=rec["position_size"],
                            entry_price=rec.get("entry_price"),
                            stop_loss=rec.get("stop_loss"),
                            take_profit=rec.get("take_profit"),
                            time_horizon=rec["time_horizon"],
                            confidence=rec["confidence"],
                            rationale=rec["rationale"]
                        )
                        for rec in analysis.recommendations
                    ],
                    risk_assessment=RiskAssessmentType(
                        overall_risk_level=analysis.risk_assessment["overall_risk_level"],
                        risk_factors=analysis.risk_assessment["risk_factors"],
                        var_estimate=analysis.risk_assessment["var_estimate"],
                        max_drawdown_estimate=analysis.risk_assessment["max_drawdown_estimate"],
                        correlation_risks=analysis.risk_assessment.get("correlation_risks", {}),
                        liquidity_risk=analysis.risk_assessment.get("liquidity_risk", "low"),
                        concentration_risk=analysis.risk_assessment.get("concentration_risk", "low")
                    ),
                    confidence_score=analysis.confidence_score
                )
                
            except Exception as e:
                logger.error(f"Error in GraphQL comprehensive analysis: {e}")
                raise e
        
        @strawberry.field
        async def gold_market_analysis(
            self,
            market_data: Optional[List[MarketDataInput]] = None,
            sentiment_sources: Optional[List[str]] = None,
            include_vix_analysis: bool = True,
            include_macro_factors: bool = True
        ) -> GoldSpecificAnalysisType:
            """Specialized analysis for gold market"""
            
            try:
                engine = AIReasoningEngine()
                
                # Convert market data
                market_data_list = []
                if market_data:
                    market_data_list = [
                        MarketData(
                            symbol="GOLD",
                            timestamp=datetime.fromisoformat(data.timestamp) if data.timestamp else datetime.now(),
                            price=data.price,
                            volume=data.volume,
                            close_price=data.close_price
                        )
                        for data in market_data
                    ]
                
                # Conduct gold analysis
                analysis = await engine.analyze_market(
                    asset="GOLD",
                    asset_class=AssetClass.PRECIOUS_METALS,
                    market_data=market_data_list,
                    sentiment_sources=sentiment_sources
                )
                
                # Extract gold-specific analysis
                gold_analysis = analysis.ai_reasoning["reasoning_synthesis"]["gold_specific_analysis"]
                
                return GoldSpecificAnalysisType(
                    outlook=gold_analysis["outlook"],
                    vix_impact_assessment=gold_analysis["vix_impact_assessment"],
                    safe_haven_demand=gold_analysis["safe_haven_demand"],
                    inflation_hedge_analysis=gold_analysis["inflation_hedge_analysis"],
                    currency_correlation=gold_analysis["currency_correlation"],
                    supportive_factors=gold_analysis["supportive_factors"],
                    negative_factors=gold_analysis["negative_factors"],
                    price_targets={
                        "upside": f"${(market_data_list[-1].price * 1.08):.0f}" if market_data_list else "$2160",
                        "downside": f"${(market_data_list[-1].price * 0.92):.0f}" if market_data_list else "$1840",
                        "current": f"${market_data_list[-1].price:.0f}" if market_data_list else "$2000"
                    },
                    conviction_level=analysis.ai_reasoning["reasoning_synthesis"]["conviction_level"]
                )
                
            except Exception as e:
                logger.error(f"Error in GraphQL gold analysis: {e}")
                raise e
        
        @strawberry.field
        async def market_correlation_analysis(
            self,
            base_asset: str,
            correlated_assets: List[str],
            timeframe: str = "30d"
        ) -> MarketCorrelationAnalysisType:
            """Analyze correlations between assets"""
            
            try:
                engine = AIReasoningEngine()
                
                # Conduct correlation analysis
                correlation_data = await engine._analyze_correlations(
                    base_asset, correlated_assets, timeframe
                )
                
                return MarketCorrelationAnalysisType(
                    base_asset=base_asset,
                    correlated_assets=correlated_assets,
                    correlation_matrix=correlation_data["correlation_matrix"],
                    correlation_trends=correlation_data["correlation_trends"],
                    regime_analysis=correlation_data["regime_analysis"]
                )
                
            except Exception as e:
                logger.error(f"Error in correlation analysis: {e}")
                raise e
    
    @strawberry.type
    class Subscription:
        
        @strawberry.subscription
        async def market_alerts(
            self,
            assets: List[str],
            alert_types: Optional[List[str]] = None
        ) -> AsyncIterator[MarketAlertType]:
            """Subscribe to real-time market alerts"""
            
            try:
                while True:
                    # Simulate market monitoring
                    await asyncio.sleep(30)  # Check every 30 seconds
                    
                    for asset in assets:
                        # Check for alert conditions
                        alert = await self._check_alert_conditions(asset, alert_types)
                        if alert:
                            yield MarketAlertType(
                                alert_id=f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                                asset=alert["asset"],
                                alert_type=alert["type"],
                                severity=alert["severity"],
                                message=alert["message"],
                                triggered_at=datetime.now().isoformat(),
                                conditions=alert["conditions"]
                            )
                            
            except Exception as e:
                logger.error(f"Error in market alerts subscription: {e}")
                break
        
        @strawberry.subscription
        async def live_sentiment_updates(
            self,
            asset: str
        ) -> AsyncIterator[SentimentAnalysisType]:
            """Subscribe to live sentiment updates"""
            
            try:
                engine = AIReasoningEngine()
                
                while True:
                    await asyncio.sleep(300)  # Update every 5 minutes
                    
                    # Get latest sentiment analysis
                    sentiment_analysis = await engine._analyze_sentiment(
                        asset, ["news", "social_media", "analyst_reports"]
                    )
                    
                    yield SentimentAnalysisType(
                        overall_sentiment_score=sentiment_analysis["overall_sentiment_score"],
                        sentiment_classification=sentiment_analysis["sentiment_classification"],
                        confidence=sentiment_analysis["confidence"],
                        source_breakdown=sentiment_analysis["source_breakdown"],
                        sentiment_trend=sentiment_analysis["sentiment_trend"],
                        key_themes=sentiment_analysis["key_themes"]
                    )
                    
            except Exception as e:
                logger.error(f"Error in sentiment updates subscription: {e}")
                break
        
        async def _check_alert_conditions(
            self,
            asset: str,
            alert_types: Optional[List[str]]
        ) -> Optional[Dict[str, Any]]:
            """Check if any alert conditions are met"""
            
            # Placeholder implementation
            # In production, this would check real market conditions
            return None
    
    def get_schema(self):
        """Get GraphQL schema"""
        return strawberry.Schema(
            query=self.Query,
            subscription=self.Subscription
        )
    
    def get_router(self):
        """Get GraphQL router for FastAPI integration"""
        schema = self.get_schema()
        return GraphQLRouter(
            schema,
            subscription_protocols=[
                GRAPHQL_TRANSPORT_WS_PROTOCOL,
                GRAPHQL_WS_PROTOCOL,
            ],
        )

# Initialize GraphQL integration
financial_market_graphql = FinancialMarketGraphQL()
graphql_router = financial_market_graphql.get_router()
