"""
Frontier WebSocket Server

Real-time WebSocket communication system providing:
- Live financial analysis streaming
- Real-time market data feeds
- Compliance monitoring alerts
- AI reasoning streams
- System health monitoring
- Interactive business intelligence
"""

import asyncio
import websockets
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Set, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import jwt
from pathlib import Path
import sys

# Add project path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(project_root))

from api.config import settings
from integration_hub import integration_hub

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """WebSocket message types"""
    # Authentication
    AUTH_REQUEST = "auth_request"
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    
    # Subscriptions
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    SUBSCRIPTION_SUCCESS = "subscription_success"
    SUBSCRIPTION_ERROR = "subscription_error"
    
    # Data streams
    MARKET_DATA = "market_data"
    FINANCIAL_ANALYSIS = "financial_analysis"
    COMPLIANCE_ALERT = "compliance_alert"
    AI_RESPONSE = "ai_response"
    SYSTEM_METRIC = "system_metric"
    
    # Interactive requests
    ANALYZE_REQUEST = "analyze_request"
    AI_QUERY = "ai_query"
    COMPLIANCE_CHECK = "compliance_check"
    RISK_ASSESSMENT = "risk_assessment"
    
    # System messages
    HEARTBEAT = "heartbeat"
    ERROR = "error"
    NOTIFICATION = "notification"


class SubscriptionChannel(Enum):
    """Available subscription channels"""
    MARKET_DATA = "market_data"
    FINANCIAL_ANALYSIS = "financial_analysis" 
    COMPLIANCE_MONITORING = "compliance_monitoring"
    SYSTEM_HEALTH = "system_health"
    AI_REASONING = "ai_reasoning"
    RISK_ALERTS = "risk_alerts"
    PERFORMANCE_METRICS = "performance_metrics"


@dataclass
class WebSocketClient:
    """WebSocket client information"""
    client_id: str
    websocket: websockets.WebSocketServerProtocol
    user_id: Optional[str]
    authenticated: bool
    subscriptions: Set[str]
    last_activity: datetime
    permissions: List[str]
    metadata: Dict[str, Any]


@dataclass
class WebSocketMessage:
    """WebSocket message structure"""
    message_id: str
    message_type: MessageType
    channel: Optional[str]
    data: Dict[str, Any]
    timestamp: datetime
    client_id: Optional[str] = None


class WebSocketServer:
    """
    High-performance WebSocket server for real-time communication
    """
    
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Dict[str, WebSocketClient] = {}
        self.channel_subscribers: Dict[str, Set[str]] = {channel.value: set() for channel in SubscriptionChannel}
        
        # Message handlers
        self.message_handlers: Dict[MessageType, Callable] = {
            MessageType.AUTH_REQUEST: self._handle_auth_request,
            MessageType.SUBSCRIBE: self._handle_subscribe,
            MessageType.UNSUBSCRIBE: self._handle_unsubscribe,
            MessageType.ANALYZE_REQUEST: self._handle_analyze_request,
            MessageType.AI_QUERY: self._handle_ai_query,
            MessageType.COMPLIANCE_CHECK: self._handle_compliance_check,
            MessageType.RISK_ASSESSMENT: self._handle_risk_assessment,
            MessageType.HEARTBEAT: self._handle_heartbeat
        }
        
        # Background tasks
        self.background_tasks: List[asyncio.Task] = []
        self.server: Optional[websockets.WebSocketServer] = None
        
        # Configuration
        self.heartbeat_interval = 30  # seconds
        self.client_timeout = 300  # 5 minutes
        self.max_message_size = 1024 * 1024  # 1MB
        
        logger.info(f"WebSocket Server initialized on {host}:{port}")
    
    async def start(self):
        """Start the WebSocket server"""
        try:
            # Start WebSocket server
            self.server = await websockets.serve(
                self._handle_client_connection,
                self.host,
                self.port,
                max_size=self.max_message_size,
                ping_interval=20,
                ping_timeout=10
            )
            
            # Start background tasks
            await self._start_background_tasks()
            
            logger.info(f"WebSocket Server started on ws://{self.host}:{self.port}")
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            raise
    
    async def stop(self):
        """Stop the WebSocket server"""
        try:
            # Cancel background tasks
            for task in self.background_tasks:
                task.cancel()
            
            # Close all client connections
            if self.clients:
                await asyncio.gather(
                    *[client.websocket.close() for client in self.clients.values()],
                    return_exceptions=True
                )
            
            # Stop server
            if self.server:
                self.server.close()
                await self.server.wait_closed()
            
            logger.info("WebSocket Server stopped")
            
        except Exception as e:
            logger.error(f"Error stopping WebSocket server: {e}")
    
    async def _start_background_tasks(self):
        """Start background maintenance tasks"""
        # Heartbeat task
        heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        self.background_tasks.append(heartbeat_task)
        
        # Client cleanup task
        cleanup_task = asyncio.create_task(self._client_cleanup_loop())
        self.background_tasks.append(cleanup_task)
        
        # Data broadcast task
        broadcast_task = asyncio.create_task(self._data_broadcast_loop())
        self.background_tasks.append(broadcast_task)
        
        logger.info("Background tasks started")
    
    async def _handle_client_connection(self, websocket, path):
        """Handle new client connection"""
        client_id = str(uuid.uuid4())
        
        try:
            # Create client record
            client = WebSocketClient(
                client_id=client_id,
                websocket=websocket,
                user_id=None,
                authenticated=False,
                subscriptions=set(),
                last_activity=datetime.now(),
                permissions=[],
                metadata={"ip": websocket.remote_address[0] if websocket.remote_address else "unknown"}
            )
            
            self.clients[client_id] = client
            logger.info(f"New WebSocket client connected: {client_id}")
            
            # Send welcome message
            await self._send_message(client_id, MessageType.NOTIFICATION, {
                "message": "Connected to Frontier WebSocket Server",
                "client_id": client_id,
                "timestamp": datetime.now().isoformat()
            })
            
            # Handle client messages
            async for message in websocket:
                await self._handle_client_message(client_id, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_id} disconnected")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        finally:
            await self._cleanup_client(client_id)
    
    async def _handle_client_message(self, client_id: str, raw_message: str):
        """Handle incoming client message"""
        try:
            # Update client activity
            if client_id in self.clients:
                self.clients[client_id].last_activity = datetime.now()
            
            # Parse message
            try:
                message_data = json.loads(raw_message)
            except json.JSONDecodeError:
                await self._send_error(client_id, "Invalid JSON format")
                return
            
            # Validate message structure
            if not self._validate_message_structure(message_data):
                await self._send_error(client_id, "Invalid message structure")
                return
            
            # Create message object
            message = WebSocketMessage(
                message_id=message_data.get("id", str(uuid.uuid4())),
                message_type=MessageType(message_data["type"]),
                channel=message_data.get("channel"),
                data=message_data.get("data", {}),
                timestamp=datetime.now(),
                client_id=client_id
            )
            
            # Route to handler
            if message.message_type in self.message_handlers:
                await self.message_handlers[message.message_type](client_id, message)
            else:
                await self._send_error(client_id, f"Unknown message type: {message.message_type.value}")
                
        except Exception as e:
            logger.error(f"Error handling message from {client_id}: {e}")
            await self._send_error(client_id, "Internal server error")
    
    def _validate_message_structure(self, message_data: Dict[str, Any]) -> bool:
        """Validate incoming message structure"""
        required_fields = ["type"]
        return all(field in message_data for field in required_fields)
    
    async def _handle_auth_request(self, client_id: str, message: WebSocketMessage):
        """Handle authentication request"""
        try:
            token = message.data.get("token")
            if not token:
                await self._send_message(client_id, MessageType.AUTH_FAILURE, {"error": "Token required"})
                return
            
            # Verify JWT token
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("sub")
                permissions = payload.get("permissions", [])
                
                # Update client
                if client_id in self.clients:
                    client = self.clients[client_id]
                    client.user_id = user_id
                    client.authenticated = True
                    client.permissions = permissions
                
                await self._send_message(client_id, MessageType.AUTH_SUCCESS, {
                    "user_id": user_id,
                    "permissions": permissions
                })
                
                logger.info(f"Client {client_id} authenticated as user {user_id}")
                
            except jwt.InvalidTokenError:
                await self._send_message(client_id, MessageType.AUTH_FAILURE, {"error": "Invalid token"})
                
        except Exception as e:
            logger.error(f"Error in auth request: {e}")
            await self._send_message(client_id, MessageType.AUTH_FAILURE, {"error": "Authentication failed"})
    
    async def _handle_subscribe(self, client_id: str, message: WebSocketMessage):
        """Handle subscription request"""
        try:
            channel = message.data.get("channel")
            if not channel:
                await self._send_error(client_id, "Channel required for subscription")
                return
            
            # Validate channel
            valid_channels = [c.value for c in SubscriptionChannel]
            if channel not in valid_channels:
                await self._send_error(client_id, f"Invalid channel: {channel}")
                return
            
            # Check authentication for protected channels
            if not self._check_channel_permission(client_id, channel):
                await self._send_error(client_id, "Insufficient permissions for channel")
                return
            
            # Add subscription
            if client_id in self.clients:
                self.clients[client_id].subscriptions.add(channel)
                self.channel_subscribers[channel].add(client_id)
            
            await self._send_message(client_id, MessageType.SUBSCRIPTION_SUCCESS, {
                "channel": channel,
                "message": f"Subscribed to {channel}"
            })
            
            # Send initial data if available
            await self._send_initial_channel_data(client_id, channel)
            
            logger.info(f"Client {client_id} subscribed to {channel}")
            
        except Exception as e:
            logger.error(f"Error in subscribe request: {e}")
            await self._send_message(client_id, MessageType.SUBSCRIPTION_ERROR, {"error": "Subscription failed"})
    
    async def _handle_unsubscribe(self, client_id: str, message: WebSocketMessage):
        """Handle unsubscription request"""
        try:
            channel = message.data.get("channel")
            if not channel:
                await self._send_error(client_id, "Channel required for unsubscription")
                return
            
            # Remove subscription
            if client_id in self.clients:
                self.clients[client_id].subscriptions.discard(channel)
                if channel in self.channel_subscribers:
                    self.channel_subscribers[channel].discard(client_id)
            
            await self._send_message(client_id, MessageType.SUBSCRIPTION_SUCCESS, {
                "channel": channel,
                "message": f"Unsubscribed from {channel}"
            })
            
            logger.info(f"Client {client_id} unsubscribed from {channel}")
            
        except Exception as e:
            logger.error(f"Error in unsubscribe request: {e}")
            await self._send_error(client_id, "Unsubscription failed")
    
    async def _handle_analyze_request(self, client_id: str, message: WebSocketMessage):
        """Handle financial analysis request"""
        try:
            if not self._check_authentication(client_id):
                await self._send_error(client_id, "Authentication required")
                return
            
            analysis_type = message.data.get("analysis_type")
            financial_data = message.data.get("data", {})
            
            # Route to integration hub for processing
            if integration_hub.financial_analyzer:
                if analysis_type == "financial_ratios":
                    result = await integration_hub.financial_analyzer.analyze_financial_statements(financial_data)
                elif analysis_type == "cash_flow":
                    result = await integration_hub.financial_analyzer.analyze_cash_flow(financial_data)
                else:
                    result = {"error": f"Unknown analysis type: {analysis_type}"}
                
                await self._send_message(client_id, MessageType.FINANCIAL_ANALYSIS, {
                    "analysis_type": analysis_type,
                    "result": result,
                    "request_id": message.message_id
                })
            else:
                await self._send_error(client_id, "Financial analyzer not available")
                
        except Exception as e:
            logger.error(f"Error in analyze request: {e}")
            await self._send_error(client_id, "Analysis failed")
    
    async def _handle_ai_query(self, client_id: str, message: WebSocketMessage):
        """Handle AI query request"""
        try:
            if not self._check_authentication(client_id):
                await self._send_error(client_id, "Authentication required")
                return
            
            query = message.data.get("query", "")
            context = message.data.get("context", {})
            stream = message.data.get("stream", False)
            
            # Route to integration hub
            if integration_hub.module_router:
                from orchestration.module_router import ModuleRequest, QueryType
                
                request = ModuleRequest(
                    query_id=message.message_id,
                    user_id=self.clients[client_id].user_id or client_id,
                    query_text=query,
                    query_type=QueryType.GENERAL,
                    context=context,
                    parameters={"stream": stream},
                    timestamp=datetime.now()
                )
                
                if stream:
                    # Stream response
                    async for chunk in integration_hub.module_router.stream_response(request):
                        await self._send_message(client_id, MessageType.AI_RESPONSE, {
                            "chunk": chunk,
                            "request_id": message.message_id,
                            "streaming": True
                        })
                    
                    # Send end marker
                    await self._send_message(client_id, MessageType.AI_RESPONSE, {
                        "chunk": None,
                        "request_id": message.message_id,
                        "streaming": False,
                        "complete": True
                    })
                else:
                    # Single response
                    result = await integration_hub.module_router.route_request(request)
                    await self._send_message(client_id, MessageType.AI_RESPONSE, {
                        "result": result,
                        "request_id": message.message_id,
                        "streaming": False
                    })
            else:
                await self._send_error(client_id, "AI router not available")
                
        except Exception as e:
            logger.error(f"Error in AI query: {e}")
            await self._send_error(client_id, "AI query failed")
    
    async def _handle_compliance_check(self, client_id: str, message: WebSocketMessage):
        """Handle compliance check request"""
        try:
            if not self._check_authentication(client_id):
                await self._send_error(client_id, "Authentication required")
                return
            
            organization_data = message.data.get("organization_data", {})
            regulations = message.data.get("regulations", ["GDPR"])
            
            # Route to integration hub
            if integration_hub.compliance_engine:
                result = await integration_hub.compliance_engine.perform_compliance_assessment(
                    organization_data=organization_data,
                    regulations=regulations,
                    scope="full"
                )
                
                await self._send_message(client_id, MessageType.COMPLIANCE_ALERT, {
                    "assessment": asdict(result),
                    "request_id": message.message_id
                })
            else:
                await self._send_error(client_id, "Compliance engine not available")
                
        except Exception as e:
            logger.error(f"Error in compliance check: {e}")
            await self._send_error(client_id, "Compliance check failed")
    
    async def _handle_risk_assessment(self, client_id: str, message: WebSocketMessage):
        """Handle risk assessment request"""
        try:
            if not self._check_authentication(client_id):
                await self._send_error(client_id, "Authentication required")
                return
            
            organization_data = message.data.get("organization_data", {})
            regulation = message.data.get("regulation", "GDPR")
            
            # Route to integration hub
            if integration_hub.risk_calculator:
                result = await integration_hub.risk_calculator.calculate_compliance_risk(
                    organization_data=organization_data,
                    regulation=regulation
                )
                
                await self._send_message(client_id, MessageType.RISK_ASSESSMENT, {
                    "risk_assessment": asdict(result),
                    "request_id": message.message_id
                })
            else:
                await self._send_error(client_id, "Risk calculator not available")
                
        except Exception as e:
            logger.error(f"Error in risk assessment: {e}")
            await self._send_error(client_id, "Risk assessment failed")
    
    async def _handle_heartbeat(self, client_id: str, message: WebSocketMessage):
        """Handle heartbeat message"""
        await self._send_message(client_id, MessageType.HEARTBEAT, {
            "timestamp": datetime.now().isoformat(),
            "client_id": client_id
        })
    
    def _check_authentication(self, client_id: str) -> bool:
        """Check if client is authenticated"""
        return client_id in self.clients and self.clients[client_id].authenticated
    
    def _check_channel_permission(self, client_id: str, channel: str) -> bool:
        """Check if client has permission for channel"""
        if client_id not in self.clients:
            return False
        
        client = self.clients[client_id]
        
        # Public channels
        public_channels = [
            SubscriptionChannel.MARKET_DATA.value,
            SubscriptionChannel.SYSTEM_HEALTH.value
        ]
        
        if channel in public_channels:
            return True
        
        # Protected channels require authentication
        if not client.authenticated:
            return False
        
        # Check specific permissions
        protected_permissions = {
            SubscriptionChannel.FINANCIAL_ANALYSIS.value: "financial_analysis",
            SubscriptionChannel.COMPLIANCE_MONITORING.value: "compliance_monitoring",
            SubscriptionChannel.AI_REASONING.value: "ai_access",
            SubscriptionChannel.RISK_ALERTS.value: "risk_management",
            SubscriptionChannel.PERFORMANCE_METRICS.value: "system_monitoring"
        }
        
        required_permission = protected_permissions.get(channel)
        if required_permission:
            return required_permission in client.permissions or "admin" in client.permissions
        
        return True
    
    async def _send_initial_channel_data(self, client_id: str, channel: str):
        """Send initial data when client subscribes to channel"""
        try:
            if channel == SubscriptionChannel.MARKET_DATA.value:
                # Send latest market data
                if integration_hub.redis_client:
                    market_data = await integration_hub.redis_client.get("feed_data:market_data")
                    if market_data:
                        await self._send_message(client_id, MessageType.MARKET_DATA, {
                            "data": json.loads(market_data),
                            "initial": True
                        })
            
            elif channel == SubscriptionChannel.SYSTEM_HEALTH.value:
                # Send current system status
                if integration_hub.performance_monitor:
                    metrics = await integration_hub.performance_monitor.get_current_metrics()
                    await self._send_message(client_id, MessageType.SYSTEM_METRIC, {
                        "metrics": metrics,
                        "initial": True
                    })
            
        except Exception as e:
            logger.error(f"Error sending initial data for {channel}: {e}")
    
    async def _send_message(self, client_id: str, message_type: MessageType, data: Dict[str, Any]):
        """Send message to specific client"""
        try:
            if client_id not in self.clients:
                return
            
            client = self.clients[client_id]
            
            message = {
                "id": str(uuid.uuid4()),
                "type": message_type.value,
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
            
            await client.websocket.send(json.dumps(message))
            
        except websockets.exceptions.ConnectionClosed:
            await self._cleanup_client(client_id)
        except Exception as e:
            logger.error(f"Error sending message to {client_id}: {e}")
    
    async def _send_error(self, client_id: str, error_message: str):
        """Send error message to client"""
        await self._send_message(client_id, MessageType.ERROR, {"error": error_message})
    
    async def _broadcast_to_channel(self, channel: str, message_type: MessageType, data: Dict[str, Any]):
        """Broadcast message to all subscribers of a channel"""
        if channel not in self.channel_subscribers:
            return
        
        subscribers = list(self.channel_subscribers[channel])
        
        # Send to all subscribers
        tasks = []
        for client_id in subscribers:
            task = asyncio.create_task(self._send_message(client_id, message_type, data))
            tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeats"""
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                
                # Send heartbeat to all connected clients
                tasks = []
                for client_id in list(self.clients.keys()):
                    task = asyncio.create_task(self._send_message(client_id, MessageType.HEARTBEAT, {
                        "server_time": datetime.now().isoformat()
                    }))
                    tasks.append(task)
                
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                    
            except Exception as e:
                logger.error(f"Error in heartbeat loop: {e}")
    
    async def _client_cleanup_loop(self):
        """Clean up inactive clients"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                current_time = datetime.now()
                inactive_clients = []
                
                for client_id, client in self.clients.items():
                    time_since_activity = (current_time - client.last_activity).total_seconds()
                    if time_since_activity > self.client_timeout:
                        inactive_clients.append(client_id)
                
                # Clean up inactive clients
                for client_id in inactive_clients:
                    await self._cleanup_client(client_id)
                    logger.info(f"Cleaned up inactive client: {client_id}")
                    
            except Exception as e:
                logger.error(f"Error in client cleanup loop: {e}")
    
    async def _data_broadcast_loop(self):
        """Broadcast data updates to subscribed clients"""
        while True:
            try:
                await asyncio.sleep(5)  # Check every 5 seconds
                
                # Broadcast market data updates
                await self._broadcast_market_data()
                
                # Broadcast system metrics
                await self._broadcast_system_metrics()
                
                # Broadcast compliance alerts
                await self._broadcast_compliance_alerts()
                
            except Exception as e:
                logger.error(f"Error in data broadcast loop: {e}")
    
    async def _broadcast_market_data(self):
        """Broadcast latest market data"""
        try:
            if integration_hub.redis_client:
                # Get latest market data from feeds
                for feed_id in ["market_data", "gold_prices"]:
                    cache_key = f"feed_data:{feed_id}"
                    data = await integration_hub.redis_client.get(cache_key)
                    
                    if data:
                        parsed_data = json.loads(data)
                        await self._broadcast_to_channel(
                            SubscriptionChannel.MARKET_DATA.value,
                            MessageType.MARKET_DATA,
                            {
                                "feed_id": feed_id,
                                "data": parsed_data,
                                "broadcast": True
                            }
                        )
        except Exception as e:
            logger.error(f"Error broadcasting market data: {e}")
    
    async def _broadcast_system_metrics(self):
        """Broadcast system health metrics"""
        try:
            if integration_hub.performance_monitor:
                metrics = await integration_hub.performance_monitor.get_current_metrics()
                
                await self._broadcast_to_channel(
                    SubscriptionChannel.SYSTEM_HEALTH.value,
                    MessageType.SYSTEM_METRIC,
                    {
                        "metrics": metrics,
                        "broadcast": True
                    }
                )
        except Exception as e:
            logger.error(f"Error broadcasting system metrics: {e}")
    
    async def _broadcast_compliance_alerts(self):
        """Broadcast compliance alerts"""
        try:
            if integration_hub.performance_monitor:
                alerts = await integration_hub.performance_monitor.get_active_alerts()
                
                if alerts:
                    await self._broadcast_to_channel(
                        SubscriptionChannel.COMPLIANCE_MONITORING.value,
                        MessageType.COMPLIANCE_ALERT,
                        {
                            "alerts": alerts,
                            "broadcast": True
                        }
                    )
        except Exception as e:
            logger.error(f"Error broadcasting compliance alerts: {e}")
    
    async def _cleanup_client(self, client_id: str):
        """Clean up client connection and subscriptions"""
        try:
            if client_id in self.clients:
                client = self.clients[client_id]
                
                # Remove from channel subscriptions
                for subscription in client.subscriptions:
                    if subscription in self.channel_subscribers:
                        self.channel_subscribers[subscription].discard(client_id)
                
                # Remove client record
                del self.clients[client_id]
                
                logger.debug(f"Client {client_id} cleaned up")
                
        except Exception as e:
            logger.error(f"Error cleaning up client {client_id}: {e}")
    
    def get_server_stats(self) -> Dict[str, Any]:
        """Get WebSocket server statistics"""
        return {
            "connected_clients": len(self.clients),
            "authenticated_clients": sum(1 for client in self.clients.values() if client.authenticated),
            "channel_subscriptions": {
                channel: len(subscribers) 
                for channel, subscribers in self.channel_subscribers.items()
            },
            "total_subscriptions": sum(len(client.subscriptions) for client in self.clients.values()),
            "server_uptime": datetime.now().isoformat()
        }


# Global WebSocket server instance
websocket_server = WebSocketServer()


# Convenience functions
async def start_websocket_server(host: str = "localhost", port: int = 8765):
    """Start the WebSocket server"""
    websocket_server.host = host
    websocket_server.port = port
    await websocket_server.start()


async def stop_websocket_server():
    """Stop the WebSocket server"""
    await websocket_server.stop()


def get_websocket_stats():
    """Get WebSocket server statistics"""
    return websocket_server.get_server_stats()
