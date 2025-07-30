"""
Healthcare Compliance and Billing Module
Comprehensive healthcare compliance tracking and billing optimization
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np
from decimal import Decimal
import hashlib
import uuid

class ComplianceStatus(Enum):
    """Compliance status types"""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PENDING_REVIEW = "pending_review"
    EXPIRED = "expired"
    REQUIRES_ACTION = "requires_action"

class AuditType(Enum):
    """Audit types"""
    HIPAA = "hipaa"
    HITECH = "hitech"
    SOX = "sox"
    GDPR = "gdpr"
    FDA = "fda"
    CMS = "cms"
    INTERNAL = "internal"
    EXTERNAL = "external"

class ClaimStatus(Enum):
    """Insurance claim status"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    APPEALED = "appealed"

class PayerType(Enum):
    """Payer types"""
    MEDICARE = "medicare"
    MEDICAID = "medicaid"
    COMMERCIAL = "commercial"
    SELF_PAY = "self_pay"
    WORKERS_COMP = "workers_comp"
    AUTO_INSURANCE = "auto_insurance"
    OTHER = "other"

@dataclass
class Patient:
    """Patient data structure"""
    id: str
    medical_record_number: str
    first_name: str
    last_name: str
    date_of_birth: datetime
    ssn_hash: str  # Hashed for privacy
    address: Dict[str, str]
    phone: str
    email: str
    emergency_contact: Dict[str, str]
    insurance_info: List[Dict[str, Any]] = field(default_factory=list)
    created_date: datetime = field(default_factory=datetime.now)
    last_visit_date: Optional[datetime] = None
    consent_status: Dict[str, bool] = field(default_factory=dict)
    hipaa_authorization: bool = False

@dataclass
class Provider:
    """Healthcare provider data"""
    id: str
    npi: str  # National Provider Identifier
    first_name: str
    last_name: str
    specialty: str
    license_number: str
    license_expiry: datetime
    dea_number: str = ""
    taxonomy_code: str = ""
    is_active: bool = True
    certifications: List[Dict[str, Any]] = field(default_factory=list)
    compliance_training: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Encounter:
    """Patient encounter/visit data"""
    id: str
    patient_id: str
    provider_id: str
    encounter_date: datetime
    encounter_type: str  # office_visit, emergency, inpatient, etc.
    chief_complaint: str
    diagnosis_codes: List[str]  # ICD-10 codes
    procedure_codes: List[str]  # CPT codes
    location: str
    duration_minutes: int
    status: str = "completed"
    notes: str = ""
    follow_up_required: bool = False

@dataclass
class ComplianceRule:
    """Compliance rule definition"""
    id: str
    name: str
    description: str
    regulation_type: str  # HIPAA, HITECH, etc.
    category: str  # privacy, security, operational
    severity: str  # critical, high, medium, low
    implementation_date: datetime
    review_frequency_days: int
    automated_check: bool = False
    check_function: str = ""  # Function name for automated checks
    documentation_required: bool = True

@dataclass
class ComplianceCheck:
    """Compliance check result"""
    id: str
    rule_id: str
    entity_id: str  # Patient, provider, or system ID
    entity_type: str  # patient, provider, system
    check_date: datetime
    status: ComplianceStatus
    findings: List[str]
    recommendations: List[str]
    risk_score: int  # 1-10, 10 being highest risk
    remediation_deadline: Optional[datetime] = None
    assigned_to: str = ""
    completed_date: Optional[datetime] = None

@dataclass
class AuditLog:
    """Audit log entry"""
    id: str
    timestamp: datetime
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: str
    user_agent: str
    success: bool
    details: Dict[str, Any] = field(default_factory=dict)
    risk_level: str = "low"  # low, medium, high

@dataclass
class Claim:
    """Insurance claim data"""
    id: str
    patient_id: str
    encounter_id: str
    provider_id: str
    payer_type: PayerType
    payer_id: str
    submission_date: datetime
    service_date: datetime
    diagnosis_codes: List[str]
    procedure_codes: List[str]
    charges: List[Dict[str, Any]]  # Line items with amounts
    total_billed: Decimal
    total_allowed: Decimal = Decimal('0')
    total_paid: Decimal = Decimal('0')
    patient_responsibility: Decimal = Decimal('0')
    status: ClaimStatus = ClaimStatus.DRAFT
    denial_reason: str = ""
    appeal_deadline: Optional[datetime] = None
    processing_notes: List[str] = field(default_factory=list)

class HIPAAComplianceManager:
    """HIPAA compliance management system"""
    
    def __init__(self):
        self.patients: List[Patient] = []
        self.providers: List[Provider] = []
        self.encounters: List[Encounter] = []
        self.compliance_rules: List[ComplianceRule] = []
        self.compliance_checks: List[ComplianceCheck] = []
        self.audit_logs: List[AuditLog] = []
        
        # Initialize default compliance rules
        self._initialize_compliance_rules()
    
    def _initialize_compliance_rules(self):
        """Initialize default HIPAA compliance rules"""
        default_rules = [
            ComplianceRule(
                id="hipaa_001",
                name="Minimum Necessary Standard",
                description="Access to PHI limited to minimum necessary for purpose",
                regulation_type="HIPAA",
                category="privacy",
                severity="critical",
                implementation_date=datetime(2003, 4, 14),
                review_frequency_days=30,
                automated_check=True,
                check_function="check_minimum_necessary"
            ),
            ComplianceRule(
                id="hipaa_002",
                name="Access Controls",
                description="Unique user identification and access controls for PHI",
                regulation_type="HIPAA",
                category="security",
                severity="critical",
                implementation_date=datetime(2003, 4, 14),
                review_frequency_days=30,
                automated_check=True,
                check_function="check_access_controls"
            ),
            ComplianceRule(
                id="hipaa_003",
                name="Audit Logs",
                description="Maintain audit logs of PHI access and modifications",
                regulation_type="HIPAA",
                category="security",
                severity="high",
                implementation_date=datetime(2003, 4, 14),
                review_frequency_days=30,
                automated_check=True,
                check_function="check_audit_logs"
            ),
            ComplianceRule(
                id="hipaa_004",
                name="Data Encryption",
                description="PHI must be encrypted in transit and at rest",
                regulation_type="HIPAA",
                category="security",
                severity="critical",
                implementation_date=datetime(2003, 4, 14),
                review_frequency_days=90,
                automated_check=False
            ),
            ComplianceRule(
                id="hipaa_005",
                name="Business Associate Agreements",
                description="BAAs required for third-party PHI access",
                regulation_type="HIPAA",
                category="operational",
                severity="high",
                implementation_date=datetime(2003, 4, 14),
                review_frequency_days=365,
                automated_check=False
            )
        ]
        
        self.compliance_rules.extend(default_rules)
    
    def add_patient(self, patient: Patient):
        """Add patient with HIPAA compliance checks"""
        # Hash sensitive data
        if not patient.ssn_hash:
            patient.ssn_hash = self._hash_sensitive_data(patient.ssn_hash)
        
        self.patients.append(patient)
        
        # Log access
        self._log_audit_event(
            user_id="system",
            action="create_patient",
            resource_type="patient",
            resource_id=patient.id,
            success=True
        )
        
        # Run compliance checks
        self._run_patient_compliance_checks(patient.id)
    
    def _hash_sensitive_data(self, data: str) -> str:
        """Hash sensitive data for storage"""
        return hashlib.sha256(data.encode()).hexdigest()
    
    def access_patient_data(self, patient_id: str, user_id: str, purpose: str) -> Optional[Patient]:
        """Access patient data with compliance logging"""
        patient = next((p for p in self.patients if p.id == patient_id), None)
        
        if patient:
            # Log access
            self._log_audit_event(
                user_id=user_id,
                action="access_patient",
                resource_type="patient",
                resource_id=patient_id,
                success=True,
                details={"purpose": purpose}
            )
            
            # Check minimum necessary compliance
            self._check_minimum_necessary_access(user_id, patient_id, purpose)
        else:
            # Log failed access attempt
            self._log_audit_event(
                user_id=user_id,
                action="access_patient",
                resource_type="patient",
                resource_id=patient_id,
                success=False,
                risk_level="medium"
            )
        
        return patient
    
    def _log_audit_event(self, user_id: str, action: str, resource_type: str, 
                        resource_id: str, success: bool, details: Dict[str, Any] = None,
                        risk_level: str = "low", ip_address: str = "", 
                        user_agent: str = ""):
        """Log audit event"""
        audit_entry = AuditLog(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            success=success,
            details=details or {},
            risk_level=risk_level,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.audit_logs.append(audit_entry)
    
    def run_compliance_audit(self, audit_type: AuditType = AuditType.HIPAA) -> Dict[str, Any]:
        """Run comprehensive compliance audit"""
        audit_results = {
            "audit_id": str(uuid.uuid4()),
            "audit_type": audit_type.value,
            "audit_date": datetime.now(),
            "total_rules_checked": 0,
            "compliant_rules": 0,
            "non_compliant_rules": 0,
            "critical_issues": 0,
            "high_issues": 0,
            "medium_issues": 0,
            "low_issues": 0,
            "findings": [],
            "recommendations": []
        }
        
        # Run checks for each compliance rule
        for rule in self.compliance_rules:
            if audit_type == AuditType.HIPAA and rule.regulation_type == "HIPAA":
                audit_results["total_rules_checked"] += 1
                
                if rule.automated_check and rule.check_function:
                    # Run automated check
                    check_result = self._run_automated_check(rule)
                    
                    if check_result["status"] == ComplianceStatus.COMPLIANT:
                        audit_results["compliant_rules"] += 1
                    else:
                        audit_results["non_compliant_rules"] += 1
                        
                        # Count by severity
                        if rule.severity == "critical":
                            audit_results["critical_issues"] += 1
                        elif rule.severity == "high":
                            audit_results["high_issues"] += 1
                        elif rule.severity == "medium":
                            audit_results["medium_issues"] += 1
                        else:
                            audit_results["low_issues"] += 1
                        
                        audit_results["findings"].append({
                            "rule_id": rule.id,
                            "rule_name": rule.name,
                            "severity": rule.severity,
                            "findings": check_result["findings"],
                            "recommendations": check_result["recommendations"]
                        })
        
        # Generate overall recommendations
        audit_results["recommendations"] = self._generate_audit_recommendations(audit_results)
        
        return audit_results
    
    def _run_automated_check(self, rule: ComplianceRule) -> Dict[str, Any]:
        """Run automated compliance check"""
        if rule.check_function == "check_minimum_necessary":
            return self._check_minimum_necessary_compliance()
        elif rule.check_function == "check_access_controls":
            return self._check_access_controls_compliance()
        elif rule.check_function == "check_audit_logs":
            return self._check_audit_logs_compliance()
        else:
            return {
                "status": ComplianceStatus.PENDING_REVIEW,
                "findings": ["Manual review required"],
                "recommendations": ["Schedule manual compliance review"]
            }
    
    def _check_minimum_necessary_compliance(self) -> Dict[str, Any]:
        """Check minimum necessary standard compliance"""
        findings = []
        recommendations = []
        
        # Analyze recent access patterns
        recent_access = [
            log for log in self.audit_logs
            if (log.action == "access_patient" and 
                log.timestamp >= datetime.now() - timedelta(days=30))
        ]
        
        # Check for excessive access patterns
        user_access_counts = {}
        for access in recent_access:
            user_id = access.user_id
            if user_id not in user_access_counts:
                user_access_counts[user_id] = []
            user_access_counts[user_id].append(access)
        
        for user_id, accesses in user_access_counts.items():
            if len(accesses) > 100:  # Threshold for review
                findings.append(f"User {user_id} accessed {len(accesses)} patient records in 30 days")
                recommendations.append(f"Review access patterns for user {user_id}")
        
        status = ComplianceStatus.NON_COMPLIANT if findings else ComplianceStatus.COMPLIANT
        
        return {
            "status": status,
            "findings": findings,
            "recommendations": recommendations
        }
    
    def _check_access_controls_compliance(self) -> Dict[str, Any]:
        """Check access controls compliance"""
        findings = []
        recommendations = []
        
        # Check for failed access attempts
        failed_attempts = [
            log for log in self.audit_logs
            if not log.success and log.timestamp >= datetime.now() - timedelta(days=7)
        ]
        
        if len(failed_attempts) > 10:
            findings.append(f"{len(failed_attempts)} failed access attempts in past 7 days")
            recommendations.append("Review and strengthen access controls")
        
        # Check for accounts without recent activity (potential security risk)
        active_users = set([log.user_id for log in self.audit_logs 
                           if log.timestamp >= datetime.now() - timedelta(days=90)])
        
        # This would typically check against a user database
        # For now, we'll simulate
        if len(active_users) == 0:
            findings.append("No user activity recorded in audit logs")
            recommendations.append("Verify audit logging is functioning correctly")
        
        status = ComplianceStatus.NON_COMPLIANT if findings else ComplianceStatus.COMPLIANT
        
        return {
            "status": status,
            "findings": findings,
            "recommendations": recommendations
        }
    
    def _check_audit_logs_compliance(self) -> Dict[str, Any]:
        """Check audit logs compliance"""
        findings = []
        recommendations = []
        
        # Check audit log completeness
        if not self.audit_logs:
            findings.append("No audit logs found")
            recommendations.append("Implement comprehensive audit logging")
        else:
            # Check for gaps in logging
            recent_logs = [
                log for log in self.audit_logs
                if log.timestamp >= datetime.now() - timedelta(days=30)
            ]
            
            if len(recent_logs) == 0:
                findings.append("No audit logs in past 30 days")
                recommendations.append("Verify audit logging is active")
            
            # Check for required fields
            incomplete_logs = [
                log for log in recent_logs
                if not all([log.user_id, log.action, log.resource_type])
            ]
            
            if incomplete_logs:
                findings.append(f"{len(incomplete_logs)} incomplete audit log entries")
                recommendations.append("Ensure all required audit fields are captured")
        
        status = ComplianceStatus.NON_COMPLIANT if findings else ComplianceStatus.COMPLIANT
        
        return {
            "status": status,
            "findings": findings,
            "recommendations": recommendations
        }
    
    def _check_minimum_necessary_access(self, user_id: str, patient_id: str, purpose: str):
        """Check minimum necessary access principle"""
        # This would implement role-based access control logic
        # For now, we'll create a compliance check record
        
        check = ComplianceCheck(
            id=str(uuid.uuid4()),
            rule_id="hipaa_001",
            entity_id=f"{user_id}_{patient_id}",
            entity_type="access",
            check_date=datetime.now(),
            status=ComplianceStatus.COMPLIANT,  # Would be determined by actual logic
            findings=[],
            recommendations=[],
            risk_score=1
        )
        
        self.compliance_checks.append(check)
    
    def _run_patient_compliance_checks(self, patient_id: str):
        """Run compliance checks for a patient"""
        patient = next((p for p in self.patients if p.id == patient_id), None)
        
        if not patient:
            return
        
        findings = []
        recommendations = []
        risk_score = 1
        
        # Check consent status
        if not patient.hipaa_authorization:
            findings.append("Missing HIPAA authorization")
            recommendations.append("Obtain HIPAA authorization form")
            risk_score = max(risk_score, 8)
        
        # Check required consents
        required_consents = ["treatment", "payment", "operations"]
        for consent in required_consents:
            if consent not in patient.consent_status or not patient.consent_status[consent]:
                findings.append(f"Missing {consent} consent")
                recommendations.append(f"Obtain {consent} consent")
                risk_score = max(risk_score, 6)
        
        status = ComplianceStatus.NON_COMPLIANT if findings else ComplianceStatus.COMPLIANT
        
        check = ComplianceCheck(
            id=str(uuid.uuid4()),
            rule_id="patient_consent",
            entity_id=patient_id,
            entity_type="patient",
            check_date=datetime.now(),
            status=status,
            findings=findings,
            recommendations=recommendations,
            risk_score=risk_score
        )
        
        self.compliance_checks.append(check)
    
    def _generate_audit_recommendations(self, audit_results: Dict[str, Any]) -> List[str]:
        """Generate audit recommendations"""
        recommendations = []
        
        if audit_results["critical_issues"] > 0:
            recommendations.append("Address critical compliance issues immediately")
        
        if audit_results["high_issues"] > 0:
            recommendations.append("Develop remediation plan for high-priority issues")
        
        if audit_results["non_compliant_rules"] > audit_results["compliant_rules"]:
            recommendations.append("Implement comprehensive compliance training program")
        
        recommendations.append("Schedule regular compliance reviews")
        recommendations.append("Update compliance policies and procedures")
        
        return recommendations
    
    def generate_compliance_report(self, days: int = 30) -> Dict[str, Any]:
        """Generate compliance status report"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get recent compliance checks
        recent_checks = [
            check for check in self.compliance_checks
            if start_date <= check.check_date <= end_date
        ]
        
        # Calculate metrics
        total_checks = len(recent_checks)
        compliant_checks = len([c for c in recent_checks if c.status == ComplianceStatus.COMPLIANT])
        non_compliant_checks = len([c for c in recent_checks if c.status == ComplianceStatus.NON_COMPLIANT])
        
        # Risk assessment
        high_risk_checks = len([c for c in recent_checks if c.risk_score >= 7])
        medium_risk_checks = len([c for c in recent_checks if 4 <= c.risk_score < 7])
        low_risk_checks = len([c for c in recent_checks if c.risk_score < 4])
        
        # Audit activity
        recent_audits = [
            log for log in self.audit_logs
            if start_date <= log.timestamp <= end_date
        ]
        
        return {
            "report_date": datetime.now(),
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "compliance_summary": {
                "total_checks": total_checks,
                "compliant": compliant_checks,
                "non_compliant": non_compliant_checks,
                "compliance_rate": (compliant_checks / total_checks * 100) if total_checks > 0 else 0
            },
            "risk_assessment": {
                "high_risk": high_risk_checks,
                "medium_risk": medium_risk_checks,
                "low_risk": low_risk_checks
            },
            "audit_activity": {
                "total_events": len(recent_audits),
                "failed_access_attempts": len([a for a in recent_audits if not a.success]),
                "high_risk_events": len([a for a in recent_audits if a.risk_level == "high"])
            },
            "top_findings": self._get_top_compliance_findings(recent_checks),
            "recommendations": self._get_compliance_recommendations(recent_checks)
        }
    
    def _get_top_compliance_findings(self, checks: List[ComplianceCheck]) -> List[Dict[str, Any]]:
        """Get top compliance findings"""
        non_compliant_checks = [c for c in checks if c.status != ComplianceStatus.COMPLIANT]
        
        # Group by rule
        rule_findings = {}
        for check in non_compliant_checks:
            rule_id = check.rule_id
            if rule_id not in rule_findings:
                rule_findings[rule_id] = []
            rule_findings[rule_id].append(check)
        
        # Sort by frequency and risk
        top_findings = []
        for rule_id, rule_checks in rule_findings.items():
            rule = next((r for r in self.compliance_rules if r.id == rule_id), None)
            avg_risk = sum([c.risk_score for c in rule_checks]) / len(rule_checks)
            
            top_findings.append({
                "rule_id": rule_id,
                "rule_name": rule.name if rule else rule_id,
                "frequency": len(rule_checks),
                "average_risk_score": avg_risk,
                "severity": rule.severity if rule else "unknown"
            })
        
        return sorted(top_findings, key=lambda x: (x["average_risk_score"], x["frequency"]), reverse=True)[:10]
    
    def _get_compliance_recommendations(self, checks: List[ComplianceCheck]) -> List[str]:
        """Get compliance recommendations"""
        recommendations = set()
        
        for check in checks:
            recommendations.update(check.recommendations)
        
        return list(recommendations)[:10]

class HealthcareBillingManager:
    """Healthcare billing and revenue cycle management"""
    
    def __init__(self):
        self.claims: List[Claim] = []
        self.denials_analysis: Dict[str, Any] = {}
        self.payer_performance: Dict[str, Any] = {}
    
    def create_claim(self, claim: Claim):
        """Create and validate insurance claim"""
        # Validate claim data
        validation_results = self._validate_claim(claim)
        
        if validation_results["is_valid"]:
            claim.status = ClaimStatus.SUBMITTED
            self.claims.append(claim)
        else:
            claim.status = ClaimStatus.DRAFT
            claim.processing_notes.extend(validation_results["errors"])
            self.claims.append(claim)
        
        return validation_results
    
    def _validate_claim(self, claim: Claim) -> Dict[str, Any]:
        """Validate claim data"""
        errors = []
        warnings = []
        
        # Check required fields
        if not claim.patient_id:
            errors.append("Patient ID is required")
        
        if not claim.provider_id:
            errors.append("Provider ID is required")
        
        if not claim.diagnosis_codes:
            errors.append("At least one diagnosis code is required")
        
        if not claim.procedure_codes:
            errors.append("At least one procedure code is required")
        
        # Validate diagnosis codes (ICD-10)
        for dx_code in claim.diagnosis_codes:
            if not self._validate_icd10_code(dx_code):
                errors.append(f"Invalid ICD-10 diagnosis code: {dx_code}")
        
        # Validate procedure codes (CPT)
        for proc_code in claim.procedure_codes:
            if not self._validate_cpt_code(proc_code):
                errors.append(f"Invalid CPT procedure code: {proc_code}")
        
        # Check for common billing errors
        if claim.service_date > datetime.now():
            errors.append("Service date cannot be in the future")
        
        if claim.service_date < datetime.now() - timedelta(days=365):
            warnings.append("Service date is over 1 year old - may affect payment")
        
        # Validate charge amounts
        if claim.total_billed <= 0:
            errors.append("Total billed amount must be greater than zero")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }
    
    def _validate_icd10_code(self, code: str) -> bool:
        """Validate ICD-10 diagnosis code format"""
        # Simplified validation - in reality would check against ICD-10 database
        if len(code) < 3 or len(code) > 7:
            return False
        
        # Basic format check (letter followed by numbers)
        if not code[0].isalpha():
            return False
        
        return True
    
    def _validate_cpt_code(self, code: str) -> bool:
        """Validate CPT procedure code format"""
        # Simplified validation - in reality would check against CPT database
        if len(code) != 5:
            return False
        
        return code.isdigit()
    
    def process_claim_response(self, claim_id: str, response_data: Dict[str, Any]):
        """Process claim response from payer"""
        claim = next((c for c in self.claims if c.id == claim_id), None)
        
        if not claim:
            return {"error": "Claim not found"}
        
        # Update claim status
        if response_data["status"] == "approved":
            claim.status = ClaimStatus.APPROVED
            claim.total_allowed = Decimal(str(response_data.get("allowed_amount", 0)))
            claim.total_paid = Decimal(str(response_data.get("paid_amount", 0)))
            claim.patient_responsibility = Decimal(str(response_data.get("patient_responsibility", 0)))
            
            if claim.total_paid < claim.total_allowed:
                claim.status = ClaimStatus.PARTIALLY_PAID
            else:
                claim.status = ClaimStatus.PAID
                
        elif response_data["status"] == "denied":
            claim.status = ClaimStatus.DENIED
            claim.denial_reason = response_data.get("denial_reason", "")
            claim.appeal_deadline = datetime.now() + timedelta(days=90)  # Standard appeal window
        
        claim.processing_notes.append(f"Response processed on {datetime.now()}")
        
        # Update analytics
        self._update_denial_analysis(claim)
        self._update_payer_performance(claim)
        
        return {"status": "processed", "claim_status": claim.status.value}
    
    def _update_denial_analysis(self, claim: Claim):
        """Update denial analysis metrics"""
        if claim.status == ClaimStatus.DENIED:
            denial_reason = claim.denial_reason or "Unknown"
            
            if "denials_by_reason" not in self.denials_analysis:
                self.denials_analysis["denials_by_reason"] = {}
            
            if denial_reason not in self.denials_analysis["denials_by_reason"]:
                self.denials_analysis["denials_by_reason"][denial_reason] = 0
            
            self.denials_analysis["denials_by_reason"][denial_reason] += 1
    
    def _update_payer_performance(self, claim: Claim):
        """Update payer performance metrics"""
        payer_id = claim.payer_id
        
        if payer_id not in self.payer_performance:
            self.payer_performance[payer_id] = {
                "total_claims": 0,
                "approved_claims": 0,
                "denied_claims": 0,
                "total_billed": Decimal('0'),
                "total_paid": Decimal('0'),
                "average_days_to_payment": 0
            }
        
        perf = self.payer_performance[payer_id]
        perf["total_claims"] += 1
        perf["total_billed"] += claim.total_billed
        perf["total_paid"] += claim.total_paid
        
        if claim.status in [ClaimStatus.APPROVED, ClaimStatus.PAID, ClaimStatus.PARTIALLY_PAID]:
            perf["approved_claims"] += 1
        elif claim.status == ClaimStatus.DENIED:
            perf["denied_claims"] += 1
    
    def calculate_revenue_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Calculate revenue cycle metrics"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Filter claims for the period
        period_claims = [
            c for c in self.claims
            if start_date <= c.submission_date <= end_date
        ]
        
        if not period_claims:
            return {"error": "No claims found for the specified period"}
        
        total_claims = len(period_claims)
        total_billed = sum([c.total_billed for c in period_claims])
        total_paid = sum([c.total_paid for c in period_claims])
        
        # Calculate status distribution
        status_counts = {}
        for status in ClaimStatus:
            status_counts[status.value] = len([c for c in period_claims if c.status == status])
        
        # Calculate denial rate
        denied_claims = status_counts.get("denied", 0)
        denial_rate = (denied_claims / total_claims * 100) if total_claims > 0 else 0
        
        # Calculate collection rate
        collection_rate = (float(total_paid) / float(total_billed) * 100) if total_billed > 0 else 0
        
        # Calculate average days in A/R
        ar_claims = [c for c in period_claims if c.status in [ClaimStatus.SUBMITTED, ClaimStatus.PENDING]]
        if ar_claims:
            ar_days = [(datetime.now() - c.submission_date).days for c in ar_claims]
            avg_ar_days = sum(ar_days) / len(ar_days)
        else:
            avg_ar_days = 0
        
        return {
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "total_claims": total_claims,
            "total_billed": float(total_billed),
            "total_paid": float(total_paid),
            "collection_rate": round(collection_rate, 2),
            "denial_rate": round(denial_rate, 2),
            "average_ar_days": round(avg_ar_days, 1),
            "claim_status_distribution": status_counts,
            "top_denial_reasons": self._get_top_denial_reasons(),
            "payer_performance_summary": self._get_payer_performance_summary()
        }
    
    def _get_top_denial_reasons(self) -> List[Dict[str, Any]]:
        """Get top denial reasons"""
        if "denials_by_reason" not in self.denials_analysis:
            return []
        
        denial_reasons = self.denials_analysis["denials_by_reason"]
        sorted_reasons = sorted(denial_reasons.items(), key=lambda x: x[1], reverse=True)
        
        return [
            {"reason": reason, "count": count}
            for reason, count in sorted_reasons[:10]
        ]
    
    def _get_payer_performance_summary(self) -> List[Dict[str, Any]]:
        """Get payer performance summary"""
        performance_summary = []
        
        for payer_id, metrics in self.payer_performance.items():
            approval_rate = (metrics["approved_claims"] / metrics["total_claims"] * 100) if metrics["total_claims"] > 0 else 0
            collection_rate = (float(metrics["total_paid"]) / float(metrics["total_billed"]) * 100) if metrics["total_billed"] > 0 else 0
            
            performance_summary.append({
                "payer_id": payer_id,
                "total_claims": metrics["total_claims"],
                "approval_rate": round(approval_rate, 2),
                "collection_rate": round(collection_rate, 2),
                "total_billed": float(metrics["total_billed"]),
                "total_paid": float(metrics["total_paid"])
            })
        
        return sorted(performance_summary, key=lambda x: x["total_billed"], reverse=True)
    
    def identify_billing_opportunities(self) -> Dict[str, Any]:
        """Identify billing optimization opportunities"""
        opportunities = {
            "underbilled_services": [],
            "denial_prevention": [],
            "collection_improvements": [],
            "coding_optimization": []
        }
        
        # Analyze underbilled services
        underbilled = self._find_underbilled_services()
        opportunities["underbilled_services"] = underbilled
        
        # Analyze denial patterns
        denial_prevention = self._analyze_denial_patterns()
        opportunities["denial_prevention"] = denial_prevention
        
        # Collection opportunities
        collection_opps = self._find_collection_opportunities()
        opportunities["collection_improvements"] = collection_opps
        
        # Coding optimization
        coding_opps = self._find_coding_opportunities()
        opportunities["coding_optimization"] = coding_opps
        
        return opportunities
    
    def _find_underbilled_services(self) -> List[Dict[str, Any]]:
        """Find potentially underbilled services"""
        # This would analyze historical data to find services billed below average
        # For now, return placeholder analysis
        return [
            {
                "procedure_code": "99213",
                "description": "Office visit, level 3",
                "current_average_charge": 150.00,
                "market_average_charge": 175.00,
                "potential_increase": 25.00,
                "annual_volume": 500,
                "annual_opportunity": 12500.00
            }
        ]
    
    def _analyze_denial_patterns(self) -> List[Dict[str, Any]]:
        """Analyze denial patterns for prevention"""
        recommendations = []
        
        # Analyze top denial reasons
        if "denials_by_reason" in self.denials_analysis:
            for reason, count in self.denials_analysis["denials_by_reason"].items():
                if count >= 5:  # Threshold for pattern
                    if "authorization" in reason.lower():
                        recommendations.append({
                            "issue": reason,
                            "frequency": count,
                            "recommendation": "Implement prior authorization verification workflow",
                            "estimated_recovery": count * 200  # Estimated average claim value
                        })
                    elif "coding" in reason.lower():
                        recommendations.append({
                            "issue": reason,
                            "frequency": count,
                            "recommendation": "Provide additional coding training",
                            "estimated_recovery": count * 150
                        })
        
        return recommendations
    
    def _find_collection_opportunities(self) -> List[Dict[str, Any]]:
        """Find collection improvement opportunities"""
        opportunities = []
        
        # Find old unpaid claims
        old_claims = [
            c for c in self.claims
            if (c.status in [ClaimStatus.SUBMITTED, ClaimStatus.PENDING] and
                (datetime.now() - c.submission_date).days > 60)
        ]
        
        if old_claims:
            total_old_ar = sum([c.total_billed for c in old_claims])
            opportunities.append({
                "opportunity": "Follow up on aged receivables",
                "claim_count": len(old_claims),
                "total_amount": float(total_old_ar),
                "recommendation": "Implement systematic follow-up process for claims > 60 days"
            })
        
        return opportunities
    
    def _find_coding_opportunities(self) -> List[Dict[str, Any]]:
        """Find coding optimization opportunities"""
        # This would analyze coding patterns to find optimization opportunities
        return [
            {
                "opportunity": "Evaluation and Management Coding",
                "description": "Review E&M coding levels for optimization",
                "estimated_impact": "5-15% revenue increase",
                "recommendation": "Audit E&M documentation and coding practices"
            }
        ]
    
    def generate_billing_dashboard(self) -> Dict[str, Any]:
        """Generate comprehensive billing dashboard"""
        # Recent metrics (last 30 days)
        recent_metrics = self.calculate_revenue_metrics(30)
        
        # Year-to-date metrics
        ytd_metrics = self.calculate_revenue_metrics(365)
        
        # Outstanding A/R aging
        ar_aging = self._calculate_ar_aging()
        
        # Key performance indicators
        kpis = self._calculate_billing_kpis()
        
        return {
            "dashboard_date": datetime.now(),
            "recent_performance": recent_metrics,
            "ytd_performance": ytd_metrics,
            "ar_aging": ar_aging,
            "key_performance_indicators": kpis,
            "optimization_opportunities": self.identify_billing_opportunities(),
            "alerts": self._generate_billing_alerts()
        }
    
    def _calculate_ar_aging(self) -> Dict[str, Any]:
        """Calculate accounts receivable aging"""
        aging_buckets = {
            "0-30_days": [],
            "31-60_days": [],
            "61-90_days": [],
            "91-120_days": [],
            "over_120_days": []
        }
        
        outstanding_claims = [
            c for c in self.claims
            if c.status in [ClaimStatus.SUBMITTED, ClaimStatus.PENDING, ClaimStatus.PARTIALLY_PAID]
        ]
        
        for claim in outstanding_claims:
            days_outstanding = (datetime.now() - claim.submission_date).days
            outstanding_amount = float(claim.total_billed - claim.total_paid)
            
            if days_outstanding <= 30:
                aging_buckets["0-30_days"].append(outstanding_amount)
            elif days_outstanding <= 60:
                aging_buckets["31-60_days"].append(outstanding_amount)
            elif days_outstanding <= 90:
                aging_buckets["61-90_days"].append(outstanding_amount)
            elif days_outstanding <= 120:
                aging_buckets["91-120_days"].append(outstanding_amount)
            else:
                aging_buckets["over_120_days"].append(outstanding_amount)
        
        # Calculate totals for each bucket
        aging_summary = {}
        for bucket, amounts in aging_buckets.items():
            aging_summary[bucket] = {
                "count": len(amounts),
                "total_amount": sum(amounts)
            }
        
        total_ar = sum([bucket["total_amount"] for bucket in aging_summary.values()])
        
        # Calculate percentages
        for bucket in aging_summary.values():
            bucket["percentage"] = (bucket["total_amount"] / total_ar * 100) if total_ar > 0 else 0
        
        return {
            "aging_buckets": aging_summary,
            "total_ar": total_ar,
            "generated_date": datetime.now()
        }
    
    def _calculate_billing_kpis(self) -> Dict[str, float]:
        """Calculate key billing performance indicators"""
        # Calculate various KPIs
        total_claims = len(self.claims)
        if total_claims == 0:
            return {}
        
        # First pass rate (claims paid without denial/rework)
        first_pass_claims = len([
            c for c in self.claims 
            if c.status in [ClaimStatus.PAID, ClaimStatus.APPROVED]
        ])
        first_pass_rate = (first_pass_claims / total_claims * 100) if total_claims > 0 else 0
        
        # Clean claim rate (claims submitted without errors)
        clean_claims = len([
            c for c in self.claims
            if len(c.processing_notes) == 0
        ])
        clean_claim_rate = (clean_claims / total_claims * 100) if total_claims > 0 else 0
        
        # Net collection rate
        total_billed = sum([c.total_billed for c in self.claims])
        total_collected = sum([c.total_paid for c in self.claims])
        net_collection_rate = (float(total_collected) / float(total_billed) * 100) if total_billed > 0 else 0
        
        return {
            "first_pass_rate": round(first_pass_rate, 2),
            "clean_claim_rate": round(clean_claim_rate, 2),
            "net_collection_rate": round(net_collection_rate, 2),
            "total_claims_processed": total_claims
        }
    
    def _generate_billing_alerts(self) -> List[Dict[str, Any]]:
        """Generate billing alerts and notifications"""
        alerts = []
        
        # High denial rate alert
        recent_claims = [
            c for c in self.claims
            if c.submission_date >= datetime.now() - timedelta(days=30)
        ]
        
        if recent_claims:
            denied_claims = len([c for c in recent_claims if c.status == ClaimStatus.DENIED])
            denial_rate = (denied_claims / len(recent_claims) * 100)
            
            if denial_rate > 10:  # Alert threshold
                alerts.append({
                    "type": "high_denial_rate",
                    "severity": "high",
                    "message": f"Denial rate is {denial_rate:.1f}% (above 10% threshold)",
                    "recommendation": "Review denial reasons and implement corrective actions"
                })
        
        # Aged receivables alert
        old_claims = [
            c for c in self.claims
            if (c.status in [ClaimStatus.SUBMITTED, ClaimStatus.PENDING] and
                (datetime.now() - c.submission_date).days > 90)
        ]
        
        if old_claims:
            old_ar_amount = sum([c.total_billed for c in old_claims])
            alerts.append({
                "type": "aged_receivables",
                "severity": "medium",
                "message": f"${old_ar_amount:,.2f} in receivables over 90 days old",
                "recommendation": "Prioritize collection efforts on aged accounts"
            })
        
        return alerts

# Example usage

async def example_healthcare_compliance():
    """Example of healthcare compliance and billing analysis"""
    
    # Initialize systems
    compliance_manager = HIPAAComplianceManager()
    billing_manager = HealthcareBillingManager()
    
    # Add sample patient
    patient = Patient(
        id="patient_001",
        medical_record_number="MRN12345",
        first_name="John",
        last_name="Doe",
        date_of_birth=datetime(1980, 5, 15),
        ssn_hash="hashed_ssn",
        address={"street": "123 Main St", "city": "Anytown", "state": "ST", "zip": "12345"},
        phone="555-0123",
        email="john.doe@email.com",
        emergency_contact={"name": "Jane Doe", "phone": "555-0124"},
        hipaa_authorization=True,
        consent_status={"treatment": True, "payment": True, "operations": True}
    )
    
    compliance_manager.add_patient(patient)
    
    # Access patient data (with logging)
    accessed_patient = compliance_manager.access_patient_data(
        "patient_001", 
        "provider_001", 
        "treatment"
    )
    
    # Run compliance audit
    audit_results = compliance_manager.run_compliance_audit()
    print(f"Compliance audit completed: {audit_results['compliant_rules']} compliant, {audit_results['non_compliant_rules']} non-compliant")
    
    # Create sample claim
    claim = Claim(
        id="claim_001",
        patient_id="patient_001",
        encounter_id="encounter_001",
        provider_id="provider_001",
        payer_type=PayerType.COMMERCIAL,
        payer_id="payer_001",
        submission_date=datetime.now(),
        service_date=datetime.now() - timedelta(days=1),
        diagnosis_codes=["Z00.00"],  # General adult medical examination
        procedure_codes=["99213"],   # Office visit, level 3
        charges=[{"code": "99213", "amount": 150.00}],
        total_billed=Decimal('150.00')
    )
    
    # Validate and create claim
    validation = billing_manager.create_claim(claim)
    print(f"Claim validation: {'Valid' if validation['is_valid'] else 'Invalid'}")
    
    # Process claim response
    billing_manager.process_claim_response("claim_001", {
        "status": "approved",
        "allowed_amount": 120.00,
        "paid_amount": 96.00,
        "patient_responsibility": 24.00
    })
    
    # Calculate revenue metrics
    revenue_metrics = billing_manager.calculate_revenue_metrics()
    print(f"Collection rate: {revenue_metrics['collection_rate']}%")
    
    # Generate compliance report
    compliance_report = compliance_manager.generate_compliance_report()
    print(f"Compliance rate: {compliance_report['compliance_summary']['compliance_rate']:.1f}%")
    
    # Generate billing dashboard
    billing_dashboard = billing_manager.generate_billing_dashboard()
    print(f"Total A/R: ${billing_dashboard['ar_aging']['total_ar']:,.2f}")
    
    return {
        "compliance_audit": audit_results,
        "compliance_report": compliance_report,
        "revenue_metrics": revenue_metrics,
        "billing_dashboard": billing_dashboard
    }

if __name__ == "__main__":
    asyncio.run(example_healthcare_compliance())
