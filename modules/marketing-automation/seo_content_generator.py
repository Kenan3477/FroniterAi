"""
SEO Content Generator Component
Advanced content generation system with SEO optimization across multiple formats
"""

import asyncio
import re
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import openai
import requests
from datetime import datetime
import logging

from .marketing_automation_module import ContentPiece, ContentFormat, CampaignConfig

logger = logging.getLogger(__name__)

@dataclass
class SEOStrategy:
    """SEO strategy configuration"""
    primary_keywords: List[str]
    secondary_keywords: List[str]
    content_length_targets: Dict[str, int]
    readability_score_target: int
    internal_linking_strategy: str
    meta_optimization: bool
    schema_markup: bool
    featured_snippet_optimization: bool

class SEOContentGenerator:
    """
    Advanced SEO-optimized content generator for multiple formats and channels
    """
    
    def __init__(self, parent_module):
        self.parent = parent_module
        self.openai_client = openai.OpenAI(api_key=parent_module.config.get("openai_api_key"))
        self.content_templates = self._load_content_templates()
        self.seo_tools = SEOTools(parent_module.config)
    
    def _load_content_templates(self) -> Dict[str, Any]:
        """Load content templates for different formats"""
        return {
            "blog_post": {
                "structure": ["introduction", "main_content", "conclusion", "cta"],
                "word_count_range": (800, 2500),
                "seo_elements": ["title_tag", "meta_description", "headers", "internal_links"],
                "content_guidelines": [
                    "Include target keyword in first 100 words",
                    "Use semantic keywords throughout",
                    "Include relevant statistics and data",
                    "Add actionable insights",
                    "Optimize for featured snippets"
                ]
            },
            "social_post": {
                "structure": ["hook", "value", "cta"],
                "character_limits": {
                    "twitter": 280,
                    "facebook": 500,
                    "linkedin": 1300,
                    "instagram": 2200
                },
                "engagement_elements": ["hashtags", "mentions", "questions", "emojis"],
                "content_guidelines": [
                    "Start with attention-grabbing hook",
                    "Include 2-3 relevant hashtags",
                    "End with clear call-to-action",
                    "Use platform-specific formatting"
                ]
            },
            "email_template": {
                "structure": ["subject_line", "preheader", "body", "cta", "footer"],
                "optimization_elements": ["personalization", "urgency", "social_proof"],
                "deliverability_factors": ["sender_reputation", "content_quality", "engagement_rate"],
                "content_guidelines": [
                    "Compelling subject line (30-50 characters)",
                    "Personalize with recipient data",
                    "Single clear call-to-action",
                    "Mobile-optimized design"
                ]
            },
            "ad_copy": {
                "structure": ["headline", "description", "cta"],
                "platform_specs": {
                    "google_ads": {"headline": 30, "description": 90},
                    "facebook_ads": {"headline": 40, "description": 125},
                    "linkedin_ads": {"headline": 150, "description": 600}
                },
                "persuasion_elements": ["value_proposition", "urgency", "social_proof", "benefit_focused"],
                "content_guidelines": [
                    "Lead with strongest benefit",
                    "Include target keyword naturally",
                    "Create urgency without being pushy",
                    "Test multiple variations"
                ]
            },
            "landing_page": {
                "structure": ["hero", "value_proposition", "features", "social_proof", "cta", "faq"],
                "conversion_elements": ["headline", "subheadline", "benefits", "testimonials", "form"],
                "seo_elements": ["title_tag", "meta_description", "structured_data", "page_speed"],
                "content_guidelines": [
                    "Clear value proposition above fold",
                    "Benefit-focused messaging",
                    "Multiple trust signals",
                    "Single conversion goal"
                ]
            }
        }
    
    async def generate_seo_content_suite(
        self,
        topic: str,
        target_keywords: List[str],
        content_formats: List[ContentFormat],
        seo_strategy: Dict[str, Any] = None
    ) -> List[ContentPiece]:
        """Generate comprehensive SEO-optimized content across multiple formats"""
        try:
            logger.info(f"Generating SEO content suite for topic: {topic}")
            
            # Create SEO strategy if not provided
            if seo_strategy is None:
                seo_strategy = await self._create_seo_strategy(topic, target_keywords)
            
            # Perform keyword research and analysis
            keyword_data = await self.seo_tools.analyze_keywords(target_keywords)
            
            # Generate content for each format
            content_pieces = []
            for content_format in content_formats:
                content = await self._generate_format_content(
                    topic=topic,
                    content_format=content_format,
                    keywords=keyword_data,
                    seo_strategy=seo_strategy
                )
                content_pieces.append(content)
            
            # Optimize content for SEO
            optimized_content = []
            for content in content_pieces:
                optimized = await self._optimize_content_seo(content, seo_strategy)
                optimized_content.append(optimized)
            
            logger.info(f"Generated {len(optimized_content)} SEO-optimized content pieces")
            return optimized_content
            
        except Exception as e:
            logger.error(f"Error generating SEO content suite: {e}")
            raise
    
    async def generate_channel_content(
        self,
        channel: str,
        campaign_config: CampaignConfig,
        target_segments: List[str] = None
    ) -> List[ContentPiece]:
        """Generate content optimized for specific marketing channel"""
        try:
            logger.info(f"Generating content for channel: {channel}")
            
            # Determine content formats for channel
            channel_formats = self._get_channel_content_formats(channel)
            
            # Extract keywords from campaign objectives
            target_keywords = await self._extract_campaign_keywords(campaign_config)
            
            # Generate content for each format
            content_pieces = []
            for content_format in channel_formats:
                content = await self._generate_channel_specific_content(
                    channel=channel,
                    content_format=content_format,
                    campaign_config=campaign_config,
                    target_keywords=target_keywords,
                    target_segments=target_segments
                )
                content_pieces.append(content)
            
            return content_pieces
            
        except Exception as e:
            logger.error(f"Error generating channel content: {e}")
            raise
    
    def _get_channel_content_formats(self, channel: str) -> List[ContentFormat]:
        """Get appropriate content formats for marketing channel"""
        channel_formats = {
            "email": [ContentFormat.EMAIL_TEMPLATE],
            "social_media": [ContentFormat.SOCIAL_POST],
            "content_marketing": [ContentFormat.BLOG_POST, ContentFormat.INFOGRAPHIC],
            "paid_advertising": [ContentFormat.AD_COPY, ContentFormat.LANDING_PAGE],
            "seo": [ContentFormat.BLOG_POST, ContentFormat.LANDING_PAGE],
            "influencer": [ContentFormat.SOCIAL_POST, ContentFormat.VIDEO_SCRIPT]
        }
        
        return channel_formats.get(channel, [ContentFormat.BLOG_POST])
    
    async def _extract_campaign_keywords(self, campaign_config: CampaignConfig) -> List[str]:
        """Extract relevant keywords from campaign configuration"""
        keywords = []
        
        # Extract from campaign name
        name_keywords = re.findall(r'\b\w+\b', campaign_config.name.lower())
        keywords.extend(name_keywords)
        
        # Extract from objectives
        objective_keywords = {
            "awareness": ["brand awareness", "visibility", "recognition"],
            "consideration": ["research", "compare", "evaluate"],
            "conversion": ["buy", "purchase", "sign up", "subscribe"],
            "retention": ["loyalty", "repeat", "customer retention"]
        }
        
        for objective in campaign_config.objectives:
            if objective in objective_keywords:
                keywords.extend(objective_keywords[objective])
        
        # Extract from target audience
        if hasattr(campaign_config, 'target_audience'):
            audience_keywords = re.findall(r'\b\w+\b', campaign_config.target_audience.lower())
            keywords.extend(audience_keywords)
        
        return list(set(keywords))  # Remove duplicates
    
    async def _create_seo_strategy(self, topic: str, target_keywords: List[str]) -> Dict[str, Any]:
        """Create comprehensive SEO strategy"""
        # Analyze keyword difficulty and search volume
        keyword_analysis = await self.seo_tools.analyze_keywords(target_keywords)
        
        # Identify semantic keywords
        semantic_keywords = await self.seo_tools.get_semantic_keywords(topic, target_keywords)
        
        # Create content length targets based on competition
        content_lengths = {
            "blog_post": await self._calculate_optimal_length("blog_post", target_keywords),
            "landing_page": await self._calculate_optimal_length("landing_page", target_keywords),
            "social_post": 150,  # Platform-optimized
            "email_template": 200,  # Optimal for engagement
            "ad_copy": 90  # Platform constraints
        }
        
        seo_strategy = {
            "primary_keywords": target_keywords[:3],  # Top 3 keywords
            "secondary_keywords": semantic_keywords[:10],
            "content_length_targets": content_lengths,
            "readability_score_target": 70,  # Flesch reading ease
            "internal_linking_strategy": "topic_clusters",
            "meta_optimization": True,
            "schema_markup": True,
            "featured_snippet_optimization": True,
            "keyword_density_target": 1.5,  # 1.5% keyword density
            "semantic_coverage": 80  # 80% semantic keyword coverage
        }
        
        return seo_strategy
    
    async def _calculate_optimal_length(self, content_type: str, keywords: List[str]) -> int:
        """Calculate optimal content length based on competitor analysis"""
        # Simulate competitor analysis
        # In real implementation, this would analyze top-ranking pages
        
        base_lengths = {
            "blog_post": 1500,
            "landing_page": 800,
            "social_post": 150,
            "email_template": 200,
            "ad_copy": 90
        }
        
        # Adjust based on keyword competitiveness
        keyword_competitiveness = len(keywords) * 100  # Simplified calculation
        adjustment_factor = min(keyword_competitiveness / 1000, 0.5)  # Max 50% increase
        
        optimal_length = int(base_lengths.get(content_type, 800) * (1 + adjustment_factor))
        return optimal_length
    
    async def _generate_format_content(
        self,
        topic: str,
        content_format: ContentFormat,
        keywords: Dict[str, Any],
        seo_strategy: Dict[str, Any]
    ) -> ContentPiece:
        """Generate content for specific format with SEO optimization"""
        
        # Get template for content format
        template = self.content_templates.get(content_format.value, {})
        
        # Create content prompt
        prompt = await self._create_content_prompt(
            topic=topic,
            content_format=content_format,
            keywords=keywords,
            template=template,
            seo_strategy=seo_strategy
        )
        
        # Generate content using OpenAI
        response = await self._call_openai_api(prompt, content_format)
        
        # Parse and structure content
        structured_content = await self._structure_content(response, content_format, template)
        
        # Calculate SEO score
        seo_score = await self._calculate_seo_score(structured_content, keywords, seo_strategy)
        
        # Create ContentPiece object
        content_piece = ContentPiece(
            id="",  # Will be generated in __post_init__
            title=structured_content.get("title", f"{topic} - {content_format.value}"),
            content=structured_content.get("content", ""),
            format=content_format,
            target_keywords=keywords.get("primary_keywords", []),
            platform="multi-platform",
            campaign_id="",  # Will be set by campaign manager
            seo_score=seo_score
        )
        
        return content_piece
    
    async def _generate_channel_specific_content(
        self,
        channel: str,
        content_format: ContentFormat,
        campaign_config: CampaignConfig,
        target_keywords: List[str],
        target_segments: List[str] = None
    ) -> ContentPiece:
        """Generate content specific to marketing channel"""
        
        # Create channel-specific prompt
        prompt = f"""
        Create {content_format.value} content for {channel} marketing channel.
        
        Campaign: {campaign_config.name}
        Objectives: {', '.join(campaign_config.objectives)}
        Target Audience: {campaign_config.target_audience}
        Keywords: {', '.join(target_keywords[:5])}
        
        Channel Requirements:
        {self._get_channel_requirements(channel)}
        
        Content should be:
        1. Optimized for {channel} best practices
        2. Aligned with campaign objectives
        3. Include target keywords naturally
        4. Match brand voice and tone
        5. Include clear call-to-action
        
        Generate high-converting {content_format.value} content.
        """
        
        # Generate content
        response = await self._call_openai_api(prompt, content_format)
        
        # Create ContentPiece
        content_piece = ContentPiece(
            id="",
            title=f"{campaign_config.name} - {channel} {content_format.value}",
            content=response,
            format=content_format,
            target_keywords=target_keywords[:3],
            platform=channel,
            campaign_id=""
        )
        
        return content_piece
    
    def _get_channel_requirements(self, channel: str) -> str:
        """Get specific requirements for marketing channel"""
        requirements = {
            "email": "- Subject line optimization\n- Personalization\n- Mobile-friendly design\n- Clear CTA button",
            "social_media": "- Platform-specific formatting\n- Hashtag optimization\n- Visual content ready\n- Engagement-focused",
            "content_marketing": "- SEO optimization\n- Educational value\n- Shareable format\n- Authority building",
            "paid_advertising": "- Conversion-focused\n- Benefit-driven headlines\n- Urgency creation\n- Split-test ready",
            "seo": "- Keyword optimization\n- Featured snippet targeting\n- Internal linking opportunities\n- Schema markup ready"
        }
        
        return requirements.get(channel, "- High-quality, engaging content\n- Clear value proposition\n- Professional tone")
    
    async def _create_content_prompt(
        self,
        topic: str,
        content_format: ContentFormat,
        keywords: Dict[str, Any],
        template: Dict[str, Any],
        seo_strategy: Dict[str, Any]
    ) -> str:
        """Create comprehensive prompt for content generation"""
        
        prompt = f"""
        Create high-quality {content_format.value} content about: {topic}
        
        SEO Requirements:
        - Primary Keywords: {', '.join(seo_strategy.get('primary_keywords', []))}
        - Secondary Keywords: {', '.join(seo_strategy.get('secondary_keywords', [])[:5])}
        - Target Length: {seo_strategy.get('content_length_targets', {}).get(content_format.value, 800)} words
        - Readability Target: {seo_strategy.get('readability_score_target', 70)} Flesch score
        
        Content Structure: {template.get('structure', [])}
        
        Content Guidelines:
        {chr(10).join(f"- {guideline}" for guideline in template.get('content_guidelines', []))}
        
        SEO Optimization:
        - Include primary keyword in title and first paragraph
        - Use semantic keywords naturally throughout
        - Create engaging meta description (150-160 characters)
        - Structure with appropriate headers (H1, H2, H3)
        - Include internal linking opportunities
        - Optimize for featured snippets where applicable
        
        Generate comprehensive, SEO-optimized {content_format.value} content.
        """
        
        return prompt
    
    async def _call_openai_api(self, prompt: str, content_format: ContentFormat) -> str:
        """Call OpenAI API to generate content"""
        try:
            # Adjust parameters based on content format
            max_tokens = self._get_max_tokens_for_format(content_format)
            temperature = self._get_temperature_for_format(content_format)
            
            response = self.openai_client.chat.completions.create(
                model=self.parent.config.get("content_generation_model", "gpt-4"),
                messages=[
                    {"role": "system", "content": "You are an expert marketing content creator and SEO specialist."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return f"Error generating content: {e}"
    
    def _get_max_tokens_for_format(self, content_format: ContentFormat) -> int:
        """Get appropriate max tokens for content format"""
        token_limits = {
            ContentFormat.BLOG_POST: 3000,
            ContentFormat.SOCIAL_POST: 200,
            ContentFormat.EMAIL_TEMPLATE: 800,
            ContentFormat.AD_COPY: 300,
            ContentFormat.LANDING_PAGE: 2000,
            ContentFormat.VIDEO_SCRIPT: 1500,
            ContentFormat.INFOGRAPHIC: 500
        }
        
        return token_limits.get(content_format, 1000)
    
    def _get_temperature_for_format(self, content_format: ContentFormat) -> float:
        """Get appropriate temperature for content format"""
        # Lower temperature for more factual/structured content
        # Higher temperature for creative content
        
        temperatures = {
            ContentFormat.BLOG_POST: 0.7,
            ContentFormat.SOCIAL_POST: 0.8,
            ContentFormat.EMAIL_TEMPLATE: 0.6,
            ContentFormat.AD_COPY: 0.9,
            ContentFormat.LANDING_PAGE: 0.6,
            ContentFormat.VIDEO_SCRIPT: 0.8,
            ContentFormat.INFOGRAPHIC: 0.5
        }
        
        return temperatures.get(content_format, 0.7)
    
    async def _structure_content(
        self,
        raw_content: str,
        content_format: ContentFormat,
        template: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Structure raw content according to format template"""
        
        structured = {
            "content": raw_content,
            "format": content_format.value
        }
        
        # Extract title if present
        title_match = re.search(r'^#?\s*(.+)$', raw_content, re.MULTILINE)
        if title_match:
            structured["title"] = title_match.group(1).strip()
        
        # Extract meta description for SEO content
        if content_format in [ContentFormat.BLOG_POST, ContentFormat.LANDING_PAGE]:
            meta_match = re.search(r'Meta Description:\s*(.+)', raw_content, re.IGNORECASE)
            if meta_match:
                structured["meta_description"] = meta_match.group(1).strip()
        
        # Extract headers for structured content
        headers = re.findall(r'^#{1,6}\s*(.+)$', raw_content, re.MULTILINE)
        if headers:
            structured["headers"] = headers
        
        return structured
    
    async def _optimize_content_seo(
        self,
        content_piece: ContentPiece,
        seo_strategy: Dict[str, Any]
    ) -> ContentPiece:
        """Optimize content piece for SEO"""
        
        # Analyze current SEO elements
        seo_analysis = await self.seo_tools.analyze_content_seo(content_piece.content, seo_strategy)
        
        # Apply optimizations
        optimized_content = content_piece.content
        
        # Keyword density optimization
        if seo_analysis.get("keyword_density", 0) < seo_strategy.get("keyword_density_target", 1.5):
            optimized_content = await self._optimize_keyword_density(
                optimized_content,
                content_piece.target_keywords,
                seo_strategy.get("keyword_density_target", 1.5)
            )
        
        # Readability optimization
        if seo_analysis.get("readability_score", 0) < seo_strategy.get("readability_score_target", 70):
            optimized_content = await self._optimize_readability(optimized_content)
        
        # Update content and SEO score
        content_piece.content = optimized_content
        content_piece.seo_score = await self._calculate_seo_score(
            {"content": optimized_content},
            {"primary_keywords": content_piece.target_keywords},
            seo_strategy
        )
        
        return content_piece
    
    async def _optimize_keyword_density(
        self,
        content: str,
        keywords: List[str],
        target_density: float
    ) -> str:
        """Optimize keyword density in content"""
        # Simple keyword density optimization
        # In real implementation, this would use more sophisticated NLP
        
        words = content.split()
        total_words = len(words)
        
        for keyword in keywords:
            current_count = content.lower().count(keyword.lower())
            target_count = int((target_density / 100) * total_words)
            
            if current_count < target_count:
                # Add keyword naturally in a few places
                insertions_needed = min(target_count - current_count, 3)
                for _ in range(insertions_needed):
                    # Find good insertion points (after periods)
                    sentences = content.split('.')
                    if len(sentences) > 2:
                        mid_sentence = len(sentences) // 2
                        sentences[mid_sentence] += f" {keyword}"
                        content = '.'.join(sentences)
        
        return content
    
    async def _optimize_readability(self, content: str) -> str:
        """Optimize content readability"""
        # Simple readability optimization
        # Replace complex words with simpler alternatives
        
        replacements = {
            "utilize": "use",
            "demonstrate": "show",
            "implement": "use",
            "facilitate": "help",
            "numerous": "many",
            "approximately": "about"
        }
        
        optimized_content = content
        for complex_word, simple_word in replacements.items():
            optimized_content = re.sub(
                r'\b' + complex_word + r'\b',
                simple_word,
                optimized_content,
                flags=re.IGNORECASE
            )
        
        return optimized_content
    
    async def _calculate_seo_score(
        self,
        content_data: Dict[str, Any],
        keywords: Dict[str, Any],
        seo_strategy: Dict[str, Any]
    ) -> float:
        """Calculate SEO score for content"""
        score = 0.0
        max_score = 100.0
        
        content = content_data.get("content", "")
        primary_keywords = keywords.get("primary_keywords", [])
        
        # Keyword presence (20 points)
        if primary_keywords:
            keyword_score = 0
            for keyword in primary_keywords:
                if keyword.lower() in content.lower():
                    keyword_score += 20 / len(primary_keywords)
            score += keyword_score
        
        # Content length (15 points)
        word_count = len(content.split())
        target_length = seo_strategy.get("content_length_targets", {}).get("blog_post", 1500)
        
        if 0.8 * target_length <= word_count <= 1.2 * target_length:
            score += 15
        elif 0.6 * target_length <= word_count <= 1.4 * target_length:
            score += 10
        elif word_count >= 0.4 * target_length:
            score += 5
        
        # Header structure (15 points)
        headers = content_data.get("headers", [])
        if headers:
            score += min(len(headers) * 3, 15)
        
        # Readability (20 points)
        # Simplified readability calculation
        sentences = content.count('.') + content.count('!') + content.count('?')
        if sentences > 0:
            avg_sentence_length = word_count / sentences
            if 15 <= avg_sentence_length <= 25:  # Good readability
                score += 20
            elif 10 <= avg_sentence_length <= 30:
                score += 15
            elif avg_sentence_length <= 35:
                score += 10
        
        # Meta description (10 points)
        meta_desc = content_data.get("meta_description", "")
        if 150 <= len(meta_desc) <= 160:
            score += 10
        elif 120 <= len(meta_desc) <= 180:
            score += 7
        
        # Internal linking opportunities (10 points)
        # Count potential internal link anchors
        link_opportunities = len(re.findall(r'\b(learn more|read more|discover|explore)\b', content, re.IGNORECASE))
        score += min(link_opportunities * 2, 10)
        
        # Keyword density (10 points)
        if primary_keywords:
            total_keyword_mentions = sum(content.lower().count(kw.lower()) for kw in primary_keywords)
            keyword_density = (total_keyword_mentions / word_count) * 100
            target_density = seo_strategy.get("keyword_density_target", 1.5)
            
            if abs(keyword_density - target_density) <= 0.5:
                score += 10
            elif abs(keyword_density - target_density) <= 1.0:
                score += 7
            elif abs(keyword_density - target_density) <= 1.5:
                score += 5
        
        return min(score, max_score)


class SEOTools:
    """SEO analysis and optimization tools"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    async def analyze_keywords(self, keywords: List[str]) -> Dict[str, Any]:
        """Analyze keywords for SEO potential"""
        # In real implementation, this would use tools like SEMrush, Ahrefs API
        
        keyword_data = {
            "primary_keywords": keywords[:3],
            "keyword_metrics": {},
            "competition_analysis": {},
            "search_intent": {}
        }
        
        for keyword in keywords:
            keyword_data["keyword_metrics"][keyword] = {
                "search_volume": self._estimate_search_volume(keyword),
                "difficulty": self._estimate_difficulty(keyword),
                "cpc": self._estimate_cpc(keyword),
                "intent": self._determine_search_intent(keyword)
            }
        
        return keyword_data
    
    async def get_semantic_keywords(self, topic: str, primary_keywords: List[str]) -> List[str]:
        """Get semantic keywords related to topic and primary keywords"""
        # Simplified semantic keyword generation
        semantic_keywords = []
        
        # Add related terms based on topic
        topic_related = {
            "marketing": ["advertising", "promotion", "branding", "campaigns", "strategy"],
            "business": ["enterprise", "company", "organization", "commercial", "professional"],
            "technology": ["software", "digital", "innovation", "automation", "solutions"],
            "content": ["articles", "blogs", "writing", "copywriting", "editorial"]
        }
        
        for topic_word in topic.lower().split():
            if topic_word in topic_related:
                semantic_keywords.extend(topic_related[topic_word])
        
        # Add variations of primary keywords
        for keyword in primary_keywords:
            variations = [
                f"{keyword} strategy",
                f"{keyword} tips",
                f"best {keyword}",
                f"{keyword} guide",
                f"how to {keyword}"
            ]
            semantic_keywords.extend(variations)
        
        return list(set(semantic_keywords))[:20]  # Return unique keywords, max 20
    
    async def analyze_content_seo(self, content: str, seo_strategy: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze content for SEO factors"""
        word_count = len(content.split())
        
        analysis = {
            "word_count": word_count,
            "keyword_density": self._calculate_keyword_density(content, seo_strategy.get("primary_keywords", [])),
            "readability_score": self._calculate_readability_score(content),
            "header_structure": self._analyze_header_structure(content),
            "internal_link_opportunities": self._find_internal_link_opportunities(content),
            "meta_elements": self._analyze_meta_elements(content)
        }
        
        return analysis
    
    def _estimate_search_volume(self, keyword: str) -> int:
        """Estimate search volume for keyword"""
        # Simplified estimation based on keyword length and common terms
        base_volume = 1000
        
        # Longer keywords typically have lower volume
        length_factor = max(0.1, 1 - (len(keyword.split()) - 1) * 0.3)
        
        # Common terms have higher volume
        common_terms = ["marketing", "business", "content", "strategy", "tips"]
        common_factor = 1.5 if any(term in keyword.lower() for term in common_terms) else 1.0
        
        estimated_volume = int(base_volume * length_factor * common_factor)
        return max(100, estimated_volume)
    
    def _estimate_difficulty(self, keyword: str) -> int:
        """Estimate keyword difficulty (0-100)"""
        # Simplified difficulty estimation
        base_difficulty = 50
        
        # Shorter keywords are typically more difficult
        length_factor = max(0.5, len(keyword.split()) * 0.2)
        
        # Commercial keywords are more difficult
        commercial_terms = ["buy", "best", "review", "price", "cheap", "software"]
        commercial_factor = 1.3 if any(term in keyword.lower() for term in commercial_terms) else 1.0
        
        difficulty = int(base_difficulty / length_factor * commercial_factor)
        return min(100, max(10, difficulty))
    
    def _estimate_cpc(self, keyword: str) -> float:
        """Estimate cost-per-click for keyword"""
        # Simplified CPC estimation
        base_cpc = 1.50
        
        # Commercial intent keywords have higher CPC
        commercial_terms = ["buy", "software", "service", "solution", "tool"]
        commercial_factor = 2.0 if any(term in keyword.lower() for term in commercial_terms) else 1.0
        
        # Business terms have higher CPC
        business_terms = ["enterprise", "professional", "business", "corporate"]
        business_factor = 1.5 if any(term in keyword.lower() for term in business_terms) else 1.0
        
        estimated_cpc = base_cpc * commercial_factor * business_factor
        return round(estimated_cpc, 2)
    
    def _determine_search_intent(self, keyword: str) -> str:
        """Determine search intent for keyword"""
        keyword_lower = keyword.lower()
        
        # Informational intent
        info_signals = ["how", "what", "why", "guide", "tips", "tutorial"]
        if any(signal in keyword_lower for signal in info_signals):
            return "informational"
        
        # Commercial intent
        commercial_signals = ["best", "review", "compare", "vs", "alternative"]
        if any(signal in keyword_lower for signal in commercial_signals):
            return "commercial"
        
        # Transactional intent
        transactional_signals = ["buy", "purchase", "order", "download", "signup"]
        if any(signal in keyword_lower for signal in transactional_signals):
            return "transactional"
        
        # Navigational intent
        if len(keyword.split()) == 1 and keyword.istitle():
            return "navigational"
        
        return "informational"  # Default
    
    def _calculate_keyword_density(self, content: str, keywords: List[str]) -> float:
        """Calculate keyword density in content"""
        if not keywords:
            return 0.0
        
        word_count = len(content.split())
        total_keyword_mentions = sum(content.lower().count(kw.lower()) for kw in keywords)
        
        density = (total_keyword_mentions / word_count) * 100
        return round(density, 2)
    
    def _calculate_readability_score(self, content: str) -> float:
        """Calculate simplified readability score"""
        sentences = content.count('.') + content.count('!') + content.count('?')
        words = len(content.split())
        
        if sentences == 0:
            return 0.0
        
        avg_sentence_length = words / sentences
        
        # Simplified Flesch reading ease approximation
        # Ideal range: 60-70 (standard), 70-80 (fairly easy)
        
        if avg_sentence_length <= 15:
            score = 80  # Easy to read
        elif avg_sentence_length <= 20:
            score = 70  # Fairly easy
        elif avg_sentence_length <= 25:
            score = 60  # Standard
        elif avg_sentence_length <= 30:
            score = 50  # Fairly difficult
        else:
            score = 40  # Difficult
        
        return score
    
    def _analyze_header_structure(self, content: str) -> Dict[str, Any]:
        """Analyze header structure in content"""
        headers = {
            "h1": len(re.findall(r'^#\s', content, re.MULTILINE)),
            "h2": len(re.findall(r'^##\s', content, re.MULTILINE)),
            "h3": len(re.findall(r'^###\s', content, re.MULTILINE)),
            "h4": len(re.findall(r'^####\s', content, re.MULTILINE))
        }
        
        total_headers = sum(headers.values())
        
        return {
            "headers": headers,
            "total_headers": total_headers,
            "structure_score": min(total_headers * 2, 10)  # Max 10 points
        }
    
    def _find_internal_link_opportunities(self, content: str) -> List[str]:
        """Find opportunities for internal linking"""
        # Look for phrases that could be internal links
        link_phrases = re.findall(
            r'\b(learn more about|read our guide|see our|check out|explore our|discover)\s+([^.!?]{1,50})',
            content,
            re.IGNORECASE
        )
        
        opportunities = [phrase[1].strip() for phrase in link_phrases]
        return opportunities
    
    def _analyze_meta_elements(self, content: str) -> Dict[str, Any]:
        """Analyze meta elements in content"""
        meta_analysis = {
            "title_tag": None,
            "meta_description": None,
            "has_title": False,
            "has_meta_desc": False
        }
        
        # Look for title
        title_match = re.search(r'^#?\s*(.+)$', content, re.MULTILINE)
        if title_match:
            meta_analysis["title_tag"] = title_match.group(1).strip()
            meta_analysis["has_title"] = True
        
        # Look for meta description
        meta_match = re.search(r'Meta Description:\s*(.+)', content, re.IGNORECASE)
        if meta_match:
            meta_analysis["meta_description"] = meta_match.group(1).strip()
            meta_analysis["has_meta_desc"] = True
        
        return meta_analysis
