"""
Module Communication Protocols
Defines standardized communication interfaces and message formats for Frontier modules
"""

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Callable
import aiohttp
import websockets
from abc import ABC, abstractmethod

class MessageType(Enum):
    """Types of messages in the module communication protocol"""
    REQUEST = "request"
    RESPONSE = "response"
    STREAM_START = "stream_start"
    STREAM_DATA = "stream_data"
    STREAM_END = "stream_end"
    HEALTH_CHECK = "health_check"
    CAPABILITY_QUERY = "capability_query"
    ERROR = "error"
    HEARTBEAT = "heartbeat"

class Priority(Enum):
    """Message priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4
    CRITICAL = 5

@dataclass
class MessageHeader:
    """Standardized message header for all module communications"""
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    message_type: MessageType = MessageType.REQUEST
    source_module: str = ""
    target_module: str = ""
    correlation_id: Optional[str] = None  # For request-response correlation
    timestamp: datetime = field(default_factory=datetime.utcnow)
    priority: Priority = Priority.NORMAL
    timeout: float = 30.0
    retry_count: int = 0
    max_retries: int = 3
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'message_id': self.message_id,
            'message_type': self.message_type.value,
            'source_module': self.source_module,
            'target_module': self.target_module,
            'correlation_id': self.correlation_id,
            'timestamp': self.timestamp.isoformat(),
            'priority': self.priority.value,
            'timeout': self.timeout,
            'retry_count': self.retry_count,
            'max_retries': self.max_retries
        }

@dataclass
class ModuleMessage:
    """Base message structure for inter-module communication"""
    header: MessageHeader
    payload: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'header': self.header.to_dict(),
            'payload': self.payload,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ModuleMessage':
        header_data = data['header']
        header = MessageHeader(
            message_id=header_data['message_id'],
            message_type=MessageType(header_data['message_type']),
            source_module=header_data['source_module'],
            target_module=header_data['target_module'],
            correlation_id=header_data.get('correlation_id'),
            timestamp=datetime.fromisoformat(header_data['timestamp']),
            priority=Priority(header_data['priority']),
            timeout=header_data['timeout'],
            retry_count=header_data['retry_count'],
            max_retries=header_data['max_retries']
        )
        
        return cls(
            header=header,
            payload=data['payload'],
            metadata=data.get('metadata', {})
        )

class CommunicationProtocol(ABC):
    """Abstract base class for communication protocols"""
    
    @abstractmethod
    async def send_message(self, message: ModuleMessage) -> bool:
        """Send a message to target module"""
        pass
    
    @abstractmethod
    async def receive_message(self) -> Optional[ModuleMessage]:
        """Receive a message (blocking)"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if communication channel is healthy"""
        pass
    
    @abstractmethod
    async def close(self):
        """Close communication channel"""
        pass

class HTTPProtocol(CommunicationProtocol):
    """HTTP-based communication protocol for request-response patterns"""
    
    def __init__(self, base_url: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def _ensure_session(self):
        """Ensure HTTP session is initialized"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
    
    async def send_message(self, message: ModuleMessage) -> bool:
        """Send HTTP message to target module"""
        await self._ensure_session()
        
        try:
            endpoint = f"{self.base_url}/api/v1/process"
            headers = {
                'Content-Type': 'application/json',
                'X-Message-ID': message.header.message_id,
                'X-Source-Module': message.header.source_module,
                'X-Priority': str(message.header.priority.value)
            }
            
            async with self.session.post(
                endpoint, 
                json=message.to_dict(),
                headers=headers
            ) as response:
                return response.status == 200
                
        except Exception as e:
            print(f"HTTP send error: {e}")
            return False
    
    async def send_request_and_wait(self, message: ModuleMessage) -> Optional[ModuleMessage]:
        """Send request and wait for response"""
        await self._ensure_session()
        
        try:
            endpoint = f"{self.base_url}/api/v1/process"
            headers = {
                'Content-Type': 'application/json',
                'X-Message-ID': message.header.message_id,
                'X-Source-Module': message.header.source_module,
                'X-Priority': str(message.header.priority.value)
            }
            
            async with self.session.post(
                endpoint,
                json=message.to_dict(),
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=message.header.timeout)
            ) as response:
                if response.status == 200:
                    response_data = await response.json()
                    return ModuleMessage.from_dict(response_data)
                return None
                
        except Exception as e:
            print(f"HTTP request error: {e}")
            return None
    
    async def receive_message(self) -> Optional[ModuleMessage]:
        """HTTP protocol doesn't support receiving (server handles this)"""
        raise NotImplementedError("HTTP protocol is request-response only")
    
    async def health_check(self) -> bool:
        """Check if target module is healthy"""
        await self._ensure_session()
        
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                return response.status == 200
        except:
            return False
    
    async def close(self):
        """Close HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()

class WebSocketProtocol(CommunicationProtocol):
    """WebSocket-based communication for real-time bidirectional communication"""
    
    def __init__(self, websocket_url: str):
        self.websocket_url = websocket_url
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.message_queue = asyncio.Queue()
        self.connected = False
        
    async def connect(self) -> bool:
        """Establish WebSocket connection"""
        try:
            self.websocket = await websockets.connect(self.websocket_url)
            self.connected = True
            
            # Start message receiver task
            asyncio.create_task(self._message_receiver())
            return True
            
        except Exception as e:
            print(f"WebSocket connection error: {e}")
            return False
    
    async def _message_receiver(self):
        """Background task to receive messages"""
        try:
            async for message_data in self.websocket:
                try:
                    data = json.loads(message_data)
                    message = ModuleMessage.from_dict(data)
                    await self.message_queue.put(message)
                except Exception as e:
                    print(f"Message parsing error: {e}")
        except websockets.exceptions.ConnectionClosed:
            self.connected = False
    
    async def send_message(self, message: ModuleMessage) -> bool:
        """Send message via WebSocket"""
        if not self.connected or not self.websocket:
            return False
        
        try:
            message_json = json.dumps(message.to_dict(), default=str)
            await self.websocket.send(message_json)
            return True
        except Exception as e:
            print(f"WebSocket send error: {e}")
            return False
    
    async def receive_message(self) -> Optional[ModuleMessage]:
        """Receive message from queue"""
        try:
            return await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
        except asyncio.TimeoutError:
            return None
    
    async def health_check(self) -> bool:
        """Check WebSocket connection health"""
        return self.connected and self.websocket and not self.websocket.closed
    
    async def close(self):
        """Close WebSocket connection"""
        if self.websocket:
            await self.websocket.close()
            self.connected = False

class MessageBrokerProtocol(CommunicationProtocol):
    """Message broker-based communication (Redis/RabbitMQ style)"""
    
    def __init__(self, broker_config: Dict[str, Any]):
        self.broker_config = broker_config
        self.broker_type = broker_config.get('type', 'redis')
        self.connection = None
        self.subscriber = None
        
    async def connect(self) -> bool:
        """Connect to message broker"""
        try:
            if self.broker_type == 'redis':
                import redis.asyncio as redis
                self.connection = redis.Redis(
                    host=self.broker_config.get('host', 'localhost'),
                    port=self.broker_config.get('port', 6379),
                    decode_responses=True
                )
                await self.connection.ping()
                return True
                
        except Exception as e:
            print(f"Broker connection error: {e}")
            return False
    
    async def send_message(self, message: ModuleMessage) -> bool:
        """Send message to broker queue"""
        if not self.connection:
            return False
        
        try:
            queue_name = f"module:{message.header.target_module}"
            message_json = json.dumps(message.to_dict(), default=str)
            
            if self.broker_type == 'redis':
                await self.connection.lpush(queue_name, message_json)
                return True
                
        except Exception as e:
            print(f"Broker send error: {e}")
            return False
    
    async def receive_message(self) -> Optional[ModuleMessage]:
        """Receive message from broker queue"""
        if not self.connection:
            return None
        
        try:
            if self.broker_type == 'redis':
                # This would be set based on the module's own queue
                queue_name = "module:current"  # This should be configurable
                result = await self.connection.brpop(queue_name, timeout=1)
                
                if result:
                    _, message_json = result
                    data = json.loads(message_json)
                    return ModuleMessage.from_dict(data)
                    
        except Exception as e:
            print(f"Broker receive error: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check broker connection health"""
        try:
            if self.connection and self.broker_type == 'redis':
                await self.connection.ping()
                return True
        except:
            pass
        return False
    
    async def close(self):
        """Close broker connection"""
        if self.connection:
            await self.connection.close()

class StreamingProtocol:
    """Protocol for streaming large responses or real-time data"""
    
    def __init__(self, base_protocol: CommunicationProtocol):
        self.base_protocol = base_protocol
        self.active_streams: Dict[str, asyncio.Queue] = {}
    
    async def start_stream(self, stream_id: str, target_module: str) -> bool:
        """Start a streaming session"""
        stream_message = ModuleMessage(
            header=MessageHeader(
                message_type=MessageType.STREAM_START,
                target_module=target_module,
                correlation_id=stream_id
            ),
            payload={'stream_id': stream_id}
        )
        
        success = await self.base_protocol.send_message(stream_message)
        if success:
            self.active_streams[stream_id] = asyncio.Queue()
        
        return success
    
    async def send_stream_data(self, stream_id: str, data: Any, 
                              target_module: str) -> bool:
        """Send data chunk in stream"""
        stream_message = ModuleMessage(
            header=MessageHeader(
                message_type=MessageType.STREAM_DATA,
                target_module=target_module,
                correlation_id=stream_id
            ),
            payload={'stream_id': stream_id, 'data': data}
        )
        
        return await self.base_protocol.send_message(stream_message)
    
    async def end_stream(self, stream_id: str, target_module: str) -> bool:
        """End streaming session"""
        stream_message = ModuleMessage(
            header=MessageHeader(
                message_type=MessageType.STREAM_END,
                target_module=target_module,
                correlation_id=stream_id
            ),
            payload={'stream_id': stream_id}
        )
        
        success = await self.base_protocol.send_message(stream_message)
        if stream_id in self.active_streams:
            del self.active_streams[stream_id]
        
        return success
    
    async def receive_stream_data(self, stream_id: str) -> Optional[Any]:
        """Receive data from stream"""
        if stream_id not in self.active_streams:
            return None
        
        try:
            return await asyncio.wait_for(
                self.active_streams[stream_id].get(), 
                timeout=1.0
            )
        except asyncio.TimeoutError:
            return None

class SecurityProtocol:
    """Security layer for module communications"""
    
    def __init__(self, encryption_key: Optional[str] = None):
        self.encryption_key = encryption_key
        self.authenticated_modules: Dict[str, Dict[str, Any]] = {}
        self.rate_limits: Dict[str, List[datetime]] = {}
        
    def authenticate_module(self, module_id: str, credentials: Dict[str, Any]) -> bool:
        """Authenticate a module for communication"""
        # In production, this would validate against proper auth system
        if self._validate_credentials(credentials):
            self.authenticated_modules[module_id] = {
                'authenticated_at': datetime.utcnow(),
                'permissions': credentials.get('permissions', [])
            }
            return True
        return False
    
    def _validate_credentials(self, credentials: Dict[str, Any]) -> bool:
        """Validate module credentials"""
        # Simplified validation - in production use proper auth
        required_fields = ['module_id', 'api_key', 'signature']
        return all(field in credentials for field in required_fields)
    
    def authorize_message(self, message: ModuleMessage) -> bool:
        """Check if module is authorized to send this message"""
        source_module = message.header.source_module
        
        # Check authentication
        if source_module not in self.authenticated_modules:
            return False
        
        # Check rate limiting
        if not self._check_rate_limit(source_module):
            return False
        
        # Check permissions (simplified)
        auth_info = self.authenticated_modules[source_module]
        permissions = auth_info.get('permissions', [])
        
        # Example permission checks
        if message.header.priority == Priority.CRITICAL and 'critical_operations' not in permissions:
            return False
        
        return True
    
    def _check_rate_limit(self, module_id: str, 
                         max_requests: int = 1000, 
                         window_minutes: int = 1) -> bool:
        """Check rate limiting for module"""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        if module_id not in self.rate_limits:
            self.rate_limits[module_id] = []
        
        # Clean old requests
        self.rate_limits[module_id] = [
            req_time for req_time in self.rate_limits[module_id]
            if req_time > window_start
        ]
        
        # Check limit
        if len(self.rate_limits[module_id]) >= max_requests:
            return False
        
        # Add current request
        self.rate_limits[module_id].append(now)
        return True
    
    def encrypt_message(self, message: ModuleMessage) -> ModuleMessage:
        """Encrypt sensitive message content"""
        if not self.encryption_key:
            return message
        
        # In production, implement proper encryption
        # This is a placeholder for encryption logic
        encrypted_payload = self._encrypt_data(message.payload)
        
        message.payload = {'encrypted': True, 'data': encrypted_payload}
        return message
    
    def decrypt_message(self, message: ModuleMessage) -> ModuleMessage:
        """Decrypt message content"""
        if not self.encryption_key or not message.payload.get('encrypted'):
            return message
        
        # In production, implement proper decryption
        decrypted_payload = self._decrypt_data(message.payload['data'])
        message.payload = decrypted_payload
        return message
    
    def _encrypt_data(self, data: Any) -> str:
        """Encrypt data (placeholder implementation)"""
        import base64
        json_data = json.dumps(data, default=str)
        return base64.b64encode(json_data.encode()).decode()
    
    def _decrypt_data(self, encrypted_data: str) -> Any:
        """Decrypt data (placeholder implementation)"""
        import base64
        json_data = base64.b64decode(encrypted_data.encode()).decode()
        return json.loads(json_data)

class CommunicationManager:
    """Central manager for module communications"""
    
    def __init__(self):
        self.protocols: Dict[str, CommunicationProtocol] = {}
        self.security = SecurityProtocol()
        self.message_handlers: Dict[MessageType, Callable] = {}
        self.routing_table: Dict[str, str] = {}  # module_id -> protocol_id
        
    def register_protocol(self, protocol_id: str, protocol: CommunicationProtocol):
        """Register a communication protocol"""
        self.protocols[protocol_id] = protocol
    
    def register_module_route(self, module_id: str, protocol_id: str):
        """Register which protocol to use for a module"""
        self.routing_table[module_id] = protocol_id
    
    def register_message_handler(self, message_type: MessageType, 
                                handler: Callable[[ModuleMessage], None]):
        """Register handler for specific message types"""
        self.message_handlers[message_type] = handler
    
    async def send_message(self, message: ModuleMessage) -> bool:
        """Send message using appropriate protocol"""
        # Security check
        if not self.security.authorize_message(message):
            print(f"Message authorization failed for {message.header.source_module}")
            return False
        
        # Encrypt if needed
        message = self.security.encrypt_message(message)
        
        # Get protocol for target module
        target_module = message.header.target_module
        protocol_id = self.routing_table.get(target_module)
        
        if not protocol_id or protocol_id not in self.protocols:
            print(f"No protocol found for module {target_module}")
            return False
        
        protocol = self.protocols[protocol_id]
        return await protocol.send_message(message)
    
    async def send_request(self, message: ModuleMessage) -> Optional[ModuleMessage]:
        """Send request and wait for response"""
        target_module = message.header.target_module
        protocol_id = self.routing_table.get(target_module)
        
        if not protocol_id or protocol_id not in self.protocols:
            return None
        
        protocol = self.protocols[protocol_id]
        
        # For HTTP protocol, use direct request-response
        if isinstance(protocol, HTTPProtocol):
            message = self.security.encrypt_message(message)
            response = await protocol.send_request_and_wait(message)
            if response:
                response = self.security.decrypt_message(response)
            return response
        
        # For other protocols, implement correlation-based matching
        # This would require more complex correlation tracking
        return None
    
    async def handle_incoming_message(self, message: ModuleMessage):
        """Handle incoming message based on type"""
        # Decrypt if needed
        message = self.security.decrypt_message(message)
        
        # Find and execute handler
        message_type = message.header.message_type
        if message_type in self.message_handlers:
            handler = self.message_handlers[message_type]
            await handler(message)
        else:
            print(f"No handler for message type: {message_type.value}")
    
    async def health_check_all(self) -> Dict[str, bool]:
        """Check health of all protocols"""
        health_status = {}
        
        for protocol_id, protocol in self.protocols.items():
            try:
                health_status[protocol_id] = await protocol.health_check()
            except Exception as e:
                health_status[protocol_id] = False
                print(f"Health check failed for {protocol_id}: {e}")
        
        return health_status

# Example usage
if __name__ == "__main__":
    async def example_usage():
        # Create communication manager
        comm_manager = CommunicationManager()
        
        # Register HTTP protocol for foundation module
        http_protocol = HTTPProtocol("http://foundation-module:8080")
        comm_manager.register_protocol("http_foundation", http_protocol)
        comm_manager.register_module_route("foundation", "http_foundation")
        
        # Create a sample message
        message = ModuleMessage(
            header=MessageHeader(
                source_module="router",
                target_module="foundation",
                message_type=MessageType.REQUEST
            ),
            payload={
                "query": "What is machine learning?",
                "parameters": {"max_tokens": 100}
            }
        )
        
        # Send message
        success = await comm_manager.send_message(message)
        print(f"Message sent: {success}")
        
        # Check health
        health = await comm_manager.health_check_all()
        print(f"Health status: {health}")

    # Run example
    asyncio.run(example_usage())
