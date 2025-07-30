"""
Zapier Integration for Frontier Operations Platform
Enables no-code automation workflows through Zapier
"""

import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import uuid

# Zapier App Configuration

ZAPIER_APP_CONFIG = {
    "version": "1.0.0",
    "platformVersion": "15.0.0",
    "title": "Frontier Operations Platform",
    "description": "Connect your business operations with powerful automation through Frontier's comprehensive platform for invoicing, payments, CRM, and project management.",
    "homepage": "https://frontier-ops.com",
    "logo": "https://frontier-ops.com/logo.png",
    "category": "Business Intelligence",
    "public": True,
    "authentication": {
        "type": "custom",
        "fields": [
            {
                "computed": False,
                "key": "api_key",
                "required": True,
                "label": "API Key",
                "type": "password",
                "helpText": "Your Frontier API key from your account settings"
            },
            {
                "computed": False,
                "key": "base_url",
                "required": False,
                "label": "Base URL",
                "type": "string",
                "default": "https://api.frontier-ops.com",
                "helpText": "Base URL for your Frontier instance (leave default unless using self-hosted)"
            }
        ],
        "test": {
            "url": "{{bundle.authData.base_url}}/v1/auth/test",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}",
                "Content-Type": "application/json"
            }
        },
        "connectionLabel": "{{bundle.authData.api_key}}"
    }
}

# Triggers (Events that start Zapier workflows)

CUSTOMER_CREATED_TRIGGER = {
    "key": "customer_created",
    "noun": "Customer",
    "display": {
        "label": "New Customer",
        "description": "Triggers when a new customer is created in Frontier"
    },
    "operation": {
        "type": "polling",
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/triggers/customers",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}"
            },
            "params": {
                "since": "{{bundle.meta.timestamp}}"
            }
        },
        "sample": {
            "id": "cust_123456789",
            "name": "ACME Corporation",
            "email": "contact@acme.com",
            "phone": "+1-555-0123",
            "address": "123 Business St",
            "city": "Business City",
            "state": "BC",
            "zip": "12345",
            "country": "USA",
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-15T10:30:00Z"
        }
    }
}

INVOICE_CREATED_TRIGGER = {
    "key": "invoice_created",
    "noun": "Invoice",
    "display": {
        "label": "New Invoice",
        "description": "Triggers when a new invoice is created in Frontier"
    },
    "operation": {
        "type": "polling",
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/triggers/invoices",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}"
            },
            "params": {
                "since": "{{bundle.meta.timestamp}}"
            }
        },
        "sample": {
            "id": "inv_123456789",
            "customer_id": "cust_123456789",
            "customer_name": "ACME Corporation",
            "invoice_number": "INV-2024-001",
            "amount": 1500.00,
            "status": "sent",
            "due_date": "2024-02-15",
            "created_at": "2024-01-15T10:30:00Z",
            "line_items": [
                {
                    "description": "Web Development Services",
                    "quantity": 40,
                    "rate": 37.50,
                    "amount": 1500.00
                }
            ]
        }
    }
}

INVOICE_PAID_TRIGGER = {
    "key": "invoice_paid",
    "noun": "Invoice Payment",
    "display": {
        "label": "Invoice Paid",
        "description": "Triggers when an invoice is marked as paid in Frontier"
    },
    "operation": {
        "type": "polling",
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/triggers/invoices/paid",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}"
            },
            "params": {
                "since": "{{bundle.meta.timestamp}}"
            }
        },
        "sample": {
            "id": "inv_123456789",
            "customer_id": "cust_123456789",
            "customer_name": "ACME Corporation",
            "invoice_number": "INV-2024-001",
            "amount": 1500.00,
            "status": "paid",
            "paid_date": "2024-01-20T14:30:00Z",
            "payment_method": "credit_card",
            "payment_id": "pay_987654321"
        }
    }
}

PAYMENT_RECEIVED_TRIGGER = {
    "key": "payment_received",
    "noun": "Payment",
    "display": {
        "label": "New Payment",
        "description": "Triggers when a new payment is received in Frontier"
    },
    "operation": {
        "type": "polling",
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/triggers/payments",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}"
            },
            "params": {
                "since": "{{bundle.meta.timestamp}}"
            }
        },
        "sample": {
            "id": "pay_987654321",
            "customer_id": "cust_123456789",
            "customer_name": "ACME Corporation",
            "invoice_id": "inv_123456789",
            "amount": 1500.00,
            "method": "credit_card",
            "status": "completed",
            "transaction_id": "txn_abc123def456",
            "created_at": "2024-01-20T14:30:00Z"
        }
    }
}

PROJECT_CREATED_TRIGGER = {
    "key": "project_created",
    "noun": "Project",
    "display": {
        "label": "New Project",
        "description": "Triggers when a new project is created in Frontier"
    },
    "operation": {
        "type": "polling",
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/triggers/projects",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}"
            },
            "params": {
                "since": "{{bundle.meta.timestamp}}"
            }
        },
        "sample": {
            "id": "proj_123456789",
            "customer_id": "cust_123456789",
            "customer_name": "ACME Corporation",
            "name": "Website Redesign",
            "description": "Complete redesign of corporate website",
            "status": "active",
            "start_date": "2024-01-15",
            "end_date": "2024-03-15",
            "budget": 15000.00,
            "created_at": "2024-01-15T09:00:00Z"
        }
    }
}

# Actions (Things Zapier can do in Frontier)

CREATE_CUSTOMER_ACTION = {
    "key": "create_customer",
    "noun": "Customer",
    "display": {
        "label": "Create Customer",
        "description": "Creates a new customer in Frontier"
    },
    "operation": {
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/actions/customers",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}",
                "Content-Type": "application/json"
            },
            "body": {
                "name": "{{bundle.inputData.name}}",
                "email": "{{bundle.inputData.email}}",
                "phone": "{{bundle.inputData.phone}}",
                "address": "{{bundle.inputData.address}}",
                "city": "{{bundle.inputData.city}}",
                "state": "{{bundle.inputData.state}}",
                "zip": "{{bundle.inputData.zip}}",
                "country": "{{bundle.inputData.country}}"
            }
        },
        "inputFields": [
            {
                "key": "name",
                "label": "Customer Name",
                "type": "string",
                "required": True,
                "helpText": "The full name or company name of the customer"
            },
            {
                "key": "email",
                "label": "Email Address",
                "type": "string",
                "required": False,
                "helpText": "Customer's email address"
            },
            {
                "key": "phone",
                "label": "Phone Number",
                "type": "string",
                "required": False,
                "helpText": "Customer's phone number"
            },
            {
                "key": "address",
                "label": "Street Address",
                "type": "string",
                "required": False
            },
            {
                "key": "city",
                "label": "City",
                "type": "string",
                "required": False
            },
            {
                "key": "state",
                "label": "State/Province",
                "type": "string",
                "required": False
            },
            {
                "key": "zip",
                "label": "ZIP/Postal Code",
                "type": "string",
                "required": False
            },
            {
                "key": "country",
                "label": "Country",
                "type": "string",
                "required": False,
                "default": "USA"
            }
        ],
        "sample": {
            "id": "cust_123456789",
            "name": "ACME Corporation",
            "email": "contact@acme.com",
            "phone": "+1-555-0123",
            "created_at": "2024-01-15T10:30:00Z"
        }
    }
}

CREATE_INVOICE_ACTION = {
    "key": "create_invoice",
    "noun": "Invoice",
    "display": {
        "label": "Create Invoice",
        "description": "Creates a new invoice in Frontier"
    },
    "operation": {
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/actions/invoices",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}",
                "Content-Type": "application/json"
            },
            "body": {
                "customer_id": "{{bundle.inputData.customer_id}}",
                "amount": "{{bundle.inputData.amount}}",
                "due_date": "{{bundle.inputData.due_date}}",
                "description": "{{bundle.inputData.description}}",
                "line_items": "{{bundle.inputData.line_items}}"
            }
        },
        "inputFields": [
            {
                "key": "customer_id",
                "label": "Customer",
                "type": "string",
                "required": True,
                "dynamic": "customer_list.id.name",
                "helpText": "Select the customer for this invoice"
            },
            {
                "key": "amount",
                "label": "Invoice Amount",
                "type": "number",
                "required": True,
                "helpText": "Total amount for the invoice"
            },
            {
                "key": "due_date",
                "label": "Due Date",
                "type": "datetime",
                "required": True,
                "helpText": "When payment is due"
            },
            {
                "key": "description",
                "label": "Description",
                "type": "text",
                "required": False,
                "helpText": "Optional description for the invoice"
            },
            {
                "key": "line_items",
                "label": "Line Items",
                "type": "text",
                "required": False,
                "helpText": "JSON array of line items (advanced users only)"
            }
        ],
        "sample": {
            "id": "inv_123456789",
            "customer_id": "cust_123456789",
            "invoice_number": "INV-2024-001",
            "amount": 1500.00,
            "status": "draft",
            "due_date": "2024-02-15",
            "created_at": "2024-01-15T10:30:00Z"
        }
    }
}

RECORD_PAYMENT_ACTION = {
    "key": "record_payment",
    "noun": "Payment",
    "display": {
        "label": "Record Payment",
        "description": "Records a new payment in Frontier"
    },
    "operation": {
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/actions/payments",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}",
                "Content-Type": "application/json"
            },
            "body": {
                "customer_id": "{{bundle.inputData.customer_id}}",
                "invoice_id": "{{bundle.inputData.invoice_id}}",
                "amount": "{{bundle.inputData.amount}}",
                "method": "{{bundle.inputData.method}}",
                "transaction_id": "{{bundle.inputData.transaction_id}}",
                "notes": "{{bundle.inputData.notes}}"
            }
        },
        "inputFields": [
            {
                "key": "customer_id",
                "label": "Customer",
                "type": "string",
                "required": True,
                "dynamic": "customer_list.id.name"
            },
            {
                "key": "invoice_id",
                "label": "Invoice",
                "type": "string",
                "required": False,
                "dynamic": "invoice_list.id.invoice_number",
                "helpText": "Optional - link payment to specific invoice"
            },
            {
                "key": "amount",
                "label": "Payment Amount",
                "type": "number",
                "required": True
            },
            {
                "key": "method",
                "label": "Payment Method",
                "type": "string",
                "required": True,
                "choices": [
                    {"value": "cash", "label": "Cash"},
                    {"value": "check", "label": "Check"},
                    {"value": "credit_card", "label": "Credit Card"},
                    {"value": "bank_transfer", "label": "Bank Transfer"},
                    {"value": "other", "label": "Other"}
                ]
            },
            {
                "key": "transaction_id",
                "label": "Transaction ID",
                "type": "string",
                "required": False,
                "helpText": "External transaction reference"
            },
            {
                "key": "notes",
                "label": "Notes",
                "type": "text",
                "required": False
            }
        ],
        "sample": {
            "id": "pay_987654321",
            "customer_id": "cust_123456789",
            "invoice_id": "inv_123456789",
            "amount": 1500.00,
            "method": "credit_card",
            "status": "completed",
            "created_at": "2024-01-20T14:30:00Z"
        }
    }
}

CREATE_PROJECT_ACTION = {
    "key": "create_project",
    "noun": "Project",
    "display": {
        "label": "Create Project",
        "description": "Creates a new project in Frontier"
    },
    "operation": {
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/actions/projects",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}",
                "Content-Type": "application/json"
            },
            "body": {
                "customer_id": "{{bundle.inputData.customer_id}}",
                "name": "{{bundle.inputData.name}}",
                "description": "{{bundle.inputData.description}}",
                "start_date": "{{bundle.inputData.start_date}}",
                "end_date": "{{bundle.inputData.end_date}}",
                "budget": "{{bundle.inputData.budget}}"
            }
        },
        "inputFields": [
            {
                "key": "customer_id",
                "label": "Customer",
                "type": "string",
                "required": True,
                "dynamic": "customer_list.id.name"
            },
            {
                "key": "name",
                "label": "Project Name",
                "type": "string",
                "required": True
            },
            {
                "key": "description",
                "label": "Description",
                "type": "text",
                "required": False
            },
            {
                "key": "start_date",
                "label": "Start Date",
                "type": "datetime",
                "required": False
            },
            {
                "key": "end_date",
                "label": "End Date",
                "type": "datetime",
                "required": False
            },
            {
                "key": "budget",
                "label": "Budget",
                "type": "number",
                "required": False
            }
        ],
        "sample": {
            "id": "proj_123456789",
            "customer_id": "cust_123456789",
            "name": "Website Redesign",
            "description": "Complete redesign of corporate website",
            "status": "planning",
            "budget": 15000.00,
            "created_at": "2024-01-15T09:00:00Z"
        }
    }
}

# Searches (For dynamic dropdowns)

CUSTOMER_SEARCH = {
    "key": "customer_list",
    "noun": "Customer",
    "display": {
        "label": "Find Customer",
        "description": "Search for customers in Frontier"
    },
    "operation": {
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/searches/customers",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}"
            },
            "params": {
                "q": "{{bundle.inputData.search}}",
                "limit": 50
            }
        },
        "inputFields": [
            {
                "key": "search",
                "label": "Search Term",
                "type": "string",
                "required": False,
                "helpText": "Search by customer name or email"
            }
        ]
    }
}

INVOICE_SEARCH = {
    "key": "invoice_list",
    "noun": "Invoice",
    "display": {
        "label": "Find Invoice",
        "description": "Search for invoices in Frontier"
    },
    "operation": {
        "perform": {
            "url": "{{bundle.authData.base_url}}/v1/zapier/searches/invoices",
            "method": "GET",
            "headers": {
                "Authorization": "Bearer {{bundle.authData.api_key}}"
            },
            "params": {
                "customer_id": "{{bundle.inputData.customer_id}}",
                "status": "{{bundle.inputData.status}}",
                "limit": 50
            }
        },
        "inputFields": [
            {
                "key": "customer_id",
                "label": "Customer",
                "type": "string",
                "required": False,
                "dynamic": "customer_list.id.name"
            },
            {
                "key": "status",
                "label": "Status",
                "type": "string",
                "required": False,
                "choices": [
                    {"value": "draft", "label": "Draft"},
                    {"value": "sent", "label": "Sent"},
                    {"value": "paid", "label": "Paid"},
                    {"value": "overdue", "label": "Overdue"}
                ]
            }
        ]
    }
}

# Complete Zapier App Definition

ZAPIER_APP_DEFINITION = {
    **ZAPIER_APP_CONFIG,
    "triggers": {
        "customer_created": CUSTOMER_CREATED_TRIGGER,
        "invoice_created": INVOICE_CREATED_TRIGGER,
        "invoice_paid": INVOICE_PAID_TRIGGER,
        "payment_received": PAYMENT_RECEIVED_TRIGGER,
        "project_created": PROJECT_CREATED_TRIGGER
    },
    "creates": {
        "create_customer": CREATE_CUSTOMER_ACTION,
        "create_invoice": CREATE_INVOICE_ACTION,
        "record_payment": RECORD_PAYMENT_ACTION,
        "create_project": CREATE_PROJECT_ACTION
    },
    "searches": {
        "customer_list": CUSTOMER_SEARCH,
        "invoice_list": INVOICE_SEARCH
    }
}

# Zapier Integration Handler Class

class ZapierIntegration:
    """Handle Zapier integration requests"""
    
    def __init__(self, frontier_client):
        """Initialize with Frontier client for API access"""
        self.frontier_client = frontier_client
    
    # Trigger Handlers
    
    async def get_new_customers(self, since_timestamp: str = None) -> List[Dict[str, Any]]:
        """Get customers created since timestamp for Zapier trigger"""
        params = {"limit": 100}
        if since_timestamp:
            params["created_since"] = since_timestamp
        
        response = await self.frontier_client.customers.list(**params)
        
        # Format for Zapier
        customers = []
        for customer in response.get("data", []):
            customers.append({
                "id": customer["id"],
                "name": customer["name"],
                "email": customer.get("email", ""),
                "phone": customer.get("phone", ""),
                "address": customer.get("address", ""),
                "city": customer.get("city", ""),
                "state": customer.get("state", ""),
                "zip": customer.get("zip", ""),
                "country": customer.get("country", ""),
                "created_at": customer["created_at"],
                "updated_at": customer["updated_at"]
            })
        
        return customers
    
    async def get_new_invoices(self, since_timestamp: str = None) -> List[Dict[str, Any]]:
        """Get invoices created since timestamp for Zapier trigger"""
        params = {"limit": 100}
        if since_timestamp:
            params["created_since"] = since_timestamp
        
        response = await self.frontier_client.invoices.list(**params)
        
        # Format for Zapier with customer details
        invoices = []
        for invoice in response.get("data", []):
            # Get customer details
            customer = await self.frontier_client.customers.get(invoice["customer_id"])
            
            invoices.append({
                "id": invoice["id"],
                "customer_id": invoice["customer_id"],
                "customer_name": customer.get("name", ""),
                "invoice_number": invoice["invoice_number"],
                "amount": invoice["amount"],
                "status": invoice["status"],
                "due_date": invoice.get("due_date", ""),
                "created_at": invoice["created_at"],
                "line_items": invoice.get("line_items", [])
            })
        
        return invoices
    
    async def get_paid_invoices(self, since_timestamp: str = None) -> List[Dict[str, Any]]:
        """Get invoices paid since timestamp for Zapier trigger"""
        params = {"limit": 100, "status": "paid"}
        if since_timestamp:
            params["paid_since"] = since_timestamp
        
        response = await self.frontier_client.invoices.list(**params)
        
        # Format for Zapier
        paid_invoices = []
        for invoice in response.get("data", []):
            customer = await self.frontier_client.customers.get(invoice["customer_id"])
            
            # Get payment details if available
            payments = await self.frontier_client.payments.list(invoice_id=invoice["id"])
            latest_payment = payments.get("data", [{}])[0] if payments.get("data") else {}
            
            paid_invoices.append({
                "id": invoice["id"],
                "customer_id": invoice["customer_id"],
                "customer_name": customer.get("name", ""),
                "invoice_number": invoice["invoice_number"],
                "amount": invoice["amount"],
                "status": invoice["status"],
                "paid_date": latest_payment.get("created_at", ""),
                "payment_method": latest_payment.get("method", ""),
                "payment_id": latest_payment.get("id", "")
            })
        
        return paid_invoices
    
    async def get_new_payments(self, since_timestamp: str = None) -> List[Dict[str, Any]]:
        """Get payments received since timestamp for Zapier trigger"""
        params = {"limit": 100}
        if since_timestamp:
            params["created_since"] = since_timestamp
        
        response = await self.frontier_client.payments.list(**params)
        
        # Format for Zapier
        payments = []
        for payment in response.get("data", []):
            customer = await self.frontier_client.customers.get(payment["customer_id"])
            
            payments.append({
                "id": payment["id"],
                "customer_id": payment["customer_id"],
                "customer_name": customer.get("name", ""),
                "invoice_id": payment.get("invoice_id", ""),
                "amount": payment["amount"],
                "method": payment["method"],
                "status": payment["status"],
                "transaction_id": payment.get("transaction_id", ""),
                "created_at": payment["created_at"]
            })
        
        return payments
    
    async def get_new_projects(self, since_timestamp: str = None) -> List[Dict[str, Any]]:
        """Get projects created since timestamp for Zapier trigger"""
        params = {"limit": 100}
        if since_timestamp:
            params["created_since"] = since_timestamp
        
        response = await self.frontier_client.projects.list(**params)
        
        # Format for Zapier
        projects = []
        for project in response.get("data", []):
            customer = await self.frontier_client.customers.get(project["customer_id"])
            
            projects.append({
                "id": project["id"],
                "customer_id": project["customer_id"],
                "customer_name": customer.get("name", ""),
                "name": project["name"],
                "description": project.get("description", ""),
                "status": project["status"],
                "start_date": project.get("start_date", ""),
                "end_date": project.get("end_date", ""),
                "budget": project.get("budget", 0),
                "created_at": project["created_at"]
            })
        
        return projects
    
    # Action Handlers
    
    async def create_customer_action(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create customer action for Zapier"""
        # Clean up data
        cleaned_data = {k: v for k, v in customer_data.items() if v and v.strip()}
        
        # Create customer
        customer = await self.frontier_client.customers.create(cleaned_data)
        
        return {
            "id": customer["id"],
            "name": customer["name"],
            "email": customer.get("email", ""),
            "phone": customer.get("phone", ""),
            "created_at": customer["created_at"]
        }
    
    async def create_invoice_action(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create invoice action for Zapier"""
        # Process line items if provided as JSON string
        if "line_items" in invoice_data and isinstance(invoice_data["line_items"], str):
            try:
                invoice_data["line_items"] = json.loads(invoice_data["line_items"])
            except json.JSONDecodeError:
                del invoice_data["line_items"]
        
        # Create invoice
        invoice = await self.frontier_client.invoices.create(invoice_data)
        
        return {
            "id": invoice["id"],
            "customer_id": invoice["customer_id"],
            "invoice_number": invoice["invoice_number"],
            "amount": invoice["amount"],
            "status": invoice["status"],
            "due_date": invoice.get("due_date", ""),
            "created_at": invoice["created_at"]
        }
    
    async def record_payment_action(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record payment action for Zapier"""
        # Clean up data
        cleaned_data = {k: v for k, v in payment_data.items() if v is not None}
        
        # Create payment
        payment = await self.frontier_client.payments.create(cleaned_data)
        
        return {
            "id": payment["id"],
            "customer_id": payment["customer_id"],
            "invoice_id": payment.get("invoice_id", ""),
            "amount": payment["amount"],
            "method": payment["method"],
            "status": payment["status"],
            "created_at": payment["created_at"]
        }
    
    async def create_project_action(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create project action for Zapier"""
        # Clean up data
        cleaned_data = {k: v for k, v in project_data.items() if v is not None}
        
        # Create project
        project = await self.frontier_client.projects.create(cleaned_data)
        
        return {
            "id": project["id"],
            "customer_id": project["customer_id"],
            "name": project["name"],
            "description": project.get("description", ""),
            "status": project["status"],
            "budget": project.get("budget", 0),
            "created_at": project["created_at"]
        }
    
    # Search Handlers
    
    async def search_customers(self, search_term: str = "") -> List[Dict[str, Any]]:
        """Search customers for Zapier dropdown"""
        if search_term:
            customers_response = await self.frontier_client.customers.search(search_term, limit=50)
        else:
            customers_response = await self.frontier_client.customers.list(limit=50)
        
        return [
            {
                "id": customer["id"],
                "name": customer["name"]
            }
            for customer in customers_response.get("data", [])
        ]
    
    async def search_invoices(self, customer_id: str = "", status: str = "") -> List[Dict[str, Any]]:
        """Search invoices for Zapier dropdown"""
        params = {"limit": 50}
        if customer_id:
            params["customer_id"] = customer_id
        if status:
            params["status"] = status
        
        invoices_response = await self.frontier_client.invoices.list(**params)
        
        return [
            {
                "id": invoice["id"],
                "invoice_number": invoice["invoice_number"]
            }
            for invoice in invoices_response.get("data", [])
        ]

# Zapier App Package Definition

def create_zapier_package():
    """Create the complete Zapier app package"""
    
    # This would be the actual package.json for Zapier CLI
    package_json = {
        "name": "frontier-operations-platform",
        "version": "1.0.0",
        "description": "Connect your business operations with Frontier's comprehensive platform",
        "main": "index.js",
        "scripts": {
            "test": "zapier test",
            "deploy": "zapier push"
        },
        "dependencies": {
            "zapier-platform-core": "^15.0.0"
        },
        "engines": {
            "node": ">=18.0.0",
            "npm": ">=8.0.0"
        }
    }
    
    # Main index.js file for Zapier
    index_js = """
const {
  config: { authentication, platformVersion, version, title, description }
} = require('./zapier-config');

const customerCreatedTrigger = require('./triggers/customer-created');
const invoiceCreatedTrigger = require('./triggers/invoice-created');
const invoicePaidTrigger = require('./triggers/invoice-paid');
const paymentReceivedTrigger = require('./triggers/payment-received');
const projectCreatedTrigger = require('./triggers/project-created');

const createCustomerAction = require('./creates/create-customer');
const createInvoiceAction = require('./creates/create-invoice');
const recordPaymentAction = require('./creates/record-payment');
const createProjectAction = require('./creates/create-project');

const customerSearch = require('./searches/customer-list');
const invoiceSearch = require('./searches/invoice-list');

module.exports = {
  version,
  platformVersion,
  title,
  description,
  authentication,
  
  triggers: {
    [customerCreatedTrigger.key]: customerCreatedTrigger,
    [invoiceCreatedTrigger.key]: invoiceCreatedTrigger,
    [invoicePaidTrigger.key]: invoicePaidTrigger,
    [paymentReceivedTrigger.key]: paymentReceivedTrigger,
    [projectCreatedTrigger.key]: projectCreatedTrigger
  },
  
  creates: {
    [createCustomerAction.key]: createCustomerAction,
    [createInvoiceAction.key]: createInvoiceAction,
    [recordPaymentAction.key]: recordPaymentAction,
    [createProjectAction.key]: createProjectAction
  },
  
  searches: {
    [customerSearch.key]: customerSearch,
    [invoiceSearch.key]: invoiceSearch
  }
};
"""
    
    return {
        "zapier_config": ZAPIER_APP_DEFINITION,
        "package_json": package_json,
        "index_js": index_js,
        "integration_handler": ZapierIntegration
    }

# Usage example
def example_zapier_workflow():
    """Example of a complete Zapier workflow"""
    
    workflow_examples = [
        {
            "name": "New Customer Welcome Email",
            "trigger": "New Customer in Frontier",
            "actions": [
                "Send welcome email via Gmail",
                "Add contact to Mailchimp list",
                "Create task in Asana for onboarding"
            ]
        },
        {
            "name": "Invoice Payment Processing",
            "trigger": "Invoice Paid in Frontier",
            "actions": [
                "Send thank you email",
                "Update customer record in CRM",
                "Post to Slack channel",
                "Add payment to Google Sheets"
            ]
        },
        {
            "name": "Project Kickoff Automation",
            "trigger": "New Project in Frontier",
            "actions": [
                "Create Trello board",
                "Schedule kickoff meeting in Calendly",
                "Send project welcome packet via email",
                "Create folder in Google Drive"
            ]
        },
        {
            "name": "Cross-Platform Customer Sync",
            "trigger": "New Contact in HubSpot",
            "actions": [
                "Create Customer in Frontier",
                "Add to QuickBooks as Customer",
                "Create deal in Salesforce"
            ]
        }
    ]
    
    return workflow_examples

if __name__ == "__main__":
    # Generate Zapier package
    zapier_package = create_zapier_package()
    
    print("Frontier Zapier Integration Package Created")
    print(f"App Version: {zapier_package['zapier_config']['version']}")
    print(f"Platform Version: {zapier_package['zapier_config']['platformVersion']}")
    
    # Display available triggers and actions
    print("\nAvailable Triggers:")
    for key, trigger in zapier_package['zapier_config']['triggers'].items():
        print(f"  - {trigger['display']['label']}: {trigger['display']['description']}")
    
    print("\nAvailable Actions:")
    for key, action in zapier_package['zapier_config']['creates'].items():
        print(f"  - {action['display']['label']}: {action['display']['description']}")
    
    print("\nExample Workflows:")
    for workflow in example_zapier_workflow():
        print(f"  - {workflow['name']}")
        print(f"    Trigger: {workflow['trigger']}")
        print(f"    Actions: {', '.join(workflow['actions'])}")
        print()
