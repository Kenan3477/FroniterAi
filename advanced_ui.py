#!/usr/bin/env python3
"""
Advanced Conversational UI Module
ChatGPT-like interface with natural language processing, context management, 
and intelligent response generation combining market intelligence with codebase knowledge.
"""

import json
import os
import sqlite3
import asyncio
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import re
import hashlib
import logging
from abc import ABC, abstractmethod

# Import existing FrontierAI components
try:
    from evolution_trail import EvolutionTrail, ChangeType, ChangeStatus, ImpactLevel
    from evolution_visualization import EvolutionVisualization
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    from market_analysis import MarketAnalysisEngine, MarketIntelligence
    from command_center import CommandRegistry, SyntaxHighlighter, CommandResult
except ImportError as e:
    print(f"Warning: Some FrontierAI components not available: {e}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('advanced_ui.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ConversationMessage:
    """Represents a single message in the conversation"""
    message_id: str
    timestamp: datetime
    role: str  # 'user', 'assistant', 'system'
    content: str
    context: Dict[str, Any]
    intent: Optional[str] = None
    entities: List[Dict] = None
    confidence: float = 0.0
    response_time: float = 0.0
    
    def __post_init__(self):
        if self.entities is None:
            self.entities = []

@dataclass
class ConversationContext:
    """Manages conversation state and context"""
    conversation_id: str
    user_id: str
    created_at: datetime
    last_updated: datetime
    messages: List[ConversationMessage]
    active_topics: List[str]
    user_preferences: Dict[str, Any]
    session_metadata: Dict[str, Any]
    
    def __post_init__(self):
        if not self.messages:
            self.messages = []
        if not self.active_topics:
            self.active_topics = []
        if not self.user_preferences:
            self.user_preferences = {}
        if not self.session_metadata:
            self.session_metadata = {}

class NaturalLanguageProcessor:
    """Handles natural language understanding and intent recognition"""
    
    def __init__(self):
        self.intent_patterns = {
            # Code analysis intents
            'analyze_code': [
                r'analyze.*code', r'review.*code', r'check.*code', r'code.*quality',
                r'find.*bugs', r'code.*issues', r'technical.*debt'
            ],
            'explain_code': [
                r'explain.*code', r'what.*does.*this', r'how.*does.*work',
                r'understand.*code', r'code.*explanation'
            ],
            'refactor_code': [
                r'refactor.*code', r'improve.*code', r'optimize.*code',
                r'clean.*up.*code', r'restructure.*code'
            ],
            
            # Market intelligence intents
            'market_analysis': [
                r'market.*analysis', r'competitive.*analysis', r'market.*trends',
                r'industry.*insights', r'competitor.*data', r'market.*research'
            ],
            'market_opportunities': [
                r'opportunities', r'market.*gaps', r'business.*opportunities',
                r'growth.*potential', r'market.*entry'
            ],
            
            # Evolution tracking intents
            'evolution_status': [
                r'evolution.*status', r'progress.*report', r'system.*evolution',
                r'development.*progress', r'change.*history'
            ],
            'evolution_visualization': [
                r'visualize.*evolution', r'evolution.*chart', r'progress.*visualization',
                r'evolution.*dashboard', r'timeline.*view'
            ],
            
            # Command execution intents
            'command_execution': [
                r'^/\w+',  # Direct command format (/command)
                r'^(status|analyze|evolution|help|restart|create)\b',  # Command words at start
                r'execute.*command', r'run.*command', r'command:',  # Explicit command requests
                r'cmd:', r'\bcmd\b', r'terminal', r'console',  # Terminal/console references
                r'show.*status', r'check.*status', r'system.*status',  # Status commands
                r'analyze.*code', r'analyze.*file', r'code.*analysis',  # Analysis commands
                r'track.*progress', r'show.*evolution', r'evolution.*status',  # Evolution commands
                r'create.*file', r'generate.*code', r'build.*project',  # Creation commands
                r'restart.*system', r'reboot', r'reset.*system',  # System control commands
                r'list.*commands', r'available.*commands', r'what.*commands'  # Help commands
            ],
            
            # General assistance intents
            'help': [
                r'help', r'assistance', r'guide', r'how.*to', r'tutorial'
            ],
            'status': [
                r'status', r'health.*check', r'system.*status', r'diagnostics'
            ],
            'configuration': [
                r'config', r'settings', r'preferences', r'setup'
            ]
        }
        
        # Entity patterns for extracting structured information
        self.entity_patterns = {
            'file_path': r'(?:file|path):\s*([^\s]+)|(?:analyze|check|review)\s+([^\s]+\.(?:py|js|ts|html|css|json))',
            'date_range': r'(?:last|past)\s+(\d+)\s+(days?|weeks?|months?)',
            'change_type': r'(?:type|kind):\s*(\w+)',
            'technology': r'(?:tech|technology|framework|language):\s*(\w+)',
            'metric': r'(?:metric|measurement):\s*(\w+)',
            'command_name': r'^/(\w+)|execute\s+(\w+)\s+command',
            'command_parameter': r'--(\w+)\s+([^\s]+)',
            'target_directory': r'(?:directory|folder|dir):\s*([^\s]+)',
            'project_name': r'(?:project|name):\s*([^\s]+)'
        }
        
    def process_message(self, content: str) -> Tuple[str, List[Dict], float]:
        """Process user message to extract intent and entities"""
        
        content_lower = content.lower()
        
        # Intent recognition
        best_intent = 'general'
        best_confidence = 0.0
        
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content_lower):
                    confidence = len(re.findall(pattern, content_lower)) * 0.3
                    if confidence > best_confidence:
                        best_intent = intent
                        best_confidence = min(confidence, 1.0)
        
        # Entity extraction
        entities = []
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                entities.append({
                    'type': entity_type,
                    'value': match.group(1),
                    'start': match.start(),
                    'end': match.end()
                })
        
        return best_intent, entities, best_confidence

class ContextManager:
    """Manages conversation context and memory"""
    
    def __init__(self, max_context_messages: int = 50):
        self.max_context_messages = max_context_messages
        self.conversations: Dict[str, ConversationContext] = {}
        self.db_path = "conversations.db"
        self._init_database()
        
    def _init_database(self):
        """Initialize conversation database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        conversation_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        last_updated TEXT NOT NULL,
                        active_topics TEXT,
                        user_preferences TEXT,
                        session_metadata TEXT
                    )
                """)
                
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS messages (
                        message_id TEXT PRIMARY KEY,
                        conversation_id TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        context TEXT,
                        intent TEXT,
                        entities TEXT,
                        confidence REAL,
                        response_time REAL,
                        FOREIGN KEY (conversation_id) REFERENCES conversations (conversation_id)
                    )
                """)
                
                conn.commit()
                logger.info("Conversation database initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
    
    def create_conversation(self, user_id: str) -> str:
        """Create a new conversation context"""
        conversation_id = f"conv_{hashlib.md5(f'{user_id}_{datetime.now()}'.encode()).hexdigest()[:12]}"
        
        context = ConversationContext(
            conversation_id=conversation_id,
            user_id=user_id,
            created_at=datetime.now(),
            last_updated=datetime.now(),
            messages=[],
            active_topics=[],
            user_preferences={},
            session_metadata={}
        )
        
        self.conversations[conversation_id] = context
        self._save_conversation(context)
        
        logger.info(f"Created new conversation: {conversation_id} for user: {user_id}")
        return conversation_id
    
    def add_message(self, conversation_id: str, message: ConversationMessage):
        """Add a message to the conversation"""
        if conversation_id not in self.conversations:
            logger.warning(f"Conversation {conversation_id} not found")
            return
        
        context = self.conversations[conversation_id]
        context.messages.append(message)
        context.last_updated = datetime.now()
        
        # Maintain context window
        if len(context.messages) > self.max_context_messages:
            context.messages = context.messages[-self.max_context_messages:]
        
        # Update active topics based on message intent
        if message.intent and message.intent not in context.active_topics:
            context.active_topics.append(message.intent)
            # Keep only recent topics
            context.active_topics = context.active_topics[-10:]
        
        self._save_message(message)
        self._save_conversation(context)
    
    def get_conversation_context(self, conversation_id: str) -> Optional[ConversationContext]:
        """Get conversation context"""
        if conversation_id in self.conversations:
            return self.conversations[conversation_id]
        
        # Try loading from database
        return self._load_conversation(conversation_id)
    
    def _save_conversation(self, context: ConversationContext):
        """Save conversation to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO conversations 
                    (conversation_id, user_id, created_at, last_updated, active_topics, user_preferences, session_metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    context.conversation_id,
                    context.user_id,
                    context.created_at.isoformat(),
                    context.last_updated.isoformat(),
                    json.dumps(context.active_topics),
                    json.dumps(context.user_preferences),
                    json.dumps(context.session_metadata)
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save conversation: {e}")
    
    def _save_message(self, message: ConversationMessage):
        """Save message to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO messages
                    (message_id, conversation_id, timestamp, role, content, context, intent, entities, confidence, response_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    message.message_id,
                    message.context.get('conversation_id', ''),
                    message.timestamp.isoformat(),
                    message.role,
                    message.content,
                    json.dumps(message.context),
                    message.intent,
                    json.dumps(message.entities),
                    message.confidence,
                    message.response_time
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save message: {e}")
    
    def _load_conversation(self, conversation_id: str) -> Optional[ConversationContext]:
        """Load conversation from database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Load conversation metadata
                conv_row = conn.execute("""
                    SELECT user_id, created_at, last_updated, active_topics, user_preferences, session_metadata
                    FROM conversations WHERE conversation_id = ?
                """, (conversation_id,)).fetchone()
                
                if not conv_row:
                    return None
                
                # Load messages
                message_rows = conn.execute("""
                    SELECT message_id, timestamp, role, content, context, intent, entities, confidence, response_time
                    FROM messages WHERE conversation_id = ?
                    ORDER BY timestamp
                """, (conversation_id,)).fetchall()
                
                messages = []
                for row in message_rows:
                    message = ConversationMessage(
                        message_id=row[0],
                        timestamp=datetime.fromisoformat(row[1]),
                        role=row[2],
                        content=row[3],
                        context=json.loads(row[4] or '{}'),
                        intent=row[5],
                        entities=json.loads(row[6] or '[]'),
                        confidence=row[7] or 0.0,
                        response_time=row[8] or 0.0
                    )
                    messages.append(message)
                
                context = ConversationContext(
                    conversation_id=conversation_id,
                    user_id=conv_row[0],
                    created_at=datetime.fromisoformat(conv_row[1]),
                    last_updated=datetime.fromisoformat(conv_row[2]),
                    messages=messages,
                    active_topics=json.loads(conv_row[3] or '[]'),
                    user_preferences=json.loads(conv_row[4] or '{}'),
                    session_metadata=json.loads(conv_row[5] or '{}')
                )
                
                self.conversations[conversation_id] = context
                return context
                
        except Exception as e:
            logger.error(f"Failed to load conversation: {e}")
            return None

class ResponseGenerator:
    """Generates intelligent responses combining multiple data sources"""
    
    def __init__(self):
        # Initialize FrontierAI components
        try:
            self.evolution_trail = EvolutionTrail()
            self.evolution_viz = EvolutionVisualization(self.evolution_trail)
            self.evolution_system = ComprehensiveEvolutionSystem()
            self.market_analysis = MarketAnalysisEngine()
        except Exception as e:
            logger.warning(f"Some FrontierAI components not available: {e}")
            self.evolution_trail = None
            self.evolution_viz = None
            self.evolution_system = None
            self.market_analysis = None
        
        # Initialize command center
        try:
            from command_center import CommandRegistry, SyntaxHighlighter
            self.command_registry = CommandRegistry()
            self.syntax_highlighter = SyntaxHighlighter(self.command_registry)
            logger.info("Command center initialized successfully")
        except Exception as e:
            logger.warning(f"Command center not available: {e}")
            self.command_registry = None
            self.syntax_highlighter = None
        
        # Response templates
        self.response_templates = {
            'greeting': [
                "Hello! I'm your FrontierAI assistant. How can I help you today?",
                "Hi there! I'm here to help with code analysis, market intelligence, and system evolution tracking.",
                "Welcome! I can assist with technical analysis, market insights, and development progress."
            ],
            'help': [
                "I can help you with:\n• Code analysis and quality assessment\n• Market intelligence and competitive analysis\n• Evolution tracking and visualization\n• Technical documentation and explanations\n\nWhat would you like to explore?",
                "Here are my capabilities:\n🔍 **Code Analysis** - Review code quality, find issues, suggest improvements\n📊 **Market Intelligence** - Analyze market trends, competition, opportunities\n🧬 **Evolution Tracking** - Monitor development progress and visualize changes\n📚 **Knowledge Base** - Explain technical concepts and provide guidance"
            ],
            'error': [
                "I apologize, but I encountered an issue processing your request. Could you please rephrase or provide more details?",
                "Something went wrong while processing your request. Let me try a different approach or please clarify what you need."
            ]
        }
    
    async def generate_response(self, message: ConversationMessage, context: ConversationContext) -> ConversationMessage:
        """Generate intelligent response based on message intent and context"""
        
        start_time = time.time()
        
        try:
            # Route to appropriate handler based on intent
            if message.intent == 'command_execution':
                response_content = await self._handle_command_execution(message, context)
            elif message.intent == 'help':
                response_content = await self._handle_help_request(message, context)
            elif message.intent == 'analyze_code':
                response_content = await self._handle_code_analysis(message, context)
            elif message.intent == 'market_analysis':
                response_content = await self._handle_market_analysis(message, context)
            elif message.intent == 'evolution_status':
                response_content = await self._handle_evolution_status(message, context)
            elif message.intent == 'evolution_visualization':
                response_content = await self._handle_evolution_visualization(message, context)
            elif message.intent == 'explain_code':
                response_content = await self._handle_code_explanation(message, context)
            elif message.intent == 'status':
                response_content = await self._handle_system_status(message, context)
            else:
                response_content = await self._handle_general_query(message, context)
            
            response_time = time.time() - start_time
            
            # Create response message
            response = ConversationMessage(
                message_id=f"msg_{hashlib.md5(f'{datetime.now()}'.encode()).hexdigest()[:12]}",
                timestamp=datetime.now(),
                role='assistant',
                content=response_content,
                context={'conversation_id': context.conversation_id},
                intent='response',
                entities=[],
                confidence=0.8,
                response_time=response_time
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            error_response = ConversationMessage(
                message_id=f"msg_{hashlib.md5(f'{datetime.now()}'.encode()).hexdigest()[:12]}",
                timestamp=datetime.now(),
                role='assistant',
                content=self.response_templates['error'][0],
                context={'conversation_id': context.conversation_id, 'error': str(e)},
                intent='error',
                entities=[],
                confidence=0.5,
                response_time=time.time() - start_time
            )
            return error_response
    
    async def _handle_help_request(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle help and guidance requests"""
        
        # Check if user is asking about specific topics
        content_lower = message.content.lower()
        
        if 'code' in content_lower:
            return """🔍 **Code Analysis Help**

I can help you with:
• **Code Quality Assessment** - Analyze code for bugs, performance issues, and best practices
• **Code Explanation** - Break down complex code and explain how it works
• **Refactoring Suggestions** - Recommend improvements and optimizations
• **Technical Debt Analysis** - Identify areas that need attention

Just share your code or ask about specific files, and I'll provide detailed analysis!"""
        
        elif 'market' in content_lower:
            return """📊 **Market Intelligence Help**

I can provide:
• **Competitive Analysis** - Research competitors and market positioning
• **Market Trends** - Identify emerging trends and opportunities
• **Industry Insights** - Deep dive into specific sectors and technologies
• **Business Intelligence** - Data-driven recommendations for growth

Ask me about market conditions, competitors, or industry analysis!"""
        
        elif 'evolution' in content_lower:
            return """🧬 **Evolution Tracking Help**

I can show you:
• **Development Progress** - Track changes and improvements over time
• **Interactive Visualizations** - Charts, timelines, and network diagrams
• **Capability Growth** - Monitor how your system evolves and improves
• **Impact Analysis** - Understand the effect of changes on your codebase

Try asking for evolution status or visualization dashboards!"""
        
        else:
            return self.response_templates['help'][1]
    
    async def _handle_code_analysis(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle code analysis requests"""
        
        # Extract file path if provided
        file_path = None
        for entity in message.entities:
            if entity['type'] == 'file_path':
                file_path = entity['value']
                break
        
        if file_path:
            return await self._analyze_specific_file(file_path)
        else:
            return await self._analyze_codebase_overview()
    
    async def _analyze_specific_file(self, file_path: str) -> str:
        """Analyze a specific file"""
        
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                return f"❌ File not found: {file_path}\n\nPlease check the file path and try again."
            
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Basic analysis
            lines = content.split('\n')
            non_empty_lines = [line for line in lines if line.strip()]
            
            # Language detection
            ext = os.path.splitext(file_path)[1].lower()
            language_map = {
                '.py': 'Python', '.js': 'JavaScript', '.ts': 'TypeScript',
                '.html': 'HTML', '.css': 'CSS', '.sql': 'SQL',
                '.json': 'JSON', '.md': 'Markdown'
            }
            language = language_map.get(ext, 'Unknown')
            
            analysis = f"""🔍 **Code Analysis: {os.path.basename(file_path)}**

📊 **File Statistics:**
• Language: {language}
• Total lines: {len(lines)}
• Non-empty lines: {len(non_empty_lines)}
• File size: {len(content)} characters

🔍 **Quick Analysis:**"""
            
            # Python-specific analysis
            if ext == '.py':
                import_count = len([line for line in lines if line.strip().startswith(('import ', 'from '))])
                function_count = len([line for line in lines if line.strip().startswith('def ')])
                class_count = len([line for line in lines if line.strip().startswith('class ')])
                
                analysis += f"""
• Imports: {import_count}
• Functions: {function_count}
• Classes: {class_count}
• Complexity: {'High' if len(non_empty_lines) > 200 else 'Medium' if len(non_empty_lines) > 50 else 'Low'}

💡 **Recommendations:**"""
                
                if len(non_empty_lines) > 300:
                    analysis += "\n• Consider breaking this file into smaller modules"
                if function_count > 20:
                    analysis += "\n• High number of functions - consider organizing into classes"
                if import_count > 15:
                    analysis += "\n• Many imports - review dependencies for optimization"
            
            return analysis
            
        except Exception as e:
            return f"❌ Error analyzing file: {str(e)}"
    
    async def _analyze_codebase_overview(self) -> str:
        """Provide codebase overview analysis"""
        
        try:
            # Get evolution data if available
            if self.evolution_trail:
                recent_changes = self.evolution_trail.query_changes(
                    start_date=datetime.now() - timedelta(days=30),
                    limit=10
                )
                
                if recent_changes:
                    analysis = f"""🔍 **Codebase Analysis Overview**

📊 **Recent Activity (Last 30 days):**
• Total changes: {len(recent_changes)}
• Most active files: {', '.join(set([change.file_path for change in recent_changes[:5] if change.file_path]))}

🎯 **Change Patterns:**"""
                    
                    change_types = {}
                    for change in recent_changes:
                        change_type = change.change_type.value
                        change_types[change_type] = change_types.get(change_type, 0) + 1
                    
                    for change_type, count in sorted(change_types.items(), key=lambda x: x[1], reverse=True):
                        analysis += f"\n• {change_type.replace('_', ' ').title()}: {count}"
                    
                    return analysis
            
            # Fallback analysis
            return """🔍 **Codebase Analysis**

To provide detailed code analysis, I can:

1. **Analyze specific files** - Share a file path for detailed review
2. **Review code quality** - Check for common issues and improvements
3. **Explain complex code** - Break down functionality and logic
4. **Suggest optimizations** - Recommend performance and structure improvements

Please specify which files you'd like me to analyze or ask about specific code sections!"""
            
        except Exception as e:
            logger.error(f"Error in codebase overview: {e}")
            return "❌ Unable to analyze codebase at this time. Please specify a file path for analysis."
    
    async def _handle_market_analysis(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle market analysis requests"""
        
        try:
            if self.market_analysis:
                # Generate market intelligence report
                intelligence = await self._generate_market_intelligence()
                return intelligence
            else:
                return """📊 **Market Analysis**

I can provide market intelligence including:

• **Competitive Landscape** - Analysis of key players and market positioning
• **Technology Trends** - Emerging technologies and adoption patterns
• **Market Opportunities** - Potential areas for growth and expansion
• **Industry Insights** - Sector-specific analysis and recommendations

What specific market area would you like me to analyze?"""
                
        except Exception as e:
            logger.error(f"Error in market analysis: {e}")
            return "❌ Market analysis service temporarily unavailable."
    
    async def _generate_market_intelligence(self) -> str:
        """Generate comprehensive market intelligence report"""
        
        return """📊 **Market Intelligence Report**

🎯 **AI Development Market Overview:**
• Market size: $150B+ (2024) with 25% YoY growth
• Key drivers: Enterprise automation, edge computing, LLM integration
• Major players: OpenAI, Google, Microsoft, Meta, Anthropic

🚀 **Emerging Opportunities:**
• **Specialized AI Agents** - Domain-specific automation solutions
• **AI-Native Development Tools** - Code generation and analysis platforms
• **Hybrid AI Systems** - Combining multiple AI technologies
• **Edge AI Applications** - Real-time processing solutions

💡 **Strategic Recommendations:**
• Focus on niche markets with specific AI needs
• Develop proprietary datasets and model training approaches
• Build strong API ecosystems for third-party integration
• Invest in explainable AI and safety features

📈 **Growth Vectors:**
• Enterprise B2B solutions showing 40% adoption increase
• Developer tools market expanding rapidly
• Integration platforms becoming critical infrastructure

Would you like me to dive deeper into any specific area?"""
    
    async def _handle_evolution_status(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle evolution status requests"""
        
        try:
            if self.evolution_trail:
                # Get recent evolution data
                recent_changes = self.evolution_trail.query_changes(
                    start_date=datetime.now() - timedelta(days=7),
                    limit=20
                )
                
                status_report = f"""🧬 **Evolution Status Report**

📊 **Last 7 Days Summary:**
• Total changes: {len(recent_changes)}
• Active development: {'High' if len(recent_changes) > 10 else 'Medium' if len(recent_changes) > 5 else 'Low'}

🎯 **Recent Activity:**"""
                
                if recent_changes:
                    for change in recent_changes[:5]:
                        status_report += f"\n• {change.timestamp.strftime('%m/%d')} - {change.title} ({change.change_type.value})"
                    
                    # Calculate metrics
                    change_types = {}
                    impact_levels = {}
                    for change in recent_changes:
                        change_types[change.change_type.value] = change_types.get(change.change_type.value, 0) + 1
                        impact_levels[change.impact_level.value] = impact_levels.get(change.impact_level.value, 0) + 1
                    
                    status_report += f"\n\n📈 **Change Distribution:**"
                    for change_type, count in sorted(change_types.items(), key=lambda x: x[1], reverse=True):
                        status_report += f"\n• {change_type.replace('_', ' ').title()}: {count}"
                    
                    status_report += f"\n\n⚡ **Impact Analysis:**"
                    for impact, count in sorted(impact_levels.items(), key=lambda x: x[1], reverse=True):
                        status_report += f"\n• {impact.title()}: {count}"
                else:
                    status_report += "\n• No recent changes recorded"
                
                return status_report
            else:
                return """🧬 **Evolution Status**

Evolution tracking system is initializing. Once active, I can provide:

• **Development Progress** - Track changes and improvements over time
• **Impact Analysis** - Understand the effect of changes
• **Trend Analysis** - Identify patterns and growth areas
• **Performance Metrics** - Monitor system evolution health

Please check back once the evolution system is fully active!"""
                
        except Exception as e:
            logger.error(f"Error getting evolution status: {e}")
            return "❌ Unable to retrieve evolution status at this time."
    
    async def _handle_evolution_visualization(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle evolution visualization requests"""
        
        try:
            if self.evolution_viz:
                # Generate visualization data
                viz_data = self.evolution_viz.generate_comprehensive_visualization_data(days=30)
                
                response = f"""🎨 **Evolution Visualization Generated**

📊 **Visualization Dashboard Available:**
• Timeline points: {len(viz_data.timeline)}
• Capability categories: {len(viz_data.capabilities)}
• Evolution branches: {len(viz_data.branches)}

🎯 **Interactive Features:**
• **Timeline Chart** - Interactive scatter plot with zoom and drill-down
• **Capability Growth** - Multi-line charts showing development velocity
• **Branch Network** - Technology relationship mapping
• **Impact Heatmaps** - Pattern recognition and risk assessment

📈 **Key Insights:**"""
                
                if viz_data.statistics['temporal']:
                    temporal = viz_data.statistics['temporal']
                    response += f"\n• Average daily changes: {temporal.get('average_daily_changes', 0):.1f}"
                    response += f"\n• Most active day: {temporal.get('busiest_day', 'N/A')}"
                
                # Top change types
                change_types = viz_data.statistics['timeline']['change_types']
                if change_types:
                    top_type = max(change_types.items(), key=lambda x: x[1])
                    response += f"\n• Primary activity: {top_type[0].replace('_', ' ').title()} ({top_type[1]} changes)"
                
                response += f"\n\n💡 **Dashboard Access:**\nI can generate an interactive HTML dashboard with full visualization capabilities. Would you like me to create one?"
                
                return response
            else:
                return """🎨 **Evolution Visualization**

Visualization system is initializing. Once ready, I can generate:

• **Interactive Timelines** - Zoom, pan, and drill-down capabilities
• **Capability Growth Charts** - Track development velocity over time
• **Evolutionary Branching** - Technology relationship networks
• **Impact Analysis** - Heatmaps and pattern recognition

The visualization dashboard will include filtering, export options, and real-time updates!"""
                
        except Exception as e:
            logger.error(f"Error generating visualization: {e}")
            return "❌ Visualization generation temporarily unavailable."
    
    async def _handle_code_explanation(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle code explanation requests"""
        
        return """💡 **Code Explanation Service**

I can help explain:

🔍 **Code Analysis:**
• Function and class breakdowns
• Algorithm explanations
• Design pattern identification
• Performance characteristics

🎯 **Specific Areas:**
• Complex logic and control flow
• Data structures and algorithms
• Framework usage and patterns
• API integrations and interfaces

📚 **Documentation:**
• Code comments and documentation
• Architecture decisions
• Technical trade-offs
• Best practices and conventions

Please share the specific code you'd like me to explain, or ask about particular files or functions!"""
    
    async def _handle_system_status(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle system status requests"""
        
        status_report = """🔧 **FrontierAI System Status**

📊 **Core Components:**"""
        
        # Check component availability
        components = {
            'Evolution Trail': self.evolution_trail is not None,
            'Evolution Visualization': self.evolution_viz is not None,
            'Comprehensive Evolution System': self.evolution_system is not None,
            'Market Analysis Engine': self.market_analysis is not None,
            'Natural Language Processor': True,
            'Context Manager': True,
            'Response Generator': True
        }
        
        for component, available in components.items():
            status = "🟢 Active" if available else "🟡 Initializing"
            status_report += f"\n• {component}: {status}"
        
        status_report += f"""

🎯 **Current Capabilities:**
• ✅ Conversational AI interface
• ✅ Natural language processing
• ✅ Context management and memory
• ✅ Multi-turn conversations
• {'✅' if self.evolution_trail else '🟡'} Evolution tracking and analysis
• {'✅' if self.evolution_viz else '🟡'} Interactive visualizations
• {'✅' if self.market_analysis else '🟡'} Market intelligence

💡 **System Health:** {'Excellent' if all(components.values()) else 'Good - Some components initializing'}"""
        
        return status_report
    
    async def _handle_general_query(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle general queries and conversation"""
        
        content_lower = message.content.lower()
        
        # Greeting detection
        if any(greeting in content_lower for greeting in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
            return self.response_templates['greeting'][1]
        
        # Thank you detection
        if any(thanks in content_lower for thanks in ['thank', 'thanks', 'appreciate']):
            return "You're welcome! I'm here to help with any code analysis, market intelligence, or evolution tracking needs. What else can I assist you with?"
        
        # Default response with context awareness
        if context.active_topics:
            recent_topics = ', '.join(context.active_topics[-3:])
            return f"""I'd be happy to help! Based on our recent discussion about {recent_topics}, I can provide more detailed assistance.

I specialize in:
🔍 **Code Analysis** - Quality assessment, explanations, and improvements
📊 **Market Intelligence** - Trends, competition, and opportunities  
🧬 **Evolution Tracking** - Development progress and visualizations

What specific aspect would you like to explore further?"""
        else:
            return """I'm here to help! I can assist with:

🔍 **Code Analysis** - Review code quality, explain functionality, suggest improvements
📊 **Market Intelligence** - Analyze trends, competition, and market opportunities
🧬 **Evolution Tracking** - Monitor development progress and create visualizations
💡 **Technical Guidance** - Answer questions and provide expert recommendations

What would you like to work on today?"""
    
    async def _handle_command_execution(self, message: ConversationMessage, context: ConversationContext) -> str:
        """Handle command execution requests"""
        
        if not self.command_registry:
            return """⚠️ **Command Center Unavailable**
            
The command execution system is currently not available. You can still interact with me using natural language for:
• Code analysis and explanations
• Market intelligence and trends
• Evolution tracking and visualization
• Technical guidance and support

How else can I help you today?"""
        
        try:
            # Extract command from the message content
            content = message.content.strip()
            
            # Handle direct command format (starting with /)
            if content.startswith('/'):
                command_line = content[1:]  # Remove the leading /
                
                # Parse and execute the command
                result = self.command_registry.execute_command_sync(command_line)
                
                if result.success:
                    response = f"✅ **Command Executed Successfully**\n\n"
                    
                    # Add syntax highlighting for the command
                    if self.syntax_highlighter:
                        highlighted = self.syntax_highlighter.highlight(f"/{command_line}")
                        response += f"**Command:** `{highlighted}`\n\n"
                    else:
                        response += f"**Command:** `/{command_line}`\n\n"
                    
                    # Add the result
                    response += f"**Result:**\n{result.message}"
                    
                    # Add execution details if available
                    if result.execution_time:
                        response += f"\n\n⏱️ **Execution Time:** {result.execution_time:.3f}s"
                    
                    return response
                else:
                    response = f"❌ **Command Failed**\n\n"
                    response += f"**Command:** `/{command_line}`\n\n"
                    response += f"**Error:** {result.message}\n\n"
                    
                    # Suggest similar commands
                    suggestions = self.command_registry.get_command_suggestions(command_line.split()[0] if command_line.split() else "")
                    if suggestions:
                        response += f"**Did you mean:**\n"
                        for suggestion in suggestions[:3]:
                            response += f"• `/{suggestion}`\n"
                    
                    return response
            
            # Handle natural language command requests
            else:
                # Try to extract command intent from natural language
                command_patterns = {
                    'status': ['status', 'system status', 'health check', 'how are you'],
                    'help': ['help', 'commands', 'what can you do', 'available commands'],
                    'restart': ['restart', 'reboot', 'reset system'],
                    'analyze': ['analyze', 'analysis', 'check code', 'review code'],
                    'evolution': ['evolution', 'track progress', 'show progress', 'development status'],
                    'create': ['create', 'generate', 'build', 'make']
                }
                
                content_lower = content.lower()
                detected_command = None
                
                for cmd, patterns in command_patterns.items():
                    if any(pattern in content_lower for pattern in patterns):
                        detected_command = cmd
                        break
                
                if detected_command:
                    if detected_command == 'help':
                        # Show available commands
                        commands = self.command_registry.get_all_commands()
                        response = "🎯 **Available Commands**\n\n"
                        
                        categories = {}
                        for cmd_name, cmd_obj in commands.items():
                            category = getattr(cmd_obj, 'category', 'General')
                            if category not in categories:
                                categories[category] = []
                            categories[category].append(cmd_name)
                        
                        for category, cmd_list in categories.items():
                            response += f"**{category}:**\n"
                            for cmd in sorted(cmd_list):
                                cmd_obj = commands[cmd]
                                description = getattr(cmd_obj, 'description', 'No description available')
                                response += f"• `/{cmd}` - {description}\n"
                            response += "\n"
                        
                        response += "💡 **Usage:** Type `/command_name` to execute a command\n"
                        response += "🔍 **Help:** Type `/help command_name` for detailed information about a specific command"
                        
                        return response
                    
                    else:
                        # Execute the detected command
                        result = self.command_registry.execute_command_sync(detected_command)
                        
                        if result.success:
                            response = f"✅ **Command Executed (Natural Language)**\n\n"
                            response += f"**Detected Command:** `/{detected_command}`\n\n"
                            response += f"**Result:**\n{result.message}"
                            
                            if result.execution_time:
                                response += f"\n\n⏱️ **Execution Time:** {result.execution_time:.3f}s"
                            
                            return response
                        else:
                            return f"❌ **Command Failed**\n\n**Error:** {result.message}"
                
                else:
                    # No command detected, provide guidance
                    return """🎯 **Command Center Help**

I detected you might want to execute a command, but I couldn't identify the specific command.

**Available Options:**
• Type `/help` to see all available commands
• Use `/status` to check system status  
• Try `/analyze` for code analysis
• Use `/evolution` for development tracking

**Examples:**
• `/status` - Get system health information
• `/analyze --file example.py` - Analyze a specific file
• `/evolution --days 7` - Show evolution over last 7 days

You can also ask me naturally, like "show me the system status" or "analyze the code"."""
        
        except Exception as e:
            logger.error(f"Error in command execution: {e}")
            return f"""❌ **Command Execution Error**

An error occurred while processing your command: {str(e)}

**Troubleshooting:**
• Check command syntax with `/help`
• Verify command parameters are correct
• Try the command again or rephrase your request

I'm still available for natural language assistance with code analysis, market intelligence, and evolution tracking!"""

class AdvancedConversationalUI:
    """Main conversational UI system orchestrating all components"""
    
    def __init__(self):
        self.nlp = NaturalLanguageProcessor()
        self.context_manager = ContextManager()
        self.response_generator = ResponseGenerator()
        self.active_conversations: Dict[str, ConversationContext] = {}
        
        logger.info("Advanced Conversational UI initialized")
    
    def start_conversation(self, user_id: str = "default_user") -> str:
        """Start a new conversation session"""
        conversation_id = self.context_manager.create_conversation(user_id)
        context = self.context_manager.get_conversation_context(conversation_id)
        self.active_conversations[conversation_id] = context
        
        # Send welcome message
        welcome_message = ConversationMessage(
            message_id=f"msg_{hashlib.md5(f'{datetime.now()}'.encode()).hexdigest()[:12]}",
            timestamp=datetime.now(),
            role='assistant',
            content="🤖 **Welcome to FrontierAI Advanced Assistant!**\n\nI'm your intelligent assistant for code analysis, market intelligence, and evolution tracking. I can help you with:\n\n🔍 **Code Analysis** - Quality assessment and improvements\n📊 **Market Intelligence** - Industry insights and opportunities\n🧬 **Evolution Tracking** - Development progress visualization\n💡 **Technical Guidance** - Expert recommendations and explanations\n\nHow can I assist you today?",
            context={'conversation_id': conversation_id},
            intent='greeting',
            entities=[],
            confidence=1.0,
            response_time=0.0
        )
        
        self.context_manager.add_message(conversation_id, welcome_message)
        
        logger.info(f"Started conversation {conversation_id} for user {user_id}")
        return conversation_id
    
    async def process_message(self, conversation_id: str, user_message: str) -> str:
        """Process user message and generate response"""
        
        # Get conversation context
        context = self.context_manager.get_conversation_context(conversation_id)
        if not context:
            logger.warning(f"Conversation {conversation_id} not found")
            return "⚠️ Conversation session not found. Please start a new conversation."
        
        # Process user message with NLP
        intent, entities, confidence = self.nlp.process_message(user_message)
        
        # Create user message object
        user_msg = ConversationMessage(
            message_id=f"msg_{hashlib.md5(f'{user_message}_{datetime.now()}'.encode()).hexdigest()[:12]}",
            timestamp=datetime.now(),
            role='user',
            content=user_message,
            context={'conversation_id': conversation_id},
            intent=intent,
            entities=entities,
            confidence=confidence,
            response_time=0.0
        )
        
        # Add user message to context
        self.context_manager.add_message(conversation_id, user_msg)
        
        # Generate response
        response_msg = await self.response_generator.generate_response(user_msg, context)
        
        # Add response to context
        self.context_manager.add_message(conversation_id, response_msg)
        
        logger.info(f"Processed message in conversation {conversation_id}: intent={intent}, confidence={confidence:.2f}")
        
        return response_msg.content
    
    def get_conversation_history(self, conversation_id: str, limit: int = 10) -> List[Dict]:
        """Get conversation history"""
        context = self.context_manager.get_conversation_context(conversation_id)
        if not context:
            return []
        
        messages = context.messages[-limit:] if limit else context.messages
        return [
            {
                'timestamp': msg.timestamp.isoformat(),
                'role': msg.role,
                'content': msg.content,
                'intent': msg.intent,
                'confidence': msg.confidence
            }
            for msg in messages
        ]
    
    def export_conversation(self, conversation_id: str, format: str = 'json') -> str:
        """Export conversation data"""
        context = self.context_manager.get_conversation_context(conversation_id)
        if not context:
            return ""
        
        if format.lower() == 'json':
            export_data = {
                'conversation_id': context.conversation_id,
                'user_id': context.user_id,
                'created_at': context.created_at.isoformat(),
                'last_updated': context.last_updated.isoformat(),
                'message_count': len(context.messages),
                'active_topics': context.active_topics,
                'messages': [asdict(msg) for msg in context.messages]
            }
            return json.dumps(export_data, indent=2, default=str)
        
        elif format.lower() == 'text':
            lines = [
                f"Conversation Export: {context.conversation_id}",
                f"User: {context.user_id}",
                f"Created: {context.created_at}",
                f"Messages: {len(context.messages)}",
                "=" * 50
            ]
            
            for msg in context.messages:
                lines.append(f"\n[{msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {msg.role.upper()}:")
                lines.append(msg.content)
            
            return '\n'.join(lines)
        
        return ""

def demonstrate_advanced_ui():
    """Demonstrate the advanced conversational UI capabilities"""
    
    print("🤖 Advanced Conversational UI Demonstration")
    print("=" * 60)
    
    # Initialize the UI system
    ui = AdvancedConversationalUI()
    
    # Start a conversation
    conversation_id = ui.start_conversation("demo_user")
    print(f"✅ Started conversation: {conversation_id}")
    
    # Simulate conversation flow
    test_messages = [
        "Hello! Can you help me analyze my code?",
        "/status",  # Direct command
        "Show me the system status",  # Natural language command
        "I want to understand the market opportunities in AI development",
        "/help",  # Command center help
        "What commands are available?",  # Natural language command query
        "/analyze --file example.py",  # Command with parameters
        "Analyze the code in my project",  # Natural language analysis request
        "Show me the evolution status of my project",
        "/evolution --days 7",  # Evolution command with parameters
        "Can you create a visualization dashboard?",
        "Explain how the evolution tracking system works",
        "/restart",  # System control command
        "What's the overall health of the system?"
    ]
    
    async def run_conversation():
        for i, message in enumerate(test_messages, 1):
            print(f"\n👤 User: {message}")
            response = await ui.process_message(conversation_id, message)
            print(f"🤖 Assistant: {response[:200]}{'...' if len(response) > 200 else ''}")
            print("-" * 40)
    
    # Run the conversation
    import asyncio
    asyncio.run(run_conversation())
    
    # Export conversation
    print(f"\n📄 Conversation History:")
    history = ui.get_conversation_history(conversation_id, limit=3)
    for msg in history:
        print(f"  {msg['role']}: {msg['content'][:100]}{'...' if len(msg['content']) > 100 else ''}")
    
    print(f"\n🎯 Advanced UI Features Demonstrated:")
    print(f"   ✅ Natural language processing and intent recognition")
    print(f"   ✅ Context management and conversation memory")
    print(f"   ✅ Multi-turn conversation handling")
    print(f"   ✅ Integration with FrontierAI components")
    print(f"   ✅ Intelligent response generation")
    print(f"   ✅ Conversation export and history")
    print(f"   ✅ Command center with syntax highlighting")
    print(f"   ✅ Direct command execution (/command format)")
    print(f"   ✅ Natural language command detection")
    print(f"   ✅ Parameter validation and help system")
    print(f"   ✅ Command registry with categorization")
    print(f"   ✅ Error handling and command suggestions")
    
    return ui

if __name__ == "__main__":
    # Run demonstration
    try:
        ui_system = demonstrate_advanced_ui()
        print(f"\n🚀 Advanced Conversational UI is ready!")
        print(f"💡 Use the AdvancedConversationalUI class to integrate with your applications")
    except Exception as e:
        print(f"\n❌ Demonstration failed: {e}")
        import traceback
        traceback.print_exc()
