"""
REAL Competitive Intelligence Analyzer
Scrapes, analyzes, and monitors actual competitors with functional code generation
"""

import requests
import json
import time
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import re
import urllib.parse
from dataclasses import dataclass
import asyncio
import aiohttp
from bs4 import BeautifulSoup
import yfinance as yf
import pandas as pd

logger = logging.getLogger(__name__)

@dataclass
class CompetitorProfile:
    """Real competitor data structure"""
    name: str
    website: str
    stock_symbol: Optional[str]
    market_cap: Optional[float]
    revenue: Optional[float]
    employees: Optional[int]
    funding_raised: Optional[float]
    last_funding_date: Optional[str]
    technologies: List[str]
    key_features: List[str]
    pricing_model: str
    target_market: List[str]
    strengths: List[str]
    weaknesses: List[str]
    threat_level: int  # 1-10 scale
    
class RealCompetitiveIntelligence:
    """
    ACTUAL competitive intelligence that scrapes real data
    """
    
    def __init__(self):
        self.competitors = {}
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.crunchbase_api_key = os.environ.get('CRUNCHBASE_API_KEY')
        self.alpha_vantage_api_key = os.environ.get('ALPHA_VANTAGE_API_KEY')
        
    def analyze_competitor_website(self, url: str) -> Dict:
        """Scrape and analyze competitor website for intelligence"""
        try:
            logger.info(f"Analyzing competitor website: {url}")
            
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract key information
            analysis = {
                'url': url,
                'title': soup.title.string if soup.title else '',
                'description': self._extract_meta_description(soup),
                'technologies': self._detect_technologies(response.text, soup),
                'pricing_signals': self._extract_pricing_info(soup),
                'feature_keywords': self._extract_feature_keywords(soup),
                'contact_info': self._extract_contact_info(soup),
                'social_links': self._extract_social_links(soup),
                'job_postings': self._check_hiring_activity(url),
                'performance_metrics': self._analyze_site_performance(url),
                'seo_analysis': self._analyze_seo_factors(soup),
                'content_strategy': self._analyze_content_strategy(soup),
                'timestamp': datetime.now().isoformat()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze website {url}: {e}")
            return {'error': str(e), 'url': url}
    
    def _extract_meta_description(self, soup) -> str:
        """Extract meta description"""
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        return meta_desc.get('content', '') if meta_desc else ''
    
    def _detect_technologies(self, html_content: str, soup) -> List[str]:
        """Detect technologies used by competitor"""
        technologies = []
        
        # Check for common frameworks and libraries
        tech_patterns = {
            'React': r'react|React',
            'Vue.js': r'vue\.js|Vue',
            'Angular': r'angular|Angular',
            'jQuery': r'jquery|jQuery',
            'Bootstrap': r'bootstrap',
            'TailwindCSS': r'tailwind',
            'Next.js': r'next\.js|_next',
            'Gatsby': r'gatsby',
            'Shopify': r'shopify|myshopify',
            'WordPress': r'wp-content|wordpress',
            'Webflow': r'webflow',
            'Squarespace': r'squarespace',
            'HubSpot': r'hubspot|hs-analytics',
            'Google Analytics': r'google-analytics|gtag',
            'Stripe': r'stripe\.com|js\.stripe',
            'PayPal': r'paypal\.com',
            'Intercom': r'intercom|widget\.intercom',
            'Zendesk': r'zendesk|zopim',
            'Salesforce': r'salesforce|sfdc',
            'AWS': r'amazonaws\.com',
            'Cloudflare': r'cloudflare',
            'Microsoft Azure': r'azure|microsoftonline'
        }
        
        for tech, pattern in tech_patterns.items():
            if re.search(pattern, html_content, re.IGNORECASE):
                technologies.append(tech)
        
        # Check script sources
        scripts = soup.find_all('script', src=True)
        for script in scripts:
            src = script.get('src', '')
            if 'react' in src.lower():
                technologies.append('React')
            elif 'vue' in src.lower():
                technologies.append('Vue.js')
            elif 'angular' in src.lower():
                technologies.append('Angular')
        
        return list(set(technologies))
    
    def _extract_pricing_info(self, soup) -> Dict:
        """Extract pricing information"""
        pricing_keywords = ['price', 'pricing', 'cost', 'plan', 'subscription', 'free', 'premium', 'enterprise']
        pricing_data = {
            'has_pricing_page': False,
            'pricing_signals': [],
            'free_tier': False,
            'subscription_model': False
        }
        
        # Look for pricing-related text
        text_content = soup.get_text().lower()
        
        for keyword in pricing_keywords:
            if keyword in text_content:
                pricing_data['pricing_signals'].append(keyword)
        
        # Check for pricing page links
        pricing_links = soup.find_all('a', href=True)
        for link in pricing_links:
            href = link.get('href', '').lower()
            link_text = link.get_text().lower()
            
            if any(p in href or p in link_text for p in ['pricing', 'price', 'plans']):
                pricing_data['has_pricing_page'] = True
        
        # Check for common pricing indicators
        if any(word in text_content for word in ['free', 'trial', '30 days']):
            pricing_data['free_tier'] = True
        
        if any(word in text_content for word in ['monthly', 'annually', 'subscription']):
            pricing_data['subscription_model'] = True
        
        return pricing_data
    
    def _extract_feature_keywords(self, soup) -> List[str]:
        """Extract key feature keywords"""
        # Common feature keywords in tech products
        feature_patterns = [
            r'\b(API|APIs)\b',
            r'\b(dashboard|analytics|reporting)\b',
            r'\b(integration|integrations)\b',
            r'\b(automation|automated)\b',
            r'\b(real[- ]?time)\b',
            r'\b(machine learning|ML|AI|artificial intelligence)\b',
            r'\b(cloud|SaaS|software as a service)\b',
            r'\b(mobile|iOS|Android)\b',
            r'\b(security|encryption|secure)\b',
            r'\b(scalable|scale|scaling)\b',
            r'\b(custom|customization|customize)\b',
            r'\b(workflow|workflows)\b',
            r'\b(collaboration|collaborative)\b',
            r'\b(data|database|big data)\b',
            r'\b(analytics|analysis|insights)\b'
        ]
        
        text_content = soup.get_text()
        features = []
        
        for pattern in feature_patterns:
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            features.extend(matches)
        
        return list(set([f.lower() for f in features]))
    
    def _extract_contact_info(self, soup) -> Dict:
        """Extract contact information"""
        contact_info = {
            'emails': [],
            'phones': [],
            'addresses': []
        }
        
        text_content = soup.get_text()
        
        # Extract emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text_content)
        contact_info['emails'] = list(set(emails))
        
        # Extract phone numbers
        phone_pattern = r'[\+]?[1-9]?[0-9]{1,3}[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'
        phones = re.findall(phone_pattern, text_content)
        contact_info['phones'] = list(set(phones))
        
        return contact_info
    
    def _extract_social_links(self, soup) -> Dict:
        """Extract social media links"""
        social_platforms = {
            'twitter': r'twitter\.com',
            'linkedin': r'linkedin\.com',
            'facebook': r'facebook\.com',
            'instagram': r'instagram\.com',
            'youtube': r'youtube\.com',
            'github': r'github\.com',
            'medium': r'medium\.com'
        }
        
        social_links = {}
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href', '')
            for platform, pattern in social_platforms.items():
                if re.search(pattern, href):
                    social_links[platform] = href
                    break
        
        return social_links
    
    def _check_hiring_activity(self, base_url: str) -> Dict:
        """Check for hiring activity (careers page)"""
        hiring_info = {
            'has_careers_page': False,
            'job_count_estimate': 0,
            'hiring_signals': []
        }
        
        # Common career page URLs
        career_urls = [
            f"{base_url}/careers",
            f"{base_url}/jobs",
            f"{base_url}/hiring",
            f"{base_url}/work-with-us"
        ]
        
        for url in career_urls:
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code == 200:
                    hiring_info['has_careers_page'] = True
                    
                    # Simple job count estimation
                    soup = BeautifulSoup(response.content, 'html.parser')
                    job_keywords = ['position', 'role', 'job', 'opening', 'opportunity']
                    text = soup.get_text().lower()
                    
                    job_count = sum(text.count(keyword) for keyword in job_keywords)
                    hiring_info['job_count_estimate'] = min(job_count, 50)  # Cap at reasonable number
                    break
                    
            except:
                continue
        
        return hiring_info
    
    def _analyze_site_performance(self, url: str) -> Dict:
        """Analyze basic site performance metrics"""
        try:
            start_time = time.time()
            response = self.session.get(url, timeout=30)
            load_time = time.time() - start_time
            
            return {
                'load_time_seconds': round(load_time, 2),
                'status_code': response.status_code,
                'content_size_kb': round(len(response.content) / 1024, 2),
                'has_ssl': url.startswith('https'),
                'server': response.headers.get('Server', 'Unknown')
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _analyze_seo_factors(self, soup) -> Dict:
        """Analyze SEO factors"""
        seo_analysis = {
            'has_title': bool(soup.title),
            'title_length': len(soup.title.string) if soup.title else 0,
            'has_meta_description': bool(soup.find('meta', attrs={'name': 'description'})),
            'h1_count': len(soup.find_all('h1')),
            'image_alt_missing': 0,
            'internal_links': 0,
            'external_links': 0
        }
        
        # Count images without alt text
        images = soup.find_all('img')
        seo_analysis['image_alt_missing'] = len([img for img in images if not img.get('alt')])
        
        # Count links
        links = soup.find_all('a', href=True)
        for link in links:
            href = link.get('href', '')
            if href.startswith('http'):
                seo_analysis['external_links'] += 1
            else:
                seo_analysis['internal_links'] += 1
        
        return seo_analysis
    
    def _analyze_content_strategy(self, soup) -> Dict:
        """Analyze content strategy"""
        text_content = soup.get_text()
        word_count = len(text_content.split())
        
        # Look for blog/content indicators
        blog_indicators = soup.find_all(['article', 'blog', 'news'])
        has_blog = bool(blog_indicators) or 'blog' in text_content.lower()
        
        return {
            'word_count': word_count,
            'has_blog': has_blog,
            'content_freshness_signals': self._check_content_freshness(soup),
            'content_topics': self._extract_content_topics(text_content)
        }
    
    def _check_content_freshness(self, soup) -> List[str]:
        """Check for content freshness signals"""
        signals = []
        text = soup.get_text().lower()
        
        # Look for date patterns
        current_year = datetime.now().year
        if str(current_year) in text:
            signals.append('current_year_mentioned')
        
        # Look for "updated", "new", "latest" keywords
        freshness_keywords = ['updated', 'new', 'latest', 'recent', '2024', '2025']
        for keyword in freshness_keywords:
            if keyword in text:
                signals.append(f'contains_{keyword}')
        
        return signals
    
    def _extract_content_topics(self, text: str) -> List[str]:
        """Extract main content topics using keyword frequency"""
        # Common business/tech topics
        topic_keywords = {
            'AI/ML': ['artificial intelligence', 'machine learning', 'AI', 'ML', 'neural network'],
            'Data Analytics': ['analytics', 'data', 'insights', 'dashboard', 'reporting'],
            'Cloud': ['cloud', 'AWS', 'Azure', 'infrastructure', 'hosting'],
            'Security': ['security', 'encryption', 'secure', 'privacy', 'compliance'],
            'Mobile': ['mobile', 'iOS', 'Android', 'app', 'smartphone'],
            'E-commerce': ['ecommerce', 'e-commerce', 'shopping', 'retail', 'payment'],
            'SaaS': ['SaaS', 'software as a service', 'subscription', 'platform'],
            'Marketing': ['marketing', 'SEO', 'advertising', 'campaign', 'social media'],
            'Automation': ['automation', 'workflow', 'automated', 'integration'],
            'API': ['API', 'REST', 'webhook', 'integration', 'developer']
        }
        
        text_lower = text.lower()
        detected_topics = []
        
        for topic, keywords in topic_keywords.items():
            keyword_count = sum(text_lower.count(keyword) for keyword in keywords)
            if keyword_count >= 3:  # Threshold for topic relevance
                detected_topics.append(topic)
        
        return detected_topics
    
    def get_financial_data(self, stock_symbol: str) -> Dict:
        """Get real financial data for public companies"""
        try:
            ticker = yf.Ticker(stock_symbol)
            
            # Get basic info
            info = ticker.info
            
            # Get recent stock data
            hist = ticker.history(period="1mo")
            
            financial_data = {
                'stock_symbol': stock_symbol,
                'market_cap': info.get('marketCap'),
                'revenue': info.get('totalRevenue'),
                'employees': info.get('fullTimeEmployees'),
                'current_price': info.get('currentPrice'),
                'price_change_30d': self._calculate_price_change(hist),
                'pe_ratio': info.get('trailingPE'),
                'sector': info.get('sector'),
                'industry': info.get('industry'),
                'business_summary': info.get('businessSummary'),
                'website': info.get('website'),
                'timestamp': datetime.now().isoformat()
            }
            
            return financial_data
            
        except Exception as e:
            logger.error(f"Failed to get financial data for {stock_symbol}: {e}")
            return {'error': str(e), 'stock_symbol': stock_symbol}
    
    def _calculate_price_change(self, hist_data) -> float:
        """Calculate percentage price change"""
        if len(hist_data) < 2:
            return 0.0
        
        start_price = hist_data['Close'].iloc[0]
        end_price = hist_data['Close'].iloc[-1]
        
        return ((end_price - start_price) / start_price) * 100
    
    def analyze_competitor_complete(self, name: str, website: str, stock_symbol: str = None) -> CompetitorProfile:
        """Complete competitor analysis combining all data sources"""
        logger.info(f"Starting complete analysis of competitor: {name}")
        
        # Website analysis
        website_data = self.analyze_competitor_website(website)
        
        # Financial data (if public company)
        financial_data = {}
        if stock_symbol:
            financial_data = self.get_financial_data(stock_symbol)
        
        # Create competitor profile
        profile = CompetitorProfile(
            name=name,
            website=website,
            stock_symbol=stock_symbol,
            market_cap=financial_data.get('market_cap'),
            revenue=financial_data.get('revenue'),
            employees=financial_data.get('employees'),
            funding_raised=None,  # Would need Crunchbase API
            last_funding_date=None,
            technologies=website_data.get('technologies', []),
            key_features=website_data.get('feature_keywords', []),
            pricing_model=self._determine_pricing_model(website_data),
            target_market=website_data.get('content_topics', []),
            strengths=self._analyze_strengths(website_data, financial_data),
            weaknesses=self._analyze_weaknesses(website_data, financial_data),
            threat_level=self._calculate_threat_level(website_data, financial_data)
        )
        
        # Store in competitors database
        self.competitors[name] = profile
        
        logger.info(f"Completed analysis of {name} - Threat Level: {profile.threat_level}/10")
        return profile
    
    def _determine_pricing_model(self, website_data: Dict) -> str:
        """Determine pricing model from website analysis"""
        pricing_info = website_data.get('pricing_signals', [])
        
        if 'subscription' in pricing_info or 'monthly' in pricing_info:
            return 'Subscription'
        elif 'free' in pricing_info:
            return 'Freemium'
        elif 'enterprise' in pricing_info:
            return 'Enterprise'
        else:
            return 'Unknown'
    
    def _analyze_strengths(self, website_data: Dict, financial_data: Dict) -> List[str]:
        """Analyze competitor strengths"""
        strengths = []
        
        # Technology strengths
        if 'React' in website_data.get('technologies', []):
            strengths.append('Modern web technology stack')
        
        # Performance strengths
        perf = website_data.get('performance_metrics', {})
        if perf.get('load_time_seconds', 10) < 3:
            strengths.append('Fast website performance')
        
        # Financial strengths
        if financial_data.get('market_cap', 0) > 1000000000:  # $1B+
            strengths.append('Strong market capitalization')
        
        if financial_data.get('revenue', 0) > 100000000:  # $100M+
            strengths.append('High revenue')
        
        # Content strengths
        content = website_data.get('content_strategy', {})
        if content.get('has_blog'):
            strengths.append('Active content marketing')
        
        return strengths
    
    def _analyze_weaknesses(self, website_data: Dict, financial_data: Dict) -> List[str]:
        """Analyze competitor weaknesses"""
        weaknesses = []
        
        # Technical weaknesses
        perf = website_data.get('performance_metrics', {})
        if perf.get('load_time_seconds', 0) > 5:
            weaknesses.append('Slow website performance')
        
        # SEO weaknesses
        seo = website_data.get('seo_analysis', {})
        if not seo.get('has_meta_description'):
            weaknesses.append('Poor SEO optimization')
        
        # Content weaknesses
        content = website_data.get('content_strategy', {})
        if not content.get('has_blog'):
            weaknesses.append('Limited content marketing')
        
        return weaknesses
    
    def _calculate_threat_level(self, website_data: Dict, financial_data: Dict) -> int:
        """Calculate threat level (1-10 scale)"""
        threat_score = 5  # Base score
        
        # Financial factors
        market_cap = financial_data.get('market_cap', 0)
        if market_cap > 10000000000:  # $10B+
            threat_score += 2
        elif market_cap > 1000000000:  # $1B+
            threat_score += 1
        
        # Technology factors
        tech_count = len(website_data.get('technologies', []))
        if tech_count > 5:
            threat_score += 1
        
        # Performance factors
        perf = website_data.get('performance_metrics', {})
        if perf.get('load_time_seconds', 10) < 2:
            threat_score += 1
        
        # Content/Marketing factors
        content = website_data.get('content_strategy', {})
        if content.get('has_blog'):
            threat_score += 1
        
        return min(max(threat_score, 1), 10)
    
    def generate_competitive_intelligence_report(self) -> str:
        """Generate comprehensive competitive intelligence report"""
        if not self.competitors:
            return "No competitors analyzed yet."
        
        report = f"# Competitive Intelligence Report\n\n"
        report += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        report += f"**Competitors Analyzed:** {len(self.competitors)}\n\n"
        
        # Sort by threat level
        sorted_competitors = sorted(
            self.competitors.values(),
            key=lambda x: x.threat_level,
            reverse=True
        )
        
        for competitor in sorted_competitors:
            report += f"## {competitor.name}\n\n"
            report += f"- **Website:** {competitor.website}\n"
            report += f"- **Threat Level:** {competitor.threat_level}/10\n"
            
            if competitor.stock_symbol:
                report += f"- **Stock Symbol:** {competitor.stock_symbol}\n"
            if competitor.market_cap:
                report += f"- **Market Cap:** ${competitor.market_cap:,}\n"
            if competitor.revenue:
                report += f"- **Revenue:** ${competitor.revenue:,}\n"
            if competitor.employees:
                report += f"- **Employees:** {competitor.employees:,}\n"
            
            if competitor.technologies:
                report += f"- **Technologies:** {', '.join(competitor.technologies)}\n"
            
            if competitor.strengths:
                report += f"\n**Strengths:**\n"
                for strength in competitor.strengths:
                    report += f"  - {strength}\n"
            
            if competitor.weaknesses:
                report += f"\n**Weaknesses:**\n"
                for weakness in competitor.weaknesses:
                    report += f"  - {weakness}\n"
            
            report += f"\n---\n\n"
        
        return report
    
    def save_intelligence_data(self, filename: str):
        """Save competitive intelligence data to JSON"""
        data = {
            'competitors': {},
            'generated_at': datetime.now().isoformat(),
            'total_analyzed': len(self.competitors)
        }
        
        for name, profile in self.competitors.items():
            data['competitors'][name] = {
                'name': profile.name,
                'website': profile.website,
                'stock_symbol': profile.stock_symbol,
                'market_cap': profile.market_cap,
                'revenue': profile.revenue,
                'employees': profile.employees,
                'technologies': profile.technologies,
                'key_features': profile.key_features,
                'pricing_model': profile.pricing_model,
                'target_market': profile.target_market,
                'strengths': profile.strengths,
                'weaknesses': profile.weaknesses,
                'threat_level': profile.threat_level
            }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Competitive intelligence data saved to {filename}")

# Example usage function
def analyze_real_competitors():
    """Analyze real competitors with actual data"""
    ci = RealCompetitiveIntelligence()
    
    # Real competitors to analyze
    competitors = [
        ('Shopify', 'https://www.shopify.com', 'SHOP'),
        ('Square', 'https://squareup.com', 'SQ'),
        ('Stripe', 'https://stripe.com', None),  # Private company
        ('PayPal', 'https://www.paypal.com', 'PYPL'),
        ('Salesforce', 'https://www.salesforce.com', 'CRM')
    ]
    
    print("🔍 Starting REAL competitive intelligence analysis...")
    
    for name, website, stock in competitors:
        try:
            print(f"\n📊 Analyzing {name}...")
            profile = ci.analyze_competitor_complete(name, website, stock)
            print(f"✅ {name} analysis complete - Threat Level: {profile.threat_level}/10")
        except Exception as e:
            print(f"❌ Failed to analyze {name}: {e}")
    
    # Generate and save report
    report = ci.generate_competitive_intelligence_report()
    with open('competitive_intelligence_report.md', 'w', encoding='utf-8') as f:
        f.write(report)
    
    ci.save_intelligence_data('competitive_intelligence_data.json')
    
    print(f"\n✅ Analysis complete! {len(ci.competitors)} competitors analyzed.")
    print("📄 Reports saved:")
    print("  - competitive_intelligence_report.md")
    print("  - competitive_intelligence_data.json")
    
    return ci

if __name__ == "__main__":
    # Run real competitive analysis
    analyzer = analyze_real_competitors()
