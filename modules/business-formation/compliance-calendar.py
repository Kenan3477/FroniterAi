"""
Compliance Calendar and Post-Formation Management
Handles ongoing compliance requirements, deadlines, and reminders
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from dateutil.relativedelta import relativedelta
from calendar import monthrange
import uuid

from formation_engine import (
    FormationRequest, Jurisdiction, EntityType, ComplianceType,
    JurisdictionManager
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CompliancePriority(Enum):
    """Priority levels for compliance items"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplianceStatus(Enum):
    """Status of compliance items"""
    UPCOMING = "upcoming"
    DUE_SOON = "due_soon"
    OVERDUE = "overdue"
    COMPLETED = "completed"
    NOT_APPLICABLE = "not_applicable"

class ReminderFrequency(Enum):
    """Frequency for compliance reminders"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    CUSTOM = "custom"

@dataclass
class ComplianceItem:
    """Individual compliance requirement"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    compliance_type: ComplianceType = ComplianceType.ANNUAL_REPORT
    jurisdiction: Jurisdiction = Jurisdiction.DELAWARE
    entity_type: EntityType = EntityType.LLC
    
    # Timing
    due_date: Optional[date] = None
    created_date: date = field(default_factory=date.today)
    completed_date: Optional[date] = None
    
    # Recurrence
    is_recurring: bool = True
    recurrence_frequency: ReminderFrequency = ReminderFrequency.ANNUALLY
    recurrence_interval: int = 1  # Every N periods
    next_due_date: Optional[date] = None
    
    # Details
    priority: CompliancePriority = CompliancePriority.MEDIUM
    status: ComplianceStatus = ComplianceStatus.UPCOMING
    estimated_cost: Optional[float] = None
    estimated_time_hours: Optional[float] = None
    
    # Requirements
    required_documents: List[str] = field(default_factory=list)
    required_information: List[str] = field(default_factory=list)
    government_agency: Optional[str] = None
    filing_method: str = "online"  # online, mail, in-person
    
    # Reminders
    reminder_dates: List[date] = field(default_factory=list)
    auto_reminder_enabled: bool = True
    reminder_frequency: ReminderFrequency = ReminderFrequency.MONTHLY
    
    # Notes and links
    notes: str = ""
    helpful_links: List[str] = field(default_factory=list)
    contact_information: Dict[str, str] = field(default_factory=dict)
    
    # Tracking
    completion_confirmation: Optional[str] = None
    supporting_documents: List[str] = field(default_factory=list)

@dataclass
class ComplianceCalendar:
    """Complete compliance calendar for a business entity"""
    entity_id: str
    entity_name: str
    entity_type: EntityType
    jurisdiction: Jurisdiction
    formation_date: date
    
    compliance_items: List[ComplianceItem] = field(default_factory=list)
    custom_reminders: List[Dict[str, Any]] = field(default_factory=list)
    
    # Settings
    default_reminder_frequency: ReminderFrequency = ReminderFrequency.MONTHLY
    email_notifications: bool = True
    sms_notifications: bool = False
    dashboard_notifications: bool = True
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    last_review_date: Optional[date] = None

class ComplianceCalendarGenerator:
    """Generates comprehensive compliance calendars for business entities"""
    
    def __init__(self):
        self.jurisdiction_manager = JurisdictionManager()
        self.compliance_templates = self._load_compliance_templates()
    
    def _load_compliance_templates(self) -> Dict[str, Any]:
        """Load compliance requirement templates by jurisdiction and entity type"""
        
        return {
            # Delaware compliance requirements
            "US_DE": {
                EntityType.LLC: [
                    {
                        "title": "Delaware LLC Annual Franchise Tax",
                        "description": "Annual franchise tax payment due to Delaware Division of Corporations",
                        "compliance_type": ComplianceType.FRANCHISE_TAX,
                        "due_date_pattern": "June 1",
                        "estimated_cost": 300.0,
                        "priority": CompliancePriority.HIGH,
                        "government_agency": "Delaware Division of Corporations",
                        "filing_method": "online",
                        "helpful_links": ["https://corp.delaware.gov/paytaxes/"],
                        "required_information": [
                            "Total gross assets",
                            "Number of LLC interests issued",
                            "Delaware registered agent information"
                        ]
                    },
                    {
                        "title": "Registered Agent Maintenance",
                        "description": "Maintain registered agent in Delaware",
                        "compliance_type": ComplianceType.REGISTERED_AGENT,
                        "is_recurring": True,
                        "recurrence_frequency": ReminderFrequency.ANNUALLY,
                        "estimated_cost": 150.0,
                        "priority": CompliancePriority.HIGH,
                        "required_information": [
                            "Registered agent contact information",
                            "Delaware registered office address"
                        ]
                    }
                ],
                EntityType.CORPORATION: [
                    {
                        "title": "Delaware Corporation Annual Franchise Tax",
                        "description": "Annual franchise tax and annual report filing",
                        "compliance_type": ComplianceType.FRANCHISE_TAX,
                        "due_date_pattern": "March 1",
                        "estimated_cost": 175.0,
                        "priority": CompliancePriority.HIGH,
                        "government_agency": "Delaware Division of Corporations",
                        "filing_method": "online",
                        "helpful_links": ["https://corp.delaware.gov/paytaxes/"],
                        "required_documents": ["Annual Report"],
                        "required_information": [
                            "Total gross assets", 
                            "Number of shares issued",
                            "Directors and officers information"
                        ]
                    },
                    {
                        "title": "Annual Board Meeting",
                        "description": "Hold annual meeting of board of directors",
                        "compliance_type": ComplianceType.BOARD_MEETING,
                        "due_date_pattern": "Anniversary of incorporation",
                        "priority": CompliancePriority.MEDIUM,
                        "estimated_time_hours": 2.0,
                        "required_documents": [
                            "Meeting minutes",
                            "Board resolutions",
                            "Financial statements"
                        ]
                    },
                    {
                        "title": "Annual Shareholder Meeting",
                        "description": "Hold annual meeting of shareholders",
                        "compliance_type": ComplianceType.SHAREHOLDER_MEETING,
                        "due_date_pattern": "Within 13 months of last meeting",
                        "priority": CompliancePriority.MEDIUM,
                        "estimated_time_hours": 1.5,
                        "required_documents": [
                            "Meeting minutes",
                            "Shareholder voting records",
                            "Annual report to shareholders"
                        ]
                    }
                ]
            },
            
            # California compliance requirements
            "US_CA": {
                EntityType.LLC: [
                    {
                        "title": "California LLC Annual Tax",
                        "description": "Annual LLC tax payment ($800 minimum)",
                        "compliance_type": ComplianceType.FRANCHISE_TAX,
                        "due_date_pattern": "April 15",
                        "estimated_cost": 800.0,
                        "priority": CompliancePriority.CRITICAL,
                        "government_agency": "California Franchise Tax Board",
                        "filing_method": "online",
                        "helpful_links": ["https://www.ftb.ca.gov/"],
                        "notes": "California LLCs must pay minimum $800 annual tax regardless of income"
                    },
                    {
                        "title": "Statement of Information (SI-550)",
                        "description": "Biennial statement of information filing",
                        "compliance_type": ComplianceType.ANNUAL_REPORT,
                        "due_date_pattern": "Last day of month of filing Articles",
                        "recurrence_frequency": ReminderFrequency.ANNUALLY,
                        "recurrence_interval": 2,  # Every 2 years
                        "estimated_cost": 20.0,
                        "priority": CompliancePriority.HIGH,
                        "government_agency": "California Secretary of State",
                        "required_information": [
                            "Manager/member information",
                            "Principal office address",
                            "Registered agent information"
                        ]
                    }
                ],
                EntityType.CORPORATION: [
                    {
                        "title": "California Corporation Franchise Tax",
                        "description": "Annual corporation franchise tax",
                        "compliance_type": ComplianceType.FRANCHISE_TAX,
                        "due_date_pattern": "March 15",
                        "estimated_cost": 800.0,
                        "priority": CompliancePriority.CRITICAL,
                        "government_agency": "California Franchise Tax Board",
                        "notes": "Minimum tax is $800, higher for larger corporations"
                    },
                    {
                        "title": "Statement of Information (SI-200)",
                        "description": "Annual statement of information filing",
                        "compliance_type": ComplianceType.ANNUAL_REPORT,
                        "due_date_pattern": "Last day of month of incorporation",
                        "estimated_cost": 25.0,
                        "priority": CompliancePriority.HIGH,
                        "government_agency": "California Secretary of State",
                        "required_information": [
                            "Directors and officers information",
                            "Principal office address",
                            "Outstanding shares information"
                        ]
                    }
                ]
            },
            
            # Nevada compliance requirements
            "US_NV": {
                EntityType.LLC: [
                    {
                        "title": "Nevada LLC Annual List",
                        "description": "Annual list of members and managers",
                        "compliance_type": ComplianceType.ANNUAL_REPORT,
                        "due_date_pattern": "Last day of anniversary month",
                        "estimated_cost": 150.0,
                        "priority": CompliancePriority.HIGH,
                        "government_agency": "Nevada Secretary of State",
                        "required_information": [
                            "Manager/member information",
                            "Registered agent information",
                            "Principal office address"
                        ]
                    }
                ],
                EntityType.CORPORATION: [
                    {
                        "title": "Nevada Corporation Annual List",
                        "description": "Annual list of directors and officers",
                        "compliance_type": ComplianceType.ANNUAL_REPORT,
                        "due_date_pattern": "Last day of anniversary month",
                        "estimated_cost": 150.0,
                        "priority": CompliancePriority.HIGH,
                        "government_agency": "Nevada Secretary of State",
                        "required_information": [
                            "Directors and officers information",
                            "Registered agent information",
                            "Outstanding shares information"
                        ]
                    }
                ]
            },
            
            # Federal compliance requirements (apply to all entities)
            "US_FEDERAL": {
                "ALL": [
                    {
                        "title": "Federal Income Tax Return",
                        "description": "Annual federal tax return filing",
                        "compliance_type": ComplianceType.TAX_FILING,
                        "due_date_pattern": "March 15 (corporations) or April 15 (others)",
                        "priority": CompliancePriority.CRITICAL,
                        "government_agency": "Internal Revenue Service",
                        "required_documents": [
                            "Form 1120 (C-Corp)", "Form 1120S (S-Corp)", 
                            "Form 1065 (Partnership)", "Schedule C (Sole Prop)"
                        ]
                    },
                    {
                        "title": "Employment Tax Quarterly Filing",
                        "description": "Quarterly employment tax returns if have employees",
                        "compliance_type": ComplianceType.TAX_FILING,
                        "due_date_pattern": "Last day of month following quarter end",
                        "recurrence_frequency": ReminderFrequency.QUARTERLY,
                        "priority": CompliancePriority.HIGH,
                        "government_agency": "Internal Revenue Service",
                        "required_documents": ["Form 941"],
                        "notes": "Only required if business has employees"
                    }
                ]
            }
        }
    
    def generate_compliance_calendar(self, formation_request: FormationRequest) -> ComplianceCalendar:
        """Generate a complete compliance calendar for a newly formed entity"""
        
        business = formation_request.business_details
        calendar = ComplianceCalendar(
            entity_id=formation_request.request_id,
            entity_name=business.proposed_name,
            entity_type=business.entity_type,
            jurisdiction=business.jurisdiction,
            formation_date=date.today()
        )
        
        # Get jurisdiction-specific requirements
        jurisdiction_key = business.jurisdiction.value
        entity_requirements = self.compliance_templates.get(jurisdiction_key, {}).get(business.entity_type, [])
        
        # Add jurisdiction-specific compliance items
        for req_template in entity_requirements:
            compliance_item = self._create_compliance_item_from_template(
                req_template, business.entity_type, business.jurisdiction, calendar.formation_date
            )
            calendar.compliance_items.append(compliance_item)
        
        # Add federal requirements
        federal_requirements = self.compliance_templates.get("US_FEDERAL", {}).get("ALL", [])
        for req_template in federal_requirements:
            compliance_item = self._create_compliance_item_from_template(
                req_template, business.entity_type, Jurisdiction.DELAWARE, calendar.formation_date  # Use any jurisdiction for federal
            )
            calendar.compliance_items.append(compliance_item)
        
        # Add entity-specific requirements
        if business.entity_type in [EntityType.CORPORATION, EntityType.S_CORPORATION]:
            calendar.compliance_items.extend(
                self._get_corporate_compliance_items(business.entity_type, calendar.formation_date)
            )
        
        # Sort by due date
        calendar.compliance_items.sort(key=lambda x: x.due_date or date.max)
        
        # Generate reminder dates for each item
        for item in calendar.compliance_items:
            if item.auto_reminder_enabled:
                item.reminder_dates = self._generate_reminder_dates(item)
        
        return calendar
    
    def _create_compliance_item_from_template(self, template: Dict[str, Any], 
                                            entity_type: EntityType, 
                                            jurisdiction: Jurisdiction,
                                            formation_date: date) -> ComplianceItem:
        """Create a compliance item from a template"""
        
        # Calculate due date from pattern
        due_date = self._calculate_due_date(template.get("due_date_pattern", ""), formation_date)
        
        item = ComplianceItem(
            title=template.get("title", ""),
            description=template.get("description", ""),
            compliance_type=template.get("compliance_type", ComplianceType.ANNUAL_REPORT),
            jurisdiction=jurisdiction,
            entity_type=entity_type,
            due_date=due_date,
            is_recurring=template.get("is_recurring", True),
            recurrence_frequency=template.get("recurrence_frequency", ReminderFrequency.ANNUALLY),
            recurrence_interval=template.get("recurrence_interval", 1),
            priority=template.get("priority", CompliancePriority.MEDIUM),
            estimated_cost=template.get("estimated_cost"),
            estimated_time_hours=template.get("estimated_time_hours"),
            required_documents=template.get("required_documents", []),
            required_information=template.get("required_information", []),
            government_agency=template.get("government_agency"),
            filing_method=template.get("filing_method", "online"),
            helpful_links=template.get("helpful_links", []),
            notes=template.get("notes", "")
        )
        
        # Calculate next due date if recurring
        if item.is_recurring and due_date:
            item.next_due_date = self._calculate_next_due_date(due_date, item.recurrence_frequency, item.recurrence_interval)
        
        return item
    
    def _calculate_due_date(self, pattern: str, formation_date: date) -> Optional[date]:
        """Calculate due date from pattern string"""
        
        if not pattern:
            return None
        
        current_year = formation_date.year
        
        # Handle specific date patterns
        if pattern == "June 1":
            due_date = date(current_year, 6, 1)
            # If formation is after June 1, use next year
            if formation_date > due_date:
                due_date = date(current_year + 1, 6, 1)
            return due_date
        
        elif pattern == "March 1":
            due_date = date(current_year, 3, 1)
            if formation_date > due_date:
                due_date = date(current_year + 1, 3, 1)
            return due_date
        
        elif pattern == "April 15":
            due_date = date(current_year, 4, 15)
            if formation_date > due_date:
                due_date = date(current_year + 1, 4, 15)
            return due_date
        
        elif pattern == "March 15":
            due_date = date(current_year, 3, 15)
            if formation_date > due_date:
                due_date = date(current_year + 1, 3, 15)
            return due_date
        
        elif "anniversary" in pattern.lower():
            # Anniversary-based dates
            if "month" in pattern:
                # Last day of anniversary month
                anniversary_month = formation_date.month
                last_day = monthrange(current_year, anniversary_month)[1]
                due_date = date(current_year, anniversary_month, last_day)
                if formation_date > due_date:
                    # Next year
                    if anniversary_month == 12:
                        due_date = date(current_year + 1, 1, monthrange(current_year + 1, 1)[1])
                    else:
                        due_date = date(current_year, anniversary_month + 1, monthrange(current_year, anniversary_month + 1)[1])
                return due_date
            else:
                # Anniversary of incorporation
                return date(current_year + 1, formation_date.month, formation_date.day)
        
        elif "quarter" in pattern.lower():
            # Quarterly dates
            quarter_ends = [
                date(current_year, 3, 31),
                date(current_year, 6, 30), 
                date(current_year, 9, 30),
                date(current_year, 12, 31)
            ]
            
            # Find next quarter end after formation
            for quarter_end in quarter_ends:
                if formation_date <= quarter_end:
                    # Due last day of following month
                    if quarter_end.month == 12:
                        return date(current_year + 1, 1, 31)
                    else:
                        next_month = quarter_end.month + 1
                        last_day = monthrange(current_year, next_month)[1]
                        return date(current_year, next_month, last_day)
            
            # If past all quarters, use next year Q1
            return date(current_year + 1, 1, 31)
        
        # Default: one year from formation
        return formation_date + relativedelta(years=1)
    
    def _calculate_next_due_date(self, current_due: date, frequency: ReminderFrequency, interval: int) -> date:
        """Calculate next due date for recurring items"""
        
        if frequency == ReminderFrequency.ANNUALLY:
            return current_due + relativedelta(years=interval)
        elif frequency == ReminderFrequency.QUARTERLY:
            return current_due + relativedelta(months=3 * interval)
        elif frequency == ReminderFrequency.MONTHLY:
            return current_due + relativedelta(months=interval)
        elif frequency == ReminderFrequency.WEEKLY:
            return current_due + timedelta(weeks=interval)
        elif frequency == ReminderFrequency.DAILY:
            return current_due + timedelta(days=interval)
        else:
            return current_due + relativedelta(years=1)  # Default to annual
    
    def _get_corporate_compliance_items(self, entity_type: EntityType, formation_date: date) -> List[ComplianceItem]:
        """Get additional compliance items specific to corporations"""
        
        items = []
        
        # Corporate record keeping
        items.append(ComplianceItem(
            title="Corporate Records Maintenance",
            description="Maintain corporate records, stock ledger, and minute book",
            compliance_type=ComplianceType.OPERATING_AGREEMENT_REVIEW,
            entity_type=entity_type,
            due_date=formation_date + relativedelta(months=1),
            is_recurring=True,
            recurrence_frequency=ReminderFrequency.ANNUALLY,
            priority=CompliancePriority.MEDIUM,
            estimated_time_hours=2.0,
            required_documents=[
                "Stock certificate book",
                "Corporate minute book", 
                "Share transfer ledger",
                "Bylaws and amendments"
            ]
        ))
        
        # S-Corp specific items
        if entity_type == EntityType.S_CORPORATION:
            items.append(ComplianceItem(
                title="S-Corporation Election Monitoring",
                description="Monitor compliance with S-Corporation election requirements",
                compliance_type=ComplianceType.TAX_FILING,
                entity_type=entity_type,
                due_date=formation_date + relativedelta(months=1),
                is_recurring=True,
                recurrence_frequency=ReminderFrequency.ANNUALLY,
                priority=CompliancePriority.HIGH,
                required_information=[
                    "Shareholder count (max 100)",
                    "Single class of stock verification",
                    "Domestic shareholder verification"
                ],
                notes="S-Corp election can be lost if requirements are not met"
            ))
        
        return items
    
    def _generate_reminder_dates(self, item: ComplianceItem) -> List[date]:
        """Generate reminder dates for a compliance item"""
        
        if not item.due_date:
            return []
        
        reminders = []
        
        # Default reminder schedule based on priority
        if item.priority == CompliancePriority.CRITICAL:
            # 60, 30, 14, 7, 3, 1 days before
            reminder_days = [60, 30, 14, 7, 3, 1]
        elif item.priority == CompliancePriority.HIGH:
            # 30, 14, 7, 1 days before
            reminder_days = [30, 14, 7, 1]
        elif item.priority == CompliancePriority.MEDIUM:
            # 30, 7 days before
            reminder_days = [30, 7]
        else:  # LOW
            # 30 days before
            reminder_days = [30]
        
        for days in reminder_days:
            reminder_date = item.due_date - timedelta(days=days)
            if reminder_date >= date.today():
                reminders.append(reminder_date)
        
        return sorted(reminders)

class ComplianceTracker:
    """Tracks and manages ongoing compliance for business entities"""
    
    def __init__(self):
        self.calendars: Dict[str, ComplianceCalendar] = {}
    
    def add_calendar(self, calendar: ComplianceCalendar):
        """Add a compliance calendar"""
        self.calendars[calendar.entity_id] = calendar
    
    def get_upcoming_compliance(self, entity_id: str, days_ahead: int = 30) -> List[ComplianceItem]:
        """Get upcoming compliance items for an entity"""
        
        calendar = self.calendars.get(entity_id)
        if not calendar:
            return []
        
        cutoff_date = date.today() + timedelta(days=days_ahead)
        upcoming = []
        
        for item in calendar.compliance_items:
            if item.due_date and item.due_date <= cutoff_date and item.status != ComplianceStatus.COMPLETED:
                # Update status based on due date
                days_until_due = (item.due_date - date.today()).days
                
                if days_until_due < 0:
                    item.status = ComplianceStatus.OVERDUE
                elif days_until_due <= 7:
                    item.status = ComplianceStatus.DUE_SOON
                else:
                    item.status = ComplianceStatus.UPCOMING
                
                upcoming.append(item)
        
        return sorted(upcoming, key=lambda x: x.due_date or date.max)
    
    def get_overdue_compliance(self, entity_id: str) -> List[ComplianceItem]:
        """Get overdue compliance items"""
        
        calendar = self.calendars.get(entity_id)
        if not calendar:
            return []
        
        overdue = []
        today = date.today()
        
        for item in calendar.compliance_items:
            if item.due_date and item.due_date < today and item.status != ComplianceStatus.COMPLETED:
                item.status = ComplianceStatus.OVERDUE
                overdue.append(item)
        
        return sorted(overdue, key=lambda x: x.due_date or date.max)
    
    def mark_compliance_completed(self, entity_id: str, item_id: str, 
                                completion_confirmation: str = "", 
                                supporting_documents: List[str] = None) -> bool:
        """Mark a compliance item as completed"""
        
        calendar = self.calendars.get(entity_id)
        if not calendar:
            return False
        
        for item in calendar.compliance_items:
            if item.id == item_id:
                item.status = ComplianceStatus.COMPLETED
                item.completed_date = date.today()
                item.completion_confirmation = completion_confirmation
                item.supporting_documents = supporting_documents or []
                
                # If recurring, create next occurrence
                if item.is_recurring and item.next_due_date:
                    next_item = self._create_next_occurrence(item)
                    calendar.compliance_items.append(next_item)
                
                calendar.updated_at = datetime.utcnow()
                return True
        
        return False
    
    def _create_next_occurrence(self, completed_item: ComplianceItem) -> ComplianceItem:
        """Create next occurrence of a recurring compliance item"""
        
        next_item = ComplianceItem(
            title=completed_item.title,
            description=completed_item.description,
            compliance_type=completed_item.compliance_type,
            jurisdiction=completed_item.jurisdiction,
            entity_type=completed_item.entity_type,
            due_date=completed_item.next_due_date,
            is_recurring=completed_item.is_recurring,
            recurrence_frequency=completed_item.recurrence_frequency,
            recurrence_interval=completed_item.recurrence_interval,
            priority=completed_item.priority,
            estimated_cost=completed_item.estimated_cost,
            estimated_time_hours=completed_item.estimated_time_hours,
            required_documents=completed_item.required_documents.copy(),
            required_information=completed_item.required_information.copy(),
            government_agency=completed_item.government_agency,
            filing_method=completed_item.filing_method,
            helpful_links=completed_item.helpful_links.copy(),
            notes=completed_item.notes,
            auto_reminder_enabled=completed_item.auto_reminder_enabled,
            reminder_frequency=completed_item.reminder_frequency
        )
        
        # Calculate next due date after this one
        if next_item.due_date:
            generator = ComplianceCalendarGenerator()
            next_item.next_due_date = generator._calculate_next_due_date(
                next_item.due_date, 
                next_item.recurrence_frequency, 
                next_item.recurrence_interval
            )
            
            # Generate reminder dates
            if next_item.auto_reminder_enabled:
                next_item.reminder_dates = generator._generate_reminder_dates(next_item)
        
        return next_item
    
    def get_compliance_summary(self, entity_id: str) -> Dict[str, Any]:
        """Get compliance summary for an entity"""
        
        calendar = self.calendars.get(entity_id)
        if not calendar:
            return {"error": "Calendar not found"}
        
        today = date.today()
        summary = {
            "entity_name": calendar.entity_name,
            "entity_type": calendar.entity_type.value,
            "jurisdiction": calendar.jurisdiction.value,
            "total_items": len(calendar.compliance_items),
            "completed": 0,
            "upcoming": 0,
            "due_soon": 0,
            "overdue": 0,
            "total_estimated_cost": 0.0,
            "next_due_date": None,
            "critical_items": []
        }
        
        for item in calendar.compliance_items:
            if item.status == ComplianceStatus.COMPLETED:
                summary["completed"] += 1
            elif item.due_date:
                days_until_due = (item.due_date - today).days
                
                if days_until_due < 0:
                    summary["overdue"] += 1
                elif days_until_due <= 7:
                    summary["due_soon"] += 1
                else:
                    summary["upcoming"] += 1
                
                # Track next due date
                if not summary["next_due_date"] or item.due_date < summary["next_due_date"]:
                    summary["next_due_date"] = item.due_date
            
            # Add to estimated costs
            if item.estimated_cost and item.status != ComplianceStatus.COMPLETED:
                summary["total_estimated_cost"] += item.estimated_cost
            
            # Track critical items
            if item.priority == CompliancePriority.CRITICAL and item.status != ComplianceStatus.COMPLETED:
                summary["critical_items"].append({
                    "title": item.title,
                    "due_date": item.due_date.isoformat() if item.due_date else None,
                    "estimated_cost": item.estimated_cost
                })
        
        return summary
    
    def export_calendar(self, entity_id: str, format: str = "json") -> str:
        """Export compliance calendar in various formats"""
        
        calendar = self.calendars.get(entity_id)
        if not calendar:
            return ""
        
        if format == "json":
            return json.dumps(calendar, default=str, indent=2)
        
        elif format == "csv":
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Header
            writer.writerow([
                "Title", "Description", "Type", "Due Date", "Priority", 
                "Status", "Estimated Cost", "Government Agency"
            ])
            
            # Data rows
            for item in calendar.compliance_items:
                writer.writerow([
                    item.title,
                    item.description,
                    item.compliance_type.value,
                    item.due_date.isoformat() if item.due_date else "",
                    item.priority.value,
                    item.status.value,
                    item.estimated_cost or "",
                    item.government_agency or ""
                ])
            
            return output.getvalue()
        
        elif format == "ical":
            # Generate iCalendar format for calendar applications
            ical_content = "BEGIN:VCALENDAR\n"
            ical_content += "VERSION:2.0\n"
            ical_content += "PRODID:-//Frontier Business Formation//Compliance Calendar//EN\n"
            
            for item in calendar.compliance_items:
                if item.due_date:
                    ical_content += "BEGIN:VEVENT\n"
                    ical_content += f"UID:{item.id}\n"
                    ical_content += f"DTSTART;VALUE=DATE:{item.due_date.strftime('%Y%m%d')}\n"
                    ical_content += f"SUMMARY:{item.title}\n"
                    ical_content += f"DESCRIPTION:{item.description}\n"
                    ical_content += f"CATEGORIES:{item.compliance_type.value}\n"
                    ical_content += "END:VEVENT\n"
            
            ical_content += "END:VCALENDAR\n"
            return ical_content
        
        return ""

if __name__ == "__main__":
    # Example usage
    async def test_compliance_calendar():
        from formation_engine import BusinessDetails, Address, Person
        
        # Create sample formation request
        business_address = Address(
            street_line1="123 Business St",
            city="Dover", 
            state_province="DE",
            postal_code="19901"
        )
        
        owner = Person(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="555-123-4567",
            address=business_address
        )
        
        business_details = BusinessDetails(
            proposed_name="Tech Innovations LLC",
            entity_type=EntityType.LLC,
            jurisdiction=Jurisdiction.DELAWARE,
            business_purpose="Technology consulting",
            industry="Technology",
            registered_address=business_address
        )
        
        formation_request = FormationRequest(
            business_details=business_details,
            owners=[owner]
        )
        
        # Generate compliance calendar
        generator = ComplianceCalendarGenerator()
        calendar = generator.generate_compliance_calendar(formation_request)
        
        print(f"Generated compliance calendar for {calendar.entity_name}")
        print(f"Total compliance items: {len(calendar.compliance_items)}")
        
        for item in calendar.compliance_items[:5]:  # Show first 5 items
            print(f"- {item.title}: Due {item.due_date} (Priority: {item.priority.value})")
        
        # Test compliance tracking
        tracker = ComplianceTracker()
        tracker.add_calendar(calendar)
        
        upcoming = tracker.get_upcoming_compliance(calendar.entity_id, days_ahead=90)
        print(f"\nUpcoming compliance items (next 90 days): {len(upcoming)}")
        
        summary = tracker.get_compliance_summary(calendar.entity_id)
        print(f"\nCompliance Summary: {summary}")

    # Run test
    asyncio.run(test_compliance_calendar())
