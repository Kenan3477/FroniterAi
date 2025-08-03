#!/usr/bin/env python3
"""
🔍 AI Market Analysis Module
📅 Created: 2025-08-02

This module provides comprehensive AI industry trend analysis capabilities
including data collection from multiple sources, trend identification,
and automated report generation for system evolution guidance.
"""

import asyncio
import aiohttp
import json
import logging
import re
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import hashlib
import sqlite3
from urllib.parse import urlencode
import xml.etree.ElementTree as ET

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TrendData:
    """Data structure for trend information"""
    source: str
    category: str
    title: str
    description: str
    popularity_score: float
    growth_rate: float
    timestamp: datetime
    keywords: List[str]
    metadata: Dict[str, Any]

@dataclass
class MarketReport:
    """Market analysis report structure"""
    generated_at: datetime
    period_analyzed: str
    top_trends: List[TrendData]
    emerging_technologies: List[str]
    declining_technologies: List[str]

@dataclass
class AISystemCapability:
    """Data structure for AI system capabilities"""
    system_name: str
    company: str
    capability_type: str  # 'language_model', 'vision', 'reasoning', 'multimodal', etc.
    description: str
    performance_metrics: Dict[str, float]  # benchmark scores, latency, accuracy, etc.
    release_date: datetime
    model_size: Optional[str] = None
    training_data: Optional[str] = None
    key_features: List[str] = None
    limitations: List[str] = None
    source_url: str = ""

@dataclass
class CompetitiveIntelligence:
    """Competitive intelligence report structure"""
    generated_at: datetime
    frontier_capabilities: Dict[str, Any]
    competitor_analysis: List[AISystemCapability]
    capability_gaps: List[Dict[str, Any]]
    improvement_opportunities: List[Dict[str, Any]]
    benchmark_comparisons: Dict[str, Any]
    strategic_recommendations: List[str]

@dataclass
class BenchmarkResult:
    """Benchmark test result structure"""
    test_name: str
    test_category: str
    frontier_score: float
    competitor_scores: Dict[str, float]  # system_name -> score
    industry_average: float
    percentile_rank: float
    improvement_potential: float
    test_timestamp: datetime
    growth_opportunities: List[str]
    recommendations: List[str]
    confidence_score: float

class DataSource:
    """Base class for data sources"""
    
    def __init__(self, name: str, base_url: str, rate_limit: float = 1.0):
        self.name = name
        self.base_url = base_url
        self.rate_limit = rate_limit
        self.last_request = 0
        
    async def _rate_limit_wait(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request
        if time_since_last < self.rate_limit:
            await asyncio.sleep(self.rate_limit - time_since_last)
        self.last_request = time.time()

class GitHubAnalyzer(DataSource):
    """GitHub repository and trend analyzer"""
    
    def __init__(self, token: Optional[str] = None):
        super().__init__("GitHub", "https://api.github.com", 1.0)
        self.token = token
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if token:
            self.headers["Authorization"] = f"token {token}"
    
    async def fetch_trending_repos(self, session: aiohttp.ClientSession, 
                                 language: str = "python", 
                                 days: int = 7) -> List[TrendData]:
        """Fetch trending repositories"""
        await self._rate_limit_wait()
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        date_filter = f"created:>{start_date.strftime('%Y-%m-%d')}"
        
        # Search for trending AI/ML repositories
        ai_keywords = ["machine-learning", "artificial-intelligence", "deep-learning", 
                      "neural-network", "transformer", "llm", "gpt", "ai"]
        
        trends = []
        
        for keyword in ai_keywords[:3]:  # Limit to avoid rate limits
            query = f"{keyword} {date_filter} language:{language}"
            url = f"{self.base_url}/search/repositories"
            params = {
                "q": query,
                "sort": "stars",
                "order": "desc",
                "per_page": 10
            }
            
            try:
                async with session.get(url, headers=self.headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        for repo in data.get("items", [])[:5]:  # Top 5 per keyword
                            # Calculate popularity and growth metrics
                            stars = repo.get("stargazers_count", 0)
                            forks = repo.get("forks_count", 0)
                            popularity = (stars * 0.7) + (forks * 0.3)
                            
                            # Estimate growth rate (simplified)
                            created_date = datetime.fromisoformat(repo["created_at"].replace("Z", "+00:00"))
                            days_old = (datetime.now(created_date.tzinfo) - created_date).days
                            growth_rate = popularity / max(days_old, 1) if days_old > 0 else 0
                            
                            trend = TrendData(
                                source="GitHub",
                                category=f"Repository-{keyword}",
                                title=repo["full_name"],
                                description=repo.get("description", ""),
                                popularity_score=popularity,
                                growth_rate=growth_rate,
                                timestamp=datetime.now(),
                                keywords=[keyword] + (repo.get("topics", []) or []),
                                metadata={
                                    "stars": stars,
                                    "forks": forks,
                                    "language": repo.get("language"),
                                    "url": repo["html_url"],
                                    "created_at": repo["created_at"]
                                }
                            )
                            trends.append(trend)
                            
                    await asyncio.sleep(0.5)  # Additional rate limiting
                    
            except Exception as e:
                logger.error(f"Error fetching GitHub data for {keyword}: {e}")
                
        return trends

class ArXivAnalyzer(DataSource):
    """arXiv research paper trend analyzer"""
    
    def __init__(self):
        super().__init__("arXiv", "http://export.arxiv.org/api", 3.0)  # arXiv has stricter limits
    
    async def fetch_recent_papers(self, session: aiohttp.ClientSession, 
                                categories: List[str] = None, 
                                days: int = 7) -> List[TrendData]:
        """Fetch recent AI/ML papers from arXiv"""
        await self._rate_limit_wait()
        
        if categories is None:
            categories = ["cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.NE"]  # AI categories
        
        trends = []
        
        for category in categories:
            query_params = {
                "search_query": f"cat:{category}",
                "start": 0,
                "max_results": 20,
                "sortBy": "submittedDate",
                "sortOrder": "descending"
            }
            
            url = f"{self.base_url}/query?{urlencode(query_params)}"
            
            try:
                async with session.get(url) as response:
                    if response.status == 200:
                        content = await response.text()
                        
                        # Parse XML response
                        root = ET.fromstring(content)
                        
                        for entry in root.findall("{http://www.w3.org/2005/Atom}entry"):
                            title = entry.find("{http://www.w3.org/2005/Atom}title").text
                            summary = entry.find("{http://www.w3.org/2005/Atom}summary").text
                            published = entry.find("{http://www.w3.org/2005/Atom}published").text
                            
                            # Extract keywords from title and summary
                            text = f"{title} {summary}".lower()
                            ai_keywords = self._extract_ai_keywords(text)
                            
                            # Calculate relevance score based on keywords
                            relevance = len(ai_keywords) * 10 + len(title.split()) * 2
                            
                            # Parse publication date
                            pub_date = datetime.fromisoformat(published.replace("Z", "+00:00"))
                            days_old = (datetime.now(pub_date.tzinfo) - pub_date).days
                            
                            if days_old <= days:  # Only recent papers
                                trend = TrendData(
                                    source="arXiv",
                                    category=f"Research-{category}",
                                    title=title.strip(),
                                    description=summary.strip()[:200] + "...",
                                    popularity_score=relevance,
                                    growth_rate=relevance / max(days_old, 1),
                                    timestamp=datetime.now(),
                                    keywords=ai_keywords,
                                    metadata={
                                        "category": category,
                                        "published": published,
                                        "days_old": days_old
                                    }
                                )
                                trends.append(trend)
                
                await asyncio.sleep(3.0)  # Respect arXiv rate limits
                
            except Exception as e:
                logger.error(f"Error fetching arXiv data for {category}: {e}")
        
        return trends
    
    def _extract_ai_keywords(self, text: str) -> List[str]:
        """Extract AI-related keywords from text"""
        ai_terms = [
            "transformer", "attention", "bert", "gpt", "llm", "neural", "deep learning",
            "machine learning", "artificial intelligence", "computer vision", "nlp",
            "reinforcement learning", "gan", "diffusion", "stable diffusion", "chatgpt",
            "large language model", "fine-tuning", "pre-training", "multimodal",
            "zero-shot", "few-shot", "in-context learning", "prompt engineering"
        ]
        
        found_keywords = []
        for term in ai_terms:
            if term in text:
                found_keywords.append(term)
        
        return found_keywords

class HuggingFaceAnalyzer(DataSource):
    """HuggingFace model and dataset trend analyzer"""
    
    def __init__(self):
        super().__init__("HuggingFace", "https://huggingface.co/api", 2.0)
    
    async def fetch_trending_models(self, session: aiohttp.ClientSession) -> List[TrendData]:
        """Fetch trending models from HuggingFace"""
        await self._rate_limit_wait()
        
        trends = []
        
        # Fetch trending models
        url = f"{self.base_url}/models"
        params = {
            "sort": "downloads",
            "direction": -1,
            "limit": 20
        }
        
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    models = await response.json()
                    
                    for model in models:
                        model_id = model.get("modelId", "")
                        downloads = model.get("downloads", 0)
                        likes = model.get("likes", 0)
                        
                        # Calculate popularity score
                        popularity = (downloads * 0.8) + (likes * 20)  # Weight downloads more
                        
                        # Extract model type and keywords
                        tags = model.get("tags", [])
                        pipeline_tag = model.get("pipeline_tag", "")
                        
                        trend = TrendData(
                            source="HuggingFace",
                            category=f"Model-{pipeline_tag}",
                            title=model_id,
                            description=f"Model with {downloads} downloads, {likes} likes",
                            popularity_score=popularity,
                            growth_rate=downloads / 30,  # Simplified growth estimate
                            timestamp=datetime.now(),
                            keywords=tags + [pipeline_tag] if pipeline_tag else tags,
                            metadata={
                                "downloads": downloads,
                                "likes": likes,
                                "pipeline_tag": pipeline_tag,
                                "tags": tags
                            }
                        )
                        trends.append(trend)
                        
        except Exception as e:
            logger.error(f"Error fetching HuggingFace data: {e}")
        
        return trends

class MarketAnalyzer:
    """Main market analysis orchestrator"""
    
    def __init__(self, data_dir: str = "market_data", github_token: Optional[str] = None):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Initialize data sources
        self.github = GitHubAnalyzer(github_token)
        self.arxiv = ArXivAnalyzer()
        self.huggingface = HuggingFaceAnalyzer()
        
        # Initialize database
        self.db_path = self.data_dir / "market_analysis.db"
        self._init_database()
        
    def _init_database(self):
        """Initialize SQLite database for storing trend data"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS trends (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    popularity_score REAL,
                    growth_rate REAL,
                    timestamp TEXT,
                    keywords TEXT,
                    metadata TEXT,
                    UNIQUE(source, title, timestamp)
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    generated_at TEXT,
                    period_analyzed TEXT,
                    report_data TEXT,
                    confidence_score REAL
                )
            """)
    
    async def collect_market_data(self) -> List[TrendData]:
        """Collect data from all sources"""
        logger.info("🔍 Starting market data collection...")
        
        all_trends = []
        
        async with aiohttp.ClientSession() as session:
            # Collect from all sources concurrently
            tasks = [
                self.github.fetch_trending_repos(session),
                self.arxiv.fetch_recent_papers(session),
                self.huggingface.fetch_trending_models(session)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Data collection error: {result}")
                else:
                    all_trends.extend(result)
        
        # Store in database
        self._store_trends(all_trends)
        
        logger.info(f"✅ Collected {len(all_trends)} trend data points")
        return all_trends
    
    def _store_trends(self, trends: List[TrendData]):
        """Store trend data in database"""
        with sqlite3.connect(self.db_path) as conn:
            for trend in trends:
                try:
                    conn.execute("""
                        INSERT OR REPLACE INTO trends 
                        (source, category, title, description, popularity_score, 
                         growth_rate, timestamp, keywords, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        trend.source,
                        trend.category,
                        trend.title,
                        trend.description,
                        trend.popularity_score,
                        trend.growth_rate,
                        trend.timestamp.isoformat(),
                        json.dumps(trend.keywords),
                        json.dumps(trend.metadata)
                    ))
                except sqlite3.IntegrityError:
                    pass  # Skip duplicates
    
    def analyze_trends(self, days_back: int = 30) -> MarketReport:
        """Analyze collected trends and generate insights"""
        logger.info("📊 Analyzing market trends...")
        
        # Get recent trends from database
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT * FROM trends 
                WHERE timestamp > ?
                ORDER BY popularity_score DESC
            """, (cutoff_date.isoformat(),))
            
            trend_rows = cursor.fetchall()
        
        # Convert to TrendData objects
        trends = []
        for row in trend_rows:
            trend = TrendData(
                source=row[1],
                category=row[2],
                title=row[3],
                description=row[4],
                popularity_score=row[5],
                growth_rate=row[6],
                timestamp=datetime.fromisoformat(row[7]),
                keywords=json.loads(row[8]),
                metadata=json.loads(row[9])
            )
            trends.append(trend)
        
        # Analyze trends
        top_trends = sorted(trends, key=lambda x: x.popularity_score, reverse=True)[:10]
        
        # Identify emerging technologies
        emerging_tech = self._identify_emerging_technologies(trends)
        
        # Identify declining technologies
        declining_tech = self._identify_declining_technologies(trends)
        
        # Generate growth opportunities
        opportunities = self._identify_opportunities(trends)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(trends, emerging_tech, opportunities)
        
        # Calculate confidence score
        confidence = min(len(trends) / 100, 1.0)  # More data = higher confidence
        
        report = MarketReport(
            generated_at=datetime.now(),
            period_analyzed=f"Last {days_back} days",
            top_trends=top_trends,
            emerging_technologies=emerging_tech,
            declining_technologies=declining_tech,
            growth_opportunities=opportunities,
            recommendations=recommendations,
            confidence_score=confidence
        )
        
        # Store report
        self._store_report(report)
        
        return report
    
    def _identify_emerging_technologies(self, trends: List[TrendData]) -> List[str]:
        """Identify emerging technologies based on growth patterns"""
        keyword_growth = {}
        
        for trend in trends:
            for keyword in trend.keywords:
                if keyword not in keyword_growth:
                    keyword_growth[keyword] = []
                keyword_growth[keyword].append(trend.growth_rate)
        
        # Calculate average growth for each keyword
        emerging = []
        for keyword, rates in keyword_growth.items():
            if len(rates) >= 3:  # Need sufficient data
                avg_growth = sum(rates) / len(rates)
                if avg_growth > 5:  # Threshold for "emerging"
                    emerging.append(keyword)
        
        return sorted(emerging, key=lambda k: sum(keyword_growth[k]) / len(keyword_growth[k]), reverse=True)[:5]
    
    def _identify_declining_technologies(self, trends: List[TrendData]) -> List[str]:
        """Identify technologies with declining interest"""
        # This is a simplified implementation
        # In practice, you'd need historical data to identify true decline
        low_growth = []
        keyword_scores = {}
        
        for trend in trends:
            for keyword in trend.keywords:
                if keyword not in keyword_scores:
                    keyword_scores[keyword] = []
                keyword_scores[keyword].append(trend.popularity_score)
        
        for keyword, scores in keyword_scores.items():
            if len(scores) >= 3 and sum(scores) / len(scores) < 10:
                low_growth.append(keyword)
        
        return low_growth[:3]
    
    def _identify_opportunities(self, trends: List[TrendData]) -> List[str]:
        """Identify potential growth opportunities"""
        opportunities = []
        
        # Look for combinations of trending keywords
        keyword_combinations = {}
        for trend in trends:
            if len(trend.keywords) >= 2:
                for i, kw1 in enumerate(trend.keywords):
                    for kw2 in trend.keywords[i+1:]:
                        combo = f"{kw1}+{kw2}"
                        if combo not in keyword_combinations:
                            keyword_combinations[combo] = 0
                        keyword_combinations[combo] += trend.popularity_score
        
        # Top combinations represent opportunities
        top_combos = sorted(keyword_combinations.items(), key=lambda x: x[1], reverse=True)[:5]
        
        for combo, score in top_combos:
            opportunities.append(f"Integration of {combo.replace('+', ' and ')}")
        
        # Add generic opportunities
        opportunities.extend([
            "Multi-modal AI applications",
            "Edge AI deployment",
            "AI-powered automation tools",
            "Personalized AI assistants",
            "AI ethics and safety tools"
        ])
        
        return opportunities[:7]
    
    def _generate_recommendations(self, trends: List[TrendData], 
                                emerging_tech: List[str], 
                                opportunities: List[str]) -> List[str]:
        """Generate actionable recommendations for system evolution"""
        recommendations = []
        
        # Based on emerging technologies
        if emerging_tech:
            recommendations.append(f"Focus development on {emerging_tech[0]} - showing highest growth")
            
        # Based on opportunities
        if opportunities:
            recommendations.append(f"Explore {opportunities[0]} for competitive advantage")
        
        # Based on data sources
        github_trends = [t for t in trends if t.source == "GitHub"]
        if github_trends:
            top_github = max(github_trends, key=lambda x: x.popularity_score)
            recommendations.append(f"Study implementation patterns from {top_github.title}")
        
        # General recommendations
        recommendations.extend([
            "Implement continuous learning capabilities",
            "Add support for latest transformer architectures",
            "Develop automated model fine-tuning features",
            "Enhance multi-modal processing capabilities",
            "Improve real-time performance optimization"
        ])
        
        return recommendations[:8]
    
    def _store_report(self, report: MarketReport):
        """Store analysis report in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO reports (generated_at, period_analyzed, report_data, confidence_score)
                VALUES (?, ?, ?, ?)
            """, (
                report.generated_at.isoformat(),
                report.period_analyzed,
                json.dumps(asdict(report), default=str),
                report.confidence_score
            ))
    
    def generate_report_file(self, report: MarketReport, format: str = "markdown") -> str:
        """Generate a formatted report file"""
        if format.lower() == "markdown":
            return self._generate_markdown_report(report)
        elif format.lower() == "html":
            return self._generate_html_report(report)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_markdown_report(self, report: MarketReport) -> str:
        """Generate markdown report"""
        report_content = f"""# 🔍 AI Market Analysis Report

**Generated:** {report.generated_at.strftime("%Y-%m-%d %H:%M:%S")}  
**Period Analyzed:** {report.period_analyzed}  
**Confidence Score:** {report.confidence_score:.1%}

## 📈 Top Trends

"""
        
        for i, trend in enumerate(report.top_trends[:5], 1):
            report_content += f"""### {i}. {trend.title}
- **Source:** {trend.source}
- **Category:** {trend.category}
- **Popularity Score:** {trend.popularity_score:.1f}
- **Growth Rate:** {trend.growth_rate:.2f}
- **Keywords:** {', '.join(trend.keywords[:5])}
- **Description:** {trend.description[:100]}...

"""
        
        report_content += f"""## 🚀 Emerging Technologies

{chr(10).join(f"- {tech}" for tech in report.emerging_technologies)}

## 📉 Declining Technologies

{chr(10).join(f"- {tech}" for tech in report.declining_technologies)}

## 💡 Growth Opportunities

{chr(10).join(f"- {opp}" for opp in report.growth_opportunities)}

## 🎯 Recommendations

{chr(10).join(f"- {rec}" for rec in report.recommendations)}

---
*Report generated by Frontier AI Market Analyzer*
"""
        
        return report_content
    
    def _generate_html_report(self, report: MarketReport) -> str:
        """Generate HTML report"""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Market Analysis Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        <div class="bg-white rounded-lg shadow-lg p-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-6">🔍 AI Market Analysis Report</h1>
            
            <div class="grid md:grid-cols-3 gap-4 mb-8">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-sm text-blue-600">Generated</div>
                    <div class="font-semibold">{report.generated_at.strftime("%Y-%m-%d %H:%M")}</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <div class="text-sm text-green-600">Period</div>
                    <div class="font-semibold">{report.period_analyzed}</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <div class="text-sm text-purple-600">Confidence</div>
                    <div class="font-semibold">{report.confidence_score:.1%}</div>
                </div>
            </div>
            
            <div class="space-y-8">
                <section>
                    <h2 class="text-2xl font-bold mb-4">📈 Top Trends</h2>
                    <div class="space-y-4">
                        {self._format_trends_html(report.top_trends[:5])}
                    </div>
                </section>
                
                <section>
                    <h2 class="text-2xl font-bold mb-4">🚀 Emerging Technologies</h2>
                    <ul class="list-disc pl-6 space-y-2">
                        {chr(10).join(f"<li>{tech}</li>" for tech in report.emerging_technologies)}
                    </ul>
                </section>
                
                <section>
                    <h2 class="text-2xl font-bold mb-4">💡 Growth Opportunities</h2>
                    <ul class="list-disc pl-6 space-y-2">
                        {chr(10).join(f"<li>{opp}</li>" for opp in report.growth_opportunities)}
                    </ul>
                </section>
                
                <section>
                    <h2 class="text-2xl font-bold mb-4">🎯 Recommendations</h2>
                    <ul class="list-disc pl-6 space-y-2">
                        {chr(10).join(f"<li>{rec}</li>" for rec in report.recommendations)}
                    </ul>
                </section>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    def _format_trends_html(self, trends: List[TrendData]) -> str:
        """Format trends for HTML display"""
        html_blocks = []
        for i, trend in enumerate(trends, 1):
            keywords_str = ', '.join(trend.keywords[:5])
            html_blocks.append(f"""
                <div class="border border-gray-200 rounded-lg p-4">
                    <h3 class="font-semibold text-lg">#{i}. {trend.title}</h3>
                    <div class="grid md:grid-cols-2 gap-4 mt-2 text-sm">
                        <div>
                            <span class="font-medium">Source:</span> {trend.source}<br>
                            <span class="font-medium">Category:</span> {trend.category}<br>
                            <span class="font-medium">Keywords:</span> {keywords_str}
                        </div>
                        <div>
                            <span class="font-medium">Popularity:</span> {trend.popularity_score:.1f}<br>
                            <span class="font-medium">Growth Rate:</span> {trend.growth_rate:.2f}<br>
                        </div>
                    </div>
                    <p class="mt-2 text-gray-600">{trend.description[:150]}...</p>
                </div>
            """)
        return chr(10).join(html_blocks)
    
    async def run_full_analysis(self, output_format: str = "both") -> Dict[str, str]:
        """Run complete market analysis and generate reports"""
        logger.info("🎯 Starting comprehensive market analysis...")
        
        # Collect fresh data
        await self.collect_market_data()
        
        # Generate analysis
        report = self.analyze_trends()
        
        # Generate report files
        reports = {}
        
        if output_format in ["markdown", "both"]:
            markdown_content = self.generate_report_file(report, "markdown")
            markdown_path = self.data_dir / f"market_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            with open(markdown_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)
            reports["markdown"] = str(markdown_path)
            
        if output_format in ["html", "both"]:
            html_content = self.generate_report_file(report, "html")
            html_path = self.data_dir / f"market_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            reports["html"] = str(html_path)
        
        logger.info(f"✅ Analysis complete! Generated {len(reports)} report(s)")
        return reports
    
    def get_evolution_recommendations(self) -> Dict[str, Any]:
        """Get specific recommendations for system evolution"""
        # Get latest report
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT report_data FROM reports 
                ORDER BY generated_at DESC 
                LIMIT 1
            """)
            row = cursor.fetchone()
        
        if not row:
            return {"error": "No analysis reports available"}
        
        report_data = json.loads(row[0])
        
        # Extract actionable insights
        evolution_plan = {
            "priority_technologies": report_data.get("emerging_technologies", [])[:3],
            "implementation_suggestions": report_data.get("recommendations", [])[:5],
            "market_opportunities": report_data.get("growth_opportunities", [])[:3],
            "trending_keywords": [],
            "confidence_level": report_data.get("confidence_score", 0)
        }
        
        # Extract trending keywords from top trends
        for trend in report_data.get("top_trends", [])[:5]:
            evolution_plan["trending_keywords"].extend(trend.get("keywords", []))
        
        # Remove duplicates
        evolution_plan["trending_keywords"] = list(set(evolution_plan["trending_keywords"]))[:10]
        
        return evolution_plan

# Integration with main evolution system
def integrate_with_evolution_system(evolution_system, analyzer: MarketAnalyzer):
    """Integrate market analyzer with the main evolution system"""
    
    async def market_guided_evolution():
        """Run market-guided evolution cycle"""
        try:
            # Get market insights
            recommendations = analyzer.get_evolution_recommendations()
            
            if "error" not in recommendations:
                # Apply insights to evolution system
                for tech in recommendations.get("priority_technologies", []):
                    evolution_system.add_task(f"Implement {tech} capabilities")
                
                for suggestion in recommendations.get("implementation_suggestions", [])[:3]:
                    evolution_system.add_task(f"Evolution: {suggestion}")
                
                logger.info("🔗 Market insights integrated into evolution system")
            
        except Exception as e:
            logger.error(f"Error integrating market insights: {e}")
    
    # Add method to evolution system if it doesn't exist
    if hasattr(evolution_system, 'add_market_guided_task'):
        evolution_system.market_guided_evolution = market_guided_evolution
    
    return market_guided_evolution

# Example usage and testing
async def main():
    """Example usage of the MarketAnalyzer"""
    logger.info("🚀 Starting AI Market Analysis Demo...")
    
    # Initialize analyzer
    analyzer = MarketAnalyzer()
    
    # Run analysis
    reports = await analyzer.run_full_analysis()
    
    # Display results
    logger.info("📊 Generated reports:")
    for format_type, path in reports.items():
        logger.info(f"  {format_type.upper()}: {path}")
    
    # Get evolution recommendations
    evolution_recs = analyzer.get_evolution_recommendations()
    logger.info("🎯 Evolution Recommendations:")
    for key, value in evolution_recs.items():
        if isinstance(value, list):
            logger.info(f"  {key}: {', '.join(value[:3])}")
        else:
            logger.info(f"  {key}: {value}")


class CompetitiveIntelligenceAnalyzer:
    """Advanced competitive intelligence analyzer for AI systems"""
    
    def __init__(self, data_dir: str = "competitive_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Database for competitive intelligence
        self.db_path = self.data_dir / "competitive_intelligence.db"
        self.init_database()
        
        # Known AI systems to track
        self.tracked_systems = {
            "OpenAI": ["GPT-4", "GPT-4 Turbo", "DALL-E 3", "Whisper", "CodeX"],
            "Anthropic": ["Claude-3 Opus", "Claude-3 Sonnet", "Claude-3 Haiku"],
            "Google": ["Gemini Ultra", "Gemini Pro", "PaLM 2", "Bard", "LaMDA"],
            "Meta": ["Llama 2", "Code Llama", "SAM", "Make-A-Video"],
            "Microsoft": ["Copilot", "Bing Chat", "Azure OpenAI"],
            "DeepMind": ["Gemini", "AlphaCode", "Flamingo"],
            "Cohere": ["Command", "Generate", "Embed"],
            "Stability AI": ["Stable Diffusion XL", "StableLM"],
            "Hugging Face": ["BigCode", "BLOOM", "StarCoder"]
        }
        
        # Capability categories for analysis
        self.capability_categories = [
            "language_understanding",
            "code_generation", 
            "reasoning",
            "multimodal",
            "vision",
            "audio",
            "safety",
            "efficiency",
            "fine_tuning",
            "deployment"
        ]
        
        # Benchmark datasets and metrics
        self.benchmarks = {
            "language": ["MMLU", "HellaSwag", "ARC", "TruthfulQA", "GLUE"],
            "code": ["HumanEval", "MBPP", "CodeX", "BigCodeBench"],
            "reasoning": ["GSM8K", "MATH", "BBH", "LogiQA"],
            "multimodal": ["VQA", "COCO", "Flickr30k", "TextVQA"],
            "safety": ["ToxiGen", "RealToxicityPrompts", "CrowS-Pairs"]
        }
    
    def init_database(self):
        """Initialize competitive intelligence database"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # AI systems table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_systems (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_name TEXT NOT NULL,
                    company TEXT NOT NULL,
                    release_date TEXT,
                    model_size TEXT,
                    key_features TEXT,
                    limitations TEXT,
                    source_url TEXT,
                    last_updated TEXT,
                    UNIQUE(system_name, company)
                )
            """)
            
            # Capabilities table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS capabilities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_id INTEGER,
                    capability_type TEXT NOT NULL,
                    description TEXT,
                    performance_metrics TEXT,
                    timestamp TEXT,
                    FOREIGN KEY (system_id) REFERENCES ai_systems (id)
                )
            """)
            
            # Benchmarks table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS benchmarks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    system_name TEXT NOT NULL,
                    benchmark_name TEXT NOT NULL,
                    category TEXT,
                    score REAL,
                    percentile_rank REAL,
                    test_date TEXT,
                    source TEXT
                )
            """)
            
            # Competitive analysis table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS competitive_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    analysis_date TEXT,
                    frontier_capabilities TEXT,
                    competitor_analysis TEXT,
                    capability_gaps TEXT,
                    recommendations TEXT
                )
            """)
            
            conn.commit()
    
    async def collect_competitive_data(self) -> Dict[str, Any]:
        """Collect competitive intelligence from multiple sources"""
        logger.info("🔍 Starting competitive intelligence collection...")
        
        competitive_data = {
            "systems": [],
            "capabilities": [],
            "benchmarks": [],
            "market_positioning": {},
            "collection_timestamp": datetime.now().isoformat()
        }
        
        try:
            # Collect from papers and research
            papers_data = await self._collect_from_arxiv()
            competitive_data["research_insights"] = papers_data
            
            # Collect from GitHub (model releases, benchmarks)
            github_data = await self._collect_github_competitive_data()
            competitive_data["development_activity"] = github_data
            
            # Collect from HuggingFace model hub
            hf_data = await self._collect_huggingface_models()
            competitive_data["model_releases"] = hf_data
            
            # Store collected data
            self._store_competitive_data(competitive_data)
            
            logger.info("✅ Competitive intelligence collection completed")
            return competitive_data
            
        except Exception as e:
            logger.error(f"❌ Error collecting competitive data: {e}")
            return {"error": str(e)}
    
    async def _collect_from_arxiv(self) -> List[Dict]:
        """Collect AI system announcements and benchmarks from arXiv"""
        competitive_papers = []
        
        # Search terms for competitive intelligence
        search_terms = [
            "language model benchmark",
            "AI system evaluation", 
            "multimodal model comparison",
            "foundation model capabilities",
            "LLM performance analysis"
        ]
        
        async with aiohttp.ClientSession() as session:
            for term in search_terms:
                try:
                    params = {
                        'search_query': f'all:{term}',
                        'start': 0,
                        'max_results': 20,
                        'sortBy': 'submittedDate',
                        'sortOrder': 'descending'
                    }
                    
                    url = f"http://export.arxiv.org/api/query?{urlencode(params)}"
                    
                    async with session.get(url) as response:
                        if response.status == 200:
                            xml_content = await response.text()
                            papers = self._parse_arxiv_competitive_xml(xml_content)
                            competitive_papers.extend(papers)
                            
                    await asyncio.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error collecting from arXiv for term '{term}': {e}")
        
        return competitive_papers[:50]  # Limit results
    
    def _parse_arxiv_competitive_xml(self, xml_content: str) -> List[Dict]:
        """Parse arXiv XML for competitive intelligence"""
        papers = []
        
        try:
            root = ET.fromstring(xml_content)
            namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
            
            for entry in root.findall('atom:entry', namespaces):
                title_elem = entry.find('atom:title', namespaces)
                summary_elem = entry.find('atom:summary', namespaces)
                published_elem = entry.find('atom:published', namespaces)
                
                if title_elem is not None and summary_elem is not None:
                    title = title_elem.text.strip()
                    summary = summary_elem.text.strip()
                    
                    # Extract competitive intelligence
                    system_mentions = self._extract_ai_systems(title + " " + summary)
                    benchmark_mentions = self._extract_benchmarks(title + " " + summary)
                    
                    if system_mentions or benchmark_mentions:
                        papers.append({
                            'title': title,
                            'summary': summary[:500],
                            'published': published_elem.text if published_elem is not None else '',
                            'ai_systems_mentioned': system_mentions,
                            'benchmarks_mentioned': benchmark_mentions,
                            'competitive_relevance': len(system_mentions) + len(benchmark_mentions)
                        })
        
        except ET.ParseError as e:
            logger.error(f"Error parsing arXiv XML: {e}")
        
        return papers
    
    def _extract_ai_systems(self, text: str) -> List[str]:
        """Extract mentions of AI systems from text"""
        systems_found = []
        text_lower = text.lower()
        
        for company, systems in self.tracked_systems.items():
            for system in systems:
                if system.lower() in text_lower:
                    systems_found.append(f"{company}:{system}")
        
        return list(set(systems_found))
    
    def _extract_benchmarks(self, text: str) -> List[str]:
        """Extract mentions of benchmarks from text"""
        benchmarks_found = []
        text_lower = text.lower()
        
        for category, benchmarks in self.benchmarks.items():
            for benchmark in benchmarks:
                if benchmark.lower() in text_lower:
                    benchmarks_found.append(f"{category}:{benchmark}")
        
        return list(set(benchmarks_found))
    
    async def _collect_github_competitive_data(self) -> Dict[str, Any]:
        """Collect competitive data from GitHub repositories"""
        github_data = {
            "model_releases": [],
            "benchmark_repos": [],
            "evaluation_frameworks": []
        }
        
        # Search terms for competitive repositories
        search_queries = [
            "language model evaluation",
            "LLM benchmark",
            "AI model comparison", 
            "foundation model",
            "multimodal evaluation"
        ]
        
        async with aiohttp.ClientSession() as session:
            for query in search_queries:
                try:
                    url = f"https://api.github.com/search/repositories"
                    params = {
                        'q': f'{query} language:Python stars:>100',
                        'sort': 'updated',
                        'order': 'desc',
                        'per_page': 10
                    }
                    
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            for repo in data.get('items', []):
                                repo_info = {
                                    'name': repo['name'],
                                    'description': repo.get('description', ''),
                                    'stars': repo['stargazers_count'],
                                    'language': repo.get('language'),
                                    'updated': repo['updated_at'],
                                    'url': repo['html_url'],
                                    'competitive_relevance': self._assess_competitive_relevance(
                                        repo['name'] + " " + repo.get('description', '')
                                    )
                                }
                                
                                if repo_info['competitive_relevance'] > 0:
                                    github_data["benchmark_repos"].append(repo_info)
                    
                    await asyncio.sleep(1)  # Rate limiting
                    
                except Exception as e:
                    logger.error(f"Error collecting GitHub data for '{query}': {e}")
        
        return github_data
    
    def _assess_competitive_relevance(self, text: str) -> int:
        """Assess how relevant a repository is for competitive intelligence"""
        relevance_keywords = [
            'benchmark', 'evaluation', 'comparison', 'leaderboard',
            'gpt', 'claude', 'gemini', 'llama', 'palm',
            'performance', 'accuracy', 'score', 'metric'
        ]
        
        text_lower = text.lower()
        relevance_score = sum(1 for keyword in relevance_keywords if keyword in text_lower)
        
        return relevance_score
    
    async def _collect_huggingface_models(self) -> List[Dict]:
        """Collect model information from HuggingFace"""
        hf_models = []
        
        try:
            async with aiohttp.ClientSession() as session:
                # Get popular models
                url = "https://huggingface.co/api/models"
                params = {
                    'sort': 'downloads',
                    'direction': -1,
                    'limit': 50,
                    'filter': 'text-generation'
                }
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        models_data = await response.json()
                        
                        for model in models_data:
                            model_info = {
                                'name': model.get('id', ''),
                                'downloads': model.get('downloads', 0),
                                'likes': model.get('likes', 0),
                                'tags': model.get('tags', []),
                                'created_at': model.get('createdAt', ''),
                                'updated_at': model.get('lastModified', ''),
                                'competitive_score': self._calculate_model_competitive_score(model)
                            }
                            
                            if model_info['competitive_score'] > 0:
                                hf_models.append(model_info)
        
        except Exception as e:
            logger.error(f"Error collecting HuggingFace models: {e}")
        
        return hf_models[:30]  # Limit results
    
    def _calculate_model_competitive_score(self, model: Dict) -> float:
        """Calculate competitive relevance score for a model"""
        score = 0
        
        # Downloads weight
        downloads = model.get('downloads', 0)
        if downloads > 1000000:
            score += 3
        elif downloads > 100000:
            score += 2
        elif downloads > 10000:
            score += 1
        
        # Tags relevance
        competitive_tags = ['text-generation', 'conversational', 'code', 'reasoning']
        tags = model.get('tags', [])
        tag_score = sum(1 for tag in tags if any(comp_tag in tag for comp_tag in competitive_tags))
        score += tag_score
        
        return score
    
    def _store_competitive_data(self, data: Dict[str, Any]):
        """Store competitive intelligence data in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Store research insights
                for paper in data.get("research_insights", []):
                    for system in paper.get('ai_systems_mentioned', []):
                        company, system_name = system.split(':', 1)
                        cursor.execute("""
                            INSERT OR IGNORE INTO ai_systems 
                            (system_name, company, source_url, last_updated)
                            VALUES (?, ?, ?, ?)
                        """, (system_name, company, paper.get('title', ''), 
                              datetime.now().isoformat()))
                
                # Store GitHub data
                for repo in data.get("development_activity", {}).get("benchmark_repos", []):
                    if repo['competitive_relevance'] > 2:
                        cursor.execute("""
                            INSERT OR IGNORE INTO benchmarks
                            (system_name, benchmark_name, category, source, test_date)
                            VALUES (?, ?, ?, ?, ?)
                        """, ('Repository', repo['name'], 'evaluation_framework',
                              repo['url'], datetime.now().isoformat()))
                
                conn.commit()
                logger.info("💾 Competitive data stored successfully")
                
        except Exception as e:
            logger.error(f"Error storing competitive data: {e}")
    
    async def analyze_capabilities(self, frontier_capabilities: Dict[str, Any]) -> CompetitiveIntelligence:
        """Analyze FrontierAI capabilities against competitors"""
        logger.info("🔬 Starting competitive capability analysis...")
        
        # Collect latest competitive data
        competitive_data = await self.collect_competitive_data()
        
        # Analyze capability gaps
        capability_gaps = self._identify_capability_gaps(frontier_capabilities, competitive_data)
        
        # Generate improvement opportunities
        improvement_opportunities = self._generate_improvement_opportunities(capability_gaps)
        
        # Benchmark comparisons
        benchmark_comparisons = await self._perform_benchmark_analysis()
        
        # Strategic recommendations
        strategic_recommendations = self._generate_strategic_recommendations(
            capability_gaps, improvement_opportunities, benchmark_comparisons
        )
        
        # Create competitive intelligence report
        intelligence = CompetitiveIntelligence(
            generated_at=datetime.now(),
            frontier_capabilities=frontier_capabilities,
            competitor_analysis=self._extract_competitor_capabilities(),
            capability_gaps=capability_gaps,
            improvement_opportunities=improvement_opportunities,
            benchmark_comparisons=benchmark_comparisons,
            strategic_recommendations=strategic_recommendations
        )
        
        # Store analysis
        self._store_competitive_analysis(intelligence)
        
        logger.info("✅ Competitive capability analysis completed")
        return intelligence
    
    def _identify_capability_gaps(self, frontier_caps: Dict[str, Any], 
                                 competitive_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify capability gaps compared to competitors"""
        gaps = []
        
        # Analyze each capability category
        for category in self.capability_categories:
            frontier_score = frontier_caps.get(category, 0)
            
            # Find competitor capabilities in this category
            competitor_capabilities = []
            
            # Extract from research papers
            for paper in competitive_data.get("research_insights", []):
                if category.replace('_', ' ') in paper.get('title', '').lower():
                    for system in paper.get('ai_systems_mentioned', []):
                        competitor_capabilities.append({
                            'system': system,
                            'capability': category,
                            'evidence': paper['title'],
                            'estimated_score': self._estimate_capability_score(paper)
                        })
            
            # Calculate gap
            if competitor_capabilities:
                max_competitor_score = max(cap['estimated_score'] for cap in competitor_capabilities)
                
                if max_competitor_score > frontier_score:
                    gaps.append({
                        'capability': category,
                        'frontier_score': frontier_score,
                        'competitor_max': max_competitor_score,
                        'gap_size': max_competitor_score - frontier_score,
                        'leading_systems': [cap for cap in competitor_capabilities 
                                          if cap['estimated_score'] == max_competitor_score],
                        'priority': self._calculate_gap_priority(category, max_competitor_score - frontier_score)
                    })
        
        # Sort by priority
        gaps.sort(key=lambda x: x['priority'], reverse=True)
        return gaps[:10]  # Top 10 gaps
    
    def _estimate_capability_score(self, paper: Dict) -> float:
        """Estimate capability score based on paper content"""
        score = 5.0  # Base score
        
        # Boost for benchmark mentions
        benchmark_count = len(paper.get('benchmarks_mentioned', []))
        score += benchmark_count * 0.5
        
        # Boost for competitive relevance
        relevance = paper.get('competitive_relevance', 0)
        score += relevance * 0.3
        
        # Boost for system mentions
        system_count = len(paper.get('ai_systems_mentioned', []))
        score += system_count * 0.2
        
        return min(score, 10.0)  # Cap at 10
    
    def _calculate_gap_priority(self, capability: str, gap_size: float) -> float:
        """Calculate priority for addressing a capability gap"""
        # High priority capabilities
        high_priority = ['language_understanding', 'reasoning', 'safety', 'code_generation']
        medium_priority = ['multimodal', 'efficiency', 'fine_tuning']
        
        base_priority = gap_size
        
        if capability in high_priority:
            base_priority *= 1.5
        elif capability in medium_priority:
            base_priority *= 1.2
        
        return base_priority
    
    def _generate_improvement_opportunities(self, gaps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate specific improvement opportunities based on gaps"""
        opportunities = []
        
        for gap in gaps:
            capability = gap['capability']
            gap_size = gap['gap_size']
            leading_systems = gap['leading_systems']
            
            # Generate specific recommendations
            recommendations = []
            
            if capability == 'language_understanding':
                recommendations = [
                    "Implement advanced reasoning mechanisms",
                    "Enhance context window handling",
                    "Improve instruction following capabilities",
                    "Add multi-turn conversation memory"
                ]
            elif capability == 'code_generation':
                recommendations = [
                    "Train on diverse programming languages",
                    "Implement code explanation capabilities", 
                    "Add debugging and optimization suggestions",
                    "Enhance code review functionality"
                ]
            elif capability == 'reasoning':
                recommendations = [
                    "Implement chain-of-thought reasoning",
                    "Add mathematical problem solving",
                    "Enhance logical deduction capabilities",
                    "Implement multi-step planning"
                ]
            elif capability == 'multimodal':
                recommendations = [
                    "Add vision-language integration",
                    "Implement audio processing capabilities",
                    "Enhance image generation quality",
                    "Add video understanding features"
                ]
            else:
                recommendations = [
                    f"Research latest {capability} techniques",
                    f"Benchmark against leading {capability} systems",
                    f"Implement state-of-the-art {capability} methods"
                ]
            
            opportunities.append({
                'capability': capability,
                'gap_size': gap_size,
                'priority': gap['priority'],
                'leading_competitors': [sys['system'] for sys in leading_systems],
                'recommendations': recommendations,
                'estimated_effort': self._estimate_implementation_effort(capability, gap_size),
                'expected_impact': self._estimate_impact(capability, gap_size)
            })
        
        return opportunities
    
    def _estimate_implementation_effort(self, capability: str, gap_size: float) -> str:
        """Estimate effort required to implement improvements"""
        effort_multipliers = {
            'language_understanding': 1.5,
            'reasoning': 1.8,
            'multimodal': 2.0,
            'safety': 1.3,
            'code_generation': 1.2,
            'efficiency': 1.0
        }
        
        base_effort = gap_size * effort_multipliers.get(capability, 1.0)
        
        if base_effort < 2:
            return "Low"
        elif base_effort < 4:
            return "Medium"
        elif base_effort < 6:
            return "High"
        else:
            return "Very High"
    
    def _estimate_impact(self, capability: str, gap_size: float) -> str:
        """Estimate business impact of addressing capability gap"""
        impact_weights = {
            'language_understanding': 2.0,
            'safety': 1.8,
            'reasoning': 1.7,
            'code_generation': 1.5,
            'multimodal': 1.3,
            'efficiency': 1.2
        }
        
        impact_score = gap_size * impact_weights.get(capability, 1.0)
        
        if impact_score < 3:
            return "Low"
        elif impact_score < 6:
            return "Medium"
        elif impact_score < 9:
            return "High"
        else:
            return "Critical"
    
    async def _perform_benchmark_analysis(self) -> Dict[str, Any]:
        """Perform benchmark analysis against competitors"""
        benchmark_results = {}
        
        # Simulate benchmark scores (in real implementation, these would be actual test results)
        frontier_benchmarks = {
            'MMLU': 72.5,
            'HellaSwag': 84.2,
            'HumanEval': 48.1,
            'GSM8K': 67.3,
            'TruthfulQA': 58.7
        }
        
        # Competitor benchmark data (would be collected from papers/leaderboards)
        competitor_benchmarks = {
            'GPT-4': {'MMLU': 86.4, 'HellaSwag': 95.3, 'HumanEval': 67.0, 'GSM8K': 92.0, 'TruthfulQA': 59.0},
            'Claude-3 Opus': {'MMLU': 86.8, 'HellaSwag': 95.4, 'HumanEval': 84.9, 'GSM8K': 95.0, 'TruthfulQA': 83.1},
            'Gemini Ultra': {'MMLU': 90.0, 'HellaSwag': 87.8, 'HumanEval': 74.4, 'GSM8K': 94.4, 'TruthfulQA': 75.0}
        }
        
        for benchmark_name, frontier_score in frontier_benchmarks.items():
            competitor_scores = {sys: scores.get(benchmark_name, 0) 
                               for sys, scores in competitor_benchmarks.items()}
            
            # Calculate statistics
            all_scores = list(competitor_scores.values()) + [frontier_score]
            industry_average = sum(all_scores) / len(all_scores)
            
            # Calculate percentile rank
            scores_below = sum(1 for score in all_scores if score < frontier_score)
            percentile_rank = (scores_below / len(all_scores)) * 100
            
            # Calculate improvement potential
            max_competitor = max(competitor_scores.values()) if competitor_scores else frontier_score
            improvement_potential = max_competitor - frontier_score
            
            benchmark_results[benchmark_name] = BenchmarkResult(
                test_name=benchmark_name,
                test_category=self._get_benchmark_category(benchmark_name),
                frontier_score=frontier_score,
                competitor_scores=competitor_scores,
                industry_average=industry_average,
                percentile_rank=percentile_rank,
                improvement_potential=improvement_potential,
                test_timestamp=datetime.now()
            )
        
        return benchmark_results
    
    def _get_benchmark_category(self, benchmark_name: str) -> str:
        """Get category for a benchmark"""
        categories = {
            'MMLU': 'language',
            'HellaSwag': 'language',
            'HumanEval': 'code',
            'GSM8K': 'reasoning',
            'TruthfulQA': 'safety'
        }
        return categories.get(benchmark_name, 'general')
    
    def _extract_competitor_capabilities(self) -> List[AISystemCapability]:
        """Extract competitor capabilities from database"""
        capabilities = []
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT DISTINCT system_name, company 
                    FROM ai_systems 
                    ORDER BY last_updated DESC
                    LIMIT 20
                """)
                
                for row in cursor.fetchall():
                    system_name, company = row
                    capabilities.append(AISystemCapability(
                        system_name=system_name,
                        company=company,
                        capability_type="general",
                        description=f"AI system from {company}",
                        performance_metrics={},
                        release_date=datetime.now(),
                        key_features=[],
                        limitations=[]
                    ))
        
        except Exception as e:
            logger.error(f"Error extracting competitor capabilities: {e}")
        
        return capabilities
    
    def _generate_strategic_recommendations(self, gaps: List[Dict], opportunities: List[Dict], 
                                          benchmarks: Dict[str, BenchmarkResult]) -> List[str]:
        """Generate strategic recommendations for FrontierAI"""
        recommendations = []
        
        # Analyze benchmark performance
        underperforming_benchmarks = [
            name for name, result in benchmarks.items() 
            if result.percentile_rank < 50
        ]
        
        if underperforming_benchmarks:
            recommendations.append(
                f"Priority: Improve performance on {', '.join(underperforming_benchmarks[:3])} benchmarks"
            )
        
        # High-priority gaps
        high_priority_gaps = [gap for gap in gaps if gap['priority'] > 2.0]
        
        if high_priority_gaps:
            capabilities = [gap['capability'] for gap in high_priority_gaps[:3]]
            recommendations.append(
                f"Focus development on {', '.join(capabilities)} capabilities"
            )
        
        # Quick wins
        quick_wins = [opp for opp in opportunities 
                     if opp['estimated_effort'] in ['Low', 'Medium'] 
                     and opp['expected_impact'] in ['High', 'Critical']]
        
        if quick_wins:
            recommendations.append(
                f"Implement quick wins in {quick_wins[0]['capability']} for immediate impact"
            )
        
        # Market positioning
        recommendations.extend([
            "Establish regular competitive benchmarking process",
            "Develop unique differentiating capabilities beyond feature parity",
            "Focus on safety and reliability as competitive advantages",
            "Build comprehensive evaluation framework for continuous improvement",
            "Consider strategic partnerships to accelerate capability development"
        ])
        
        return recommendations[:10]  # Top 10 recommendations
    
    def _store_competitive_analysis(self, intelligence: CompetitiveIntelligence):
        """Store competitive analysis in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO competitive_analysis 
                    (analysis_date, frontier_capabilities, competitor_analysis, 
                     capability_gaps, recommendations)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    intelligence.generated_at.isoformat(),
                    json.dumps(intelligence.frontier_capabilities),
                    json.dumps([asdict(cap) for cap in intelligence.competitor_analysis]),
                    json.dumps(intelligence.capability_gaps),
                    json.dumps(intelligence.strategic_recommendations)
                ))
                
                conn.commit()
                logger.info("💾 Competitive analysis stored successfully")
                
        except Exception as e:
            logger.error(f"Error storing competitive analysis: {e}")
    
    def generate_competitive_report(self, intelligence: CompetitiveIntelligence) -> str:
        """Generate comprehensive competitive intelligence report"""
        report_date = intelligence.generated_at.strftime("%Y-%m-%d %H:%M:%S")
        
        report = f"""# 🔍 Competitive Intelligence Report
**Generated:** {report_date}

## 📊 Executive Summary

FrontierAI competitive analysis reveals {len(intelligence.capability_gaps)} capability gaps 
and {len(intelligence.improvement_opportunities)} improvement opportunities across 
{len(intelligence.competitor_analysis)} competitor systems.

## 🎯 Key Findings

### Critical Capability Gaps
"""
        
        # Add capability gaps
        for i, gap in enumerate(intelligence.capability_gaps[:5], 1):
            report += f"""
{i}. **{gap['capability'].replace('_', ' ').title()}**
   - Gap Size: {gap['gap_size']:.1f} points
   - Priority: {gap['priority']:.1f}
   - Leading Competitors: {', '.join([sys['system'] for sys in gap['leading_systems'][:3]])}
"""
        
        # Add benchmark analysis
        report += "\n## 📈 Benchmark Performance\n"
        
        for benchmark_name, result in intelligence.benchmark_comparisons.items():
            status = "🟢" if result.percentile_rank > 75 else "🟡" if result.percentile_rank > 50 else "🔴"
            report += f"""
- **{benchmark_name}** {status}
  - FrontierAI Score: {result.frontier_score:.1f}
  - Industry Average: {result.industry_average:.1f}
  - Percentile Rank: {result.percentile_rank:.1f}%
  - Improvement Potential: {result.improvement_potential:.1f} points
"""
        
        # Add improvement opportunities
        report += "\n## 🚀 Improvement Opportunities\n"
        
        for i, opp in enumerate(intelligence.improvement_opportunities[:5], 1):
            report += f"""
### {i}. {opp['capability'].replace('_', ' ').title()}
- **Priority:** {opp['priority']:.1f}
- **Effort:** {opp['estimated_effort']}
- **Impact:** {opp['expected_impact']}
- **Leading Competitors:** {', '.join(opp['leading_competitors'][:2])}

**Recommendations:**
"""
            for rec in opp['recommendations'][:3]:
                report += f"  - {rec}\n"
        
        # Add strategic recommendations
        report += "\n## 📋 Strategic Recommendations\n"
        
        for i, rec in enumerate(intelligence.strategic_recommendations, 1):
            report += f"{i}. {rec}\n"
        
        report += f"""
## 📊 Competitive Landscape

**Total Competitors Analyzed:** {len(intelligence.competitor_analysis)}
**Data Sources:** arXiv papers, GitHub repositories, HuggingFace models
**Analysis Confidence:** High (based on {len(intelligence.capability_gaps)} data points)

---
*Generated by FrontierAI Competitive Intelligence System*
"""
        
        return report


# Integration function for competitive intelligence
def integrate_competitive_intelligence(evolution_system, competitive_analyzer: CompetitiveIntelligenceAnalyzer):
    """Integrate competitive intelligence with evolution system"""
    
    async def competitive_guided_evolution():
        """Run competitive intelligence guided evolution"""
        try:
            # Get current FrontierAI capabilities (mock data for now)
            frontier_capabilities = {
                'language_understanding': 7.2,
                'code_generation': 6.8,
                'reasoning': 6.5,
                'multimodal': 5.2,
                'safety': 7.8,
                'efficiency': 6.9
            }
            
            # Perform competitive analysis
            intelligence = await competitive_analyzer.analyze_capabilities(frontier_capabilities)
            
            # Apply insights to evolution system
            for opportunity in intelligence.improvement_opportunities[:3]:
                for rec in opportunity['recommendations'][:2]:
                    evolution_system.add_task(f"Competitive: {rec}")
            
            # Add benchmark improvement tasks
            for benchmark_name, result in intelligence.benchmark_comparisons.items():
                if result.improvement_potential > 5:
                    evolution_system.add_task(f"Improve {benchmark_name} benchmark score by {result.improvement_potential:.1f} points")
            
            logger.info("🔗 Competitive intelligence integrated into evolution system")
            
        except Exception as e:
            logger.error(f"Error in competitive guided evolution: {e}")
    
    # Add method to evolution system
    if not hasattr(evolution_system, 'competitive_guided_evolution'):
        evolution_system.competitive_guided_evolution = competitive_guided_evolution

if __name__ == "__main__":
    asyncio.run(main())
