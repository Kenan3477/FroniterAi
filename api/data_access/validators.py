"""
Data Validation System

Comprehensive validation framework for all data access operations with
support for custom validators, business rules, and data integrity checks.
"""

import re
from typing import Any, Dict, List, Optional, Callable, Union, Type
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from abc import ABC, abstractmethod
import logging

from .exceptions import ValidationException
from .models import BaseModel

logger = logging.getLogger(__name__)

class ValidationRule:
    """Individual validation rule"""
    
    def __init__(
        self,
        validator: Callable[[Any], bool],
        message: str,
        error_code: str = None
    ):
        self.validator = validator
        self.message = message
        self.error_code = error_code or "VALIDATION_FAILED"
    
    def validate(self, value: Any) -> bool:
        """Execute the validation rule"""
        try:
            return self.validator(value)
        except Exception as e:
            logger.warning(f"Validation rule execution failed: {e}")
            return False

class FieldValidator:
    """Validator for a specific field"""
    
    def __init__(self, field_name: str):
        self.field_name = field_name
        self.rules: List[ValidationRule] = []
        self.required = False
        self.allow_none = True
    
    def add_rule(self, rule: ValidationRule) -> 'FieldValidator':
        """Add a validation rule"""
        self.rules.append(rule)
        return self
    
    def is_required(self) -> 'FieldValidator':
        """Mark field as required"""
        self.required = True
        self.allow_none = False
        return self
    
    def is_optional(self) -> 'FieldValidator':
        """Mark field as optional"""
        self.required = False
        self.allow_none = True
        return self
    
    def not_null(self) -> 'FieldValidator':
        """Field cannot be None"""
        self.allow_none = False
        return self
    
    def validate(self, value: Any) -> List[str]:
        """Validate field value and return list of errors"""
        errors = []
        
        # Check if required
        if self.required and (value is None or value == ""):
            errors.append(f"{self.field_name} is required")
            return errors
        
        # Check if None is allowed
        if not self.allow_none and value is None:
            errors.append(f"{self.field_name} cannot be null")
            return errors
        
        # Skip validation if value is None and None is allowed
        if value is None and self.allow_none:
            return errors
        
        # Apply validation rules
        for rule in self.rules:
            if not rule.validate(value):
                errors.append(rule.message)
        
        return errors

class BaseValidator(ABC):
    """Base validator class for data models"""
    
    def __init__(self):
        self.field_validators: Dict[str, FieldValidator] = {}
        self.business_rules: List[Callable[[Dict[str, Any]], List[str]]] = []
        self._setup_validators()
    
    @abstractmethod
    def _setup_validators(self):
        """Setup field validators (to be implemented by subclasses)"""
        pass
    
    def add_field_validator(self, field_name: str) -> FieldValidator:
        """Add a field validator"""
        validator = FieldValidator(field_name)
        self.field_validators[field_name] = validator
        return validator
    
    def add_business_rule(self, rule: Callable[[Dict[str, Any]], List[str]]):
        """Add a business rule validator"""
        self.business_rules.append(rule)
    
    def validate(self, data: Dict[str, Any], model_name: str = None) -> None:
        """Validate data and raise ValidationException if errors found"""
        errors = self.get_validation_errors(data)
        
        if errors:
            raise ValidationException(
                message="Validation failed",
                field_errors=errors,
                model_name=model_name or self.__class__.__name__
            )
    
    def get_validation_errors(self, data: Dict[str, Any]) -> Dict[str, List[str]]:
        """Get all validation errors without raising exception"""
        field_errors = {}
        
        # Validate individual fields
        for field_name, validator in self.field_validators.items():
            value = data.get(field_name)
            errors = validator.validate(value)
            
            if errors:
                field_errors[field_name] = errors
        
        # Apply business rules
        for rule in self.business_rules:
            try:
                rule_errors = rule(data)
                if rule_errors:
                    # Business rule errors go to a special field
                    if "business_rules" not in field_errors:
                        field_errors["business_rules"] = []
                    field_errors["business_rules"].extend(rule_errors)
            except Exception as e:
                logger.error(f"Business rule validation failed: {e}")
                if "business_rules" not in field_errors:
                    field_errors["business_rules"] = []
                field_errors["business_rules"].append("Business rule validation error")
        
        return field_errors
    
    def is_valid(self, data: Dict[str, Any]) -> bool:
        """Check if data is valid"""
        return not bool(self.get_validation_errors(data))

# Common validation functions
class CommonValidators:
    """Common validation functions"""
    
    @staticmethod
    def email(value: str) -> bool:
        """Validate email format"""
        if not isinstance(value, str):
            return False
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, value))
    
    @staticmethod
    def phone(value: str) -> bool:
        """Validate phone number format"""
        if not isinstance(value, str):
            return False
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', value)
        return 10 <= len(digits) <= 15
    
    @staticmethod
    def min_length(min_len: int) -> Callable[[str], bool]:
        """Create minimum length validator"""
        def validator(value: str) -> bool:
            return isinstance(value, str) and len(value) >= min_len
        return validator
    
    @staticmethod
    def max_length(max_len: int) -> Callable[[str], bool]:
        """Create maximum length validator"""
        def validator(value: str) -> bool:
            return isinstance(value, str) and len(value) <= max_len
        return validator
    
    @staticmethod
    def length_range(min_len: int, max_len: int) -> Callable[[str], bool]:
        """Create length range validator"""
        def validator(value: str) -> bool:
            return isinstance(value, str) and min_len <= len(value) <= max_len
        return validator
    
    @staticmethod
    def numeric_range(min_val: Union[int, float], max_val: Union[int, float]) -> Callable[[Union[int, float]], bool]:
        """Create numeric range validator"""
        def validator(value: Union[int, float]) -> bool:
            return isinstance(value, (int, float)) and min_val <= value <= max_val
        return validator
    
    @staticmethod
    def positive_number(value: Union[int, float]) -> bool:
        """Validate positive number"""
        return isinstance(value, (int, float)) and value > 0
    
    @staticmethod
    def non_negative_number(value: Union[int, float]) -> bool:
        """Validate non-negative number"""
        return isinstance(value, (int, float)) and value >= 0
    
    @staticmethod
    def in_choices(choices: List[Any]) -> Callable[[Any], bool]:
        """Create choice validator"""
        def validator(value: Any) -> bool:
            return value in choices
        return validator
    
    @staticmethod
    def regex_pattern(pattern: str) -> Callable[[str], bool]:
        """Create regex pattern validator"""
        compiled_pattern = re.compile(pattern)
        def validator(value: str) -> bool:
            return isinstance(value, str) and bool(compiled_pattern.match(value))
        return validator
    
    @staticmethod
    def url(value: str) -> bool:
        """Validate URL format"""
        if not isinstance(value, str):
            return False
        pattern = r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w)*)?)?)$'
        return bool(re.match(pattern, value))
    
    @staticmethod
    def currency_code(value: str) -> bool:
        """Validate ISO currency code"""
        if not isinstance(value, str):
            return False
        return len(value) == 3 and value.isupper() and value.isalpha()
    
    @staticmethod
    def json_object(value: Any) -> bool:
        """Validate that value is a valid JSON object (dict)"""
        return isinstance(value, dict)
    
    @staticmethod
    def json_array(value: Any) -> bool:
        """Validate that value is a valid JSON array (list)"""
        return isinstance(value, list)
    
    @staticmethod
    def uuid_string(value: str) -> bool:
        """Validate UUID string format"""
        if not isinstance(value, str):
            return False
        try:
            import uuid
            uuid.UUID(value)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def decimal_precision(max_digits: int, decimal_places: int) -> Callable[[Union[str, Decimal, float]], bool]:
        """Create decimal precision validator"""
        def validator(value: Union[str, Decimal, float]) -> bool:
            try:
                if isinstance(value, float):
                    decimal_value = Decimal(str(value))
                elif isinstance(value, str):
                    decimal_value = Decimal(value)
                elif isinstance(value, Decimal):
                    decimal_value = value
                else:
                    return False
                
                # Check total digits and decimal places
                sign, digits, exponent = decimal_value.as_tuple()
                total_digits = len(digits)
                
                if exponent >= 0:
                    decimal_places_actual = 0
                else:
                    decimal_places_actual = -exponent
                
                return (total_digits <= max_digits and 
                        decimal_places_actual <= decimal_places)
            
            except (InvalidOperation, ValueError):
                return False
        
        return validator

class UserValidator(BaseValidator):
    """Validator for User model"""
    
    def _setup_validators(self):
        # Username validation
        self.add_field_validator("username") \
            .is_required() \
            .add_rule(ValidationRule(
                CommonValidators.length_range(3, 50),
                "Username must be between 3 and 50 characters"
            )) \
            .add_rule(ValidationRule(
                CommonValidators.regex_pattern(r'^[a-zA-Z0-9_.-]+$'),
                "Username can only contain letters, numbers, dots, hyphens, and underscores"
            ))
        
        # Email validation
        self.add_field_validator("email") \
            .is_required() \
            .add_rule(ValidationRule(
                CommonValidators.email,
                "Invalid email format"
            ))
        
        # Password validation (for creation)
        self.add_field_validator("password") \
            .add_rule(ValidationRule(
                CommonValidators.min_length(8),
                "Password must be at least 8 characters long"
            ))
        
        # Full name validation
        self.add_field_validator("full_name") \
            .add_rule(ValidationRule(
                CommonValidators.max_length(255),
                "Full name cannot exceed 255 characters"
            ))
        
        # Phone number validation
        self.add_field_validator("phone_number") \
            .add_rule(ValidationRule(
                CommonValidators.phone,
                "Invalid phone number format"
            ))
        
        # Subscription tier validation
        self.add_field_validator("subscription_tier") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['basic', 'professional', 'enterprise']),
                "Invalid subscription tier"
            ))
        
        # Timezone validation
        self.add_field_validator("timezone") \
            .add_rule(ValidationRule(
                CommonValidators.max_length(50),
                "Timezone cannot exceed 50 characters"
            ))
        
        # Business rule: Email and username uniqueness (handled at repository level)
        def check_business_rules(data: Dict[str, Any]) -> List[str]:
            errors = []
            
            # Check roles format
            roles = data.get("roles", [])
            if not isinstance(roles, list):
                errors.append("Roles must be a list")
            elif roles and not all(isinstance(role, str) for role in roles):
                errors.append("All roles must be strings")
            
            # Check permissions format
            permissions = data.get("permissions", [])
            if not isinstance(permissions, list):
                errors.append("Permissions must be a list")
            
            return errors
        
        self.add_business_rule(check_business_rules)

class CompanyValidator(BaseValidator):
    """Validator for Company model"""
    
    def _setup_validators(self):
        # Company name validation
        self.add_field_validator("name") \
            .is_required() \
            .add_rule(ValidationRule(
                CommonValidators.length_range(1, 255),
                "Company name must be between 1 and 255 characters"
            ))
        
        # Legal name validation
        self.add_field_validator("legal_name") \
            .add_rule(ValidationRule(
                CommonValidators.max_length(255),
                "Legal name cannot exceed 255 characters"
            ))
        
        # Legal structure validation
        self.add_field_validator("legal_structure") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices([
                    'LLC', 'Corporation', 'Partnership', 'Sole Proprietorship',
                    'Limited Partnership', 'S-Corp', 'C-Corp', 'Non-Profit'
                ]),
                "Invalid legal structure"
            ))
        
        # Website validation
        self.add_field_validator("website") \
            .add_rule(ValidationRule(
                CommonValidators.url,
                "Invalid website URL format"
            ))
        
        # Email validation
        self.add_field_validator("email") \
            .add_rule(ValidationRule(
                CommonValidators.email,
                "Invalid email format"
            ))
        
        # Phone validation
        self.add_field_validator("phone") \
            .add_rule(ValidationRule(
                CommonValidators.phone,
                "Invalid phone number format"
            ))
        
        # Size validation
        self.add_field_validator("size") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['startup', 'small', 'medium', 'large', 'enterprise']),
                "Invalid company size"
            ))
        
        # Currency validation
        self.add_field_validator("base_currency") \
            .add_rule(ValidationRule(
                CommonValidators.currency_code,
                "Invalid currency code"
            ))
        
        # Business rule validation
        def check_business_rules(data: Dict[str, Any]) -> List[str]:
            errors = []
            
            # Check address format
            address = data.get("address")
            if address is not None and not isinstance(address, dict):
                errors.append("Address must be a JSON object")
            
            # Check tags format
            tags = data.get("tags", [])
            if not isinstance(tags, list):
                errors.append("Tags must be a list")
            
            return errors
        
        self.add_business_rule(check_business_rules)

class FinancialValidator(BaseValidator):
    """Validator for Financial models"""
    
    def _setup_validators(self):
        # Statement type validation
        self.add_field_validator("statement_type") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices([
                    'balance_sheet', 'income_statement', 'cash_flow_statement'
                ]),
                "Invalid statement type"
            ))
        
        # Period type validation
        self.add_field_validator("period_type") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['annual', 'quarterly', 'monthly']),
                "Invalid period type"
            ))
        
        # Currency validation
        self.add_field_validator("currency") \
            .add_rule(ValidationRule(
                CommonValidators.currency_code,
                "Invalid currency code"
            ))
        
        # Fiscal year validation
        self.add_field_validator("fiscal_year") \
            .add_rule(ValidationRule(
                CommonValidators.numeric_range(1900, 2100),
                "Fiscal year must be between 1900 and 2100"
            ))
        
        # Fiscal quarter validation
        self.add_field_validator("fiscal_quarter") \
            .add_rule(ValidationRule(
                CommonValidators.numeric_range(1, 4),
                "Fiscal quarter must be between 1 and 4"
            ))
        
        # Business rules
        def check_financial_rules(data: Dict[str, Any]) -> List[str]:
            errors = []
            
            # Check statement data format
            statement_data = data.get("statement_data")
            if statement_data is not None and not isinstance(statement_data, dict):
                errors.append("Statement data must be a JSON object")
            
            # Check period end date
            period_end_date = data.get("period_end_date")
            if period_end_date and isinstance(period_end_date, datetime):
                if period_end_date > datetime.now(timezone.utc):
                    errors.append("Period end date cannot be in the future")
            
            # Check quarterly data consistency
            period_type = data.get("period_type")
            fiscal_quarter = data.get("fiscal_quarter")
            
            if period_type == "quarterly" and not fiscal_quarter:
                errors.append("Fiscal quarter is required for quarterly statements")
            elif period_type != "quarterly" and fiscal_quarter:
                errors.append("Fiscal quarter should only be set for quarterly statements")
            
            return errors
        
        self.add_business_rule(check_financial_rules)

class ComplianceValidator(BaseValidator):
    """Validator for Compliance models"""
    
    def _setup_validators(self):
        # Framework type validation
        self.add_field_validator("framework_type") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['regulatory', 'industry', 'internal']),
                "Invalid framework type"
            ))
        
        # Priority validation
        self.add_field_validator("priority") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['low', 'medium', 'high', 'critical']),
                "Invalid priority level"
            ))
        
        # Complexity validation
        self.add_field_validator("complexity") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['low', 'medium', 'high']),
                "Invalid complexity level"
            ))
        
        # Compliance level validation
        self.add_field_validator("compliance_level") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['compliant', 'partially_compliant', 'non_compliant']),
                "Invalid compliance level"
            ))
        
        # Status validation
        self.add_field_validator("status") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['draft', 'in_progress', 'completed', 'approved']),
                "Invalid status"
            ))

class RiskValidator(BaseValidator):
    """Validator for Risk models"""
    
    def _setup_validators(self):
        # Impact level validation
        self.add_field_validator("impact_level") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['low', 'medium', 'high', 'critical']),
                "Invalid impact level"
            ))
        
        # Probability validation
        self.add_field_validator("probability") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['low', 'medium', 'high']),
                "Invalid probability level"
            ))
        
        # Risk type validation
        self.add_field_validator("risk_type") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['operational', 'financial', 'strategic', 'compliance']),
                "Invalid risk type"
            ))
        
        # Risk score validation
        self.add_field_validator("risk_score") \
            .add_rule(ValidationRule(
                CommonValidators.numeric_range(0, 100),
                "Risk score must be between 0 and 100"
            ))
        
        # Risk level validation
        self.add_field_validator("risk_level") \
            .add_rule(ValidationRule(
                CommonValidators.in_choices(['low', 'medium', 'high', 'critical']),
                "Invalid risk level"
            ))

# Validator factory
class ValidatorFactory:
    """Factory for creating validators"""
    
    _validators = {
        'user': UserValidator,
        'company': CompanyValidator,
        'financial': FinancialValidator,
        'compliance': ComplianceValidator,
        'risk': RiskValidator,
    }
    
    @classmethod
    def get_validator(cls, validator_type: str) -> BaseValidator:
        """Get validator instance by type"""
        validator_class = cls._validators.get(validator_type)
        if not validator_class:
            raise ValueError(f"Unknown validator type: {validator_type}")
        
        return validator_class()
    
    @classmethod
    def register_validator(cls, validator_type: str, validator_class: Type[BaseValidator]):
        """Register a new validator type"""
        cls._validators[validator_type] = validator_class
    
    @classmethod
    def validate_model_data(cls, model_name: str, data: Dict[str, Any]) -> None:
        """Validate data for a specific model"""
        # Map model names to validator types
        model_validator_map = {
            'UserModel': 'user',
            'CompanyModel': 'company',
            'FinancialStatementModel': 'financial',
            'FinancialAnalysisModel': 'financial',
            'ComplianceFrameworkModel': 'compliance',
            'ComplianceRequirementModel': 'compliance',
            'ComplianceAssessmentModel': 'compliance',
            'CompliancePolicyModel': 'compliance',
            'RiskModel': 'risk',
            'RiskCategoryModel': 'risk',
            'RiskAssessmentModel': 'risk',
        }
        
        validator_type = model_validator_map.get(model_name)
        if validator_type:
            validator = cls.get_validator(validator_type)
            validator.validate(data, model_name)
