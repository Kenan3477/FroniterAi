"""Delaware Division of Corporations API Integration"""

from typing import Dict, Any, Optional
from urllib.parse import urljoin
from .base_api import BaseGovernmentAPI, APIResponse, RateLimitConfig

class DelawareAPI(BaseGovernmentAPI):
    """Delaware Division of Corporations API integration"""
    
    BASE_URL = "https://icis.corp.delaware.gov/api/"
    
    def __init__(self, api_key: Optional[str] = None):
        # Delaware has specific rate limits
        config = RateLimitConfig(
            requests_per_minute=30,
            requests_per_hour=500,
            burst_limit=5,
            retry_after=120
        )
        super().__init__(api_key, config)
    
    async def check_name_availability(self, name: str, entity_type: str = "corporation") -> APIResponse:
        """Check if business name is available in Delaware
        
        Args:
            name: Proposed business name
            entity_type: Type of entity (corporation, llc, etc.)
        """
        url = urljoin(self.BASE_URL, "name-search")
        
        params = {
            "name": name,
            "entity_type": entity_type.upper(),
            "exact_match": "true"
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers,
            params=params
        )
        
        if response.success and response.data:
            # Parse Delaware-specific response format
            available = response.data.get("available", False)
            similar_names = response.data.get("similar_names", [])
            
            return APIResponse(
                success=True,
                data={
                    "name": name,
                    "available": available,
                    "entity_type": entity_type,
                    "similar_names": similar_names,
                    "jurisdiction": "Delaware",
                    "search_date": response.data.get("search_date"),
                    "reservation_period": "120 days" if available else None
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def reserve_name(self, name: str, entity_type: str, applicant_info: Dict[str, Any]) -> APIResponse:
        """Reserve a business name in Delaware
        
        Args:
            name: Business name to reserve
            entity_type: Type of entity
            applicant_info: Information about the applicant
        """
        url = urljoin(self.BASE_URL, "name-reservation")
        
        data = {
            "name": name,
            "entity_type": entity_type.upper(),
            "applicant": {
                "name": applicant_info.get("name"),
                "address": applicant_info.get("address"),
                "phone": applicant_info.get("phone"),
                "email": applicant_info.get("email")
            },
            "duration": "120"  # Delaware allows 120-day reservations
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
                    "reservation_id": response.data.get("reservation_id"),
                    "name": name,
                    "expiration_date": response.data.get("expiration_date"),
                    "fee_paid": response.data.get("fee", "$75.00"),
                    "confirmation_number": response.data.get("confirmation_number")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def submit_formation_documents(self, formation_data: Dict[str, Any]) -> APIResponse:
        """Submit formation documents to Delaware
        
        Args:
            formation_data: Complete formation information
        """
        url = urljoin(self.BASE_URL, "entity-formation")
        
        # Map to Delaware-specific format
        delaware_data = {
            "entity_type": formation_data.get("entity_type", "CORPORATION").upper(),
            "entity_name": formation_data["name"],
            "registered_agent": {
                "name": formation_data["registered_agent"]["name"],
                "address": formation_data["registered_agent"]["address"]
            },
            "incorporators": formation_data.get("incorporators", []),
            "directors": formation_data.get("directors", []),
            "shares": {
                "authorized": formation_data.get("authorized_shares", 1500),
                "par_value": formation_data.get("par_value", 0.001)
            },
            "purpose": formation_data.get("purpose", "General business purposes"),
            "expedited": formation_data.get("expedited", False),
            "certificate_copies": formation_data.get("certificate_copies", 1)
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="POST",
            url=url,
            headers=headers,
            data=delaware_data
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "filing_id": response.data.get("filing_id"),
                    "entity_number": response.data.get("entity_number"),
                    "status": response.data.get("status", "pending"),
                    "filing_date": response.data.get("filing_date"),
                    "fees": response.data.get("total_fees"),
                    "estimated_completion": response.data.get("estimated_completion"),
                    "tracking_number": response.data.get("tracking_number")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_formation_status(self, filing_id: str) -> APIResponse:
        """Get status of Delaware formation filing"""
        url = urljoin(self.BASE_URL, f"filing-status/{filing_id}")
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers
        )
        
        if response.success and response.data:
            status_mapping = {
                "PENDING": "pending",
                "PROCESSING": "processing", 
                "APPROVED": "approved",
                "REJECTED": "rejected",
                "COMPLETED": "completed"
            }
            
            status = status_mapping.get(
                response.data.get("status", "").upper(), 
                "unknown"
            )
            
            return APIResponse(
                success=True,
                data={
                    "filing_id": filing_id,
                    "status": status,
                    "entity_number": response.data.get("entity_number"),
                    "entity_name": response.data.get("entity_name"),
                    "filing_date": response.data.get("filing_date"),
                    "completion_date": response.data.get("completion_date"),
                    "certificate_url": response.data.get("certificate_download_url"),
                    "notes": response.data.get("notes", [])
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_entity_details(self, entity_number: str) -> APIResponse:
        """Get detailed information about a Delaware entity"""
        url = urljoin(self.BASE_URL, f"entity/{entity_number}")
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "entity_number": entity_number,
                    "entity_name": response.data.get("entity_name"),
                    "entity_type": response.data.get("entity_type"),
                    "status": response.data.get("status"),
                    "formation_date": response.data.get("formation_date"),
                    "registered_agent": response.data.get("registered_agent"),
                    "officers": response.data.get("officers", []),
                    "good_standing": response.data.get("good_standing", True),
                    "annual_report_due": response.data.get("annual_report_due")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def calculate_fees(self, entity_type: str, options: Dict[str, Any] = None) -> APIResponse:
        """Calculate Delaware formation fees"""
        
        # Delaware fee structure (as of 2024)
        base_fees = {
            "CORPORATION": 89.00,
            "LLC": 90.00,
            "LP": 200.00,
            "LLP": 200.00
        }
        
        entity_type = entity_type.upper()
        base_fee = base_fees.get(entity_type, 89.00)
        
        total_fee = base_fee
        fee_breakdown = [{"item": f"Base {entity_type} filing fee", "amount": base_fee}]
        
        if options:
            # Expedited processing
            if options.get("expedited"):
                expedite_fee = 50.00
                total_fee += expedite_fee
                fee_breakdown.append({"item": "Expedited processing", "amount": expedite_fee})
            
            # Additional certificate copies
            cert_copies = options.get("certificate_copies", 1)
            if cert_copies > 1:
                additional_copies = cert_copies - 1
                copy_fee = additional_copies * 50.00
                total_fee += copy_fee
                fee_breakdown.append({
                    "item": f"{additional_copies} additional certificate copies", 
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
