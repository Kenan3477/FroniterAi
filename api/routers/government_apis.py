"""Government API Integration Router"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from ..middleware.auth import get_current_user
from ..utils.response_models import APIResponse
from ..integrations import (
    DelawareAPI, CaliforniaAPI, UKCompaniesHouseAPI, 
    WyomingAPI, NewYorkAPI, IRSAPI
)

router = APIRouter()

# Pydantic models for request validation
class NameAvailabilityRequest(BaseModel):
    name: str = Field(..., description="Business name to check")
    entity_type: str = Field(default="corporation", description="Type of entity")
    jurisdictions: List[str] = Field(..., description="List of jurisdictions to check")

class NameReservationRequest(BaseModel):
    name: str = Field(..., description="Business name to reserve")
    entity_type: str = Field(default="corporation", description="Type of entity")
    jurisdiction: str = Field(..., description="Jurisdiction for reservation")
    applicant_info: Dict[str, Any] = Field(..., description="Applicant information")

class FormationRequest(BaseModel):
    name: str = Field(..., description="Business name")
    entity_type: str = Field(default="corporation", description="Type of entity")
    jurisdiction: str = Field(..., description="Jurisdiction for formation")
    registered_agent: Dict[str, Any] = Field(..., description="Registered agent information")
    incorporators: List[Dict[str, Any]] = Field(default=[], description="Incorporators")
    directors: List[Dict[str, Any]] = Field(default=[], description="Directors")
    purpose: Optional[str] = Field(default=None, description="Business purpose")
    authorized_shares: Optional[int] = Field(default=None, description="Authorized shares")
    par_value: Optional[float] = Field(default=None, description="Par value per share")
    expedited: bool = Field(default=False, description="Expedited processing")
    additional_options: Dict[str, Any] = Field(default={}, description="Additional options")

class EINApplicationRequest(BaseModel):
    name: str = Field(..., description="Business legal name")
    entity_type: str = Field(..., description="Type of entity")
    responsible_party: Dict[str, Any] = Field(..., description="Responsible party information")
    business_start_date: str = Field(..., description="Business start date")
    principal_activity: str = Field(..., description="Principal business activity")
    state_of_incorporation: Optional[str] = Field(default=None, description="State of incorporation")
    mailing_address: Dict[str, Any] = Field(..., description="Mailing address")
    business_address: Optional[Dict[str, Any]] = Field(default=None, description="Business address")

# API instance mapping
API_MAPPING = {
    "delaware": DelawareAPI,
    "california": CaliforniaAPI, 
    "uk": UKCompaniesHouseAPI,
    "united_kingdom": UKCompaniesHouseAPI,
    "wyoming": WyomingAPI,
    "new_york": NewYorkAPI,
    "irs": IRSAPI,
    "federal": IRSAPI
}

def get_api_instance(jurisdiction: str, api_key: Optional[str] = None):
    """Get API instance for specified jurisdiction"""
    jurisdiction = jurisdiction.lower().replace(" ", "_")
    
    if jurisdiction not in API_MAPPING:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported jurisdiction: {jurisdiction}. Supported: {list(API_MAPPING.keys())}"
        )
    
    api_class = API_MAPPING[jurisdiction]
    return api_class(api_key=api_key)

@router.post("/name-availability", response_model=APIResponse[Dict[str, Any]])
async def check_name_availability_multi_jurisdiction(
    request: NameAvailabilityRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check business name availability across multiple jurisdictions"""
    results = {}
    
    for jurisdiction in request.jurisdictions:
        try:
            api = get_api_instance(jurisdiction)
            response = await api.check_name_availability(request.name, request.entity_type)
            
            results[jurisdiction] = {
                "available": response.data.get("available", False) if response.success else False,
                "similar_names": response.data.get("similar_names", []) if response.success else [],
                "error": response.error if not response.success else None,
                "response_time": response.response_time
            }
            
        except Exception as e:
            results[jurisdiction] = {
                "available": False,
                "error": str(e),
                "response_time": None
            }
    
    return APIResponse(
        success=True,
        data={
            "name": request.name,
            "entity_type": request.entity_type,
            "results": results,
            "summary": {
                "total_checked": len(request.jurisdictions),
                "available_in": [j for j, r in results.items() if r.get("available", False)],
                "unavailable_in": [j for j, r in results.items() if not r.get("available", False)],
                "errors": [j for j, r in results.items() if r.get("error")]
            }
        },
        message="Name availability check completed"
    )

@router.post("/name-reservation", response_model=APIResponse[Dict[str, Any]])
async def reserve_business_name(
    request: NameReservationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Reserve a business name in specified jurisdiction"""
    try:
        api = get_api_instance(request.jurisdiction)
        response = await api.reserve_name(
            request.name, 
            request.entity_type, 
            request.applicant_info
        )
        
        if response.success:
            return APIResponse(
                success=True,
                data=response.data,
                message=f"Name reservation successful in {request.jurisdiction}"
            )
        else:
            return APIResponse(
                success=False,
                error=response.error,
                message=f"Name reservation failed in {request.jurisdiction}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entity-formation", response_model=APIResponse[Dict[str, Any]])
async def submit_entity_formation(
    request: FormationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Submit entity formation documents to specified jurisdiction"""
    try:
        api = get_api_instance(request.jurisdiction)
        
        # Prepare formation data
        formation_data = {
            "name": request.name,
            "entity_type": request.entity_type,
            "registered_agent": request.registered_agent,
            "incorporators": request.incorporators,
            "directors": request.directors,
            "purpose": request.purpose,
            "authorized_shares": request.authorized_shares,
            "par_value": request.par_value,
            "expedited": request.expedited,
            **request.additional_options
        }
        
        response = await api.submit_formation_documents(formation_data)
        
        if response.success:
            return APIResponse(
                success=True,
                data=response.data,
                message=f"Formation documents submitted successfully to {request.jurisdiction}"
            )
        else:
            return APIResponse(
                success=False,
                error=response.error,
                message=f"Formation submission failed in {request.jurisdiction}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/formation-status/{jurisdiction}/{filing_id}", response_model=APIResponse[Dict[str, Any]])
async def get_formation_status(
    jurisdiction: str,
    filing_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get status of entity formation filing"""
    try:
        api = get_api_instance(jurisdiction)
        response = await api.get_formation_status(filing_id)
        
        if response.success:
            return APIResponse(
                success=True,
                data=response.data,
                message=f"Formation status retrieved from {jurisdiction}"
            )
        else:
            return APIResponse(
                success=False,
                error=response.error,
                message=f"Failed to retrieve formation status from {jurisdiction}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ein-application", response_model=APIResponse[Dict[str, Any]])
async def apply_for_ein(
    request: EINApplicationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Apply for Federal Employer Identification Number (EIN)"""
    try:
        irs_api = IRSAPI()
        
        # Prepare EIN application data
        business_data = {
            "name": request.name,
            "entity_type": request.entity_type,
            "responsible_party": request.responsible_party,
            "business_start_date": request.business_start_date,
            "principal_activity": request.principal_activity,
            "state_of_incorporation": request.state_of_incorporation,
            "mailing_address": request.mailing_address,
            "business_address": request.business_address or request.mailing_address
        }
        
        response = await irs_api.apply_for_ein(business_data)
        
        if response.success:
            return APIResponse(
                success=True,
                data=response.data,
                message="EIN application submitted successfully"
            )
        else:
            return APIResponse(
                success=False,
                error=response.error,
                message="EIN application failed"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ein-status/{application_id}", response_model=APIResponse[Dict[str, Any]])
async def get_ein_status(
    application_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get status of EIN application"""
    try:
        irs_api = IRSAPI()
        response = await irs_api.get_ein_status(application_id)
        
        if response.success:
            return APIResponse(
                success=True,
                data=response.data,
                message="EIN status retrieved successfully"
            )
        else:
            return APIResponse(
                success=False,
                error=response.error,
                message="Failed to retrieve EIN status"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fee-calculator/{jurisdiction}", response_model=APIResponse[Dict[str, Any]])
async def calculate_formation_fees(
    jurisdiction: str,
    entity_type: str = Query(..., description="Type of entity"),
    expedited: bool = Query(default=False, description="Expedited processing"),
    same_day: bool = Query(default=False, description="Same day processing"),
    certificate_copies: int = Query(default=1, description="Number of certificate copies"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Calculate formation fees for specified jurisdiction"""
    try:
        api = get_api_instance(jurisdiction)
        
        options = {
            "expedited": expedited,
            "same_day": same_day,
            "certificate_copies": certificate_copies
        }
        
        response = await api.calculate_fees(entity_type, options)
        
        if response.success:
            return APIResponse(
                success=True,
                data=response.data,
                message=f"Fee calculation completed for {jurisdiction}"
            )
        else:
            return APIResponse(
                success=False,
                error=response.error,
                message=f"Fee calculation failed for {jurisdiction}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/supported-jurisdictions", response_model=APIResponse[List[Dict[str, Any]]])
async def get_supported_jurisdictions(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get list of supported jurisdictions and their capabilities"""
    
    jurisdictions = [
        {
            "code": "delaware",
            "name": "Delaware",
            "country": "United States",
            "supported_entities": ["corporation", "llc", "lp", "llp"],
            "features": ["name_check", "name_reservation", "formation", "status_check"],
            "typical_processing_time": "3-5 business days",
            "expedited_available": True
        },
        {
            "code": "california", 
            "name": "California",
            "country": "United States",
            "supported_entities": ["corporation", "llc", "lp", "llp"],
            "features": ["name_check", "name_reservation", "formation", "status_check"],
            "typical_processing_time": "10-15 business days",
            "expedited_available": True,
            "special_requirements": ["Publication required for LLCs and LPs"]
        },
        {
            "code": "uk",
            "name": "United Kingdom", 
            "country": "United Kingdom",
            "supported_entities": ["ltd", "plc", "llp", "limited_partnership"],
            "features": ["name_check", "formation", "status_check", "officer_search"],
            "typical_processing_time": "24 hours",
            "expedited_available": True,
            "special_requirements": ["Companies House registration required"]
        },
        {
            "code": "wyoming",
            "name": "Wyoming",
            "country": "United States", 
            "supported_entities": ["corporation", "llc", "lp", "llp", "nonprofit"],
            "features": ["name_check", "name_reservation", "formation", "status_check"],
            "typical_processing_time": "3-5 business days",
            "expedited_available": True
        },
        {
            "code": "new_york",
            "name": "New York",
            "country": "United States",
            "supported_entities": ["corporation", "llc", "lp", "llp", "nonprofit"], 
            "features": ["name_check", "name_reservation", "formation", "status_check"],
            "typical_processing_time": "7-10 business days",
            "expedited_available": True,
            "special_requirements": ["Publication required for LLCs and LPs", "Biennial statement filing required"]
        },
        {
            "code": "irs",
            "name": "Internal Revenue Service",
            "country": "United States",
            "supported_entities": ["all"],
            "features": ["ein_application", "ein_status", "ein_verification"],
            "typical_processing_time": "4-6 weeks",
            "expedited_available": False,
            "cost": "Free"
        }
    ]
    
    return APIResponse(
        success=True,
        data=jurisdictions,
        message="Supported jurisdictions retrieved"
    )

@router.get("/entity-details/{jurisdiction}/{entity_id}", response_model=APIResponse[Dict[str, Any]])
async def get_entity_details(
    jurisdiction: str,
    entity_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed information about an existing entity"""
    try:
        api = get_api_instance(jurisdiction)
        
        # Different APIs have different methods for entity lookup
        if hasattr(api, 'get_entity_details'):
            response = await api.get_entity_details(entity_id)
        elif hasattr(api, 'get_company_details'):
            response = await api.get_company_details(entity_id)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Entity details lookup not supported for {jurisdiction}"
            )
        
        if response.success:
            return APIResponse(
                success=True,
                data=response.data,
                message=f"Entity details retrieved from {jurisdiction}"
            )
        else:
            return APIResponse(
                success=False,
                error=response.error,
                message=f"Failed to retrieve entity details from {jurisdiction}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
