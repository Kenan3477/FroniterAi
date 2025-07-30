"""Gold Analysis Router"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from ..middleware.auth import get_current_user
from ..utils.response_models import APIResponse

router = APIRouter()

@router.get("/gold-analysis", response_model=APIResponse[Dict[str, Any]])
async def gold_analysis(metric: str = "price", current_user: Dict[str, Any] = Depends(get_current_user)):
    result = {"metric": metric, "current_price": 2000.50, "trend": "bullish", "forecast": "continued growth"}
    return APIResponse(success=True, data=result, message="Gold analysis completed")
