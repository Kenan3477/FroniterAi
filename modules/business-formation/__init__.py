"""
Business Formation Module Integration
Main module interface that integrates with Frontier's orchestration system
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import uuid

# Import all module components
from formation_engine import (
    FormationRequest, BusinessDetails, Person, Address, EntityType, Jurisdiction,
    FormationStage, DynamicQuestionnaire, DocumentGenerator, JurisdictionManager
)
from government_apis import APIManager, FilingResponse, NameAvailabilityResult, EINApplication
from compliance_calendar import ComplianceCalendarGenerator, ComplianceTracker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BusinessFormationModule:
    """
    Main Business Formation Module
    Provides comprehensive business entity formation services
    """
    
    def __init__(self):
        self.module_id = "business_formation"
        self.version = "1.0.0"
        self.name = "Business Formation Expert"
        self.description = "Comprehensive business entity formation with jurisdiction-specific workflows"
        
        # Initialize core components
        self.questionnaire_generator = DynamicQuestionnaire()
        self.document_generator = DocumentGenerator()
        self.jurisdiction_manager = JurisdictionManager()
        self.api_manager = APIManager()
        self.compliance_generator = ComplianceCalendarGenerator()
        self.compliance_tracker = ComplianceTracker()
        self.ein_application = EINApplication()
        
        # Active formation requests
        self.active_formations: Dict[str, FormationRequest] = {}
        
        # Performance metrics
        self.metrics = {
            "formations_started": 0,
            "formations_completed": 0,
            "average_completion_time": 0.0,
            "success_rate": 0.0,
            "questionnaires_generated": 0,
            "documents_generated": 0,
            "name_checks_performed": 0,
            "api_calls_made": 0
        }
    
    async def process_query(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Main query processing interface for the orchestration system
        
        Args:
            query: Natural language query about business formation
            context: Additional context including user information, session data
            
        Returns:
            Structured response with formation guidance, forms, or actions
        """
        
        query_lower = query.lower()
        context = context or {}
        
        # Route query to appropriate handler
        if any(keyword in query_lower for keyword in ["start", "form", "create", "incorporate", "establish"]):
            return await self._handle_formation_start(query, context)
        
        elif any(keyword in query_lower for keyword in ["questionnaire", "questions", "form"]):
            return await self._handle_questionnaire_request(query, context)
        
        elif any(keyword in query_lower for keyword in ["name", "available", "check", "reserve"]):
            return await self._handle_name_services(query, context)
        
        elif any(keyword in query_lower for keyword in ["documents", "papers", "filing", "generate"]):
            return await self._handle_document_services(query, context)
        
        elif any(keyword in query_lower for keyword in ["compliance", "requirements", "deadline", "calendar"]):
            return await self._handle_compliance_services(query, context)
        
        elif any(keyword in query_lower for keyword in ["status", "progress", "tracking"]):
            return await self._handle_status_inquiry(query, context)
        
        elif any(keyword in query_lower for keyword in ["fees", "cost", "pricing", "timeline"]):
            return await self._handle_information_request(query, context)
        
        else:
            return await self._handle_general_inquiry(query, context)
    
    async def _handle_formation_start(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle requests to start business formation process"""
        
        self.metrics["formations_started"] += 1
        
        # Extract entity type and jurisdiction if mentioned
        entity_type = self._extract_entity_type(query)
        jurisdiction = self._extract_jurisdiction(query)
        
        response = {
            "action": "start_formation",
            "message": "I'll help you form your business entity. Let's start by gathering some basic information.",
            "next_steps": [
                "Complete our dynamic questionnaire",
                "Choose your business structure and jurisdiction", 
                "Check name availability",
                "Prepare formation documents",
                "Submit government filings",
                "Set up compliance calendar"
            ],
            "estimated_timeline": "3-15 business days depending on jurisdiction and entity type",
            "questionnaire_available": True
        }
        
        # If entity type or jurisdiction specified, provide specific guidance
        if entity_type:
            response["suggested_entity_type"] = entity_type.value
            response["entity_benefits"] = self._get_entity_benefits(entity_type)
        
        if jurisdiction:
            response["suggested_jurisdiction"] = jurisdiction.value
            requirements = self.jurisdiction_manager.get_requirements(jurisdiction)
            if requirements:
                response["jurisdiction_info"] = {
                    "supported_entities": [e.value for e in requirements.entity_types_supported],
                    "processing_time": requirements.processing_time,
                    "filing_fees": requirements.filing_fee
                }
        
        # Generate initial questionnaire
        if not entity_type and not jurisdiction:
            questionnaire = self.questionnaire_generator.generate_questionnaire(
                jurisdiction or Jurisdiction.DELAWARE,
                entity_type
            )
            response["questionnaire"] = questionnaire
            self.metrics["questionnaires_generated"] += 1
        
        return response
    
    async def _handle_questionnaire_request(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle questionnaire generation and submission"""
        
        # Check if this is a questionnaire response submission
        if "responses" in context:
            return await self._process_questionnaire_responses(context["responses"], context)
        
        # Generate questionnaire based on current context
        entity_type = context.get("entity_type")
        jurisdiction = context.get("jurisdiction")
        current_responses = context.get("current_responses", {})
        
        if isinstance(entity_type, str):
            entity_type = EntityType(entity_type)
        if isinstance(jurisdiction, str):
            jurisdiction = Jurisdiction(jurisdiction)
        
        questionnaire = self.questionnaire_generator.generate_questionnaire(
            jurisdiction or Jurisdiction.DELAWARE,
            entity_type,
            current_responses
        )
        
        self.metrics["questionnaires_generated"] += 1
        
        return {
            "action": "provide_questionnaire",
            "message": "Here's your customized business formation questionnaire:",
            "questionnaire": questionnaire,
            "progress_info": {
                "completion_percentage": len(current_responses) * 10,  # Rough estimate
                "estimated_time_remaining": f"{questionnaire.get('estimated_time', 15)} minutes"
            }
        }
    
    async def _handle_name_services(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle business name availability checks and reservations"""
        
        business_name = self._extract_business_name(query)
        entity_type = self._extract_entity_type(query) or EntityType.LLC
        jurisdiction = self._extract_jurisdiction(query) or Jurisdiction.DELAWARE
        
        if not business_name:
            return {
                "action": "request_name",
                "message": "Please provide the business name you'd like to check.",
                "name_requirements": self._get_name_requirements(jurisdiction, entity_type)
            }
        
        # Check name availability
        try:
            self.metrics["name_checks_performed"] += 1
            self.metrics["api_calls_made"] += 1
            
            availability_result = await self.api_manager.check_name_availability(
                business_name, entity_type, jurisdiction
            )
            
            response = {
                "action": "name_availability_result",
                "business_name": business_name,
                "jurisdiction": jurisdiction.value,
                "entity_type": entity_type.value,
                "available": availability_result.available,
                "similar_names": availability_result.similar_names,
                "restrictions": availability_result.restrictions,
                "suggestions": availability_result.suggestions
            }
            
            if availability_result.available:
                response["message"] = f"Great news! '{business_name}' is available in {jurisdiction.name.replace('_', ' ').title()}."
                response["next_steps"] = [
                    "Reserve the name (optional)",
                    "Continue with formation process"
                ]
                
                if availability_result.reservation_available:
                    response["reservation_info"] = {
                        "fee": availability_result.reservation_fee,
                        "period_days": availability_result.reservation_period_days,
                        "available": True
                    }
            else:
                response["message"] = f"'{business_name}' is not available. Here are some alternatives:"
                if availability_result.suggestions:
                    response["alternative_names"] = availability_result.suggestions
            
            return response
            
        except Exception as e:
            logger.error(f"Name availability check failed: {e}")
            return {
                "action": "name_check_error",
                "message": "Unable to check name availability at this time. Please try again later.",
                "error": str(e),
                "manual_check_info": {
                    "website": f"Search manually at the {jurisdiction.name.replace('_', ' ').title()} Secretary of State website",
                    "phone": "Contact the state filing office directly"
                }
            }
    
    async def _handle_document_services(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle document generation and filing services"""
        
        formation_id = context.get("formation_id")
        if not formation_id or formation_id not in self.active_formations:
            return {
                "action": "request_formation_info",
                "message": "To generate documents, I need your complete formation information. Please start the formation process first."
            }
        
        formation_request = self.active_formations[formation_id]
        
        try:
            # Generate formation documents
            documents = await self.document_generator.generate_formation_documents(formation_request)
            
            self.metrics["documents_generated"] += len(documents)
            
            # Update formation request with generated documents
            formation_request.documents = documents
            formation_request.stage = FormationStage.DOCUMENTATION_PREPARATION
            formation_request.updated_at = datetime.utcnow()
            
            response = {
                "action": "documents_generated",
                "message": "Your formation documents have been generated successfully.",
                "documents": list(documents.keys()),
                "document_details": {}
            }
            
            # Provide document details
            for doc_name, doc_data in documents.items():
                if isinstance(doc_data, dict) and "error" not in doc_data:
                    response["document_details"][doc_name] = {
                        "format": doc_data.get("format", "pdf"),
                        "generated_at": doc_data.get("generated_at"),
                        "ready_for_filing": True
                    }
                else:
                    response["document_details"][doc_name] = {
                        "status": "error",
                        "message": doc_data.get("error", "Generation failed")
                    }
            
            response["next_steps"] = [
                "Review generated documents",
                "Submit to government filing office",
                "Apply for EIN (if requested)",
                "Set up compliance calendar"
            ]
            
            return response
            
        except Exception as e:
            logger.error(f"Document generation failed: {e}")
            return {
                "action": "document_generation_error",
                "message": "Unable to generate documents at this time.",
                "error": str(e),
                "suggestion": "Please verify your formation information is complete and try again."
            }
    
    async def _handle_compliance_services(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle compliance calendar and ongoing requirements"""
        
        formation_id = context.get("formation_id")
        if formation_id and formation_id in self.active_formations:
            formation_request = self.active_formations[formation_id]
            
            # Generate compliance calendar
            compliance_calendar = self.compliance_generator.generate_compliance_calendar(formation_request)
            self.compliance_tracker.add_calendar(compliance_calendar)
            
            # Get upcoming compliance items
            upcoming = self.compliance_tracker.get_upcoming_compliance(formation_id, days_ahead=90)
            summary = self.compliance_tracker.get_compliance_summary(formation_id)
            
            return {
                "action": "compliance_calendar",
                "message": "Here's your complete compliance calendar and upcoming requirements:",
                "compliance_summary": summary,
                "upcoming_items": [
                    {
                        "title": item.title,
                        "due_date": item.due_date.isoformat() if item.due_date else None,
                        "priority": item.priority.value,
                        "estimated_cost": item.estimated_cost,
                        "description": item.description
                    }
                    for item in upcoming[:10]  # First 10 items
                ],
                "total_estimated_annual_cost": summary.get("total_estimated_cost", 0),
                "calendar_export_available": True
            }
        
        else:
            # Provide general compliance information
            return {
                "action": "compliance_information",
                "message": "Business compliance requirements vary by entity type and jurisdiction. Here's general guidance:",
                "common_requirements": [
                    "Annual state filings",
                    "Franchise tax payments", 
                    "Federal tax returns",
                    "Registered agent maintenance",
                    "Corporate record keeping"
                ],
                "suggestion": "Complete your business formation to get a personalized compliance calendar."
            }
    
    async def _handle_status_inquiry(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle formation status and progress inquiries"""
        
        formation_id = context.get("formation_id")
        if not formation_id or formation_id not in self.active_formations:
            return {
                "action": "no_active_formation",
                "message": "No active formation found. Would you like to start a new business formation?"
            }
        
        formation_request = self.active_formations[formation_id]
        
        # Calculate progress percentage
        stage_progress = {
            FormationStage.INITIAL_CONSULTATION: 10,
            FormationStage.INFORMATION_GATHERING: 25,
            FormationStage.NAME_RESERVATION: 40,
            FormationStage.DOCUMENTATION_PREPARATION: 60,
            FormationStage.GOVERNMENT_FILING: 80,
            FormationStage.EIN_APPLICATION: 90,
            FormationStage.COMPLIANCE_SETUP: 95,
            FormationStage.COMPLETION: 100
        }
        
        progress = stage_progress.get(formation_request.stage, 0)
        
        return {
            "action": "formation_status",
            "formation_id": formation_id,
            "business_name": formation_request.business_details.proposed_name,
            "entity_type": formation_request.business_details.entity_type.value,
            "jurisdiction": formation_request.business_details.jurisdiction.value,
            "current_stage": formation_request.stage.value,
            "progress_percentage": progress,
            "created_at": formation_request.created_at.isoformat(),
            "updated_at": formation_request.updated_at.isoformat(),
            "estimated_completion": formation_request.estimated_completion.isoformat() if formation_request.estimated_completion else None,
            "documents_generated": len(formation_request.documents),
            "next_steps": self._get_next_steps(formation_request.stage)
        }
    
    async def _handle_information_request(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle requests for fees, timelines, and general information"""
        
        entity_type = self._extract_entity_type(query)
        jurisdiction = self._extract_jurisdiction(query)
        
        if entity_type and jurisdiction:
            # Provide specific information
            fees = self.jurisdiction_manager.calculate_fees(jurisdiction, entity_type)
            timeline = self.jurisdiction_manager.estimate_timeline(jurisdiction, entity_type)
            
            return {
                "action": "formation_information",
                "entity_type": entity_type.value,
                "jurisdiction": jurisdiction.value,
                "fees": fees,
                "timeline": timeline,
                "requirements": self._get_formation_requirements(jurisdiction, entity_type)
            }
        
        else:
            # Provide general information
            return {
                "action": "general_information",
                "message": "Business formation costs and timelines vary by entity type and jurisdiction.",
                "typical_ranges": {
                    "state_filing_fees": "$50 - $500",
                    "processing_time": "1 - 30 business days",
                    "total_cost_estimate": "$200 - $2,000 including professional services"
                },
                "popular_jurisdictions": {
                    "Delaware": "Corporate-friendly laws, fast processing",
                    "Nevada": "Privacy protection, no state income tax",
                    "Wyoming": "Low fees, minimal requirements"
                },
                "suggestion": "Specify your entity type and preferred jurisdiction for detailed information."
            }
    
    async def _handle_general_inquiry(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle general business formation inquiries"""
        
        return {
            "action": "general_guidance",
            "message": "I'm here to help with all aspects of business formation. I can assist with:",
            "services": [
                "Entity type selection (LLC, Corporation, Partnership, etc.)",
                "Jurisdiction selection and requirements",
                "Business name availability and reservation",
                "Formation document preparation",
                "Government filing submission",
                "EIN application assistance",
                "Ongoing compliance calendar setup",
                "Post-formation requirements guidance"
            ],
            "popular_questions": [
                "What entity type is best for my business?",
                "Should I incorporate in Delaware or my home state?",
                "How much does it cost to form an LLC?",
                "What ongoing compliance is required?",
                "How long does the formation process take?"
            ],
            "next_steps": "Ask me any specific question or say 'start business formation' to begin."
        }
    
    async def _process_questionnaire_responses(self, responses: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Process completed questionnaire responses"""
        
        try:
            # Validate responses
            validation_errors = []
            for question_id, response in responses.items():
                validation = self.questionnaire_generator.validate_response(
                    question_id, response, context
                )
                if not validation["valid"]:
                    validation_errors.extend(validation["errors"])
            
            if validation_errors:
                return {
                    "action": "validation_errors",
                    "message": "Please correct the following errors:",
                    "errors": validation_errors
                }
            
            # Create formation request from responses
            formation_request = self._create_formation_request_from_responses(responses)
            self.active_formations[formation_request.request_id] = formation_request
            
            # Calculate fees and timeline
            fees = self.jurisdiction_manager.calculate_fees(
                formation_request.business_details.jurisdiction,
                formation_request.business_details.entity_type,
                formation_request.business_details.expedited_processing
            )
            
            timeline = self.jurisdiction_manager.estimate_timeline(
                formation_request.business_details.jurisdiction,
                formation_request.business_details.entity_type,
                formation_request.business_details.expedited_processing
            )
            
            formation_request.estimated_completion = timeline.get("estimated_completion")
            formation_request.stage = FormationStage.INFORMATION_GATHERING
            
            return {
                "action": "formation_ready",
                "message": "Formation information collected successfully!",
                "formation_id": formation_request.request_id,
                "business_summary": {
                    "name": formation_request.business_details.proposed_name,
                    "entity_type": formation_request.business_details.entity_type.value,
                    "jurisdiction": formation_request.business_details.jurisdiction.value,
                    "purpose": formation_request.business_details.business_purpose
                },
                "cost_estimate": fees,
                "timeline_estimate": timeline,
                "next_steps": [
                    "Check business name availability",
                    "Generate formation documents", 
                    "Submit government filings",
                    "Apply for EIN",
                    "Set up compliance calendar"
                ],
                "ready_to_proceed": True
            }
            
        except Exception as e:
            logger.error(f"Error processing questionnaire responses: {e}")
            return {
                "action": "processing_error",
                "message": "Unable to process your responses. Please try again.",
                "error": str(e)
            }
    
    def _create_formation_request_from_responses(self, responses: Dict[str, Any]) -> FormationRequest:
        """Create FormationRequest object from questionnaire responses"""
        
        # Extract business details
        business_address = Address(
            street_line1=responses.get("street_address", ""),
            city=responses.get("city", ""),
            state_province=responses.get("state", ""),
            postal_code=responses.get("zip_code", ""),
            country=responses.get("country", "US")
        )
        
        business_details = BusinessDetails(
            proposed_name=responses.get("business_name", ""),
            entity_type=EntityType(responses.get("entity_type", "llc")),
            jurisdiction=Jurisdiction(responses.get("formation_state", "US_DE")),
            business_purpose=responses.get("business_purpose", ""),
            industry=responses.get("industry", ""),
            registered_address=business_address,
            authorized_shares=responses.get("authorized_shares"),
            par_value=responses.get("par_value"),
            expedited_processing=responses.get("expedited_processing", False),
            ein_application=responses.get("ein_application", True)
        )
        
        # Extract owner information
        owners = []
        if "owners" in responses:
            for owner_data in responses["owners"]:
                owner_address = Address(
                    street_line1=owner_data.get("street_address", ""),
                    city=owner_data.get("city", ""),
                    state_province=owner_data.get("state", ""),
                    postal_code=owner_data.get("zip_code", ""),
                    country=owner_data.get("country", "US")
                )
                
                owner = Person(
                    first_name=owner_data.get("first_name", ""),
                    last_name=owner_data.get("last_name", ""),
                    email=owner_data.get("email", ""),
                    phone=owner_data.get("phone", ""),
                    address=owner_address,
                    ownership_percentage=owner_data.get("ownership_percentage")
                )
                owners.append(owner)
        
        return FormationRequest(
            business_details=business_details,
            owners=owners
        )
    
    def _extract_entity_type(self, text: str) -> Optional[EntityType]:
        """Extract entity type from text"""
        text_lower = text.lower()
        
        if any(term in text_lower for term in ["llc", "limited liability company"]):
            return EntityType.LLC
        elif any(term in text_lower for term in ["corporation", "corp", "c-corp", "c corp"]):
            return EntityType.CORPORATION
        elif any(term in text_lower for term in ["s-corp", "s corp", "s corporation"]):
            return EntityType.S_CORPORATION
        elif any(term in text_lower for term in ["partnership", "general partnership"]):
            return EntityType.PARTNERSHIP
        elif any(term in text_lower for term in ["limited partnership", "lp"]):
            return EntityType.LIMITED_PARTNERSHIP
        elif any(term in text_lower for term in ["sole proprietorship", "sole prop"]):
            return EntityType.SOLE_PROPRIETORSHIP
        elif any(term in text_lower for term in ["nonprofit", "non-profit"]):
            return EntityType.NONPROFIT
        
        return None
    
    def _extract_jurisdiction(self, text: str) -> Optional[Jurisdiction]:
        """Extract jurisdiction from text"""
        text_lower = text.lower()
        
        # State mappings
        state_mappings = {
            "delaware": Jurisdiction.DELAWARE,
            "california": Jurisdiction.CALIFORNIA,
            "nevada": Jurisdiction.NEVADA,
            "new york": Jurisdiction.NEW_YORK,
            "florida": Jurisdiction.FLORIDA,
            "texas": Jurisdiction.TEXAS,
            "wyoming": Jurisdiction.WYOMING
        }
        
        for state_name, jurisdiction in state_mappings.items():
            if state_name in text_lower:
                return jurisdiction
        
        return None
    
    def _extract_business_name(self, text: str) -> Optional[str]:
        """Extract business name from text"""
        # Simple extraction - look for quoted strings or patterns
        import re
        
        # Look for quoted strings
        quoted_match = re.search(r'["\']([^"\']+)["\']', text)
        if quoted_match:
            return quoted_match.group(1)
        
        # Look for "name is" or "called" patterns
        name_patterns = [
            r'name is (.+?)(?:\.|$)',
            r'called (.+?)(?:\.|$)',
            r'business (.+?)(?:\.|$)'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _get_entity_benefits(self, entity_type: EntityType) -> List[str]:
        """Get benefits of specific entity type"""
        benefits = {
            EntityType.LLC: [
                "Limited liability protection",
                "Flexible tax options",
                "Simple management structure",
                "No requirement for board meetings"
            ],
            EntityType.CORPORATION: [
                "Strong liability protection",
                "Can raise capital through stock sales",
                "Perpetual existence",
                "Tax deductible employee benefits"
            ],
            EntityType.S_CORPORATION: [
                "Pass-through taxation",
                "Limited liability protection", 
                "Potential tax savings on self-employment",
                "Corporate structure benefits"
            ]
        }
        return benefits.get(entity_type, [])
    
    def _get_name_requirements(self, jurisdiction: Jurisdiction, entity_type: EntityType) -> Dict[str, Any]:
        """Get name requirements for jurisdiction and entity type"""
        requirements = self.jurisdiction_manager.get_requirements(jurisdiction)
        if not requirements:
            return {}
        
        return {
            "required_designators": requirements.required_designators.get(entity_type, []),
            "prohibited_words": requirements.prohibited_words,
            "uniqueness_required": requirements.name_requirements.get("uniqueness_required", True),
            "reservation_available": True,
            "reservation_fee": requirements.name_requirements.get("reservation_fee", 0),
            "reservation_period": requirements.name_requirements.get("reservation_period_days", 90)
        }
    
    def _get_formation_requirements(self, jurisdiction: Jurisdiction, entity_type: EntityType) -> Dict[str, Any]:
        """Get formation requirements summary"""
        requirements = self.jurisdiction_manager.get_requirements(jurisdiction)
        if not requirements:
            return {}
        
        return {
            "required_documents": requirements.required_documents.get(entity_type, []),
            "minimum_directors": requirements.min_directors.get(entity_type, 0),
            "minimum_shareholders": requirements.min_shareholders.get(entity_type, 0),
            "minimum_capital": requirements.min_capital.get(entity_type, 0),
            "registered_agent_required": requirements.special_requirements.get("registered_agent_required", True),
            "online_filing_available": requirements.online_filing_available
        }
    
    def _get_next_steps(self, current_stage: FormationStage) -> List[str]:
        """Get next steps based on current formation stage"""
        next_steps_map = {
            FormationStage.INITIAL_CONSULTATION: [
                "Complete the formation questionnaire",
                "Choose entity type and jurisdiction"
            ],
            FormationStage.INFORMATION_GATHERING: [
                "Check business name availability",
                "Review formation summary"
            ],
            FormationStage.NAME_RESERVATION: [
                "Generate formation documents",
                "Review and approve documents"
            ],
            FormationStage.DOCUMENTATION_PREPARATION: [
                "Submit documents to government",
                "Pay filing fees"
            ],
            FormationStage.GOVERNMENT_FILING: [
                "Apply for EIN with IRS",
                "Monitor filing status"
            ],
            FormationStage.EIN_APPLICATION: [
                "Set up compliance calendar",
                "Review ongoing requirements"
            ],
            FormationStage.COMPLIANCE_SETUP: [
                "Complete formation process",
                "Begin business operations"
            ],
            FormationStage.COMPLETION: [
                "Business formation complete!",
                "Refer to compliance calendar for ongoing requirements"
            ]
        }
        
        return next_steps_map.get(current_stage, ["Contact support for assistance"])
    
    def get_module_info(self) -> Dict[str, Any]:
        """Get module information for orchestration system"""
        return {
            "module_id": self.module_id,
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "capabilities": [
                "business_entity_formation",
                "jurisdiction_analysis", 
                "name_availability_checking",
                "document_generation",
                "government_filing_assistance",
                "compliance_calendar_creation",
                "ein_application_assistance"
            ],
            "supported_entities": [entity.value for entity in EntityType],
            "supported_jurisdictions": [jurisdiction.value for jurisdiction in Jurisdiction],
            "confidence_factors": {
                "formation_keywords": ["form", "incorporate", "llc", "corporation", "business", "entity"],
                "legal_keywords": ["legal", "documents", "filing", "compliance", "requirements"],
                "jurisdiction_keywords": ["state", "delaware", "nevada", "california"]
            },
            "performance_metrics": self.metrics,
            "api_integrations": len(self.api_manager.integrations),
            "status": "active"
        }

# Module instance for orchestration system
business_formation_module = BusinessFormationModule()

if __name__ == "__main__":
    # Example usage and testing
    async def test_module():
        module = BusinessFormationModule()
        
        # Test formation start
        response1 = await module.process_query("I want to start an LLC in Delaware")
        print("Formation Start Response:")
        print(json.dumps(response1, indent=2, default=str))
        
        # Test name availability
        response2 = await module.process_query("Check if Tech Innovations LLC is available")
        print("\nName Availability Response:")
        print(json.dumps(response2, indent=2, default=str))
        
        # Test information request
        response3 = await module.process_query("What are the fees for forming a corporation in California?")
        print("\nInformation Request Response:")
        print(json.dumps(response3, indent=2, default=str))
        
        # Module info
        info = module.get_module_info()
        print("\nModule Info:")
        print(json.dumps(info, indent=2, default=str))

    # Run test
    asyncio.run(test_module())
