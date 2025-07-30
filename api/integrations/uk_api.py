"""UK Companies House API Integration"""

from typing import Dict, Any, Optional
from urllib.parse import urljoin
from .base_api import BaseGovernmentAPI, APIResponse, RateLimitConfig

class UKCompaniesHouseAPI(BaseGovernmentAPI):
    """UK Companies House API integration"""
    
    BASE_URL = "https://api.companieshouse.gov.uk/"
    
    def __init__(self, api_key: Optional[str] = None):
        # UK Companies House rate limits
        config = RateLimitConfig(
            requests_per_minute=600,  # 600 per 5 minutes = 120 per minute
            requests_per_hour=7200,   # 600 per 5 minutes = 7200 per hour
            burst_limit=10,
            retry_after=300  # 5 minutes
        )
        super().__init__(api_key, config)
    
    def get_base_headers(self) -> Dict[str, str]:
        """Get base headers for UK API requests"""
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Frontier-Business-Operations/1.0'
        }
        
        if self.api_key:
            # Companies House uses basic auth with API key as username
            import base64
            credentials = base64.b64encode(f"{self.api_key}:".encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        return headers
    
    async def check_name_availability(self, name: str, entity_type: str = "ltd") -> APIResponse:
        """Check if company name is available in UK"""
        url = urljoin(self.BASE_URL, "advanced-search/companies")
        
        params = {
            "company_name": name,
            "location": "united-kingdom",
            "company_status": "active",
            "items_per_page": 20
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="GET",
            url=url,
            headers=headers,
            params=params
        )
        
        if response.success and response.data:
            companies = response.data.get("items", [])
            exact_match = any(
                company.get("company_name", "").lower() == name.lower() 
                for company in companies
            )
            
            return APIResponse(
                success=True,
                data={
                    "name": name,
                    "available": not exact_match,
                    "entity_type": entity_type,
                    "similar_names": [
                        {
                            "name": company.get("company_name"),
                            "number": company.get("company_number"),
                            "status": company.get("company_status")
                        }
                        for company in companies[:10]
                    ],
                    "jurisdiction": "United Kingdom",
                    "search_date": response.data.get("search_date"),
                    "total_results": response.data.get("total_results", len(companies))
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def reserve_name(self, name: str, entity_type: str, applicant_info: Dict[str, Any]) -> APIResponse:
        """Reserve company name in UK (via incorporation request)"""
        # UK doesn't have separate name reservation - names are reserved during incorporation
        return APIResponse(
            success=False,
            error="UK Companies House doesn't support separate name reservation. Names are reserved during incorporation process.",
            status_code=400
        )
    
    async def submit_formation_documents(self, formation_data: Dict[str, Any]) -> APIResponse:
        """Submit incorporation documents to UK Companies House"""
        url = urljoin(self.BASE_URL, "company/")
        
        # Map to UK Companies House format
        uk_data = {
            "company_name": formation_data["name"],
            "company_type": self._map_entity_type(formation_data.get("entity_type", "ltd")),
            "registered_office_address": {
                "address_line_1": formation_data["registered_office"]["address_line_1"],
                "address_line_2": formation_data["registered_office"].get("address_line_2", ""),
                "locality": formation_data["registered_office"]["city"],
                "region": formation_data["registered_office"].get("region", ""),
                "postal_code": formation_data["registered_office"]["postal_code"],
                "country": formation_data["registered_office"].get("country", "England")
            },
            "officers": [
                {
                    "title": officer.get("title", ""),
                    "forenames": officer["first_name"],
                    "surname": officer["last_name"],
                    "officer_role": officer.get("role", "director"),
                    "appointed_on": officer.get("appointed_on"),
                    "nationality": officer.get("nationality", "British"),
                    "country_of_residence": officer.get("country_of_residence", "United Kingdom"),
                    "occupation": officer.get("occupation", "Director"),
                    "service_address": officer.get("service_address", formation_data["registered_office"])
                }
                for officer in formation_data.get("officers", [])
            ],
            "persons_with_significant_control": formation_data.get("psc", []),
            "share_capital": {
                "total_number_of_shares": formation_data.get("share_capital", {}).get("total_shares", 100),
                "total_aggregate_nominal_value": formation_data.get("share_capital", {}).get("nominal_value", 100),
                "currency": formation_data.get("share_capital", {}).get("currency", "GBP")
            },
            "articles_of_association_type": formation_data.get("articles_type", "model_articles"),
            "memorandum_of_association": formation_data.get("memorandum", {}),
            "sic_codes": formation_data.get("sic_codes", ["62012"])  # Default: business and domestic software development
        }
        
        headers = self.get_base_headers()
        
        response = await self._make_request(
            method="POST",
            url=url,
            headers=headers,
            data=uk_data
        )
        
        if response.success and response.data:
            return APIResponse(
                success=True,
                data={
                    "filing_id": response.data.get("transaction_id"),
                    "company_number": response.data.get("company_number"),
                    "status": response.data.get("status", "pending"),
                    "filing_date": response.data.get("submission_date"),
                    "fees": response.data.get("total_fees", "£12.00"),
                    "estimated_completion": response.data.get("estimated_completion", "24 hours"),
                    "tracking_number": response.data.get("barcode")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_formation_status(self, filing_id: str) -> APIResponse:
        """Get status of UK incorporation filing"""
        url = urljoin(self.BASE_URL, f"transactions/{filing_id}")
        
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
                    "company_number": response.data.get("company_number"),
                    "company_name": response.data.get("company_name"),
                    "filing_date": response.data.get("submission_date"),
                    "completion_date": response.data.get("accepted_date"),
                    "certificate_url": response.data.get("certificate_uri"),
                    "rejection_reason": response.data.get("rejection_reason")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_company_details(self, company_number: str) -> APIResponse:
        """Get detailed information about a UK company"""
        url = urljoin(self.BASE_URL, f"company/{company_number}")
        
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
                    "company_number": company_number,
                    "company_name": response.data.get("company_name"),
                    "company_type": response.data.get("type"),
                    "company_status": response.data.get("company_status"),
                    "date_of_creation": response.data.get("date_of_creation"),
                    "jurisdiction": response.data.get("jurisdiction"),
                    "registered_office_address": response.data.get("registered_office_address"),
                    "sic_codes": response.data.get("sic_codes", []),
                    "accounts": response.data.get("accounts", {}),
                    "confirmation_statement": response.data.get("confirmation_statement", {}),
                    "can_file": response.data.get("can_file", True)
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def get_company_officers(self, company_number: str) -> APIResponse:
        """Get officers of a UK company"""
        url = urljoin(self.BASE_URL, f"company/{company_number}/officers")
        
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
                    "company_number": company_number,
                    "officers": response.data.get("items", []),
                    "total_results": response.data.get("total_results"),
                    "active_count": response.data.get("active_count"),
                    "resigned_count": response.data.get("resigned_count")
                },
                status_code=response.status_code,
                response_time=response.response_time
            )
        
        return response
    
    async def calculate_fees(self, entity_type: str, options: Dict[str, Any] = None) -> APIResponse:
        """Calculate UK incorporation fees"""
        
        # UK Companies House fee structure (as of 2024)
        base_fees = {
            "ltd": 12.00,
            "plc": 20.00,
            "llp": 20.00,
            "limited_partnership": 20.00
        }
        
        entity_type = entity_type.lower()
        base_fee = base_fees.get(entity_type, 12.00)
        
        total_fee = base_fee
        fee_breakdown = [{"item": f"Base {entity_type.upper()} incorporation fee", "amount": base_fee}]
        
        if options:
            # Same day service
            if options.get("same_day"):
                same_day_fee = 100.00
                total_fee += same_day_fee
                fee_breakdown.append({"item": "Same day incorporation service", "amount": same_day_fee})
        
        return APIResponse(
            success=True,
            data={
                "entity_type": entity_type,
                "total_fee": total_fee,
                "fee_breakdown": fee_breakdown,
                "currency": "GBP",
                "calculated_date": "2024-07-24"
            }
        )
    
    def _map_entity_type(self, entity_type: str) -> str:
        """Map generic entity type to UK Companies House format"""
        mapping = {
            "ltd": "ltd",
            "limited": "ltd",
            "corporation": "ltd",
            "plc": "plc",
            "public_limited_company": "plc",
            "llp": "llp",
            "limited_liability_partnership": "llp",
            "limited_partnership": "limited-partnership"
        }
        return mapping.get(entity_type.lower(), "ltd")
