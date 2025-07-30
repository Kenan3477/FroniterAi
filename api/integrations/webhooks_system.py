"""
Webhooks System for Real-time Data Synchronization
Handles incoming webhooks from various business tools and triggers sync operations
"""

import asyncio
import aiohttp
import json
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import uuid
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebhookStatus(Enum):
    """Webhook delivery status"""
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"

class WebhookEventType(Enum):
    """Types of webhook events"""
    CONTACT_CREATED = "contact.created"
    CONTACT_UPDATED = "contact.updated"
    CONTACT_DELETED = "contact.deleted"
    COMPANY_CREATED = "company.created"
    COMPANY_UPDATED = "company.updated"
    COMPANY_DELETED = "company.deleted"
    DEAL_CREATED = "deal.created"
    DEAL_UPDATED = "deal.updated"
    DEAL_DELETED = "deal.deleted"
    INVOICE_CREATED = "invoice.created"
    INVOICE_UPDATED = "invoice.updated"
    INVOICE_PAID = "invoice.paid"
    PAYMENT_CREATED = "payment.created"
    ACCOUNT_CREATED = "account.created"
    ACCOUNT_UPDATED = "account.updated"
    SYNC_REQUESTED = "sync.requested"
    CUSTOM = "custom"

@dataclass
class WebhookEvent:
    """Webhook event data structure"""
    id: str
    event_type: WebhookEventType
    source: str  # quickbooks, xero, salesforce, hubspot, etc.
    timestamp: datetime
    data: Dict[str, Any]
    signature: str = ""
    retry_count: int = 0
    max_retries: int = 3
    status: WebhookStatus = WebhookStatus.PENDING

@dataclass
class WebhookEndpoint:
    """Webhook endpoint configuration"""
    id: str
    url: str
    secret: str
    events: List[WebhookEventType]
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_delivery: Optional[datetime] = None
    delivery_count: int = 0
    failure_count: int = 0

@dataclass
class WebhookDelivery:
    """Webhook delivery attempt record"""
    id: str
    webhook_id: str
    endpoint_id: str
    event: WebhookEvent
    status: WebhookStatus
    http_status: Optional[int] = None
    response_body: str = ""
    delivery_time: Optional[datetime] = None
    error_message: str = ""
    attempt_number: int = 1

class WebhookValidationError(Exception):
    """Webhook validation error"""
    pass

class WebhookDeliveryError(Exception):
    """Webhook delivery error"""
    pass

class WebhookProcessor:
    """Process and validate incoming webhooks"""
    
    def __init__(self):
        self.handlers: Dict[str, Callable] = {}
        self.validators: Dict[str, Callable] = {}
    
    def register_handler(self, source: str, handler: Callable):
        """Register a webhook handler for a specific source"""
        self.handlers[source] = handler
        logger.info(f"Registered webhook handler for {source}")
    
    def register_validator(self, source: str, validator: Callable):
        """Register a webhook validator for a specific source"""
        self.validators[source] = validator
        logger.info(f"Registered webhook validator for {source}")
    
    def validate_quickbooks_webhook(self, payload: str, signature: str, secret: str) -> bool:
        """Validate QuickBooks webhook signature"""
        try:
            # QuickBooks uses HMAC-SHA256
            expected_signature = hmac.new(
                secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Remove 'sha256=' prefix if present
            if signature.startswith('sha256='):
                signature = signature[7:]
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"QuickBooks webhook validation error: {e}")
            return False
    
    def validate_xero_webhook(self, payload: str, signature: str, secret: str) -> bool:
        """Validate Xero webhook signature"""
        try:
            # Xero uses HMAC-SHA256 with base64 encoding
            import base64
            
            expected_signature = base64.b64encode(
                hmac.new(
                    secret.encode(),
                    payload.encode(),
                    hashlib.sha256
                ).digest()
            ).decode()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Xero webhook validation error: {e}")
            return False
    
    def validate_salesforce_webhook(self, payload: str, signature: str, secret: str) -> bool:
        """Validate Salesforce webhook signature"""
        try:
            # Salesforce uses SHA256 hash
            expected_signature = hashlib.sha256(
                (payload + secret).encode()
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"Salesforce webhook validation error: {e}")
            return False
    
    def validate_hubspot_webhook(self, payload: str, signature: str, secret: str, timestamp: str) -> bool:
        """Validate HubSpot webhook signature"""
        try:
            # HubSpot uses SHA256 with timestamp
            source_string = "POST" + "/webhooks/hubspot" + payload + timestamp
            
            expected_signature = hashlib.sha256(
                (source_string + secret).encode()
            ).hexdigest()
            
            # Check if signature is not too old (5 minutes)
            webhook_time = int(timestamp)
            current_time = int(time.time())
            
            if abs(current_time - webhook_time) > 300:  # 5 minutes
                logger.warning("HubSpot webhook timestamp too old")
                return False
            
            if signature.startswith('sha256='):
                signature = signature[7:]
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"HubSpot webhook validation error: {e}")
            return False
    
    async def process_webhook(self, source: str, payload: Dict[str, Any], 
                            headers: Dict[str, str]) -> WebhookEvent:
        """Process incoming webhook"""
        # Validate webhook if validator is registered
        if source in self.validators:
            payload_str = json.dumps(payload, sort_keys=True)
            signature = headers.get('x-signature', headers.get('x-hub-signature-256', ''))
            
            # Get secret from configuration (would be stored securely)
            secret = self._get_webhook_secret(source)
            
            if not self.validators[source](payload_str, signature, secret):
                raise WebhookValidationError(f"Invalid signature for {source} webhook")
        
        # Create webhook event
        event = WebhookEvent(
            id=str(uuid.uuid4()),
            event_type=self._determine_event_type(source, payload),
            source=source,
            timestamp=datetime.utcnow(),
            data=payload,
            signature=headers.get('x-signature', '')
        )
        
        # Process with handler if registered
        if source in self.handlers:
            await self.handlers[source](event)
        else:
            logger.warning(f"No handler registered for {source} webhooks")
        
        return event
    
    def _get_webhook_secret(self, source: str) -> str:
        """Get webhook secret for source (placeholder - would use secure storage)"""
        secrets = {
            "quickbooks": "qb_webhook_secret",
            "xero": "xero_webhook_secret",
            "salesforce": "sf_webhook_secret",
            "hubspot": "hs_webhook_secret"
        }
        return secrets.get(source, "default_secret")
    
    def _determine_event_type(self, source: str, payload: Dict[str, Any]) -> WebhookEventType:
        """Determine event type from payload"""
        # This would be customized based on each platform's webhook format
        event_mapping = {
            "quickbooks": {
                "Customer": {
                    "Create": WebhookEventType.CONTACT_CREATED,
                    "Update": WebhookEventType.CONTACT_UPDATED,
                    "Delete": WebhookEventType.CONTACT_DELETED
                },
                "Invoice": {
                    "Create": WebhookEventType.INVOICE_CREATED,
                    "Update": WebhookEventType.INVOICE_UPDATED
                },
                "Payment": {
                    "Create": WebhookEventType.PAYMENT_CREATED
                }
            },
            "hubspot": {
                "contact.creation": WebhookEventType.CONTACT_CREATED,
                "contact.propertyChange": WebhookEventType.CONTACT_UPDATED,
                "contact.deletion": WebhookEventType.CONTACT_DELETED,
                "company.creation": WebhookEventType.COMPANY_CREATED,
                "company.propertyChange": WebhookEventType.COMPANY_UPDATED,
                "deal.creation": WebhookEventType.DEAL_CREATED,
                "deal.propertyChange": WebhookEventType.DEAL_UPDATED
            }
        }
        
        # Extract event type based on source format
        if source == "quickbooks":
            entity_name = payload.get("QueryResponse", {}).get("entityName", "")
            operation = payload.get("QueryResponse", {}).get("operation", "")
            return event_mapping.get(source, {}).get(entity_name, {}).get(operation, WebhookEventType.CUSTOM)
        
        elif source == "hubspot":
            subscription_type = payload.get("subscriptionType", "")
            return event_mapping.get(source, {}).get(subscription_type, WebhookEventType.CUSTOM)
        
        return WebhookEventType.CUSTOM

class WebhookDeliveryManager:
    """Manage outbound webhook deliveries"""
    
    def __init__(self):
        self.endpoints: Dict[str, WebhookEndpoint] = {}
        self.deliveries: List[WebhookDelivery] = []
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def register_endpoint(self, endpoint: WebhookEndpoint):
        """Register a webhook endpoint"""
        self.endpoints[endpoint.id] = endpoint
        logger.info(f"Registered webhook endpoint: {endpoint.url}")
    
    def unregister_endpoint(self, endpoint_id: str):
        """Unregister a webhook endpoint"""
        if endpoint_id in self.endpoints:
            del self.endpoints[endpoint_id]
            logger.info(f"Unregistered webhook endpoint: {endpoint_id}")
    
    async def deliver_webhook(self, event: WebhookEvent) -> List[WebhookDelivery]:
        """Deliver webhook to all registered endpoints"""
        deliveries = []
        
        for endpoint in self.endpoints.values():
            if not endpoint.is_active:
                continue
            
            # Check if endpoint is subscribed to this event type
            if event.event_type not in endpoint.events:
                continue
            
            delivery = await self._deliver_to_endpoint(event, endpoint)
            deliveries.append(delivery)
        
        return deliveries
    
    async def _deliver_to_endpoint(self, event: WebhookEvent, endpoint: WebhookEndpoint) -> WebhookDelivery:
        """Deliver webhook to a specific endpoint"""
        delivery = WebhookDelivery(
            id=str(uuid.uuid4()),
            webhook_id=event.id,
            endpoint_id=endpoint.id,
            event=event,
            status=WebhookStatus.PENDING
        )
        
        try:
            # Prepare payload
            payload = {
                "id": event.id,
                "event_type": event.event_type.value,
                "source": event.source,
                "timestamp": event.timestamp.isoformat(),
                "data": event.data
            }
            
            payload_str = json.dumps(payload, sort_keys=True)
            
            # Generate signature
            signature = self._generate_signature(payload_str, endpoint.secret)
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": f"sha256={signature}",
                "X-Webhook-Timestamp": str(int(time.time())),
                "X-Webhook-ID": event.id,
                "X-Webhook-Source": event.source
            }
            
            # Make delivery attempt
            async with self.session.post(
                endpoint.url,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                delivery.http_status = response.status
                delivery.response_body = await response.text()
                delivery.delivery_time = datetime.utcnow()
                
                if 200 <= response.status < 300:
                    delivery.status = WebhookStatus.DELIVERED
                    endpoint.delivery_count += 1
                    endpoint.last_delivery = datetime.utcnow()
                    logger.info(f"Webhook delivered successfully to {endpoint.url}")
                else:
                    delivery.status = WebhookStatus.FAILED
                    endpoint.failure_count += 1
                    logger.warning(f"Webhook delivery failed to {endpoint.url}: {response.status}")
        
        except Exception as e:
            delivery.status = WebhookStatus.FAILED
            delivery.error_message = str(e)
            endpoint.failure_count += 1
            logger.error(f"Webhook delivery error to {endpoint.url}: {e}")
        
        self.deliveries.append(delivery)
        return delivery
    
    def _generate_signature(self, payload: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook"""
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    async def retry_failed_deliveries(self):
        """Retry failed webhook deliveries"""
        failed_deliveries = [
            d for d in self.deliveries 
            if d.status == WebhookStatus.FAILED and d.event.retry_count < d.event.max_retries
        ]
        
        for delivery in failed_deliveries:
            if delivery.endpoint_id not in self.endpoints:
                continue
            
            endpoint = self.endpoints[delivery.endpoint_id]
            delivery.event.retry_count += 1
            delivery.event.status = WebhookStatus.RETRYING
            
            logger.info(f"Retrying webhook delivery {delivery.id} (attempt {delivery.event.retry_count})")
            
            # Wait before retry (exponential backoff)
            wait_time = 2 ** delivery.event.retry_count
            await asyncio.sleep(wait_time)
            
            # Attempt redelivery
            new_delivery = await self._deliver_to_endpoint(delivery.event, endpoint)
            
            if new_delivery.status == WebhookStatus.DELIVERED:
                delivery.event.status = WebhookStatus.DELIVERED

class WebhookManager:
    """Main webhook management system"""
    
    def __init__(self):
        self.processor = WebhookProcessor()
        self.delivery_manager = None
        self.event_queue: asyncio.Queue = asyncio.Queue()
        self.is_running = False
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.delivery_manager = await WebhookDeliveryManager().__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.delivery_manager:
            await self.delivery_manager.__aexit__(exc_type, exc_val, exc_tb)
    
    def setup_integrations(self):
        """Set up webhook handlers for all integrations"""
        # Register validators
        self.processor.register_validator("quickbooks", self.processor.validate_quickbooks_webhook)
        self.processor.register_validator("xero", self.processor.validate_xero_webhook)
        self.processor.register_validator("salesforce", self.processor.validate_salesforce_webhook)
        self.processor.register_validator("hubspot", self.processor.validate_hubspot_webhook)
        
        # Register handlers
        self.processor.register_handler("quickbooks", self._handle_quickbooks_webhook)
        self.processor.register_handler("xero", self._handle_xero_webhook)
        self.processor.register_handler("salesforce", self._handle_salesforce_webhook)
        self.processor.register_handler("hubspot", self._handle_hubspot_webhook)
    
    async def _handle_quickbooks_webhook(self, event: WebhookEvent):
        """Handle QuickBooks webhook events"""
        logger.info(f"Processing QuickBooks webhook: {event.event_type.value}")
        
        # Trigger sync operations based on event type
        if event.event_type in [WebhookEventType.CONTACT_CREATED, WebhookEventType.CONTACT_UPDATED]:
            await self._trigger_contact_sync("quickbooks", event.data)
        elif event.event_type in [WebhookEventType.INVOICE_CREATED, WebhookEventType.INVOICE_UPDATED]:
            await self._trigger_invoice_sync("quickbooks", event.data)
        elif event.event_type == WebhookEventType.PAYMENT_CREATED:
            await self._trigger_payment_sync("quickbooks", event.data)
    
    async def _handle_xero_webhook(self, event: WebhookEvent):
        """Handle Xero webhook events"""
        logger.info(f"Processing Xero webhook: {event.event_type.value}")
        
        # Similar to QuickBooks handling
        if event.event_type in [WebhookEventType.CONTACT_CREATED, WebhookEventType.CONTACT_UPDATED]:
            await self._trigger_contact_sync("xero", event.data)
        elif event.event_type in [WebhookEventType.INVOICE_CREATED, WebhookEventType.INVOICE_UPDATED]:
            await self._trigger_invoice_sync("xero", event.data)
    
    async def _handle_salesforce_webhook(self, event: WebhookEvent):
        """Handle Salesforce webhook events"""
        logger.info(f"Processing Salesforce webhook: {event.event_type.value}")
        
        # Handle CRM events
        if event.event_type in [WebhookEventType.CONTACT_CREATED, WebhookEventType.CONTACT_UPDATED]:
            await self._trigger_crm_contact_sync("salesforce", event.data)
        elif event.event_type in [WebhookEventType.COMPANY_CREATED, WebhookEventType.COMPANY_UPDATED]:
            await self._trigger_crm_account_sync("salesforce", event.data)
        elif event.event_type in [WebhookEventType.DEAL_CREATED, WebhookEventType.DEAL_UPDATED]:
            await self._trigger_crm_deal_sync("salesforce", event.data)
    
    async def _handle_hubspot_webhook(self, event: WebhookEvent):
        """Handle HubSpot webhook events"""
        logger.info(f"Processing HubSpot webhook: {event.event_type.value}")
        
        # Handle CRM events
        if event.event_type in [WebhookEventType.CONTACT_CREATED, WebhookEventType.CONTACT_UPDATED]:
            await self._trigger_crm_contact_sync("hubspot", event.data)
        elif event.event_type in [WebhookEventType.COMPANY_CREATED, WebhookEventType.COMPANY_UPDATED]:
            await self._trigger_crm_company_sync("hubspot", event.data)
        elif event.event_type in [WebhookEventType.DEAL_CREATED, WebhookEventType.DEAL_UPDATED]:
            await self._trigger_crm_deal_sync("hubspot", event.data)
    
    async def _trigger_contact_sync(self, source: str, data: Dict[str, Any]):
        """Trigger contact synchronization"""
        logger.info(f"Triggering contact sync for {source}")
        # Implementation would integrate with actual sync services
        pass
    
    async def _trigger_invoice_sync(self, source: str, data: Dict[str, Any]):
        """Trigger invoice synchronization"""
        logger.info(f"Triggering invoice sync for {source}")
        # Implementation would integrate with actual sync services
        pass
    
    async def _trigger_payment_sync(self, source: str, data: Dict[str, Any]):
        """Trigger payment synchronization"""
        logger.info(f"Triggering payment sync for {source}")
        # Implementation would integrate with actual sync services
        pass
    
    async def _trigger_crm_contact_sync(self, source: str, data: Dict[str, Any]):
        """Trigger CRM contact synchronization"""
        logger.info(f"Triggering CRM contact sync for {source}")
        # Implementation would integrate with actual sync services
        pass
    
    async def _trigger_crm_account_sync(self, source: str, data: Dict[str, Any]):
        """Trigger CRM account synchronization"""
        logger.info(f"Triggering CRM account sync for {source}")
        # Implementation would integrate with actual sync services
        pass
    
    async def _trigger_crm_company_sync(self, source: str, data: Dict[str, Any]):
        """Trigger CRM company synchronization"""
        logger.info(f"Triggering CRM company sync for {source}")
        # Implementation would integrate with actual sync services
        pass
    
    async def _trigger_crm_deal_sync(self, source: str, data: Dict[str, Any]):
        """Trigger CRM deal synchronization"""
        logger.info(f"Triggering CRM deal sync for {source}")
        # Implementation would integrate with actual sync services
        pass
    
    async def process_incoming_webhook(self, source: str, payload: Dict[str, Any], 
                                     headers: Dict[str, str]) -> WebhookEvent:
        """Process incoming webhook and queue for delivery"""
        event = await self.processor.process_webhook(source, payload, headers)
        
        # Queue event for outbound delivery
        await self.event_queue.put(event)
        
        return event
    
    async def start_event_processor(self):
        """Start processing queued events"""
        self.is_running = True
        
        while self.is_running:
            try:
                # Wait for events with timeout
                event = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                
                # Deliver webhook to registered endpoints
                deliveries = await self.delivery_manager.deliver_webhook(event)
                
                logger.info(f"Delivered webhook {event.id} to {len(deliveries)} endpoints")
                
            except asyncio.TimeoutError:
                # Check for failed deliveries to retry
                await self.delivery_manager.retry_failed_deliveries()
                continue
            except Exception as e:
                logger.error(f"Error processing webhook event: {e}")
    
    def stop_event_processor(self):
        """Stop processing events"""
        self.is_running = False
    
    def register_endpoint(self, url: str, secret: str, events: List[WebhookEventType]) -> str:
        """Register a new webhook endpoint"""
        endpoint = WebhookEndpoint(
            id=str(uuid.uuid4()),
            url=url,
            secret=secret,
            events=events
        )
        
        self.delivery_manager.register_endpoint(endpoint)
        return endpoint.id
    
    def unregister_endpoint(self, endpoint_id: str):
        """Unregister a webhook endpoint"""
        self.delivery_manager.unregister_endpoint(endpoint_id)
    
    def get_delivery_stats(self) -> Dict[str, Any]:
        """Get webhook delivery statistics"""
        total_deliveries = len(self.delivery_manager.deliveries)
        successful_deliveries = len([d for d in self.delivery_manager.deliveries if d.status == WebhookStatus.DELIVERED])
        failed_deliveries = len([d for d in self.delivery_manager.deliveries if d.status == WebhookStatus.FAILED])
        
        stats = {
            "total_endpoints": len(self.delivery_manager.endpoints),
            "active_endpoints": len([e for e in self.delivery_manager.endpoints.values() if e.is_active]),
            "total_deliveries": total_deliveries,
            "successful_deliveries": successful_deliveries,
            "failed_deliveries": failed_deliveries,
            "success_rate": (successful_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0,
            "endpoints": [
                {
                    "id": e.id,
                    "url": e.url,
                    "is_active": e.is_active,
                    "delivery_count": e.delivery_count,
                    "failure_count": e.failure_count,
                    "last_delivery": e.last_delivery.isoformat() if e.last_delivery else None
                }
                for e in self.delivery_manager.endpoints.values()
            ]
        }
        
        return stats

# Example usage and testing

async def test_webhook_system():
    """Test webhook system"""
    async with WebhookManager() as webhook_manager:
        # Set up integrations
        webhook_manager.setup_integrations()
        
        # Register test endpoint
        endpoint_id = webhook_manager.register_endpoint(
            url="https://api.example.com/webhooks",
            secret="test_secret",
            events=[WebhookEventType.CONTACT_CREATED, WebhookEventType.INVOICE_CREATED]
        )
        
        # Start event processor in background
        processor_task = asyncio.create_task(webhook_manager.start_event_processor())
        
        try:
            # Simulate incoming webhook
            test_payload = {
                "QueryResponse": {
                    "entityName": "Customer",
                    "operation": "Create"
                },
                "data": {"customer_id": "123", "name": "Test Customer"}
            }
            
            test_headers = {
                "x-signature": "sha256=test_signature"
            }
            
            # Process webhook
            event = await webhook_manager.process_incoming_webhook("quickbooks", test_payload, test_headers)
            print(f"Processed webhook event: {event.id}")
            
            # Wait a bit for processing
            await asyncio.sleep(2)
            
            # Get stats
            stats = webhook_manager.get_delivery_stats()
            print(f"Delivery stats: {stats}")
            
        finally:
            # Stop processor
            webhook_manager.stop_event_processor()
            await processor_task

if __name__ == "__main__":
    asyncio.run(test_webhook_system())
