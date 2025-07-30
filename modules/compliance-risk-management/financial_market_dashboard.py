"""
Financial Market Analysis Dashboard
Real-time visualization interface for AI reasoning, sentiment analysis, volatility, and market insights
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
import logging

from .financial_market_analysis import AIReasoningEngine
from .real_time_data_integration import RealTimeDataManager, DataSourceType
from .financial_market_api import FinancialMarketAnalysisAPI

logger = logging.getLogger(__name__)

class FinancialMarketDashboard:
    """
    Interactive dashboard for financial market analysis and AI reasoning
    """
    
    def __init__(self):
        self.ai_engine = AIReasoningEngine()
        self.data_manager = RealTimeDataManager()
        self.api = FinancialMarketAnalysisAPI()
        
        # Dashboard state
        self.current_data = {}
        self.analysis_history = []
        self.alerts = []
        
        # Initialize dashboard
        self._initialize_dashboard()
    
    def _initialize_dashboard(self):
        """Initialize Streamlit dashboard"""
        st.set_page_config(
            page_title="Financial Market Analysis AI",
            page_icon="📈",
            layout="wide",
            initial_sidebar_state="expanded"
        )
        
        # Custom CSS
        st.markdown("""
        <style>
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
            border-radius: 10px;
            color: white;
            margin: 0.5rem 0;
        }
        .alert-card {
            background: #ff6b6b;
            padding: 0.8rem;
            border-radius: 8px;
            color: white;
            margin: 0.3rem 0;
        }
        .positive-sentiment {
            background: #51cf66;
            padding: 0.5rem;
            border-radius: 5px;
            color: white;
            text-align: center;
        }
        .negative-sentiment {
            background: #ff6b6b;
            padding: 0.5rem;
            border-radius: 5px;
            color: white;
            text-align: center;
        }
        .neutral-sentiment {
            background: #868e96;
            padding: 0.5rem;
            border-radius: 5px;
            color: white;
            text-align: center;
        }
        </style>
        """, unsafe_allow_html=True)
    
    def run_dashboard(self):
        """Run the main dashboard"""
        
        # Sidebar configuration
        self._render_sidebar()
        
        # Main dashboard content
        st.title("🧠 AI-Powered Financial Market Analysis")
        st.markdown("---")
        
        # Dashboard tabs
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            "📊 Market Overview", 
            "🎯 Sentiment Analysis", 
            "📈 Volatility & VIX", 
            "🤖 AI Reasoning", 
            "⚠️ Alerts & Monitoring"
        ])
        
        with tab1:
            self._render_market_overview()
        
        with tab2:
            self._render_sentiment_analysis()
        
        with tab3:
            self._render_volatility_analysis()
        
        with tab4:
            self._render_ai_reasoning()
        
        with tab5:
            self._render_alerts_monitoring()
    
    def _render_sidebar(self):
        """Render sidebar controls"""
        
        st.sidebar.header("🎛️ Dashboard Controls")
        
        # Asset selection
        st.sidebar.subheader("Asset Selection")
        selected_assets = st.sidebar.multiselect(
            "Select Assets to Analyze",
            ["GOLD", "SPY", "QQQ", "BTC-USD", "EUR/USD", "OIL"],
            default=["GOLD", "SPY"]
        )
        
        # Analysis options
        st.sidebar.subheader("Analysis Options")
        include_sentiment = st.sidebar.checkbox("Include Sentiment Analysis", True)
        include_volatility = st.sidebar.checkbox("Include Volatility Analysis", True)
        include_macro = st.sidebar.checkbox("Include Macro Factors", True)
        
        # Time settings
        st.sidebar.subheader("Time Settings")
        update_frequency = st.sidebar.selectbox(
            "Update Frequency",
            ["30 seconds", "1 minute", "5 minutes", "15 minutes"],
            index=2
        )
        
        # Data sources
        st.sidebar.subheader("Data Sources")
        sentiment_sources = st.sidebar.multiselect(
            "Sentiment Sources",
            ["news", "social_media", "analyst_reports", "market_sentiment"],
            default=["news", "analyst_reports"]
        )
        
        # AI settings
        st.sidebar.subheader("AI Reasoning")
        reasoning_depth = st.sidebar.selectbox(
            "Analysis Depth",
            ["Basic", "Comprehensive", "Advanced"],
            index=1
        )
        
        # Store selections in session state
        st.session_state.selected_assets = selected_assets
        st.session_state.include_sentiment = include_sentiment
        st.session_state.include_volatility = include_volatility
        st.session_state.include_macro = include_macro
        st.session_state.sentiment_sources = sentiment_sources
        st.session_state.reasoning_depth = reasoning_depth
        
        # Control buttons
        st.sidebar.markdown("---")
        if st.sidebar.button("🔄 Refresh Analysis"):
            self._refresh_analysis()
        
        if st.sidebar.button("📤 Export Data"):
            self._export_analysis_data()
        
        if st.sidebar.button("⚙️ Reset Dashboard"):
            self._reset_dashboard()
    
    def _render_market_overview(self):
        """Render market overview tab"""
        
        st.header("📊 Market Overview")
        
        # Key metrics row
        col1, col2, col3, col4 = st.columns(4)
        
        # Sample market data
        market_data = self._get_sample_market_data()
        
        with col1:
            st.markdown(
                f'<div class="metric-card"><h3>Gold Price</h3><h2>${market_data["GOLD"]["price"]:.2f}</h2><p>Change: {market_data["GOLD"]["change"]:+.2f} ({market_data["GOLD"]["change_pct"]:+.1f}%)</p></div>',
                unsafe_allow_html=True
            )
        
        with col2:
            st.markdown(
                f'<div class="metric-card"><h3>VIX Level</h3><h2>{market_data["VIX"]["level"]:.1f}</h2><p>Regime: {market_data["VIX"]["regime"]}</p></div>',
                unsafe_allow_html=True
            )
        
        with col3:
            st.markdown(
                f'<div class="metric-card"><h3>Market Sentiment</h3><h2>{market_data["sentiment"]["score"]:+.2f}</h2><p>Classification: {market_data["sentiment"]["classification"]}</p></div>',
                unsafe_allow_html=True
            )
        
        with col4:
            st.markdown(
                f'<div class="metric-card"><h3>AI Conviction</h3><h2>{market_data["ai"]["conviction"]}</h2><p>Bias: {market_data["ai"]["bias"]}</p></div>',
                unsafe_allow_html=True
            )
        
        # Price charts
        st.subheader("Price Charts")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Gold price chart
            gold_chart = self._create_price_chart("GOLD", "Gold Price (USD)")
            st.plotly_chart(gold_chart, use_container_width=True)
        
        with col2:
            # VIX chart
            vix_chart = self._create_vix_chart()
            st.plotly_chart(vix_chart, use_container_width=True)
        
        # Correlation matrix
        st.subheader("Asset Correlation Matrix")
        corr_chart = self._create_correlation_matrix()
        st.plotly_chart(corr_chart, use_container_width=True)
    
    def _render_sentiment_analysis(self):
        """Render sentiment analysis tab"""
        
        st.header("🎯 Multi-Source Sentiment Analysis")
        
        # Sentiment overview
        col1, col2, col3 = st.columns(3)
        
        sentiment_data = self._get_sample_sentiment_data()
        
        with col1:
            overall_score = sentiment_data["overall"]["score"]
            sentiment_class = "positive-sentiment" if overall_score > 0.1 else "negative-sentiment" if overall_score < -0.1 else "neutral-sentiment"
            st.markdown(
                f'<div class="{sentiment_class}"><h3>Overall Sentiment</h3><h2>{overall_score:+.2f}</h2></div>',
                unsafe_allow_html=True
            )
        
        with col2:
            st.metric(
                "Confidence Level",
                f"{sentiment_data['overall']['confidence']:.1%}",
                delta=f"{sentiment_data['overall']['change']:+.1%}"
            )
        
        with col3:
            st.metric(
                "News Articles",
                sentiment_data["sources"]["news"]["count"],
                delta=f"+{sentiment_data['sources']['news']['new_today']}"
            )
        
        # Sentiment breakdown by source
        st.subheader("Sentiment by Source")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Sentiment source breakdown
            sentiment_source_chart = self._create_sentiment_source_chart(sentiment_data)
            st.plotly_chart(sentiment_source_chart, use_container_width=True)
        
        with col2:
            # Sentiment trend over time
            sentiment_trend_chart = self._create_sentiment_trend_chart()
            st.plotly_chart(sentiment_trend_chart, use_container_width=True)
        
        # Key themes and topics
        st.subheader("Key Themes Analysis")
        
        themes_data = sentiment_data["themes"]
        for theme in themes_data:
            col1, col2, col3 = st.columns([3, 1, 1])
            with col1:
                st.write(f"**{theme['topic']}**")
            with col2:
                sentiment_color = "🟢" if theme['sentiment'] > 0 else "🔴" if theme['sentiment'] < 0 else "🟡"
                st.write(f"{sentiment_color} {theme['sentiment']:+.2f}")
            with col3:
                st.write(f"📊 {theme['mentions']} mentions")
        
        # News headlines
        st.subheader("Recent Headlines")
        headlines = sentiment_data["headlines"]
        for headline in headlines:
            sentiment_emoji = "📈" if headline['sentiment'] > 0 else "📉" if headline['sentiment'] < 0 else "➖"
            st.write(f"{sentiment_emoji} **{headline['title']}**")
            st.write(f"   _{headline['source']} - {headline['time']}_")
    
    def _render_volatility_analysis(self):
        """Render volatility analysis tab"""
        
        st.header("📈 Volatility & Market Uncertainty Analysis")
        
        # VIX metrics
        col1, col2, col3, col4 = st.columns(4)
        
        vix_data = self._get_sample_vix_data()
        
        with col1:
            st.metric(
                "Current VIX",
                f"{vix_data['current']:.1f}",
                delta=f"{vix_data['change']:+.1f}"
            )
        
        with col2:
            st.metric(
                "Historical Vol",
                f"{vix_data['historical']:.1%}",
                delta=f"{vix_data['vol_change']:+.1%}"
            )
        
        with col3:
            st.metric(
                "Implied Vol",
                f"{vix_data['implied']:.1%}",
                delta=f"{vix_data['iv_change']:+.1%}"
            )
        
        with col4:
            st.metric(
                "Vol Percentile",
                f"{vix_data['percentile']:.0f}%",
                delta=f"{vix_data['percentile_change']:+.0f}%"
            )
        
        # Volatility regime analysis
        st.subheader("Volatility Regime Analysis")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # VIX term structure
            term_structure_chart = self._create_vix_term_structure_chart()
            st.plotly_chart(term_structure_chart, use_container_width=True)
        
        with col2:
            # Volatility regime indicator
            regime_chart = self._create_volatility_regime_chart()
            st.plotly_chart(regime_chart, use_container_width=True)
        
        # Market uncertainty assessment
        st.subheader("Market Uncertainty Assessment")
        
        uncertainty_data = vix_data["uncertainty"]
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.info(f"**Current Regime:** {uncertainty_data['regime']}")
            st.write(f"Risk Level: {uncertainty_data['risk_level']}")
        
        with col2:
            st.info(f"**Gold Impact:** {uncertainty_data['gold_impact']}")
            st.write(f"Safe-Haven Demand: {uncertainty_data['safe_haven']}")
        
        with col3:
            st.info(f"**Market Stress:** {uncertainty_data['stress_level']}")
            st.write(f"Flight-to-Quality: {uncertainty_data['flight_to_quality']}")
        
        # Volatility forecasting
        st.subheader("Volatility Forecast")
        forecast_chart = self._create_volatility_forecast_chart()
        st.plotly_chart(forecast_chart, use_container_width=True)
    
    def _render_ai_reasoning(self):
        """Render AI reasoning tab"""
        
        st.header("🤖 AI Reasoning & Market Analysis")
        
        # AI reasoning summary
        reasoning_data = self._get_sample_ai_reasoning()
        
        # Key drivers analysis
        st.subheader("Key Market Drivers")
        
        drivers = reasoning_data["key_drivers"]
        for driver, data in drivers.items():
            with st.expander(f"{driver.title()} Analysis (Weight: {data['weight']:.1%})"):
                st.write(f"**Impact:** {data['impact']}")
                st.write(f"**Reasoning:** {data['reasoning']}")
                st.write(f"**Confidence:** {data['confidence']:.1%}")
                
                # Progress bar for weight
                st.progress(data['weight'])
        
        # Directional bias analysis
        st.subheader("Directional Bias Assessment")
        
        col1, col2, col3 = st.columns(3)
        
        bias_data = reasoning_data["directional_bias"]
        
        with col1:
            bias_color = "🟢" if bias_data['direction'] == "bullish" else "🔴" if bias_data['direction'] == "bearish" else "🟡"
            st.markdown(f"### {bias_color} {bias_data['direction'].title()}")
            st.write(f"Confidence: {bias_data['confidence']:.1%}")
        
        with col2:
            st.metric(
                "Conviction Level",
                reasoning_data["conviction_level"],
                delta=reasoning_data["conviction_change"]
            )
        
        with col3:
            st.metric(
                "Risk/Reward Ratio",
                f"{reasoning_data['risk_reward']['ratio']:.2f}",
                delta=f"{reasoning_data['risk_reward']['change']:+.2f}"
            )
        
        # AI reasoning narrative
        st.subheader("AI Reasoning Narrative")
        
        narrative = reasoning_data["narrative"]
        st.info(narrative)
        
        # Scenario analysis
        st.subheader("Scenario Analysis")
        
        scenarios = reasoning_data["scenarios"]
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.write("**📈 Bull Case**")
            st.write(f"Probability: {scenarios['bull']['probability']:.1%}")
            st.write(f"Target: {scenarios['bull']['target']}")
            st.write(scenarios['bull']['reasoning'])
        
        with col2:
            st.write("**➖ Base Case**")
            st.write(f"Probability: {scenarios['base']['probability']:.1%}")
            st.write(f"Target: {scenarios['base']['target']}")
            st.write(scenarios['base']['reasoning'])
        
        with col3:
            st.write("**📉 Bear Case**")
            st.write(f"Probability: {scenarios['bear']['probability']:.1%}")
            st.write(f"Target: {scenarios['bear']['target']}")
            st.write(scenarios['bear']['reasoning'])
        
        # Gold-specific analysis
        if "GOLD" in st.session_state.get("selected_assets", []):
            st.subheader("🏆 Gold-Specific AI Analysis")
            
            gold_analysis = reasoning_data["gold_specific"]
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.write("**Supportive Factors:**")
                for factor in gold_analysis["supportive_factors"]:
                    st.write(f"✅ {factor}")
                
            with col2:
                st.write("**Negative Factors:**")
                for factor in gold_analysis["negative_factors"]:
                    st.write(f"❌ {factor}")
            
            st.write(f"**VIX Impact:** {gold_analysis['vix_impact']}")
            st.write(f"**Safe-Haven Assessment:** {gold_analysis['safe_haven_assessment']}")
    
    def _render_alerts_monitoring(self):
        """Render alerts and monitoring tab"""
        
        st.header("⚠️ Alerts & Real-Time Monitoring")
        
        # Active alerts
        st.subheader("Active Alerts")
        
        alerts = self._get_sample_alerts()
        
        for alert in alerts:
            severity_color = "🔴" if alert['severity'] == "high" else "🟡" if alert['severity'] == "medium" else "🟢"
            st.markdown(
                f'<div class="alert-card">{severity_color} <strong>{alert["title"]}</strong><br>{alert["message"]}<br><small>{alert["timestamp"]}</small></div>',
                unsafe_allow_html=True
            )
        
        # Monitoring configuration
        st.subheader("Alert Configuration")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("**Sentiment Alerts**")
            sentiment_threshold = st.slider("Sentiment Change Threshold", 0.1, 1.0, 0.3)
            enable_sentiment_alerts = st.checkbox("Enable Sentiment Alerts", True)
            
            st.write("**Volatility Alerts**")
            vix_threshold = st.slider("VIX Level Threshold", 15.0, 50.0, 30.0)
            enable_vix_alerts = st.checkbox("Enable VIX Alerts", True)
        
        with col2:
            st.write("**Price Alerts**")
            price_change_threshold = st.slider("Price Change Threshold (%)", 1.0, 10.0, 3.0)
            enable_price_alerts = st.checkbox("Enable Price Alerts", True)
            
            st.write("**AI Reasoning Alerts**")
            conviction_threshold = st.selectbox("Conviction Change Threshold", ["Low", "Medium", "High"])
            enable_reasoning_alerts = st.checkbox("Enable AI Reasoning Alerts", True)
        
        # Real-time status
        st.subheader("System Status")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Data Feeds", "4/4 Active", delta="100%")
        
        with col2:
            st.metric("AI Engine", "Operational", delta="99.9% uptime")
        
        with col3:
            st.metric("Last Update", "2 min ago", delta="Real-time")
        
        with col4:
            st.metric("Alerts Today", "12", delta="+3")
    
    def _get_sample_market_data(self) -> Dict[str, Any]:
        """Get sample market data for demonstration"""
        return {
            "GOLD": {
                "price": 2045.50,
                "change": 15.75,
                "change_pct": 0.8
            },
            "VIX": {
                "level": 22.5,
                "regime": "Moderate"
            },
            "sentiment": {
                "score": 0.35,
                "classification": "Positive"
            },
            "ai": {
                "conviction": "High",
                "bias": "Bullish"
            }
        }
    
    def _get_sample_sentiment_data(self) -> Dict[str, Any]:
        """Get sample sentiment data"""
        return {
            "overall": {
                "score": 0.35,
                "confidence": 0.82,
                "change": 0.08
            },
            "sources": {
                "news": {"score": 0.42, "count": 87, "new_today": 23},
                "social": {"score": 0.28, "count": 156, "new_today": 45},
                "analysts": {"score": 0.35, "count": 12, "new_today": 3}
            },
            "themes": [
                {"topic": "Inflation Hedge", "sentiment": 0.65, "mentions": 34},
                {"topic": "Fed Policy", "sentiment": -0.12, "mentions": 28},
                {"topic": "Market Uncertainty", "sentiment": 0.45, "mentions": 21},
                {"topic": "Currency Weakness", "sentiment": 0.38, "mentions": 19}
            ],
            "headlines": [
                {"title": "Gold Rallies on Inflation Concerns", "sentiment": 0.7, "source": "Reuters", "time": "2 hours ago"},
                {"title": "Fed Signals Cautious Approach", "sentiment": 0.3, "source": "Bloomberg", "time": "4 hours ago"},
                {"title": "Market Uncertainty Drives Safe-Haven Demand", "sentiment": 0.6, "source": "CNBC", "time": "6 hours ago"}
            ]
        }
    
    def _get_sample_vix_data(self) -> Dict[str, Any]:
        """Get sample VIX data"""
        return {
            "current": 22.5,
            "change": 1.2,
            "historical": 0.205,
            "vol_change": 0.015,
            "implied": 0.225,
            "iv_change": 0.008,
            "percentile": 65,
            "percentile_change": 5,
            "uncertainty": {
                "regime": "Moderate Uncertainty",
                "risk_level": "Medium",
                "gold_impact": "Supportive",
                "safe_haven": "Elevated",
                "stress_level": "Low-Medium",
                "flight_to_quality": "Moderate"
            }
        }
    
    def _get_sample_ai_reasoning(self) -> Dict[str, Any]:
        """Get sample AI reasoning data"""
        return {
            "key_drivers": {
                "sentiment": {
                    "weight": 0.35,
                    "impact": "Positive",
                    "reasoning": "Positive news sentiment supports upward movement",
                    "confidence": 0.82
                },
                "volatility": {
                    "weight": 0.28,
                    "impact": "Supportive",
                    "reasoning": "Elevated VIX indicates market uncertainty favoring gold",
                    "confidence": 0.75
                },
                "macro": {
                    "weight": 0.25,
                    "impact": "Mixed",
                    "reasoning": "Fundamental analysis incorporating macro factors shows mixed signals",
                    "confidence": 0.68
                },
                "technical": {
                    "weight": 0.12,
                    "impact": "Neutral",
                    "reasoning": "Technical indicators show consolidation pattern",
                    "confidence": 0.65
                }
            },
            "directional_bias": {
                "direction": "bullish",
                "confidence": 0.78
            },
            "conviction_level": "High",
            "conviction_change": "+Medium",
            "risk_reward": {
                "ratio": 2.3,
                "change": 0.4
            },
            "narrative": "Analysis based on positive news sentiment supports upward movement, elevated VIX indicates market uncertainty favoring gold, fundamental analysis incorporating macro factors suggests a bullish bias with high conviction.",
            "scenarios": {
                "bull": {
                    "probability": 0.45,
                    "target": "$2,150",
                    "reasoning": "Strong sentiment + safe-haven demand"
                },
                "base": {
                    "probability": 0.35,
                    "target": "$2,080",
                    "reasoning": "Moderate uncertainty supports gold"
                },
                "bear": {
                    "probability": 0.20,
                    "target": "$1,980",
                    "reasoning": "Risk-on sentiment returns"
                }
            },
            "gold_specific": {
                "supportive_factors": [
                    "Elevated VIX supporting safe-haven demand",
                    "Positive sentiment from inflation hedge thesis",
                    "Currency weakness supporting gold prices"
                ],
                "negative_factors": [
                    "Potential Fed hawkishness",
                    "Strong equity markets reducing safe-haven need"
                ],
                "vix_impact": "Current VIX levels above 20 provide supportive backdrop for gold",
                "safe_haven_assessment": "Market uncertainty levels favor continued safe-haven allocation"
            }
        }
    
    def _get_sample_alerts(self) -> List[Dict[str, Any]]:
        """Get sample alerts"""
        return [
            {
                "severity": "high",
                "title": "VIX Spike Alert",
                "message": "VIX has increased by 15% in the last hour, indicating rising market uncertainty",
                "timestamp": "10 minutes ago"
            },
            {
                "severity": "medium", 
                "title": "Sentiment Change",
                "message": "Gold sentiment has improved from neutral to positive based on latest news analysis",
                "timestamp": "25 minutes ago"
            },
            {
                "severity": "low",
                "title": "AI Conviction Update",
                "message": "AI reasoning conviction level increased from Medium to High for gold outlook",
                "timestamp": "1 hour ago"
            }
        ]
    
    def _create_price_chart(self, symbol: str, title: str):
        """Create price chart"""
        # Sample data
        dates = pd.date_range(start='2024-01-01', end='2024-01-31', freq='D')
        prices = 2000 + np.cumsum(np.random.randn(len(dates)) * 5)
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=dates,
            y=prices,
            mode='lines',
            name=symbol,
            line=dict(color='gold', width=2)
        ))
        
        fig.update_layout(
            title=title,
            xaxis_title="Date",
            yaxis_title="Price",
            height=400
        )
        
        return fig
    
    def _create_vix_chart(self):
        """Create VIX chart"""
        dates = pd.date_range(start='2024-01-01', end='2024-01-31', freq='D')
        vix_values = 20 + np.cumsum(np.random.randn(len(dates)) * 0.5)
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=dates,
            y=vix_values,
            mode='lines',
            name='VIX',
            line=dict(color='red', width=2)
        ))
        
        # Add regime zones
        fig.add_hline(y=20, line_dash="dash", line_color="orange", annotation_text="High Vol Threshold")
        fig.add_hline(y=30, line_dash="dash", line_color="red", annotation_text="Extreme Vol")
        
        fig.update_layout(
            title="VIX Volatility Index",
            xaxis_title="Date",
            yaxis_title="VIX Level",
            height=400
        )
        
        return fig
    
    def _create_correlation_matrix(self):
        """Create correlation matrix"""
        assets = ['GOLD', 'SPY', 'QQQ', 'VIX', 'USD']
        corr_data = np.random.rand(5, 5)
        corr_data = (corr_data + corr_data.T) / 2  # Make symmetric
        np.fill_diagonal(corr_data, 1)  # Diagonal = 1
        
        fig = px.imshow(
            corr_data,
            x=assets,
            y=assets,
            color_continuous_scale='RdBu',
            title="Asset Correlation Matrix"
        )
        
        return fig
    
    def _create_sentiment_source_chart(self, sentiment_data):
        """Create sentiment source breakdown chart"""
        sources = list(sentiment_data["sources"].keys())
        scores = [sentiment_data["sources"][source]["score"] for source in sources]
        
        fig = go.Figure(data=[
            go.Bar(x=sources, y=scores, marker_color=['green' if s > 0 else 'red' for s in scores])
        ])
        
        fig.update_layout(
            title="Sentiment by Source",
            xaxis_title="Source",
            yaxis_title="Sentiment Score",
            height=400
        )
        
        return fig
    
    def _create_sentiment_trend_chart(self):
        """Create sentiment trend chart"""
        dates = pd.date_range(start='2024-01-01', end='2024-01-31', freq='D')
        sentiment = np.cumsum(np.random.randn(len(dates)) * 0.1)
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=dates,
            y=sentiment,
            mode='lines',
            name='Sentiment',
            line=dict(color='blue', width=2)
        ))
        
        fig.update_layout(
            title="Sentiment Trend",
            xaxis_title="Date",
            yaxis_title="Sentiment Score",
            height=400
        )
        
        return fig
    
    def _create_vix_term_structure_chart(self):
        """Create VIX term structure chart"""
        terms = ['VIX9D', 'VIX', 'VIX3M', 'VIX6M']
        values = [21.0, 22.5, 24.0, 25.5]
        
        fig = go.Figure(data=[
            go.Bar(x=terms, y=values, marker_color='orange')
        ])
        
        fig.update_layout(
            title="VIX Term Structure",
            xaxis_title="Term",
            yaxis_title="Implied Volatility",
            height=400
        )
        
        return fig
    
    def _create_volatility_regime_chart(self):
        """Create volatility regime chart"""
        regimes = ['Very Low', 'Low', 'Moderate', 'High', 'Extreme']
        probabilities = [0.1, 0.2, 0.5, 0.15, 0.05]
        
        fig = go.Figure(data=[
            go.Pie(labels=regimes, values=probabilities, hole=0.3)
        ])
        
        fig.update_layout(
            title="Volatility Regime Probability",
            height=400
        )
        
        return fig
    
    def _create_volatility_forecast_chart(self):
        """Create volatility forecast chart"""
        dates = pd.date_range(start='2024-01-01', end='2024-02-15', freq='D')
        historical = 22.5 + np.cumsum(np.random.randn(31) * 0.5)
        forecast = historical[-1] + np.cumsum(np.random.randn(15) * 0.3)
        
        fig = go.Figure()
        
        # Historical data
        fig.add_trace(go.Scatter(
            x=dates[:31],
            y=historical,
            mode='lines',
            name='Historical VIX',
            line=dict(color='blue', width=2)
        ))
        
        # Forecast
        fig.add_trace(go.Scatter(
            x=dates[30:],
            y=forecast,
            mode='lines',
            name='Forecast',
            line=dict(color='red', width=2, dash='dash')
        ))
        
        fig.update_layout(
            title="VIX Volatility Forecast",
            xaxis_title="Date",
            yaxis_title="VIX Level",
            height=400
        )
        
        return fig
    
    def _refresh_analysis(self):
        """Refresh analysis data"""
        st.success("Analysis refreshed successfully!")
        st.experimental_rerun()
    
    def _export_analysis_data(self):
        """Export analysis data"""
        # Create sample export data
        export_data = {
            "timestamp": datetime.now().isoformat(),
            "assets": st.session_state.get("selected_assets", []),
            "analysis_summary": "Sample export data"
        }
        
        st.download_button(
            label="Download Analysis Report",
            data=json.dumps(export_data, indent=2),
            file_name=f"market_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json"
        )
    
    def _reset_dashboard(self):
        """Reset dashboard to default state"""
        st.session_state.clear()
        st.success("Dashboard reset successfully!")
        st.experimental_rerun()

# Dashboard entry point
def run_financial_dashboard():
    """Run the financial market analysis dashboard"""
    dashboard = FinancialMarketDashboard()
    dashboard.run_dashboard()

if __name__ == "__main__":
    run_financial_dashboard()
