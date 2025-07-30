"""
Frontier Operations Platform JavaScript/TypeScript SDK
Official JavaScript/TypeScript client library for the Frontier Operations Platform API
"""

export interface FrontierCredentials {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface FrontierConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

export class FrontierError extends Error {
  public statusCode?: number;
  public errorCode?: string;

  constructor(message: string, statusCode?: number, errorCode?: string) {
    super(message);
    this.name = 'FrontierError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export class FrontierClient {
  private config: FrontierConfig;
  
  public customers: CustomerService;
  public invoices: InvoiceService;
  public payments: PaymentService;
  public projects: ProjectService;
  public integrations: IntegrationsService;
  public webhooks: WebhookService;
  public analytics: AnalyticsService;

  constructor(credentials: FrontierCredentials) {
    this.config = {
      baseUrl: credentials.baseUrl || 'https://api.frontier-ops.com',
      timeout: credentials.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Frontier-JS-SDK/1.0.0'
      }
    };

    // Initialize services
    this.customers = new CustomerService(this);
    this.invoices = new InvoiceService(this);
    this.payments = new PaymentService(this);
    this.projects = new ProjectService(this);
    this.integrations = new IntegrationsService(this);
    this.webhooks = new WebhookService(this);
    this.analytics = new AnalyticsService(this);
  }

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(endpoint, this.config.baseUrl);
    
    // Add query parameters
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }

    const requestInit: RequestInit = {
      method,
      headers: this.config.headers,
      signal: AbortSignal.timeout(this.config.timeout)
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestInit.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url.toString(), requestInit);
      
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = { message: await response.text() };
      }

      if (!response.ok) {
        const errorMessage = responseData?.message || 'Unknown error';
        const errorCode = responseData?.error_code || 'UNKNOWN';
        throw new FrontierError(errorMessage, response.status, errorCode);
      }

      return responseData;
    } catch (error) {
      if (error instanceof FrontierError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new FrontierError('Request timeout', undefined, 'TIMEOUT');
        }
        throw new FrontierError(error.message, undefined, 'NETWORK_ERROR');
      }
      
      throw new FrontierError('Unknown error occurred', undefined, 'UNKNOWN');
    }
  }
}

abstract class BaseService {
  protected client: FrontierClient;

  constructor(client: FrontierClient) {
    this.client = client;
  }
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export class CustomerService extends BaseService {
  async list(options: {
    limit?: number;
    offset?: number;
    filters?: Record<string, any>;
  } = {}): Promise<{ data: Customer[], total: number }> {
    const { limit = 100, offset = 0, filters = {} } = options;
    const params = { limit, offset, ...filters };
    return this.client.request('GET', '/v1/customers', undefined, params);
  }

  async get(customerId: string): Promise<Customer> {
    return this.client.request('GET', `/v1/customers/${customerId}`);
  }

  async create(customerData: CreateCustomerData): Promise<Customer> {
    return this.client.request('POST', '/v1/customers', customerData);
  }

  async update(customerId: string, customerData: Partial<CreateCustomerData>): Promise<Customer> {
    return this.client.request('PUT', `/v1/customers/${customerId}`, customerData);
  }

  async delete(customerId: string): Promise<{ success: boolean }> {
    return this.client.request('DELETE', `/v1/customers/${customerId}`);
  }

  async search(query: string, limit: number = 100): Promise<{ data: Customer[], total: number }> {
    const params = { q: query, limit };
    return this.client.request('GET', '/v1/customers/search', undefined, params);
  }
}

export interface Invoice {
  id: string;
  customer_id: string;
  invoice_number: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceData {
  customer_id: string;
  amount: number;
  due_date: string;
  description?: string;
  line_items?: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export class InvoiceService extends BaseService {
  async list(options: {
    limit?: number;
    offset?: number;
    status?: string;
    customerId?: string;
  } = {}): Promise<{ data: Invoice[], total: number }> {
    const { limit = 100, offset = 0, status, customerId } = options;
    const params: any = { limit, offset };
    if (status) params.status = status;
    if (customerId) params.customer_id = customerId;
    
    return this.client.request('GET', '/v1/invoices', undefined, params);
  }

  async get(invoiceId: string): Promise<Invoice> {
    return this.client.request('GET', `/v1/invoices/${invoiceId}`);
  }

  async create(invoiceData: CreateInvoiceData): Promise<Invoice> {
    return this.client.request('POST', '/v1/invoices', invoiceData);
  }

  async update(invoiceId: string, invoiceData: Partial<CreateInvoiceData>): Promise<Invoice> {
    return this.client.request('PUT', `/v1/invoices/${invoiceId}`, invoiceData);
  }

  async send(invoiceId: string, sendOptions?: { email?: string }): Promise<{ success: boolean }> {
    return this.client.request('POST', `/v1/invoices/${invoiceId}/send`, sendOptions);
  }

  async markPaid(invoiceId: string, paymentData?: { amount?: number, date?: string }): Promise<{ success: boolean }> {
    return this.client.request('POST', `/v1/invoices/${invoiceId}/mark_paid`, paymentData);
  }
}

export interface Payment {
  id: string;
  customer_id: string;
  invoice_id?: string;
  amount: number;
  method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  customer_id: string;
  invoice_id?: string;
  amount: number;
  method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  transaction_id?: string;
  notes?: string;
}

export class PaymentService extends BaseService {
  async list(options: {
    limit?: number;
    offset?: number;
    customerId?: string;
    invoiceId?: string;
  } = {}): Promise<{ data: Payment[], total: number }> {
    const { limit = 100, offset = 0, customerId, invoiceId } = options;
    const params: any = { limit, offset };
    if (customerId) params.customer_id = customerId;
    if (invoiceId) params.invoice_id = invoiceId;
    
    return this.client.request('GET', '/v1/payments', undefined, params);
  }

  async get(paymentId: string): Promise<Payment> {
    return this.client.request('GET', `/v1/payments/${paymentId}`);
  }

  async create(paymentData: CreatePaymentData): Promise<Payment> {
    return this.client.request('POST', '/v1/payments', paymentData);
  }

  async refund(paymentId: string, refundData?: { amount?: number, reason?: string }): Promise<{ success: boolean }> {
    return this.client.request('POST', `/v1/payments/${paymentId}/refund`, refundData);
  }
}

export interface Project {
  id: string;
  customer_id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
  created_at: string;
  updated_at: string;
}

export class ProjectService extends BaseService {
  async list(options: {
    limit?: number;
    offset?: number;
    status?: string;
    customerId?: string;
  } = {}): Promise<{ data: Project[], total: number }> {
    const { limit = 100, offset = 0, status, customerId } = options;
    const params: any = { limit, offset };
    if (status) params.status = status;
    if (customerId) params.customer_id = customerId;
    
    return this.client.request('GET', '/v1/projects', undefined, params);
  }

  async get(projectId: string): Promise<Project> {
    return this.client.request('GET', `/v1/projects/${projectId}`);
  }

  async create(projectData: {
    customer_id: string;
    name: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
  }): Promise<Project> {
    return this.client.request('POST', '/v1/projects', projectData);
  }

  async update(projectId: string, projectData: Partial<{
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
    budget: number;
  }>): Promise<Project> {
    return this.client.request('PUT', `/v1/projects/${projectId}`, projectData);
  }

  async getTasks(projectId: string): Promise<{ data: any[] }> {
    return this.client.request('GET', `/v1/projects/${projectId}/tasks`);
  }

  async createTask(projectId: string, taskData: {
    title: string;
    description?: string;
    due_date?: string;
    assigned_to?: string;
  }): Promise<any> {
    return this.client.request('POST', `/v1/projects/${projectId}/tasks`, taskData);
  }
}

export class QuickBooksIntegration extends BaseService {
  async connect(credentials: Record<string, any>): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/quickbooks/connect', credentials);
  }

  async disconnect(): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/quickbooks/disconnect');
  }

  async syncCustomers(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/quickbooks/sync/customers');
  }

  async syncInvoices(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/quickbooks/sync/invoices');
  }

  async syncPayments(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/quickbooks/sync/payments');
  }

  async syncAll(): Promise<{ success: boolean, synced_data: Record<string, number> }> {
    return this.client.request('POST', '/v1/integrations/quickbooks/sync/all');
  }
}

export class XeroIntegration extends BaseService {
  async connect(credentials: Record<string, any>): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/xero/connect', credentials);
  }

  async disconnect(): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/xero/disconnect');
  }

  async syncContacts(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/xero/sync/contacts');
  }

  async syncInvoices(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/xero/sync/invoices');
  }

  async syncPayments(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/xero/sync/payments');
  }

  async syncAll(): Promise<{ success: boolean, synced_data: Record<string, number> }> {
    return this.client.request('POST', '/v1/integrations/xero/sync/all');
  }
}

export class SalesforceIntegration extends BaseService {
  async connect(credentials: Record<string, any>): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/salesforce/connect', credentials);
  }

  async disconnect(): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/salesforce/disconnect');
  }

  async syncAccounts(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/salesforce/sync/accounts');
  }

  async syncContacts(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/salesforce/sync/contacts');
  }

  async syncLeads(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/salesforce/sync/leads');
  }

  async syncOpportunities(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/salesforce/sync/opportunities');
  }

  async syncAll(): Promise<{ success: boolean, synced_data: Record<string, number> }> {
    return this.client.request('POST', '/v1/integrations/salesforce/sync/all');
  }
}

export class HubSpotIntegration extends BaseService {
  async connect(credentials: Record<string, any>): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/hubspot/connect', credentials);
  }

  async disconnect(): Promise<{ success: boolean }> {
    return this.client.request('POST', '/v1/integrations/hubspot/disconnect');
  }

  async syncContacts(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/hubspot/sync/contacts');
  }

  async syncCompanies(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/hubspot/sync/companies');
  }

  async syncDeals(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/hubspot/sync/deals');
  }

  async syncTickets(): Promise<{ success: boolean, count: number }> {
    return this.client.request('POST', '/v1/integrations/hubspot/sync/tickets');
  }

  async syncAll(): Promise<{ success: boolean, synced_data: Record<string, number> }> {
    return this.client.request('POST', '/v1/integrations/hubspot/sync/all');
  }
}

export class IntegrationsService extends BaseService {
  public quickbooks: QuickBooksIntegration;
  public xero: XeroIntegration;
  public salesforce: SalesforceIntegration;
  public hubspot: HubSpotIntegration;

  constructor(client: FrontierClient) {
    super(client);
    this.quickbooks = new QuickBooksIntegration(client);
    this.xero = new XeroIntegration(client);
    this.salesforce = new SalesforceIntegration(client);
    this.hubspot = new HubSpotIntegration(client);
  }

  async list(): Promise<{ data: Array<{ name: string, status: string, last_sync: string }> }> {
    return this.client.request('GET', '/v1/integrations');
  }

  async getStatus(integrationName: string): Promise<{ status: string, last_sync: string, error?: string }> {
    return this.client.request('GET', `/v1/integrations/${integrationName}/status`);
  }
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_delivery?: string;
}

export class WebhookService extends BaseService {
  async list(): Promise<{ data: Webhook[] }> {
    return this.client.request('GET', '/v1/webhooks');
  }

  async create(webhookData: {
    url: string;
    events: string[];
    secret: string;
  }): Promise<Webhook> {
    return this.client.request('POST', '/v1/webhooks', webhookData);
  }

  async update(webhookId: string, webhookData: Partial<{
    url: string;
    events: string[];
    is_active: boolean;
  }>): Promise<Webhook> {
    return this.client.request('PUT', `/v1/webhooks/${webhookId}`, webhookData);
  }

  async delete(webhookId: string): Promise<{ success: boolean }> {
    return this.client.request('DELETE', `/v1/webhooks/${webhookId}`);
  }

  async test(webhookId: string): Promise<{ success: boolean, delivery_id: string }> {
    return this.client.request('POST', `/v1/webhooks/${webhookId}/test`);
  }

  async getDeliveries(webhookId: string): Promise<{ data: Array<{
    id: string;
    status: string;
    http_status: number;
    delivered_at: string;
    event_type: string;
  }> }> {
    return this.client.request('GET', `/v1/webhooks/${webhookId}/deliveries`);
  }
}

export class AnalyticsService extends BaseService {
  async getDashboardData(dateRange?: { start_date: string, end_date: string }): Promise<{
    revenue: number;
    customers: number;
    invoices: number;
    projects: number;
  }> {
    return this.client.request('GET', '/v1/analytics/dashboard', undefined, dateRange);
  }

  async getRevenueReport(options: {
    period?: 'day' | 'week' | 'month' | 'year';
    year?: number;
    month?: number;
  } = {}): Promise<{
    data: Array<{ period: string, revenue: number }>;
    total: number;
  }> {
    const { period = 'month', year, month } = options;
    const params: any = { period };
    if (year) params.year = year;
    if (month) params.month = month;
    
    return this.client.request('GET', '/v1/analytics/revenue', undefined, params);
  }

  async getCustomerMetrics(customerId?: string): Promise<{
    total_customers: number;
    new_customers: number;
    customer_lifetime_value: number;
    retention_rate: number;
  }> {
    const params = customerId ? { customer_id: customerId } : undefined;
    return this.client.request('GET', '/v1/analytics/customers', undefined, params);
  }

  async getProjectMetrics(projectId?: string): Promise<{
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    average_project_value: number;
  }> {
    const params = projectId ? { project_id: projectId } : undefined;
    return this.client.request('GET', '/v1/analytics/projects', undefined, params);
  }

  async exportData(dataType: string, format: 'csv' | 'json' = 'csv', filters?: Record<string, any>): Promise<Blob> {
    const params = { type: dataType, format, ...filters };
    return this.client.request('GET', '/v1/analytics/export', undefined, params);
  }
}

// Utility functions
export function createClient(credentials: FrontierCredentials): FrontierClient {
  return new FrontierClient(credentials);
}

export async function quickSync(apiKey: string, integration: 'quickbooks' | 'xero' | 'salesforce' | 'hubspot'): Promise<{ success: boolean, synced_data: Record<string, number> }> {
  const client = createClient({ apiKey });
  
  switch (integration) {
    case 'quickbooks':
      return client.integrations.quickbooks.syncAll();
    case 'xero':
      return client.integrations.xero.syncAll();
    case 'salesforce':
      return client.integrations.salesforce.syncAll();
    case 'hubspot':
      return client.integrations.hubspot.syncAll();
    default:
      throw new Error(`Unknown integration: ${integration}`);
  }
}

// Example usage
export async function exampleUsage() {
  const client = createClient({
    apiKey: 'your_api_key_here',
    baseUrl: 'https://api.frontier-ops.com'
  });

  try {
    // Get customers
    const customers = await client.customers.list({ limit: 10 });
    console.log(`Found ${customers.data.length} customers`);

    // Create a new customer
    const newCustomer = await client.customers.create({
      name: 'Example Corp',
      email: 'contact@example.com',
      phone: '+1-555-0123'
    });
    console.log(`Created customer: ${newCustomer.id}`);

    // Sync with QuickBooks
    const qbSync = await client.integrations.quickbooks.syncCustomers();
    console.log(`QuickBooks sync: ${qbSync.success}`);

    // Get analytics
    const dashboard = await client.analytics.getDashboardData();
    console.log('Dashboard data:', dashboard);

    // Create webhook
    const webhook = await client.webhooks.create({
      url: 'https://yourapp.com/webhooks/frontier',
      events: ['customer.created', 'invoice.paid'],
      secret: 'your_webhook_secret'
    });
    console.log(`Created webhook: ${webhook.id}`);

  } catch (error) {
    if (error instanceof FrontierError) {
      console.error(`Frontier API error: ${error.message} (Status: ${error.statusCode})`);
    } else {
      console.error('General error:', error);
    }
  }
}

// Node.js/CommonJS support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FrontierClient,
    FrontierError,
    createClient,
    quickSync,
    exampleUsage
  };
}
