"""
Financial Market Analysis and AI Reasoning Module
Advanced market analysis with sentiment analysis, volatility modeling, and macroeconomic reasoning
"""

import asyncio
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import logging
import math
from statistics import mean, stdev

logger = logging.getLogger(__name__)

class MarketSentiment(Enum):
    EXTREMELY_BEARISH = "extremely_bearish"
    BEARISH = "bearish"
    SLIGHTLY_BEARISH = "slightly_bearish"
    NEUTRAL = "neutral"
    SLIGHTLY_BULLISH = "slightly_bullish"
    BULLISH = "bullish"
    EXTREMELY_BULLISH = "extremely_bullish"

class AssetClass(Enum):
    EQUITIES = "equities"
    BONDS = "bonds"
    COMMODITIES = "commodities"
    CURRENCIES = "currencies"
    CRYPTOCURRENCIES = "cryptocurrencies"
    REAL_ESTATE = "real_estate"
    PRECIOUS_METALS = "precious_metals"

class VolatilityLevel(Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"
    EXTREME = "extreme"

class TrendDirection(Enum):
    STRONG_DOWNTREND = "strong_downtrend"
    DOWNTREND = "downtrend"
    SIDEWAYS = "sideways"
    UPTREND = "uptrend"
    STRONG_UPTREND = "strong_uptrend"

class RiskLevel(Enum):
    VERY_LOW = 1
    LOW = 2
    MODERATE = 3
    HIGH = 4
    VERY_HIGH = 5

@dataclass
class MarketData:
    """Market data container for analysis"""
    symbol: str
    timestamp: datetime
    price: float
    volume: float
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    close_price: Optional[float] = None
    
@dataclass
class SentimentData:
    """Sentiment analysis data"""
    source: str
    timestamp: datetime
    sentiment_score: float  # -1.0 to 1.0
    confidence: float  # 0.0 to 1.0
    text_sample: Optional[str] = None
    keywords: List[str] = field(default_factory=list)

@dataclass
class VolatilityMetrics:
    """Volatility analysis metrics"""
    vix_level: float
    historical_volatility: float
    implied_volatility: float
    volatility_rank: float  # Percentile rank
    volatility_regime: VolatilityLevel
    term_structure: Dict[str, float] = field(default_factory=dict)

@dataclass
class MacroeconomicFactors:
    """Macroeconomic indicators"""
    gdp_growth: Optional[float] = None
    inflation_rate: Optional[float] = None
    unemployment_rate: Optional[float] = None
    interest_rates: Optional[float] = None
    currency_strength: Optional[float] = None
    trade_balance: Optional[float] = None
    consumer_confidence: Optional[float] = None
    industrial_production: Optional[float] = None

@dataclass
class TechnicalIndicators:
    """Technical analysis indicators"""
    rsi: Optional[float] = None
    macd: Optional[float] = None
    moving_averages: Dict[str, float] = field(default_factory=dict)
    bollinger_bands: Dict[str, float] = field(default_factory=dict)
    support_levels: List[float] = field(default_factory=list)
    resistance_levels: List[float] = field(default_factory=list)

@dataclass
class MarketAnalysis:
    """Comprehensive market analysis result"""
    asset: str
    analysis_timestamp: datetime
    sentiment_analysis: Dict[str, Any]
    volatility_analysis: VolatilityMetrics
    technical_analysis: TechnicalIndicators
    fundamental_analysis: Dict[str, Any]
    macro_analysis: MacroeconomicFactors
    ai_reasoning: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    risk_assessment: Dict[str, Any]
    confidence_score: float

class AIReasoningEngine:
    """
    Advanced AI reasoning engine for financial market analysis
    Integrates sentiment, volatility, technical, and fundamental analysis
    """
    
    def __init__(self):
        self.sentiment_analyzers = {}
        self.volatility_models = {}
        self.technical_analyzers = {}
        self.fundamental_analyzers = {}
        self.macro_analyzers = {}
        self.reasoning_models = {}
        self._initialize_analyzers()
    
    def _initialize_analyzers(self) -> None:
        """Initialize analysis components"""
        
        # Initialize sentiment analysis models
        self.sentiment_analyzers = {
            "news": NewssentimentAnalyzer(),
            "social_media": SocialMediaSentimentAnalyzer(),
            "analyst_reports": AnalystSentimentAnalyzer(),
            "market_sentiment": MarketSentimentAnalyzer()
        }
        
        # Initialize volatility models
        self.volatility_models = {
            "vix_analyzer": VIXAnalyzer(),
            "garch_model": GARCHVolatilityModel(),
            "realized_vol": RealizedVolatilityCalculator(),
            "regime_detector": VolatilityRegimeDetector()
        }
        
        # Initialize technical analyzers
        self.technical_analyzers = {
            "trend_analyzer": TrendAnalyzer(),
            "momentum_analyzer": MomentumAnalyzer(),
            "support_resistance": SupportResistanceAnalyzer(),
            "pattern_recognition": PatternRecognitionEngine()
        }
        
        # Initialize fundamental analyzers
        self.fundamental_analyzers = {
            "equity_valuation": EquityValuationAnalyzer(),
            "bond_analyzer": BondAnalyzer(),
            "commodity_analyzer": CommodityAnalyzer(),
            "currency_analyzer": CurrencyAnalyzer()
        }
        
        # Initialize macro analyzers
        self.macro_analyzers = {
            "economic_indicators": EconomicIndicatorAnalyzer(),
            "policy_analyzer": MonetaryPolicyAnalyzer(),
            "geopolitical_analyzer": GeopoliticalAnalyzer(),
            "sector_rotation": SectorRotationAnalyzer()
        }
        
        # Initialize reasoning models
        self.reasoning_models = {
            "multi_factor": MultiFactorReasoningModel(),
            "scenario_analyzer": ScenarioAnalyzer(),
            "correlation_analyzer": CorrelationAnalyzer(),
            "risk_attribution": RiskAttributionModel()
        }
    
    async def analyze_market(
        self,
        asset: str,
        asset_class: AssetClass,
        market_data: List[MarketData],
        sentiment_sources: List[str] = None,
        macro_indicators: MacroeconomicFactors = None
    ) -> MarketAnalysis:
        """Conduct comprehensive market analysis with AI reasoning"""
        
        try:
            logger.info(f"Starting comprehensive market analysis for {asset}")
            
            analysis_timestamp = datetime.now()
            
            # Sentiment Analysis
            sentiment_analysis = await self._analyze_sentiment(
                asset, sentiment_sources or ["news", "social_media", "analyst_reports"]
            )
            
            # Volatility Analysis
            volatility_analysis = await self._analyze_volatility(asset, market_data)
            
            # Technical Analysis
            technical_analysis = await self._analyze_technical(market_data)
            
            # Fundamental Analysis
            fundamental_analysis = await self._analyze_fundamental(asset, asset_class)
            
            # Macroeconomic Analysis
            macro_analysis = await self._analyze_macroeconomic(
                asset_class, macro_indicators
            )
            
            # AI Reasoning Integration
            ai_reasoning = await self._integrate_ai_reasoning(
                asset,
                sentiment_analysis,
                volatility_analysis,
                technical_analysis,
                fundamental_analysis,
                macro_analysis
            )
            
            # Generate Recommendations
            recommendations = await self._generate_recommendations(
                asset, ai_reasoning, sentiment_analysis, volatility_analysis
            )
            
            # Risk Assessment
            risk_assessment = await self._assess_risk(
                ai_reasoning, volatility_analysis, macro_analysis
            )
            
            # Calculate Overall Confidence
            confidence_score = self._calculate_confidence_score(
                sentiment_analysis, volatility_analysis, technical_analysis
            )
            
            return MarketAnalysis(
                asset=asset,
                analysis_timestamp=analysis_timestamp,
                sentiment_analysis=sentiment_analysis,
                volatility_analysis=volatility_analysis,
                technical_analysis=technical_analysis,
                fundamental_analysis=fundamental_analysis,
                macro_analysis=macro_analysis,
                ai_reasoning=ai_reasoning,
                recommendations=recommendations,
                risk_assessment=risk_assessment,
                confidence_score=confidence_score
            )
            
        except Exception as e:
            logger.error(f"Error in market analysis: {e}")
            raise
    
    async def _analyze_sentiment(
        self,
        asset: str,
        sources: List[str]
    ) -> Dict[str, Any]:
        """Analyze market sentiment from multiple sources"""
        
        sentiment_results = {}
        
        for source in sources:
            if source in self.sentiment_analyzers:
                analyzer = self.sentiment_analyzers[source]
                result = await analyzer.analyze_sentiment(asset)
                sentiment_results[source] = result
        
        # Aggregate sentiment scores
        sentiment_scores = [
            result.get("sentiment_score", 0.0) 
            for result in sentiment_results.values()
        ]
        
        overall_sentiment = mean(sentiment_scores) if sentiment_scores else 0.0
        sentiment_confidence = mean([
            result.get("confidence", 0.0)
            for result in sentiment_results.values()
        ]) if sentiment_results else 0.0
        
        # Classify sentiment
        sentiment_classification = self._classify_sentiment(overall_sentiment)
        
        return {
            "overall_sentiment_score": overall_sentiment,
            "sentiment_classification": sentiment_classification.value,
            "confidence": sentiment_confidence,
            "source_breakdown": sentiment_results,
            "sentiment_trend": self._calculate_sentiment_trend(sentiment_results),
            "key_themes": self._extract_sentiment_themes(sentiment_results)
        }
    
    async def _analyze_volatility(
        self,
        asset: str,
        market_data: List[MarketData]
    ) -> VolatilityMetrics:
        """Analyze volatility metrics and regime"""
        
        # VIX Analysis (for equity markets)
        vix_analyzer = self.volatility_models["vix_analyzer"]
        vix_analysis = await vix_analyzer.analyze_vix()
        
        # Historical Volatility Calculation
        realized_vol_calculator = self.volatility_models["realized_vol"]
        historical_vol = realized_vol_calculator.calculate_realized_volatility(market_data)
        
        # GARCH Model for Volatility Forecasting
        garch_model = self.volatility_models["garch_model"]
        implied_vol = await garch_model.forecast_volatility(market_data)
        
        # Volatility Regime Detection
        regime_detector = self.volatility_models["regime_detector"]
        volatility_regime = regime_detector.detect_regime(historical_vol)
        
        # Volatility Rank Calculation
        volatility_rank = self._calculate_volatility_rank(historical_vol)
        
        return VolatilityMetrics(
            vix_level=vix_analysis.get("current_level", 20.0),
            historical_volatility=historical_vol,
            implied_volatility=implied_vol,
            volatility_rank=volatility_rank,
            volatility_regime=volatility_regime,
            term_structure=vix_analysis.get("term_structure", {})
        )
    
    async def _analyze_technical(
        self,
        market_data: List[MarketData]
    ) -> TechnicalIndicators:
        """Perform technical analysis"""
        
        # Extract price data
        prices = [data.close_price or data.price for data in market_data]
        
        # Calculate technical indicators
        rsi = self._calculate_rsi(prices)
        macd = self._calculate_macd(prices)
        moving_averages = self._calculate_moving_averages(prices)
        bollinger_bands = self._calculate_bollinger_bands(prices)
        
        # Support and resistance levels
        support_resistance = self.technical_analyzers["support_resistance"]
        support_levels, resistance_levels = support_resistance.find_levels(market_data)
        
        return TechnicalIndicators(
            rsi=rsi,
            macd=macd,
            moving_averages=moving_averages,
            bollinger_bands=bollinger_bands,
            support_levels=support_levels,
            resistance_levels=resistance_levels
        )
    
    async def _analyze_fundamental(
        self,
        asset: str,
        asset_class: AssetClass
    ) -> Dict[str, Any]:
        """Perform fundamental analysis based on asset class"""
        
        analyzer_key = {
            AssetClass.EQUITIES: "equity_valuation",
            AssetClass.BONDS: "bond_analyzer",
            AssetClass.COMMODITIES: "commodity_analyzer",
            AssetClass.CURRENCIES: "currency_analyzer"
        }.get(asset_class, "equity_valuation")
        
        if analyzer_key in self.fundamental_analyzers:
            analyzer = self.fundamental_analyzers[analyzer_key]
            return await analyzer.analyze(asset)
        
        return {"analysis": "Fundamental analysis not available for this asset class"}
    
    async def _analyze_macroeconomic(
        self,
        asset_class: AssetClass,
        macro_indicators: MacroeconomicFactors = None
    ) -> MacroeconomicFactors:
        """Analyze macroeconomic factors"""
        
        if macro_indicators:
            return macro_indicators
        
        # Fetch current macroeconomic data
        economic_analyzer = self.macro_analyzers["economic_indicators"]
        current_indicators = await economic_analyzer.get_current_indicators()
        
        return MacroeconomicFactors(
            gdp_growth=current_indicators.get("gdp_growth"),
            inflation_rate=current_indicators.get("inflation_rate"),
            unemployment_rate=current_indicators.get("unemployment_rate"),
            interest_rates=current_indicators.get("interest_rates"),
            currency_strength=current_indicators.get("currency_strength"),
            trade_balance=current_indicators.get("trade_balance"),
            consumer_confidence=current_indicators.get("consumer_confidence"),
            industrial_production=current_indicators.get("industrial_production")
        )
    
    async def _integrate_ai_reasoning(
        self,
        asset: str,
        sentiment_analysis: Dict[str, Any],
        volatility_analysis: VolatilityMetrics,
        technical_analysis: TechnicalIndicators,
        fundamental_analysis: Dict[str, Any],
        macro_analysis: MacroeconomicFactors
    ) -> Dict[str, Any]:
        """Integrate all analyses using AI reasoning"""
        
        # Multi-factor reasoning model
        multi_factor_model = self.reasoning_models["multi_factor"]
        integrated_analysis = await multi_factor_model.integrate_factors(
            sentiment_analysis,
            volatility_analysis,
            technical_analysis,
            fundamental_analysis,
            macro_analysis
        )
        
        # Scenario analysis
        scenario_analyzer = self.reasoning_models["scenario_analyzer"]
        scenarios = await scenario_analyzer.generate_scenarios(
            asset, integrated_analysis
        )
        
        # Correlation analysis
        correlation_analyzer = self.reasoning_models["correlation_analyzer"]
        correlations = await correlation_analyzer.analyze_correlations(
            asset, sentiment_analysis, volatility_analysis
        )
        
        # Risk attribution
        risk_attribution = self.reasoning_models["risk_attribution"]
        risk_factors = await risk_attribution.attribute_risk(
            volatility_analysis, macro_analysis
        )
        
        # AI reasoning synthesis
        reasoning_synthesis = self._synthesize_reasoning(
            sentiment_analysis,
            volatility_analysis,
            technical_analysis,
            fundamental_analysis,
            macro_analysis,
            scenarios,
            correlations,
            risk_factors
        )
        
        return {
            "integrated_analysis": integrated_analysis,
            "scenarios": scenarios,
            "correlations": correlations,
            "risk_attribution": risk_factors,
            "reasoning_synthesis": reasoning_synthesis,
            "confidence_factors": self._calculate_reasoning_confidence(
                sentiment_analysis, volatility_analysis, technical_analysis
            )
        }
    
    def _synthesize_reasoning(
        self,
        sentiment_analysis: Dict[str, Any],
        volatility_analysis: VolatilityMetrics,
        technical_analysis: TechnicalIndicators,
        fundamental_analysis: Dict[str, Any],
        macro_analysis: MacroeconomicFactors,
        scenarios: Dict[str, Any],
        correlations: Dict[str, Any],
        risk_factors: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Synthesize AI reasoning from all analysis components"""
        
        # Extract key signals
        sentiment_signal = sentiment_analysis.get("overall_sentiment_score", 0.0)
        vix_level = volatility_analysis.vix_level
        trend_signal = self._extract_trend_signal(technical_analysis)
        
        # Gold-specific reasoning (as mentioned in the user request)
        gold_reasoning = self._analyze_gold_specific_factors(
            sentiment_signal, vix_level, macro_analysis
        )
        
        # Market uncertainty analysis
        uncertainty_analysis = self._analyze_market_uncertainty(
            volatility_analysis, correlations, risk_factors
        )
        
        # Directional bias calculation
        directional_bias = self._calculate_directional_bias(
            sentiment_signal, trend_signal, uncertainty_analysis
        )
        
        return {
            "key_drivers": {
                "sentiment": {
                    "score": sentiment_signal,
                    "impact": "positive" if sentiment_signal > 0.1 else "negative" if sentiment_signal < -0.1 else "neutral",
                    "reasoning": self._generate_sentiment_reasoning(sentiment_analysis)
                },
                "volatility": {
                    "vix_level": vix_level,
                    "regime": volatility_analysis.volatility_regime.value,
                    "impact": "supportive" if vix_level > 25 else "neutral",
                    "reasoning": self._generate_volatility_reasoning(volatility_analysis)
                },
                "technical": {
                    "trend": trend_signal,
                    "momentum": technical_analysis.rsi,
                    "reasoning": self._generate_technical_reasoning(technical_analysis)
                },
                "macro": {
                    "factors": self._extract_macro_drivers(macro_analysis),
                    "reasoning": self._generate_macro_reasoning(macro_analysis)
                }
            },
            "gold_specific_analysis": gold_reasoning,
            "market_uncertainty": uncertainty_analysis,
            "directional_bias": directional_bias,
            "conviction_level": self._calculate_conviction_level(
                sentiment_signal, vix_level, trend_signal
            ),
            "risk_reward_assessment": self._assess_risk_reward(
                directional_bias, volatility_analysis, scenarios
            )
        }
    
    def _analyze_gold_specific_factors(
        self,
        sentiment_signal: float,
        vix_level: float,
        macro_analysis: MacroeconomicFactors
    ) -> Dict[str, Any]:
        """Analyze factors specific to gold investment"""
        
        # Gold-supportive factors
        supportive_factors = []
        negative_factors = []
        
        # VIX analysis for gold
        if vix_level > 25:
            supportive_factors.append({
                "factor": "Elevated VIX",
                "level": vix_level,
                "reasoning": "Elevated VIX indicates market uncertainty, which historically favors gold as a safe-haven asset"
            })
        elif vix_level < 15:
            negative_factors.append({
                "factor": "Low VIX",
                "level": vix_level,
                "reasoning": "Low VIX suggests market complacency, reducing demand for safe-haven assets like gold"
            })
        
        # Sentiment analysis for gold
        if sentiment_signal > 0.2:
            supportive_factors.append({
                "factor": "Positive News Sentiment",
                "score": sentiment_signal,
                "reasoning": "Positive sentiment supports upward movement, particularly when combined with uncertainty indicators"
            })
        
        # Inflation and currency factors
        if macro_analysis.inflation_rate and macro_analysis.inflation_rate > 3.0:
            supportive_factors.append({
                "factor": "High Inflation",
                "rate": macro_analysis.inflation_rate,
                "reasoning": "High inflation rates historically support gold as an inflation hedge"
            })
        
        # Interest rate environment
        if macro_analysis.interest_rates and macro_analysis.interest_rates < 2.0:
            supportive_factors.append({
                "factor": "Low Interest Rates",
                "rate": macro_analysis.interest_rates,
                "reasoning": "Low interest rates reduce the opportunity cost of holding non-yielding assets like gold"
            })
        
        # Calculate gold outlook
        support_score = len(supportive_factors) / (len(supportive_factors) + len(negative_factors) + 1)
        
        outlook = "bullish" if support_score > 0.6 else "bearish" if support_score < 0.4 else "neutral"
        
        return {
            "supportive_factors": supportive_factors,
            "negative_factors": negative_factors,
            "support_score": support_score,
            "outlook": outlook,
            "conviction": "high" if abs(support_score - 0.5) > 0.3 else "moderate"
        }
    
    def _analyze_market_uncertainty(
        self,
        volatility_analysis: VolatilityMetrics,
        correlations: Dict[str, Any],
        risk_factors: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze overall market uncertainty levels"""
        
        uncertainty_indicators = []
        
        # Volatility-based uncertainty
        if volatility_analysis.vix_level > 30:
            uncertainty_indicators.append("Extreme volatility levels")
        elif volatility_analysis.vix_level > 25:
            uncertainty_indicators.append("Elevated volatility")
        
        # Correlation breakdown
        correlation_stress = correlations.get("correlation_stress", 0.0)
        if correlation_stress > 0.7:
            uncertainty_indicators.append("Correlation breakdown indicating stress")
        
        # Risk factor concentration
        risk_concentration = risk_factors.get("concentration_risk", 0.0)
        if risk_concentration > 0.6:
            uncertainty_indicators.append("High risk factor concentration")
        
        uncertainty_level = len(uncertainty_indicators) / 5  # Normalize to 0-1 scale
        
        return {
            "uncertainty_level": uncertainty_level,
            "uncertainty_indicators": uncertainty_indicators,
            "market_regime": "stress" if uncertainty_level > 0.6 else "normal",
            "safe_haven_demand": "high" if uncertainty_level > 0.6 else "moderate" if uncertainty_level > 0.3 else "low"
        }
    
    def _calculate_directional_bias(
        self,
        sentiment_signal: float,
        trend_signal: float,
        uncertainty_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate overall directional bias"""
        
        # Weight factors
        sentiment_weight = 0.3
        technical_weight = 0.4
        uncertainty_weight = 0.3
        
        # Uncertainty bias (positive for safe havens during uncertainty)
        uncertainty_bias = uncertainty_analysis["uncertainty_level"] * 0.5
        
        # Combined bias calculation
        combined_bias = (
            sentiment_signal * sentiment_weight +
            trend_signal * technical_weight +
            uncertainty_bias * uncertainty_weight
        )
        
        # Classify bias
        if combined_bias > 0.3:
            bias_direction = "bullish"
        elif combined_bias < -0.3:
            bias_direction = "bearish"
        else:
            bias_direction = "neutral"
        
        return {
            "combined_bias": combined_bias,
            "bias_direction": bias_direction,
            "confidence": abs(combined_bias),
            "component_contributions": {
                "sentiment": sentiment_signal * sentiment_weight,
                "technical": trend_signal * technical_weight,
                "uncertainty": uncertainty_bias * uncertainty_weight
            }
        }
    
    def _calculate_conviction_level(
        self,
        sentiment_signal: float,
        vix_level: float,
        trend_signal: float
    ) -> str:
        """Calculate conviction level based on signal alignment"""
        
        signals_aligned = 0
        total_signals = 3
        
        # Check signal alignment for bullish bias
        if sentiment_signal > 0.1:
            signals_aligned += 1
        if vix_level > 25:  # Uncertainty favors gold
            signals_aligned += 1
        if trend_signal > 0.1:
            signals_aligned += 1
        
        alignment_ratio = signals_aligned / total_signals
        
        if alignment_ratio >= 0.67:
            return "high"
        elif alignment_ratio >= 0.33:
            return "moderate"
        else:
            return "low"
    
    # Helper methods for technical calculations
    def _calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0  # Neutral RSI
        
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [delta if delta > 0 else 0 for delta in deltas[-period:]]
        losses = [-delta if delta < 0 else 0 for delta in deltas[-period:]]
        
        avg_gain = mean(gains) if gains else 0
        avg_loss = mean(losses) if losses else 0
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def _calculate_macd(self, prices: List[float]) -> float:
        """Calculate MACD (simplified)"""
        if len(prices) < 26:
            return 0.0
        
        ema_12 = self._calculate_ema(prices, 12)
        ema_26 = self._calculate_ema(prices, 26)
        
        return ema_12 - ema_26
    
    def _calculate_ema(self, prices: List[float], period: int) -> float:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return mean(prices) if prices else 0.0
        
        multiplier = 2 / (period + 1)
        ema = prices[0]
        
        for price in prices[1:]:
            ema = (price - ema) * multiplier + ema
        
        return ema
    
    def _calculate_moving_averages(self, prices: List[float]) -> Dict[str, float]:
        """Calculate various moving averages"""
        if not prices:
            return {}
        
        return {
            "sma_20": mean(prices[-20:]) if len(prices) >= 20 else mean(prices),
            "sma_50": mean(prices[-50:]) if len(prices) >= 50 else mean(prices),
            "sma_200": mean(prices[-200:]) if len(prices) >= 200 else mean(prices),
            "ema_20": self._calculate_ema(prices[-20:], 20) if len(prices) >= 20 else mean(prices)
        }
    
    def _calculate_bollinger_bands(self, prices: List[float], period: int = 20) -> Dict[str, float]:
        """Calculate Bollinger Bands"""
        if len(prices) < period:
            return {}
        
        recent_prices = prices[-period:]
        sma = mean(recent_prices)
        std_dev = stdev(recent_prices)
        
        return {
            "upper_band": sma + (2 * std_dev),
            "middle_band": sma,
            "lower_band": sma - (2 * std_dev),
            "bandwidth": (4 * std_dev) / sma * 100
        }
    
    def _extract_trend_signal(self, technical_analysis: TechnicalIndicators) -> float:
        """Extract trend signal from technical analysis"""
        signals = []
        
        # RSI signal
        if technical_analysis.rsi:
            if technical_analysis.rsi > 70:
                signals.append(-0.5)  # Overbought
            elif technical_analysis.rsi < 30:
                signals.append(0.5)   # Oversold
            else:
                signals.append(0.0)   # Neutral
        
        # MACD signal
        if technical_analysis.macd:
            signals.append(min(max(technical_analysis.macd / 10, -1.0), 1.0))
        
        # Moving average signal
        ma = technical_analysis.moving_averages
        if "sma_20" in ma and "sma_50" in ma:
            if ma["sma_20"] > ma["sma_50"]:
                signals.append(0.3)   # Bullish
            else:
                signals.append(-0.3)  # Bearish
        
        return mean(signals) if signals else 0.0
    
    def _classify_sentiment(self, sentiment_score: float) -> MarketSentiment:
        """Classify sentiment score into categories"""
        if sentiment_score >= 0.6:
            return MarketSentiment.EXTREMELY_BULLISH
        elif sentiment_score >= 0.3:
            return MarketSentiment.BULLISH
        elif sentiment_score >= 0.1:
            return MarketSentiment.SLIGHTLY_BULLISH
        elif sentiment_score >= -0.1:
            return MarketSentiment.NEUTRAL
        elif sentiment_score >= -0.3:
            return MarketSentiment.SLIGHTLY_BEARISH
        elif sentiment_score >= -0.6:
            return MarketSentiment.BEARISH
        else:
            return MarketSentiment.EXTREMELY_BEARISH
    
    def _calculate_volatility_rank(self, current_vol: float) -> float:
        """Calculate volatility rank (simplified)"""
        # This would typically use historical volatility data
        # For demonstration, using a simplified approach
        typical_vol_range = (0.10, 0.40)  # 10% to 40% annualized
        
        vol_position = (current_vol - typical_vol_range[0]) / (typical_vol_range[1] - typical_vol_range[0])
        return max(0.0, min(1.0, vol_position))
    
    async def _generate_recommendations(
        self,
        asset: str,
        ai_reasoning: Dict[str, Any],
        sentiment_analysis: Dict[str, Any],
        volatility_analysis: VolatilityMetrics
    ) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        
        recommendations = []
        
        # Extract key insights
        directional_bias = ai_reasoning["reasoning_synthesis"]["directional_bias"]
        conviction = ai_reasoning["reasoning_synthesis"]["conviction_level"]
        
        # Primary recommendation
        if directional_bias["bias_direction"] == "bullish" and conviction == "high":
            recommendations.append({
                "type": "primary",
                "action": "buy",
                "asset": asset,
                "conviction": "high",
                "rationale": "Strong bullish signals with high conviction based on positive sentiment, elevated uncertainty favoring safe havens, and supportive technical indicators",
                "risk_level": "moderate",
                "time_horizon": "medium_term"
            })
        elif directional_bias["bias_direction"] == "bearish" and conviction == "high":
            recommendations.append({
                "type": "primary",
                "action": "sell",
                "asset": asset,
                "conviction": "high",
                "rationale": "Strong bearish signals with negative sentiment and technical breakdown",
                "risk_level": "moderate",
                "time_horizon": "medium_term"
            })
        else:
            recommendations.append({
                "type": "primary",
                "action": "hold",
                "asset": asset,
                "conviction": conviction,
                "rationale": "Mixed signals suggest maintaining current position until clearer directional bias emerges",
                "risk_level": "low",
                "time_horizon": "short_term"
            })
        
        # Risk management recommendations
        if volatility_analysis.vix_level > 30:
            recommendations.append({
                "type": "risk_management",
                "action": "reduce_position_size",
                "rationale": "Extremely elevated volatility suggests reducing position sizes and increasing cash allocation",
                "urgency": "high"
            })
        
        # Hedging recommendations
        if directional_bias["confidence"] > 0.7:
            recommendations.append({
                "type": "hedging",
                "action": "consider_options",
                "rationale": "High conviction positions may benefit from option-based hedging strategies",
                "instruments": ["protective_puts", "covered_calls"]
            })
        
        return recommendations
    
    async def _assess_risk(
        self,
        ai_reasoning: Dict[str, Any],
        volatility_analysis: VolatilityMetrics,
        macro_analysis: MacroeconomicFactors
    ) -> Dict[str, Any]:
        """Assess overall risk levels"""
        
        risk_factors = []
        risk_score = 0
        
        # Volatility risk
        if volatility_analysis.vix_level > 30:
            risk_factors.append("Extreme market volatility")
            risk_score += 2
        elif volatility_analysis.vix_level > 25:
            risk_factors.append("Elevated market volatility")
            risk_score += 1
        
        # Macro risk factors
        if macro_analysis.inflation_rate and macro_analysis.inflation_rate > 5.0:
            risk_factors.append("High inflation environment")
            risk_score += 1
        
        # Uncertainty risk
        uncertainty_level = ai_reasoning["reasoning_synthesis"]["market_uncertainty"]["uncertainty_level"]
        if uncertainty_level > 0.7:
            risk_factors.append("High market uncertainty")
            risk_score += 2
        
        # Calculate risk level
        if risk_score >= 4:
            risk_level = RiskLevel.VERY_HIGH
        elif risk_score >= 3:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 2:
            risk_level = RiskLevel.MODERATE
        elif risk_score >= 1:
            risk_level = RiskLevel.LOW
        else:
            risk_level = RiskLevel.VERY_LOW
        
        return {
            "risk_level": risk_level.value,
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "volatility_risk": volatility_analysis.volatility_regime.value,
            "recommended_position_sizing": self._recommend_position_sizing(risk_level),
            "stop_loss_suggestion": self._suggest_stop_loss(risk_level, volatility_analysis)
        }
    
    def _recommend_position_sizing(self, risk_level: RiskLevel) -> str:
        """Recommend position sizing based on risk level"""
        sizing_recommendations = {
            RiskLevel.VERY_LOW: "Full allocation (90-100% of intended position)",
            RiskLevel.LOW: "Large allocation (70-90% of intended position)",
            RiskLevel.MODERATE: "Standard allocation (50-70% of intended position)",
            RiskLevel.HIGH: "Reduced allocation (25-50% of intended position)",
            RiskLevel.VERY_HIGH: "Minimal allocation (5-25% of intended position)"
        }
        return sizing_recommendations.get(risk_level, "Standard allocation")
    
    def _suggest_stop_loss(self, risk_level: RiskLevel, volatility_analysis: VolatilityMetrics) -> str:
        """Suggest stop loss levels based on risk and volatility"""
        base_stop = 0.05  # 5% base stop loss
        vol_multiplier = volatility_analysis.historical_volatility / 0.20  # Normalize to 20% vol
        
        risk_multipliers = {
            RiskLevel.VERY_LOW: 1.5,
            RiskLevel.LOW: 1.2,
            RiskLevel.MODERATE: 1.0,
            RiskLevel.HIGH: 0.8,
            RiskLevel.VERY_HIGH: 0.5
        }
        
        suggested_stop = base_stop * vol_multiplier * risk_multipliers.get(risk_level, 1.0)
        return f"{suggested_stop:.1%} below entry price"
    
    def _calculate_confidence_score(
        self,
        sentiment_analysis: Dict[str, Any],
        volatility_analysis: VolatilityMetrics,
        technical_analysis: TechnicalIndicators
    ) -> float:
        """Calculate overall confidence score for the analysis"""
        
        confidence_factors = []
        
        # Sentiment confidence
        sentiment_confidence = sentiment_analysis.get("confidence", 0.5)
        confidence_factors.append(sentiment_confidence)
        
        # Technical signal strength
        if technical_analysis.rsi:
            rsi_confidence = abs(technical_analysis.rsi - 50) / 50  # Distance from neutral
            confidence_factors.append(rsi_confidence)
        
        # Volatility regime clarity
        vol_confidence = 1.0 - abs(volatility_analysis.volatility_rank - 0.5) * 2
        confidence_factors.append(vol_confidence)
        
        return mean(confidence_factors) if confidence_factors else 0.5
    
    # Additional helper methods for generating reasoning text
    def _generate_sentiment_reasoning(self, sentiment_analysis: Dict[str, Any]) -> str:
        """Generate human-readable sentiment reasoning"""
        sentiment_score = sentiment_analysis.get("overall_sentiment_score", 0.0)
        classification = sentiment_analysis.get("sentiment_classification", "neutral")
        
        if sentiment_score > 0.2:
            return f"Positive news sentiment (score: {sentiment_score:.2f}) supports upward movement, with {classification} market sentiment across multiple sources."
        elif sentiment_score < -0.2:
            return f"Negative sentiment (score: {sentiment_score:.2f}) creates headwinds, with {classification} outlook across news and social media."
        else:
            return f"Neutral sentiment (score: {sentiment_score:.2f}) provides limited directional bias."
    
    def _generate_volatility_reasoning(self, volatility_analysis: VolatilityMetrics) -> str:
        """Generate human-readable volatility reasoning"""
        vix_level = volatility_analysis.vix_level
        
        if vix_level > 30:
            return f"Extremely elevated VIX ({vix_level:.1f}) indicates high market stress and uncertainty, strongly favoring safe-haven assets like gold."
        elif vix_level > 25:
            return f"Elevated VIX ({vix_level:.1f}) suggests market uncertainty, which historically supports gold prices as investors seek safety."
        elif vix_level < 15:
            return f"Low VIX ({vix_level:.1f}) indicates market complacency, potentially reducing demand for safe-haven assets."
        else:
            return f"Moderate VIX ({vix_level:.1f}) suggests normal market conditions with balanced risk sentiment."
    
    def _generate_technical_reasoning(self, technical_analysis: TechnicalIndicators) -> str:
        """Generate human-readable technical reasoning"""
        reasoning_parts = []
        
        if technical_analysis.rsi:
            if technical_analysis.rsi > 70:
                reasoning_parts.append(f"RSI ({technical_analysis.rsi:.1f}) indicates overbought conditions")
            elif technical_analysis.rsi < 30:
                reasoning_parts.append(f"RSI ({technical_analysis.rsi:.1f}) suggests oversold conditions")
            else:
                reasoning_parts.append(f"RSI ({technical_analysis.rsi:.1f}) remains in neutral territory")
        
        ma = technical_analysis.moving_averages
        if "sma_20" in ma and "sma_50" in ma:
            if ma["sma_20"] > ma["sma_50"]:
                reasoning_parts.append("short-term momentum remains positive with 20-day MA above 50-day MA")
            else:
                reasoning_parts.append("short-term momentum shows weakness with 20-day MA below 50-day MA")
        
        return "; ".join(reasoning_parts) if reasoning_parts else "Technical indicators show mixed signals"
    
    def _generate_macro_reasoning(self, macro_analysis: MacroeconomicFactors) -> str:
        """Generate human-readable macro reasoning"""
        reasoning_parts = []
        
        if macro_analysis.inflation_rate:
            if macro_analysis.inflation_rate > 3.0:
                reasoning_parts.append(f"elevated inflation ({macro_analysis.inflation_rate:.1f}%) supports gold as an inflation hedge")
            else:
                reasoning_parts.append(f"moderate inflation ({macro_analysis.inflation_rate:.1f}%) provides neutral impact")
        
        if macro_analysis.interest_rates:
            if macro_analysis.interest_rates < 2.0:
                reasoning_parts.append(f"low interest rates ({macro_analysis.interest_rates:.1f}%) reduce opportunity cost of holding gold")
            elif macro_analysis.interest_rates > 5.0:
                reasoning_parts.append(f"high interest rates ({macro_analysis.interest_rates:.1f}%) increase opportunity cost of gold ownership")
        
        return "; ".join(reasoning_parts) if reasoning_parts else "Macroeconomic factors show neutral impact"
    
    def _extract_macro_drivers(self, macro_analysis: MacroeconomicFactors) -> List[str]:
        """Extract key macro drivers"""
        drivers = []
        
        if macro_analysis.inflation_rate and macro_analysis.inflation_rate > 3.0:
            drivers.append("high_inflation")
        
        if macro_analysis.interest_rates and macro_analysis.interest_rates < 2.0:
            drivers.append("low_interest_rates")
        
        if macro_analysis.currency_strength and macro_analysis.currency_strength < -0.5:
            drivers.append("weak_currency")
        
        return drivers
    
    def _calculate_sentiment_trend(self, sentiment_results: Dict[str, Any]) -> str:
        """Calculate sentiment trend direction"""
        # Simplified trend calculation
        scores = [result.get("sentiment_score", 0.0) for result in sentiment_results.values()]
        if not scores:
            return "neutral"
        
        avg_score = mean(scores)
        return "improving" if avg_score > 0.1 else "deteriorating" if avg_score < -0.1 else "stable"
    
    def _extract_sentiment_themes(self, sentiment_results: Dict[str, Any]) -> List[str]:
        """Extract key themes from sentiment analysis"""
        themes = []
        
        for source, result in sentiment_results.items():
            if result.get("sentiment_score", 0.0) > 0.2:
                themes.append(f"positive_{source}_sentiment")
            elif result.get("sentiment_score", 0.0) < -0.2:
                themes.append(f"negative_{source}_sentiment")
        
        return themes
    
    def _calculate_reasoning_confidence(
        self,
        sentiment_analysis: Dict[str, Any],
        volatility_analysis: VolatilityMetrics,
        technical_analysis: TechnicalIndicators
    ) -> Dict[str, float]:
        """Calculate confidence for different reasoning components"""
        
        return {
            "sentiment_confidence": sentiment_analysis.get("confidence", 0.5),
            "volatility_confidence": 0.9 if volatility_analysis.vix_level > 25 or volatility_analysis.vix_level < 15 else 0.6,
            "technical_confidence": 0.8 if technical_analysis.rsi and abs(technical_analysis.rsi - 50) > 20 else 0.5,
            "overall_confidence": self._calculate_confidence_score(sentiment_analysis, volatility_analysis, technical_analysis)
        }
    
    def _assess_risk_reward(
        self,
        directional_bias: Dict[str, Any],
        volatility_analysis: VolatilityMetrics,
        scenarios: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess risk-reward profile"""
        
        bias_strength = abs(directional_bias["combined_bias"])
        vol_level = volatility_analysis.vix_level
        
        # Calculate potential upside/downside
        if vol_level > 25:
            potential_move = 0.15  # 15% potential move in high vol environment
        else:
            potential_move = 0.08  # 8% potential move in normal vol
        
        if directional_bias["bias_direction"] == "bullish":
            upside_potential = potential_move * bias_strength
            downside_risk = potential_move * 0.5
        else:
            upside_potential = potential_move * 0.5
            downside_risk = potential_move * bias_strength
        
        risk_reward_ratio = upside_potential / downside_risk if downside_risk > 0 else float('inf')
        
        return {
            "upside_potential": f"{upside_potential:.1%}",
            "downside_risk": f"{downside_risk:.1%}",
            "risk_reward_ratio": f"{risk_reward_ratio:.2f}:1",
            "assessment": "favorable" if risk_reward_ratio > 2.0 else "neutral" if risk_reward_ratio > 1.0 else "unfavorable"
        }


# Placeholder classes for component analyzers
class NewssentimentAnalyzer:
    async def analyze_sentiment(self, asset: str) -> Dict[str, Any]:
        # Placeholder implementation
        return {"sentiment_score": 0.3, "confidence": 0.8, "source": "news"}

class SocialMediaSentimentAnalyzer:
    async def analyze_sentiment(self, asset: str) -> Dict[str, Any]:
        return {"sentiment_score": 0.2, "confidence": 0.6, "source": "social_media"}

class AnalystSentimentAnalyzer:
    async def analyze_sentiment(self, asset: str) -> Dict[str, Any]:
        return {"sentiment_score": 0.4, "confidence": 0.9, "source": "analysts"}

class MarketSentimentAnalyzer:
    async def analyze_sentiment(self, asset: str) -> Dict[str, Any]:
        return {"sentiment_score": 0.1, "confidence": 0.7, "source": "market"}

class VIXAnalyzer:
    async def analyze_vix(self) -> Dict[str, Any]:
        return {
            "current_level": 28.5,  # Example elevated VIX
            "percentile_rank": 75,
            "term_structure": {"1m": 28.5, "3m": 26.2, "6m": 24.8}
        }

class GARCHVolatilityModel:
    async def forecast_volatility(self, market_data: List[MarketData]) -> float:
        return 0.25  # 25% implied volatility

class RealizedVolatilityCalculator:
    def calculate_realized_volatility(self, market_data: List[MarketData]) -> float:
        if len(market_data) < 2:
            return 0.20
        
        # Calculate returns
        returns = []
        for i in range(1, len(market_data)):
            price_today = market_data[i].close_price or market_data[i].price
            price_yesterday = market_data[i-1].close_price or market_data[i-1].price
            if price_yesterday > 0:
                returns.append(math.log(price_today / price_yesterday))
        
        if not returns:
            return 0.20
        
        # Annualized volatility
        daily_vol = stdev(returns) if len(returns) > 1 else 0.02
        annualized_vol = daily_vol * math.sqrt(252)
        return annualized_vol

class VolatilityRegimeDetector:
    def detect_regime(self, volatility: float) -> VolatilityLevel:
        if volatility > 0.40:
            return VolatilityLevel.EXTREME
        elif volatility > 0.30:
            return VolatilityLevel.VERY_HIGH
        elif volatility > 0.25:
            return VolatilityLevel.HIGH
        elif volatility > 0.15:
            return VolatilityLevel.MODERATE
        elif volatility > 0.10:
            return VolatilityLevel.LOW
        else:
            return VolatilityLevel.VERY_LOW

# Additional placeholder classes for the remaining analyzers...
class TrendAnalyzer:
    pass

class MomentumAnalyzer:
    pass

class SupportResistanceAnalyzer:
    def find_levels(self, market_data: List[MarketData]) -> Tuple[List[float], List[float]]:
        if not market_data:
            return [], []
        
        prices = [data.close_price or data.price for data in market_data]
        current_price = prices[-1]
        
        # Simplified support/resistance calculation
        support_levels = [current_price * 0.95, current_price * 0.90]
        resistance_levels = [current_price * 1.05, current_price * 1.10]
        
        return support_levels, resistance_levels

class PatternRecognitionEngine:
    pass

class EquityValuationAnalyzer:
    async def analyze(self, asset: str) -> Dict[str, Any]:
        return {"valuation": "fair", "pe_ratio": 18.5, "price_target": 2150}

class BondAnalyzer:
    async def analyze(self, asset: str) -> Dict[str, Any]:
        return {"yield": 4.2, "duration": 7.3, "credit_quality": "AAA"}

class CommodityAnalyzer:
    async def analyze(self, asset: str) -> Dict[str, Any]:
        return {"supply_demand": "balanced", "inventory_levels": "normal"}

class CurrencyAnalyzer:
    async def analyze(self, asset: str) -> Dict[str, Any]:
        return {"purchasing_power": "stable", "trade_balance": "positive"}

class EconomicIndicatorAnalyzer:
    async def get_current_indicators(self) -> Dict[str, float]:
        return {
            "gdp_growth": 2.1,
            "inflation_rate": 3.2,
            "unemployment_rate": 3.8,
            "interest_rates": 1.75,
            "currency_strength": -0.2,
            "trade_balance": 15.2,
            "consumer_confidence": 108.5,
            "industrial_production": 102.3
        }

class MonetaryPolicyAnalyzer:
    pass

class GeopoliticalAnalyzer:
    pass

class SectorRotationAnalyzer:
    pass

class MultiFactorReasoningModel:
    async def integrate_factors(self, *args) -> Dict[str, Any]:
        return {"integrated_score": 0.65, "primary_drivers": ["sentiment", "volatility"]}

class ScenarioAnalyzer:
    async def generate_scenarios(self, asset: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "bullish": {"probability": 0.4, "target": "+15%"},
            "neutral": {"probability": 0.4, "target": "+2%"},
            "bearish": {"probability": 0.2, "target": "-8%"}
        }

class CorrelationAnalyzer:
    async def analyze_correlations(self, asset: str, sentiment: Dict, volatility: VolatilityMetrics) -> Dict[str, Any]:
        return {"correlation_stress": 0.3, "diversification_benefit": 0.7}

class RiskAttributionModel:
    async def attribute_risk(self, volatility: VolatilityMetrics, macro: MacroeconomicFactors) -> Dict[str, Any]:
        return {"concentration_risk": 0.4, "systematic_risk": 0.6}
