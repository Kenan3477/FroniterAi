"""California Secretary of State API Integration"""

from typing import Dict, Any, Optional
from urllib.parse import urljoin
from .base_api import BaseGovernmentAPI, APIResponse, RateLimitConfig

class CaliforniaAPI(BaseGovernmentAPI):
    """California Secretary of State API integration"""
    
    BASE_URL = "https://businesssearch.sos.ca.gov/api/"
    
    def __init__(self, api_key: Optional[str] = None):
        # California has stricter rate limits
        config = RateLimitConfig(
            requests_per_minute=20,
            requests_per_hour=300,
            burst_limit=3,
            retry_after=180
        )
        super().__init__(api_key, config)
    
    async def check_name_availability(self, name: str, entity_type: str = "corporation") -> APIResponse:
        """Check if business name is available in California"""
        url = urljoin(self.BASE_URL, "name-availability")
        
        params = {
            "entity_name": name,
            "entity_type": self._map_entity_type(entity_type),
            "include_similar": "true"
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers,
            params=params
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "name": name,
                    "available": response.data.get("available", False),
                    "entity_type": entity_type,
                    "similar_names": response.data.get("similar_entities", []),
                    "jurisdiction": "California",
                    "search_date": response.data.get("search_timestamp"),
                    "reservation_period": "60 days" if response.data.get("available") else None,
                    "restrictions": response.data.get("name_restrictions", [])
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def reserve_name(self, name: str, entity_type: str, applicant_info: Dict[str, Any]) -> APIResponse:
        """Reserve a business name in California"""
        url = urljoin(self.BASE_URL, "name-reservation")
        
        data = {
            "entity_name": name,
            "entity_type": self._map_entity_type(entity_type),
            "applicant_information": {
                "name": applicant_info.get("name"),
                "mailing_address": applicant_info.get("address"),
                "phone_number": applicant_info.get("phone"),
                "email_address": applicant_info.get("email")
            },
            "reservation_duration": "60"  # California allows 60-day reservations
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="POST",
            url=url,
            headers=headers,
            data=data
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "reservation_id": response.data.get("reservation_number"),
                    "name": name,
                    "expiration_date": response.data.get("expiration_date"),
                    "fee_paid": response.data.get("fee_amount", "$10.00"),
                    "confirmation_number": response.data.get("confirmation_number")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def submit_formation_documents(self, formation_data: Dict[str, Any]) -> APIResponse:
        """Submit formation documents to California"""
        url = urljoin(self.BASE_URL, "entity-formation")
        
        # Map to California-specific format
        california_data = {
            "entity_type": self._map_entity_type(formation_data.get("entity_type", "corporation")),
            "entity_name": formation_data["name"],
            "purpose": formation_data.get("purpose", "Engage in any lawful act or activity"),
            "registered_agent": {
                "agent_type": "individual",  # or "entity"
                "name": formation_data["registered_agent"]["name"],
                "address": formation_data["registered_agent"]["address"]
            },
            "principal_office": formation_data.get("principal_office", {}),
            "incorporators": formation_data.get("incorporators", []),
            "initial_directors": formation_data.get("directors", []),
            "stock_information": {
                "authorized_shares": formation_data.get("authorized_shares", 1000000),
                "par_value": formation_data.get("par_value", "no par value"),
                "share_classes": formation_data.get("share_classes", [])
            },
            "expedited_processing": formation_data.get("expedited", False),
            "certificate_copies": formation_data.get("certificate_copies", 1)
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="POST",
            url=url,
            headers=headers,
            data=california_data
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "filing_id": response.data.get("filing_number"),
                    "entity_number": response.data.get("entity_number"),
                    "status": response.data.get("filing_status", "pending"),
                    "filing_date": response.data.get("filing_date"),
                    "fees": response.data.get("total_fees"),
                    "estimated_completion": response.data.get("processing_time"),
                    "tracking_number": response.data.get("tracking_id")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_formation_status(self, filing_id: str) -> APIResponse:
        """Get status of California formation filing"""
        url = urljoin(self.BASE_URL, f"filing-status")
        
        params = {"filing_number": filing_id}
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers,
            params=params
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "filing_id": filing_id,
                    "status": response.data.get("status", "unknown").lower(),
                    "entity_number": response.data.get("entity_number"),
                    "entity_name": response.data.get("entity_name"),
                    "filing_date": response.data.get("filing_date"),
                    "completion_date": response.data.get("completion_date"),
                    "certificate_url": response.data.get("certificate_url"),
                    "agent_acknowledgment": response.data.get("agent_acknowledgment"),
                    "notes": response.data.get("examiner_notes", [])
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_entity_details(self, entity_number: str) -> APIResponse:
        """Get detailed information about a California entity"""
        url = urljoin(self.BASE_URL, f"entity-details")
        
        params = {"entity_number": entity_number}
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers,
            params=params
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "entity_number": entity_number,
                    "entity_name": response.data.get("entity_name"),
                    "entity_type": response.data.get("entity_type"),
                    "status": response.data.get("entity_status"),
                    "formation_date": response.data.get("date_of_incorporation"),
                    "jurisdiction": response.data.get("jurisdiction"),
                    "registered_agent": response.data.get("agent_information"),
                    "principal_office": response.data.get("principal_office"),
                    "officers": response.data.get("officers", []),
                    "good_standing": response.data.get("good_standing", True),
                    "suspension_date": response.data.get("suspension_date"),
                    "last_statement_of_information": response.data.get("last_si_date")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def calculate_fees(self, entity_type: str, options: Dict[str, Any] = None) -> APIResponse:
        """Calculate California formation fees"""
        
        # California fee structure (as of 2024)
        base_fees = {
            "corporation": 100.00,
            "llc": 70.00,
            "lp": 70.00,
            "llp": 70.00
        }
        
        entity_type = entity_type.lower()
        base_fee = base_fees.get(entity_type, 100.00)
        
        total_fee = base_fee
        fee_breakdown = [{"item": f"Base {entity_type} filing fee", "amount": base_fee}]
        
        if options:
            # Expedited processing (24-hour)
            if options.get("expedited"):
                expedite_fee = 350.00
                total_fee += expedite_fee
                fee_breakdown.append({"item": "24-hour expedited processing", "amount": expedite_fee})
            
            # Special handling (4-hour)
            if options.get("special_handling"):
                special_fee = 500.00
                total_fee += special_fee
                fee_breakdown.append({"item": "4-hour special handling", "amount": special_fee})
            
            # Certified copies
            cert_copies = options.get("certificate_copies", 1)
            if cert_copies > 1:
                additional_copies = cert_copies - 1
                copy_fee = additional_copies * 8.00
                total_fee += copy_fee
                fee_breakdown.append({
                    "item": f"{additional_copies} certified copies", 
                    "amount": copy_fee
                })
        
        return APIResponse(
            success=True,
            data={
                "entity_type": entity_type,
                "total_fee": total_fee,
                "fee_breakdown": fee_breakdown,
                "currency": "USD",
                "calculated_date": "2024-07-24"
            }
        )
    
    def _map_entity_type(self, entity_type: str) -> str:
        """Map generic entity type to California-specific format"""
        mapping = {
            "corporation": "CORP",
            "llc": "LLC", 
            "limited_liability_company": "LLC",
            "lp": "LP",
            "limited_partnership": "LP",
            "llp": "LLP",
            "limited_liability_partnership": "LLP"
        }
        return mapping.get(entity_type.lower(), "CORP")
