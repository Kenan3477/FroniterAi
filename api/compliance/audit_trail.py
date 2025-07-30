"""
Audit Trail and Documentation System

Comprehensive audit trail and documentation system for compliance evidence tracking,
regulatory reporting, and compliance history management.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
import json
import hashlib
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """Types of audit events"""
    COMPLIANCE_ASSESSMENT = "compliance_assessment"
    POLICY_CREATION = "policy_creation"
    POLICY_UPDATE = "policy_update"
    POLICY_APPROVAL = "policy_approval"
    RISK_ASSESSMENT = "risk_assessment"
    CONTROL_TESTING = "control_testing"
    INCIDENT_RESPONSE = "incident_response"
    TRAINING_COMPLETION = "training_completion"
    ACCESS_GRANTED = "access_granted"
    ACCESS_REVOKED = "access_revoked"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    REGULATORY_CHANGE = "regulatory_change"
    REMEDIATION_ACTION = "remediation_action"
    SYSTEM_CONFIGURATION = "system_configuration"


class DocumentType(Enum):
    """Types of compliance documents"""
    POLICY = "policy"
    PROCEDURE = "procedure"
    ASSESSMENT_REPORT = "assessment_report"
    RISK_ASSESSMENT = "risk_assessment"
    TRAINING_RECORD = "training_record"
    INCIDENT_REPORT = "incident_report"
    AUDIT_REPORT = "audit_report"
    EVIDENCE = "evidence"
    CERTIFICATE = "certificate"
    CONTRACT = "contract"
    CORRESPONDENCE = "correspondence"
    MEETING_MINUTES = "meeting_minutes"


class ComplianceStatus(Enum):
    """Compliance status values"""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PARTIALLY_COMPLIANT = "partially_compliant"
    REQUIRES_REVIEW = "requires_review"
    REMEDIATION_IN_PROGRESS = "remediation_in_progress"


@dataclass
class AuditEvent:
    """Individual audit event record"""
    event_id: str
    timestamp: datetime
    event_type: AuditEventType
    user_id: str
    user_name: str
    regulation: str
    object_type: str  # What was accessed/modified
    object_id: str
    action: str
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    result: Optional[str] = None
    risk_level: Optional[str] = None
    hash_value: Optional[str] = field(init=False)
    
    def __post_init__(self):
        """Calculate hash for event integrity"""
        event_data = f"{self.event_id}{self.timestamp}{self.user_id}{self.action}{json.dumps(self.details, sort_keys=True)}"
        self.hash_value = hashlib.sha256(event_data.encode()).hexdigest()


@dataclass
class ComplianceDocument:
    """Compliance document record"""
    document_id: str
    document_type: DocumentType
    title: str
    description: str
    regulation: str
    created_date: datetime
    created_by: str
    version: str
    status: str
    file_path: Optional[str] = None
    file_hash: Optional[str] = None
    content: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    retention_date: Optional[datetime] = None
    access_history: List[AuditEvent] = field(default_factory=list)


@dataclass
class ComplianceEvidence:
    """Evidence supporting compliance assertions"""
    evidence_id: str
    regulation: str
    requirement_id: str
    evidence_type: str
    description: str
    collection_date: datetime
    collected_by: str
    evidence_data: Dict[str, Any]
    supporting_documents: List[str]  # Document IDs
    verification_status: str
    expiration_date: Optional[datetime] = None
    automated_collection: bool = False


@dataclass
class AuditTrail:
    """Complete audit trail for compliance tracking"""
    trail_id: str
    organization: str
    regulation: str
    start_date: datetime
    end_date: datetime
    events: List[AuditEvent]
    documents: List[ComplianceDocument]
    evidence: List[ComplianceEvidence]
    summary_stats: Dict[str, Any]
    integrity_verified: bool = False


class AuditTrailManager:
    """
    Manages audit trails and compliance documentation
    """
    
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = Path(storage_path) if storage_path else Path("./compliance_audit")
        self.storage_path.mkdir(exist_ok=True)
        
        # Initialize storage
        self.events_storage = self.storage_path / "events"
        self.documents_storage = self.storage_path / "documents"
        self.evidence_storage = self.storage_path / "evidence"
        
        for path in [self.events_storage, self.documents_storage, self.evidence_storage]:
            path.mkdir(exist_ok=True)
        
        logger.info(f"Audit trail manager initialized with storage: {self.storage_path}")
    
    async def log_audit_event(
        self,
        event_type: AuditEventType,
        user_id: str,
        user_name: str,
        regulation: str,
        object_type: str,
        object_id: str,
        action: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        result: Optional[str] = None,
        risk_level: Optional[str] = None
    ) -> AuditEvent:
        """Log a new audit event"""
        
        event_id = f"audit_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        event = AuditEvent(
            event_id=event_id,
            timestamp=datetime.now(),
            event_type=event_type,
            user_id=user_id,
            user_name=user_name,
            regulation=regulation,
            object_type=object_type,
            object_id=object_id,
            action=action,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            result=result,
            risk_level=risk_level
        )
        
        # Store event
        await self._store_audit_event(event)
        
        logger.info(f"Audit event logged: {event_type.value} for {regulation} by {user_name}")
        
        return event
    
    async def create_compliance_document(
        self,
        document_type: DocumentType,
        title: str,
        description: str,
        regulation: str,
        created_by: str,
        content: Optional[str] = None,
        file_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        retention_period_days: Optional[int] = None
    ) -> ComplianceDocument:
        """Create a new compliance document"""
        
        document_id = f"doc_{regulation}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Calculate file hash if file provided
        file_hash = None
        if file_path and Path(file_path).exists():
            with open(file_path, 'rb') as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
        
        # Calculate retention date
        retention_date = None
        if retention_period_days:
            retention_date = datetime.now() + timedelta(days=retention_period_days)
        
        document = ComplianceDocument(
            document_id=document_id,
            document_type=document_type,
            title=title,
            description=description,
            regulation=regulation,
            created_date=datetime.now(),
            created_by=created_by,
            version="1.0",
            status="active",
            file_path=file_path,
            file_hash=file_hash,
            content=content,
            metadata=metadata or {},
            tags=tags or [],
            retention_date=retention_date
        )
        
        # Store document
        await self._store_compliance_document(document)
        
        # Log audit event
        await self.log_audit_event(
            event_type=AuditEventType.POLICY_CREATION,
            user_id=created_by,
            user_name=created_by,
            regulation=regulation,
            object_type="document",
            object_id=document_id,
            action="create",
            details={"document_type": document_type.value, "title": title}
        )
        
        logger.info(f"Compliance document created: {document_id}")
        
        return document
    
    async def record_compliance_evidence(
        self,
        regulation: str,
        requirement_id: str,
        evidence_type: str,
        description: str,
        collected_by: str,
        evidence_data: Dict[str, Any],
        supporting_documents: Optional[List[str]] = None,
        expiration_days: Optional[int] = None,
        automated_collection: bool = False
    ) -> ComplianceEvidence:
        """Record compliance evidence"""
        
        evidence_id = f"evidence_{regulation}_{requirement_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        expiration_date = None
        if expiration_days:
            expiration_date = datetime.now() + timedelta(days=expiration_days)
        
        evidence = ComplianceEvidence(
            evidence_id=evidence_id,
            regulation=regulation,
            requirement_id=requirement_id,
            evidence_type=evidence_type,
            description=description,
            collection_date=datetime.now(),
            collected_by=collected_by,
            evidence_data=evidence_data,
            supporting_documents=supporting_documents or [],
            verification_status="collected",
            expiration_date=expiration_date,
            automated_collection=automated_collection
        )
        
        # Store evidence
        await self._store_compliance_evidence(evidence)
        
        # Log audit event
        await self.log_audit_event(
            event_type=AuditEventType.COMPLIANCE_ASSESSMENT,
            user_id=collected_by,
            user_name=collected_by,
            regulation=regulation,
            object_type="evidence",
            object_id=evidence_id,
            action="collect",
            details={"requirement_id": requirement_id, "evidence_type": evidence_type}
        )
        
        logger.info(f"Compliance evidence recorded: {evidence_id}")
        
        return evidence
    
    async def generate_audit_trail(
        self,
        organization: str,
        regulation: str,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> AuditTrail:
        """Generate comprehensive audit trail for specified period"""
        
        if not end_date:
            end_date = datetime.now()
        
        trail_id = f"trail_{regulation}_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}"
        
        # Retrieve events in date range
        events = await self._get_events_by_date_range(regulation, start_date, end_date)
        
        # Retrieve relevant documents
        documents = await self._get_documents_by_regulation(regulation)
        
        # Retrieve evidence
        evidence = await self._get_evidence_by_regulation(regulation)
        
        # Calculate summary statistics
        summary_stats = self._calculate_audit_summary(events, documents, evidence)
        
        # Verify integrity
        integrity_verified = await self._verify_audit_integrity(events)
        
        audit_trail = AuditTrail(
            trail_id=trail_id,
            organization=organization,
            regulation=regulation,
            start_date=start_date,
            end_date=end_date,
            events=events,
            documents=documents,
            evidence=evidence,
            summary_stats=summary_stats,
            integrity_verified=integrity_verified
        )
        
        logger.info(f"Audit trail generated: {trail_id} with {len(events)} events")
        
        return audit_trail
    
    async def generate_compliance_report(
        self,
        organization: str,
        regulation: str,
        report_type: str = "comprehensive",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Generate compliance report with audit trail data"""
        
        if not start_date:
            start_date = datetime.now() - timedelta(days=365)
        if not end_date:
            end_date = datetime.now()
        
        # Generate audit trail
        audit_trail = await self.generate_audit_trail(organization, regulation, start_date, end_date)
        
        # Generate report based on type
        if report_type == "comprehensive":
            report = await self._generate_comprehensive_report(audit_trail)
        elif report_type == "executive_summary":
            report = await self._generate_executive_summary(audit_trail)
        elif report_type == "regulatory_submission":
            report = await self._generate_regulatory_submission(audit_trail)
        else:
            report = await self._generate_basic_report(audit_trail)
        
        logger.info(f"Compliance report generated: {report_type} for {regulation}")
        
        return report
    
    async def _store_audit_event(self, event: AuditEvent):
        """Store audit event to persistent storage"""
        
        # Create monthly partition
        month_path = self.events_storage / f"{event.timestamp.year:04d}" / f"{event.timestamp.month:02d}"
        month_path.mkdir(parents=True, exist_ok=True)
        
        # Store event as JSON
        event_file = month_path / f"{event.event_id}.json"
        event_data = {
            "event_id": event.event_id,
            "timestamp": event.timestamp.isoformat(),
            "event_type": event.event_type.value,
            "user_id": event.user_id,
            "user_name": event.user_name,
            "regulation": event.regulation,
            "object_type": event.object_type,
            "object_id": event.object_id,
            "action": event.action,
            "details": event.details,
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "session_id": event.session_id,
            "result": event.result,
            "risk_level": event.risk_level,
            "hash_value": event.hash_value
        }
        
        with open(event_file, 'w') as f:
            json.dump(event_data, f, indent=2)
    
    async def _store_compliance_document(self, document: ComplianceDocument):
        """Store compliance document metadata"""
        
        reg_path = self.documents_storage / document.regulation
        reg_path.mkdir(exist_ok=True)
        
        doc_file = reg_path / f"{document.document_id}.json"
        doc_data = {
            "document_id": document.document_id,
            "document_type": document.document_type.value,
            "title": document.title,
            "description": document.description,
            "regulation": document.regulation,
            "created_date": document.created_date.isoformat(),
            "created_by": document.created_by,
            "version": document.version,
            "status": document.status,
            "file_path": document.file_path,
            "file_hash": document.file_hash,
            "content": document.content,
            "metadata": document.metadata,
            "tags": document.tags,
            "retention_date": document.retention_date.isoformat() if document.retention_date else None
        }
        
        with open(doc_file, 'w') as f:
            json.dump(doc_data, f, indent=2)
    
    async def _store_compliance_evidence(self, evidence: ComplianceEvidence):
        """Store compliance evidence"""
        
        reg_path = self.evidence_storage / evidence.regulation
        reg_path.mkdir(exist_ok=True)
        
        evidence_file = reg_path / f"{evidence.evidence_id}.json"
        evidence_data = {
            "evidence_id": evidence.evidence_id,
            "regulation": evidence.regulation,
            "requirement_id": evidence.requirement_id,
            "evidence_type": evidence.evidence_type,
            "description": evidence.description,
            "collection_date": evidence.collection_date.isoformat(),
            "collected_by": evidence.collected_by,
            "evidence_data": evidence.evidence_data,
            "supporting_documents": evidence.supporting_documents,
            "verification_status": evidence.verification_status,
            "expiration_date": evidence.expiration_date.isoformat() if evidence.expiration_date else None,
            "automated_collection": evidence.automated_collection
        }
        
        with open(evidence_file, 'w') as f:
            json.dump(evidence_data, f, indent=2)
    
    async def _get_events_by_date_range(
        self,
        regulation: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[AuditEvent]:
        """Retrieve audit events within date range"""
        
        events = []
        
        # Iterate through months in range
        current_date = start_date.replace(day=1)
        while current_date <= end_date:
            month_path = self.events_storage / f"{current_date.year:04d}" / f"{current_date.month:02d}"
            
            if month_path.exists():
                for event_file in month_path.glob("*.json"):
                    try:
                        with open(event_file, 'r') as f:
                            event_data = json.load(f)
                        
                        event_time = datetime.fromisoformat(event_data["timestamp"])
                        
                        # Check if event is in range and matches regulation
                        if (start_date <= event_time <= end_date and 
                            event_data["regulation"] == regulation):
                            
                            event = AuditEvent(
                                event_id=event_data["event_id"],
                                timestamp=event_time,
                                event_type=AuditEventType(event_data["event_type"]),
                                user_id=event_data["user_id"],
                                user_name=event_data["user_name"],
                                regulation=event_data["regulation"],
                                object_type=event_data["object_type"],
                                object_id=event_data["object_id"],
                                action=event_data["action"],
                                details=event_data["details"],
                                ip_address=event_data.get("ip_address"),
                                user_agent=event_data.get("user_agent"),
                                session_id=event_data.get("session_id"),
                                result=event_data.get("result"),
                                risk_level=event_data.get("risk_level")
                            )
                            events.append(event)
                    
                    except Exception as e:
                        logger.error(f"Error loading event file {event_file}: {e}")
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        return sorted(events, key=lambda x: x.timestamp)
    
    async def _get_documents_by_regulation(self, regulation: str) -> List[ComplianceDocument]:
        """Retrieve documents for specific regulation"""
        
        documents = []
        reg_path = self.documents_storage / regulation
        
        if reg_path.exists():
            for doc_file in reg_path.glob("*.json"):
                try:
                    with open(doc_file, 'r') as f:
                        doc_data = json.load(f)
                    
                    document = ComplianceDocument(
                        document_id=doc_data["document_id"],
                        document_type=DocumentType(doc_data["document_type"]),
                        title=doc_data["title"],
                        description=doc_data["description"],
                        regulation=doc_data["regulation"],
                        created_date=datetime.fromisoformat(doc_data["created_date"]),
                        created_by=doc_data["created_by"],
                        version=doc_data["version"],
                        status=doc_data["status"],
                        file_path=doc_data.get("file_path"),
                        file_hash=doc_data.get("file_hash"),
                        content=doc_data.get("content"),
                        metadata=doc_data.get("metadata", {}),
                        tags=doc_data.get("tags", []),
                        retention_date=datetime.fromisoformat(doc_data["retention_date"]) if doc_data.get("retention_date") else None
                    )
                    documents.append(document)
                
                except Exception as e:
                    logger.error(f"Error loading document file {doc_file}: {e}")
        
        return documents
    
    async def _get_evidence_by_regulation(self, regulation: str) -> List[ComplianceEvidence]:
        """Retrieve evidence for specific regulation"""
        
        evidence_list = []
        reg_path = self.evidence_storage / regulation
        
        if reg_path.exists():
            for evidence_file in reg_path.glob("*.json"):
                try:
                    with open(evidence_file, 'r') as f:
                        evidence_data = json.load(f)
                    
                    evidence = ComplianceEvidence(
                        evidence_id=evidence_data["evidence_id"],
                        regulation=evidence_data["regulation"],
                        requirement_id=evidence_data["requirement_id"],
                        evidence_type=evidence_data["evidence_type"],
                        description=evidence_data["description"],
                        collection_date=datetime.fromisoformat(evidence_data["collection_date"]),
                        collected_by=evidence_data["collected_by"],
                        evidence_data=evidence_data["evidence_data"],
                        supporting_documents=evidence_data["supporting_documents"],
                        verification_status=evidence_data["verification_status"],
                        expiration_date=datetime.fromisoformat(evidence_data["expiration_date"]) if evidence_data.get("expiration_date") else None,
                        automated_collection=evidence_data.get("automated_collection", False)
                    )
                    evidence_list.append(evidence)
                
                except Exception as e:
                    logger.error(f"Error loading evidence file {evidence_file}: {e}")
        
        return evidence_list
    
    def _calculate_audit_summary(
        self,
        events: List[AuditEvent],
        documents: List[ComplianceDocument],
        evidence: List[ComplianceEvidence]
    ) -> Dict[str, Any]:
        """Calculate summary statistics for audit trail"""
        
        summary = {
            "total_events": len(events),
            "total_documents": len(documents),
            "total_evidence": len(evidence),
            "event_types": {},
            "document_types": {},
            "evidence_types": {},
            "users": set(),
            "time_range": {
                "start": min(e.timestamp for e in events) if events else None,
                "end": max(e.timestamp for e in events) if events else None
            },
            "risk_levels": {},
            "actions": {}
        }
        
        # Analyze events
        for event in events:
            # Event types
            event_type = event.event_type.value
            summary["event_types"][event_type] = summary["event_types"].get(event_type, 0) + 1
            
            # Users
            summary["users"].add(event.user_name)
            
            # Risk levels
            if event.risk_level:
                summary["risk_levels"][event.risk_level] = summary["risk_levels"].get(event.risk_level, 0) + 1
            
            # Actions
            summary["actions"][event.action] = summary["actions"].get(event.action, 0) + 1
        
        # Analyze documents
        for doc in documents:
            doc_type = doc.document_type.value
            summary["document_types"][doc_type] = summary["document_types"].get(doc_type, 0) + 1
        
        # Analyze evidence
        for ev in evidence:
            ev_type = ev.evidence_type
            summary["evidence_types"][ev_type] = summary["evidence_types"].get(ev_type, 0) + 1
        
        summary["users"] = list(summary["users"])
        
        return summary
    
    async def _verify_audit_integrity(self, events: List[AuditEvent]) -> bool:
        """Verify integrity of audit events"""
        
        for event in events:
            # Recalculate hash
            event_data = f"{event.event_id}{event.timestamp}{event.user_id}{event.action}{json.dumps(event.details, sort_keys=True)}"
            calculated_hash = hashlib.sha256(event_data.encode()).hexdigest()
            
            if calculated_hash != event.hash_value:
                logger.warning(f"Integrity check failed for event {event.event_id}")
                return False
        
        return True
    
    async def _generate_comprehensive_report(self, audit_trail: AuditTrail) -> Dict[str, Any]:
        """Generate comprehensive compliance report"""
        
        return {
            "report_type": "comprehensive",
            "generation_date": datetime.now().isoformat(),
            "organization": audit_trail.organization,
            "regulation": audit_trail.regulation,
            "period": {
                "start": audit_trail.start_date.isoformat(),
                "end": audit_trail.end_date.isoformat()
            },
            "summary": audit_trail.summary_stats,
            "integrity_status": "verified" if audit_trail.integrity_verified else "failed",
            "events_summary": {
                "total_events": len(audit_trail.events),
                "event_breakdown": audit_trail.summary_stats.get("event_types", {}),
                "high_risk_events": len([e for e in audit_trail.events if e.risk_level == "high"]),
                "failed_events": len([e for e in audit_trail.events if e.result == "failed"])
            },
            "documents_summary": {
                "total_documents": len(audit_trail.documents),
                "document_breakdown": audit_trail.summary_stats.get("document_types", {}),
                "active_policies": len([d for d in audit_trail.documents if d.status == "active"]),
                "expired_documents": len([d for d in audit_trail.documents if d.retention_date and d.retention_date < datetime.now()])
            },
            "evidence_summary": {
                "total_evidence": len(audit_trail.evidence),
                "evidence_breakdown": audit_trail.summary_stats.get("evidence_types", {}),
                "verified_evidence": len([e for e in audit_trail.evidence if e.verification_status == "verified"]),
                "expired_evidence": len([e for e in audit_trail.evidence if e.expiration_date and e.expiration_date < datetime.now()])
            },
            "compliance_indicators": {
                "documentation_completeness": len(audit_trail.documents) / max(len(audit_trail.evidence), 1),
                "evidence_coverage": len(audit_trail.evidence) / max(len(set(e.requirement_id for e in audit_trail.evidence)), 1),
                "audit_activity": len(audit_trail.events) / ((audit_trail.end_date - audit_trail.start_date).days + 1)
            }
        }
    
    async def _generate_executive_summary(self, audit_trail: AuditTrail) -> Dict[str, Any]:
        """Generate executive summary report"""
        
        return {
            "report_type": "executive_summary",
            "generation_date": datetime.now().isoformat(),
            "organization": audit_trail.organization,
            "regulation": audit_trail.regulation,
            "key_metrics": {
                "compliance_events": len(audit_trail.events),
                "policy_documents": len([d for d in audit_trail.documents if d.document_type == DocumentType.POLICY]),
                "evidence_items": len(audit_trail.evidence),
                "integrity_status": "verified" if audit_trail.integrity_verified else "failed"
            },
            "risk_indicators": {
                "high_risk_events": len([e for e in audit_trail.events if e.risk_level == "high"]),
                "failed_actions": len([e for e in audit_trail.events if e.result == "failed"]),
                "expired_documents": len([d for d in audit_trail.documents if d.retention_date and d.retention_date < datetime.now()])
            },
            "recommendations": [
                "Maintain regular compliance monitoring",
                "Review and update expired documents",
                "Address high-risk events promptly",
                "Ensure comprehensive evidence collection"
            ]
        }
    
    async def _generate_regulatory_submission(self, audit_trail: AuditTrail) -> Dict[str, Any]:
        """Generate regulatory submission report"""
        
        return {
            "report_type": "regulatory_submission",
            "generation_date": datetime.now().isoformat(),
            "organization": audit_trail.organization,
            "regulation": audit_trail.regulation,
            "certification": {
                "integrity_verified": audit_trail.integrity_verified,
                "audit_period": f"{audit_trail.start_date.date()} to {audit_trail.end_date.date()}",
                "total_events_audited": len(audit_trail.events)
            },
            "compliance_evidence": [
                {
                    "requirement_id": evidence.requirement_id,
                    "evidence_type": evidence.evidence_type,
                    "collection_date": evidence.collection_date.isoformat(),
                    "verification_status": evidence.verification_status
                }
                for evidence in audit_trail.evidence
            ],
            "audit_summary": audit_trail.summary_stats
        }
    
    async def _generate_basic_report(self, audit_trail: AuditTrail) -> Dict[str, Any]:
        """Generate basic compliance report"""
        
        return {
            "report_type": "basic",
            "generation_date": datetime.now().isoformat(),
            "organization": audit_trail.organization,
            "regulation": audit_trail.regulation,
            "summary": audit_trail.summary_stats,
            "integrity_verified": audit_trail.integrity_verified
        }
