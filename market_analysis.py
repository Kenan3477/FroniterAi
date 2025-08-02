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

if __name__ == "__main__":
    asyncio.run(main())
