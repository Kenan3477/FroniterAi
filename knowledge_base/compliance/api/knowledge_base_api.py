"""
Knowledge Base API for Compliance Module

Comprehensive REST API providing programmatic access to the compliance 
knowledge base with search, version control, and content management capabilities.
"""

from fastapi import FastAPI, HTTPException, Depends, Query, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json

# Import our knowledge base modules
from .search_system import (
    ComplianceSearchEngine, SearchResult, SearchFilters, 
    ContentType, SearchScope
)
from .version_control import (
    VersionControlSystem, DocumentVersion, ChangeLog, 
    VersionInfo, ChangeType, UpdateSource, VersionStatus
)


# API Models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    content_types: Optional[List[str]] = Field(None, description="Filter by content types")
    jurisdictions: Optional[List[str]] = Field(None, description="Filter by jurisdictions")
    industries: Optional[List[str]] = Field(None, description="Filter by industries")
    regulations: Optional[List[str]] = Field(None, description="Filter by regulations")
    scope: str = Field("all", description="Search scope: all, title, content, metadata, tags")
    limit: int = Field(50, description="Maximum number of results")
    min_relevance: float = Field(0.0, description="Minimum relevance score")


class SearchResponse(BaseModel):
    success: bool
    query: str
    total_results: int
    search_time: float
    results: List[Dict[str, Any]]
    facets: Optional[Dict[str, List[str]]] = None


class DocumentCreateRequest(BaseModel):
    document_id: str = Field(..., description="Unique document identifier")
    title: str = Field(..., description="Document title")
    document_type: str = Field(..., description="Type of document")
    content: str = Field(..., description="Document content")
    file_path: str = Field(..., description="File path for storage")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Document metadata")


class DocumentUpdateRequest(BaseModel):
    content: str = Field(..., description="Updated document content")
    change_summary: str = Field(..., description="Summary of changes made")
    update_source: str = Field(..., description="Source of the update")
    regulatory_reference: Optional[str] = Field(None, description="Reference to regulatory source")
    impact_assessment: Optional[str] = Field(None, description="Assessment of impact")
    effective_date: Optional[datetime] = Field(None, description="When changes become effective")


class RegulatoryUpdateRequest(BaseModel):
    regulation_name: str = Field(..., description="Name of the regulation")
    jurisdiction: str = Field(..., description="Jurisdiction of the regulation")
    update_summary: str = Field(..., description="Summary of the update")
    update_details: str = Field(..., description="Detailed description of changes")
    source_url: Optional[str] = Field(None, description="URL to official source")
    effective_date: Optional[datetime] = Field(None, description="When update becomes effective")
    impact_level: str = Field("medium", description="Impact level: low, medium, high, critical")


class ApprovalRequest(BaseModel):
    comments: Optional[str] = Field(None, description="Approval comments")


# Initialize FastAPI app
app = FastAPI(
    title="Compliance Knowledge Base API",
    description="Comprehensive API for compliance knowledge base management",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize knowledge base systems
knowledge_base_path = "./knowledge_base/compliance"
search_engine = ComplianceSearchEngine(knowledge_base_path)
version_control = VersionControlSystem(knowledge_base_path)


# Dependency for authentication
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract user information from JWT token"""
    # In production, implement proper JWT validation
    return {"username": "api_user", "roles": ["compliance_officer"]}


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.1.0"
    }


# Search endpoints
@app.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    request: SearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Search the compliance knowledge base
    """
    start_time = datetime.now()
    
    try:
        # Build search filters
        filters = SearchFilters()
        
        if request.content_types:
            filters.content_types = [ContentType(ct) for ct in request.content_types 
                                   if ct in [ct.value for ct in ContentType]]
        
        if request.jurisdictions:
            filters.jurisdictions = request.jurisdictions
        
        if request.industries:
            filters.industries = request.industries
        
        if request.regulations:
            filters.regulations = request.regulations
        
        filters.min_relevance = request.min_relevance
        
        # Perform search
        scope = SearchScope(request.scope) if request.scope in [s.value for s in SearchScope] else SearchScope.ALL
        results = search_engine.search(request.query, filters, scope, request.limit)
        
        # Calculate search time
        search_time = (datetime.now() - start_time).total_seconds()
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": result.id,
                "title": result.title,
                "content_type": result.content_type.value,
                "summary": result.summary,
                "file_path": result.file_path,
                "relevance_score": round(result.relevance_score, 3),
                "jurisdiction": result.jurisdiction,
                "industry": result.industry,
                "regulation_tags": result.regulation_tags,
                "last_updated": result.last_updated.isoformat() if result.last_updated else None,
                "version": result.version,
                "highlight_snippet": result.highlight_snippet
            })
        
        # Get facets for filtering
        facets = search_engine.get_faceted_search_options()
        
        return SearchResponse(
            success=True,
            query=request.query,
            total_results=len(results),
            search_time=search_time,
            results=formatted_results,
            facets=facets
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/search/suggestions")
async def get_search_suggestions(
    q: str = Query(..., description="Partial query for suggestions"),
    limit: int = Query(10, description="Maximum number of suggestions"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get search suggestions based on partial query
    """
    try:
        suggestions = search_engine.get_search_suggestions(q, limit)
        
        return {
            "success": True,
            "query": q,
            "suggestions": suggestions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")


@app.get("/search/facets")
async def get_search_facets(current_user: dict = Depends(get_current_user)):
    """
    Get available facets for search filtering
    """
    try:
        facets = search_engine.get_faceted_search_options()
        
        return {
            "success": True,
            "facets": facets
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get facets: {str(e)}")


# Document management endpoints
@app.post("/documents")
async def create_document(
    request: DocumentCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create new document in knowledge base
    """
    try:
        doc_version = version_control.create_document(
            document_id=request.document_id,
            title=request.title,
            document_type=request.document_type,
            content=request.content,
            file_path=request.file_path,
            created_by=current_user["username"],
            metadata=request.metadata or {}
        )
        
        # Index document for search
        content_type = ContentType.REGULATION if request.document_type == "regulation" else ContentType.POLICY
        search_engine.index_content(
            content_id=request.document_id,
            title=request.title,
            content_type=content_type,
            file_path=request.file_path,
            content=request.content,
            metadata=request.metadata or {}
        )
        
        return {
            "success": True,
            "message": "Document created successfully",
            "document_id": request.document_id,
            "version": doc_version.version_info.version
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")


@app.put("/documents/{document_id}")
async def update_document(
    document_id: str = Path(..., description="Document ID"),
    request: DocumentUpdateRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Update existing document
    """
    try:
        update_source = UpdateSource(request.update_source) if request.update_source in [us.value for us in UpdateSource] else UpdateSource.INTERNAL_REVIEW
        
        doc_version = version_control.update_document(
            document_id=document_id,
            new_content=request.content,
            updated_by=current_user["username"],
            change_summary=request.change_summary,
            update_source=update_source,
            regulatory_reference=request.regulatory_reference,
            impact_assessment=request.impact_assessment,
            effective_date=request.effective_date
        )
        
        return {
            "success": True,
            "message": "Document updated successfully",
            "document_id": document_id,
            "new_version": doc_version.version_info.version
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")


@app.get("/documents/{document_id}")
async def get_document(
    document_id: str = Path(..., description="Document ID"),
    version: Optional[str] = Query(None, description="Specific version to retrieve"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get document by ID and optional version
    """
    try:
        if version:
            # Get specific version
            history = version_control.get_document_history(document_id)
            doc_version = next((v for v in history if v.version_info.version == version), None)
            
            if not doc_version:
                raise HTTPException(status_code=404, detail="Document version not found")
        else:
            # Get current version
            doc_version = version_control.get_current_version(document_id)
            
            if not doc_version:
                raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "success": True,
            "document": {
                "id": doc_version.document_id,
                "version": doc_version.version_info.version,
                "status": doc_version.version_info.status.value,
                "title": doc_version.metadata.get("title", ""),
                "content": doc_version.content,
                "file_path": doc_version.file_path,
                "metadata": doc_version.metadata,
                "created_date": doc_version.version_info.created_date.isoformat(),
                "created_by": doc_version.version_info.created_by,
                "change_summary": doc_version.version_info.change_summary
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")


@app.get("/documents/{document_id}/history")
async def get_document_history(
    document_id: str = Path(..., description="Document ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get complete version history for document
    """
    try:
        history = version_control.get_document_history(document_id)
        
        if not history:
            raise HTTPException(status_code=404, detail="Document not found")
        
        formatted_history = []
        for doc_version in history:
            formatted_history.append({
                "version": doc_version.version_info.version,
                "status": doc_version.version_info.status.value,
                "created_date": doc_version.version_info.created_date.isoformat(),
                "created_by": doc_version.version_info.created_by,
                "change_summary": doc_version.version_info.change_summary,
                "change_type": doc_version.version_info.change_type.value,
                "approved_date": doc_version.version_info.approved_date.isoformat() if doc_version.version_info.approved_date else None,
                "approved_by": doc_version.version_info.approved_by,
                "effective_date": doc_version.version_info.effective_date.isoformat() if doc_version.version_info.effective_date else None,
                "parent_version": doc_version.parent_version
            })
        
        return {
            "success": True,
            "document_id": document_id,
            "history": formatted_history
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document history: {str(e)}")


@app.post("/documents/{document_id}/versions/{version}/approve")
async def approve_document_version(
    document_id: str = Path(..., description="Document ID"),
    version: str = Path(..., description="Version to approve"),
    request: ApprovalRequest = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Approve a specific document version
    """
    try:
        success = version_control.approve_version(
            document_id=document_id,
            version=version,
            approved_by=current_user["username"],
            comments=request.comments or ""
        )
        
        status_message = "Version approved and published" if success else "Version approved, pending additional approvals"
        
        return {
            "success": True,
            "message": status_message,
            "document_id": document_id,
            "version": version,
            "fully_approved": success
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve version: {str(e)}")


# Regulatory update endpoints
@app.post("/regulatory-updates")
async def create_regulatory_update(
    request: RegulatoryUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Track new regulatory update
    """
    try:
        update_id = version_control.track_regulatory_update(
            regulation_name=request.regulation_name,
            jurisdiction=request.jurisdiction,
            update_summary=request.update_summary,
            update_details=request.update_details,
            source_url=request.source_url,
            effective_date=request.effective_date,
            impact_level=request.impact_level
        )
        
        return {
            "success": True,
            "message": "Regulatory update tracked successfully",
            "update_id": update_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track regulatory update: {str(e)}")


@app.get("/regulatory-updates")
async def get_regulatory_updates(
    days: int = Query(30, description="Number of days to look back"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get regulatory updates for specified period
    """
    try:
        updates = version_control.get_regulatory_updates(
            days=days,
            jurisdiction=jurisdiction,
            status=status
        )
        
        return {
            "success": True,
            "period_days": days,
            "updates": updates
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get regulatory updates: {str(e)}")


# Analytics and reporting endpoints
@app.get("/analytics/search")
async def get_search_analytics(
    days: int = Query(30, description="Number of days for analytics"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get search analytics
    """
    try:
        analytics = search_engine.get_search_analytics(days)
        
        return {
            "success": True,
            "analytics": analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get search analytics: {str(e)}")


@app.get("/reports/compliance")
async def get_compliance_report(
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    period_days: int = Query(30, description="Report period in days"),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate comprehensive compliance report
    """
    try:
        report = version_control.generate_compliance_report(
            document_id=document_id,
            period_days=period_days
        )
        
        return {
            "success": True,
            "report": report
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate compliance report: {str(e)}")


@app.get("/timeline/compliance")
async def get_compliance_timeline(
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    regulation: Optional[str] = Query(None, description="Filter by regulation"),
    days: int = Query(90, description="Number of days to look ahead"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get compliance timeline showing upcoming deadlines and changes
    """
    try:
        timeline = version_control.get_compliance_timeline(
            document_id=document_id,
            regulation=regulation,
            days=days
        )
        
        # Format dates for JSON serialization
        for item in timeline:
            item['date'] = item['date'].isoformat()
        
        return {
            "success": True,
            "timeline": timeline
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get compliance timeline: {str(e)}")


# Utility endpoints
@app.get("/regulations")
async def list_regulations(
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    current_user: dict = Depends(get_current_user)
):
    """
    List available regulations
    """
    try:
        # This would query the actual regulations database
        # For now, return a sample list
        regulations = [
            {
                "id": "GDPR_2016_679",
                "name": "General Data Protection Regulation",
                "jurisdiction": "EU",
                "effective_date": "2018-05-25",
                "status": "active"
            },
            {
                "id": "CCPA_2018",
                "name": "California Consumer Privacy Act",
                "jurisdiction": "USA_CA",
                "effective_date": "2020-01-01",
                "status": "active"
            }
        ]
        
        # Apply filters
        if jurisdiction:
            regulations = [r for r in regulations if r["jurisdiction"] == jurisdiction]
        
        return {
            "success": True,
            "regulations": regulations
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list regulations: {str(e)}")


@app.get("/jurisdictions")
async def list_jurisdictions(current_user: dict = Depends(get_current_user)):
    """
    List available jurisdictions
    """
    try:
        jurisdictions = [
            {"code": "EU", "name": "European Union"},
            {"code": "USA", "name": "United States"},
            {"code": "CA", "name": "Canada"},
            {"code": "UK", "name": "United Kingdom"},
            {"code": "AU", "name": "Australia"},
            {"code": "SG", "name": "Singapore"}
        ]
        
        return {
            "success": True,
            "jurisdictions": jurisdictions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list jurisdictions: {str(e)}")


@app.get("/industries")
async def list_industries(current_user: dict = Depends(get_current_user)):
    """
    List available industries
    """
    try:
        industries = [
            {"code": "financial_services", "name": "Financial Services"},
            {"code": "healthcare", "name": "Healthcare"},
            {"code": "technology", "name": "Technology"},
            {"code": "manufacturing", "name": "Manufacturing"},
            {"code": "retail", "name": "Retail"},
            {"code": "energy", "name": "Energy & Utilities"}
        ]
        
        return {
            "success": True,
            "industries": industries
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list industries: {str(e)}")


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "success": False,
        "error": {
            "code": exc.status_code,
            "message": exc.detail
        }
    }


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return {
        "success": False,
        "error": {
            "code": 500,
            "message": "Internal server error"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
