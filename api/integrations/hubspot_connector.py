"""
HubSpot Integration
Handles HubSpot API integration for CRM data synchronization
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

@dataclass
class HubSpotCredentials:
    """HubSpot API credentials"""
    access_token: str
    refresh_token: str
    client_id: str
    client_secret: str
    token_expires_at: datetime
    portal_id: str

class HubSpotError(Exception):
    """HubSpot API error"""
    def __init__(self, message: str, error_code: str = None, status_code: int = None):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

class HubSpotConnector:
    """HubSpot API connector"""
    
    def __init__(self, credentials: HubSpotCredentials):
        self.credentials = credentials
        self.session = None
        self.base_url = "https://api.hubapi.com"
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _refresh_token(self):
        """Refresh access token using refresh token"""
        url = f"{self.base_url}/oauth/v1/token"
        
        data = {
            "grant_type": "refresh_token",
            "client_id": self.credentials.client_id,
            "client_secret": self.credentials.client_secret,
            "refresh_token": self.credentials.refresh_token
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        async with self.session.post(url, data=data, headers=headers) as response:
            if response.status != 200:
                error_text = await response.text()
                raise HubSpotError(f"Token refresh failed: {error_text}")
            
            token_data = await response.json()
            
            self.credentials.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                self.credentials.refresh_token = token_data["refresh_token"]
            
            expires_in = token_data.get("expires_in", 21600)  # Default 6 hours
            self.credentials.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    
    async def _ensure_valid_token(self):
        """Ensure access token is valid, refresh if needed"""
        now = datetime.utcnow()
        
        # Check if token needs refresh (5 minutes buffer)
        if now >= (self.credentials.token_expires_at - timedelta(minutes=5)):
            await self._refresh_token()
    
    async def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict[str, Any]:
        """Make authenticated request to HubSpot API"""
        await self._ensure_valid_token()
        
        url = f"{self.base_url}{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Content-Type": "application/json"
        }
        
        async with self.session.request(method, url, headers=headers, json=data, params=params) as response:
            response_text = await response.text()
            
            try:
                response_data = json.loads(response_text) if response_text else {}
            except json.JSONDecodeError:
                response_data = {"message": response_text}
            
            if response.status >= 400:
                error_msg = response_data.get("message", "Unknown error")
                error_code = response_data.get("category", "UNKNOWN")
                raise HubSpotError(error_msg, error_code, response.status)
            
            return response_data
    
    # Contact Management
    
    async def get_contacts(self, limit: int = 100, properties: List[str] = None) -> List[Dict[str, Any]]:
        """Get contacts from HubSpot"""
        if properties is None:
            properties = [
                "email", "firstname", "lastname", "phone", "company", "jobtitle",
                "website", "city", "state", "country", "lifecyclestage", "lead_status",
                "hubspot_owner_id", "createdate", "lastmodifieddate"
            ]
        
        params = {
            "limit": min(limit, 100),  # HubSpot max is 100 per request
            "properties": ",".join(properties)
        }
        
        contacts = []
        after = None
        
        while len(contacts) < limit:
            if after:
                params["after"] = after
            
            response = await self._make_request("GET", "/crm/v3/objects/contacts", params=params)
            
            batch_contacts = response.get("results", [])
            contacts.extend(batch_contacts)
            
            # Check if there are more results
            paging = response.get("paging", {})
            if "next" not in paging or len(batch_contacts) == 0:
                break
            
            after = paging["next"]["after"]
            
            # Don't exceed requested limit
            if len(contacts) >= limit:
                contacts = contacts[:limit]
                break
        
        return contacts
    
    async def create_contact(self, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new contact in HubSpot"""
        properties = {}
        
        # Map common fields
        if "email" in contact_data:
            properties["email"] = contact_data["email"]
        if "first_name" in contact_data:
            properties["firstname"] = contact_data["first_name"]
        if "last_name" in contact_data:
            properties["lastname"] = contact_data["last_name"]
        if "phone" in contact_data:
            properties["phone"] = contact_data["phone"]
        if "company" in contact_data:
            properties["company"] = contact_data["company"]
        if "job_title" in contact_data:
            properties["jobtitle"] = contact_data["job_title"]
        if "website" in contact_data:
            properties["website"] = contact_data["website"]
        if "city" in contact_data:
            properties["city"] = contact_data["city"]
        if "state" in contact_data:
            properties["state"] = contact_data["state"]
        if "country" in contact_data:
            properties["country"] = contact_data["country"]
        if "lifecycle_stage" in contact_data:
            properties["lifecyclestage"] = contact_data["lifecycle_stage"]
        if "lead_status" in contact_data:
            properties["lead_status"] = contact_data["lead_status"]
        
        # Add any custom properties
        if "custom_properties" in contact_data:
            properties.update(contact_data["custom_properties"])
        
        data = {"properties": properties}
        
        response = await self._make_request("POST", "/crm/v3/objects/contacts", data)
        return response
    
    async def update_contact(self, contact_id: str, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing contact in HubSpot"""
        properties = {}
        
        # Map common fields
        if "email" in contact_data:
            properties["email"] = contact_data["email"]
        if "first_name" in contact_data:
            properties["firstname"] = contact_data["first_name"]
        if "last_name" in contact_data:
            properties["lastname"] = contact_data["last_name"]
        if "phone" in contact_data:
            properties["phone"] = contact_data["phone"]
        if "company" in contact_data:
            properties["company"] = contact_data["company"]
        if "job_title" in contact_data:
            properties["jobtitle"] = contact_data["job_title"]
        if "lifecycle_stage" in contact_data:
            properties["lifecyclestage"] = contact_data["lifecycle_stage"]
        if "lead_status" in contact_data:
            properties["lead_status"] = contact_data["lead_status"]
        
        # Add any custom properties
        if "custom_properties" in contact_data:
            properties.update(contact_data["custom_properties"])
        
        data = {"properties": properties}
        
        response = await self._make_request("PATCH", f"/crm/v3/objects/contacts/{contact_id}", data)
        return response
    
    async def get_contact_by_id(self, contact_id: str, properties: List[str] = None) -> Dict[str, Any]:
        """Get contact by ID"""
        if properties is None:
            properties = [
                "email", "firstname", "lastname", "phone", "company", "jobtitle",
                "website", "city", "state", "country", "lifecyclestage", "lead_status",
                "hubspot_owner_id", "createdate", "lastmodifieddate"
            ]
        
        params = {"properties": ",".join(properties)}
        
        response = await self._make_request("GET", f"/crm/v3/objects/contacts/{contact_id}", params=params)
        return response
    
    async def search_contacts(self, filters: List[Dict[str, Any]], limit: int = 100) -> List[Dict[str, Any]]:
        """Search contacts with filters"""
        data = {
            "filterGroups": [{"filters": filters}],
            "limit": min(limit, 100),
            "properties": [
                "email", "firstname", "lastname", "phone", "company", "jobtitle",
                "website", "city", "state", "country", "lifecyclestage", "lead_status",
                "hubspot_owner_id", "createdate", "lastmodifieddate"
            ]
        }
        
        response = await self._make_request("POST", "/crm/v3/objects/contacts/search", data)
        return response.get("results", [])
    
    # Company Management
    
    async def get_companies(self, limit: int = 100, properties: List[str] = None) -> List[Dict[str, Any]]:
        """Get companies from HubSpot"""
        if properties is None:
            properties = [
                "name", "domain", "industry", "phone", "city", "state", "country",
                "website", "description", "numberofemployees", "annualrevenue",
                "type", "hubspot_owner_id", "createdate", "lastmodifieddate"
            ]
        
        params = {
            "limit": min(limit, 100),
            "properties": ",".join(properties)
        }
        
        companies = []
        after = None
        
        while len(companies) < limit:
            if after:
                params["after"] = after
            
            response = await self._make_request("GET", "/crm/v3/objects/companies", params=params)
            
            batch_companies = response.get("results", [])
            companies.extend(batch_companies)
            
            # Check if there are more results
            paging = response.get("paging", {})
            if "next" not in paging or len(batch_companies) == 0:
                break
            
            after = paging["next"]["after"]
            
            # Don't exceed requested limit
            if len(companies) >= limit:
                companies = companies[:limit]
                break
        
        return companies
    
    async def create_company(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new company in HubSpot"""
        properties = {}
        
        # Map common fields
        if "name" in company_data:
            properties["name"] = company_data["name"]
        if "domain" in company_data:
            properties["domain"] = company_data["domain"]
        if "industry" in company_data:
            properties["industry"] = company_data["industry"]
        if "phone" in company_data:
            properties["phone"] = company_data["phone"]
        if "city" in company_data:
            properties["city"] = company_data["city"]
        if "state" in company_data:
            properties["state"] = company_data["state"]
        if "country" in company_data:
            properties["country"] = company_data["country"]
        if "website" in company_data:
            properties["website"] = company_data["website"]
        if "description" in company_data:
            properties["description"] = company_data["description"]
        if "number_of_employees" in company_data:
            properties["numberofemployees"] = company_data["number_of_employees"]
        if "annual_revenue" in company_data:
            properties["annualrevenue"] = company_data["annual_revenue"]
        if "type" in company_data:
            properties["type"] = company_data["type"]
        
        # Add any custom properties
        if "custom_properties" in company_data:
            properties.update(company_data["custom_properties"])
        
        data = {"properties": properties}
        
        response = await self._make_request("POST", "/crm/v3/objects/companies", data)
        return response
    
    async def update_company(self, company_id: str, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing company in HubSpot"""
        properties = {}
        
        # Map common fields
        if "name" in company_data:
            properties["name"] = company_data["name"]
        if "domain" in company_data:
            properties["domain"] = company_data["domain"]
        if "industry" in company_data:
            properties["industry"] = company_data["industry"]
        if "phone" in company_data:
            properties["phone"] = company_data["phone"]
        if "website" in company_data:
            properties["website"] = company_data["website"]
        if "description" in company_data:
            properties["description"] = company_data["description"]
        if "number_of_employees" in company_data:
            properties["numberofemployees"] = company_data["number_of_employees"]
        if "annual_revenue" in company_data:
            properties["annualrevenue"] = company_data["annual_revenue"]
        
        # Add any custom properties
        if "custom_properties" in company_data:
            properties.update(company_data["custom_properties"])
        
        data = {"properties": properties}
        
        response = await self._make_request("PATCH", f"/crm/v3/objects/companies/{company_id}", data)
        return response
    
    async def get_company_by_id(self, company_id: str, properties: List[str] = None) -> Dict[str, Any]:
        """Get company by ID"""
        if properties is None:
            properties = [
                "name", "domain", "industry", "phone", "city", "state", "country",
                "website", "description", "numberofemployees", "annualrevenue",
                "type", "hubspot_owner_id", "createdate", "lastmodifieddate"
            ]
        
        params = {"properties": ",".join(properties)}
        
        response = await self._make_request("GET", f"/crm/v3/objects/companies/{company_id}", params=params)
        return response
    
    # Deal Management
    
    async def get_deals(self, limit: int = 100, properties: List[str] = None) -> List[Dict[str, Any]]:
        """Get deals from HubSpot"""
        if properties is None:
            properties = [
                "dealname", "amount", "closedate", "dealstage", "pipeline",
                "dealtype", "hubspot_owner_id", "description", "createdate",
                "lastmodifieddate"
            ]
        
        params = {
            "limit": min(limit, 100),
            "properties": ",".join(properties)
        }
        
        deals = []
        after = None
        
        while len(deals) < limit:
            if after:
                params["after"] = after
            
            response = await self._make_request("GET", "/crm/v3/objects/deals", params=params)
            
            batch_deals = response.get("results", [])
            deals.extend(batch_deals)
            
            # Check if there are more results
            paging = response.get("paging", {})
            if "next" not in paging or len(batch_deals) == 0:
                break
            
            after = paging["next"]["after"]
            
            # Don't exceed requested limit
            if len(deals) >= limit:
                deals = deals[:limit]
                break
        
        return deals
    
    async def create_deal(self, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new deal in HubSpot"""
        properties = {}
        
        # Map common fields
        if "name" in deal_data:
            properties["dealname"] = deal_data["name"]
        if "amount" in deal_data:
            properties["amount"] = deal_data["amount"]
        if "close_date" in deal_data:
            properties["closedate"] = deal_data["close_date"]
        if "stage" in deal_data:
            properties["dealstage"] = deal_data["stage"]
        if "pipeline" in deal_data:
            properties["pipeline"] = deal_data["pipeline"]
        if "deal_type" in deal_data:
            properties["dealtype"] = deal_data["deal_type"]
        if "description" in deal_data:
            properties["description"] = deal_data["description"]
        if "owner_id" in deal_data:
            properties["hubspot_owner_id"] = deal_data["owner_id"]
        
        # Add any custom properties
        if "custom_properties" in deal_data:
            properties.update(deal_data["custom_properties"])
        
        data = {"properties": properties}
        
        response = await self._make_request("POST", "/crm/v3/objects/deals", data)
        return response
    
    async def update_deal(self, deal_id: str, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing deal in HubSpot"""
        properties = {}
        
        # Map common fields
        if "name" in deal_data:
            properties["dealname"] = deal_data["name"]
        if "amount" in deal_data:
            properties["amount"] = deal_data["amount"]
        if "close_date" in deal_data:
            properties["closedate"] = deal_data["close_date"]
        if "stage" in deal_data:
            properties["dealstage"] = deal_data["stage"]
        if "pipeline" in deal_data:
            properties["pipeline"] = deal_data["pipeline"]
        if "deal_type" in deal_data:
            properties["dealtype"] = deal_data["deal_type"]
        if "description" in deal_data:
            properties["description"] = deal_data["description"]
        
        # Add any custom properties
        if "custom_properties" in deal_data:
            properties.update(deal_data["custom_properties"])
        
        data = {"properties": properties}
        
        response = await self._make_request("PATCH", f"/crm/v3/objects/deals/{deal_id}", data)
        return response
    
    async def get_deal_by_id(self, deal_id: str, properties: List[str] = None) -> Dict[str, Any]:
        """Get deal by ID"""
        if properties is None:
            properties = [
                "dealname", "amount", "closedate", "dealstage", "pipeline",
                "dealtype", "hubspot_owner_id", "description", "createdate",
                "lastmodifieddate"
            ]
        
        params = {"properties": ",".join(properties)}
        
        response = await self._make_request("GET", f"/crm/v3/objects/deals/{deal_id}", params=params)
        return response
    
    # Ticket Management
    
    async def get_tickets(self, limit: int = 100, properties: List[str] = None) -> List[Dict[str, Any]]:
        """Get tickets from HubSpot"""
        if properties is None:
            properties = [
                "subject", "content", "hs_ticket_priority", "hs_ticket_category",
                "hs_ticket_id", "hs_pipeline_stage", "hubspot_owner_id",
                "createdate", "lastmodifieddate"
            ]
        
        params = {
            "limit": min(limit, 100),
            "properties": ",".join(properties)
        }
        
        tickets = []
        after = None
        
        while len(tickets) < limit:
            if after:
                params["after"] = after
            
            response = await self._make_request("GET", "/crm/v3/objects/tickets", params=params)
            
            batch_tickets = response.get("results", [])
            tickets.extend(batch_tickets)
            
            # Check if there are more results
            paging = response.get("paging", {})
            if "next" not in paging or len(batch_tickets) == 0:
                break
            
            after = paging["next"]["after"]
            
            # Don't exceed requested limit
            if len(tickets) >= limit:
                tickets = tickets[:limit]
                break
        
        return tickets
    
    async def create_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new ticket in HubSpot"""
        properties = {}
        
        # Map common fields
        if "subject" in ticket_data:
            properties["subject"] = ticket_data["subject"]
        if "content" in ticket_data:
            properties["content"] = ticket_data["content"]
        if "priority" in ticket_data:
            properties["hs_ticket_priority"] = ticket_data["priority"]
        if "category" in ticket_data:
            properties["hs_ticket_category"] = ticket_data["category"]
        if "stage" in ticket_data:
            properties["hs_pipeline_stage"] = ticket_data["stage"]
        if "owner_id" in ticket_data:
            properties["hubspot_owner_id"] = ticket_data["owner_id"]
        
        # Add any custom properties
        if "custom_properties" in ticket_data:
            properties.update(ticket_data["custom_properties"])
        
        data = {"properties": properties}
        
        response = await self._make_request("POST", "/crm/v3/objects/tickets", data)
        return response
    
    # Association Management
    
    async def associate_objects(self, from_object_type: str, from_object_id: str, 
                              to_object_type: str, to_object_id: str, association_type: str) -> Dict[str, Any]:
        """Associate two objects in HubSpot"""
        data = {
            "inputs": [{
                "from": {"id": from_object_id},
                "to": {"id": to_object_id},
                "type": association_type
            }]
        }
        
        endpoint = f"/crm/v3/associations/{from_object_type}/{to_object_type}/batch/create"
        response = await self._make_request("POST", endpoint, data)
        return response
    
    async def get_associated_objects(self, object_type: str, object_id: str, 
                                   to_object_type: str) -> List[Dict[str, Any]]:
        """Get objects associated with a given object"""
        endpoint = f"/crm/v3/objects/{object_type}/{object_id}/associations/{to_object_type}"
        response = await self._make_request("GET", endpoint)
        return response.get("results", [])
    
    # Owner Management
    
    async def get_owners(self) -> List[Dict[str, Any]]:
        """Get all owners in HubSpot"""
        response = await self._make_request("GET", "/crm/v3/owners")
        return response.get("results", [])
    
    async def get_owner_by_id(self, owner_id: str) -> Dict[str, Any]:
        """Get owner by ID"""
        response = await self._make_request("GET", f"/crm/v3/owners/{owner_id}")
        return response
    
    # Pipeline Management
    
    async def get_pipelines(self, object_type: str) -> List[Dict[str, Any]]:
        """Get pipelines for an object type"""
        response = await self._make_request("GET", f"/crm/v3/pipelines/{object_type}")
        return response.get("results", [])
    
    async def get_pipeline_stages(self, object_type: str, pipeline_id: str) -> List[Dict[str, Any]]:
        """Get stages for a specific pipeline"""
        response = await self._make_request("GET", f"/crm/v3/pipelines/{object_type}/{pipeline_id}")
        return response.get("stages", [])
    
    # Analytics and Reporting
    
    async def get_analytics_data(self, object_type: str, properties: List[str], 
                               date_range: Dict[str, str] = None) -> Dict[str, Any]:
        """Get analytics data for objects"""
        data = {
            "objectType": object_type,
            "properties": properties
        }
        
        if date_range:
            data["dateRange"] = date_range
        
        response = await self._make_request("POST", "/analytics/v1/reports/custom", data)
        return response
    
    # Sync Methods
    
    async def sync_all_data(self) -> Dict[str, Any]:
        """Sync all data from HubSpot"""
        sync_data = {}
        
        try:
            # Get contacts
            sync_data["contacts"] = await self.get_contacts(limit=500)
            
            # Get companies
            sync_data["companies"] = await self.get_companies(limit=500)
            
            # Get deals
            sync_data["deals"] = await self.get_deals(limit=500)
            
            # Get tickets
            sync_data["tickets"] = await self.get_tickets(limit=500)
            
            # Get owners
            sync_data["owners"] = await self.get_owners()
            
            # Get pipelines for deals
            sync_data["deal_pipelines"] = await self.get_pipelines("deals")
            
            sync_data["sync_timestamp"] = datetime.utcnow().isoformat()
            sync_data["success"] = True
            
        except Exception as e:
            sync_data["error"] = str(e)
            sync_data["success"] = False
        
        return sync_data

# HubSpot OAuth Helper Class

class HubSpotOAuth:
    """HubSpot OAuth2 authentication helper"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.base_url = "https://api.hubapi.com"
    
    def get_authorization_url(self, scopes: List[str], state: str = None) -> str:
        """Get authorization URL for OAuth flow"""
        scope_string = " ".join(scopes)
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": scope_string,
            "response_type": "code"
        }
        
        if state:
            params["state"] = state
        
        from urllib.parse import urlencode
        query_string = urlencode(params)
        
        return f"https://app.hubspot.com/oauth/authorize?{query_string}"
    
    async def exchange_code_for_tokens(self, authorization_code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        url = f"{self.base_url}/oauth/v1/token"
        
        data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "code": authorization_code
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HubSpotError(f"Token exchange failed: {error_text}")
                
                token_data = await response.json()
                return token_data

# Example usage and testing functions

async def test_hubspot_integration():
    """Test HubSpot integration"""
    # This would use real credentials in production
    credentials = HubSpotCredentials(
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        client_id="test_client_id",
        client_secret="test_client_secret",
        token_expires_at=datetime.utcnow() + timedelta(hours=6),
        portal_id="test_portal_id"
    )
    
    async with HubSpotConnector(credentials) as hs:
        try:
            # Test getting contacts
            contacts = await hs.get_contacts(limit=10)
            print(f"Found {len(contacts)} contacts")
            
            # Test getting companies
            companies = await hs.get_companies(limit=10)
            print(f"Found {len(companies)} companies")
            
            # Test getting deals
            deals = await hs.get_deals(limit=10)
            print(f"Found {len(deals)} deals")
            
            # Test sync all data
            sync_result = await hs.sync_all_data()
            print(f"Sync successful: {sync_result['success']}")
            
        except HubSpotError as e:
            print(f"HubSpot error: {e.message} (Code: {e.error_code}, Status: {e.status_code})")
        except Exception as e:
            print(f"General error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_hubspot_integration())
