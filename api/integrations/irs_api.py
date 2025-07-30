"""IRS API Integration for EIN Application"""

from typing import Dict, Any, Optional
from urllib.parse import urljoin
from .base_api import BaseGovernmentAPI, APIResponse, RateLimitConfig

class IRSAPI(BaseGovernmentAPI):
    """IRS API integration for EIN applications"""
    
    BASE_URL = "https://sa.www4.irs.gov/modiein/api/"
    
    def __init__(self, api_key: Optional[str] = None):
        # IRS has very strict rate limits
        config = RateLimitConfig(
            requests_per_minute=10,
            requests_per_hour=100,
            burst_limit=2,
            retry_after=300  # 5 minutes
        )
        super().__init__(api_key, config)
    
    async def check_name_availability(self, name: str, entity_type: str = "corporation") -> APIResponse:
        """Check if business name is available for EIN application"""
        # IRS doesn't check name availability - this is handled at state level
        return APIResponse(
            success=True,
            data={
                "name": name,
                "available": True,  # IRS accepts any valid business name
                "entity_type": entity_type,
                "jurisdiction": "Federal",
                "note": "IRS does not validate business name availability. Ensure name is properly registered at state level."
            }
        )
    
    async def reserve_name(self, name: str, entity_type: str, applicant_info: Dict[str, Any]) -> APIResponse:
        """IRS does not support name reservation"""
        return APIResponse(
            success=False,
            error="IRS does not support name reservation. Names are registered at the state level.",
            status_code=400
        )
    
    async def submit_formation_documents(self, formation_data: Dict[str, Any]) -> APIResponse:
        """Submit EIN application to IRS (Form SS-4)"""
        return await self.apply_for_ein(formation_data)
    
    async def apply_for_ein(self, business_data: Dict[str, Any]) -> APIResponse:
        """Apply for Federal Employer Identification Number (EIN)"""
        url = urljoin(self.BASE_URL, "ein-application")
        
        # Map to IRS Form SS-4 format
        ss4_data = {
            "form_type": "SS-4",
            "legal_name": business_data["name"],
            "trade_name": business_data.get("trade_name", ""),
            "entity_type": self._map_entity_type(business_data.get("entity_type", "corporation")),
            "reason_for_applying": business_data.get("reason", "Started new business"),
            "mailing_address": business_data.get("mailing_address", {}),
            "business_address": business_data.get("business_address", {}),
            "county_and_state": business_data.get("county_state", ""),
            "responsible_party": {
                "name": business_data.get("responsible_party", {}).get("name", ""),
                "ssn_itin": business_data.get("responsible_party", {}).get("ssn", ""),
                "title": business_data.get("responsible_party", {}).get("title", "Owner")
            },
            "business_start_date": business_data.get("business_start_date", ""),
            "accounting_period": business_data.get("accounting_period", "December"),
            "principal_activity": business_data.get("principal_activity", ""),
            "naics_code": business_data.get("naics_code", ""),
            "principal_product": business_data.get("principal_product", ""),
            "employees": {
                "current_employees": business_data.get("employees", {}).get("current", 0),
                "expected_12_months": business_data.get("employees", {}).get("expected", 0),
                "expected_payroll": business_data.get("employees", {}).get("payroll", 0)
            },
            "banking_purposes": business_data.get("banking_purposes", True),
            "state_of_incorporation": business_data.get("state_of_incorporation", ""),
            "incorporation_date": business_data.get("incorporation_date", "")
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="POST",
            url=url,
            headers=headers,
            data=ss4_data
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "filing_id": response.data.get("application_id"),
                    "ein": response.data.get("ein"),
                    "status": response.data.get("status", "pending"),
                    "filing_date": response.data.get("submission_date"),
                    "confirmation_number": response.data.get("confirmation_number"),
                    "estimated_completion": response.data.get("processing_time", "4-6 weeks"),
                    "cp575_notice": response.data.get("cp575_notice_date")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_formation_status(self, filing_id: str) -> APIResponse:
        """Get status of EIN application"""
        return await self.get_ein_status(filing_id)
    
    async def get_ein_status(self, application_id: str) -> APIResponse:
        """Get status of EIN application"""
        url = urljoin(self.BASE_URL, f"ein-status/{application_id}")
        
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
                "ISSUED": "completed",
                "REJECTED": "rejected"
            }
            
            status = status_mapping.get(
                response.data.get("status", "").upper(),
                "unknown"
            )
            
            return APIResponse(
                success=True,
                data={
                    "filing_id": application_id,
                    "status": status,
                    "ein": response.data.get("ein"),
                    "business_name": response.data.get("legal_name"),
                    "application_date": response.data.get("submission_date"),
                    "approval_date": response.data.get("approval_date"),
                    "cp575_date": response.data.get("cp575_notice_date"),
                    "rejection_reason": response.data.get("rejection_reason"),
                    "next_steps": response.data.get("next_steps", [])
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def verify_ein(self, ein: str, business_name: str) -> APIResponse:
        """Verify an existing EIN"""
        url = urljoin(self.BASE_URL, "ein-verification")
        
        data = {
            "ein": ein,
            "business_name": business_name
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
                    "ein": ein,
                    "business_name": business_name,
                    "valid": response.data.get("valid", False),
                    "status": response.data.get("ein_status"),
                    "issue_date": response.data.get("issue_date"),
                    "entity_type": response.data.get("entity_type"),
                    "verification_date": response.data.get("verification_timestamp")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_ein_letter(self, ein: str, business_info: Dict[str, Any]) -> APIResponse:
        """Request EIN confirmation letter (CP575)"""
        url = urljoin(self.BASE_URL, "ein-letter-request")
        
        data = {
            "ein": ein,
            "legal_name": business_info.get("legal_name"),
            "responsible_party": business_info.get("responsible_party", {}),
            "mailing_address": business_info.get("mailing_address", {}),
            "request_type": "duplicate_letter"
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
                    "request_id": response.data.get("request_id"),
                    "ein": ein,
                    "status": response.data.get("status", "processing"),
                    "estimated_delivery": response.data.get("estimated_delivery", "10-15 business days"),
                    "confirmation_number": response.data.get("confirmation_number")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def calculate_fees(self, entity_type: str, options: Dict[str, Any] = None) -> APIResponse:
        """Calculate IRS fees (EIN applications are free)"""
        return APIResponse(
            success=True,
            data={
                "entity_type": entity_type,
                "total_fee": 0.00,
                "fee_breakdown": [
                    {"item": "EIN Application (Form SS-4)", "amount": 0.00}
                ],
                "currency": "USD",
                "calculated_date": "2024-07-24",
                "notes": [
                    "EIN applications are free when filed directly with the IRS",
                    "Be aware of third-party services that charge fees for EIN applications"
                ]
            }
        )
    
    def _map_entity_type(self, entity_type: str) -> str:
        """Map generic entity type to IRS-specific format"""
        mapping = {
            "corporation": "Corporation",
            "llc": "LLC",
            "limited_liability_company": "LLC",
            "partnership": "Partnership",
            "sole_proprietorship": "Sole proprietorship",
            "nonprofit": "Non-profit organization",
            "estate": "Estate",
            "trust": "Trust",
            "government": "Government",
            "other": "Other"
        }
        return mapping.get(entity_type.lower(), "Corporation")
