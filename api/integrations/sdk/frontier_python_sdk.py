"""
Frontier Operations Platform Python SDK
Official Python client library for the Frontier Operations Platform API
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
import uuid

__version__ = "1.0.0"
__author__ = "Frontier Operations Platform"
__email__ = "support@frontier-ops.com"

@dataclass
class FrontierCredentials:
    """Frontier API credentials"""
    api_key: str
    base_url: str = "https://api.frontier-ops.com"
    timeout: int = 30

class FrontierError(Exception):
    """Frontier API error"""
    def __init__(self, message: str, status_code: int = None, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)

class FrontierClient:
    """
    Main client for interacting with the Frontier Operations Platform API
    
    Example usage:
        client = FrontierClient(api_key="your_api_key")
        
        # Get all customers
        customers = await client.customers.list()
        
        # Create a new customer
        customer = await client.customers.create({
            "name": "ACME Corp",
            "email": "contact@acme.com"
        })
        
        # Sync with QuickBooks
        sync_result = await client.integrations.quickbooks.sync_customers()
    """
    
    def __init__(self, api_key: str, base_url: str = "https://api.frontier-ops.com", timeout: int = 30):
        self.credentials = FrontierCredentials(api_key, base_url, timeout)
        self.session = None
        
        # Initialize service modules
        self.customers = CustomerService(self)
        self.invoices = InvoiceService(self)
        self.payments = PaymentService(self)
        self.projects = ProjectService(self)
        self.integrations = IntegrationsService(self)
        self.webhooks = WebhookService(self)
        self.analytics = AnalyticsService(self)
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.credentials.timeout)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _make_request(self, method: str, endpoint: str, data: Dict = None, 
                          params: Dict = None) -> Dict[str, Any]:
        """Make authenticated request to Frontier API"""
        url = f"{self.credentials.base_url}{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.credentials.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": f"Frontier-Python-SDK/{__version__}"
        }
        
        async with self.session.request(method, url, headers=headers, json=data, params=params) as response:
            response_text = await response.text()
            
            try:
                response_data = json.loads(response_text) if response_text else {}
            except json.JSONDecodeError:
                response_data = {"message": response_text}
            
            if response.status >= 400:
                error_msg = response_data.get("message", "Unknown error")
                error_code = response_data.get("error_code", "UNKNOWN")
                raise FrontierError(error_msg, response.status, error_code)
            
            return response_data

class BaseService:
    """Base service class for API endpoints"""
    
    def __init__(self, client: FrontierClient):
        self.client = client
    
    async def _request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None):
        """Make request through client"""
        return await self.client._make_request(method, endpoint, data, params)

class CustomerService(BaseService):
    """Customer management service"""
    
    async def list(self, limit: int = 100, offset: int = 0, 
                  filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """List customers"""
        params = {"limit": limit, "offset": offset}
        if filters:
            params.update(filters)
        
        return await self._request("GET", "/v1/customers", params=params)
    
    async def get(self, customer_id: str) -> Dict[str, Any]:
        """Get customer by ID"""
        return await self._request("GET", f"/v1/customers/{customer_id}")
    
    async def create(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new customer"""
        return await self._request("POST", "/v1/customers", customer_data)
    
    async def update(self, customer_id: str, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update customer"""
        return await self._request("PUT", f"/v1/customers/{customer_id}", customer_data)
    
    async def delete(self, customer_id: str) -> Dict[str, Any]:
        """Delete customer"""
        return await self._request("DELETE", f"/v1/customers/{customer_id}")
    
    async def search(self, query: str, limit: int = 100) -> Dict[str, Any]:
        """Search customers"""
        params = {"q": query, "limit": limit}
        return await self._request("GET", "/v1/customers/search", params=params)

class InvoiceService(BaseService):
    """Invoice management service"""
    
    async def list(self, limit: int = 100, offset: int = 0,
                  status: str = None, customer_id: str = None) -> Dict[str, Any]:
        """List invoices"""
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        if customer_id:
            params["customer_id"] = customer_id
        
        return await self._request("GET", "/v1/invoices", params=params)
    
    async def get(self, invoice_id: str) -> Dict[str, Any]:
        """Get invoice by ID"""
        return await self._request("GET", f"/v1/invoices/{invoice_id}")
    
    async def create(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new invoice"""
        return await self._request("POST", "/v1/invoices", invoice_data)
    
    async def update(self, invoice_id: str, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update invoice"""
        return await self._request("PUT", f"/v1/invoices/{invoice_id}", invoice_data)
    
    async def send(self, invoice_id: str, send_options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send invoice to customer"""
        data = send_options or {}
        return await self._request("POST", f"/v1/invoices/{invoice_id}/send", data)
    
    async def mark_paid(self, invoice_id: str, payment_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Mark invoice as paid"""
        data = payment_data or {}
        return await self._request("POST", f"/v1/invoices/{invoice_id}/mark_paid", data)

class PaymentService(BaseService):
    """Payment management service"""
    
    async def list(self, limit: int = 100, offset: int = 0,
                  customer_id: str = None, invoice_id: str = None) -> Dict[str, Any]:
        """List payments"""
        params = {"limit": limit, "offset": offset}
        if customer_id:
            params["customer_id"] = customer_id
        if invoice_id:
            params["invoice_id"] = invoice_id
        
        return await self._request("GET", "/v1/payments", params=params)
    
    async def get(self, payment_id: str) -> Dict[str, Any]:
        """Get payment by ID"""
        return await self._request("GET", f"/v1/payments/{payment_id}")
    
    async def create(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new payment"""
        return await self._request("POST", "/v1/payments", payment_data)
    
    async def refund(self, payment_id: str, refund_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Refund payment"""
        data = refund_data or {}
        return await self._request("POST", f"/v1/payments/{payment_id}/refund", data)

class ProjectService(BaseService):
    """Project management service"""
    
    async def list(self, limit: int = 100, offset: int = 0,
                  status: str = None, customer_id: str = None) -> Dict[str, Any]:
        """List projects"""
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        if customer_id:
            params["customer_id"] = customer_id
        
        return await self._request("GET", "/v1/projects", params=params)
    
    async def get(self, project_id: str) -> Dict[str, Any]:
        """Get project by ID"""
        return await self._request("GET", f"/v1/projects/{project_id}")
    
    async def create(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new project"""
        return await self._request("POST", "/v1/projects", project_data)
    
    async def update(self, project_id: str, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update project"""
        return await self._request("PUT", f"/v1/projects/{project_id}", project_data)
    
    async def get_tasks(self, project_id: str) -> Dict[str, Any]:
        """Get project tasks"""
        return await self._request("GET", f"/v1/projects/{project_id}/tasks")
    
    async def create_task(self, project_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create project task"""
        return await self._request("POST", f"/v1/projects/{project_id}/tasks", task_data)

class IntegrationsService(BaseService):
    """Integrations management service"""
    
    def __init__(self, client: FrontierClient):
        super().__init__(client)
        self.quickbooks = QuickBooksIntegration(client)
        self.xero = XeroIntegration(client)
        self.salesforce = SalesforceIntegration(client)
        self.hubspot = HubSpotIntegration(client)
    
    async def list(self) -> Dict[str, Any]:
        """List all integrations"""
        return await self._request("GET", "/v1/integrations")
    
    async def get_status(self, integration_name: str) -> Dict[str, Any]:
        """Get integration status"""
        return await self._request("GET", f"/v1/integrations/{integration_name}/status")

class QuickBooksIntegration(BaseService):
    """QuickBooks integration service"""
    
    async def connect(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to QuickBooks"""
        return await self._request("POST", "/v1/integrations/quickbooks/connect", credentials)
    
    async def disconnect(self) -> Dict[str, Any]:
        """Disconnect from QuickBooks"""
        return await self._request("POST", "/v1/integrations/quickbooks/disconnect")
    
    async def sync_customers(self) -> Dict[str, Any]:
        """Sync customers from QuickBooks"""
        return await self._request("POST", "/v1/integrations/quickbooks/sync/customers")
    
    async def sync_invoices(self) -> Dict[str, Any]:
        """Sync invoices from QuickBooks"""
        return await self._request("POST", "/v1/integrations/quickbooks/sync/invoices")
    
    async def sync_payments(self) -> Dict[str, Any]:
        """Sync payments from QuickBooks"""
        return await self._request("POST", "/v1/integrations/quickbooks/sync/payments")
    
    async def sync_all(self) -> Dict[str, Any]:
        """Sync all data from QuickBooks"""
        return await self._request("POST", "/v1/integrations/quickbooks/sync/all")

class XeroIntegration(BaseService):
    """Xero integration service"""
    
    async def connect(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to Xero"""
        return await self._request("POST", "/v1/integrations/xero/connect", credentials)
    
    async def disconnect(self) -> Dict[str, Any]:
        """Disconnect from Xero"""
        return await self._request("POST", "/v1/integrations/xero/disconnect")
    
    async def sync_contacts(self) -> Dict[str, Any]:
        """Sync contacts from Xero"""
        return await self._request("POST", "/v1/integrations/xero/sync/contacts")
    
    async def sync_invoices(self) -> Dict[str, Any]:
        """Sync invoices from Xero"""
        return await self._request("POST", "/v1/integrations/xero/sync/invoices")
    
    async def sync_payments(self) -> Dict[str, Any]:
        """Sync payments from Xero"""
        return await self._request("POST", "/v1/integrations/xero/sync/payments")
    
    async def sync_all(self) -> Dict[str, Any]:
        """Sync all data from Xero"""
        return await self._request("POST", "/v1/integrations/xero/sync/all")

class SalesforceIntegration(BaseService):
    """Salesforce integration service"""
    
    async def connect(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to Salesforce"""
        return await self._request("POST", "/v1/integrations/salesforce/connect", credentials)
    
    async def disconnect(self) -> Dict[str, Any]:
        """Disconnect from Salesforce"""
        return await self._request("POST", "/v1/integrations/salesforce/disconnect")
    
    async def sync_accounts(self) -> Dict[str, Any]:
        """Sync accounts from Salesforce"""
        return await self._request("POST", "/v1/integrations/salesforce/sync/accounts")
    
    async def sync_contacts(self) -> Dict[str, Any]:
        """Sync contacts from Salesforce"""
        return await self._request("POST", "/v1/integrations/salesforce/sync/contacts")
    
    async def sync_leads(self) -> Dict[str, Any]:
        """Sync leads from Salesforce"""
        return await self._request("POST", "/v1/integrations/salesforce/sync/leads")
    
    async def sync_opportunities(self) -> Dict[str, Any]:
        """Sync opportunities from Salesforce"""
        return await self._request("POST", "/v1/integrations/salesforce/sync/opportunities")
    
    async def sync_all(self) -> Dict[str, Any]:
        """Sync all data from Salesforce"""
        return await self._request("POST", "/v1/integrations/salesforce/sync/all")

class HubSpotIntegration(BaseService):
    """HubSpot integration service"""
    
    async def connect(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to HubSpot"""
        return await self._request("POST", "/v1/integrations/hubspot/connect", credentials)
    
    async def disconnect(self) -> Dict[str, Any]:
        """Disconnect from HubSpot"""
        return await self._request("POST", "/v1/integrations/hubspot/disconnect")
    
    async def sync_contacts(self) -> Dict[str, Any]:
        """Sync contacts from HubSpot"""
        return await self._request("POST", "/v1/integrations/hubspot/sync/contacts")
    
    async def sync_companies(self) -> Dict[str, Any]:
        """Sync companies from HubSpot"""
        return await self._request("POST", "/v1/integrations/hubspot/sync/companies")
    
    async def sync_deals(self) -> Dict[str, Any]:
        """Sync deals from HubSpot"""
        return await self._request("POST", "/v1/integrations/hubspot/sync/deals")
    
    async def sync_tickets(self) -> Dict[str, Any]:
        """Sync tickets from HubSpot"""
        return await self._request("POST", "/v1/integrations/hubspot/sync/tickets")
    
    async def sync_all(self) -> Dict[str, Any]:
        """Sync all data from HubSpot"""
        return await self._request("POST", "/v1/integrations/hubspot/sync/all")

class WebhookService(BaseService):
    """Webhook management service"""
    
    async def list(self) -> Dict[str, Any]:
        """List webhook endpoints"""
        return await self._request("GET", "/v1/webhooks")
    
    async def create(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create webhook endpoint"""
        return await self._request("POST", "/v1/webhooks", webhook_data)
    
    async def update(self, webhook_id: str, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update webhook endpoint"""
        return await self._request("PUT", f"/v1/webhooks/{webhook_id}", webhook_data)
    
    async def delete(self, webhook_id: str) -> Dict[str, Any]:
        """Delete webhook endpoint"""
        return await self._request("DELETE", f"/v1/webhooks/{webhook_id}")
    
    async def test(self, webhook_id: str) -> Dict[str, Any]:
        """Test webhook endpoint"""
        return await self._request("POST", f"/v1/webhooks/{webhook_id}/test")
    
    async def get_deliveries(self, webhook_id: str) -> Dict[str, Any]:
        """Get webhook delivery history"""
        return await self._request("GET", f"/v1/webhooks/{webhook_id}/deliveries")

class AnalyticsService(BaseService):
    """Analytics and reporting service"""
    
    async def get_dashboard_data(self, date_range: Dict[str, str] = None) -> Dict[str, Any]:
        """Get dashboard analytics data"""
        params = date_range or {}
        return await self._request("GET", "/v1/analytics/dashboard", params=params)
    
    async def get_revenue_report(self, period: str = "month", 
                               year: int = None, month: int = None) -> Dict[str, Any]:
        """Get revenue report"""
        params = {"period": period}
        if year:
            params["year"] = year
        if month:
            params["month"] = month
        
        return await self._request("GET", "/v1/analytics/revenue", params=params)
    
    async def get_customer_metrics(self, customer_id: str = None) -> Dict[str, Any]:
        """Get customer metrics"""
        params = {}
        if customer_id:
            params["customer_id"] = customer_id
        
        return await self._request("GET", "/v1/analytics/customers", params=params)
    
    async def get_project_metrics(self, project_id: str = None) -> Dict[str, Any]:
        """Get project metrics"""
        params = {}
        if project_id:
            params["project_id"] = project_id
        
        return await self._request("GET", "/v1/analytics/projects", params=params)
    
    async def export_data(self, data_type: str, format: str = "csv",
                         filters: Dict[str, Any] = None) -> bytes:
        """Export data in specified format"""
        params = {"type": data_type, "format": format}
        if filters:
            params.update(filters)
        
        # This would return raw bytes for file download
        return await self._request("GET", "/v1/analytics/export", params=params)

# Utility functions

def create_client(api_key: str, base_url: str = "https://api.frontier-ops.com", 
                 timeout: int = 30) -> FrontierClient:
    """Create a new Frontier client instance"""
    return FrontierClient(api_key, base_url, timeout)

async def quick_sync(api_key: str, integration: str) -> Dict[str, Any]:
    """Quick sync data from an integration"""
    async with create_client(api_key) as client:
        if integration == "quickbooks":
            return await client.integrations.quickbooks.sync_all()
        elif integration == "xero":
            return await client.integrations.xero.sync_all()
        elif integration == "salesforce":
            return await client.integrations.salesforce.sync_all()
        elif integration == "hubspot":
            return await client.integrations.hubspot.sync_all()
        else:
            raise ValueError(f"Unknown integration: {integration}")

# Example usage and testing

async def example_usage():
    """Example usage of the Frontier Python SDK"""
    
    api_key = "your_api_key_here"
    
    async with FrontierClient(api_key) as client:
        try:
            # Get customers
            customers = await client.customers.list(limit=10)
            print(f"Found {len(customers.get('data', []))} customers")
            
            # Create a new customer
            new_customer = await client.customers.create({
                "name": "Example Corp",
                "email": "contact@example.com",
                "phone": "+1-555-0123"
            })
            print(f"Created customer: {new_customer['id']}")
            
            # Sync with QuickBooks
            qb_sync = await client.integrations.quickbooks.sync_customers()
            print(f"QuickBooks sync: {qb_sync['status']}")
            
            # Get analytics
            dashboard = await client.analytics.get_dashboard_data()
            print(f"Dashboard data: {dashboard}")
            
            # Create webhook
            webhook = await client.webhooks.create({
                "url": "https://yourapp.com/webhooks/frontier",
                "events": ["customer.created", "invoice.paid"],
                "secret": "your_webhook_secret"
            })
            print(f"Created webhook: {webhook['id']}")
            
        except FrontierError as e:
            print(f"Frontier API error: {e.message} (Status: {e.status_code})")
        except Exception as e:
            print(f"General error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(example_usage())
