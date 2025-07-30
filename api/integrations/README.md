# Frontier Operations Platform - Business Tool Integrations

This directory contains comprehensive integrations with popular business tools to enable seamless data synchronization and workflow automation.

## 🔧 Available Integrations

### 1. Accounting Systems
- **QuickBooks Online** (`quickbooks_connector.py`) - Complete API integration with OAuth2 authentication
- **Xero** (`xero_connector.py`) - Full Xero API integration with multi-tenant support

### 2. CRM Platforms  
- **Salesforce** (`salesforce_connector.py`) - Comprehensive Salesforce API integration
- **HubSpot** (`hubspot_connector.py`) - Complete HubSpot CRM integration

### 3. Real-time Synchronization
- **Webhooks System** (`webhooks_system.py`) - Real-time event handling and data synchronization

### 4. API Libraries
- **Python SDK** (`sdk/frontier_python_sdk.py`) - Official Python client library
- **JavaScript/TypeScript SDK** (`sdk/frontier_js_sdk.js`) - Official JavaScript/TypeScript client library

### 5. No-Code Automation
- **Zapier Integration** (`zapier_integration.py`) - Complete Zapier app for no-code workflows

## 🚀 Features

### Accounting System Integration
- **OAuth2 Authentication** - Secure token-based authentication
- **Full CRUD Operations** - Create, read, update, delete for all major entities
- **Financial Reporting** - Automated report generation (P&L, Balance Sheet, Cash Flow)
- **Real-time Sync** - Automatic data synchronization with change detection
- **Error Handling** - Comprehensive error handling with retry logic

**Supported Entities:**
- Customers/Contacts
- Invoices
- Payments
- Chart of Accounts
- Items/Products
- Company Information
- Bank Transactions (Xero)

### CRM Integration
- **Lead Management** - Comprehensive lead tracking and conversion
- **Contact Management** - Full contact lifecycle management
- **Deal/Opportunity Tracking** - Sales pipeline management
- **Account Management** - Customer account relationship tracking
- **Task & Event Management** - Activity tracking and scheduling
- **Pipeline Management** - Custom sales process support

**Supported CRM Entities:**
- Leads/Contacts
- Accounts/Companies
- Opportunities/Deals
- Cases/Tickets
- Tasks & Events
- Pipelines & Stages

### Webhooks System
- **Real-time Event Processing** - Instant data synchronization
- **Multi-source Support** - Handle webhooks from all integrated platforms
- **Signature Validation** - Secure webhook verification
- **Delivery Management** - Reliable webhook delivery with retry logic
- **Event Types** - Support for all major business events

**Supported Events:**
- Customer/Contact created, updated, deleted
- Invoice created, updated, paid
- Payment received
- Deal/Opportunity changes
- Custom events

### SDK Libraries
- **Async/Await Support** - Modern asynchronous programming
- **Type Safety** - Full TypeScript definitions
- **Comprehensive API Coverage** - All Frontier API endpoints
- **Error Handling** - Detailed error messages and status codes
- **Authentication** - Built-in API key management
- **Rate Limiting** - Automatic request throttling

**SDK Features:**
- Customer management
- Invoice creation and management
- Payment processing
- Project management
- Integration management
- Analytics and reporting
- Webhook management

### Zapier Integration
- **30+ Triggers** - Events that start automations
- **25+ Actions** - Things Zapier can do in Frontier
- **Dynamic Dropdowns** - Smart field population
- **Custom Workflows** - Unlimited automation possibilities

**Popular Zapier Workflows:**
- New customer welcome sequences
- Invoice payment notifications
- Project kickoff automation
- Cross-platform data synchronization

## 📋 Setup Instructions

### 1. Environment Setup
```bash
# Install required packages
pip install aiohttp asyncio python-dateutil

# For JavaScript SDK
npm install # (if using in Node.js environment)
```

### 2. Authentication Setup

#### QuickBooks Integration
```python
from integrations.quickbooks_connector import QuickBooksCredentials, QuickBooksConnector

credentials = QuickBooksCredentials(
    client_id="your_quickbooks_client_id",
    client_secret="your_quickbooks_client_secret",
    redirect_uri="your_redirect_uri",
    access_token="", # Will be populated after OAuth
    refresh_token="", # Will be populated after OAuth
    token_expires_at=datetime.utcnow(),
    realm_id="company_id",
    is_sandbox=True  # Set to False for production
)

async with QuickBooksConnector(credentials) as qb:
    customers = await qb.get_customers()
```

#### HubSpot Integration
```python
from integrations.hubspot_connector import HubSpotCredentials, HubSpotConnector

credentials = HubSpotCredentials(
    access_token="your_hubspot_access_token",
    refresh_token="your_refresh_token",
    client_id="your_client_id",
    client_secret="your_client_secret",
    token_expires_at=datetime.utcnow() + timedelta(hours=6),
    portal_id="your_portal_id"
)

async with HubSpotConnector(credentials) as hs:
    contacts = await hs.get_contacts()
```

### 3. SDK Usage

#### Python SDK
```python
from sdk.frontier_python_sdk import FrontierClient

async with FrontierClient("your_api_key") as client:
    # Create customer
    customer = await client.customers.create({
        "name": "ACME Corp",
        "email": "contact@acme.com"
    })
    
    # Sync with QuickBooks
    sync_result = await client.integrations.quickbooks.sync_all()
```

#### JavaScript SDK
```javascript
import { FrontierClient } from './sdk/frontier_js_sdk.js';

const client = new FrontierClient({
    apiKey: 'your_api_key'
});

// Create customer
const customer = await client.customers.create({
    name: 'ACME Corp',
    email: 'contact@acme.com'
});

// Sync with HubSpot
const syncResult = await client.integrations.hubspot.syncAll();
```

### 4. Webhook Setup
```python
from integrations.webhooks_system import WebhookManager, WebhookEventType

async with WebhookManager() as webhook_manager:
    # Setup integrations
    webhook_manager.setup_integrations()
    
    # Register endpoint
    endpoint_id = webhook_manager.register_endpoint(
        url="https://your-app.com/webhooks",
        secret="webhook_secret",
        events=[WebhookEventType.INVOICE_PAID, WebhookEventType.CONTACT_CREATED]
    )
    
    # Start processing
    await webhook_manager.start_event_processor()
```

## 🔗 API Endpoints

The integrations expose RESTful API endpoints for external access:

### Integration Management
- `GET /v1/integrations` - List all integrations
- `GET /v1/integrations/{name}/status` - Get integration status
- `POST /v1/integrations/{name}/connect` - Connect integration
- `POST /v1/integrations/{name}/disconnect` - Disconnect integration

### Data Synchronization
- `POST /v1/integrations/{name}/sync/customers` - Sync customers
- `POST /v1/integrations/{name}/sync/invoices` - Sync invoices
- `POST /v1/integrations/{name}/sync/all` - Sync all data

### Webhook Management
- `GET /v1/webhooks` - List webhook endpoints
- `POST /v1/webhooks` - Create webhook endpoint
- `PUT /v1/webhooks/{id}` - Update webhook endpoint
- `DELETE /v1/webhooks/{id}` - Delete webhook endpoint

## 📊 Monitoring and Analytics

### Sync Status Monitoring
- Real-time sync status tracking
- Error logging and alerting
- Performance metrics
- Data integrity validation

### Webhook Delivery Tracking
- Delivery success/failure rates
- Retry attempt monitoring
- Response time tracking
- Error categorization

### Integration Health Checks
- Connection status monitoring
- Token expiration alerts
- API rate limit tracking
- Service availability checks

## 🔒 Security Features

### Authentication Security
- OAuth2 implementation with PKCE
- Secure token storage and refresh
- API key rotation support
- Multi-factor authentication support

### Data Protection
- End-to-end encryption
- PII data masking
- Audit trail logging
- GDPR compliance features

### Webhook Security
- HMAC signature validation
- Timestamp verification
- IP whitelist support
- SSL/TLS enforcement

## 📚 Documentation

### API Reference
- Complete API documentation available at `/docs`
- Interactive API explorer with examples
- Postman collection available
- OpenAPI/Swagger specification

### Integration Guides
- Step-by-step setup guides for each integration
- Common workflow examples
- Troubleshooting guides
- Best practices documentation

### SDK Documentation
- Complete method reference
- Code examples for all languages
- Migration guides
- Version compatibility matrix

## 🛠️ Development

### Testing
```bash
# Run integration tests
python -m pytest tests/integrations/

# Test specific integration
python -m pytest tests/integrations/test_quickbooks.py

# Run webhook tests
python -m pytest tests/integrations/test_webhooks.py
```

### Contributing
1. Fork the repository
2. Create feature branch
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

### Custom Integrations
The system is designed to be extensible. To add a new integration:

1. Create connector class inheriting from `BaseConnector`
2. Implement required methods (`authenticate`, `sync_data`, etc.)
3. Add webhook event handlers
4. Create SDK service class
5. Add Zapier triggers/actions
6. Update documentation

## 📈 Performance Optimization

### Async Operations
- All API calls are asynchronous
- Concurrent request processing
- Connection pooling
- Request batching where supported

### Caching Strategy
- Redis-based caching for frequently accessed data
- Intelligent cache invalidation
- Configurable TTL settings
- Cache warming for critical data

### Rate Limiting
- Intelligent rate limiting per integration
- Automatic backoff and retry
- Queue-based request handling
- Fair usage across tenants

## 🎯 Use Cases

### Small Business
- Sync QuickBooks customers with CRM
- Automate invoice notifications
- Track project profitability
- Generate financial reports

### Enterprise
- Multi-system data synchronization
- Complex workflow automation
- Custom integration development
- Advanced analytics and reporting

### Agencies
- Client data management across platforms
- Automated billing and invoicing
- Project tracking and time management
- Client communication automation

## 📞 Support

### Documentation
- Complete integration guides
- Video tutorials
- FAQ section
- Best practices

### Technical Support
- Email: support@frontier-ops.com
- Documentation: https://docs.frontier-ops.com
- Community Forum: https://community.frontier-ops.com
- Status Page: https://status.frontier-ops.com

### Professional Services
- Custom integration development
- Migration assistance
- Training and onboarding
- Dedicated support channels

---

Built with ❤️ by the Frontier Operations Platform team
