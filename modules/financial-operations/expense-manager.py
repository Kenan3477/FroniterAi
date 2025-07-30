"""
Financial Operations Module - Expense Categorization and Automation
Advanced expense management, categorization, and automated reporting
"""

import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Tuple
import uuid
import pandas as pd
from collections import defaultdict
import aiohttp
import cv2
import pytesseract
from PIL import Image
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExpenseCategory(Enum):
    """Primary expense categories for tax and reporting"""
    OFFICE_EXPENSES = "office_expenses"
    TRAVEL_MEALS = "travel_meals"
    VEHICLE_TRANSPORTATION = "vehicle_transportation"
    MARKETING_ADVERTISING = "marketing_advertising"
    PROFESSIONAL_SERVICES = "professional_services"
    UTILITIES = "utilities"
    RENT_LEASE = "rent_lease"
    INSURANCE = "insurance"
    SUPPLIES = "supplies"
    EQUIPMENT = "equipment"
    SOFTWARE_SUBSCRIPTIONS = "software_subscriptions"
    PAYROLL_BENEFITS = "payroll_benefits"
    TRAINING_EDUCATION = "training_education"
    RESEARCH_DEVELOPMENT = "research_development"
    ENTERTAINMENT_CLIENT = "entertainment_client"
    BANK_FEES = "bank_fees"
    TAXES_LICENSES = "taxes_licenses"
    OTHER_BUSINESS = "other_business"
    PERSONAL = "personal"  # Non-deductible

class TaxDeductibility(Enum):
    """Tax deductibility status"""
    FULLY_DEDUCTIBLE = "fully_deductible"         # 100%
    PARTIALLY_DEDUCTIBLE = "partially_deductible"  # 50% (meals, entertainment)
    NOT_DEDUCTIBLE = "not_deductible"             # 0%
    SPECIAL_RULES = "special_rules"               # Subject to special limitations

class ExpenseRecurrence(Enum):
    """Expense recurrence patterns"""
    ONE_TIME = "one_time"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"

@dataclass
class ExpenseRule:
    """Automated expense categorization rule"""
    rule_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    
    # Matching criteria
    vendor_patterns: List[str] = field(default_factory=list)  # Regex patterns
    amount_range: Optional[Tuple[Decimal, Decimal]] = None
    description_keywords: List[str] = field(default_factory=list)
    
    # Categorization
    category: ExpenseCategory = ExpenseCategory.OTHER_BUSINESS
    subcategory: str = ""
    tax_deductibility: TaxDeductibility = TaxDeductibility.FULLY_DEDUCTIBLE
    deductible_percentage: Decimal = field(default_factory=lambda: Decimal('100'))
    
    # Business purpose
    default_business_purpose: str = ""
    requires_receipt: bool = True
    requires_business_purpose: bool = True
    
    # Confidence and priority
    confidence_score: Decimal = field(default_factory=lambda: Decimal('0.9'))
    priority: int = 1  # Lower number = higher priority
    
    # Status
    is_active: bool = True
    created_date: datetime = field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None
    usage_count: int = 0

@dataclass
class ExpenseTransaction:
    """Enhanced expense transaction with smart categorization"""
    transaction_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    date: date = field(default_factory=date.today)
    amount: Decimal = field(default_factory=lambda: Decimal('0.00'))
    
    # Transaction details
    vendor_name: str = ""
    description: str = ""
    payment_method: str = ""  # credit_card, debit_card, cash, check, ach
    account_last_four: str = ""
    
    # Categorization
    category: ExpenseCategory = ExpenseCategory.OTHER_BUSINESS
    subcategory: str = ""
    business_purpose: str = ""
    
    # Tax information
    tax_deductibility: TaxDeductibility = TaxDeductibility.FULLY_DEDUCTIBLE
    deductible_amount: Decimal = field(default_factory=lambda: Decimal('0.00'))
    tax_year: int = field(default_factory=lambda: datetime.now().year)
    
    # Documentation
    receipt_url: Optional[str] = None
    receipt_text: Optional[str] = None  # OCR extracted text
    invoice_number: Optional[str] = None
    has_receipt: bool = False
    
    # Approval and compliance
    needs_approval: bool = False
    approved_by: Optional[str] = None
    approved_date: Optional[datetime] = None
    compliance_notes: str = ""
    
    # Automation
    auto_categorized: bool = False
    confidence_score: Decimal = field(default_factory=lambda: Decimal('0.0'))
    applied_rule_id: Optional[str] = None
    
    # Recurrence
    is_recurring: bool = False
    recurrence_pattern: Optional[ExpenseRecurrence] = None
    parent_recurring_id: Optional[str] = None
    
    # Travel-specific fields
    trip_id: Optional[str] = None
    mileage: Optional[Decimal] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    
    # Client/project allocation
    client_name: Optional[str] = None
    project_code: Optional[str] = None
    billable: bool = False
    
    # Status and audit
    status: str = "pending"  # pending, approved, rejected, under_review
    flags: List[str] = field(default_factory=list)  # suspicious_amount, missing_receipt, etc.
    
    created_date: datetime = field(default_factory=datetime.utcnow)
    updated_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ExpenseReport:
    """Comprehensive expense reporting"""
    report_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    report_type: str = "monthly"  # daily, weekly, monthly, quarterly, annual, custom
    
    # Time period
    start_date: date = field(default_factory=date.today)
    end_date: date = field(default_factory=date.today)
    
    # Summary data
    total_expenses: Decimal = field(default_factory=lambda: Decimal('0.00'))
    total_deductible: Decimal = field(default_factory=lambda: Decimal('0.00'))
    total_non_deductible: Decimal = field(default_factory=lambda: Decimal('0.00'))
    
    # Category breakdown
    category_totals: Dict[str, Decimal] = field(default_factory=dict)
    deductible_by_category: Dict[str, Decimal] = field(default_factory=dict)
    
    # Tax analysis
    tax_savings_estimate: Decimal = field(default_factory=lambda: Decimal('0.00'))
    marginal_tax_rate: Decimal = field(default_factory=lambda: Decimal('0.25'))
    
    # Compliance tracking
    missing_receipts: List[str] = field(default_factory=list)
    missing_business_purpose: List[str] = field(default_factory=list)
    flagged_transactions: List[str] = field(default_factory=list)
    
    # Trends and insights
    spending_trends: Dict[str, Any] = field(default_factory=dict)
    recommendations: List[str] = field(default_factory=list)
    
    created_date: datetime = field(default_factory=datetime.utcnow)

class ExpenseCategorizationEngine:
    """AI-powered expense categorization and automation"""
    
    def __init__(self):
        self.categorization_rules = self._load_categorization_rules()
        self.vendor_database = self._load_vendor_database()
        self.category_mappings = self._load_category_mappings()
        self.ml_keywords = self._load_ml_keywords()
    
    def _load_categorization_rules(self) -> List[ExpenseRule]:
        """Load predefined categorization rules"""
        
        rules = []
        
        # Office supplies
        office_rule = ExpenseRule(
            name="Office Supplies - Staples",
            vendor_patterns=[r".*STAPLES.*", r".*OFFICE DEPOT.*", r".*BEST BUY.*"],
            description_keywords=["office", "supplies", "paper", "pens", "folders"],
            category=ExpenseCategory.OFFICE_EXPENSES,
            subcategory="Office Supplies",
            default_business_purpose="Office supplies for business operations",
            confidence_score=Decimal('0.95')
        )
        rules.append(office_rule)
        
        # Software subscriptions
        software_rule = ExpenseRule(
            name="Software Subscriptions",
            vendor_patterns=[r".*MICROSOFT.*", r".*ADOBE.*", r".*GOOGLE.*", r".*ZOOM.*", r".*SLACK.*"],
            description_keywords=["subscription", "software", "saas", "license"],
            category=ExpenseCategory.SOFTWARE_SUBSCRIPTIONS,
            subcategory="Business Software",
            default_business_purpose="Software subscription for business operations",
            confidence_score=Decimal('0.98')
        )
        rules.append(software_rule)
        
        # Meals (50% deductible)
        meals_rule = ExpenseRule(
            name="Business Meals",
            vendor_patterns=[r".*RESTAURANT.*", r".*CAFE.*", r".*STARBUCKS.*", r".*MCDONALD.*"],
            description_keywords=["meal", "lunch", "dinner", "coffee", "restaurant"],
            category=ExpenseCategory.TRAVEL_MEALS,
            subcategory="Business Meals",
            tax_deductibility=TaxDeductibility.PARTIALLY_DEDUCTIBLE,
            deductible_percentage=Decimal('50'),
            default_business_purpose="Business meal",
            requires_business_purpose=True,
            confidence_score=Decimal('0.85')
        )
        rules.append(meals_rule)
        
        # Gas and vehicle expenses
        vehicle_rule = ExpenseRule(
            name="Vehicle Expenses",
            vendor_patterns=[r".*SHELL.*", r".*EXXON.*", r".*CHEVRON.*", r".*BP.*", r".*MOBIL.*"],
            description_keywords=["gas", "fuel", "gasoline", "automotive"],
            category=ExpenseCategory.VEHICLE_TRANSPORTATION,
            subcategory="Fuel",
            default_business_purpose="Business travel fuel",
            confidence_score=Decimal('0.90')
        )
        rules.append(vehicle_rule)
        
        # Professional services
        professional_rule = ExpenseRule(
            name="Professional Services",
            vendor_patterns=[r".*LAW.*", r".*ATTORNEY.*", r".*CPA.*", r".*ACCOUNTING.*", r".*CONSULTING.*"],
            description_keywords=["legal", "accounting", "consulting", "professional"],
            category=ExpenseCategory.PROFESSIONAL_SERVICES,
            subcategory="Legal and Accounting",
            default_business_purpose="Professional services",
            confidence_score=Decimal('0.95')
        )
        rules.append(professional_rule)
        
        # Marketing and advertising
        marketing_rule = ExpenseRule(
            name="Marketing and Advertising",
            vendor_patterns=[r".*GOOGLE ADS.*", r".*FACEBOOK.*", r".*LINKEDIN.*", r".*TWITTER.*"],
            description_keywords=["advertising", "marketing", "ads", "promotion"],
            category=ExpenseCategory.MARKETING_ADVERTISING,
            subcategory="Digital Advertising",
            default_business_purpose="Marketing and advertising expenses",
            confidence_score=Decimal('0.92')
        )
        rules.append(marketing_rule)
        
        # Equipment purchases
        equipment_rule = ExpenseRule(
            name="Equipment Purchases",
            vendor_patterns=[r".*AMAZON.*", r".*BEST BUY.*", r".*DELL.*", r".*APPLE.*"],
            description_keywords=["computer", "laptop", "monitor", "equipment", "hardware"],
            amount_range=(Decimal('500'), Decimal('10000')),
            category=ExpenseCategory.EQUIPMENT,
            subcategory="Computer Equipment",
            default_business_purpose="Business equipment purchase",
            confidence_score=Decimal('0.88')
        )
        rules.append(equipment_rule)
        
        # Utilities
        utilities_rule = ExpenseRule(
            name="Utilities",
            vendor_patterns=[r".*ELECTRIC.*", r".*GAS COMPANY.*", r".*WATER.*", r".*INTERNET.*", r".*PHONE.*"],
            description_keywords=["electric", "gas", "water", "internet", "phone", "utility"],
            category=ExpenseCategory.UTILITIES,
            subcategory="Business Utilities",
            default_business_purpose="Business utility expenses",
            confidence_score=Decimal('0.93')
        )
        rules.append(utilities_rule)
        
        return rules
    
    def _load_vendor_database(self) -> Dict[str, Dict[str, Any]]:
        """Load comprehensive vendor database with categorization info"""
        
        return {
            # Technology vendors
            "MICROSOFT": {
                "category": ExpenseCategory.SOFTWARE_SUBSCRIPTIONS,
                "subcategory": "Productivity Software",
                "common_purposes": ["Office 365 subscription", "Azure services", "Software licenses"]
            },
            "ADOBE": {
                "category": ExpenseCategory.SOFTWARE_SUBSCRIPTIONS,
                "subcategory": "Creative Software",
                "common_purposes": ["Creative Cloud subscription", "Design software"]
            },
            "GOOGLE": {
                "category": ExpenseCategory.SOFTWARE_SUBSCRIPTIONS,
                "subcategory": "Cloud Services",
                "common_purposes": ["Google Workspace", "Cloud storage", "Google Ads"]
            },
            
            # Office suppliers
            "STAPLES": {
                "category": ExpenseCategory.OFFICE_EXPENSES,
                "subcategory": "Office Supplies",
                "common_purposes": ["Office supplies", "Business materials"]
            },
            "OFFICE DEPOT": {
                "category": ExpenseCategory.OFFICE_EXPENSES,
                "subcategory": "Office Supplies", 
                "common_purposes": ["Office supplies", "Business materials"]
            },
            
            # Travel and transportation
            "UBER": {
                "category": ExpenseCategory.VEHICLE_TRANSPORTATION,
                "subcategory": "Rideshare",
                "common_purposes": ["Business travel", "Client meetings"]
            },
            "LYFT": {
                "category": ExpenseCategory.VEHICLE_TRANSPORTATION,
                "subcategory": "Rideshare",
                "common_purposes": ["Business travel", "Client meetings"]
            },
            
            # Professional services
            "QUICKBOOKS": {
                "category": ExpenseCategory.SOFTWARE_SUBSCRIPTIONS,
                "subcategory": "Accounting Software",
                "common_purposes": ["Accounting software subscription"]
            },
            
            # Marketing platforms
            "MAILCHIMP": {
                "category": ExpenseCategory.MARKETING_ADVERTISING,
                "subcategory": "Email Marketing",
                "common_purposes": ["Email marketing services"]
            },
            "FACEBOOK": {
                "category": ExpenseCategory.MARKETING_ADVERTISING,
                "subcategory": "Social Media Advertising",
                "common_purposes": ["Social media advertising", "Facebook ads"]
            }
        }
    
    def _load_category_mappings(self) -> Dict[ExpenseCategory, Dict[str, Any]]:
        """Load category-specific rules and mappings"""
        
        return {
            ExpenseCategory.OFFICE_EXPENSES: {
                "deductible_percentage": 100,
                "common_subcategories": [
                    "Office Supplies", "Postage", "Phone/Internet", "Office Equipment"
                ],
                "keywords": ["office", "supplies", "paper", "pens", "folders", "postage", "phone"]
            },
            
            ExpenseCategory.TRAVEL_MEALS: {
                "deductible_percentage": 50,
                "common_subcategories": [
                    "Business Meals", "Client Entertainment", "Travel Meals"
                ],
                "keywords": ["meal", "restaurant", "coffee", "lunch", "dinner", "client"],
                "requires_business_purpose": True
            },
            
            ExpenseCategory.VEHICLE_TRANSPORTATION: {
                "deductible_percentage": 100,
                "common_subcategories": [
                    "Fuel", "Mileage", "Rideshare", "Parking", "Tolls", "Vehicle Maintenance"
                ],
                "keywords": ["gas", "fuel", "uber", "lyft", "parking", "toll", "mileage"]
            },
            
            ExpenseCategory.MARKETING_ADVERTISING: {
                "deductible_percentage": 100,
                "common_subcategories": [
                    "Digital Advertising", "Print Advertising", "Trade Shows", "Marketing Materials"
                ],
                "keywords": ["ads", "advertising", "marketing", "promotion", "trade show"]
            },
            
            ExpenseCategory.SOFTWARE_SUBSCRIPTIONS: {
                "deductible_percentage": 100,
                "common_subcategories": [
                    "Business Software", "Cloud Services", "Productivity Tools", "Design Software"
                ],
                "keywords": ["subscription", "software", "saas", "cloud", "license"]
            },
            
            ExpenseCategory.EQUIPMENT: {
                "deductible_percentage": 100,
                "common_subcategories": [
                    "Computer Equipment", "Office Furniture", "Machinery", "Tools"
                ],
                "keywords": ["computer", "laptop", "monitor", "furniture", "equipment"],
                "section_179_eligible": True
            }
        }
    
    def _load_ml_keywords(self) -> Dict[str, List[str]]:
        """Load ML-based keyword associations for categorization"""
        
        return {
            "technology": ["software", "saas", "cloud", "app", "digital", "tech", "online", "web"],
            "food_beverage": ["restaurant", "cafe", "coffee", "meal", "food", "dining", "catering"],
            "travel": ["hotel", "flight", "uber", "lyft", "taxi", "mileage", "travel", "trip"],
            "office": ["supplies", "paper", "pens", "folders", "office", "desk", "chair"],
            "professional": ["lawyer", "attorney", "cpa", "consultant", "professional", "services"],
            "marketing": ["ads", "advertising", "marketing", "promotion", "campaign", "brand"],
            "utilities": ["electric", "gas", "water", "internet", "phone", "utility", "service"]
        }
    
    def categorize_expense(self, transaction: ExpenseTransaction) -> ExpenseTransaction:
        """Automatically categorize an expense transaction"""
        
        best_rule = None
        highest_confidence = Decimal('0')
        
        # Try to match against predefined rules
        for rule in self.categorization_rules:
            if not rule.is_active:
                continue
            
            confidence = self._calculate_rule_confidence(transaction, rule)
            
            if confidence > highest_confidence:
                highest_confidence = confidence
                best_rule = rule
        
        # Apply the best matching rule
        if best_rule and highest_confidence >= Decimal('0.7'):
            transaction.category = best_rule.category
            transaction.subcategory = best_rule.subcategory
            transaction.tax_deductibility = best_rule.tax_deductibility
            transaction.confidence_score = highest_confidence
            transaction.applied_rule_id = best_rule.rule_id
            transaction.auto_categorized = True
            
            # Calculate deductible amount
            deductible_percentage = best_rule.deductible_percentage / 100
            transaction.deductible_amount = transaction.amount * deductible_percentage
            
            # Set default business purpose if missing
            if not transaction.business_purpose and best_rule.default_business_purpose:
                transaction.business_purpose = best_rule.default_business_purpose
            
            # Update rule usage
            best_rule.last_used = datetime.utcnow()
            best_rule.usage_count += 1
        
        # Fallback to vendor database lookup
        elif not transaction.auto_categorized:
            vendor_info = self._lookup_vendor_info(transaction.vendor_name)
            if vendor_info:
                transaction.category = vendor_info["category"]
                transaction.subcategory = vendor_info["subcategory"]
                transaction.confidence_score = Decimal('0.6')
                transaction.auto_categorized = True
                
                # Set category-specific defaults
                category_info = self.category_mappings.get(vendor_info["category"], {})
                deductible_pct = category_info.get("deductible_percentage", 100)
                transaction.deductible_amount = transaction.amount * (Decimal(str(deductible_pct)) / 100)
        
        # Final fallback - keyword-based categorization
        if not transaction.auto_categorized:
            transaction = self._keyword_based_categorization(transaction)
        
        # Add compliance flags
        transaction = self._add_compliance_flags(transaction)
        
        return transaction
    
    def _calculate_rule_confidence(self, transaction: ExpenseTransaction, rule: ExpenseRule) -> Decimal:
        """Calculate confidence score for a rule match"""
        
        confidence_factors = []
        
        # Vendor name matching
        vendor_match = False
        for pattern in rule.vendor_patterns:
            if re.search(pattern, transaction.vendor_name.upper()):
                vendor_match = True
                confidence_factors.append(Decimal('0.4'))  # 40% weight for vendor match
                break
        
        # Description keyword matching
        description_match = False
        for keyword in rule.description_keywords:
            if keyword.lower() in transaction.description.lower():
                description_match = True
                confidence_factors.append(Decimal('0.3'))  # 30% weight for description match
                break
        
        # Amount range matching
        if rule.amount_range:
            min_amount, max_amount = rule.amount_range
            if min_amount <= transaction.amount <= max_amount:
                confidence_factors.append(Decimal('0.2'))  # 20% weight for amount match
        
        # Base confidence from rule
        if vendor_match or description_match:
            confidence_factors.append(Decimal('0.1'))  # 10% base confidence
        
        return sum(confidence_factors) * rule.confidence_score
    
    def _lookup_vendor_info(self, vendor_name: str) -> Optional[Dict[str, Any]]:
        """Look up vendor in database"""
        
        vendor_upper = vendor_name.upper()
        
        for vendor_key, vendor_info in self.vendor_database.items():
            if vendor_key in vendor_upper:
                return vendor_info
        
        return None
    
    def _keyword_based_categorization(self, transaction: ExpenseTransaction) -> ExpenseTransaction:
        """Fallback keyword-based categorization using ML keywords"""
        
        text_to_analyze = f"{transaction.vendor_name} {transaction.description}".lower()
        
        category_scores = defaultdict(int)
        
        for category_key, keywords in self.ml_keywords.items():
            for keyword in keywords:
                if keyword in text_to_analyze:
                    category_scores[category_key] += 1
        
        if category_scores:
            best_category = max(category_scores.items(), key=lambda x: x[1])[0]
            
            # Map ML categories to expense categories
            category_mapping = {
                "technology": ExpenseCategory.SOFTWARE_SUBSCRIPTIONS,
                "food_beverage": ExpenseCategory.TRAVEL_MEALS,
                "travel": ExpenseCategory.VEHICLE_TRANSPORTATION,
                "office": ExpenseCategory.OFFICE_EXPENSES,
                "professional": ExpenseCategory.PROFESSIONAL_SERVICES,
                "marketing": ExpenseCategory.MARKETING_ADVERTISING,
                "utilities": ExpenseCategory.UTILITIES
            }
            
            if best_category in category_mapping:
                transaction.category = category_mapping[best_category]
                transaction.confidence_score = Decimal('0.5')
                transaction.auto_categorized = True
                
                # Set deductible amount based on category
                category_info = self.category_mappings.get(transaction.category, {})
                deductible_pct = category_info.get("deductible_percentage", 100)
                transaction.deductible_amount = transaction.amount * (Decimal(str(deductible_pct)) / 100)
        
        return transaction
    
    def _add_compliance_flags(self, transaction: ExpenseTransaction) -> ExpenseTransaction:
        """Add compliance and review flags"""
        
        flags = []
        
        # Large amount flag
        if transaction.amount > Decimal('1000'):
            flags.append("large_amount")
        
        # Missing receipt flag
        if not transaction.has_receipt and transaction.amount > Decimal('75'):
            flags.append("missing_receipt")
        
        # Missing business purpose flag
        category_info = self.category_mappings.get(transaction.category, {})
        if category_info.get("requires_business_purpose", False) and not transaction.business_purpose:
            flags.append("missing_business_purpose")
        
        # Round number flag (potentially personal)
        if transaction.amount % 10 == 0 and transaction.amount > Decimal('100'):
            flags.append("round_number")
        
        # Weekend/holiday flag for certain categories
        if transaction.date.weekday() >= 5:  # Saturday or Sunday
            if transaction.category in [ExpenseCategory.OFFICE_EXPENSES, ExpenseCategory.PROFESSIONAL_SERVICES]:
                flags.append("weekend_expense")
        
        # Low confidence categorization flag
        if transaction.confidence_score < Decimal('0.7'):
            flags.append("low_confidence")
        
        transaction.flags = flags
        
        # Set approval requirement
        if any(flag in ["large_amount", "missing_receipt", "low_confidence"] for flag in flags):
            transaction.needs_approval = True
        
        return transaction
    
    def create_expense_rule(self, transactions: List[ExpenseTransaction],
                          category: ExpenseCategory,
                          subcategory: str) -> ExpenseRule:
        """Create a new categorization rule based on transaction patterns"""
        
        # Analyze transaction patterns
        vendor_patterns = []
        description_keywords = []
        amount_ranges = []
        
        for transaction in transactions:
            if transaction.vendor_name:
                vendor_patterns.append(transaction.vendor_name.upper())
            
            # Extract keywords from description
            description_words = transaction.description.lower().split()
            description_keywords.extend(description_words)
            
            amount_ranges.append(transaction.amount)
        
        # Create consolidated patterns
        unique_vendors = list(set(vendor_patterns))
        common_keywords = [word for word in set(description_keywords) 
                          if description_keywords.count(word) >= len(transactions) * 0.3]
        
        # Calculate amount range
        if amount_ranges:
            min_amount = min(amount_ranges)
            max_amount = max(amount_ranges)
            amount_range = (min_amount * Decimal('0.8'), max_amount * Decimal('1.2'))
        else:
            amount_range = None
        
        # Create rule
        rule = ExpenseRule(
            name=f"Custom Rule - {category.value.replace('_', ' ').title()}",
            vendor_patterns=[f".*{vendor}.*" for vendor in unique_vendors[:5]],
            description_keywords=common_keywords[:10],
            amount_range=amount_range,
            category=category,
            subcategory=subcategory,
            confidence_score=Decimal('0.8')
        )
        
        return rule

class ReceiptOCRProcessor:
    """OCR processing for receipt data extraction"""
    
    def __init__(self):
        self.supported_formats = ['jpg', 'jpeg', 'png', 'pdf', 'tiff']
    
    async def process_receipt(self, receipt_data: bytes, 
                            file_format: str = 'jpg') -> Dict[str, Any]:
        """Process receipt image and extract structured data"""
        
        try:
            # Convert to PIL Image
            image = Image.open(io.BytesIO(receipt_data))
            
            # Preprocess image for better OCR
            processed_image = self._preprocess_image(image)
            
            # Extract text using OCR
            ocr_text = pytesseract.image_to_string(processed_image)
            
            # Parse structured data from OCR text
            receipt_data = self._parse_receipt_text(ocr_text)
            
            # Extract line items
            line_items = self._extract_line_items(ocr_text)
            
            result = {
                "raw_text": ocr_text,
                "structured_data": receipt_data,
                "line_items": line_items,
                "success": True,
                "confidence": self._calculate_ocr_confidence(ocr_text)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            return {
                "raw_text": "",
                "structured_data": {},
                "line_items": [],
                "success": False,
                "error": str(e),
                "confidence": 0.0
            }
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR accuracy"""
        
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Convert to numpy array for OpenCV processing
        img_array = np.array(image)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(img_array, (5, 5), 0)
        
        # Apply adaptive thresholding
        threshold = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Convert back to PIL Image
        processed_image = Image.fromarray(threshold)
        
        return processed_image
    
    def _parse_receipt_text(self, ocr_text: str) -> Dict[str, Any]:
        """Parse structured data from OCR text"""
        
        lines = ocr_text.split('\n')
        receipt_data = {}
        
        # Extract vendor name (usually first meaningful line)
        for line in lines:
            if line.strip() and len(line.strip()) > 3:
                receipt_data['vendor_name'] = line.strip()
                break
        
        # Extract date patterns
        date_patterns = [
            r'\d{1,2}\/\d{1,2}\/\d{4}',
            r'\d{1,2}-\d{1,2}-\d{4}',
            r'\d{4}-\d{1,2}-\d{1,2}'
        ]
        
        for line in lines:
            for pattern in date_patterns:
                match = re.search(pattern, line)
                if match:
                    receipt_data['date'] = match.group()
                    break
        
        # Extract total amount
        amount_patterns = [
            r'TOTAL[\s:]*\$?(\d+\.\d{2})',
            r'AMOUNT[\s:]*\$?(\d+\.\d{2})',
            r'\$(\d+\.\d{2})[\s]*TOTAL',
        ]
        
        for line in lines:
            for pattern in amount_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    receipt_data['total_amount'] = Decimal(match.group(1))
                    break
        
        # Extract tax amount
        tax_patterns = [
            r'TAX[\s:]*\$?(\d+\.\d{2})',
            r'SALES TAX[\s:]*\$?(\d+\.\d{2})'
        ]
        
        for line in lines:
            for pattern in tax_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    receipt_data['tax_amount'] = Decimal(match.group(1))
                    break
        
        return receipt_data
    
    def _extract_line_items(self, ocr_text: str) -> List[Dict[str, Any]]:
        """Extract individual line items from receipt"""
        
        lines = ocr_text.split('\n')
        line_items = []
        
        # Pattern to match line items (description + amount)
        item_pattern = r'(.+?)\s+\$?(\d+\.\d{2})$'
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            match = re.search(item_pattern, line)
            if match:
                description = match.group(1).strip()
                amount = Decimal(match.group(2))
                
                # Filter out likely non-item lines
                skip_keywords = ['total', 'tax', 'subtotal', 'change', 'payment']
                if not any(keyword in description.lower() for keyword in skip_keywords):
                    line_items.append({
                        'description': description,
                        'amount': amount
                    })
        
        return line_items
    
    def _calculate_ocr_confidence(self, ocr_text: str) -> float:
        """Calculate confidence score for OCR results"""
        
        # Basic confidence calculation based on text characteristics
        confidence_factors = []
        
        # Text length factor
        if len(ocr_text) > 50:
            confidence_factors.append(0.3)
        
        # Presence of amount patterns
        if re.search(r'\$\d+\.\d{2}', ocr_text):
            confidence_factors.append(0.3)
        
        # Presence of date patterns
        if re.search(r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}', ocr_text):
            confidence_factors.append(0.2)
        
        # Word ratio (alphabetic characters vs total)
        alpha_chars = sum(1 for c in ocr_text if c.isalpha())
        total_chars = len(ocr_text.replace(' ', ''))
        if total_chars > 0 and alpha_chars / total_chars > 0.5:
            confidence_factors.append(0.2)
        
        return min(sum(confidence_factors), 1.0)

class ExpenseReportGenerator:
    """Comprehensive expense reporting and analysis"""
    
    def __init__(self):
        self.report_templates = self._load_report_templates()
    
    def _load_report_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load report templates for different purposes"""
        
        return {
            "tax_summary": {
                "name": "Tax Deduction Summary",
                "description": "Summary of deductible expenses for tax purposes",
                "sections": [
                    "category_totals",
                    "deductible_amounts",
                    "documentation_status",
                    "recommendations"
                ]
            },
            
            "monthly_analysis": {
                "name": "Monthly Expense Analysis",
                "description": "Detailed monthly expense breakdown and trends",
                "sections": [
                    "monthly_totals",
                    "category_breakdown",
                    "year_over_year_comparison",
                    "budget_variance",
                    "recommendations"
                ]
            },
            
            "compliance_review": {
                "name": "Compliance Review Report",
                "description": "Review of expense compliance and documentation",
                "sections": [
                    "flagged_transactions",
                    "missing_documentation",
                    "approval_status",
                    "recommendations"
                ]
            },
            
            "budget_variance": {
                "name": "Budget Variance Report",
                "description": "Analysis of actual vs budgeted expenses",
                "sections": [
                    "budget_comparison",
                    "variance_analysis",
                    "trend_analysis",
                    "forecasting"
                ]
            }
        }
    
    def generate_expense_report(self, transactions: List[ExpenseTransaction],
                              start_date: date, end_date: date,
                              report_type: str = "monthly_analysis",
                              marginal_tax_rate: Decimal = Decimal('0.25')) -> ExpenseReport:
        """Generate comprehensive expense report"""
        
        # Filter transactions by date range
        filtered_transactions = [
            t for t in transactions 
            if start_date <= t.date <= end_date
        ]
        
        report = ExpenseReport(
            name=f"{report_type.replace('_', ' ').title()} - {start_date} to {end_date}",
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            marginal_tax_rate=marginal_tax_rate
        )
        
        # Calculate totals
        report.total_expenses = sum(t.amount for t in filtered_transactions)
        report.total_deductible = sum(t.deductible_amount for t in filtered_transactions)
        report.total_non_deductible = report.total_expenses - report.total_deductible
        
        # Calculate category breakdowns
        category_totals = defaultdict(Decimal)
        deductible_by_category = defaultdict(Decimal)
        
        for transaction in filtered_transactions:
            category_key = transaction.category.value
            category_totals[category_key] += transaction.amount
            deductible_by_category[category_key] += transaction.deductible_amount
        
        report.category_totals = dict(category_totals)
        report.deductible_by_category = dict(deductible_by_category)
        
        # Calculate tax savings estimate
        report.tax_savings_estimate = report.total_deductible * marginal_tax_rate
        
        # Identify compliance issues
        report.missing_receipts = [
            t.transaction_id for t in filtered_transactions
            if "missing_receipt" in t.flags
        ]
        
        report.missing_business_purpose = [
            t.transaction_id for t in filtered_transactions
            if "missing_business_purpose" in t.flags
        ]
        
        report.flagged_transactions = [
            t.transaction_id for t in filtered_transactions
            if t.flags
        ]
        
        # Generate spending trends
        report.spending_trends = self._analyze_spending_trends(filtered_transactions)
        
        # Generate recommendations
        report.recommendations = self._generate_recommendations(filtered_transactions, report)
        
        return report
    
    def _analyze_spending_trends(self, transactions: List[ExpenseTransaction]) -> Dict[str, Any]:
        """Analyze spending trends and patterns"""
        
        trends = {}
        
        # Monthly spending by category
        monthly_spending = defaultdict(lambda: defaultdict(Decimal))
        
        for transaction in transactions:
            month_key = f"{transaction.date.year}-{transaction.date.month:02d}"
            category_key = transaction.category.value
            monthly_spending[month_key][category_key] += transaction.amount
        
        trends["monthly_by_category"] = dict(monthly_spending)
        
        # Average transaction size by category
        category_amounts = defaultdict(list)
        for transaction in transactions:
            category_amounts[transaction.category.value].append(transaction.amount)
        
        avg_by_category = {
            category: sum(amounts) / len(amounts)
            for category, amounts in category_amounts.items()
        }
        trends["average_amount_by_category"] = avg_by_category
        
        # Day of week spending patterns
        dow_spending = defaultdict(Decimal)
        for transaction in transactions:
            dow = transaction.date.strftime('%A')
            dow_spending[dow] += transaction.amount
        
        trends["day_of_week_spending"] = dict(dow_spending)
        
        # Top vendors by spending
        vendor_spending = defaultdict(Decimal)
        for transaction in transactions:
            if transaction.vendor_name:
                vendor_spending[transaction.vendor_name] += transaction.amount
        
        top_vendors = sorted(vendor_spending.items(), key=lambda x: x[1], reverse=True)[:10]
        trends["top_vendors"] = dict(top_vendors)
        
        return trends
    
    def _generate_recommendations(self, transactions: List[ExpenseTransaction],
                                report: ExpenseReport) -> List[str]:
        """Generate actionable recommendations based on expense analysis"""
        
        recommendations = []
        
        # Documentation recommendations
        if report.missing_receipts:
            recommendations.append(
                f"Upload receipts for {len(report.missing_receipts)} transactions to ensure tax deductibility"
            )
        
        if report.missing_business_purpose:
            recommendations.append(
                f"Add business purpose descriptions for {len(report.missing_business_purpose)} transactions"
            )
        
        # Spending optimization recommendations
        largest_category = max(report.category_totals.items(), key=lambda x: x[1])
        recommendations.append(
            f"Review {largest_category[0].replace('_', ' ')} expenses (${largest_category[1]:,.2f}) for potential savings"
        )
        
        # Tax optimization recommendations
        if report.total_deductible > 0:
            recommendations.append(
                f"Estimated tax savings: ${report.tax_savings_estimate:,.2f} - ensure all deductions are properly documented"
            )
        
        # Compliance recommendations
        flagged_count = len(report.flagged_transactions)
        if flagged_count > len(transactions) * 0.1:  # More than 10% flagged
            recommendations.append(
                f"{flagged_count} transactions need review - implement better expense approval workflows"
            )
        
        # Category-specific recommendations
        meal_expenses = report.category_totals.get(ExpenseCategory.TRAVEL_MEALS.value, Decimal('0'))
        if meal_expenses > report.total_expenses * Decimal('0.1'):  # More than 10% on meals
            recommendations.append(
                "High meal expenses - ensure business purpose is documented for all meals (50% deductible)"
            )
        
        return recommendations
    
    def export_report(self, report: ExpenseReport, format: str = "json") -> str:
        """Export report in various formats"""
        
        if format == "json":
            # Convert Decimal to float for JSON serialization
            report_dict = self._convert_decimals_to_float(report.__dict__)
            return json.dumps(report_dict, indent=2, default=str)
        
        elif format == "csv":
            # Create CSV format for category breakdown
            csv_lines = ["Category,Total Amount,Deductible Amount,Tax Savings"]
            
            for category, amount in report.category_totals.items():
                deductible = report.deductible_by_category.get(category, Decimal('0'))
                tax_savings = deductible * report.marginal_tax_rate
                
                csv_lines.append(f"{category},{amount},{deductible},{tax_savings}")
            
            return '\n'.join(csv_lines)
        
        elif format == "summary":
            # Generate executive summary
            summary_lines = [
                f"Expense Report Summary: {report.name}",
                f"Period: {report.start_date} to {report.end_date}",
                f"",
                f"Total Expenses: ${report.total_expenses:,.2f}",
                f"Total Deductible: ${report.total_deductible:,.2f}",
                f"Estimated Tax Savings: ${report.tax_savings_estimate:,.2f}",
                f"",
                f"Top Categories:"
            ]
            
            sorted_categories = sorted(
                report.category_totals.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            
            for category, amount in sorted_categories[:5]:
                percentage = (amount / report.total_expenses) * 100
                summary_lines.append(f"  {category.replace('_', ' ').title()}: ${amount:,.2f} ({percentage:.1f}%)")
            
            if report.recommendations:
                summary_lines.extend(["", "Key Recommendations:"])
                for rec in report.recommendations[:3]:
                    summary_lines.append(f"  • {rec}")
            
            return '\n'.join(summary_lines)
        
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def _convert_decimals_to_float(self, obj):
        """Convert Decimal objects to float for JSON serialization"""
        
        if isinstance(obj, dict):
            return {key: self._convert_decimals_to_float(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_decimals_to_float(item) for item in obj]
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (date, datetime)):
            return obj.isoformat()
        else:
            return obj

if __name__ == "__main__":
    # Example usage
    async def test_expense_automation():
        # Test expense categorization
        categorizer = ExpenseCategorizationEngine()
        
        sample_transaction = ExpenseTransaction(
            vendor_name="MICROSOFT CORPORATION",
            description="Office 365 Business Premium",
            amount=Decimal('29.99'),
            date=date.today()
        )
        
        categorized_transaction = categorizer.categorize_expense(sample_transaction)
        
        print(f"Transaction categorized:")
        print(f"  Vendor: {categorized_transaction.vendor_name}")
        print(f"  Category: {categorized_transaction.category.value}")
        print(f"  Subcategory: {categorized_transaction.subcategory}")
        print(f"  Deductible Amount: ${categorized_transaction.deductible_amount}")
        print(f"  Confidence: {categorized_transaction.confidence_score}")
        
        # Test report generation
        report_generator = ExpenseReportGenerator()
        
        sample_transactions = [categorized_transaction]
        for i in range(10):
            sample_transactions.append(ExpenseTransaction(
                vendor_name=f"Sample Vendor {i}",
                description=f"Business expense {i}",
                amount=Decimal(str(100 + i * 10)),
                date=date.today() - timedelta(days=i),
                category=ExpenseCategory.OFFICE_EXPENSES,
                deductible_amount=Decimal(str(100 + i * 10))
            ))
        
        report = report_generator.generate_expense_report(
            sample_transactions,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        print(f"\nExpense Report Generated:")
        print(f"  Total Expenses: ${report.total_expenses}")
        print(f"  Total Deductible: ${report.total_deductible}")
        print(f"  Estimated Tax Savings: ${report.tax_savings_estimate}")
        print(f"  Recommendations: {len(report.recommendations)}")

    # Run test
    asyncio.run(test_expense_automation())
