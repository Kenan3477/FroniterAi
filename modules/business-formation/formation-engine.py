"""
Business Formation Module - Core Engine
Comprehensive business entity formation system with jurisdiction-specific workflows
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Set, Union
from pathlib import Path
import uuid
import re
from collections import defaultdict
import aiohttp
import jinja2
from pydantic import BaseModel, validator
import yaml

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EntityType(Enum):
    """Supported business entity types"""
    LLC = "llc"
    CORPORATION = "corporation"
    S_CORPORATION = "s_corporation"
    PARTNERSHIP = "partnership"
    LIMITED_PARTNERSHIP = "limited_partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    NONPROFIT = "nonprofit"
    BENEFIT_CORPORATION = "benefit_corporation"
    COOPERATIVE = "cooperative"
    PROFESSIONAL_CORPORATION = "professional_corporation"
    SERIES_LLC = "series_llc"

class Jurisdiction(Enum):
    """Supported jurisdictions for business formation"""
    # US States
    ALABAMA = "US_AL"
    ALASKA = "US_AK"
    ARIZONA = "US_AZ"
    ARKANSAS = "US_AR"
    CALIFORNIA = "US_CA"
    COLORADO = "US_CO"
    CONNECTICUT = "US_CT"
    DELAWARE = "US_DE"
    FLORIDA = "US_FL"
    GEORGIA = "US_GA"
    HAWAII = "US_HI"
    IDAHO = "US_ID"
    ILLINOIS = "US_IL"
    INDIANA = "US_IN"
    IOWA = "US_IA"
    KANSAS = "US_KS"
    KENTUCKY = "US_KY"
    LOUISIANA = "US_LA"
    MAINE = "US_ME"
    MARYLAND = "US_MD"
    MASSACHUSETTS = "US_MA"
    MICHIGAN = "US_MI"
    MINNESOTA = "US_MN"
    MISSISSIPPI = "US_MS"
    MISSOURI = "US_MO"
    MONTANA = "US_MT"
    NEBRASKA = "US_NE"
    NEVADA = "US_NV"
    NEW_HAMPSHIRE = "US_NH"
    NEW_JERSEY = "US_NJ"
    NEW_MEXICO = "US_NM"
    NEW_YORK = "US_NY"
    NORTH_CAROLINA = "US_NC"
    NORTH_DAKOTA = "US_ND"
    OHIO = "US_OH"
    OKLAHOMA = "US_OK"
    OREGON = "US_OR"
    PENNSYLVANIA = "US_PA"
    RHODE_ISLAND = "US_RI"
    SOUTH_CAROLINA = "US_SC"
    SOUTH_DAKOTA = "US_SD"
    TENNESSEE = "US_TN"
    TEXAS = "US_TX"
    UTAH = "US_UT"
    VERMONT = "US_VT"
    VIRGINIA = "US_VA"
    WASHINGTON = "US_WA"
    WEST_VIRGINIA = "US_WV"
    WISCONSIN = "US_WI"
    WYOMING = "US_WY"
    WASHINGTON_DC = "US_DC"
    
    # International
    CANADA = "CA"
    UNITED_KINGDOM = "UK"
    GERMANY = "DE"
    FRANCE = "FR"
    SINGAPORE = "SG"
    HONG_KONG = "HK"
    AUSTRALIA = "AU"
    NEW_ZEALAND = "NZ"

class FormationStage(Enum):
    """Stages of business formation process"""
    INITIAL_CONSULTATION = "initial_consultation"
    INFORMATION_GATHERING = "information_gathering"
    NAME_RESERVATION = "name_reservation"
    DOCUMENTATION_PREPARATION = "documentation_preparation"
    GOVERNMENT_FILING = "government_filing"
    EIN_APPLICATION = "ein_application"
    COMPLIANCE_SETUP = "compliance_setup"
    COMPLETION = "completion"

class ComplianceType(Enum):
    """Types of ongoing compliance requirements"""
    ANNUAL_REPORT = "annual_report"
    FRANCHISE_TAX = "franchise_tax"
    REGISTERED_AGENT = "registered_agent"
    BOARD_MEETING = "board_meeting"
    SHAREHOLDER_MEETING = "shareholder_meeting"
    TAX_FILING = "tax_filing"
    LICENSE_RENEWAL = "license_renewal"
    PERMITS_RENEWAL = "permits_renewal"
    OPERATING_AGREEMENT_REVIEW = "operating_agreement_review"

@dataclass
class Address:
    """Standardized address structure"""
    street_line1: str
    street_line2: Optional[str] = None
    city: str
    state_province: str
    postal_code: str
    country: str = "US"
    
    def __str__(self) -> str:
        lines = [self.street_line1]
        if self.street_line2:
            lines.append(self.street_line2)
        lines.append(f"{self.city}, {self.state_province} {self.postal_code}")
        if self.country != "US":
            lines.append(self.country)
        return "\n".join(lines)

@dataclass
class Person:
    """Person information for business formation"""
    first_name: str
    last_name: str
    email: str
    phone: str
    address: Address
    date_of_birth: Optional[datetime] = None
    ssn_last_four: Optional[str] = None
    title: Optional[str] = None
    ownership_percentage: Optional[float] = None
    
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

@dataclass
class BusinessDetails:
    """Core business information"""
    proposed_name: str
    entity_type: EntityType
    jurisdiction: Jurisdiction
    business_purpose: str
    industry: str
    registered_address: Address
    mailing_address: Optional[Address] = None
    
    # Financial details
    authorized_shares: Optional[int] = None
    par_value: Optional[float] = None
    initial_capital: Optional[float] = None
    fiscal_year_end: Optional[str] = None
    
    # Additional options
    expedited_processing: bool = False
    registered_agent_service: bool = True
    ein_application: bool = True
    operating_agreement: bool = True

@dataclass
class FormationRequest:
    """Complete business formation request"""
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    business_details: BusinessDetails
    owners: List[Person]
    directors: List[Person] = field(default_factory=list)
    officers: List[Person] = field(default_factory=list)
    registered_agent: Optional[Person] = None
    
    # Process tracking
    stage: FormationStage = FormationStage.INITIAL_CONSULTATION
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    estimated_completion: Optional[datetime] = None
    
    # Generated documents
    documents: Dict[str, Any] = field(default_factory=dict)
    government_filings: Dict[str, Any] = field(default_factory=dict)
    
    # Compliance calendar
    compliance_calendar: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class JurisdictionRequirements:
    """Legal requirements for a specific jurisdiction"""
    jurisdiction: Jurisdiction
    entity_types_supported: List[EntityType]
    
    # Filing requirements
    filing_fee: Dict[EntityType, float]
    expedited_fee: Dict[EntityType, float]
    processing_time: Dict[EntityType, int]  # days
    expedited_processing_time: Dict[EntityType, int]  # days
    
    # Name requirements
    name_requirements: Dict[str, Any]
    prohibited_words: List[str]
    required_designators: Dict[EntityType, List[str]]
    
    # Minimum requirements
    min_directors: Dict[EntityType, int]
    min_shareholders: Dict[EntityType, int]
    min_capital: Dict[EntityType, float]
    
    # Required documents
    required_documents: Dict[EntityType, List[str]]
    
    # Ongoing compliance
    annual_report_due: Dict[EntityType, str]  # date pattern
    franchise_tax_due: Dict[EntityType, str]
    
    # Government API details
    api_endpoint: Optional[str] = None
    api_key_required: bool = False
    online_filing_available: bool = False
    
    # Special requirements
    special_requirements: Dict[str, Any] = field(default_factory=dict)

class DynamicQuestionnaire:
    """Dynamic questionnaire generator based on jurisdiction and entity type"""
    
    def __init__(self):
        self.question_templates = self._load_question_templates()
        self.conditional_logic = self._load_conditional_logic()
    
    def _load_question_templates(self) -> Dict[str, Any]:
        """Load question templates from configuration"""
        return {
            "basic_info": [
                {
                    "id": "business_name",
                    "type": "text",
                    "question": "What is your preferred business name?",
                    "required": True,
                    "validation": "business_name",
                    "help_text": "Your business name must comply with state naming requirements."
                },
                {
                    "id": "business_purpose",
                    "type": "textarea",
                    "question": "Describe the purpose of your business:",
                    "required": True,
                    "max_length": 500,
                    "help_text": "Be specific about your business activities and objectives."
                },
                {
                    "id": "industry",
                    "type": "select",
                    "question": "Select your industry:",
                    "required": True,
                    "options": [
                        "Technology", "Healthcare", "Finance", "Retail", "Manufacturing",
                        "Professional Services", "Real Estate", "Food & Beverage",
                        "Education", "Entertainment", "Other"
                    ]
                }
            ],
            "entity_selection": [
                {
                    "id": "entity_type",
                    "type": "radio",
                    "question": "Choose your business entity type:",
                    "required": True,
                    "options_dynamic": "get_entity_options",
                    "help_text": "Each entity type has different tax implications, liability protection, and operational requirements."
                }
            ],
            "ownership_structure": [
                {
                    "id": "single_owner",
                    "type": "boolean",
                    "question": "Will this business have a single owner?",
                    "required": True,
                    "conditional": True
                },
                {
                    "id": "owner_details",
                    "type": "dynamic_form",
                    "question": "Please provide owner information:",
                    "required": True,
                    "depends_on": {"single_owner": False},
                    "form_template": "owner_form"
                }
            ],
            "location_details": [
                {
                    "id": "formation_state",
                    "type": "select",
                    "question": "In which state would you like to incorporate?",
                    "required": True,
                    "options_dynamic": "get_jurisdiction_options",
                    "help_text": "Consider factors like tax implications, business-friendly laws, and where you'll operate."
                },
                {
                    "id": "registered_address",
                    "type": "address",
                    "question": "Registered office address:",
                    "required": True,
                    "validation": "address",
                    "help_text": "This must be a physical address in the state of formation."
                }
            ],
            "financial_details": [
                {
                    "id": "authorized_shares",
                    "type": "number",
                    "question": "Number of authorized shares:",
                    "required": False,
                    "depends_on": {"entity_type": ["corporation", "s_corporation"]},
                    "default": 1000,
                    "min": 1,
                    "help_text": "This is the maximum number of shares your corporation can issue."
                },
                {
                    "id": "par_value",
                    "type": "currency",
                    "question": "Par value per share:",
                    "required": False,
                    "depends_on": {"entity_type": ["corporation", "s_corporation"]},
                    "default": 0.001,
                    "help_text": "Many states allow no-par or minimal par value shares."
                }
            ]
        }
    
    def _load_conditional_logic(self) -> Dict[str, Any]:
        """Load conditional logic rules"""
        return {
            "entity_type_conditions": {
                "corporation": {
                    "requires": ["directors", "officers", "authorized_shares"],
                    "optional": ["registered_agent_service"]
                },
                "llc": {
                    "requires": ["members", "operating_agreement"],
                    "optional": ["managers"]
                }
            },
            "jurisdiction_conditions": {
                "US_DE": {
                    "additional_questions": ["delaware_benefits"],
                    "expedited_available": True
                },
                "US_NV": {
                    "additional_questions": ["nevada_privacy"],
                    "expedited_available": True
                }
            }
        }
    
    def generate_questionnaire(self, jurisdiction: Jurisdiction, 
                             entity_type: Optional[EntityType] = None,
                             current_responses: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate dynamic questionnaire based on jurisdiction and entity type"""
        
        questionnaire = {
            "sections": [],
            "progress": 0,
            "estimated_time": 15,  # minutes
            "current_step": 1,
            "total_steps": 5
        }
        
        current_responses = current_responses or {}
        
        # Basic information section (always included)
        basic_section = {
            "id": "basic_info",
            "title": "Business Information",
            "description": "Let's start with basic information about your business.",
            "questions": self.question_templates["basic_info"]
        }
        questionnaire["sections"].append(basic_section)
        
        # Entity selection (if not already selected)
        if not entity_type:
            entity_section = {
                "id": "entity_selection", 
                "title": "Entity Type Selection",
                "description": "Choose the right business structure for your needs.",
                "questions": self._customize_entity_questions(jurisdiction)
            }
            questionnaire["sections"].append(entity_section)
        
        # Ownership structure
        ownership_section = {
            "id": "ownership_structure",
            "title": "Ownership Structure", 
            "description": "Define the ownership and management structure.",
            "questions": self._customize_ownership_questions(entity_type, current_responses)
        }
        questionnaire["sections"].append(ownership_section)
        
        # Location details
        location_section = {
            "id": "location_details",
            "title": "Business Location",
            "description": "Specify where your business will be registered and operate.",
            "questions": self._customize_location_questions(jurisdiction)
        }
        questionnaire["sections"].append(location_section)
        
        # Financial details (if applicable)
        if entity_type in [EntityType.CORPORATION, EntityType.S_CORPORATION]:
            financial_section = {
                "id": "financial_details",
                "title": "Financial Structure",
                "description": "Set up your corporation's financial structure.",
                "questions": self.question_templates["financial_details"]
            }
            questionnaire["sections"].append(financial_section)
        
        # Additional jurisdiction-specific questions
        jurisdiction_specific = self._get_jurisdiction_specific_questions(jurisdiction, entity_type)
        if jurisdiction_specific:
            questionnaire["sections"].append(jurisdiction_specific)
        
        return questionnaire
    
    def _customize_entity_questions(self, jurisdiction: Jurisdiction) -> List[Dict[str, Any]]:
        """Customize entity type questions based on jurisdiction"""
        base_questions = self.question_templates["entity_selection"].copy()
        
        # Get supported entity types for jurisdiction
        requirements = JurisdictionManager().get_requirements(jurisdiction)
        supported_types = requirements.entity_types_supported if requirements else list(EntityType)
        
        for question in base_questions:
            if question["id"] == "entity_type":
                question["options"] = [
                    {
                        "value": entity_type.value,
                        "label": self._get_entity_type_label(entity_type),
                        "description": self._get_entity_type_description(entity_type)
                    }
                    for entity_type in supported_types
                ]
        
        return base_questions
    
    def _customize_ownership_questions(self, entity_type: Optional[EntityType], 
                                     responses: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Customize ownership questions based on entity type"""
        questions = self.question_templates["ownership_structure"].copy()
        
        if entity_type == EntityType.CORPORATION:
            questions.extend([
                {
                    "id": "directors",
                    "type": "dynamic_form",
                    "question": "Director information:",
                    "required": True,
                    "form_template": "director_form",
                    "min_entries": 1,
                    "help_text": "Corporations must have at least one director."
                },
                {
                    "id": "officers",
                    "type": "dynamic_form", 
                    "question": "Officer information:",
                    "required": True,
                    "form_template": "officer_form",
                    "help_text": "Most states require at least a President and Secretary."
                }
            ])
        
        elif entity_type == EntityType.LLC:
            questions.extend([
                {
                    "id": "members",
                    "type": "dynamic_form",
                    "question": "Member information:",
                    "required": True,
                    "form_template": "member_form",
                    "min_entries": 1
                },
                {
                    "id": "management_structure",
                    "type": "radio",
                    "question": "How will your LLC be managed?",
                    "required": True,
                    "options": [
                        {"value": "member_managed", "label": "Member-managed"},
                        {"value": "manager_managed", "label": "Manager-managed"}
                    ]
                }
            ])
        
        return questions
    
    def _customize_location_questions(self, jurisdiction: Jurisdiction) -> List[Dict[str, Any]]:
        """Customize location questions based on jurisdiction"""
        questions = self.question_templates["location_details"].copy()
        
        # Pre-fill jurisdiction if already selected
        for question in questions:
            if question["id"] == "formation_state":
                question["default"] = jurisdiction.value
        
        return questions
    
    def _get_jurisdiction_specific_questions(self, jurisdiction: Jurisdiction, 
                                           entity_type: Optional[EntityType]) -> Optional[Dict[str, Any]]:
        """Get jurisdiction-specific additional questions"""
        
        additional_questions = []
        
        # Delaware-specific questions
        if jurisdiction == Jurisdiction.DELAWARE:
            additional_questions.extend([
                {
                    "id": "delaware_franchise_tax",
                    "type": "info",
                    "content": "Delaware corporations are subject to annual franchise tax. The minimum tax is $175."
                },
                {
                    "id": "series_llc_option",
                    "type": "boolean",
                    "question": "Are you interested in Delaware's Series LLC option?",
                    "required": False,
                    "depends_on": {"entity_type": "llc"},
                    "help_text": "Series LLCs allow you to create separate series with distinct assets and liabilities."
                }
            ])
        
        # Nevada-specific questions
        elif jurisdiction == Jurisdiction.NEVADA:
            additional_questions.extend([
                {
                    "id": "nevada_privacy",
                    "type": "info",
                    "content": "Nevada offers strong privacy protections and does not require disclosure of officers and directors in public filings."
                }
            ])
        
        # California-specific questions
        elif jurisdiction == Jurisdiction.CALIFORNIA:
            additional_questions.extend([
                {
                    "id": "california_llc_tax",
                    "type": "info",
                    "content": "California LLCs are subject to an annual tax of $800 minimum, regardless of income."
                }
            ])
        
        if additional_questions:
            return {
                "id": "jurisdiction_specific",
                "title": f"{jurisdiction.name.replace('_', ' ').title()} Specific Requirements",
                "description": "Additional requirements and considerations for your chosen jurisdiction.",
                "questions": additional_questions
            }
        
        return None
    
    def _get_entity_type_label(self, entity_type: EntityType) -> str:
        """Get user-friendly label for entity type"""
        labels = {
            EntityType.LLC: "Limited Liability Company (LLC)",
            EntityType.CORPORATION: "C Corporation",
            EntityType.S_CORPORATION: "S Corporation",
            EntityType.PARTNERSHIP: "General Partnership",
            EntityType.LIMITED_PARTNERSHIP: "Limited Partnership (LP)",
            EntityType.SOLE_PROPRIETORSHIP: "Sole Proprietorship",
            EntityType.NONPROFIT: "Nonprofit Corporation",
            EntityType.BENEFIT_CORPORATION: "Benefit Corporation (B-Corp)",
            EntityType.COOPERATIVE: "Cooperative",
            EntityType.PROFESSIONAL_CORPORATION: "Professional Corporation (PC)",
            EntityType.SERIES_LLC: "Series LLC"
        }
        return labels.get(entity_type, entity_type.value.replace("_", " ").title())
    
    def _get_entity_type_description(self, entity_type: EntityType) -> str:
        """Get description for entity type"""
        descriptions = {
            EntityType.LLC: "Flexible structure with liability protection and tax benefits. Good for most small to medium businesses.",
            EntityType.CORPORATION: "Traditional corporate structure. Required for raising venture capital or going public.",
            EntityType.S_CORPORATION: "Corporate structure with pass-through taxation. Limited to 100 shareholders.",
            EntityType.PARTNERSHIP: "Simple structure for multiple owners. All partners have unlimited liability.",
            EntityType.LIMITED_PARTNERSHIP: "Mix of general and limited partners. Limited partners have liability protection.",
            EntityType.SOLE_PROPRIETORSHIP: "Simplest structure for single owners. No liability protection.",
            EntityType.NONPROFIT: "For organizations operating for charitable, educational, or other exempt purposes.",
            EntityType.BENEFIT_CORPORATION: "For-profit corporation committed to social and environmental performance.",
            EntityType.COOPERATIVE: "Owned and operated by members for their mutual benefit.",
            EntityType.PROFESSIONAL_CORPORATION: "For licensed professionals like doctors, lawyers, accountants.",
            EntityType.SERIES_LLC: "LLC that can create separate series with distinct assets and liabilities."
        }
        return descriptions.get(entity_type, "")

    def validate_response(self, question_id: str, response: Any, 
                         context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Validate a questionnaire response"""
        
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": []
        }
        
        # Business name validation
        if question_id == "business_name":
            validation_result.update(self._validate_business_name(response, context))
        
        # Address validation
        elif question_id == "registered_address":
            validation_result.update(self._validate_address(response, context))
        
        # Email validation
        elif "email" in question_id:
            validation_result.update(self._validate_email(response))
        
        # Phone validation
        elif "phone" in question_id:
            validation_result.update(self._validate_phone(response))
        
        return validation_result
    
    def _validate_business_name(self, name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate business name against jurisdiction requirements"""
        result = {"valid": True, "errors": [], "warnings": [], "suggestions": []}
        
        if not name or len(name.strip()) < 3:
            result["valid"] = False
            result["errors"].append("Business name must be at least 3 characters long.")
            return result
        
        # Get jurisdiction requirements
        jurisdiction = context.get("jurisdiction")
        entity_type = context.get("entity_type")
        
        if jurisdiction and entity_type:
            requirements = JurisdictionManager().get_requirements(Jurisdiction(jurisdiction))
            
            if requirements:
                # Check required designators
                designators = requirements.required_designators.get(EntityType(entity_type), [])
                if designators:
                    has_designator = any(designator.lower() in name.lower() for designator in designators)
                    if not has_designator:
                        result["warnings"].append(
                            f"Consider adding a designator like: {', '.join(designators)}"
                        )
                
                # Check prohibited words
                prohibited = requirements.prohibited_words
                for word in prohibited:
                    if word.lower() in name.lower():
                        result["valid"] = False
                        result["errors"].append(f"The word '{word}' is prohibited in business names.")
        
        return result
    
    def _validate_address(self, address: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate address format and requirements"""
        result = {"valid": True, "errors": [], "warnings": [], "suggestions": []}
        
        required_fields = ["street_line1", "city", "state_province", "postal_code"]
        for field in required_fields:
            if not address.get(field):
                result["valid"] = False
                result["errors"].append(f"Address {field.replace('_', ' ')} is required.")
        
        # Validate postal code format
        postal_code = address.get("postal_code", "")
        country = address.get("country", "US")
        
        if country == "US":
            if not re.match(r'^\d{5}(-\d{4})?$', postal_code):
                result["valid"] = False
                result["errors"].append("Invalid US postal code format. Use XXXXX or XXXXX-XXXX.")
        
        return result
    
    def _validate_email(self, email: str) -> Dict[str, Any]:
        """Validate email format"""
        result = {"valid": True, "errors": [], "warnings": [], "suggestions": []}
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            result["valid"] = False
            result["errors"].append("Invalid email format.")
        
        return result
    
    def _validate_phone(self, phone: str) -> Dict[str, Any]:
        """Validate phone number format"""
        result = {"valid": True, "errors": [], "warnings": [], "suggestions": []}
        
        # Remove non-digits
        digits = re.sub(r'\D', '', phone)
        
        if len(digits) < 10:
            result["valid"] = False
            result["errors"].append("Phone number must have at least 10 digits.")
        elif len(digits) > 11:
            result["valid"] = False
            result["errors"].append("Phone number has too many digits.")
        
        return result

class JurisdictionManager:
    """Manages jurisdiction-specific requirements and regulations"""
    
    def __init__(self):
        self.requirements_cache: Dict[Jurisdiction, JurisdictionRequirements] = {}
        self._load_jurisdiction_data()
    
    def _load_jurisdiction_data(self):
        """Load jurisdiction requirements from data files"""
        # This would normally load from database or configuration files
        # For now, we'll define some key jurisdictions inline
        
        # Delaware - popular for corporations
        self.requirements_cache[Jurisdiction.DELAWARE] = JurisdictionRequirements(
            jurisdiction=Jurisdiction.DELAWARE,
            entity_types_supported=[
                EntityType.LLC, EntityType.CORPORATION, EntityType.S_CORPORATION,
                EntityType.LIMITED_PARTNERSHIP, EntityType.SERIES_LLC
            ],
            filing_fee={
                EntityType.LLC: 90.0,
                EntityType.CORPORATION: 89.0,
                EntityType.S_CORPORATION: 89.0,
                EntityType.LIMITED_PARTNERSHIP: 200.0,
                EntityType.SERIES_LLC: 90.0
            },
            expedited_fee={
                EntityType.LLC: 50.0,
                EntityType.CORPORATION: 50.0,
                EntityType.S_CORPORATION: 50.0
            },
            processing_time={
                EntityType.LLC: 10,
                EntityType.CORPORATION: 15,
                EntityType.S_CORPORATION: 15
            },
            expedited_processing_time={
                EntityType.LLC: 1,
                EntityType.CORPORATION: 1,
                EntityType.S_CORPORATION: 1
            },
            name_requirements={
                "uniqueness_required": True,
                "reservation_period_days": 120,
                "reservation_fee": 75.0
            },
            prohibited_words=["bank", "insurance", "trust", "university"],
            required_designators={
                EntityType.LLC: ["LLC", "L.L.C.", "Limited Liability Company"],
                EntityType.CORPORATION: ["Corporation", "Corp.", "Incorporated", "Inc."],
                EntityType.S_CORPORATION: ["Corporation", "Corp.", "Incorporated", "Inc."]
            },
            min_directors={EntityType.CORPORATION: 1, EntityType.S_CORPORATION: 1},
            min_shareholders={EntityType.CORPORATION: 1, EntityType.S_CORPORATION: 1},
            min_capital={EntityType.CORPORATION: 0.0, EntityType.S_CORPORATION: 0.0},
            required_documents={
                EntityType.LLC: ["Certificate of Formation", "Operating Agreement"],
                EntityType.CORPORATION: ["Certificate of Incorporation", "Bylaws", "Stock Certificate"]
            },
            annual_report_due={EntityType.LLC: "June 1", EntityType.CORPORATION: "March 1"},
            franchise_tax_due={EntityType.LLC: "June 1", EntityType.CORPORATION: "March 1"},
            api_endpoint="https://corp.delaware.gov/api",
            online_filing_available=True,
            special_requirements={
                "registered_agent_required": True,
                "delaware_address_required": True,
                "publication_required": False
            }
        )
        
        # California
        self.requirements_cache[Jurisdiction.CALIFORNIA] = JurisdictionRequirements(
            jurisdiction=Jurisdiction.CALIFORNIA,
            entity_types_supported=[
                EntityType.LLC, EntityType.CORPORATION, EntityType.S_CORPORATION,
                EntityType.PARTNERSHIP, EntityType.LIMITED_PARTNERSHIP
            ],
            filing_fee={
                EntityType.LLC: 70.0,
                EntityType.CORPORATION: 100.0,
                EntityType.S_CORPORATION: 100.0
            },
            expedited_fee={
                EntityType.LLC: 350.0,
                EntityType.CORPORATION: 350.0
            },
            processing_time={
                EntityType.LLC: 15,
                EntityType.CORPORATION: 20
            },
            expedited_processing_time={
                EntityType.LLC: 1,
                EntityType.CORPORATION: 1
            },
            name_requirements={
                "uniqueness_required": True,
                "reservation_period_days": 60,
                "reservation_fee": 10.0
            },
            prohibited_words=["bank", "trust", "cooperative"],
            required_designators={
                EntityType.LLC: ["LLC", "L.L.C.", "Limited Liability Company"],
                EntityType.CORPORATION: ["Corporation", "Corp.", "Incorporated", "Inc."]
            },
            min_directors={EntityType.CORPORATION: 1},
            min_shareholders={EntityType.CORPORATION: 1},
            min_capital={EntityType.CORPORATION: 0.0},
            required_documents={
                EntityType.LLC: ["Articles of Organization", "Operating Agreement"],
                EntityType.CORPORATION: ["Articles of Incorporation", "Bylaws"]
            },
            annual_report_due={EntityType.LLC: "None", EntityType.CORPORATION: "None"},
            franchise_tax_due={EntityType.LLC: "April 15", EntityType.CORPORATION: "April 15"},
            api_endpoint="https://bizfile.sos.ca.gov/api",
            online_filing_available=True,
            special_requirements={
                "annual_llc_tax": 800.0,
                "statement_of_information_required": True
            }
        )
        
        # Nevada
        self.requirements_cache[Jurisdiction.NEVADA] = JurisdictionRequirements(
            jurisdiction=Jurisdiction.NEVADA,
            entity_types_supported=[
                EntityType.LLC, EntityType.CORPORATION, EntityType.S_CORPORATION,
                EntityType.LIMITED_PARTNERSHIP
            ],
            filing_fee={
                EntityType.LLC: 75.0,
                EntityType.CORPORATION: 75.0
            },
            expedited_fee={
                EntityType.LLC: 100.0,
                EntityType.CORPORATION: 100.0
            },
            processing_time={
                EntityType.LLC: 7,
                EntityType.CORPORATION: 10
            },
            expedited_processing_time={
                EntityType.LLC: 1,
                EntityType.CORPORATION: 1
            },
            name_requirements={
                "uniqueness_required": True,
                "reservation_period_days": 90,
                "reservation_fee": 25.0
            },
            prohibited_words=["bank", "credit union", "insurance"],
            required_designators={
                EntityType.LLC: ["LLC", "L.L.C.", "Limited Liability Company", "Limited-Liability Company"],
                EntityType.CORPORATION: ["Corporation", "Corp.", "Incorporated", "Inc."]
            },
            min_directors={EntityType.CORPORATION: 1},
            min_shareholders={EntityType.CORPORATION: 1},
            min_capital={EntityType.CORPORATION: 0.0},
            required_documents={
                EntityType.LLC: ["Articles of Organization", "Operating Agreement"],
                EntityType.CORPORATION: ["Articles of Incorporation", "Bylaws"]
            },
            annual_report_due={EntityType.LLC: "Last day of anniversary month", EntityType.CORPORATION: "Last day of anniversary month"},
            franchise_tax_due={EntityType.LLC: "None", EntityType.CORPORATION: "None"},
            online_filing_available=True,
            special_requirements={
                "privacy_protection": True,
                "no_corporate_income_tax": True
            }
        )
    
    def get_requirements(self, jurisdiction: Jurisdiction) -> Optional[JurisdictionRequirements]:
        """Get requirements for a specific jurisdiction"""
        return self.requirements_cache.get(jurisdiction)
    
    def get_supported_entity_types(self, jurisdiction: Jurisdiction) -> List[EntityType]:
        """Get supported entity types for a jurisdiction"""
        requirements = self.get_requirements(jurisdiction)
        return requirements.entity_types_supported if requirements else []
    
    def calculate_fees(self, jurisdiction: Jurisdiction, entity_type: EntityType, 
                      expedited: bool = False) -> Dict[str, float]:
        """Calculate total fees for formation"""
        requirements = self.get_requirements(jurisdiction)
        if not requirements:
            return {"error": "Jurisdiction not supported"}
        
        fees = {
            "state_filing_fee": requirements.filing_fee.get(entity_type, 0.0),
            "expedited_fee": 0.0,
            "total": 0.0
        }
        
        if expedited and entity_type in requirements.expedited_fee:
            fees["expedited_fee"] = requirements.expedited_fee[entity_type]
        
        fees["total"] = fees["state_filing_fee"] + fees["expedited_fee"]
        
        return fees
    
    def estimate_timeline(self, jurisdiction: Jurisdiction, entity_type: EntityType,
                         expedited: bool = False) -> Dict[str, Any]:
        """Estimate formation timeline"""
        requirements = self.get_requirements(jurisdiction)
        if not requirements:
            return {"error": "Jurisdiction not supported"}
        
        base_processing = requirements.processing_time.get(entity_type, 30)
        if expedited:
            base_processing = requirements.expedited_processing_time.get(entity_type, base_processing)
        
        timeline = {
            "preparation_days": 1,
            "name_search_days": 1, 
            "filing_processing_days": base_processing,
            "ein_processing_days": 1,
            "total_business_days": 3 + base_processing,
            "estimated_completion": datetime.utcnow() + timedelta(days=3 + base_processing)
        }
        
        return timeline

class DocumentGenerator:
    """Generates legal documents for business formation"""
    
    def __init__(self):
        self.template_engine = jinja2.Environment(
            loader=jinja2.FileSystemLoader('templates'),
            autoescape=True
        )
        self.document_templates = self._load_document_templates()
    
    def _load_document_templates(self) -> Dict[str, Any]:
        """Load document templates"""
        return {
            "llc_articles_of_organization": {
                "template_file": "llc_articles_template.html",
                "output_format": "pdf",
                "required_fields": [
                    "company_name", "registered_address", "registered_agent",
                    "organizer", "effective_date"
                ]
            },
            "llc_operating_agreement": {
                "template_file": "llc_operating_agreement_template.html", 
                "output_format": "pdf",
                "required_fields": [
                    "company_name", "members", "management_structure",
                    "capital_contributions", "profit_sharing"
                ]
            },
            "corp_articles_of_incorporation": {
                "template_file": "corp_articles_template.html",
                "output_format": "pdf", 
                "required_fields": [
                    "company_name", "registered_address", "registered_agent",
                    "authorized_shares", "par_value", "incorporator"
                ]
            },
            "corp_bylaws": {
                "template_file": "corp_bylaws_template.html",
                "output_format": "pdf",
                "required_fields": [
                    "company_name", "directors", "officers", "meeting_procedures"
                ]
            },
            "stock_certificate": {
                "template_file": "stock_certificate_template.html",
                "output_format": "pdf",
                "required_fields": [
                    "company_name", "shareholder_name", "shares_issued", "certificate_number"
                ]
            }
        }
    
    async def generate_formation_documents(self, formation_request: FormationRequest) -> Dict[str, Any]:
        """Generate all required formation documents"""
        
        documents = {}
        entity_type = formation_request.business_details.entity_type
        jurisdiction = formation_request.business_details.jurisdiction
        
        # Get jurisdiction requirements
        jurisdiction_mgr = JurisdictionManager()
        requirements = jurisdiction_mgr.get_requirements(jurisdiction)
        
        if not requirements:
            raise ValueError(f"Unsupported jurisdiction: {jurisdiction}")
        
        required_docs = requirements.required_documents.get(entity_type, [])
        
        for doc_name in required_docs:
            try:
                document = await self._generate_document(doc_name, formation_request)
                documents[doc_name] = document
            except Exception as e:
                logger.error(f"Failed to generate document {doc_name}: {e}")
                documents[doc_name] = {"error": str(e)}
        
        return documents
    
    async def _generate_document(self, document_type: str, 
                                formation_request: FormationRequest) -> Dict[str, Any]:
        """Generate a specific document"""
        
        # Map document names to template keys
        doc_mapping = {
            "Certificate of Formation": "llc_articles_of_organization",
            "Articles of Organization": "llc_articles_of_organization", 
            "Operating Agreement": "llc_operating_agreement",
            "Certificate of Incorporation": "corp_articles_of_incorporation",
            "Articles of Incorporation": "corp_articles_of_incorporation",
            "Bylaws": "corp_bylaws",
            "Stock Certificate": "stock_certificate"
        }
        
        template_key = doc_mapping.get(document_type)
        if not template_key:
            raise ValueError(f"Unknown document type: {document_type}")
        
        template_config = self.document_templates[template_key]
        
        # Prepare template data
        template_data = self._prepare_template_data(formation_request, template_key)
        
        # Generate document content
        try:
            template = self.template_engine.get_template(template_config["template_file"])
            content = template.render(**template_data)
            
            return {
                "document_type": document_type,
                "content": content,
                "format": template_config["output_format"],
                "generated_at": datetime.utcnow().isoformat(),
                "template_used": template_key
            }
            
        except Exception as e:
            raise Exception(f"Template rendering failed: {e}")
    
    def _prepare_template_data(self, formation_request: FormationRequest, 
                              template_key: str) -> Dict[str, Any]:
        """Prepare data for template rendering"""
        
        business = formation_request.business_details
        
        base_data = {
            "company_name": business.proposed_name,
            "entity_type": business.entity_type.value,
            "jurisdiction": business.jurisdiction.value,
            "business_purpose": business.business_purpose,
            "registered_address": business.registered_address,
            "mailing_address": business.mailing_address or business.registered_address,
            "owners": formation_request.owners,
            "directors": formation_request.directors,
            "officers": formation_request.officers,
            "registered_agent": formation_request.registered_agent,
            "generation_date": datetime.utcnow().strftime("%B %d, %Y"),
            "effective_date": datetime.utcnow().strftime("%B %d, %Y")
        }
        
        # Add template-specific data
        if template_key == "llc_operating_agreement":
            base_data.update({
                "members": formation_request.owners,
                "management_structure": "member-managed",  # Default, would come from questionnaire
                "capital_contributions": self._calculate_capital_contributions(formation_request.owners),
                "profit_sharing": self._calculate_profit_sharing(formation_request.owners)
            })
        
        elif template_key in ["corp_articles_of_incorporation"]:
            base_data.update({
                "authorized_shares": business.authorized_shares or 1000,
                "par_value": business.par_value or 0.001,
                "incorporator": formation_request.owners[0] if formation_request.owners else None
            })
        
        elif template_key == "corp_bylaws":
            base_data.update({
                "meeting_procedures": self._get_default_meeting_procedures(),
                "fiscal_year_end": business.fiscal_year_end or "December 31"
            })
        
        return base_data
    
    def _calculate_capital_contributions(self, members: List[Person]) -> List[Dict[str, Any]]:
        """Calculate capital contributions for LLC members"""
        contributions = []
        
        for member in members:
            contribution = {
                "member_name": member.full_name,
                "cash_contribution": 1000.0,  # Default, would come from questionnaire
                "property_contribution": 0.0,
                "services_contribution": 0.0,
                "ownership_percentage": member.ownership_percentage or (100.0 / len(members))
            }
            contributions.append(contribution)
        
        return contributions
    
    def _calculate_profit_sharing(self, members: List[Person]) -> List[Dict[str, Any]]:
        """Calculate profit sharing for LLC members"""
        sharing = []
        
        for member in members:
            share = {
                "member_name": member.full_name,
                "profit_percentage": member.ownership_percentage or (100.0 / len(members)),
                "loss_percentage": member.ownership_percentage or (100.0 / len(members))
            }
            sharing.append(share)
        
        return sharing
    
    def _get_default_meeting_procedures(self) -> Dict[str, Any]:
        """Get default corporate meeting procedures"""
        return {
            "annual_meeting_month": "January",
            "notice_period_days": 30,
            "quorum_percentage": 50,
            "voting_method": "majority"
        }

# Example template content (would be stored in separate files)
LLC_ARTICLES_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Articles of Organization - {{ company_name }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2in; }
        .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .signature-line { margin-top: 50px; border-bottom: 1px solid black; width: 300px; }
    </style>
</head>
<body>
    <div class="header">
        ARTICLES OF ORGANIZATION<br>
        OF<br>
        {{ company_name.upper() }}
    </div>
    
    <div class="section">
        <strong>FIRST:</strong> The name of the limited liability company is {{ company_name }}.
    </div>
    
    <div class="section">
        <strong>SECOND:</strong> The registered office of the limited liability company is located at:
        <br>{{ registered_address }}
    </div>
    
    <div class="section">
        <strong>THIRD:</strong> The registered agent for service of process is:
        <br>{{ registered_agent.full_name if registered_agent else "To be appointed" }}
    </div>
    
    <div class="section">
        <strong>FOURTH:</strong> The purpose of the limited liability company is {{ business_purpose }}.
    </div>
    
    <div class="section">
        <strong>FIFTH:</strong> The limited liability company is to have perpetual existence.
    </div>
    
    <div class="section" style="margin-top: 50px;">
        <strong>IN WITNESS WHEREOF,</strong> the undersigned organizer has executed these Articles of Organization on {{ effective_date }}.
    </div>
    
    <div class="signature-line">
        <br><br>
        {{ owners[0].full_name if owners else "Organizer" }}<br>
        Organizer
    </div>
</body>
</html>
"""

if __name__ == "__main__":
    # Example usage
    async def test_business_formation():
        # Create a sample formation request
        business_address = Address(
            street_line1="123 Business St",
            city="Dover",
            state_province="DE",
            postal_code="19901",
            country="US"
        )
        
        owner = Person(
            first_name="John",
            last_name="Doe", 
            email="john.doe@example.com",
            phone="555-123-4567",
            address=business_address,
            ownership_percentage=100.0
        )
        
        business_details = BusinessDetails(
            proposed_name="Tech Innovations LLC",
            entity_type=EntityType.LLC,
            jurisdiction=Jurisdiction.DELAWARE,
            business_purpose="Technology consulting and software development services",
            industry="Technology",
            registered_address=business_address,
            authorized_shares=1000,
            par_value=0.001
        )
        
        formation_request = FormationRequest(
            business_details=business_details,
            owners=[owner]
        )
        
        # Generate questionnaire
        questionnaire_gen = DynamicQuestionnaire()
        questionnaire = questionnaire_gen.generate_questionnaire(
            Jurisdiction.DELAWARE, EntityType.LLC
        )
        
        print("Generated Questionnaire:")
        print(json.dumps(questionnaire, indent=2, default=str))
        
        # Calculate fees and timeline
        jurisdiction_mgr = JurisdictionManager()
        fees = jurisdiction_mgr.calculate_fees(Jurisdiction.DELAWARE, EntityType.LLC)
        timeline = jurisdiction_mgr.estimate_timeline(Jurisdiction.DELAWARE, EntityType.LLC)
        
        print(f"\nFees: {fees}")
        print(f"Timeline: {timeline}")

    # Run test
    asyncio.run(test_business_formation())
