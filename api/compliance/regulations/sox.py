"""
SOX Compliance Checker

Implementation of SOX (Sarbanes-Oxley Act) compliance checking
for financial controls and reporting requirements.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

from ..core.regulation_checker import RegulationChecker, RegulationUpdate
from ..core.compliance_engine import ComplianceResult, ComplianceStatus, RiskLevel, RegulationType

logger = logging.getLogger(__name__)


class SOXChecker(RegulationChecker):
    """
    SOX compliance checker for financial reporting and internal controls
    """
    
    def __init__(self):
        super().__init__(RegulationType.SOX)
    
    def _load_requirements(self) -> Dict[str, Any]:
        """Load SOX-specific requirements"""
        return {
            "internal_controls_financial_reporting": {
                "id": "sox_404",
                "title": "Internal Controls over Financial Reporting (Section 404)",
                "description": "Management assessment of internal controls effectiveness",
                "risk_level": "critical",
                "data_sensitivity": "high"
            },
            "ceo_cfo_certification": {
                "id": "sox_302",
                "title": "CEO/CFO Certification (Section 302)",
                "description": "Principal officers must certify financial reports",
                "risk_level": "critical",
                "data_sensitivity": "high"
            },
            "auditor_independence": {
                "id": "sox_201_206",
                "title": "Auditor Independence (Sections 201-206)",
                "description": "External auditor independence requirements",
                "risk_level": "high",
                "data_sensitivity": "medium"
            },
            "audit_committee_requirements": {
                "id": "sox_301",
                "title": "Audit Committee Requirements (Section 301)",
                "description": "Independent audit committee with financial expertise",
                "risk_level": "high",
                "data_sensitivity": "medium"
            },
            "whistleblower_protection": {
                "id": "sox_806",
                "title": "Whistleblower Protection (Section 806)",
                "description": "Protection for employees reporting fraud",
                "risk_level": "medium",
                "data_sensitivity": "medium"
            },
            "document_retention": {
                "id": "sox_802",
                "title": "Document Retention (Section 802)",
                "description": "Record retention requirements for audits",
                "risk_level": "high",
                "data_sensitivity": "high"
            },
            "disclosure_controls": {
                "id": "sox_disclosure",
                "title": "Disclosure Controls and Procedures",
                "description": "Controls to ensure timely and accurate disclosure",
                "risk_level": "critical",
                "data_sensitivity": "high"
            },
            "financial_reporting_controls": {
                "id": "sox_icfr",
                "title": "Internal Controls over Financial Reporting",
                "description": "Controls over preparation of financial statements",
                "risk_level": "critical",
                "data_sensitivity": "high"
            },
            "management_assessment": {
                "id": "sox_mgmt_assessment",
                "title": "Management Assessment of Controls",
                "description": "Annual management assessment of control effectiveness",
                "risk_level": "critical",
                "data_sensitivity": "high"
            },
            "code_of_ethics": {
                "id": "sox_406",
                "title": "Code of Ethics (Section 406)",
                "description": "Code of ethics for senior financial officers",
                "risk_level": "medium",
                "data_sensitivity": "low"
            }
        }
    
    async def check_compliance(
        self,
        company_data: Dict[str, Any],
        scope: str = "full"
    ) -> List[ComplianceResult]:
        """Check SOX compliance"""
        
        logger.info("Starting SOX compliance assessment")
        results = []
        
        # Check if organization is subject to SOX
        is_public_company = company_data.get("is_public_company", False)
        if not is_public_company:
            logger.info("Organization is not a public company - SOX not applicable")
            return []
        
        # Check each SOX requirement
        for req_key, requirement in self.requirements.items():
            try:
                if scope == "quick" and requirement["risk_level"] not in ["critical", "high"]:
                    continue
                
                result = await self._check_requirement(req_key, requirement, company_data)
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error checking SOX requirement {req_key}: {str(e)}")
                
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
        
        logger.info(f"SOX compliance assessment completed. {len(results)} requirements checked.")
        return results
    
    async def _check_requirement(
        self,
        req_key: str,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check individual SOX requirement"""
        
        if req_key == "internal_controls_financial_reporting":
            return await self._check_icfr(requirement, company_data)
        elif req_key == "ceo_cfo_certification":
            return await self._check_officer_certification(requirement, company_data)
        elif req_key == "auditor_independence":
            return await self._check_auditor_independence(requirement, company_data)
        elif req_key == "audit_committee_requirements":
            return await self._check_audit_committee(requirement, company_data)
        elif req_key == "whistleblower_protection":
            return await self._check_whistleblower_protection(requirement, company_data)
        elif req_key == "document_retention":
            return await self._check_document_retention(requirement, company_data)
        elif req_key == "disclosure_controls":
            return await self._check_disclosure_controls(requirement, company_data)
        elif req_key == "financial_reporting_controls":
            return await self._check_financial_reporting_controls(requirement, company_data)
        elif req_key == "management_assessment":
            return await self._check_management_assessment(requirement, company_data)
        elif req_key == "code_of_ethics":
            return await self._check_code_of_ethics(requirement, company_data)
        else:
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
    
    async def _check_icfr(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check Internal Controls over Financial Reporting (Section 404)"""
        
        icfr = company_data.get("internal_controls_financial_reporting", {})
        
        required_elements = [
            "control_framework_documented",        # COSO or similar framework
            "control_testing_performed",           # Regular testing of controls
            "deficiencies_remediated",            # Process for addressing deficiencies
            "management_assessment_completed",     # Annual management assessment
            "external_auditor_attestation",       # Auditor attestation on controls
            "quarterly_evaluations"               # Quarterly evaluation process
        ]
        
        implemented_elements = sum(
            1 for element in required_elements
            if icfr.get(element, False)
        )
        
        compliance_ratio = implemented_elements / len(required_elements)
        
        # Check for material weaknesses
        material_weaknesses = icfr.get("material_weaknesses", [])
        has_material_weaknesses = len(material_weaknesses) > 0
        
        if compliance_ratio >= 0.9 and not has_material_weaknesses:
            status = ComplianceStatus.COMPLIANT
            current_state = f"Strong ICFR implementation ({implemented_elements}/{len(required_elements)})"
            gap_analysis = "Internal controls effectively designed and operating"
            remediation_steps = ["Continue quarterly monitoring and testing"]
        elif compliance_ratio >= 0.7:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
            current_state = f"ICFR partially implemented ({implemented_elements}/{len(required_elements)})"
            gap_analysis = "Some internal control elements need strengthening"
            remediation_steps = [
                "Complete implementation of missing control elements",
                "Address any identified material weaknesses",
                "Enhance control testing procedures"
            ]
        else:
            status = ComplianceStatus.NON_COMPLIANT
            current_state = f"Insufficient ICFR implementation ({implemented_elements}/{len(required_elements)})"
            gap_analysis = "Critical gaps in internal controls over financial reporting"
            remediation_steps = [
                "URGENT: Implement comprehensive ICFR framework",
                "Document all financial reporting processes",
                "Establish control testing procedures",
                "Conduct management assessment"
            ]
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "critical"),
            description=requirement["description"],
            current_state=current_state,
            required_state="Effective internal controls over financial reporting",
            gap_analysis=gap_analysis,
            remediation_steps=remediation_steps,
            evidence={
                "implemented_elements": implemented_elements,
                "material_weaknesses": material_weaknesses,
                "details": icfr
            },
            confidence_score=0.9
        )
    
    async def _check_officer_certification(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check CEO/CFO certification requirements (Section 302)"""
        
        certifications = company_data.get("officer_certifications", {})
        
        ceo_certification = certifications.get("ceo_certification", False)
        cfo_certification = certifications.get("cfo_certification", False)
        quarterly_certifications = certifications.get("quarterly_certifications", False)
        annual_certifications = certifications.get("annual_certifications", False)
        
        if ceo_certification and cfo_certification and quarterly_certifications and annual_certifications:
            status = ComplianceStatus.COMPLIANT
            current_state = "CEO and CFO certifications properly executed"
            gap_analysis = "Officer certification requirements met"
            remediation_steps = ["Maintain certification procedures"]
        elif ceo_certification and cfo_certification:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
            current_state = "Officers appointed but certification process needs improvement"
            gap_analysis = "Certification procedures need enhancement"
            remediation_steps = [
                "Establish quarterly certification process",
                "Ensure annual certification completion",
                "Document certification procedures"
            ]
        else:
            status = ComplianceStatus.NON_COMPLIANT
            current_state = "Officer certification requirements not met"
            gap_analysis = "Critical gap in executive certification"
            remediation_steps = [
                "URGENT: Establish CEO/CFO certification process",
                "Implement quarterly and annual certification procedures",
                "Train executives on certification requirements"
            ]
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "critical"),
            description=requirement["description"],
            current_state=current_state,
            required_state="CEO and CFO must certify periodic reports",
            gap_analysis=gap_analysis,
            remediation_steps=remediation_steps,
            evidence=certifications,
            confidence_score=0.95
        )
    
    async def _check_auditor_independence(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check auditor independence requirements"""
        
        auditor_info = company_data.get("external_auditor", {})
        
        independence_controls = [
            "no_prohibited_services",              # No prohibited non-audit services
            "audit_committee_approval",            # Audit committee pre-approval
            "partner_rotation",                    # Lead partner rotation
            "independence_confirmations",          # Independence confirmations
            "conflict_assessments"                # Conflict of interest assessments
        ]
        
        implemented_controls = sum(
            1 for control in independence_controls
            if auditor_info.get(control, False)
        )
        
        compliance_ratio = implemented_controls / len(independence_controls)
        
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
            risk_level=self._determine_risk_level(status, "medium", "high"),
            description=requirement["description"],
            current_state=f"Auditor independence controls: {implemented_controls}/{len(independence_controls)}",
            required_state="External auditor independence maintained",
            gap_analysis=f"Auditor independence compliance at {compliance_ratio*100:.0f}%",
            remediation_steps=[
                "Review and enhance auditor independence procedures",
                "Ensure audit committee oversight",
                "Implement partner rotation requirements"
            ] if status != ComplianceStatus.COMPLIANT else ["Maintain independence controls"],
            evidence=auditor_info,
            confidence_score=0.85
        )
    
    async def _check_audit_committee(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check audit committee requirements (Section 301)"""
        
        audit_committee = company_data.get("audit_committee", {})
        
        has_audit_committee = audit_committee.get("established", False)
        independent_members = audit_committee.get("independent_members", False)
        financial_expert = audit_committee.get("financial_expert", False)
        charter_established = audit_committee.get("charter_established", False)
        regular_meetings = audit_committee.get("regular_meetings", False)
        
        required_elements = [
            has_audit_committee,
            independent_members,
            financial_expert,
            charter_established,
            regular_meetings
        ]
        
        implemented_elements = sum(required_elements)
        
        if implemented_elements >= 4:
            status = ComplianceStatus.COMPLIANT
        elif implemented_elements >= 3:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "medium", "high"),
            description=requirement["description"],
            current_state=f"Audit committee elements: {implemented_elements}/5 implemented",
            required_state="Independent audit committee with financial expertise",
            gap_analysis="Audit committee assessment",
            remediation_steps=[
                "Establish independent audit committee",
                "Appoint financial expert to committee",
                "Develop audit committee charter",
                "Schedule regular committee meetings"
            ] if status != ComplianceStatus.COMPLIANT else ["Maintain audit committee"],
            evidence=audit_committee,
            confidence_score=0.9
        )
    
    async def _check_whistleblower_protection(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check whistleblower protection (Section 806)"""
        
        whistleblower = company_data.get("whistleblower_protection", {})
        
        has_program = whistleblower.get("program_established", False)
        reporting_mechanisms = whistleblower.get("reporting_mechanisms", False)
        protection_policies = whistleblower.get("protection_policies", False)
        investigation_procedures = whistleblower.get("investigation_procedures", False)
        
        if has_program and reporting_mechanisms and protection_policies:
            status = ComplianceStatus.COMPLIANT
        elif has_program:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "medium", "medium"),
            description=requirement["description"],
            current_state=f"Whistleblower program: {has_program}",
            required_state="Protection for employees reporting fraud",
            gap_analysis="Whistleblower protection assessment",
            remediation_steps=[
                "Establish whistleblower protection program",
                "Create anonymous reporting mechanisms",
                "Develop protection and investigation procedures"
            ] if status != ComplianceStatus.COMPLIANT else ["Maintain whistleblower program"],
            evidence=whistleblower,
            confidence_score=0.8
        )
    
    async def _check_document_retention(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check document retention requirements (Section 802)"""
        
        retention = company_data.get("document_retention", {})
        
        has_policy = retention.get("retention_policy", False)
        audit_records = retention.get("audit_record_retention", False)
        financial_records = retention.get("financial_record_retention", False)
        seven_year_retention = retention.get("seven_year_retention", False)
        
        if has_policy and audit_records and financial_records and seven_year_retention:
            status = ComplianceStatus.COMPLIANT
        elif has_policy and (audit_records or financial_records):
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "high"),
            description=requirement["description"],
            current_state=f"Retention policy: {has_policy}, 7-year retention: {seven_year_retention}",
            required_state="7-year retention for audit and financial records",
            gap_analysis="Document retention assessment",
            remediation_steps=self._get_remediation_steps("documentation", "", ""),
            evidence=retention,
            confidence_score=0.85
        )
    
    async def _check_disclosure_controls(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check disclosure controls and procedures"""
        
        disclosure_controls = company_data.get("disclosure_controls", {})
        
        controls_documented = disclosure_controls.get("controls_documented", False)
        effectiveness_tested = disclosure_controls.get("effectiveness_tested", False)
        quarterly_evaluation = disclosure_controls.get("quarterly_evaluation", False)
        management_conclusion = disclosure_controls.get("management_conclusion", False)
        
        if controls_documented and effectiveness_tested and quarterly_evaluation:
            status = ComplianceStatus.COMPLIANT
        elif controls_documented:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "critical"),
            description=requirement["description"],
            current_state=f"Disclosure controls documented: {controls_documented}",
            required_state="Effective disclosure controls and procedures",
            gap_analysis="Disclosure controls assessment",
            remediation_steps=[
                "Document disclosure controls and procedures",
                "Test control effectiveness",
                "Implement quarterly evaluation process"
            ] if status != ComplianceStatus.COMPLIANT else ["Maintain disclosure controls"],
            evidence=disclosure_controls,
            confidence_score=0.85
        )
    
    async def _check_financial_reporting_controls(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check financial reporting controls"""
        
        # This overlaps with ICFR but focuses on specific financial reporting aspects
        fr_controls = company_data.get("financial_reporting_controls", {})
        
        journal_entry_controls = fr_controls.get("journal_entry_controls", False)
        period_end_controls = fr_controls.get("period_end_controls", False)
        management_review_controls = fr_controls.get("management_review_controls", False)
        segregation_of_duties = fr_controls.get("segregation_of_duties", False)
        
        implemented_controls = sum([
            journal_entry_controls,
            period_end_controls,
            management_review_controls,
            segregation_of_duties
        ])
        
        if implemented_controls >= 3:
            status = ComplianceStatus.COMPLIANT
        elif implemented_controls >= 2:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "critical"),
            description=requirement["description"],
            current_state=f"Financial reporting controls: {implemented_controls}/4 implemented",
            required_state="Comprehensive financial reporting controls",
            gap_analysis="Financial reporting controls assessment",
            remediation_steps=[
                "Implement journal entry controls",
                "Establish period-end controls",
                "Create management review controls",
                "Ensure segregation of duties"
            ] if status != ComplianceStatus.COMPLIANT else ["Maintain reporting controls"],
            evidence=fr_controls,
            confidence_score=0.8
        )
    
    async def _check_management_assessment(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check management assessment of controls"""
        
        mgmt_assessment = company_data.get("management_assessment", {})
        
        annual_assessment = mgmt_assessment.get("annual_assessment_completed", False)
        assessment_documented = mgmt_assessment.get("assessment_documented", False)
        deficiencies_identified = mgmt_assessment.get("deficiencies_process", False)
        remediation_tracking = mgmt_assessment.get("remediation_tracking", False)
        
        if annual_assessment and assessment_documented and deficiencies_identified:
            status = ComplianceStatus.COMPLIANT
        elif annual_assessment:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "high", "critical"),
            description=requirement["description"],
            current_state=f"Annual assessment: {annual_assessment}",
            required_state="Annual management assessment of control effectiveness",
            gap_analysis="Management assessment process evaluation",
            remediation_steps=[
                "Complete annual management assessment",
                "Document assessment methodology",
                "Establish deficiency remediation process"
            ] if status != ComplianceStatus.COMPLIANT else ["Maintain assessment process"],
            evidence=mgmt_assessment,
            confidence_score=0.9
        )
    
    async def _check_code_of_ethics(
        self,
        requirement: Dict[str, Any],
        company_data: Dict[str, Any]
    ) -> ComplianceResult:
        """Check code of ethics for senior financial officers (Section 406)"""
        
        code_of_ethics = company_data.get("code_of_ethics", {})
        
        has_code = code_of_ethics.get("code_established", False)
        covers_financial_officers = code_of_ethics.get("covers_financial_officers", False)
        disclosure_requirements = code_of_ethics.get("disclosure_requirements", False)
        training_provided = code_of_ethics.get("training_provided", False)
        
        if has_code and covers_financial_officers and disclosure_requirements:
            status = ComplianceStatus.COMPLIANT
        elif has_code:
            status = ComplianceStatus.PARTIALLY_COMPLIANT
        else:
            status = ComplianceStatus.NON_COMPLIANT
        
        return self._create_result(
            requirement_id=requirement["id"],
            requirement_name=requirement["title"],
            status=status,
            risk_level=self._determine_risk_level(status, "low", "medium"),
            description=requirement["description"],
            current_state=f"Code of ethics: {has_code}",
            required_state="Code of ethics for senior financial officers",
            gap_analysis="Code of ethics assessment",
            remediation_steps=[
                "Establish code of ethics",
                "Ensure coverage of financial officers",
                "Implement disclosure requirements"
            ] if status != ComplianceStatus.COMPLIANT else ["Maintain code of ethics"],
            evidence=code_of_ethics,
            confidence_score=0.8
        )
    
    async def check_regulatory_updates(
        self,
        period: timedelta = timedelta(days=30)
    ) -> List[RegulationUpdate]:
        """Check for SOX regulatory updates"""
        
        # In a real implementation, this would check:
        # - SEC guidance and releases
        # - PCAOB standards updates
        # - Court decisions and interpretations
        
        updates = [
            RegulationUpdate(
                regulation=RegulationType.SOX,
                update_date=datetime.now() - timedelta(days=5),
                title="SEC Guidance on ICFR",
                description="Updated SEC guidance on internal controls assessment",
                impact_level="medium",
                effective_date=datetime.now() + timedelta(days=60),
                source_url="https://www.sec.gov/",
                requires_action=True
            ),
            RegulationUpdate(
                regulation=RegulationType.SOX,
                update_date=datetime.now() - timedelta(days=15),
                title="PCAOB Auditing Standard Update",
                description="New auditing standard affecting SOX compliance",
                impact_level="high",
                effective_date=datetime.now() + timedelta(days=90),
                source_url="https://pcaobus.org/",
                requires_action=True
            )
        ]
        
        cutoff_date = datetime.now() - period
        recent_updates = [u for u in updates if u.update_date >= cutoff_date]
        
        logger.info(f"Found {len(recent_updates)} SOX updates in the last {period.days} days")
        return recent_updates
