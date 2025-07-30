"""Wyoming Secretary of State API Integration"""

from typing import Dict, Any, Optional
from urllib.parse import urljoin
from .base_api import BaseGovernmentAPI, APIResponse, RateLimitConfig

class WyomingAPI(BaseGovernmentAPI):
    """Wyoming Secretary of State API integration"""
    
    BASE_URL = "https://wyobiz.wyo.gov/api/"
    
    def __init__(self, api_key: Optional[str] = None):
        # Wyoming rate limits
        config = RateLimitConfig(
            requests_per_minute=30,
            requests_per_hour=500,
            burst_limit=5,
            retry_after=120
        )
        super().__init__(api_key, config)
    
    async def check_name_availability(self, name: str, entity_type: str = "corporation") -> APIResponse:
        """Check if business name is available in Wyoming"""
        url = urljoin(self.BASE_URL, "business-search")
        
        params = {
            "entity_name": name,
            "search_type": "exact",
            "entity_type": self._map_entity_type(entity_type),
            "status": "active"
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers,
            params=params
        )
        
        if response.success and response.data:
            existing_entities = response.data.get("entities", [])
            exact_match = any(
                entity.get("entity_name", "").lower() == name.lower() 
                for entity in existing_entities
            )
            
            return APIResponse(
                success=True,
                data={
                    "name": name,
                    "available": not exact_match,
                    "entity_type": entity_type,
                    "similar_names": [
                        {
                            "name": entity.get("entity_name"),
                            "id": entity.get("entity_id"),
                            "type": entity.get("entity_type"),
                            "status": entity.get("status")
                        }
                        for entity in existing_entities[:10]
                    ],
                    "jurisdiction": "Wyoming",
                    "search_date": response.data.get("search_timestamp"),
                    "reservation_period": "120 days" if not exact_match else None
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def reserve_name(self, name: str, entity_type: str, applicant_info: Dict[str, Any]) -> APIResponse:
        """Reserve a business name in Wyoming"""
        url = urljoin(self.BASE_URL, "name-reservation")
        
        data = {
            "entity_name": name,
            "entity_type": self._map_entity_type(entity_type),
            "applicant": {
                "name": applicant_info.get("name"),
                "address": applicant_info.get("address"),
                "phone": applicant_info.get("phone"),
                "email": applicant_info.get("email")
            },
            "duration_days": 120  # Wyoming allows 120-day reservations
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
                    "fee_paid": response.data.get("fee", "$50.00"),
                    "confirmation_number": response.data.get("confirmation_number")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def submit_formation_documents(self, formation_data: Dict[str, Any]) -> APIResponse:
        """Submit formation documents to Wyoming"""
        url = urljoin(self.BASE_URL, "entity-formation")
        
        # Map to Wyoming-specific format
        wyoming_data = {
            "entity_type": self._map_entity_type(formation_data.get("entity_type", "corporation")),
            "entity_name": formation_data["name"],
            "purpose": formation_data.get("purpose", "General business purposes"),
            "registered_agent": {
                "type": formation_data["registered_agent"].get("type", "individual"),
                "name": formation_data["registered_agent"]["name"],
                "address": formation_data["registered_agent"]["address"]
            },
            "registered_office": formation_data.get("registered_office", formation_data["registered_agent"]["address"]),
            "incorporators": formation_data.get("incorporators", []),
            "initial_directors": formation_data.get("directors", []),
            "authorized_stock": {
                "shares": formation_data.get("authorized_shares", 1000),
                "par_value": formation_data.get("par_value", 0.01),
                "classes": formation_data.get("stock_classes", [])
            },
            "duration": formation_data.get("duration", "perpetual"),
            "effective_date": formation_data.get("effective_date", "upon_filing"),
            "expedited": formation_data.get("expedited", False)
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="POST",
            url=url,
            headers=headers,
            data=wyoming_data
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "filing_id": response.data.get("filing_number"),
                    "entity_id": response.data.get("entity_id"),
                    "status": response.data.get("status", "pending"),
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
        """Get status of Wyoming formation filing"""
        url = urljoin(self.BASE_URL, f"filing-status/{filing_id}")
        
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
                    "filing_id": filing_id,
                    "status": response.data.get("status", "unknown"),
                    "entity_id": response.data.get("entity_id"),
                    "entity_name": response.data.get("entity_name"),
                    "filing_date": response.data.get("filing_date"),
                    "completion_date": response.data.get("completion_date"),
                    "certificate_url": response.data.get("certificate_url"),
                    "effective_date": response.data.get("effective_date"),
                    "notes": response.data.get("examiner_notes", [])
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_entity_details(self, entity_id: str) -> APIResponse:
        """Get detailed information about a Wyoming entity"""
        url = urljoin(self.BASE_URL, f"entity/{entity_id}")
        
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
                    "entity_id": entity_id,
                    "entity_name": response.data.get("entity_name"),
                    "entity_type": response.data.get("entity_type"),
                    "status": response.data.get("status"),
                    "formation_date": response.data.get("formation_date"),
                    "jurisdiction": "Wyoming",
                    "registered_agent": response.data.get("registered_agent"),
                    "registered_office": response.data.get("registered_office"),
                    "officers": response.data.get("officers", []),
                    "good_standing": response.data.get("good_standing", True),
                    "annual_report_due": response.data.get("annual_report_due"),
                    "franchise_tax_status": response.data.get("franchise_tax_status")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def calculate_fees(self, entity_type: str, options: Dict[str, Any] = None) -> APIResponse:
        """Calculate Wyoming formation fees"""
        
        # Wyoming fee structure (as of 2024)
        base_fees = {
            "corporation": 100.00,
            "llc": 100.00,
            "lp": 100.00,
            "llp": 100.00,
            "nonprofit": 25.00
        }
        
        entity_type = entity_type.lower()
        base_fee = base_fees.get(entity_type, 100.00)
        
        total_fee = base_fee
        fee_breakdown = [{"item": f"Base {entity_type} filing fee", "amount": base_fee}]
        
        if options:
            # Expedited processing (24-hour)
            if options.get("expedited_24hr"):
                expedite_fee = 50.00
                total_fee += expedite_fee
                fee_breakdown.append({"item": "24-hour expedited processing", "amount": expedite_fee})
            
            # Same day processing
            if options.get("same_day"):
                same_day_fee = 100.00
                total_fee += same_day_fee
                fee_breakdown.append({"item": "Same day processing", "amount": same_day_fee})
            
            # Certificate copies
            cert_copies = options.get("certificate_copies", 1)
            if cert_copies > 1:
                additional_copies = cert_copies - 1
                copy_fee = additional_copies * 10.00
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
    
    def _map_entity_type(self, entity_type: str) -> str:
        """Map generic entity type to Wyoming-specific format"""
        mapping = {
            "corporation": "CORP",
            "llc": "LLC",
            "limited_liability_company": "LLC",
            "lp": "LP",
            "limited_partnership": "LP",
            "llp": "LLP",
            "limited_liability_partnership": "LLP",
            "nonprofit": "NONPROFIT"
        }
        return mapping.get(entity_type.lower(), "CORP")
