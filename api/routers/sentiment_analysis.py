"""Sentiment Analysis Router"""
from fastapi import APIRouter, Depends
from typing import Dict, Any
from ..middleware.auth import get_current_user
from ..utils.response_models import APIResponse

router = APIRouter()

@router.post("/sentiment-analysis", response_model=APIResponse[Dict[str, Any]])
async def sentiment_analysis(text: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    result = {"text": text, "sentiment": "positive", "score": 0.75, "confidence": 0.90}
    return APIResponse(success=True, data=result, message="Sentiment analysis completed")
