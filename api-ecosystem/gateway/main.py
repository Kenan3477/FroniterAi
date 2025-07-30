"""
Frontier API Gateway
Enterprise-grade API gateway with authentication, rate limiting, and routing
"""

import asyncio
import json
import time
import hashlib
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import logging

import asyncio
import aiohttp
import aioredis
from aiohttp import web, web_request, web_response
from aiohttp.web_middlewares import cors_handler
import jwt
import yaml
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import structlog

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = structlog.get_logger()

@dataclass
class ApiUser:
    """API user representation"""
    user_id: str
    tier: str
    scopes: List[str]
    api_key: Optional[str] = None
    email: Optional[str] = None
    organization: Optional[str] = None

@dataclass
class RateLimitResult:
    """Rate limiting result"""
    allowed: bool
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None

class PrometheusMetrics:
    """Prometheus metrics collector"""
    
    def __init__(self):
        self.request_count = Counter(
            'api_requests_total',
            'Total API requests',
            ['method', 'endpoint', 'status_code', 'user_tier']
        )
        
        self.request_duration = Histogram(
            'api_request_duration_seconds',
            'Request duration in seconds',
            ['method', 'endpoint'],
            buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60]
        )
        
        self.rate_limit_hits = Counter(
            'api_rate_limit_hits_total',
            'Rate limit hits',
            ['user_id', 'tier', 'endpoint']
        )
        
        self.active_connections = Gauge(
            'api_active_connections',
            'Active API connections'
        )
        
        self.upstream_health = Gauge(
            'api_upstream_health',
            'Upstream service health status',
            ['service']
        )

class RateLimiter:
    """Redis-based rate limiter with sliding window"""
    
    def __init__(self, redis_client: aioredis.Redis, config: Dict):
        self.redis = redis_client
        self.config = config
        
    async def check_rate_limit(self, user: ApiUser, endpoint: str) -> RateLimitResult:
        """Check if request is within rate limits"""
        now = int(time.time())
        
        # Get limits for user tier and endpoint
        limits = self._get_limits(user.tier, endpoint)
        
        # Check each time window
        for window, limit in limits.items():
            window_seconds = self._parse_window(window)
            key = f"rate_limit:{user.user_id}:{endpoint}:{window}"
            
            # Use sliding window counter
            result = await self._sliding_window_check(key, window_seconds, limit, now)
            if not result.allowed:
                return result
        
        return RateLimitResult(
            allowed=True,
            remaining=limits.get('requests_per_minute', 1000) - 1,
            reset_time=datetime.fromtimestamp(now + 60)
        )
    
    def _get_limits(self, tier: str, endpoint: str) -> Dict[str, int]:
        """Get rate limits for tier and endpoint"""
        # Tier-based limits
        tier_limits = self.config['rate_limiting']['tiers'].get(tier, 
                     self.config['rate_limiting']['global'])
        
        # Endpoint-specific overrides
        endpoint_limits = {}
        for pattern, limits in self.config['rate_limiting']['endpoints'].items():
            if self._match_pattern(endpoint, pattern):
                endpoint_limits.update(limits)
        
        # Merge limits (endpoint-specific takes precedence)
        result = dict(tier_limits)
        result.update(endpoint_limits)
        return result
    
    def _parse_window(self, window: str) -> int:
        """Parse window string to seconds"""
        mapping = {
            'requests_per_minute': 60,
            'requests_per_hour': 3600,
            'requests_per_day': 86400
        }
        return mapping.get(window, 60)
    
    def _match_pattern(self, endpoint: str, pattern: str) -> bool:
        """Simple pattern matching for endpoints"""
        if pattern.endswith('*'):
            return endpoint.startswith(pattern[:-1])
        return endpoint == pattern
    
    async def _sliding_window_check(self, key: str, window: int, limit: int, now: int) -> RateLimitResult:
        """Implement sliding window rate limiting"""
        # Remove expired entries
        await self.redis.zremrangebyscore(key, 0, now - window)
        
        # Count current requests
        current_count = await self.redis.zcard(key)
        
        if current_count >= limit:
            # Get oldest entry to calculate reset time
            oldest = await self.redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                reset_time = datetime.fromtimestamp(oldest[0][1] + window)
                retry_after = int((reset_time - datetime.now()).total_seconds())
            else:
                reset_time = datetime.fromtimestamp(now + window)
                retry_after = window
            
            return RateLimitResult(
                allowed=False,
                remaining=0,
                reset_time=reset_time,
                retry_after=retry_after
            )
        
        # Add current request
        await self.redis.zadd(key, {str(now): now})
        await self.redis.expire(key, window)
        
        return RateLimitResult(
            allowed=True,
            remaining=limit - current_count - 1,
            reset_time=datetime.fromtimestamp(now + window)
        )

class AuthenticationManager:
    """Handle multiple authentication methods"""
    
    def __init__(self, config: Dict, redis_client: aioredis.Redis):
        self.config = config
        self.redis = redis_client
        
    async def authenticate(self, request: web_request.Request) -> Optional[ApiUser]:
        """Authenticate request using multiple methods"""
        
        # Try API key authentication
        if self.config['authentication']['providers']['api_key']['enabled']:
            user = await self._authenticate_api_key(request)
            if user:
                return user
        
        # Try JWT authentication
        if self.config['authentication']['providers']['jwt']['enabled']:
            user = await self._authenticate_jwt(request)
            if user:
                return user
        
        # Try OAuth2 authentication
        if self.config['authentication']['providers']['oauth2']['enabled']:
            user = await self._authenticate_oauth2(request)
            if user:
                return user
        
        return None
    
    async def _authenticate_api_key(self, request: web_request.Request) -> Optional[ApiUser]:
        """Authenticate using API key"""
        config = self.config['authentication']['providers']['api_key']
        
        # Get API key from header or query param
        api_key = (
            request.headers.get(config['header_name']) or
            request.query.get(config['query_param'])
        )
        
        if not api_key or not api_key.startswith(config['prefix']):
            return None
        
        # Look up API key in cache/database
        user_data = await self.redis.get(f"api_key:{api_key}")
        if not user_data:
            return None
        
        user_info = json.loads(user_data)
        return ApiUser(
            user_id=user_info['user_id'],
            tier=user_info['tier'],
            scopes=user_info['scopes'],
            api_key=api_key,
            email=user_info.get('email'),
            organization=user_info.get('organization')
        )
    
    async def _authenticate_jwt(self, request: web_request.Request) -> Optional[ApiUser]:
        """Authenticate using JWT token"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]  # Remove 'Bearer '
        
        try:
            # Verify JWT token (simplified - use proper key management in production)
            config = self.config['authentication']['providers']['jwt']
            payload = jwt.decode(
                token,
                'your-secret-key',  # Use proper key management
                algorithms=[config['algorithm']],
                issuer=config['issuer'],
                audience=config['audience'],
                leeway=config['leeway']
            )
            
            return ApiUser(
                user_id=payload['sub'],
                tier=payload.get('tier', 'free'),
                scopes=payload.get('scopes', []),
                email=payload.get('email'),
                organization=payload.get('org')
            )
            
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid JWT token", error=str(e))
            return None
    
    async def _authenticate_oauth2(self, request: web_request.Request) -> Optional[ApiUser]:
        """Authenticate using OAuth2 token"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        
        # Validate token with OAuth2 provider (implementation depends on provider)
        # This is a simplified example
        config = self.config['authentication']['providers']['oauth2']
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    config['userinfo_url'],
                    headers={'Authorization': f'Bearer {token}'}
                ) as response:
                    if response.status == 200:
                        user_info = await response.json()
                        return ApiUser(
                            user_id=user_info['sub'],
                            tier=user_info.get('tier', 'free'),
                            scopes=user_info.get('scopes', []),
                            email=user_info.get('email'),
                            organization=user_info.get('organization')
                        )
        except Exception as e:
            logger.warning("OAuth2 validation failed", error=str(e))
        
        return None

class LoadBalancer:
    """Upstream load balancer with health checking"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.server_health = {}
        self.current_server = {}
        
    async def get_upstream_server(self, service_name: str) -> Optional[str]:
        """Get healthy upstream server using configured strategy"""
        service_config = self.config['upstream_services'].get(service_name)
        if not service_config:
            return None
        
        healthy_servers = [
            server for server in service_config['servers']
            if self.server_health.get(f"{service_name}:{server['url']}", False)
        ]
        
        if not healthy_servers:
            # Fall back to all servers if none are healthy
            healthy_servers = service_config['servers']
        
        strategy = self.config['load_balancer']['strategy']
        
        if strategy == 'round_robin':
            return self._round_robin_select(service_name, healthy_servers)
        elif strategy == 'least_connections':
            return self._least_connections_select(healthy_servers)
        elif strategy == 'ip_hash':
            return self._ip_hash_select(healthy_servers)
        
        return healthy_servers[0]['url'] if healthy_servers else None
    
    def _round_robin_select(self, service_name: str, servers: List[Dict]) -> str:
        """Round-robin server selection"""
        current = self.current_server.get(service_name, 0)
        server = servers[current % len(servers)]
        self.current_server[service_name] = current + 1
        return server['url']
    
    def _least_connections_select(self, servers: List[Dict]) -> str:
        """Select server with least connections (simplified)"""
        # In a real implementation, track active connections per server
        return servers[0]['url']
    
    def _ip_hash_select(self, servers: List[Dict]) -> str:
        """Select server based on client IP hash"""
        # In a real implementation, use client IP for consistent hashing
        return servers[0]['url']
    
    async def start_health_checks(self):
        """Start background health checking"""
        while True:
            await self._check_all_servers()
            await asyncio.sleep(self.config['load_balancer']['health_check']['interval'])
    
    async def _check_all_servers(self):
        """Check health of all upstream servers"""
        for service_name, service_config in self.config['upstream_services'].items():
            for server in service_config['servers']:
                health_url = f"{server['url']}{service_config['health_check']}"
                is_healthy = await self._check_server_health(health_url)
                self.server_health[f"{service_name}:{server['url']}"] = is_healthy
    
    async def _check_server_health(self, health_url: str) -> bool:
        """Check individual server health"""
        try:
            timeout = self.config['load_balancer']['health_check']['timeout']
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                async with session.get(health_url) as response:
                    return response.status == 200
        except Exception:
            return False

class ApiGateway:
    """Main API Gateway class"""
    
    def __init__(self, config_path: str):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.redis = None
        self.auth_manager = None
        self.rate_limiter = None
        self.load_balancer = None
        self.metrics = PrometheusMetrics()
        
    async def initialize(self):
        """Initialize gateway components"""
        # Initialize Redis
        redis_url = self.config.get('redis_url', 'redis://localhost:6379')
        self.redis = await aioredis.from_url(redis_url)
        
        # Initialize components
        self.auth_manager = AuthenticationManager(self.config, self.redis)
        self.rate_limiter = RateLimiter(self.redis, self.config)
        self.load_balancer = LoadBalancer(self.config)
        
        # Start health checks
        asyncio.create_task(self.load_balancer.start_health_checks())
        
    async def create_app(self) -> web.Application:
        """Create aiohttp application with middleware"""
        app = web.Application(middlewares=[
            self.cors_middleware,
            self.auth_middleware,
            self.rate_limit_middleware,
            self.metrics_middleware,
            self.error_middleware
        ])
        
        # Add routes
        self._setup_routes(app)
        
        return app
    
    def _setup_routes(self, app: web.Application):
        """Setup API routes"""
        # Health check
        app.router.add_get('/health', self.health_check)
        app.router.add_get('/health/detailed', self.detailed_health_check)
        
        # Metrics endpoint
        app.router.add_get('/metrics', self.metrics_endpoint)
        
        # API routes (catch-all for proxying)
        app.router.add_route('*', '/api/{path:.*}', self.proxy_request)
        app.router.add_route('*', '/graphql', self.proxy_graphql)
        
        # WebSocket support
        app.router.add_get('/ws', self.websocket_handler)
    
    @web.middleware
    async def cors_middleware(self, request: web_request.Request, handler):
        """CORS middleware"""
        cors_config = self.config['server']['cors']
        
        if request.method == 'OPTIONS':
            response = web.Response()
        else:
            response = await handler(request)
        
        if cors_config['enabled']:
            # Add CORS headers
            origin = request.headers.get('Origin')
            if origin and self._is_allowed_origin(origin, cors_config['origins']):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = ', '.join(cors_config['methods'])
                response.headers['Access-Control-Allow-Headers'] = ', '.join(cors_config['headers'])
                response.headers['Access-Control-Max-Age'] = '86400'
        
        return response
    
    def _is_allowed_origin(self, origin: str, allowed_origins: List[str]) -> bool:
        """Check if origin is allowed"""
        for allowed in allowed_origins:
            if allowed == '*' or origin == allowed:
                return True
            if allowed.startswith('*.') and origin.endswith(allowed[1:]):
                return True
            if allowed.startswith('http://localhost:') and origin.startswith('http://localhost:'):
                return True
        return False
    
    @web.middleware
    async def auth_middleware(self, request: web_request.Request, handler):
        """Authentication middleware"""
        # Skip auth for health checks and metrics
        if request.path in ['/health', '/health/detailed', '/metrics']:
            return await handler(request)
        
        user = await self.auth_manager.authenticate(request)
        request['user'] = user
        
        return await handler(request)
    
    @web.middleware
    async def rate_limit_middleware(self, request: web_request.Request, handler):
        """Rate limiting middleware"""
        if not self.config['rate_limiting']['enabled']:
            return await handler(request)
        
        user = request.get('user')
        if not user:
            # Apply anonymous rate limits
            user = ApiUser(user_id='anonymous', tier='free', scopes=[])
        
        endpoint = request.path
        rate_limit_result = await self.rate_limiter.check_rate_limit(user, endpoint)
        
        if not rate_limit_result.allowed:
            self.metrics.rate_limit_hits.labels(
                user_id=user.user_id,
                tier=user.tier,
                endpoint=endpoint
            ).inc()
            
            response = web.json_response({
                'error': 'Rate limit exceeded',
                'retry_after': rate_limit_result.retry_after
            }, status=429)
            
            response.headers['X-RateLimit-Limit'] = '1000'  # From config
            response.headers['X-RateLimit-Remaining'] = str(rate_limit_result.remaining)
            response.headers['X-RateLimit-Reset'] = str(int(rate_limit_result.reset_time.timestamp()))
            if rate_limit_result.retry_after:
                response.headers['Retry-After'] = str(rate_limit_result.retry_after)
            
            return response
        
        # Add rate limit headers to response
        response = await handler(request)
        response.headers['X-RateLimit-Remaining'] = str(rate_limit_result.remaining)
        response.headers['X-RateLimit-Reset'] = str(int(rate_limit_result.reset_time.timestamp()))
        
        return response
    
    @web.middleware
    async def metrics_middleware(self, request: web_request.Request, handler):
        """Metrics collection middleware"""
        start_time = time.time()
        
        try:
            response = await handler(request)
            status_code = response.status
        except Exception as e:
            status_code = 500
            raise
        finally:
            duration = time.time() - start_time
            user = request.get('user')
            tier = user.tier if user else 'anonymous'
            
            # Record metrics
            self.metrics.request_count.labels(
                method=request.method,
                endpoint=request.path,
                status_code=status_code,
                user_tier=tier
            ).inc()
            
            self.metrics.request_duration.labels(
                method=request.method,
                endpoint=request.path
            ).observe(duration)
        
        return response
    
    @web.middleware
    async def error_middleware(self, request: web_request.Request, handler):
        """Error handling middleware"""
        try:
            return await handler(request)
        except web.HTTPException:
            raise
        except Exception as e:
            logger.error("Unhandled error", error=str(e), path=request.path)
            
            error_config = self.config['error_handling']
            error_response = {
                'error': 'Internal server error',
                'message': 'An unexpected error occurred'
            }
            
            if error_config['error_format']['include_correlation_id']:
                error_response['correlation_id'] = request.headers.get('X-Correlation-ID', 'unknown')
            
            if error_config['error_format']['include_details']:
                error_response['details'] = str(e)
            
            return web.json_response(error_response, status=500)
    
    async def proxy_request(self, request: web_request.Request) -> web_response.Response:
        """Proxy request to upstream service"""
        path = request.match_info['path']
        
        # Determine upstream service
        service_name = self._get_service_name(f"/api/{path}")
        if not service_name:
            return web.json_response({'error': 'Service not found'}, status=404)
        
        # Get upstream server
        upstream_url = await self.load_balancer.get_upstream_server(service_name)
        if not upstream_url:
            return web.json_response({'error': 'Service unavailable'}, status=503)
        
        # Check authorization
        user = request.get('user')
        if not self._check_authorization(user, f"/api/{path}", request.method):
            return web.json_response({'error': 'Insufficient permissions'}, status=403)
        
        # Proxy request
        return await self._proxy_to_upstream(request, upstream_url, f"/{path}")
    
    async def proxy_graphql(self, request: web_request.Request) -> web_response.Response:
        """Proxy GraphQL request"""
        service_name = 'graphql-service'
        upstream_url = await self.load_balancer.get_upstream_server(service_name)
        
        if not upstream_url:
            return web.json_response({'error': 'GraphQL service unavailable'}, status=503)
        
        user = request.get('user')
        if not user:
            return web.json_response({'error': 'Authentication required'}, status=401)
        
        return await self._proxy_to_upstream(request, upstream_url, '/graphql')
    
    async def websocket_handler(self, request: web_request.Request) -> web_response.WebSocketResponse:
        """Handle WebSocket connections"""
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        
        user = request.get('user')
        if not user:
            await ws.close(code=4001, message=b'Authentication required')
            return ws
        
        # Proxy WebSocket connection (simplified)
        # In production, implement proper WebSocket proxying
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                # Echo for demo
                await ws.send_str(f"Echo: {msg.data}")
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error("WebSocket error", error=ws.exception())
        
        return ws
    
    def _get_service_name(self, path: str) -> Optional[str]:
        """Determine service name from path"""
        route_config = self.config['routes']['rest']
        
        for service_name, service_config in route_config.items():
            if service_name in ['base_path', 'version']:
                continue
                
            service_path = service_config.get('path', '')
            if path.startswith(f"/api/v1{service_path}"):
                return service_config.get('upstream')
        
        return None
    
    def _check_authorization(self, user: Optional[ApiUser], path: str, method: str) -> bool:
        """Check if user is authorized for endpoint"""
        if not user:
            return False
        
        # Find endpoint configuration
        route_config = self.config['routes']['rest']
        
        for service_name, service_config in route_config.items():
            if service_name in ['base_path', 'version']:
                continue
            
            service_path = service_config.get('path', '')
            if not path.startswith(f"/api/v1{service_path}"):
                continue
            
            # Check endpoint-specific authorization
            for endpoint in service_config.get('endpoints', []):
                endpoint_path = f"/api/v1{service_path}{endpoint['path']}"
                if path.startswith(endpoint_path) and method in endpoint.get('methods', []):
                    if endpoint.get('auth_required', False):
                        required_scopes = endpoint.get('scopes', [])
                        return any(scope in user.scopes for scope in required_scopes)
                    return True
        
        return False
    
    async def _proxy_to_upstream(self, request: web_request.Request, upstream_url: str, path: str) -> web_response.Response:
        """Proxy request to upstream service"""
        # Prepare request
        url = f"{upstream_url}{path}"
        if request.query_string:
            url += f"?{request.query_string}"
        
        headers = dict(request.headers)
        # Remove hop-by-hop headers
        for header in ['connection', 'upgrade', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'transfer-encoding']:
            headers.pop(header, None)
        
        # Add correlation ID
        correlation_id = request.headers.get('X-Correlation-ID', self._generate_correlation_id())
        headers['X-Correlation-ID'] = correlation_id
        
        # Get request body
        body = None
        if request.method in ['POST', 'PUT', 'PATCH']:
            body = await request.read()
        
        # Make upstream request
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    request.method,
                    url,
                    headers=headers,
                    data=body,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as upstream_response:
                    # Read response
                    response_body = await upstream_response.read()
                    
                    # Create response
                    response = web.Response(
                        body=response_body,
                        status=upstream_response.status,
                        headers=upstream_response.headers
                    )
                    
                    # Add gateway headers
                    response.headers['X-Gateway-Version'] = 'v1'
                    response.headers['X-Correlation-ID'] = correlation_id
                    
                    return response
                    
        except asyncio.TimeoutError:
            return web.json_response({'error': 'Upstream timeout'}, status=504)
        except Exception as e:
            logger.error("Upstream request failed", error=str(e), url=url)
            return web.json_response({'error': 'Upstream error'}, status=502)
    
    def _generate_correlation_id(self) -> str:
        """Generate unique correlation ID"""
        return hashlib.md5(f"{time.time()}{id(self)}".encode()).hexdigest()[:16]
    
    async def health_check(self, request: web_request.Request) -> web_response.Response:
        """Basic health check"""
        return web.json_response({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})
    
    async def detailed_health_check(self, request: web_request.Request) -> web_response.Response:
        """Detailed health check"""
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {
                'redis': await self._check_redis_health(),
                'upstream_services': await self._check_upstream_health()
            }
        }
        
        # Determine overall status
        component_statuses = [comp['status'] for comp in health_status['components'].values()]
        if 'unhealthy' in component_statuses:
            health_status['status'] = 'unhealthy'
        elif 'degraded' in component_statuses:
            health_status['status'] = 'degraded'
        
        status_code = 200 if health_status['status'] == 'healthy' else 503
        return web.json_response(health_status, status=status_code)
    
    async def _check_redis_health(self) -> Dict[str, Any]:
        """Check Redis health"""
        try:
            await self.redis.ping()
            return {'status': 'healthy', 'message': 'Redis is responding'}
        except Exception as e:
            return {'status': 'unhealthy', 'message': f'Redis error: {str(e)}'}
    
    async def _check_upstream_health(self) -> Dict[str, Any]:
        """Check upstream services health"""
        services_health = {}
        
        for service_name in self.config['upstream_services']:
            healthy_servers = sum(
                1 for server_key, is_healthy in self.load_balancer.server_health.items()
                if server_key.startswith(f"{service_name}:") and is_healthy
            )
            total_servers = len(self.config['upstream_services'][service_name]['servers'])
            
            if healthy_servers == total_servers:
                status = 'healthy'
            elif healthy_servers > 0:
                status = 'degraded'
            else:
                status = 'unhealthy'
            
            services_health[service_name] = {
                'status': status,
                'healthy_servers': healthy_servers,
                'total_servers': total_servers
            }
        
        # Determine overall upstream health
        statuses = [service['status'] for service in services_health.values()]
        if 'unhealthy' in statuses:
            overall_status = 'unhealthy'
        elif 'degraded' in statuses:
            overall_status = 'degraded'
        else:
            overall_status = 'healthy'
        
        return {
            'status': overall_status,
            'services': services_health
        }
    
    async def metrics_endpoint(self, request: web_request.Request) -> web_response.Response:
        """Prometheus metrics endpoint"""
        metrics_data = generate_latest()
        return web.Response(body=metrics_data, content_type='text/plain; version=0.0.4; charset=utf-8')

async def main():
    """Main application entry point"""
    # Load configuration
    gateway = ApiGateway('config/gateway.yaml')
    await gateway.initialize()
    
    # Create and run application
    app = await gateway.create_app()
    
    # Server configuration
    host = gateway.config['server']['host']
    port = gateway.config['server']['port']
    
    logger.info("Starting Frontier API Gateway", host=host, port=port)
    
    web.run_app(app, host=host, port=port)

if __name__ == '__main__':
    asyncio.run(main())
