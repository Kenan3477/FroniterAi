"""
Salesforce Integration
Handles Salesforce API integration for CRM data synchronization
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import base64

@dataclass
class SalesforceCredentials:
    """Salesforce API credentials"""
    client_id: str
    client_secret: str
    username: str
    password: str
    security_token: str
    instance_url: str
    access_token: str
    token_expires_at: datetime
    is_sandbox: bool = False

class SalesforceError(Exception):
    """Salesforce API error"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class SalesforceConnector:
    """Salesforce API connector"""
    
    def __init__(self, credentials: SalesforceCredentials):
        self.credentials = credentials
        self.session = None
        self.api_version = "v58.0"  # Latest API version
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        await self._authenticate()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _authenticate(self):
        """Authenticate with Salesforce using username/password flow"""
        login_url = "https://test.salesforce.com" if self.credentials.is_sandbox else "https://login.salesforce.com"
        url = f"{login_url}/services/oauth2/token"
        
        data = {
            "grant_type": "password",
            "client_id": self.credentials.client_id,
            "client_secret": self.credentials.client_secret,
            "username": self.credentials.username,
            "password": self.credentials.password + self.credentials.security_token
        }
        
        async with self.session.post(url, data=data) as response:
            if response.status != 200:
                error_text = await response.text()
                raise SalesforceError(f"Authentication failed: {error_text}")
            
            auth_data = await response.json()
            
            self.credentials.access_token = auth_data["access_token"]
            self.credentials.instance_url = auth_data["instance_url"]
            self.credentials.token_expires_at = datetime.utcnow() + timedelta(hours=2)  # Tokens typically last 2 hours
    
    async def _ensure_valid_token(self):
        """Ensure access token is valid, re-authenticate if needed"""
        now = datetime.utcnow()
        
        # Check if token needs refresh (5 minutes buffer)
        if now >= (self.credentials.token_expires_at - timedelta(minutes=5)):
            await self._authenticate()
    
    async def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict[str, Any]:
        """Make authenticated request to Salesforce API"""
        await self._ensure_valid_token()
        
        url = f"{self.credentials.instance_url}/services/data/{self.api_version}/{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        async with self.session.request(method, url, headers=headers, json=data, params=params) as response:
            response_text = await response.text()
            
            try:
                response_data = json.loads(response_text) if response_text else {}
            except json.JSONDecodeError:
                response_data = {"message": response_text}
            
            if response.status >= 400:
                error_msg = response_data.get("message", "Unknown error")
                if isinstance(response_data, list) and response_data:
                    error_msg = response_data[0].get("message", error_msg)
                error_code = response_data.get("errorCode", "UNKNOWN")
                raise SalesforceError(error_msg, error_code)
            
            return response_data
    
    async def _query(self, soql: str) -> Dict[str, Any]:
        """Execute SOQL query"""
        params = {"q": soql}
        return await self._make_request("GET", "query", params=params)
    
    # Account Management
    
    async def get_accounts(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Get accounts from Salesforce"""
        soql = f"""
        SELECT Id, Name, Type, Industry, Website, Phone, 
               BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry,
               AnnualRevenue, NumberOfEmployees, CreatedDate, LastModifiedDate
        FROM Account 
        ORDER BY CreatedDate DESC 
        LIMIT {limit}
        """
        
        response = await self._query(soql)
        return response.get("records", [])
    
    async def create_account(self, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new account in Salesforce"""
        data = {
            "Name": account_data["name"],
            "Type": account_data.get("type", "Customer"),
            "Industry": account_data.get("industry"),
            "Website": account_data.get("website"),
            "Phone": account_data.get("phone"),
            "BillingStreet": account_data.get("billing_street"),
            "BillingCity": account_data.get("billing_city"),
            "BillingState": account_data.get("billing_state"),
            "BillingPostalCode": account_data.get("billing_postal_code"),
            "BillingCountry": account_data.get("billing_country"),
            "AnnualRevenue": account_data.get("annual_revenue"),
            "NumberOfEmployees": account_data.get("number_of_employees"),
            "Description": account_data.get("description")
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        response = await self._make_request("POST", "sobjects/Account", data)
        
        # Get the created account
        if response.get("success"):
            return await self.get_account_by_id(response["id"])
        
        return response
    
    async def update_account(self, account_id: str, account_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing account in Salesforce"""
        data = {}
        
        # Add fields to update
        if "name" in account_data:
            data["Name"] = account_data["name"]
        if "type" in account_data:
            data["Type"] = account_data["type"]
        if "industry" in account_data:
            data["Industry"] = account_data["industry"]
        if "website" in account_data:
            data["Website"] = account_data["website"]
        if "phone" in account_data:
            data["Phone"] = account_data["phone"]
        
        response = await self._make_request("PATCH", f"sobjects/Account/{account_id}", data)
        
        # Get the updated account
        return await self.get_account_by_id(account_id)
    
    async def get_account_by_id(self, account_id: str) -> Dict[str, Any]:
        """Get account by ID"""
        response = await self._make_request("GET", f"sobjects/Account/{account_id}")
        return response
    
    # Contact Management
    
    async def get_contacts(self, account_id: str = None, limit: int = 200) -> List[Dict[str, Any]]:
        """Get contacts from Salesforce"""
        soql = f"""
        SELECT Id, FirstName, LastName, Email, Phone, Title, AccountId, Account.Name,
               MailingStreet, MailingCity, MailingState, MailingPostalCode, MailingCountry,
               LeadSource, CreatedDate, LastModifiedDate
        FROM Contact
        """
        
        if account_id:
            soql += f" WHERE AccountId = '{account_id}'"
        
        soql += f" ORDER BY CreatedDate DESC LIMIT {limit}"
        
        response = await self._query(soql)
        return response.get("records", [])
    
    async def create_contact(self, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new contact in Salesforce"""
        data = {
            "FirstName": contact_data.get("first_name"),
            "LastName": contact_data["last_name"],
            "Email": contact_data.get("email"),
            "Phone": contact_data.get("phone"),
            "Title": contact_data.get("title"),
            "AccountId": contact_data.get("account_id"),
            "MailingStreet": contact_data.get("mailing_street"),
            "MailingCity": contact_data.get("mailing_city"),
            "MailingState": contact_data.get("mailing_state"),
            "MailingPostalCode": contact_data.get("mailing_postal_code"),
            "MailingCountry": contact_data.get("mailing_country"),
            "LeadSource": contact_data.get("lead_source"),
            "Description": contact_data.get("description")
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        response = await self._make_request("POST", "sobjects/Contact", data)
        
        # Get the created contact
        if response.get("success"):
            return await self.get_contact_by_id(response["id"])
        
        return response
    
    async def update_contact(self, contact_id: str, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing contact in Salesforce"""
        data = {}
        
        # Add fields to update
        if "first_name" in contact_data:
            data["FirstName"] = contact_data["first_name"]
        if "last_name" in contact_data:
            data["LastName"] = contact_data["last_name"]
        if "email" in contact_data:
            data["Email"] = contact_data["email"]
        if "phone" in contact_data:
            data["Phone"] = contact_data["phone"]
        if "title" in contact_data:
            data["Title"] = contact_data["title"]
        
        response = await self._make_request("PATCH", f"sobjects/Contact/{contact_id}", data)
        
        # Get the updated contact
        return await self.get_contact_by_id(contact_id)
    
    async def get_contact_by_id(self, contact_id: str) -> Dict[str, Any]:
        """Get contact by ID"""
        response = await self._make_request("GET", f"sobjects/Contact/{contact_id}")
        return response
    
    # Lead Management
    
    async def get_leads(self, status: str = None, limit: int = 200) -> List[Dict[str, Any]]:
        """Get leads from Salesforce"""
        soql = f"""
        SELECT Id, FirstName, LastName, Email, Phone, Title, Company, Status, 
               LeadSource, Industry, Rating, Street, City, State, PostalCode, Country,
               CreatedDate, LastModifiedDate
        FROM Lead
        """
        
        conditions = []
        if status:
            conditions.append(f"Status = '{status}'")
        
        if conditions:
            soql += " WHERE " + " AND ".join(conditions)
        
        soql += f" ORDER BY CreatedDate DESC LIMIT {limit}"
        
        response = await self._query(soql)
        return response.get("records", [])
    
    async def create_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new lead in Salesforce"""
        data = {
            "FirstName": lead_data.get("first_name"),
            "LastName": lead_data["last_name"],
            "Email": lead_data.get("email"),
            "Phone": lead_data.get("phone"),
            "Title": lead_data.get("title"),
            "Company": lead_data["company"],
            "Status": lead_data.get("status", "Open - Not Contacted"),
            "LeadSource": lead_data.get("lead_source"),
            "Industry": lead_data.get("industry"),
            "Rating": lead_data.get("rating"),
            "Street": lead_data.get("street"),
            "City": lead_data.get("city"),
            "State": lead_data.get("state"),
            "PostalCode": lead_data.get("postal_code"),
            "Country": lead_data.get("country"),
            "Description": lead_data.get("description")
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        response = await self._make_request("POST", "sobjects/Lead", data)
        
        # Get the created lead
        if response.get("success"):
            return await self.get_lead_by_id(response["id"])
        
        return response
    
    async def update_lead(self, lead_id: str, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing lead in Salesforce"""
        data = {}
        
        # Add fields to update
        if "status" in lead_data:
            data["Status"] = lead_data["status"]
        if "rating" in lead_data:
            data["Rating"] = lead_data["rating"]
        if "email" in lead_data:
            data["Email"] = lead_data["email"]
        if "phone" in lead_data:
            data["Phone"] = lead_data["phone"]
        
        response = await self._make_request("PATCH", f"sobjects/Lead/{lead_id}", data)
        
        # Get the updated lead
        return await self.get_lead_by_id(lead_id)
    
    async def get_lead_by_id(self, lead_id: str) -> Dict[str, Any]:
        """Get lead by ID"""
        response = await self._make_request("GET", f"sobjects/Lead/{lead_id}")
        return response
    
    async def convert_lead(self, lead_id: str, conversion_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Convert lead to account, contact, and optionally opportunity"""
        data = {
            "leadId": lead_id,
            "convertedStatus": conversion_data.get("converted_status", "Qualified"),
            "doNotCreateOpportunity": conversion_data.get("do_not_create_opportunity", False)
        }
        
        if conversion_data:
            if "account_id" in conversion_data:
                data["accountId"] = conversion_data["account_id"]
            if "contact_id" in conversion_data:
                data["contactId"] = conversion_data["contact_id"]
            if "opportunity_name" in conversion_data:
                data["opportunityName"] = conversion_data["opportunity_name"]
        
        response = await self._make_request("POST", "process/conversions", data)
        return response
    
    # Opportunity Management
    
    async def get_opportunities(self, stage: str = None, limit: int = 200) -> List[Dict[str, Any]]:
        """Get opportunities from Salesforce"""
        soql = f"""
        SELECT Id, Name, AccountId, Account.Name, Amount, CloseDate, StageName, 
               Probability, LeadSource, Type, CreatedDate, LastModifiedDate
        FROM Opportunity
        """
        
        conditions = []
        if stage:
            conditions.append(f"StageName = '{stage}'")
        
        if conditions:
            soql += " WHERE " + " AND ".join(conditions)
        
        soql += f" ORDER BY CreatedDate DESC LIMIT {limit}"
        
        response = await self._query(soql)
        return response.get("records", [])
    
    async def create_opportunity(self, opportunity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new opportunity in Salesforce"""
        data = {
            "Name": opportunity_data["name"],
            "AccountId": opportunity_data.get("account_id"),
            "Amount": opportunity_data.get("amount"),
            "CloseDate": opportunity_data["close_date"],
            "StageName": opportunity_data.get("stage_name", "Prospecting"),
            "Probability": opportunity_data.get("probability"),
            "LeadSource": opportunity_data.get("lead_source"),
            "Type": opportunity_data.get("type"),
            "Description": opportunity_data.get("description")
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        response = await self._make_request("POST", "sobjects/Opportunity", data)
        
        # Get the created opportunity
        if response.get("success"):
            return await self.get_opportunity_by_id(response["id"])
        
        return response
    
    async def update_opportunity(self, opportunity_id: str, opportunity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing opportunity in Salesforce"""
        data = {}
        
        # Add fields to update
        if "stage_name" in opportunity_data:
            data["StageName"] = opportunity_data["stage_name"]
        if "amount" in opportunity_data:
            data["Amount"] = opportunity_data["amount"]
        if "probability" in opportunity_data:
            data["Probability"] = opportunity_data["probability"]
        if "close_date" in opportunity_data:
            data["CloseDate"] = opportunity_data["close_date"]
        
        response = await self._make_request("PATCH", f"sobjects/Opportunity/{opportunity_id}", data)
        
        # Get the updated opportunity
        return await self.get_opportunity_by_id(opportunity_id)
    
    async def get_opportunity_by_id(self, opportunity_id: str) -> Dict[str, Any]:
        """Get opportunity by ID"""
        response = await self._make_request("GET", f"sobjects/Opportunity/{opportunity_id}")
        return response
    
    # Case Management
    
    async def get_cases(self, status: str = None, limit: int = 200) -> List[Dict[str, Any]]:
        """Get cases from Salesforce"""
        soql = f"""
        SELECT Id, CaseNumber, Subject, Status, Priority, AccountId, Account.Name,
               ContactId, Contact.Name, Origin, Type, Reason, CreatedDate, LastModifiedDate
        FROM Case
        """
        
        conditions = []
        if status:
            conditions.append(f"Status = '{status}'")
        
        if conditions:
            soql += " WHERE " + " AND ".join(conditions)
        
        soql += f" ORDER BY CreatedDate DESC LIMIT {limit}"
        
        response = await self._query(soql)
        return response.get("records", [])
    
    async def create_case(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new case in Salesforce"""
        data = {
            "Subject": case_data["subject"],
            "Status": case_data.get("status", "New"),
            "Priority": case_data.get("priority", "Medium"),
            "AccountId": case_data.get("account_id"),
            "ContactId": case_data.get("contact_id"),
            "Origin": case_data.get("origin", "Web"),
            "Type": case_data.get("type"),
            "Reason": case_data.get("reason"),
            "Description": case_data.get("description")
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        response = await self._make_request("POST", "sobjects/Case", data)
        
        # Get the created case
        if response.get("success"):
            return await self.get_case_by_id(response["id"])
        
        return response
    
    async def get_case_by_id(self, case_id: str) -> Dict[str, Any]:
        """Get case by ID"""
        response = await self._make_request("GET", f"sobjects/Case/{case_id}")
        return response
    
    # Task and Event Management
    
    async def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task in Salesforce"""
        data = {
            "Subject": task_data["subject"],
            "Status": task_data.get("status", "Not Started"),
            "Priority": task_data.get("priority", "Normal"),
            "ActivityDate": task_data.get("activity_date"),
            "WhoId": task_data.get("who_id"),  # Lead or Contact ID
            "WhatId": task_data.get("what_id"),  # Account or Opportunity ID
            "Description": task_data.get("description")
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        response = await self._make_request("POST", "sobjects/Task", data)
        return response
    
    async def create_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new event in Salesforce"""
        data = {
            "Subject": event_data["subject"],
            "StartDateTime": event_data["start_datetime"],
            "EndDateTime": event_data.get("end_datetime"),
            "DurationInMinutes": event_data.get("duration_in_minutes", 60),
            "WhoId": event_data.get("who_id"),  # Lead or Contact ID
            "WhatId": event_data.get("what_id"),  # Account or Opportunity ID
            "Description": event_data.get("description")
        }
        
        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}
        
        response = await self._make_request("POST", "sobjects/Event", data)
        return response
    
    # Search and Utility Methods
    
    async def search(self, search_term: str) -> Dict[str, Any]:
        """Search across multiple objects using SOSL"""
        sosl = f"FIND {{{search_term}}} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email), Lead(Id, Name, Email), Opportunity(Id, Name)"
        
        params = {"q": sosl}
        response = await self._make_request("GET", "search", params=params)
        return response
    
    async def get_org_limits(self) -> Dict[str, Any]:
        """Get organization limits"""
        response = await self._make_request("GET", "limits")
        return response
    
    # Sync Methods
    
    async def sync_all_data(self) -> Dict[str, Any]:
        """Sync all data from Salesforce"""
        sync_data = {}
        
        try:
            # Get accounts
            sync_data["accounts"] = await self.get_accounts(limit=500)
            
            # Get contacts
            sync_data["contacts"] = await self.get_contacts(limit=500)
            
            # Get leads
            sync_data["leads"] = await self.get_leads(limit=500)
            
            # Get opportunities
            sync_data["opportunities"] = await self.get_opportunities(limit=500)
            
            # Get cases
            sync_data["cases"] = await self.get_cases(limit=500)
            
            # Get org limits
            sync_data["org_limits"] = await self.get_org_limits()
            
            sync_data["sync_timestamp"] = datetime.utcnow().isoformat()
            sync_data["success"] = True
            
        except Exception as e:
            sync_data["error"] = str(e)
            sync_data["success"] = False
        
        return sync_data

# Example usage and testing functions

async def test_salesforce_integration():
    """Test Salesforce integration"""
    # This would use real credentials in production
    credentials = SalesforceCredentials(
        client_id="test_client_id",
        client_secret="test_client_secret",
        username="test@example.com",
        password="test_password",
        security_token="test_token",
        instance_url="",
        access_token="",
        token_expires_at=datetime.utcnow(),
        is_sandbox=True
    )
    
    async with SalesforceConnector(credentials) as sf:
        try:
            # Test getting accounts
            accounts = await sf.get_accounts(limit=10)
            print(f"Found {len(accounts)} accounts")
            
            # Test getting contacts
            contacts = await sf.get_contacts(limit=10)
            print(f"Found {len(contacts)} contacts")
            
            # Test sync all data
            sync_result = await sf.sync_all_data()
            print(f"Sync successful: {sync_result['success']}")
            
        except SalesforceError as e:
            print(f"Salesforce error: {e.message} (Code: {e.error_code})")
        except Exception as e:
            print(f"General error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_salesforce_integration())
