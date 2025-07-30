"""New York Department of State API Integration"""

from typing import Dict, Any, Optional
from urllib.parse import urljoin
from .base_api import BaseGovernmentAPI, APIResponse, RateLimitConfig

class NewYorkAPI(BaseGovernmentAPI):
    """New York Department of State API integration"""
    
    BASE_URL = "https://appext20.dos.ny.gov/api/"
    
    def __init__(self, api_key: Optional[str] = None):
        # New York rate limits
        config = RateLimitConfig(
            requests_per_minute=25,
            requests_per_hour=400,
            burst_limit=3,
            retry_after=150
        )
        super().__init__(api_key, config)
    
    async def check_name_availability(self, name: str, entity_type: str = "corporation") -> APIResponse:
        """Check if business name is available in New York"""
        url = urljoin(self.BASE_URL, "entity-search")
        
        params = {
            "entity_name": name,
            "search_type": "name_search",
            "entity_type": self._map_entity_type(entity_type),
            "status": ["ACTIVE", "GOOD_STANDING"]
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers,
            params=params
        )
        
        if response.success and response.data:
            entities = response.data.get("results", [])
            exact_match = any(
                entity.get("entity_name", "").lower() == name.lower() 
                for entity in entities
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
                            "id": entity.get("dos_id"),
                            "type": entity.get("entity_type"),
                            "status": entity.get("current_entity_status")
                        }
                        for entity in entities[:10]
                    ],
                    "jurisdiction": "New York",
                    "search_date": response.data.get("search_timestamp"),
                    "reservation_period": "60 days" if not exact_match else None,
                    "name_requirements": [
                        "Must include appropriate corporate designator",
                        "Cannot be deceptively similar to existing entity",
                        "Cannot contain prohibited words without approval"
                    ]
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def reserve_name(self, name: str, entity_type: str, applicant_info: Dict[str, Any]) -> APIResponse:
        """Reserve a business name in New York"""
        url = urljoin(self.BASE_URL, "name-reservation")
        
        data = {
            "entity_name": name,
            "entity_type": self._map_entity_type(entity_type),
            "applicant_information": {
                "name": applicant_info.get("name"),
                "address": applicant_info.get("address"),
                "phone": applicant_info.get("phone"),
                "email": applicant_info.get("email")
            },
            "reservation_period": 60,  # New York allows 60-day reservations
            "intended_formation_date": applicant_info.get("intended_formation_date")
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
                    "fee_paid": response.data.get("fee", "$20.00"),
                    "confirmation_number": response.data.get("confirmation_number"),
                    "certificate_number": response.data.get("certificate_number")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def submit_formation_documents(self, formation_data: Dict[str, Any]) -> APIResponse:
        """Submit formation documents to New York"""
        url = urljoin(self.BASE_URL, "entity-filing")
        
        # Map to New York-specific format
        ny_data = {
            "filing_type": "INCORPORATION",
            "entity_type": self._map_entity_type(formation_data.get("entity_type", "corporation")),
            "entity_name": formation_data["name"],
            "purpose": formation_data.get("purpose", "To engage in any lawful act or activity"),
            "office_address": formation_data.get("office_address", {}),
            "registered_agent": {
                "name": formation_data["registered_agent"]["name"],
                "address": formation_data["registered_agent"]["address"],
                "acceptance": formation_data["registered_agent"].get("acceptance", True)
            },
            "incorporators": [
                {
                    "name": inc.get("name"),
                    "address": inc.get("address"),
                    "signature": inc.get("signature", True)
                }
                for inc in formation_data.get("incorporators", [])
            ],
            "directors": formation_data.get("directors", []),
            "stock_information": {
                "authorized_shares": formation_data.get("authorized_shares", 200),
                "par_value": formation_data.get("par_value", "no par value"),
                "share_classes": formation_data.get("share_classes", [])
            },
            "effective_date": formation_data.get("effective_date", "upon_filing"),
            "special_provisions": formation_data.get("special_provisions", []),
            "expedited_service": formation_data.get("expedited", False)
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="POST",
            url=url,
            headers=headers,
            data=ny_data
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "filing_id": response.data.get("filing_receipt_number"),
                    "dos_id": response.data.get("dos_id"),
                    "status": response.data.get("filing_status", "pending"),
                    "filing_date": response.data.get("filing_date"),
                    "fees": response.data.get("total_fees"),
                    "estimated_completion": response.data.get("processing_time"),
                    "tracking_number": response.data.get("tracking_id"),
                    "effective_date": response.data.get("effective_date")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_formation_status(self, filing_id: str) -> APIResponse:
        """Get status of New York formation filing"""
        url = urljoin(self.BASE_URL, f"filing-status")
        
        params = {"filing_receipt_number": filing_id}
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
                    "status": response.data.get("filing_status", "unknown"),
                    "dos_id": response.data.get("dos_id"),
                    "entity_name": response.data.get("entity_name"),
                    "filing_date": response.data.get("filing_date"),
                    "completion_date": response.data.get("completion_date"),
                    "certificate_date": response.data.get("certificate_date"),
                    "effective_date": response.data.get("effective_date"),
                    "rejection_reason": response.data.get("rejection_reason"),
                    "examiner_notes": response.data.get("examiner_notes", [])
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_entity_details(self, dos_id: str) -> APIResponse:
        """Get detailed information about a New York entity"""
        url = urljoin(self.BASE_URL, f"entity-details")
        
        params = {"dos_id": dos_id}
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
                    "dos_id": dos_id,
                    "entity_name": response.data.get("entity_name"),
                    "entity_type": response.data.get("entity_type"),
                    "current_entity_status": response.data.get("current_entity_status"),
                    "incorporation_date": response.data.get("date_of_incorporation"),
                    "jurisdiction": response.data.get("jurisdiction"),
                    "county": response.data.get("county"),
                    "registered_agent": response.data.get("registered_agent"),
                    "office_address": response.data.get("office_address"),
                    "officers": response.data.get("officers", []),
                    "shares_outstanding": response.data.get("shares_outstanding"),
                    "biennial_statement_due": response.data.get("biennial_statement_due"),
                    "tax_status": response.data.get("tax_status")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def calculate_fees(self, entity_type: str, options: Dict[str, Any] = None) -> APIResponse:
        """Calculate New York formation fees"""
        
        # New York fee structure (as of 2024)
        base_fees = {
            "corporation": 125.00,
            "llc": 200.00,
            "lp": 50.00,
            "llp": 200.00,
            "nonprofit": 75.00
        }
        
        entity_type = entity_type.lower()
        base_fee = base_fees.get(entity_type, 125.00)
        
        total_fee = base_fee
        fee_breakdown = [{"item": f"Base {entity_type} filing fee", "amount": base_fee}]
        
        # New York also requires publication for LLCs and LPs
        if entity_type in ["llc", "lp"]:
            publication_fee = 1000.00  # Estimated publication cost
            fee_breakdown.append({
                "item": "Publication requirement (estimated)", 
                "amount": publication_fee,
                "note": "Actual cost varies by county"
            })
            total_fee += publication_fee
        
        if options:
            # Expedited processing (24-hour)
            if options.get("expedited"):
                expedite_fee = 75.00
                total_fee += expedite_fee
                fee_breakdown.append({"item": "24-hour expedited processing", "amount": expedite_fee})
            
            # Certificate of incorporation copies
            cert_copies = options.get("certificate_copies", 1)
            if cert_copies > 1:
                additional_copies = cert_copies - 1
                copy_fee = additional_copies * 10.00
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
                "calculated_date": "2024-07-24",
                "notes": [
                    "Publication fees vary by county for LLCs and LPs",
                    "Biennial statement filing required ($9 fee)"
                ]
            }
        )
    
    def _map_entity_type(self, entity_type: str) -> str:
        """Map generic entity type to New York-specific format"""
        mapping = {
            "corporation": "DOMESTIC BUSINESS CORPORATION",
            "llc": "LIMITED LIABILITY COMPANY",
            "limited_liability_company": "LIMITED LIABILITY COMPANY",
            "lp": "LIMITED PARTNERSHIP",
            "limited_partnership": "LIMITED PARTNERSHIP",
            "llp": "LIMITED LIABILITY PARTNERSHIP",
            "limited_liability_partnership": "LIMITED LIABILITY PARTNERSHIP",
            "nonprofit": "NOT-FOR-PROFIT CORPORATION"
        }
        return mapping.get(entity_type.lower(), "DOMESTIC BUSINESS CORPORATION")
