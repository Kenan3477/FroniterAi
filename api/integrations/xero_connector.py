"""
Xero Integration
Handles Xero API integration for accounting data synchronization
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import base64
import uuid

@dataclass
class XeroCredentials:
    """Xero API credentials"""
    client_id: str
    client_secret: str
    access_token: str
    refresh_token: str
    tenant_id: str  # Organization ID
    token_expires_at: datetime
    refresh_expires_at: datetime

class XeroError(Exception):
    """Xero API error"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class XeroConnector:
    """Xero API connector"""
    
    def __init__(self, credentials: XeroCredentials):
        self.credentials = credentials
        self.base_url = "https://api.xero.com/api.xro/2.0"
        self.oauth_url = "https://identity.xero.com"
        self.session = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _ensure_valid_token(self):
        """Ensure access token is valid, refresh if needed"""
        now = datetime.utcnow()
        
        # Check if token needs refresh (5 minutes buffer)
        if now >= (self.credentials.token_expires_at - timedelta(minutes=5)):
            await self._refresh_access_token()
    
    async def _refresh_access_token(self):
        """Refresh the access token using refresh token"""
        url = f"{self.oauth_url}/connect/token"
        
        auth_header = base64.b64encode(
            f"{self.credentials.client_id}:{self.credentials.client_secret}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.credentials.refresh_token
        }
        
        async with self.session.post(url, headers=headers, data=data) as response:
            if response.status != 200:
                raise XeroError(f"Token refresh failed: {response.status}")
            
            token_data = await response.json()
            
            # Update credentials
            self.credentials.access_token = token_data["access_token"]
            self.credentials.refresh_token = token_data.get("refresh_token", self.credentials.refresh_token)
            self.credentials.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
    
    async def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict[str, Any]:
        """Make authenticated request to Xero API"""
        await self._ensure_valid_token()
        
        url = f"{self.base_url}/{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Xero-tenant-id": self.credentials.tenant_id,
            "Accept": "application/json"
        }
        
        if method.upper() in ["POST", "PUT"]:
            headers["Content-Type"] = "application/json"
        
        async with self.session.request(method, url, headers=headers, json=data, params=params) as response:
            response_text = await response.text()
            
            try:
                response_data = json.loads(response_text)
            except json.JSONDecodeError:
                response_data = {"message": response_text}
            
            if response.status >= 400:
                error_msg = response_data.get("Message", response_data.get("message", "Unknown error"))
                error_code = response_data.get("ErrorNumber", "UNKNOWN")
                raise XeroError(error_msg, str(error_code))
            
            return response_data
    
    # Contact Management (Customers/Suppliers)
    
    async def get_contacts(self, contact_type: str = None) -> List[Dict[str, Any]]:
        """Get contacts from Xero"""
        params = {}
        if contact_type:
            params["where"] = f'IsCustomer=={contact_type.lower() == "customer"}'
        
        response = await self._make_request("GET", "Contacts", params=params)
        return response.get("Contacts", [])
    
    async def create_contact(self, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new contact in Xero"""
        data = {
            "Contacts": [{
                "Name": contact_data["name"],
                "EmailAddress": contact_data.get("email"),
                "ContactNumber": contact_data.get("contact_number"),
                "IsCustomer": contact_data.get("is_customer", True),
                "IsSupplier": contact_data.get("is_supplier", False),
                "Addresses": [{
                    "AddressType": "STREET",
                    "AddressLine1": contact_data.get("address_line1"),
                    "City": contact_data.get("city"),
                    "Region": contact_data.get("state"),
                    "PostalCode": contact_data.get("postal_code"),
                    "Country": contact_data.get("country", "US")
                }] if contact_data.get("address_line1") else [],
                "Phones": [{
                    "PhoneType": "DEFAULT",
                    "PhoneNumber": contact_data.get("phone")
                }] if contact_data.get("phone") else []
            }]
        }
        
        # Remove empty arrays and None values
        contact = data["Contacts"][0]
        data["Contacts"][0] = {k: v for k, v in contact.items() if v is not None and v != []}
        
        response = await self._make_request("POST", "Contacts", data)
        return response.get("Contacts", [{}])[0]
    
    async def update_contact(self, contact_id: str, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing contact in Xero"""
        data = {
            "Contacts": [{
                "ContactID": contact_id
            }]
        }
        
        # Add fields to update
        contact = data["Contacts"][0]
        if "name" in contact_data:
            contact["Name"] = contact_data["name"]
        if "email" in contact_data:
            contact["EmailAddress"] = contact_data["email"]
        
        response = await self._make_request("POST", "Contacts", data)
        return response.get("Contacts", [{}])[0]
    
    async def get_contact_by_id(self, contact_id: str) -> Dict[str, Any]:
        """Get contact by ID"""
        response = await self._make_request("GET", f"Contacts/{contact_id}")
        return response.get("Contacts", [{}])[0]
    
    # Invoice Management
    
    async def get_invoices(self, status: str = None, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Get invoices from Xero"""
        params = {}
        
        conditions = []
        if status:
            conditions.append(f"Status==\"{status.upper()}\"")
        if start_date:
            conditions.append(f"Date>=DateTime({start_date.year},{start_date.month},{start_date.day})")
        if end_date:
            conditions.append(f"Date<=DateTime({end_date.year},{end_date.month},{end_date.day})")
        
        if conditions:
            params["where"] = " AND ".join(conditions)
        
        response = await self._make_request("GET", "Invoices", params=params)
        return response.get("Invoices", [])
    
    async def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new invoice in Xero"""
        line_items = []
        for item in invoice_data.get("line_items", []):
            line_items.append({
                "Description": item.get("description", "Service"),
                "Quantity": item.get("quantity", 1),
                "UnitAmount": item.get("unit_amount", item["amount"]),
                "AccountCode": item.get("account_code", "200"),  # Sales account
                "TaxType": item.get("tax_type", "NONE")
            })
        
        data = {
            "Invoices": [{
                "Type": "ACCREC",  # Accounts Receivable
                "Contact": {"ContactID": invoice_data["contact_id"]},
                "Date": invoice_data.get("date", datetime.now().strftime("%Y-%m-%d")),
                "DueDate": invoice_data.get("due_date"),
                "InvoiceNumber": invoice_data.get("invoice_number"),
                "Reference": invoice_data.get("reference"),
                "Status": "AUTHORISED",
                "LineItems": line_items,
                "CurrencyCode": invoice_data.get("currency", "USD")
            }]
        }
        
        # Remove None values
        invoice = data["Invoices"][0]
        data["Invoices"][0] = {k: v for k, v in invoice.items() if v is not None}
        
        response = await self._make_request("POST", "Invoices", data)
        return response.get("Invoices", [{}])[0]
    
    async def get_invoice_by_id(self, invoice_id: str) -> Dict[str, Any]:
        """Get invoice by ID"""
        response = await self._make_request("GET", f"Invoices/{invoice_id}")
        return response.get("Invoices", [{}])[0]
    
    async def update_invoice_status(self, invoice_id: str, status: str) -> Dict[str, Any]:
        """Update invoice status"""
        data = {
            "Invoices": [{
                "InvoiceID": invoice_id,
                "Status": status.upper()
            }]
        }
        
        response = await self._make_request("POST", "Invoices", data)
        return response.get("Invoices", [{}])[0]
    
    # Payment Management
    
    async def get_payments(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Get payments from Xero"""
        params = {}
        
        if start_date or end_date:
            conditions = []
            if start_date:
                conditions.append(f"Date>=DateTime({start_date.year},{start_date.month},{start_date.day})")
            if end_date:
                conditions.append(f"Date<=DateTime({end_date.year},{end_date.month},{end_date.day})")
            params["where"] = " AND ".join(conditions)
        
        response = await self._make_request("GET", "Payments", params=params)
        return response.get("Payments", [])
    
    async def create_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a payment in Xero"""
        data = {
            "Payments": [{
                "Invoice": {"InvoiceID": payment_data["invoice_id"]},
                "Account": {"AccountID": payment_data.get("account_id")},
                "Date": payment_data.get("date", datetime.now().strftime("%Y-%m-%d")),
                "Amount": payment_data["amount"],
                "Reference": payment_data.get("reference")
            }]
        }
        
        # Remove None values
        payment = data["Payments"][0]
        data["Payments"][0] = {k: v for k, v in payment.items() if v is not None}
        
        response = await self._make_request("POST", "Payments", data)
        return response.get("Payments", [{}])[0]
    
    # Account Management
    
    async def get_accounts(self) -> List[Dict[str, Any]]:
        """Get chart of accounts"""
        response = await self._make_request("GET", "Accounts")
        return response.get("Accounts", [])
    
    async def get_account_by_id(self, account_id: str) -> Dict[str, Any]:
        """Get account by ID"""
        response = await self._make_request("GET", f"Accounts/{account_id}")
        return response.get("Accounts", [{}])[0]
    
    async def create_account(self, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new account"""
        data = {
            "Accounts": [{
                "Code": account_data["code"],
                "Name": account_data["name"],
                "Type": account_data["type"],  # BANK, CURRENT, EXPENSE, etc.
                "Description": account_data.get("description"),
                "TaxType": account_data.get("tax_type", "NONE")
            }]
        }
        
        # Remove None values
        account = data["Accounts"][0]
        data["Accounts"][0] = {k: v for k, v in account.items() if v is not None}
        
        response = await self._make_request("POST", "Accounts", data)
        return response.get("Accounts", [{}])[0]
    
    # Items
    
    async def get_items(self) -> List[Dict[str, Any]]:
        """Get all items/products"""
        response = await self._make_request("GET", "Items")
        return response.get("Items", [])
    
    async def create_item(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item/product"""
        data = {
            "Items": [{
                "Code": item_data["code"],
                "Name": item_data["name"],
                "Description": item_data.get("description"),
                "UnitPrice": item_data.get("unit_price", 0),
                "SalesDetails": {
                    "UnitPrice": item_data.get("unit_price", 0),
                    "AccountCode": item_data.get("sales_account_code", "200"),
                    "TaxType": item_data.get("tax_type", "NONE")
                },
                "IsTrackedAsInventory": item_data.get("is_inventory", False)
            }]
        }
        
        response = await self._make_request("POST", "Items", data)
        return response.get("Items", [{}])[0]
    
    # Organization Information
    
    async def get_organization(self) -> Dict[str, Any]:
        """Get organization information"""
        response = await self._make_request("GET", "Organisation")
        return response.get("Organisations", [{}])[0]
    
    # Bank Transactions
    
    async def get_bank_transactions(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Get bank transactions"""
        params = {}
        
        if start_date or end_date:
            conditions = []
            if start_date:
                conditions.append(f"Date>=DateTime({start_date.year},{start_date.month},{start_date.day})")
            if end_date:
                conditions.append(f"Date<=DateTime({end_date.year},{end_date.month},{end_date.day})")
            params["where"] = " AND ".join(conditions)
        
        response = await self._make_request("GET", "BankTransactions", params=params)
        return response.get("BankTransactions", [])
    
    async def create_bank_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a bank transaction"""
        data = {
            "BankTransactions": [{
                "Type": transaction_data["type"],  # RECEIVE or SPEND
                "Contact": {"ContactID": transaction_data.get("contact_id")} if transaction_data.get("contact_id") else None,
                "Date": transaction_data.get("date", datetime.now().strftime("%Y-%m-%d")),
                "Reference": transaction_data.get("reference"),
                "IsReconciled": False,
                "LineItems": [{
                    "Description": transaction_data.get("description", "Transaction"),
                    "UnitAmount": transaction_data["amount"],
                    "AccountCode": transaction_data.get("account_code", "200"),
                    "TaxType": transaction_data.get("tax_type", "NONE")
                }],
                "BankAccount": {"AccountID": transaction_data["bank_account_id"]}
            }]
        }
        
        # Remove None values
        transaction = data["BankTransactions"][0]
        data["BankTransactions"][0] = {k: v for k, v in transaction.items() if v is not None}
        
        response = await self._make_request("POST", "BankTransactions", data)
        return response.get("BankTransactions", [{}])[0]
    
    # Reports
    
    async def get_profit_loss_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get Profit & Loss report"""
        params = {
            "fromDate": start_date.strftime("%Y-%m-%d"),
            "toDate": end_date.strftime("%Y-%m-%d")
        }
        
        response = await self._make_request("GET", "Reports/ProfitAndLoss", params=params)
        return response
    
    async def get_balance_sheet_report(self, as_of_date: datetime) -> Dict[str, Any]:
        """Get Balance Sheet report"""
        params = {
            "date": as_of_date.strftime("%Y-%m-%d")
        }
        
        response = await self._make_request("GET", "Reports/BalanceSheet", params=params)
        return response
    
    async def get_cash_summary_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get Cash Summary report"""
        params = {
            "fromDate": start_date.strftime("%Y-%m-%d"),
            "toDate": end_date.strftime("%Y-%m-%d")
        }
        
        response = await self._make_request("GET", "Reports/CashSummary", params=params)
        return response
    
    # Sync Methods
    
    async def sync_all_data(self) -> Dict[str, Any]:
        """Sync all data from Xero"""
        sync_data = {}
        
        try:
            # Get organization info
            sync_data["organization"] = await self.get_organization()
            
            # Get contacts
            sync_data["contacts"] = await self.get_contacts()
            
            # Get recent invoices (last 90 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=90)
            sync_data["invoices"] = await self.get_invoices(start_date=start_date, end_date=end_date)
            
            # Get recent payments
            sync_data["payments"] = await self.get_payments(start_date, end_date)
            
            # Get accounts
            sync_data["accounts"] = await self.get_accounts()
            
            # Get items
            sync_data["items"] = await self.get_items()
            
            # Get bank transactions
            sync_data["bank_transactions"] = await self.get_bank_transactions(start_date, end_date)
            
            # Get reports
            sync_data["profit_loss"] = await self.get_profit_loss_report(start_date, end_date)
            sync_data["balance_sheet"] = await self.get_balance_sheet_report(end_date)
            
            sync_data["sync_timestamp"] = datetime.utcnow().isoformat()
            sync_data["success"] = True
            
        except Exception as e:
            sync_data["error"] = str(e)
            sync_data["success"] = False
        
        return sync_data

# OAuth2 Helper Functions

class XeroOAuth:
    """Xero OAuth2 helper"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.oauth_url = "https://login.xero.com/identity/connect/authorize"
        self.token_url = "https://identity.xero.com/connect/token"
        self.connections_url = "https://api.xero.com/connections"
    
    def get_authorization_url(self, state: str = None) -> str:
        """Get authorization URL for OAuth flow"""
        from urllib.parse import urlencode
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "accounting.transactions accounting.contacts accounting.settings",
            "state": state or str(uuid.uuid4())
        }
        
        return f"{self.oauth_url}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access tokens"""
        auth_header = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.token_url, headers=headers, data=data) as response:
                if response.status != 200:
                    raise XeroError(f"Token exchange failed: {response.status}")
                
                return await response.json()
    
    async def get_tenant_connections(self, access_token: str) -> List[Dict[str, Any]]:
        """Get available tenant connections"""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(self.connections_url, headers=headers) as response:
                if response.status != 200:
                    raise XeroError(f"Failed to get connections: {response.status}")
                
                return await response.json()
    
    async def create_credentials(self, code: str) -> List[XeroCredentials]:
        """Create credentials for all available tenants"""
        # Exchange code for tokens
        token_data = await self.exchange_code_for_tokens(code)
        
        # Get tenant connections
        connections = await self.get_tenant_connections(token_data["access_token"])
        
        now = datetime.utcnow()
        credentials_list = []
        
        for connection in connections:
            credentials = XeroCredentials(
                client_id=self.client_id,
                client_secret=self.client_secret,
                access_token=token_data["access_token"],
                refresh_token=token_data["refresh_token"],
                tenant_id=connection["tenantId"],
                token_expires_at=now + timedelta(seconds=token_data["expires_in"]),
                refresh_expires_at=now + timedelta(days=60)  # Refresh tokens last 60 days
            )
            credentials_list.append(credentials)
        
        return credentials_list

# Example usage and testing functions

async def test_xero_integration():
    """Test Xero integration"""
    # This would use real credentials in production
    credentials = XeroCredentials(
        client_id="test_client_id",
        client_secret="test_client_secret",
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        tenant_id="test_tenant_id",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        refresh_expires_at=datetime.utcnow() + timedelta(days=30)
    )
    
    async with XeroConnector(credentials) as xero:
        try:
            # Test getting organization info
            org_info = await xero.get_organization()
            print(f"Organization: {org_info.get('Name')}")
            
            # Test getting contacts
            contacts = await xero.get_contacts()
            print(f"Found {len(contacts)} contacts")
            
            # Test sync all data
            sync_result = await xero.sync_all_data()
            print(f"Sync successful: {sync_result['success']}")
            
        except XeroError as e:
            print(f"Xero error: {e.message} (Code: {e.error_code})")
        except Exception as e:
            print(f"General error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_xero_integration())
