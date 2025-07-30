"""
GDPR Compliance Checker

Implementation of GDPR (General Data Protection Regulation) compliance checking
according to EU regulations for data protection and privacy.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

from ..core.regulation_checker import RegulationChecker, RegulationUpdate
from ..core.compliance_engine import ComplianceResult, ComplianceStatus, RiskLevel, RegulationType

logger = logging.getLogger(__name__)


class GDPRChecker(RegulationChecker):
    """
    GDPR compliance checker implementing EU data protection requirements
    """
    
    def __init__(self):
        super().__init__(RegulationType.GDPR)
    
    def _load_requirements(self) -> Dict[str, Any]:
        """Load GDPR-specific requirements"""
        return {
            "lawful_basis": {
                "id": "gdpr_art6",
                "title": "Lawful Basis for Processing",
                "description": "Processing must have a lawful basis under Article 6",
                "risk_level": "critical",
                "data_sensitivity": "high"
            },
            "consent_management": {
                "id": "gdpr_art7",
                "title": "Consent Management",
                "description": "Consent must be freely given, specific, informed and unambiguous",
                "risk_level": "high",
                "data_sensitivity": "high"
            },
            "data_subject_rights": {
                "id": "gdpr_art12_22",
                "title": "Data Subject Rights",
                "description": "Must support access, rectification, erasure, portability, and objection rights",
                "risk_level": "high",
                "data_sensitivity": "high"
            },
            "privacy_by_design": {
                "id": "gdpr_art25",
                "title": "Privacy by Design and Default",
                "description": "Privacy must be built into systems by design and default",
                "risk_level": "medium",
                "data_sensitivity": "medium"
            },
            "data_protection_impact_assessment": {
                "id": "gdpr_art35",
                "title": "Data Protection Impact Assessment",
                "description": "DPIA required for high-risk processing activities",
                "risk_level": "medium",
                "data_sensitivity": "high"
            },
            "data_breach_notification": {
                "id": "gdpr_art33_34",
                "title": "Data Breach Notification",
                "description": "Breach notification to authorities within 72 hours",
                "risk_level": "critical",
                "data_sensitivity": "high"
            },
            "data_protection_officer": {
                "id": "gdpr_art37",
                "title": "Data Protection Officer",
                "description": "DPO required for certain types of processing",
                "risk_level": "medium",
                "data_sensitivity": "medium"
            },
            "international_transfers": {
                "id": "gdpr_art44_49",
                "title": "International Data Transfers",
                "description": "Adequate protection for international transfers",
                "risk_level": "high",
                "data_sensitivity": "high"
            },
            "records_of_processing": {
                "id": "gdpr_art30",
                "title": "Records of Processing Activities",
                "description": "Maintain comprehensive records of processing activities",
                "risk_level": "medium",
                "data_sensitivity": "medium"
            },
            "data_minimization": {
                "id": "gdpr_art5",
                "title": "Data Minimization",
                "description": "Process only necessary data for specified purposes",
                "risk_level": "medium",
                "data_sensitivity": "high"
            }
        }
    
    async def check_compliance(
        self,
        company_data: Dict[str, Any],
        scope: str = "full"
    ) -> List[ComplianceResult]:
        """Check GDPR compliance"""
        
        logger.info("Starting GDPR compliance assessment")
        results = []
        
        # Check each GDPR requirement
        for req_key, requirement in self.requirements.items():
            try:
                if scope == "quick" and requirement["risk_level"] not in ["critical", "high"]:
                    continue
                
                result = await self._check_requirement(req_key, requirement, company_data)
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error checking GDPR requirement {req_key}: {str(e)}")
                
                # Create error result
                error_result = self._create_result(
                    requirement_id=requirement["id"],
                    requirement_name=requirement["title"],
                    status=ComplianceStatus.UNKNOWN,
                    risk_level=RiskLevel.MEDIUM,
                    description=f"Error checking requirement: {str(e)}",
                    current_state="Unable to determine",
                    required_state=requirement["description"],
                    gap_analysis="Assessment failed due to error",
                    remediation_steps=["Review system configuration", "Retry assessment"],
                    confidence_score=0.0
                )
                results.append(error_result)
        
        logger.info(f"GDPR compliance assessment completed. {len(results)} requirements checked.")
        return results
    
    async def _check_requirement(
        self,
        req_key: str,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check individual GDPR requirement"""
        
        if req_key == "lawful_basis":
            return await self._check_lawful_basis(requirement, company_data)
        elif req_key == "consent_management":
            return await self._check_consent_management(requirement, company_data)
        elif req_key == "data_subject_rights":
            return await self._check_data_subject_rights(requirement, company_data)
        elif req_key == "privacy_by_design":
            return await self._check_privacy_by_design(requirement, company_data)
        elif req_key == "data_protection_impact_assessment":
            return await self._check_dpia(requirement, company_data)
        elif req_key == "data_breach_notification":
            return await self._check_breach_notification(requirement, company_data)
        elif req_key == "data_protection_officer":
            return await self._check_dpo_requirement(requirement, company_data)
        elif req_key == "international_transfers":
            return await self._check_international_transfers(requirement, company_data)
        elif req_key == "records_of_processing":
            return await self._check_records_of_processing(requirement, company_data)
        elif req_key == "data_minimization":
            return await self._check_data_minimization(requirement, company_data)
        else:
            # Default check
            return self._create_result(
                requirement_id=requirement["id"],
                requirement_name=requirement["title"],
                status=ComplianceStatus.REQUIRES_REVIEW,
                risk_level=RiskLevel.MEDIUM,
                description=requirement["description"],
                current_state="Not assessed",
                required_state=requirement["description"],
                gap_analysis="Manual review required",
                remediation_steps=["Conduct manual assessment"],
                confidence_score=0.0
            )
    
    async def _check_lawful_basis(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check lawful basis for processing"""
        
        processing_activities = company_data.get("data_processing", {})
        lawful_bases = processing_activities.get("lawful_bases", {})
        
        # Check if lawful bases are documented
        has_documented_bases = bool(lawful_bases)
        covers_all_processing = len(lawful_bases) >= len(processing_activities.get("activities", []))
        
        if has_documented_bases and covers_all_processing:
            status = ComplianceStatus.COMPLIANT
            current_state = "Lawful bases documented for all processing activities"
            gap_analysis = "No gaps identified"
            remediation_steps = ["Maintain regular reviews of lawful bases"]
        elif has_documented_bases:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
            current_state = "Some lawful bases documented"
            gap_analysis = "Not all processing activities have documented lawful bases"
            remediation_steps = [
                "Document lawful bases for all processing activities",
                "Review and validate existing lawful bases",
                "Implement regular compliance monitoring"
            ]
        else:
            status = ComplianceStatus.NON_COMPLIANT
            current_state = "No documented lawful bases"
            gap_analysis = "Critical gap: No lawful bases documented"
            remediation_steps = [
                "URGENT: Document lawful basis for all processing",
                "Conduct data audit to identify all processing activities",
                "Implement lawful basis tracking system"
            ]
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "high"),
            description=requirement["description"],
            current_state=current_state,
            required_state="All data processing must have valid lawful basis under Article 6",
            gap_analysis=gap_analysis,
            remediation_steps=remediation_steps,
            evidence={"lawful_bases": lawful_bases},
            confidence_score=0.9 if has_documented_bases else 0.8
        )
    
    async def _check_consent_management(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check consent management implementation"""
        
        consent_system = company_data.get("consent_management", {})
        
        consent_features = [
            consent_system.get("granular_consent", False),
            consent_system.get("withdrawal_mechanism", False),
            consent_system.get("consent_records", False),
            consent_system.get("clear_language", False),
            consent_system.get("separate_from_terms", False)
        ]
        
        implemented_features = sum(consent_features)
        compliance_ratio = implemented_features / len(consent_features)
        
        if compliance_ratio >= 0.9:
            status = ComplianceStatus.COMPLIANT
            current_state = "Comprehensive consent management system implemented"
            gap_analysis = "Minor improvements may be possible"
            remediation_steps = ["Regular review and testing of consent mechanisms"]
        elif compliance_ratio >= 0.7:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
            current_state = f"{implemented_features}/{len(consent_features)} consent features implemented"
            gap_analysis = "Some consent management features missing"
            remediation_steps = [
                "Implement missing consent management features",
                "Test consent withdrawal mechanisms",
                "Review consent language for clarity"
            ]
        else:
            status = ComplianceStatus.NON_COMPLIANT
            current_state = "Inadequate consent management system"
            gap_analysis = "Major gaps in consent management implementation"
            remediation_steps = [
                "Implement comprehensive consent management system",
                "Design granular consent mechanisms",
                "Implement consent withdrawal capabilities",
                "Maintain detailed consent records"
            ]
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "high"),
            description=requirement["description"],
            current_state=current_state,
            required_state="Consent must be freely given, specific, informed and unambiguous",
            gap_analysis=gap_analysis,
            remediation_steps=remediation_steps,
            evidence={"consent_features": consent_system},
            confidence_score=0.85
        )
    
    async def _check_data_subject_rights(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check data subject rights implementation"""
        
        rights_system = company_data.get("data_subject_rights", {})
        
        required_rights = [
            "access_right",           # Article 15
            "rectification_right",    # Article 16
            "erasure_right",         # Article 17
            "restriction_right",     # Article 18
            "portability_right",     # Article 20
            "objection_right"        # Article 21
        ]
        
        implemented_rights = sum(
            1 for right in required_rights
            if rights_system.get(right, {}).get("implemented", False)
        )
        
        compliance_ratio = implemented_rights / len(required_rights)
        
        # Check response timeframes
        response_time = rights_system.get("response_timeframe_days", 90)
        within_timeframe = response_time <= 30  # GDPR requires response within 1 month
        
        if compliance_ratio >= 0.9 and within_timeframe:
            status = ComplianceStatus.COMPLIANT
            current_state = f"All {implemented_rights} data subject rights implemented with proper timeframes"
            gap_analysis = "Data subject rights properly implemented"
            remediation_steps = ["Continue monitoring and testing rights procedures"]
        elif compliance_ratio >= 0.7:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
            current_state = f"{implemented_rights}/{len(required_rights)} rights implemented"
            gap_analysis = "Some data subject rights missing or inadequate response timeframes"
            remediation_steps = [
                "Implement missing data subject rights",
                "Improve response timeframes to within 30 days",
                "Test rights fulfillment procedures"
            ]
        else:
            status = ComplianceStatus.NON_COMPLIANT
            current_state = "Inadequate data subject rights implementation"
            gap_analysis = "Major gaps in data subject rights support"
            remediation_steps = [
                "Implement comprehensive data subject rights system",
                "Design automated rights fulfillment processes",
                "Establish proper response procedures",
                "Train staff on rights handling"
            ]
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "high"),
            description=requirement["description"],
            current_state=current_state,
            required_state="Support all data subject rights with 30-day response time",
            gap_analysis=gap_analysis,
            remediation_steps=remediation_steps,
            evidence={
                "implemented_rights": implemented_rights,
                "response_timeframe": response_time,
                "rights_details": rights_system
            },
            confidence_score=0.8
        )
    
    async def _check_privacy_by_design(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check privacy by design implementation"""
        
        privacy_design = company_data.get("privacy_by_design", {})
        
        design_principles = [
            privacy_design.get("privacy_impact_assessments", False),
            privacy_design.get("default_privacy_settings", False),
            privacy_design.get("data_minimization_built_in", False),
            privacy_design.get("privacy_controls_user_friendly", False),
            privacy_design.get("end_to_end_security", False)
        ]
        
        implemented_principles = sum(design_principles)
        compliance_ratio = implemented_principles / len(design_principles)
        
        if compliance_ratio >= 0.8:
            status = ComplianceStatus.COMPLIANT
        elif compliance_ratio >= 0.6:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "medium", "medium"),
            description=requirement["description"],
            current_state=f"{implemented_principles}/{len(design_principles)} privacy by design principles implemented",
            required_state="Privacy built into systems by design and default",
            gap_analysis=f"Privacy by design compliance at {compliance_ratio*100:.0f}%",
            remediation_steps=self._get_remediation_steps("privacy_design", "", ""),
            evidence={"design_principles": privacy_design},
            confidence_score=0.75
        )
    
    async def _check_dpia(self, requirement: Dict[str, Any], company_data: Dict[str, Any]) -> ComplianceResult:
        """Check Data Protection Impact Assessment requirements"""
        
        dpia_info = company_data.get("dpia", {})
        high_risk_processing = company_data.get("high_risk_processing", False)
        
        if high_risk_processing:
            has_dpia = dpia_info.get("conducted", False)
            if has_dpia:
                status = ComplianceStatus.COMPLIANT
                gap_analysis = "DPIA conducted for high-risk processing"
            else:
                status = ComplianceStatus.NON_COMPLIANT
                gap_analysis = "DPIA required but not conducted"
        else:
            status = ComplianceStatus.COMPLIANT
            gap_analysis = "No high-risk processing identified"
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "medium"),
            description=requirement["description"],
            current_state="DPIA conducted" if dpia_info.get("conducted") else "No DPIA",
            required_state="DPIA for high-risk processing activities",
            gap_analysis=gap_analysis,
            remediation_steps=["Conduct DPIA for high-risk processing"] if status != ComplianceStatus.COMPLIANT else [],
            evidence={"dpia_info": dpia_info, "high_risk": high_risk_processing},
            confidence_score=0.8
        )
    
    async def _check_breach_notification(self, requirement: Dict[str, Any], company_data: Dict[str, Any]) -> ComplianceResult:
        """Check data breach notification procedures"""
        
        breach_procedures = company_data.get("breach_notification", {})
        
        has_procedures = breach_procedures.get("notification_plan", False)
        notification_timeframe = breach_procedures.get("authority_notification_hours", 72)
        subject_notification = breach_procedures.get("subject_notification_plan", False)
        
        if has_procedures and notification_timeframe <= 72 and subject_notification:
            status = ComplianceStatus.COMPLIANT
        elif has_procedures:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "high"),
            description=requirement["description"],
            current_state=f"Notification procedures: {has_procedures}, Timeframe: {notification_timeframe}h",
            required_state="72-hour authority notification, subject notification procedures",
            gap_analysis="Breach notification compliance assessment",
            remediation_steps=self._get_remediation_steps("incident_response", "", ""),
            evidence=breach_procedures,
            confidence_score=0.85
        )
    
    async def _check_dpo_requirement(self, requirement: Dict[str, Any], company_data: Dict[str, Any]) -> ComplianceResult:
        """Check Data Protection Officer requirement"""
        
        dpo_info = company_data.get("data_protection_officer", {})
        requires_dpo = self._requires_dpo(company_data)
        
        has_dpo = dpo_info.get("appointed", False)
        
        if requires_dpo and has_dpo:
            status = ComplianceStatus.COMPLIANT
        elif requires_dpo and not has_dpo:
            status = ComplianceStatus.NON_COMPLIANT
        else:
            status = ComplianceStatus.COMPLIANT  # DPO not required
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "medium", "medium"),
            description=requirement["description"],
            current_state=f"DPO appointed: {has_dpo}, Required: {requires_dpo}",
            required_state="DPO appointed if required by Article 37",
            gap_analysis="DPO requirement assessment",
            remediation_steps=["Appoint qualified DPO"] if requires_dpo and not has_dpo else [],
            evidence={"dpo_info": dpo_info, "requires_dpo": requires_dpo},
            confidence_score=0.9
        )
    
    async def _check_international_transfers(self, requirement: Dict[str, Any], company_data: Dict[str, Any]) -> ComplianceResult:
        """Check international data transfer safeguards"""
        
        transfers = company_data.get("international_transfers", {})
        has_transfers = transfers.get("transfers_outside_eu", False)
        
        if not has_transfers:
            status = ComplianceStatus.COMPLIANT
            gap_analysis = "No international transfers"
        else:
            adequacy_decisions = transfers.get("adequacy_decisions", False)
            standard_clauses = transfers.get("standard_contractual_clauses", False)
            binding_rules = transfers.get("binding_corporate_rules", False)
            
            if adequacy_decisions or standard_clauses or binding_rules:
                status = ComplianceStatus.COMPLIANT
                gap_analysis = "Adequate transfer mechanisms in place"
            else:
                status = ComplianceStatus.NON_COMPLIANT
                gap_analysis = "No adequate transfer mechanisms"
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "high"),
            description=requirement["description"],
            current_state="Transfer safeguards assessed",
            required_state="Adequate protection for international transfers",
            gap_analysis=gap_analysis,
            remediation_steps=["Implement transfer safeguards"] if status != ComplianceStatus.COMPLIANT else [],
            evidence=transfers,
            confidence_score=0.8
        )
    
    async def _check_records_of_processing(self, requirement: Dict[str, Any], company_data: Dict[str, Any]) -> ComplianceResult:
        """Check records of processing activities"""
        
        records = company_data.get("processing_records", {})
        has_records = records.get("maintained", False)
        comprehensive = records.get("comprehensive", False)
        
        if has_records and comprehensive:
            status = ComplianceStatus.COMPLIANT
        elif has_records:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "medium", "medium"),
            description=requirement["description"],
            current_state=f"Records maintained: {has_records}, Comprehensive: {comprehensive}",
            required_state="Comprehensive records of all processing activities",
            gap_analysis="Processing records assessment",
            remediation_steps=self._get_remediation_steps("documentation", "", ""),
            evidence=records,
            confidence_score=0.8
        )
    
    async def _check_data_minimization(self, requirement: Dict[str, Any], company_data: Dict[str, Any]) -> ComplianceResult:
        """Check data minimization implementation"""
        
        minimization = company_data.get("data_minimization", {})
        
        practices = [
            minimization.get("purpose_limitation", False),
            minimization.get("data_inventory", False),
            minimization.get("retention_schedules", False),
            minimization.get("regular_reviews", False)
        ]
        
        implemented = sum(practices)
        compliance_ratio = implemented / len(practices)
        
        if compliance_ratio >= 0.8:
            status = ComplianceStatus.COMPLIANT
        elif compliance_ratio >= 0.6:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "medium"),
            description=requirement["description"],
            current_state=f"{implemented}/{len(practices)} minimization practices implemented",
            required_state="Process only necessary data for specified purposes",
            gap_analysis="Data minimization assessment",
            remediation_steps=self._get_remediation_steps("data_protection", "", ""),
            evidence=minimization,
            confidence_score=0.75
        )
    
    def _requires_dpo(self, company_data: Dict[str, Any]) -> bool:
        """Determine if company requires a DPO under Article 37"""
        
        # Public authority
        if company_data.get("organization_type") == "public_authority":
            return True
        
        # Core activities consist of regular and systematic monitoring
        monitoring = company_data.get("systematic_monitoring", False)
        if monitoring:
            return True
        
        # Core activities consist of large scale processing of special categories
        special_categories = company_data.get("special_category_processing", False)
        large_scale = company_data.get("large_scale_processing", False)
        if special_categories and large_scale:
            return True
        
        return False
    
    async def check_regulatory_updates(
        self,
        period: timedelta = timedelta(days=30)
    ) -> List[RegulationUpdate]:
        """Check for GDPR regulatory updates"""
        
        # In a real implementation, this would check various sources:
        # - European Data Protection Board (EDPB) guidelines
        # - Court decisions (CJEU)
        # - National DPA guidance
        # - Industry notifications
        
        # Simulated updates for demonstration
        updates = [
            RegulationUpdate(
                regulation=RegulationType.GDPR,
                update_date=datetime.now() - timedelta(days=7),
                title="EDPB Guidelines on Consent",
                description="Updated guidelines on obtaining valid consent under Article 7",
                impact_level="medium",
                effective_date=datetime.now() + timedelta(days=30),
                source_url="https://edpb.europa.eu/",
                requires_action=True
            ),
            RegulationUpdate(
                regulation=RegulationType.GDPR,
                update_date=datetime.now() - timedelta(days=14),
                title="Data Transfer Adequacy Decision Update",
                description="New adequacy decision affecting international transfers",
                impact_level="high",
                effective_date=datetime.now(),
                source_url="https://ec.europa.eu/",
                requires_action=True
            )
        ]
        
        # Filter updates within the specified period
        cutoff_date = datetime.now() - period
        recent_updates = [u for u in updates if u.update_date >= cutoff_date]
        
        logger.info(f"Found {len(recent_updates)} GDPR updates in the last {period.days} days")
        return recent_updates
