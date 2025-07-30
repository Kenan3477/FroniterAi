"""Policy Generator Router"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from ..middleware.auth import get_current_user
from ..utils.response_models import APIResponse

router = APIRouter()

@router.post("/policy-generator", response_model=APIResponse[Dict[str, Any]])
async def generate_policy(policy_type: str, organization: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    result = {"policy_type": policy_type, "organization": organization, "generated_policy": "Sample policy content"}
    return APIResponse(success=True, data=result, message="Policy generated successfully")
