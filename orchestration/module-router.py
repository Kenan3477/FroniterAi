"""
Frontier Module Router
Advanced AI module orchestration system with intelligent routing and fallback mechanisms
"""

import asyncio
import json
import logging
import time
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple, Union
from abc import ABC, abstractmethod
import numpy as np
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModuleType(Enum):
    """Enumeration of available specialized modules"""
    FOUNDATION = "foundation"
    BUSINESS = "business"
    DEVELOPMENT = "development"
    CREATIVE = "creative"
    MULTIMODAL = "multimodal"

class QueryType(Enum):
    """Classification of query types for routing decisions"""
    TEXT_GENERATION = "text_generation"
    CODE_GENERATION = "code_generation"
    BUSINESS_ANALYSIS = "business_analysis"
    CREATIVE_CONTENT = "creative_content"
    IMAGE_PROCESSING = "image_processing"
    AUDIO_PROCESSING = "audio_processing"
    VIDEO_PROCESSING = "video_processing"
    MULTIMODAL = "multimodal"
    GENERAL = "general"

@dataclass
class ModuleRequest:
    """Standardized request format for module communication"""
    query_id: str
    user_id: str
    query_text: str
    query_type: QueryType
    context: Dict[str, Any]
    parameters: Dict[str, Any]
    timestamp: datetime
    priority: int = 1  # 1=low, 5=high
    timeout: float = 30.0
    metadata: Dict[str, Any] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert request to dictionary for serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['query_type'] = self.query_type.value
        return data

@dataclass
class ModuleResponse:
    """Standardized response format from modules"""
    query_id: str
    module_type: ModuleType
    content: Any
    confidence_score: float  # 0.0 to 1.0
    processing_time: float
    token_count: int
    quality_metrics: Dict[str, float]
    metadata: Dict[str, Any]
    timestamp: datetime
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary for serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['module_type'] = self.module_type.value
        return data

class ConfidenceScorer:
    """Advanced confidence scoring system for module responses"""
    
    def __init__(self):
        self.quality_weights = {
            'relevance': 0.25,
            'coherence': 0.20,
            'accuracy': 0.20,
            'completeness': 0.15,
            'safety': 0.10,
            'performance': 0.10
        }
        
        # Historical performance tracking
        self.module_performance_history = {}
        self.query_type_performance = {}
    
    def calculate_confidence(self, response: ModuleResponse, 
                           historical_data: Dict[str, Any]) -> float:
        """Calculate comprehensive confidence score"""
        
        # Base confidence from module's self-assessment
        base_confidence = response.confidence_score
        
        # Quality metrics assessment
        quality_score = self._assess_quality_metrics(response.quality_metrics)
        
        # Historical performance adjustment
        historical_modifier = self._get_historical_modifier(
            response.module_type, response.query_id
        )
        
        # Processing time factor (faster often means more confident)
        time_factor = self._calculate_time_factor(response.processing_time)
        
        # Content length and complexity assessment
        content_factor = self._assess_content_quality(response.content)
        
        # Weighted final confidence score
        final_confidence = (
            base_confidence * 0.30 +
            quality_score * 0.25 +
            historical_modifier * 0.20 +
            time_factor * 0.15 +
            content_factor * 0.10
        )
        
        return min(max(final_confidence, 0.0), 1.0)
    
    def _assess_quality_metrics(self, metrics: Dict[str, float]) -> float:
        """Assess quality based on provided metrics"""
        if not metrics:
            return 0.5  # Neutral score if no metrics
        
        weighted_score = 0.0
        total_weight = 0.0
        
        for metric, value in metrics.items():
            if metric in self.quality_weights:
                weight = self.quality_weights[metric]
                weighted_score += value * weight
                total_weight += weight
        
        return weighted_score / total_weight if total_weight > 0 else 0.5
    
    def _get_historical_modifier(self, module_type: ModuleType, 
                                query_id: str) -> float:
        """Get historical performance modifier"""
        module_key = module_type.value
        
        if module_key not in self.module_performance_history:
            return 1.0  # Neutral for new modules
        
        history = self.module_performance_history[module_key]
        if len(history) < 5:
            return 1.0  # Need minimum samples
        
        # Calculate rolling average of recent performance
        recent_scores = history[-10:]  # Last 10 responses
        avg_performance = sum(recent_scores) / len(recent_scores)
        
        # Convert to modifier (0.8 to 1.2 range)
        return 0.8 + (avg_performance * 0.4)
    
    def _calculate_time_factor(self, processing_time: float) -> float:
        """Calculate confidence factor based on processing time"""
        # Optimal time ranges by response complexity
        if processing_time < 0.1:
            return 0.7  # Too fast might indicate cached/simple response
        elif processing_time < 2.0:
            return 1.0  # Optimal range
        elif processing_time < 10.0:
            return 0.9  # Acceptable
        else:
            return 0.6  # Slow processing might indicate issues
    
    def _assess_content_quality(self, content: Any) -> float:
        """Assess content quality and completeness"""
        if isinstance(content, str):
            # Text content assessment
            length = len(content)
            if length < 10:
                return 0.3  # Too short
            elif length < 100:
                return 0.7  # Short but potentially complete
            elif length < 1000:
                return 1.0  # Good length
            else:
                return 0.9  # Long content, potentially good
        
        elif isinstance(content, dict):
            # Structured content assessment
            if len(content) > 3:
                return 0.9  # Rich structured response
            else:
                return 0.7
        
        return 0.8  # Default for other content types

class ModuleInterface(ABC):
    """Abstract base class for all specialized modules"""
    
    @abstractmethod
    async def process_request(self, request: ModuleRequest) -> ModuleResponse:
        """Process a module request and return response"""
        pass
    
    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Return module health status"""
        pass
    
    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        """Return module capabilities and specifications"""
        pass

class QueryClassifier:
    """Intelligent query classification for optimal routing"""
    
    def __init__(self):
        self.classification_patterns = {
            QueryType.CODE_GENERATION: [
                "write code", "implement", "function", "class", "api",
                "database", "frontend", "backend", "debug", "optimize",
                "python", "javascript", "react", "sql", "docker"
            ],
            QueryType.BUSINESS_ANALYSIS: [
                "financial", "revenue", "market", "analysis", "strategy",
                "roi", "profit", "cost", "budget", "forecast", "kpi",
                "metrics", "performance", "competition", "swot"
            ],
            QueryType.CREATIVE_CONTENT: [
                "write", "create", "design", "marketing", "campaign",
                "copy", "brand", "social media", "advertisement", "story",
                "blog", "creative", "content", "slogan", "pitch"
            ],
            QueryType.MULTIMODAL: [
                "image", "picture", "photo", "video", "audio", "sound",
                "visual", "draw", "generate image", "edit photo"
            ]
        }
        
        # Weight factors for different classification signals
        self.keyword_weight = 0.4
        self.context_weight = 0.3
        self.user_history_weight = 0.2
        self.metadata_weight = 0.1
    
    def classify_query(self, request: ModuleRequest, 
                      user_history: List[Dict] = None) -> QueryType:
        """Classify query type using multiple signals"""
        
        query_lower = request.query_text.lower()
        scores = {qt: 0.0 for qt in QueryType}
        
        # Keyword-based scoring
        for query_type, keywords in self.classification_patterns.items():
            keyword_score = sum(1 for keyword in keywords if keyword in query_lower)
            keyword_score = keyword_score / len(keywords)  # Normalize
            scores[query_type] += keyword_score * self.keyword_weight
        
        # Context-based scoring
        context_signals = request.context or {}
        if 'domain' in context_signals:
            domain = context_signals['domain'].lower()
            if domain in ['business', 'finance']:
                scores[QueryType.BUSINESS_ANALYSIS] += self.context_weight
            elif domain in ['development', 'programming']:
                scores[QueryType.CODE_GENERATION] += self.context_weight
            elif domain in ['marketing', 'creative']:
                scores[QueryType.CREATIVE_CONTENT] += self.context_weight
        
        # User history analysis
        if user_history:
            recent_types = [h.get('query_type') for h in user_history[-5:]]
            for qt in recent_types:
                if qt and qt in scores:
                    scores[QueryType(qt)] += self.user_history_weight / 5
        
        # Metadata signals
        if request.metadata:
            if 'attachments' in request.metadata:
                attachments = request.metadata['attachments']
                if any(att.get('type') in ['image', 'video', 'audio'] 
                      for att in attachments):
                    scores[QueryType.MULTIMODAL] += self.metadata_weight
        
        # Return highest scoring query type
        best_type = max(scores.items(), key=lambda x: x[1])
        
        # If no clear classification, return GENERAL
        if best_type[1] < 0.1:
            return QueryType.GENERAL
        
        return best_type[0]

class FallbackManager:
    """Manages fallback strategies when modules fail or underperform"""
    
    def __init__(self, confidence_threshold: float = 0.6):
        self.confidence_threshold = confidence_threshold
        self.fallback_chains = {
            ModuleType.BUSINESS: [ModuleType.FOUNDATION],
            ModuleType.DEVELOPMENT: [ModuleType.FOUNDATION],
            ModuleType.CREATIVE: [ModuleType.FOUNDATION],
            ModuleType.MULTIMODAL: [ModuleType.FOUNDATION]
        }
        
        # Track fallback usage for optimization
        self.fallback_history = {}
    
    def should_fallback(self, response: ModuleResponse) -> bool:
        """Determine if fallback is needed based on response quality"""
        if response.error:
            return True
        
        if response.confidence_score < self.confidence_threshold:
            return True
        
        # Check processing time (timeout scenarios)
        if response.processing_time > 30.0:
            return True
        
        return False
    
    def get_fallback_modules(self, failed_module: ModuleType) -> List[ModuleType]:
        """Get ordered list of fallback modules"""
        return self.fallback_chains.get(failed_module, [ModuleType.FOUNDATION])
    
    def update_fallback_stats(self, original_module: ModuleType, 
                            fallback_module: ModuleType, success: bool):
        """Update fallback statistics for optimization"""
        key = f"{original_module.value}->{fallback_module.value}"
        
        if key not in self.fallback_history:
            self.fallback_history[key] = {'attempts': 0, 'successes': 0}
        
        self.fallback_history[key]['attempts'] += 1
        if success:
            self.fallback_history[key]['successes'] += 1

class ModuleRouter:
    """Main orchestration system for routing queries to appropriate modules"""
    
    def __init__(self):
        self.modules: Dict[ModuleType, ModuleInterface] = {}
        self.classifier = QueryClassifier()
        self.confidence_scorer = ConfidenceScorer()
        self.fallback_manager = FallbackManager()
        
        # Performance tracking
        self.request_history = []
        self.module_stats = {mt: {'requests': 0, 'avg_confidence': 0.0, 
                                'avg_time': 0.0} for mt in ModuleType}
        
        # Dynamic loading configuration
        self.auto_load_modules = True
        self.module_load_threshold = 10  # Load module after 10 similar requests
        
        logger.info("Module Router initialized")
    
    def register_module(self, module_type: ModuleType, module: ModuleInterface):
        """Register a specialized module with the router"""
        self.modules[module_type] = module
        logger.info(f"Registered module: {module_type.value}")
    
    async def route_query(self, request: ModuleRequest) -> ModuleResponse:
        """Main routing method - orchestrates the entire process"""
        start_time = time.time()
        
        try:
            # 1. Classify the query
            query_type = self.classifier.classify_query(request)
            logger.info(f"Query {request.query_id} classified as: {query_type.value}")
            
            # 2. Determine target module
            target_module = self._select_target_module(query_type, request)
            
            # 3. Dynamic module loading if needed
            if target_module not in self.modules and self.auto_load_modules:
                await self._load_module_dynamically(target_module)
            
            # 4. Process with primary module
            response = await self._process_with_module(target_module, request)
            
            # 5. Evaluate response quality
            confidence = self.confidence_scorer.calculate_confidence(
                response, self._get_historical_data(target_module)
            )
            response.confidence_score = confidence
            
            # 6. Handle fallback if needed
            if self.fallback_manager.should_fallback(response):
                response = await self._handle_fallback(request, target_module, response)
            
            # 7. Update statistics
            self._update_statistics(target_module, response)
            
            # 8. Log the transaction
            processing_time = time.time() - start_time
            logger.info(f"Query {request.query_id} completed in {processing_time:.2f}s "
                       f"with confidence {response.confidence_score:.2f}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error routing query {request.query_id}: {str(e)}")
            return ModuleResponse(
                query_id=request.query_id,
                module_type=ModuleType.FOUNDATION,
                content=f"Error processing request: {str(e)}",
                confidence_score=0.0,
                processing_time=time.time() - start_time,
                token_count=0,
                quality_metrics={},
                metadata={'error': True},
                timestamp=datetime.utcnow(),
                error=str(e)
            )
    
    def _select_target_module(self, query_type: QueryType, 
                            request: ModuleRequest) -> ModuleType:
        """Select the most appropriate module for the query type"""
        
        # Direct mapping for most query types
        type_to_module = {
            QueryType.CODE_GENERATION: ModuleType.DEVELOPMENT,
            QueryType.BUSINESS_ANALYSIS: ModuleType.BUSINESS,
            QueryType.CREATIVE_CONTENT: ModuleType.CREATIVE,
            QueryType.IMAGE_PROCESSING: ModuleType.MULTIMODAL,
            QueryType.AUDIO_PROCESSING: ModuleType.MULTIMODAL,
            QueryType.VIDEO_PROCESSING: ModuleType.MULTIMODAL,
            QueryType.MULTIMODAL: ModuleType.MULTIMODAL
        }
        
        if query_type in type_to_module:
            return type_to_module[query_type]
        
        # For general or unclear queries, check context and user preferences
        context = request.context or {}
        if 'preferred_module' in context:
            try:
                return ModuleType(context['preferred_module'])
            except ValueError:
                pass
        
        # Default to foundation model
        return ModuleType.FOUNDATION
    
    async def _load_module_dynamically(self, module_type: ModuleType):
        """Dynamically load a module based on demand"""
        logger.info(f"Attempting dynamic load of module: {module_type.value}")
        
        # This would integrate with your module loading system
        # For now, we'll simulate the loading process
        try:
            # Simulate module loading delay
            await asyncio.sleep(0.1)
            
            # In production, this would:
            # 1. Check if module container is available
            # 2. Scale up the module if needed
            # 3. Wait for health check to pass
            # 4. Register the module
            
            logger.info(f"Module {module_type.value} loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load module {module_type.value}: {str(e)}")
    
    async def _process_with_module(self, module_type: ModuleType, 
                                 request: ModuleRequest) -> ModuleResponse:
        """Process request with specified module"""
        
        if module_type not in self.modules:
            # Module not available, create error response
            return ModuleResponse(
                query_id=request.query_id,
                module_type=module_type,
                content="Module not available",
                confidence_score=0.0,
                processing_time=0.0,
                token_count=0,
                quality_metrics={},
                metadata={'module_unavailable': True},
                timestamp=datetime.utcnow(),
                error=f"Module {module_type.value} not available"
            )
        
        module = self.modules[module_type]
        
        try:
            # Process with timeout
            response = await asyncio.wait_for(
                module.process_request(request),
                timeout=request.timeout
            )
            
            return response
            
        except asyncio.TimeoutError:
            return ModuleResponse(
                query_id=request.query_id,
                module_type=module_type,
                content="Request timed out",
                confidence_score=0.0,
                processing_time=request.timeout,
                token_count=0,
                quality_metrics={},
                metadata={'timeout': True},
                timestamp=datetime.utcnow(),
                error="Request timeout"
            )
        
        except Exception as e:
            return ModuleResponse(
                query_id=request.query_id,
                module_type=module_type,
                content=f"Module error: {str(e)}",
                confidence_score=0.0,
                processing_time=0.0,
                token_count=0,
                quality_metrics={},
                metadata={'module_error': True},
                timestamp=datetime.utcnow(),
                error=str(e)
            )
    
    async def _handle_fallback(self, request: ModuleRequest, 
                             failed_module: ModuleType, 
                             failed_response: ModuleResponse) -> ModuleResponse:
        """Handle fallback when primary module fails or underperforms"""
        
        fallback_modules = self.fallback_manager.get_fallback_modules(failed_module)
        
        for fallback_module in fallback_modules:
            if fallback_module in self.modules:
                logger.info(f"Attempting fallback from {failed_module.value} "
                           f"to {fallback_module.value}")
                
                fallback_response = await self._process_with_module(
                    fallback_module, request
                )
                
                # Check if fallback was successful
                if (not fallback_response.error and 
                    fallback_response.confidence_score > failed_response.confidence_score):
                    
                    # Update fallback stats
                    self.fallback_manager.update_fallback_stats(
                        failed_module, fallback_module, True
                    )
                    
                    # Add metadata about fallback
                    fallback_response.metadata = fallback_response.metadata or {}
                    fallback_response.metadata.update({
                        'fallback_used': True,
                        'original_module': failed_module.value,
                        'fallback_reason': 'low_confidence' if failed_response.confidence_score < 0.6 else 'error'
                    })
                    
                    return fallback_response
        
        # If all fallbacks failed, return original response
        self.fallback_manager.update_fallback_stats(
            failed_module, fallback_modules[0] if fallback_modules else failed_module, False
        )
        
        return failed_response
    
    def _get_historical_data(self, module_type: ModuleType) -> Dict[str, Any]:
        """Get historical performance data for a module"""
        return self.module_stats.get(module_type, {})
    
    def _update_statistics(self, module_type: ModuleType, response: ModuleResponse):
        """Update module performance statistics"""
        stats = self.module_stats[module_type]
        stats['requests'] += 1
        
        # Update running averages
        current_requests = stats['requests']
        stats['avg_confidence'] = (
            (stats['avg_confidence'] * (current_requests - 1) + response.confidence_score) /
            current_requests
        )
        stats['avg_time'] = (
            (stats['avg_time'] * (current_requests - 1) + response.processing_time) /
            current_requests
        )
        
        # Update confidence scorer's history
        module_key = module_type.value
        if module_key not in self.confidence_scorer.module_performance_history:
            self.confidence_scorer.module_performance_history[module_key] = []
        
        self.confidence_scorer.module_performance_history[module_key].append(
            response.confidence_score
        )
        
        # Keep only recent history (last 100 responses)
        if len(self.confidence_scorer.module_performance_history[module_key]) > 100:
            self.confidence_scorer.module_performance_history[module_key] = \
                self.confidence_scorer.module_performance_history[module_key][-100:]
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        status = {
            'timestamp': datetime.utcnow().isoformat(),
            'registered_modules': list(self.modules.keys()),
            'module_stats': self.module_stats,
            'fallback_stats': self.fallback_manager.fallback_history,
            'total_requests': sum(stats['requests'] for stats in self.module_stats.values())
        }
        
        # Check module health
        module_health = {}
        for module_type, module in self.modules.items():
            try:
                health = await module.health_check()
                module_health[module_type.value] = health
            except Exception as e:
                module_health[module_type.value] = {'status': 'error', 'error': str(e)}
        
        status['module_health'] = module_health
        
        return status

# Example usage and testing
if __name__ == "__main__":
    async def main():
        # Initialize router
        router = ModuleRouter()
        
        # Create a sample request
        request = ModuleRequest(
            query_id="test-001",
            user_id="user-123",
            query_text="Create a Python function to calculate compound interest",
            query_type=QueryType.CODE_GENERATION,
            context={'domain': 'development'},
            parameters={'language': 'python'},
            timestamp=datetime.utcnow()
        )
        
        # Route the query (would fail since no modules are registered)
        response = await router.route_query(request)
        print(f"Response: {response.content}")
        
        # Get system status
        status = await router.get_system_status()
        print(f"System Status: {json.dumps(status, indent=2, default=str)}")

    # Run the example
    asyncio.run(main())
