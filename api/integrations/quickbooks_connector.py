"""
QuickBooks Integration
Handles QuickBooks Online API integration for accounting data synchronization
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import base64
import hashlib
import hmac
from urllib.parse import urlencode, parse_qs

@dataclass
class QuickBooksCredentials:
    """QuickBooks API credentials"""
    client_id: str
    client_secret: str
    access_token: str
    refresh_token: str
    realm_id: str  # Company ID
    token_expires_at: datetime
    refresh_expires_at: datetime

class QuickBooksError(Exception):
    """QuickBooks API error"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class QuickBooksConnector:
    """QuickBooks Online API connector"""
    
    def __init__(self, credentials: QuickBooksCredentials):
        self.credentials = credentials
        self.base_url = "https://sandbox-quickbooks.api.intuit.com"  # Use production URL in prod
        self.oauth_base_url = "https://oauth.platform.intuit.com"
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
        url = f"{self.oauth_base_url}/oauth2/v1/tokens/bearer"
        
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
                raise QuickBooksError(f"Token refresh failed: {response.status}")
            
            token_data = await response.json()
            
            # Update credentials
            self.credentials.access_token = token_data["access_token"]
            self.credentials.refresh_token = token_data.get("refresh_token", self.credentials.refresh_token)
            self.credentials.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
    
    async def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict[str, Any]:
        """Make authenticated request to QuickBooks API"""
        await self._ensure_valid_token()
        
        url = f"{self.base_url}/v3/company/{self.credentials.realm_id}/{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Accept": "application/json"
        }
        
        if method.upper() in ["POST", "PUT"]:
            headers["Content-Type"] = "application/json"
        
        async with self.session.request(method, url, headers=headers, json=data) as response:
            response_data = await response.json()
            
            if response.status >= 400:
                error_msg = response_data.get("Fault", {}).get("Error", [{}])[0].get("Detail", "Unknown error")
                error_code = response_data.get("Fault", {}).get("Error", [{}])[0].get("code", "UNKNOWN")
                raise QuickBooksError(error_msg, error_code)
            
            return response_data
    
    # Customer Management
    
    async def get_customers(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all customers from QuickBooks"""
        query = "SELECT * FROM Customer"
        if active_only:
            query += " WHERE Active = true"
        
        response = await self._make_request("GET", f"query?query={query}")
        return response.get("QueryResponse", {}).get("Customer", [])
    
    async def create_customer(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new customer in QuickBooks"""
        data = {
            "Customer": {
                "Name": customer_data["name"],
                "CompanyName": customer_data.get("company_name"),
                "PrimaryEmailAddr": {
                    "Address": customer_data.get("email")
                } if customer_data.get("email") else None,
                "PrimaryPhone": {
                    "FreeFormNumber": customer_data.get("phone")
                } if customer_data.get("phone") else None,
                "BillAddr": {
                    "Line1": customer_data.get("address_line1"),
                    "City": customer_data.get("city"),
                    "CountrySubDivisionCode": customer_data.get("state"),
                    "PostalCode": customer_data.get("zip_code"),
                    "Country": customer_data.get("country", "USA")
                } if customer_data.get("address_line1") else None
            }
        }
        
        # Remove None values
        data["Customer"] = {k: v for k, v in data["Customer"].items() if v is not None}
        
        response = await self._make_request("POST", "customer", data)
        return response.get("QueryResponse", {}).get("Customer", [{}])[0]
    
    async def update_customer(self, customer_id: str, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing customer in QuickBooks"""
        # First get the current customer to get sync token
        current_customer = await self.get_customer_by_id(customer_id)
        
        data = {
            "Customer": {
                "Id": customer_id,
                "SyncToken": current_customer["SyncToken"],
                "sparse": True  # Only update provided fields
            }
        }
        
        # Add fields to update
        if "name" in customer_data:
            data["Customer"]["Name"] = customer_data["name"]
        if "email" in customer_data:
            data["Customer"]["PrimaryEmailAddr"] = {"Address": customer_data["email"]}
        
        response = await self._make_request("POST", "customer", data)
        return response.get("QueryResponse", {}).get("Customer", [{}])[0]
    
    async def get_customer_by_id(self, customer_id: str) -> Dict[str, Any]:
        """Get customer by ID"""
        response = await self._make_request("GET", f"customer/{customer_id}")
        return response.get("QueryResponse", {}).get("Customer", [{}])[0]
    
    # Invoice Management
    
    async def get_invoices(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Get invoices from QuickBooks"""
        query = "SELECT * FROM Invoice"
        
        if start_date or end_date:
            conditions = []
            if start_date:
                conditions.append(f"TxnDate >= '{start_date.strftime('%Y-%m-%d')}'")
            if end_date:
                conditions.append(f"TxnDate <= '{end_date.strftime('%Y-%m-%d')}'")
            query += " WHERE " + " AND ".join(conditions)
        
        response = await self._make_request("GET", f"query?query={query}")
        return response.get("QueryResponse", {}).get("Invoice", [])
    
    async def create_invoice(self, invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new invoice in QuickBooks"""
        line_items = []
        for item in invoice_data.get("line_items", []):
            line_items.append({
                "Amount": item["amount"],
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "ItemRef": {"value": item.get("item_id", "1")},  # Default to first item
                    "Qty": item.get("quantity", 1),
                    "UnitPrice": item.get("unit_price", item["amount"])
                }
            })
        
        data = {
            "Invoice": {
                "CustomerRef": {"value": invoice_data["customer_id"]},
                "TxnDate": invoice_data.get("date", datetime.now().strftime("%Y-%m-%d")),
                "DueDate": invoice_data.get("due_date"),
                "Line": line_items,
                "DocNumber": invoice_data.get("invoice_number")
            }
        }
        
        # Remove None values
        data["Invoice"] = {k: v for k, v in data["Invoice"].items() if v is not None}
        
        response = await self._make_request("POST", "invoice", data)
        return response.get("QueryResponse", {}).get("Invoice", [{}])[0]
    
    async def get_invoice_by_id(self, invoice_id: str) -> Dict[str, Any]:
        """Get invoice by ID"""
        response = await self._make_request("GET", f"invoice/{invoice_id}")
        return response.get("QueryResponse", {}).get("Invoice", [{}])[0]
    
    # Payment Management
    
    async def get_payments(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
        """Get payments from QuickBooks"""
        query = "SELECT * FROM Payment"
        
        if start_date or end_date:
            conditions = []
            if start_date:
                conditions.append(f"TxnDate >= '{start_date.strftime('%Y-%m-%d')}'")
            if end_date:
                conditions.append(f"TxnDate <= '{end_date.strftime('%Y-%m-%d')}'")
            query += " WHERE " + " AND ".join(conditions)
        
        response = await self._make_request("GET", f"query?query={query}")
        return response.get("QueryResponse", {}).get("Payment", [])
    
    async def create_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a payment in QuickBooks"""
        data = {
            "Payment": {
                "CustomerRef": {"value": payment_data["customer_id"]},
                "TotalAmt": payment_data["amount"],
                "TxnDate": payment_data.get("date", datetime.now().strftime("%Y-%m-%d")),
                "PaymentMethodRef": {"value": payment_data.get("payment_method_id", "1")},
                "Line": [{
                    "Amount": payment_data["amount"],
                    "LinkedTxn": [{
                        "TxnId": payment_data["invoice_id"],
                        "TxnType": "Invoice"
                    }]
                }] if payment_data.get("invoice_id") else None
            }
        }
        
        # Remove None values
        data["Payment"] = {k: v for k, v in data["Payment"].items() if v is not None}
        
        response = await self._make_request("POST", "payment", data)
        return response.get("QueryResponse", {}).get("Payment", [{}])[0]
    
    # Chart of Accounts
    
    async def get_accounts(self) -> List[Dict[str, Any]]:
        """Get chart of accounts"""
        response = await self._make_request("GET", "query?query=SELECT * FROM Account")
        return response.get("QueryResponse", {}).get("Account", [])
    
    async def get_account_by_id(self, account_id: str) -> Dict[str, Any]:
        """Get account by ID"""
        response = await self._make_request("GET", f"account/{account_id}")
        return response.get("QueryResponse", {}).get("Account", [{}])[0]
    
    # Items
    
    async def get_items(self) -> List[Dict[str, Any]]:
        """Get all items/products"""
        response = await self._make_request("GET", "query?query=SELECT * FROM Item")
        return response.get("QueryResponse", {}).get("Item", [])
    
    async def create_item(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new item/product"""
        data = {
            "Item": {
                "Name": item_data["name"],
                "Type": item_data.get("type", "Service"),
                "IncomeAccountRef": {"value": item_data.get("income_account_id", "79")},  # Sales account
                "UnitPrice": item_data.get("unit_price", 0),
                "Description": item_data.get("description")
            }
        }
        
        # Remove None values
        data["Item"] = {k: v for k, v in data["Item"].items() if v is not None}
        
        response = await self._make_request("POST", "item", data)
        return response.get("QueryResponse", {}).get("Item", [{}])[0]
    
    # Company Information
    
    async def get_company_info(self) -> Dict[str, Any]:
        """Get company information"""
        response = await self._make_request("GET", "companyinfo/1")
        return response.get("QueryResponse", {}).get("CompanyInfo", [{}])[0]
    
    # Reports
    
    async def get_profit_loss_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get Profit & Loss report"""
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = await self._make_request("GET", f"reports/ProfitAndLoss?{urlencode(params)}")
        return response
    
    async def get_balance_sheet_report(self, as_of_date: datetime) -> Dict[str, Any]:
        """Get Balance Sheet report"""
        params = {
            "as_of_date": as_of_date.strftime("%Y-%m-%d")
        }
        
        response = await self._make_request("GET", f"reports/BalanceSheet?{urlencode(params)}")
        return response
    
    async def get_cash_flow_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get Cash Flow report"""
        params = {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
        
        response = await self._make_request("GET", f"reports/CashFlow?{urlencode(params)}")
        return response
    
    # Sync Methods
    
    async def sync_all_data(self) -> Dict[str, Any]:
        """Sync all data from QuickBooks"""
        sync_data = {}
        
        try:
            # Get company info
            sync_data["company_info"] = await self.get_company_info()
            
            # Get customers
            sync_data["customers"] = await self.get_customers()
            
            # Get recent invoices (last 90 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=90)
            sync_data["invoices"] = await self.get_invoices(start_date, end_date)
            
            # Get recent payments
            sync_data["payments"] = await self.get_payments(start_date, end_date)
            
            # Get accounts
            sync_data["accounts"] = await self.get_accounts()
            
            # Get items
            sync_data["items"] = await self.get_items()
            
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

class QuickBooksOAuth:
    """QuickBooks OAuth2 helper"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.oauth_base_url = "https://appcenter.intuit.com/connect/oauth2"
        self.token_url = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
        self.discovery_url = "https://developer.api.intuit.com/.well-known/connect_uri/ipp"
    
    def get_authorization_url(self, state: str = None) -> str:
        """Get authorization URL for OAuth flow"""
        params = {
            "client_id": self.client_id,
            "scope": "com.intuit.quickbooks.accounting",
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "access_type": "offline"
        }
        
        if state:
            params["state"] = state
        
        return f"{self.oauth_base_url}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(self, code: str, realm_id: str) -> QuickBooksCredentials:
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
                    raise QuickBooksError(f"Token exchange failed: {response.status}")
                
                token_data = await response.json()
                
                now = datetime.utcnow()
                
                return QuickBooksCredentials(
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    access_token=token_data["access_token"],
                    refresh_token=token_data["refresh_token"],
                    realm_id=realm_id,
                    token_expires_at=now + timedelta(seconds=token_data["expires_in"]),
                    refresh_expires_at=now + timedelta(seconds=token_data["x_refresh_token_expires_in"])
                )

# Example usage and testing functions

async def test_quickbooks_integration():
    """Test QuickBooks integration"""
    # This would use real credentials in production
    credentials = QuickBooksCredentials(
        client_id="test_client_id",
        client_secret="test_client_secret",
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        realm_id="test_realm_id",
        token_expires_at=datetime.utcnow() + timedelta(hours=1),
        refresh_expires_at=datetime.utcnow() + timedelta(days=30)
    )
    
    async with QuickBooksConnector(credentials) as qb:
        try:
            # Test getting company info
            company_info = await qb.get_company_info()
            print(f"Company: {company_info.get('CompanyName')}")
            
            # Test getting customers
            customers = await qb.get_customers()
            print(f"Found {len(customers)} customers")
            
            # Test sync all data
            sync_result = await qb.sync_all_data()
            print(f"Sync successful: {sync_result['success']}")
            
        except QuickBooksError as e:
            print(f"QuickBooks error: {e.message} (Code: {e.error_code})")
        except Exception as e:
            print(f"General error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_quickbooks_integration())
