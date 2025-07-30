"""
Input Validation and Sanitization System

Comprehensive input validation, sanitization, and security measures
to protect against various attack vectors including XSS, SQL injection,
and data validation errors.
"""

import re
import html
import urllib.parse
import json
import bleach
from typing import Any, Dict, List, Optional, Union, Type
from pydantic import BaseModel, Field, validator, ValidationError
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from email_validator import validate_email, EmailNotValidError
import phonenumbers
from phonenumbers import PhoneNumberFormat, NumberParseException

# Allowed HTML tags and attributes for rich text fields
ALLOWED_HTML_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'a', 'img'
]

ALLOWED_HTML_ATTRIBUTES = {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class']
}

# Common SQL injection patterns
SQL_INJECTION_PATTERNS = [
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)",
    r"(--|\#|\/\*|\*\/)",
    r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
    r"(\'\s*(OR|AND)\s*\'.+\')",
    r"(\bEXEC\b|\bEXECUTE\b)",
    r"(\bSP_\w+)",
    r"(\bXP_\w+)"
]

# XSS patterns
XSS_PATTERNS = [
    r"<script[^>]*>.*?</script>",
    r"javascript:",
    r"vbscript:",
    r"onload\s*=",
    r"onerror\s*=",
    r"onclick\s*=",
    r"onmouseover\s*=",
    r"onfocus\s*=",
    r"onblur\s*=",
    r"<iframe[^>]*>.*?</iframe>",
    r"<object[^>]*>.*?</object>",
    r"<embed[^>]*>.*?</embed>"
]

# Path traversal patterns
PATH_TRAVERSAL_PATTERNS = [
    r"\.\.\/",
    r"\.\.\\",
    r"%2e%2e%2f",
    r"%2e%2e%5c",
    r"..%2f",
    r"..%5c"
]


class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message: str, field: str = None, code: str = None):
        self.message = message
        self.field = field
        self.code = code
        super().__init__(message)


class SanitizationConfig:
    """Configuration for input sanitization"""
    
    def __init__(self):
        self.strip_whitespace = True
        self.normalize_unicode = True
        self.escape_html = True
        self.allow_html = False
        self.max_length = None
        self.min_length = None
        self.allowed_characters = None
        self.blocked_patterns = []


class InputSanitizer:
    """Main input sanitization class"""
    
    def __init__(self):
        self.sql_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in SQL_INJECTION_PATTERNS]
        self.xss_patterns = [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in XSS_PATTERNS]
        self.path_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in PATH_TRAVERSAL_PATTERNS]
    
    def sanitize_string(self, value: str, config: SanitizationConfig = None) -> str:
        """Sanitize a string input"""
        if not isinstance(value, str):
            value = str(value)
        
        config = config or SanitizationConfig()
        
        # Strip whitespace
        if config.strip_whitespace:
            value = value.strip()
        
        # Normalize unicode
        if config.normalize_unicode:
            value = value.encode('utf-8', errors='ignore').decode('utf-8')
        
        # Check length limits
        if config.max_length and len(value) > config.max_length:
            raise ValidationError(f"Input exceeds maximum length of {config.max_length}")
        
        if config.min_length and len(value) < config.min_length:
            raise ValidationError(f"Input below minimum length of {config.min_length}")
        
        # Check allowed characters
        if config.allowed_characters:
            allowed_pattern = re.compile(f"[^{re.escape(config.allowed_characters)}]")
            if allowed_pattern.search(value):
                raise ValidationError("Input contains invalid characters")
        
        # Check blocked patterns
        for pattern in config.blocked_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValidationError("Input contains blocked content")
        
        # HTML handling
        if config.allow_html:
            value = self.sanitize_html(value)
        elif config.escape_html:
            value = html.escape(value)
        
        return value
    
    def sanitize_html(self, value: str) -> str:
        """Sanitize HTML content using bleach"""
        return bleach.clean(
            value,
            tags=ALLOWED_HTML_TAGS,
            attributes=ALLOWED_HTML_ATTRIBUTES,
            strip=True
        )
    
    def check_sql_injection(self, value: str) -> bool:
        """Check for SQL injection patterns"""
        for pattern in self.sql_patterns:
            if pattern.search(value):
                return True
        return False
    
    def check_xss(self, value: str) -> bool:
        """Check for XSS patterns"""
        for pattern in self.xss_patterns:
            if pattern.search(value):
                return True
        return False
    
    def check_path_traversal(self, value: str) -> bool:
        """Check for path traversal patterns"""
        for pattern in self.path_patterns:
            if pattern.search(value):
                return True
        return False
    
    def validate_security(self, value: str) -> List[str]:
        """Check for various security threats"""
        threats = []
        
        if self.check_sql_injection(value):
            threats.append("sql_injection")
        
        if self.check_xss(value):
            threats.append("xss")
        
        if self.check_path_traversal(value):
            threats.append("path_traversal")
        
        return threats
    
    def sanitize_dict(self, data: Dict[str, Any], schema: Dict[str, SanitizationConfig] = None) -> Dict[str, Any]:
        """Sanitize dictionary data"""
        sanitized = {}
        schema = schema or {}
        
        for key, value in data.items():
            config = schema.get(key, SanitizationConfig())
            
            if isinstance(value, str):
                sanitized[key] = self.sanitize_string(value, config)
            elif isinstance(value, dict):
                sanitized[key] = self.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self.sanitize_string(item, config) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized


class DataValidator:
    """Advanced data validation"""
    
    def __init__(self):
        self.sanitizer = InputSanitizer()
    
    def validate_email(self, email: str) -> str:
        """Validate and normalize email address"""
        try:
            # Sanitize first
            email = self.sanitizer.sanitize_string(email.lower().strip())
            
            # Validate using email-validator
            valid = validate_email(email)
            return valid.email
        except EmailNotValidError:
            raise ValidationError("Invalid email format", field="email", code="invalid_email")
    
    def validate_phone(self, phone: str, country_code: str = "US") -> str:
        """Validate and format phone number"""
        try:
            # Sanitize first
            phone = self.sanitizer.sanitize_string(phone)
            
            # Parse and validate phone number
            parsed = phonenumbers.parse(phone, country_code)
            
            if not phonenumbers.is_valid_number(parsed):
                raise ValidationError("Invalid phone number", field="phone", code="invalid_phone")
            
            # Return formatted number
            return phonenumbers.format_number(parsed, PhoneNumberFormat.E164)
            
        except NumberParseException:
            raise ValidationError("Invalid phone number format", field="phone", code="invalid_phone_format")
    
    def validate_url(self, url: str) -> str:
        """Validate URL"""
        # Sanitize first
        url = self.sanitizer.sanitize_string(url.strip())
        
        # Basic URL pattern
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if not url_pattern.match(url):
            raise ValidationError("Invalid URL format", field="url", code="invalid_url")
        
        # Check for dangerous protocols
        dangerous_protocols = ['javascript:', 'vbscript:', 'data:', 'file:']
        for protocol in dangerous_protocols:
            if url.lower().startswith(protocol):
                raise ValidationError("Unsafe URL protocol", field="url", code="unsafe_protocol")
        
        return url
    
    def validate_password(self, password: str, min_length: int = 8) -> str:
        """Validate password strength"""
        if len(password) < min_length:
            raise ValidationError(f"Password must be at least {min_length} characters", 
                                field="password", code="password_too_short")
        
        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', password):
            raise ValidationError("Password must contain at least one uppercase letter",
                                field="password", code="password_no_uppercase")
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', password):
            raise ValidationError("Password must contain at least one lowercase letter",
                                field="password", code="password_no_lowercase")
        
        # Check for at least one digit
        if not re.search(r'\d', password):
            raise ValidationError("Password must contain at least one digit",
                                field="password", code="password_no_digit")
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError("Password must contain at least one special character",
                                field="password", code="password_no_special")
        
        return password
    
    def validate_username(self, username: str) -> str:
        """Validate username"""
        # Sanitize first
        username = self.sanitizer.sanitize_string(username.strip().lower())
        
        # Check length
        if len(username) < 3:
            raise ValidationError("Username must be at least 3 characters", 
                                field="username", code="username_too_short")
        
        if len(username) > 30:
            raise ValidationError("Username must be less than 30 characters",
                                field="username", code="username_too_long")
        
        # Check format (alphanumeric + underscore)
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise ValidationError("Username can only contain letters, numbers, and underscores",
                                field="username", code="username_invalid_format")
        
        # Check reserved words
        reserved_words = ['admin', 'root', 'system', 'api', 'www', 'mail', 'test']
        if username in reserved_words:
            raise ValidationError("Username is reserved", 
                                field="username", code="username_reserved")
        
        return username
    
    def validate_currency_amount(self, amount: Union[str, float, Decimal]) -> Decimal:
        """Validate and normalize currency amount"""
        try:
            if isinstance(amount, str):
                # Remove currency symbols and whitespace
                amount = re.sub(r'[^\d\.\-]', '', amount)
                
            decimal_amount = Decimal(str(amount))
            
            # Check for reasonable bounds
            if decimal_amount < 0:
                raise ValidationError("Amount cannot be negative", 
                                    field="amount", code="amount_negative")
            
            if decimal_amount > Decimal('999999999999.99'):
                raise ValidationError("Amount exceeds maximum value",
                                    field="amount", code="amount_too_large")
            
            # Round to 2 decimal places
            return decimal_amount.quantize(Decimal('0.01'))
            
        except (InvalidOperation, ValueError):
            raise ValidationError("Invalid amount format", 
                                field="amount", code="amount_invalid")
    
    def validate_date_string(self, date_string: str, date_format: str = "%Y-%m-%d") -> date:
        """Validate date string"""
        try:
            # Sanitize first
            date_string = self.sanitizer.sanitize_string(date_string.strip())
            
            # Parse date
            parsed_date = datetime.strptime(date_string, date_format).date()
            
            # Check reasonable bounds
            if parsed_date.year < 1900:
                raise ValidationError("Date too far in the past", 
                                    field="date", code="date_too_old")
            
            if parsed_date.year > 2100:
                raise ValidationError("Date too far in the future",
                                    field="date", code="date_too_future")
            
            return parsed_date
            
        except ValueError:
            raise ValidationError(f"Invalid date format, expected {date_format}",
                                field="date", code="date_invalid_format")


# Pydantic models with built-in validation
class UserRegistrationModel(BaseModel):
    """User registration validation model"""
    username: str = Field(..., min_length=3, max_length=30)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    subscription_tier: str = Field(default="basic")
    
    @validator('username')
    def validate_username(cls, v):
        validator = DataValidator()
        return validator.validate_username(v)
    
    @validator('email')
    def validate_email(cls, v):
        validator = DataValidator()
        return validator.validate_email(v)
    
    @validator('password')
    def validate_password(cls, v):
        validator = DataValidator()
        return validator.validate_password(v)
    
    @validator('subscription_tier')
    def validate_subscription_tier(cls, v):
        allowed_tiers = ['basic', 'professional', 'enterprise']
        if v not in allowed_tiers:
            raise ValueError(f"Invalid subscription tier. Must be one of: {allowed_tiers}")
        return v


class FinancialAnalysisModel(BaseModel):
    """Financial analysis input validation"""
    company_name: str = Field(..., min_length=1, max_length=200)
    industry: str = Field(..., min_length=1, max_length=100)
    analysis_period: str = Field(..., min_length=1, max_length=50)
    financial_statements: Dict[str, Any] = Field(...)
    
    @validator('company_name', 'industry', 'analysis_period')
    def sanitize_strings(cls, v):
        sanitizer = InputSanitizer()
        config = SanitizationConfig()
        config.escape_html = True
        return sanitizer.sanitize_string(v, config)
    
    @validator('financial_statements')
    def validate_financial_data(cls, v):
        required_fields = ['balance_sheet', 'income_statement']
        for field in required_fields:
            if field not in v:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate numeric fields
        sanitizer = InputSanitizer()
        sanitized = sanitizer.sanitize_dict(v)
        
        return sanitized


class APIKeyModel(BaseModel):
    """API key creation validation"""
    name: str = Field(..., min_length=1, max_length=100)
    permissions: Optional[List[str]] = Field(default_factory=list)
    
    @validator('name')
    def sanitize_name(cls, v):
        sanitizer = InputSanitizer()
        config = SanitizationConfig()
        config.escape_html = True
        return sanitizer.sanitize_string(v, config)


# Security validation middleware function
def validate_request_security(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate request data for security threats"""
    sanitizer = InputSanitizer()
    threats_found = []
    
    def check_value(value, path=""):
        if isinstance(value, str):
            threats = sanitizer.validate_security(value)
            if threats:
                threats_found.extend([(path, threat) for threat in threats])
        elif isinstance(value, dict):
            for k, v in value.items():
                check_value(v, f"{path}.{k}" if path else k)
        elif isinstance(value, list):
            for i, item in enumerate(value):
                check_value(item, f"{path}[{i}]" if path else f"[{i}]")
    
    check_value(data)
    
    if threats_found:
        raise ValidationError(f"Security threats detected: {threats_found}")
    
    return sanitizer.sanitize_dict(data)


# Global instances
input_sanitizer = InputSanitizer()
data_validator = DataValidator()
