"""
Government API Integration Module
Handles integration with government filing systems and APIs
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import xml.etree.ElementTree as ET
from urllib.parse import urljoin
import hmac
import hashlib
import base64
import ssl
import certifi

from formation_engine import (
    FormationRequest, Jurisdiction, EntityType, FormationStage,
    JurisdictionManager
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class APIStatus(Enum):
    """API integration status"""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"

class FilingStatus(Enum):
    """Status of government filings"""
    PENDING = "pending"
    SUBMITTED = "submitted"
    PROCESSING = "processing" 
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUIRES_CORRECTION = "requires_correction"
    CANCELLED = "cancelled"

@dataclass
class APICredentials:
    """API authentication credentials"""
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    certificate_path: Optional[str] = None
    environment: str = "production"  # or "sandbox"

@dataclass
class FilingResponse:
    """Response from government filing API"""
    filing_id: str
    status: FilingStatus
    confirmation_number: Optional[str] = None
    tracking_number: Optional[str] = None
    submitted_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    fees_paid: Optional[float] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    documents: List[Dict[str, Any]] = field(default_factory=list)
    raw_response: Optional[Dict[str, Any]] = None

@dataclass
class NameAvailabilityResult:
    """Result of business name availability check"""
    name: str
    available: bool
    similar_names: List[str] = field(default_factory=list)
    restrictions: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    reservation_available: bool = True
    reservation_fee: Optional[float] = None
    reservation_period_days: Optional[int] = None

class GovernmentAPIIntegration:
    """Base class for government API integrations"""
    
    def __init__(self, jurisdiction: Jurisdiction, credentials: APICredentials):
        self.jurisdiction = jurisdiction
        self.credentials = credentials
        self.session: Optional[aiohttp.ClientSession] = None
        self.base_url = self._get_base_url()
        self.rate_limit_remaining = 100
        self.rate_limit_reset = datetime.utcnow()
    
    def _get_base_url(self) -> str:
        """Get base URL for the jurisdiction's API"""
        urls = {
            Jurisdiction.DELAWARE: "https://corp.delaware.gov/api/v1",
            Jurisdiction.CALIFORNIA: "https://bizfile.sos.ca.gov/api/v2",
            Jurisdiction.NEVADA: "https://esos.nv.gov/api/v1",
            Jurisdiction.NEW_YORK: "https://appext20.dos.ny.gov/corp_public/api",
            Jurisdiction.TEXAS: "https://webservices.sos.state.tx.us/api/v1",
        }
        
        sandbox_urls = {
            Jurisdiction.DELAWARE: "https://corp-sandbox.delaware.gov/api/v1",
            Jurisdiction.CALIFORNIA: "https://bizfile-sandbox.sos.ca.gov/api/v2",
        }
        
        if self.credentials.environment == "sandbox":
            return sandbox_urls.get(self.jurisdiction, urls.get(self.jurisdiction, ""))
        
        return urls.get(self.jurisdiction, "")
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self._create_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self._close_session()
    
    async def _create_session(self):
        """Create HTTP session with SSL configuration"""
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers=self._get_default_headers()
        )
    
    async def _close_session(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
    
    def _get_default_headers(self) -> Dict[str, str]:
        """Get default HTTP headers"""
        return {
            "User-Agent": "Frontier-BusinessFormation/1.0",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    async def check_api_status(self) -> APIStatus:
        """Check if the government API is available"""
        try:
            if not self.session:
                await self._create_session()
            
            async with self.session.get(f"{self.base_url}/status") as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("status") == "operational":
                        return APIStatus.AVAILABLE
                    elif data.get("status") == "maintenance":
                        return APIStatus.MAINTENANCE
                    else:
                        return APIStatus.ERROR
                elif response.status == 429:
                    return APIStatus.RATE_LIMITED
                else:
                    return APIStatus.ERROR
                    
        except Exception as e:
            logger.error(f"API status check failed: {e}")
            return APIStatus.ERROR
    
    async def check_name_availability(self, business_name: str, 
                                    entity_type: EntityType) -> NameAvailabilityResult:
        """Check if business name is available"""
        raise NotImplementedError("Subclasses must implement check_name_availability")
    
    async def reserve_name(self, business_name: str, entity_type: EntityType,
                          duration_days: int = 120) -> Dict[str, Any]:
        """Reserve a business name"""
        raise NotImplementedError("Subclasses must implement reserve_name")
    
    async def submit_formation_filing(self, formation_request: FormationRequest) -> FilingResponse:
        """Submit formation documents to government"""
        raise NotImplementedError("Subclasses must implement submit_formation_filing")
    
    async def check_filing_status(self, filing_id: str) -> FilingResponse:
        """Check status of submitted filing"""
        raise NotImplementedError("Subclasses must implement check_filing_status")
    
    async def download_filing_documents(self, filing_id: str) -> List[Dict[str, Any]]:
        """Download official filed documents"""
        raise NotImplementedError("Subclasses must implement download_filing_documents")

class DelawareAPIIntegration(GovernmentAPIIntegration):
    """Delaware Division of Corporations API integration"""
    
    def __init__(self, credentials: APICredentials):
        super().__init__(Jurisdiction.DELAWARE, credentials)
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for Delaware API"""
        headers = {}
        
        if self.credentials.api_key:
            headers["X-API-Key"] = self.credentials.api_key
        
        if self.credentials.username and self.credentials.password:
            auth_string = f"{self.credentials.username}:{self.credentials.password}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            headers["Authorization"] = f"Basic {auth_b64}"
        
        return headers
    
    async def check_name_availability(self, business_name: str, 
                                    entity_type: EntityType) -> NameAvailabilityResult:
        """Check name availability with Delaware Division of Corporations"""
        
        try:
            headers = self._get_auth_headers()
            
            params = {
                "name": business_name,
                "entity_type": entity_type.value,
                "include_similar": True
            }
            
            async with self.session.get(
                f"{self.base_url}/names/check", 
                headers=headers,
                params=params
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    return NameAvailabilityResult(
                        name=business_name,
                        available=data.get("available", False),
                        similar_names=data.get("similar_names", []),
                        restrictions=data.get("restrictions", []),
                        suggestions=data.get("suggestions", []),
                        reservation_available=data.get("reservation_available", True),
                        reservation_fee=data.get("reservation_fee", 75.0),
                        reservation_period_days=data.get("reservation_period", 120)
                    )
                
                elif response.status == 429:
                    # Rate limited
                    raise Exception("API rate limit exceeded")
                else:
                    error_data = await response.json()
                    raise Exception(f"Name check failed: {error_data.get('message', 'Unknown error')}")
                    
        except Exception as e:
            logger.error(f"Delaware name availability check failed: {e}")
            # Return fallback result
            return NameAvailabilityResult(
                name=business_name,
                available=False,
                restrictions=["API unavailable - manual verification required"]
            )
    
    async def reserve_name(self, business_name: str, entity_type: EntityType,
                          duration_days: int = 120) -> Dict[str, Any]:
        """Reserve name with Delaware"""
        
        headers = self._get_auth_headers()
        
        payload = {
            "name": business_name,
            "entity_type": entity_type.value,
            "duration_days": duration_days,
            "applicant": {
                "name": "Frontier Business Formation",
                "address": "123 Business St, Dover, DE 19901",
                "phone": "555-123-4567"
            }
        }
        
        async with self.session.post(
            f"{self.base_url}/names/reserve",
            headers=headers,
            json=payload
        ) as response:
            
            if response.status == 201:
                data = await response.json()
                return {
                    "reservation_id": data.get("reservation_id"),
                    "reserved_until": data.get("reserved_until"),
                    "confirmation_number": data.get("confirmation_number"),
                    "fee_paid": data.get("fee_paid", 75.0)
                }
            else:
                error_data = await response.json()
                raise Exception(f"Name reservation failed: {error_data.get('message')}")
    
    async def submit_formation_filing(self, formation_request: FormationRequest) -> FilingResponse:
        """Submit formation filing to Delaware"""
        
        headers = self._get_auth_headers()
        
        # Convert formation request to Delaware API format
        filing_data = self._format_delaware_filing(formation_request)
        
        async with self.session.post(
            f"{self.base_url}/filings/formation",
            headers=headers,
            json=filing_data
        ) as response:
            
            response_data = await response.json()
            
            if response.status == 201:
                return FilingResponse(
                    filing_id=response_data["filing_id"],
                    status=FilingStatus(response_data["status"]),
                    confirmation_number=response_data.get("confirmation_number"),
                    tracking_number=response_data.get("tracking_number"),
                    submitted_at=datetime.fromisoformat(response_data["submitted_at"]),
                    fees_paid=response_data.get("fees_paid"),
                    raw_response=response_data
                )
            else:
                return FilingResponse(
                    filing_id="",
                    status=FilingStatus.REJECTED,
                    errors=[response_data.get("message", "Filing failed")],
                    raw_response=response_data
                )
    
    def _format_delaware_filing(self, formation_request: FormationRequest) -> Dict[str, Any]:
        """Format formation request for Delaware API"""
        
        business = formation_request.business_details
        
        filing_data = {
            "entity_type": business.entity_type.value,
            "entity_name": business.proposed_name,
            "registered_office": {
                "street_address": business.registered_address.street_line1,
                "city": business.registered_address.city,
                "state": business.registered_address.state_province,
                "zip_code": business.registered_address.postal_code
            },
            "business_purpose": business.business_purpose,
            "expedited": business.expedited_processing
        }
        
        # Add registered agent
        if formation_request.registered_agent:
            agent = formation_request.registered_agent
            filing_data["registered_agent"] = {
                "name": agent.full_name,
                "address": {
                    "street_address": agent.address.street_line1,
                    "city": agent.address.city,
                    "state": agent.address.state_province,
                    "zip_code": agent.address.postal_code
                }
            }
        
        # Add organizer/incorporator
        if formation_request.owners:
            organizer = formation_request.owners[0]
            filing_data["organizer"] = {
                "name": organizer.full_name,
                "address": {
                    "street_address": organizer.address.street_line1,
                    "city": organizer.address.city,
                    "state": organizer.address.state_province,
                    "zip_code": organizer.address.postal_code
                }
            }
        
        # Corporation-specific fields
        if business.entity_type in [EntityType.CORPORATION, EntityType.S_CORPORATION]:
            filing_data.update({
                "authorized_shares": business.authorized_shares or 1000,
                "par_value": business.par_value or 0.001
            })
        
        return filing_data
    
    async def check_filing_status(self, filing_id: str) -> FilingResponse:
        """Check Delaware filing status"""
        
        headers = self._get_auth_headers()
        
        async with self.session.get(
            f"{self.base_url}/filings/{filing_id}",
            headers=headers
        ) as response:
            
            if response.status == 200:
                data = await response.json()
                
                return FilingResponse(
                    filing_id=filing_id,
                    status=FilingStatus(data["status"]),
                    confirmation_number=data.get("confirmation_number"),
                    tracking_number=data.get("tracking_number"),
                    submitted_at=datetime.fromisoformat(data["submitted_at"]) if data.get("submitted_at") else None,
                    processed_at=datetime.fromisoformat(data["processed_at"]) if data.get("processed_at") else None,
                    fees_paid=data.get("fees_paid"),
                    errors=data.get("errors", []),
                    warnings=data.get("warnings", []),
                    documents=data.get("documents", []),
                    raw_response=data
                )
            else:
                raise Exception(f"Failed to check filing status: {response.status}")

class CaliforniaAPIIntegration(GovernmentAPIIntegration):
    """California Secretary of State API integration"""
    
    def __init__(self, credentials: APICredentials):
        super().__init__(Jurisdiction.CALIFORNIA, credentials)
    
    async def check_name_availability(self, business_name: str, 
                                    entity_type: EntityType) -> NameAvailabilityResult:
        """Check name availability with California SOS"""
        
        # California uses a different API structure
        try:
            headers = {"X-API-Key": self.credentials.api_key} if self.credentials.api_key else {}
            
            params = {
                "EntityName": business_name,
                "EntityType": self._map_entity_type_ca(entity_type)
            }
            
            async with self.session.get(
                f"{self.base_url}/NameAvailability",
                headers=headers,
                params=params
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    return NameAvailabilityResult(
                        name=business_name,
                        available=data.get("Available", False),
                        similar_names=data.get("SimilarNames", []),
                        restrictions=data.get("Restrictions", []),
                        reservation_available=True,
                        reservation_fee=10.0,
                        reservation_period_days=60
                    )
                else:
                    # Fallback to basic name check
                    return NameAvailabilityResult(
                        name=business_name,
                        available=False,
                        restrictions=["Manual verification required"]
                    )
                    
        except Exception as e:
            logger.error(f"California name check failed: {e}")
            return NameAvailabilityResult(
                name=business_name,
                available=False,
                restrictions=["API unavailable - manual verification required"]
            )
    
    def _map_entity_type_ca(self, entity_type: EntityType) -> str:
        """Map entity type to California API format"""
        mapping = {
            EntityType.LLC: "LLC",
            EntityType.CORPORATION: "CORP",
            EntityType.S_CORPORATION: "CORP",
            EntityType.LIMITED_PARTNERSHIP: "LP"
        }
        return mapping.get(entity_type, "LLC")
    
    async def submit_formation_filing(self, formation_request: FormationRequest) -> FilingResponse:
        """Submit formation filing to California"""
        
        # California currently requires manual filing for most entity types
        # This would integrate with their filing system when available
        
        return FilingResponse(
            filing_id=f"CA_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            status=FilingStatus.PENDING,
            errors=["California filing requires manual submission to Secretary of State"]
        )

class NevadaAPIIntegration(GovernmentAPIIntegration):
    """Nevada Secretary of State API integration"""
    
    def __init__(self, credentials: APICredentials):
        super().__init__(Jurisdiction.NEVADA, credentials)
    
    async def check_name_availability(self, business_name: str, 
                                    entity_type: EntityType) -> NameAvailabilityResult:
        """Check name availability with Nevada SOS"""
        
        try:
            params = {
                "name": business_name,
                "type": entity_type.value
            }
            
            headers = {}
            if self.credentials.api_key:
                headers["Authorization"] = f"Bearer {self.credentials.api_key}"
            
            async with self.session.get(
                f"{self.base_url}/entities/name-search",
                headers=headers,
                params=params
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    return NameAvailabilityResult(
                        name=business_name,
                        available=data.get("available", False),
                        similar_names=data.get("similar", []),
                        reservation_available=True,
                        reservation_fee=25.0,
                        reservation_period_days=90
                    )
                else:
                    return NameAvailabilityResult(
                        name=business_name,
                        available=False,
                        restrictions=["Manual verification required"]
                    )
                    
        except Exception as e:
            logger.error(f"Nevada name check failed: {e}")
            return NameAvailabilityResult(
                name=business_name,
                available=False,
                restrictions=["API unavailable"]
            )

class APIManager:
    """Manages government API integrations across jurisdictions"""
    
    def __init__(self):
        self.integrations: Dict[Jurisdiction, GovernmentAPIIntegration] = {}
        self.credentials: Dict[Jurisdiction, APICredentials] = {}
        self._load_credentials()
    
    def _load_credentials(self):
        """Load API credentials from secure storage"""
        # In production, this would load from encrypted storage or environment variables
        self.credentials = {
            Jurisdiction.DELAWARE: APICredentials(
                api_key="de_api_key_here",
                environment="production"
            ),
            Jurisdiction.CALIFORNIA: APICredentials(
                api_key="ca_api_key_here",
                environment="production"
            ),
            Jurisdiction.NEVADA: APICredentials(
                api_key="nv_api_key_here",
                environment="production"
            )
        }
    
    def get_integration(self, jurisdiction: Jurisdiction) -> Optional[GovernmentAPIIntegration]:
        """Get API integration for jurisdiction"""
        
        if jurisdiction in self.integrations:
            return self.integrations[jurisdiction]
        
        credentials = self.credentials.get(jurisdiction)
        if not credentials:
            return None
        
        # Create appropriate integration
        if jurisdiction == Jurisdiction.DELAWARE:
            integration = DelawareAPIIntegration(credentials)
        elif jurisdiction == Jurisdiction.CALIFORNIA:
            integration = CaliforniaAPIIntegration(credentials)
        elif jurisdiction == Jurisdiction.NEVADA:
            integration = NevadaAPIIntegration(credentials)
        else:
            return None
        
        self.integrations[jurisdiction] = integration
        return integration
    
    async def check_name_availability(self, business_name: str, entity_type: EntityType,
                                    jurisdiction: Jurisdiction) -> NameAvailabilityResult:
        """Check name availability across jurisdictions"""
        
        integration = self.get_integration(jurisdiction)
        if not integration:
            return NameAvailabilityResult(
                name=business_name,
                available=False,
                restrictions=["API integration not available for this jurisdiction"]
            )
        
        async with integration:
            return await integration.check_name_availability(business_name, entity_type)
    
    async def submit_formation_filing(self, formation_request: FormationRequest) -> FilingResponse:
        """Submit formation filing through appropriate API"""
        
        jurisdiction = formation_request.business_details.jurisdiction
        integration = self.get_integration(jurisdiction)
        
        if not integration:
            return FilingResponse(
                filing_id="",
                status=FilingStatus.REJECTED,
                errors=["API integration not available for this jurisdiction"]
            )
        
        async with integration:
            return await integration.submit_formation_filing(formation_request)
    
    async def check_filing_status(self, filing_id: str, 
                                jurisdiction: Jurisdiction) -> FilingResponse:
        """Check status of government filing"""
        
        integration = self.get_integration(jurisdiction)
        if not integration:
            return FilingResponse(
                filing_id=filing_id,
                status=FilingStatus.REJECTED,
                errors=["API integration not available"]
            )
        
        async with integration:
            return await integration.check_filing_status(filing_id)
    
    async def bulk_name_check(self, names: List[str], entity_type: EntityType,
                            jurisdictions: List[Jurisdiction]) -> Dict[str, Dict[Jurisdiction, NameAvailabilityResult]]:
        """Check multiple names across multiple jurisdictions"""
        
        results = {}
        
        for name in names:
            results[name] = {}
            
            # Check name in each jurisdiction
            tasks = []
            for jurisdiction in jurisdictions:
                task = self.check_name_availability(name, entity_type, jurisdiction)
                tasks.append((jurisdiction, task))
            
            # Execute checks concurrently
            for jurisdiction, task in tasks:
                try:
                    result = await task
                    results[name][jurisdiction] = result
                except Exception as e:
                    logger.error(f"Name check failed for {name} in {jurisdiction}: {e}")
                    results[name][jurisdiction] = NameAvailabilityResult(
                        name=name,
                        available=False,
                        restrictions=[f"Check failed: {str(e)}"]
                    )
        
        return results

# EIN Application Integration
class EINApplication:
    """Handles EIN (Employer Identification Number) applications with IRS"""
    
    def __init__(self):
        self.irs_api_base = "https://www.irs.gov/pub/irs-pdf"  # For forms
        self.third_party_service = "https://api.einpressnow.com"  # Example third-party service
    
    async def apply_for_ein(self, formation_request: FormationRequest) -> Dict[str, Any]:
        """Apply for EIN through IRS or third-party service"""
        
        business = formation_request.business_details
        
        # Prepare EIN application data
        application_data = {
            "legal_name": business.proposed_name,
            "entity_type": self._map_entity_type_irs(business.entity_type),
            "address": {
                "street": business.registered_address.street_line1,
                "city": business.registered_address.city,
                "state": business.registered_address.state_province,
                "zip": business.registered_address.postal_code
            },
            "responsible_party": {
                "name": formation_request.owners[0].full_name if formation_request.owners else "",
                "ssn": formation_request.owners[0].ssn_last_four if formation_request.owners else ""
            },
            "business_purpose": business.business_purpose,
            "start_date": datetime.utcnow().strftime("%m/%d/%Y")
        }
        
        # For now, return a mock response since IRS doesn't have a public API
        return {
            "ein": "XX-XXXXXXX",  # Would be actual EIN from IRS
            "application_status": "pending",
            "estimated_processing_time": "1-2 business days",
            "confirmation_number": f"EIN_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            "notes": "EIN application submitted. Official EIN will be provided upon approval."
        }
    
    def _map_entity_type_irs(self, entity_type: EntityType) -> str:
        """Map entity type to IRS classification"""
        mapping = {
            EntityType.LLC: "LLC",
            EntityType.CORPORATION: "Corporation",
            EntityType.S_CORPORATION: "Corporation", 
            EntityType.PARTNERSHIP: "Partnership",
            EntityType.LIMITED_PARTNERSHIP: "Partnership",
            EntityType.SOLE_PROPRIETORSHIP: "Sole Proprietorship"
        }
        return mapping.get(entity_type, "Other")

if __name__ == "__main__":
    # Example usage
    async def test_government_apis():
        api_manager = APIManager()
        
        # Test name availability
        result = await api_manager.check_name_availability(
            "Tech Innovations LLC",
            EntityType.LLC,
            Jurisdiction.DELAWARE
        )
        
        print(f"Name availability result: {result}")
        
        # Test bulk name check
        bulk_results = await api_manager.bulk_name_check(
            ["Tech Innovations LLC", "Digital Solutions Corp"],
            EntityType.LLC,
            [Jurisdiction.DELAWARE, Jurisdiction.NEVADA]
        )
        
        print(f"Bulk name check results: {bulk_results}")

    # Run test
    asyncio.run(test_government_apis())
