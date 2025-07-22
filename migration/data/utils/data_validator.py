#!/usr/bin/env python3
"""
Data Validation Utilities for Migration
Provides comprehensive data validation, cleansing, and transformation functions
"""

import re
import hashlib
import logging
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime, date
from dataclasses import dataclass
from enum import Enum
import uuid
import phonenumbers
from email_validator import validate_email, EmailNotValidError

logger = logging.getLogger(__name__)

class ValidationSeverity(Enum):
    """Severity levels for validation issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class ValidationIssue:
    """Represents a data validation issue"""
    field_name: str
    issue_type: str
    severity: ValidationSeverity
    message: str
    value: Any
    suggested_fix: Optional[str] = None

@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    issues: List[ValidationIssue]
    cleaned_data: Dict[str, Any]
    original_data: Dict[str, Any]

class BrazilianValidator:
    """Validator for Brazilian-specific data formats"""
    
    @staticmethod
    def validate_cpf(cpf: str) -> bool:
        """Validate Brazilian CPF (individual tax ID)"""
        if not cpf:
            return False
        
        # Remove non-digits
        cpf = re.sub(r'[^0-9]', '', cpf)
        
        # Check length
        if len(cpf) != 11:
            return False
        
        # Check for invalid patterns (all same digits)
        if cpf == cpf[0] * 11:
            return False
        
        # Calculate verification digits
        def calculate_digit(cpf_digits: str, weights: List[int]) -> int:
            total = sum(int(digit) * weight for digit, weight in zip(cpf_digits, weights))
            remainder = total % 11
            return 0 if remainder < 2 else 11 - remainder
        
        # First digit
        first_digit = calculate_digit(cpf[:9], list(range(10, 1, -1)))
        if int(cpf[9]) != first_digit:
            return False
        
        # Second digit
        second_digit = calculate_digit(cpf[:10], list(range(11, 1, -1)))
        if int(cpf[10]) != second_digit:
            return False
        
        return True
    
    @staticmethod
    def validate_cnpj(cnpj: str) -> bool:
        """Validate Brazilian CNPJ (company tax ID)"""
        if not cnpj:
            return False
        
        # Remove non-digits
        cnpj = re.sub(r'[^0-9]', '', cnpj)
        
        # Check length
        if len(cnpj) != 14:
            return False
        
        # Check for invalid patterns
        if cnpj == cnpj[0] * 14:
            return False
        
        # Calculate verification digits
        def calculate_digit(cnpj_digits: str, weights: List[int]) -> int:
            total = sum(int(digit) * weight for digit, weight in zip(cnpj_digits, weights))
            remainder = total % 11
            return 0 if remainder < 2 else 11 - remainder
        
        # First digit
        first_weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        first_digit = calculate_digit(cnpj[:12], first_weights)
        if int(cnpj[12]) != first_digit:
            return False
        
        # Second digit
        second_weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        second_digit = calculate_digit(cnpj[:13], second_weights)
        if int(cnpj[13]) != second_digit:
            return False
        
        return True
    
    @staticmethod
    def format_cpf(cpf: str) -> str:
        """Format CPF with standard formatting"""
        cpf = re.sub(r'[^0-9]', '', cpf)
        if len(cpf) == 11:
            return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"
        return cpf
    
    @staticmethod
    def format_cnpj(cnpj: str) -> str:
        """Format CNPJ with standard formatting"""
        cnpj = re.sub(r'[^0-9]', '', cnpj)
        if len(cnpj) == 14:
            return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
        return cnpj
    
    @staticmethod
    def validate_phone_br(phone: str) -> bool:
        """Validate Brazilian phone number"""
        if not phone:
            return False
        
        try:
            # Parse with Brazil country code
            parsed = phonenumbers.parse(phone, "BR")
            return phonenumbers.is_valid_number(parsed)
        except phonenumbers.phonenumberutil.NumberParseException:
            return False
    
    @staticmethod
    def format_phone_br(phone: str) -> str:
        """Format Brazilian phone number"""
        if not phone:
            return phone
        
        try:
            parsed = phonenumbers.parse(phone, "BR")
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
        except phonenumbers.phonenumberutil.NumberParseException:
            return phone
    
    @staticmethod
    def validate_cep(cep: str) -> bool:
        """Validate Brazilian postal code (CEP)"""
        if not cep:
            return False
        
        # Remove non-digits
        cep = re.sub(r'[^0-9]', '', cep)
        
        # Check length and pattern
        return len(cep) == 8 and cep != '00000000'
    
    @staticmethod
    def format_cep(cep: str) -> str:
        """Format CEP with standard formatting"""
        cep = re.sub(r'[^0-9]', '', cep)
        if len(cep) == 8:
            return f"{cep[:5]}-{cep[5:]}"
        return cep

class DataValidator:
    """Main data validation and cleansing class"""
    
    def __init__(self):
        self.brazilian_validator = BrazilianValidator()
    
    def validate_email(self, email: str) -> Tuple[bool, Optional[str]]:
        """Validate email address"""
        if not email:
            return False, "Email is empty"
        
        try:
            # Validate and get normalized result
            valid = validate_email(email.strip())
            return True, valid.email
        except EmailNotValidError as e:
            return False, str(e)
    
    def validate_url(self, url: str) -> bool:
        """Validate URL format"""
        if not url:
            return False
        
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        return url_pattern.match(url) is not None
    
    def validate_date(self, date_value: Any) -> Tuple[bool, Optional[datetime]]:
        """Validate and parse date value"""
        if not date_value:
            return False, None
        
        # If already a datetime or date object
        if isinstance(date_value, (datetime, date)):
            return True, datetime.combine(date_value, datetime.min.time()) if isinstance(date_value, date) else date_value
        
        # Try to parse string dates
        if isinstance(date_value, str):
            date_formats = [
                '%Y-%m-%d',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d %H:%M:%S.%f',
                '%d/%m/%Y',
                '%d/%m/%Y %H:%M:%S',
                '%Y/%m/%d',
                '%Y/%m/%d %H:%M:%S'
            ]
            
            for fmt in date_formats:
                try:
                    return True, datetime.strptime(date_value.strip(), fmt)
                except ValueError:
                    continue
        
        return False, None
    
    def validate_currency(self, value: Any) -> Tuple[bool, Optional[float]]:
        """Validate and parse currency value"""
        if value is None:
            return True, None
        
        # If already a number
        if isinstance(value, (int, float)):
            return value >= 0, float(value) if value >= 0 else None
        
        # Try to parse string
        if isinstance(value, str):
            # Remove currency symbols and formatting
            cleaned = re.sub(r'[R$\s,.]', '', value.strip())
            if cleaned:
                try:
                    # Handle decimal places (last two digits)
                    if len(cleaned) > 2:
                        amount = float(f"{cleaned[:-2]}.{cleaned[-2:]}")
                    else:
                        amount = float(cleaned) / 100
                    
                    return amount >= 0, amount if amount >= 0 else None
                except ValueError:
                    pass
        
        return False, None
    
    def validate_uuid(self, uuid_value: Any) -> Tuple[bool, Optional[str]]:
        """Validate UUID format"""
        if not uuid_value:
            return False, None
        
        try:
            # Try to parse as UUID
            uuid_obj = uuid.UUID(str(uuid_value))
            return True, str(uuid_obj)
        except (ValueError, TypeError):
            return False, None
    
    def generate_uuid(self) -> str:
        """Generate new UUID"""
        return str(uuid.uuid4())
    
    def validate_enum_value(self, value: Any, valid_values: List[str]) -> Tuple[bool, Optional[str]]:
        """Validate enum value against list of valid options"""
        if not value:
            return False, None
        
        value_str = str(value).strip().upper()
        valid_upper = [v.upper() for v in valid_values]
        
        if value_str in valid_upper:
            # Return original case from valid_values
            index = valid_upper.index(value_str)
            return True, valid_values[index]
        
        return False, None
    
    def clean_text(self, text: Any) -> str:
        """Clean and normalize text data"""
        if not text:
            return ""
        
        # Convert to string and strip whitespace
        cleaned = str(text).strip()
        
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Remove null bytes and control characters
        cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', cleaned)
        
        return cleaned
    
    def validate_record(self, data: Dict[str, Any], table_name: str) -> ValidationResult:
        """Validate a complete record based on table schema"""
        issues = []
        cleaned_data = {}
        
        # Table-specific validation rules
        validation_rules = self._get_validation_rules(table_name)
        
        for field_name, field_rules in validation_rules.items():
            value = data.get(field_name)
            
            # Apply validation rules
            field_issues, cleaned_value = self._validate_field(
                field_name, value, field_rules
            )
            
            issues.extend(field_issues)
            cleaned_data[field_name] = cleaned_value
        
        # Copy fields that don't have specific rules
        for field_name, value in data.items():
            if field_name not in validation_rules:
                cleaned_data[field_name] = value
        
        # Determine if record is valid (no critical or error issues)
        is_valid = not any(
            issue.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]
            for issue in issues
        )
        
        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            cleaned_data=cleaned_data,
            original_data=data.copy()
        )
    
    def _get_validation_rules(self, table_name: str) -> Dict[str, Dict[str, Any]]:
        """Get validation rules for specific table"""
        rules = {
            'users': {
                'email': {'type': 'email', 'required': True},
                'first_name': {'type': 'text', 'max_length': 100},
                'last_name': {'type': 'text', 'max_length': 100},
                'phone': {'type': 'phone_br', 'required': False},
                'created_at': {'type': 'datetime'},
                'updated_at': {'type': 'datetime'}
            },
            'companies': {
                'cnpj': {'type': 'cnpj', 'required': True},
                'legal_name': {'type': 'text', 'required': True, 'max_length': 255},
                'trade_name': {'type': 'text', 'max_length': 255},
                'website': {'type': 'url', 'required': False},
                'contact_email': {'type': 'email', 'required': False},
                'contact_phone': {'type': 'phone_br', 'required': False},
                'annual_revenue': {'type': 'currency', 'min_value': 0},
                'employee_count': {'type': 'integer', 'min_value': 0},
                'address_zip': {'type': 'cep', 'required': False}
            },
            'opportunities': {
                'title': {'type': 'text', 'required': True},
                'estimated_value': {'type': 'currency', 'min_value': 0},
                'publish_date': {'type': 'datetime'},
                'opening_date': {'type': 'datetime'},
                'closing_date': {'type': 'datetime'},
                'source_url': {'type': 'url', 'required': False}
            },
            'proposals': {
                'proposal_value': {'type': 'currency', 'required': True, 'min_value': 0},
                'final_bid_value': {'type': 'currency', 'min_value': 0},
                'technical_score': {'type': 'float', 'min_value': 0, 'max_value': 100},
                'commercial_score': {'type': 'float', 'min_value': 0, 'max_value': 100},
                'compliance_score': {'type': 'float', 'min_value': 0, 'max_value': 100}
            }
        }
        
        return rules.get(table_name, {})
    
    def _validate_field(self, field_name: str, value: Any, rules: Dict[str, Any]) -> Tuple[List[ValidationIssue], Any]:
        """Validate individual field based on rules"""
        issues = []
        cleaned_value = value
        
        field_type = rules.get('type', 'text')
        required = rules.get('required', False)
        
        # Check required fields
        if required and (value is None or value == ''):
            issues.append(ValidationIssue(
                field_name=field_name,
                issue_type='required',
                severity=ValidationSeverity.ERROR,
                message=f"Required field '{field_name}' is empty",
                value=value
            ))
            return issues, None
        
        # Skip validation for empty optional fields
        if not required and (value is None or value == ''):
            return issues, None
        
        # Type-specific validation
        if field_type == 'email':
            is_valid, cleaned_email = self.validate_email(str(value))
            if not is_valid:
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_email',
                    severity=ValidationSeverity.ERROR,
                    message=f"Invalid email format: {cleaned_email}",
                    value=value,
                    suggested_fix="Correct email format"
                ))
            else:
                cleaned_value = cleaned_email
        
        elif field_type == 'phone_br':
            if value and not self.brazilian_validator.validate_phone_br(str(value)):
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_phone',
                    severity=ValidationSeverity.WARNING,
                    message=f"Invalid Brazilian phone number",
                    value=value,
                    suggested_fix="Use format: (11) 99999-9999"
                ))
            else:
                cleaned_value = self.brazilian_validator.format_phone_br(str(value)) if value else None
        
        elif field_type == 'cnpj':
            if value and not self.brazilian_validator.validate_cnpj(str(value)):
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_cnpj',
                    severity=ValidationSeverity.ERROR,
                    message=f"Invalid CNPJ format or check digits",
                    value=value,
                    suggested_fix="Verify CNPJ number"
                ))
            else:
                cleaned_value = self.brazilian_validator.format_cnpj(str(value)) if value else None
        
        elif field_type == 'cpf':
            if value and not self.brazilian_validator.validate_cpf(str(value)):
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_cpf',
                    severity=ValidationSeverity.ERROR,
                    message=f"Invalid CPF format or check digits",
                    value=value,
                    suggested_fix="Verify CPF number"
                ))
            else:
                cleaned_value = self.brazilian_validator.format_cpf(str(value)) if value else None
        
        elif field_type == 'cep':
            if value and not self.brazilian_validator.validate_cep(str(value)):
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_cep',
                    severity=ValidationSeverity.WARNING,
                    message=f"Invalid CEP format",
                    value=value,
                    suggested_fix="Use format: 12345-678"
                ))
            else:
                cleaned_value = self.brazilian_validator.format_cep(str(value)) if value else None
        
        elif field_type == 'url':
            if value and not self.validate_url(str(value)):
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_url',
                    severity=ValidationSeverity.WARNING,
                    message=f"Invalid URL format",
                    value=value,
                    suggested_fix="Use format: https://example.com"
                ))
            else:
                cleaned_value = str(value).strip() if value else None
        
        elif field_type == 'currency':
            is_valid, amount = self.validate_currency(value)
            if not is_valid:
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_currency',
                    severity=ValidationSeverity.ERROR,
                    message=f"Invalid currency value",
                    value=value,
                    suggested_fix="Use numeric value"
                ))
            else:
                cleaned_value = amount
                
                # Check min/max constraints
                min_value = rules.get('min_value')
                max_value = rules.get('max_value')
                
                if min_value is not None and amount is not None and amount < min_value:
                    issues.append(ValidationIssue(
                        field_name=field_name,
                        issue_type='value_too_low',
                        severity=ValidationSeverity.WARNING,
                        message=f"Value {amount} is below minimum {min_value}",
                        value=value
                    ))
                
                if max_value is not None and amount is not None and amount > max_value:
                    issues.append(ValidationIssue(
                        field_name=field_name,
                        issue_type='value_too_high',
                        severity=ValidationSeverity.WARNING,
                        message=f"Value {amount} is above maximum {max_value}",
                        value=value
                    ))
        
        elif field_type == 'datetime':
            is_valid, parsed_date = self.validate_date(value)
            if not is_valid:
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='invalid_date',
                    severity=ValidationSeverity.WARNING,
                    message=f"Invalid date format",
                    value=value,
                    suggested_fix="Use format: YYYY-MM-DD"
                ))
            else:
                cleaned_value = parsed_date
        
        elif field_type == 'text':
            cleaned_value = self.clean_text(value)
            max_length = rules.get('max_length')
            
            if max_length and cleaned_value and len(cleaned_value) > max_length:
                issues.append(ValidationIssue(
                    field_name=field_name,
                    issue_type='text_too_long',
                    severity=ValidationSeverity.WARNING,
                    message=f"Text length {len(cleaned_value)} exceeds maximum {max_length}",
                    value=value,
                    suggested_fix=f"Truncate to {max_length} characters"
                ))
                cleaned_value = cleaned_value[:max_length]
        
        return issues, cleaned_value
    
    def validate_batch(self, data_batch: List[Dict[str, Any]], table_name: str) -> List[ValidationResult]:
        """Validate a batch of records"""
        results = []
        
        for record in data_batch:
            result = self.validate_record(record, table_name)
            results.append(result)
        
        return results
    
    def get_validation_summary(self, results: List[ValidationResult]) -> Dict[str, Any]:
        """Get summary of validation results"""
        total_records = len(results)
        valid_records = sum(1 for r in results if r.is_valid)
        
        # Count issues by type and severity
        issue_counts = {}
        severity_counts = {severity: 0 for severity in ValidationSeverity}
        
        for result in results:
            for issue in result.issues:
                issue_type = issue.issue_type
                severity = issue.severity
                
                issue_counts[issue_type] = issue_counts.get(issue_type, 0) + 1
                severity_counts[severity] = severity_counts[severity] + 1
        
        return {
            'total_records': total_records,
            'valid_records': valid_records,
            'invalid_records': total_records - valid_records,
            'validity_rate': (valid_records / total_records * 100) if total_records > 0 else 0,
            'issue_counts': issue_counts,
            'severity_counts': {k.value: v for k, v in severity_counts.items()},
            'most_common_issues': sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        }

def main():
    """Test data validator"""
    validator = DataValidator()
    
    # Test data
    test_data = [
        {
            'email': 'test@example.com',
            'cnpj': '11.222.333/0001-81',
            'phone': '(11) 99999-9999',
            'estimated_value': 'R$ 1.500,00'
        },
        {
            'email': 'invalid-email',
            'cnpj': '12345678901234',
            'phone': '123',
            'estimated_value': 'invalid'
        }
    ]
    
    # Validate records
    for i, record in enumerate(test_data):
        result = validator.validate_record(record, 'opportunities')
        print(f"\nRecord {i+1}: {'Valid' if result.is_valid else 'Invalid'}")
        
        for issue in result.issues:
            print(f"  - {issue.severity.value.upper()}: {issue.message}")
        
        print(f"  Cleaned: {result.cleaned_data}")

if __name__ == "__main__":
    main()