"""
Version Control and Update Tracking System

Comprehensive version control system for tracking regulatory updates,
document changes, and compliance program evolution with full audit trail.
"""

import json
import hashlib
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import sqlite3
from pathlib import Path
import difflib
import git


class ChangeType(Enum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    RESTORED = "restored"
    ARCHIVED = "archived"


class VersionStatus(Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    SUPERSEDED = "superseded"


class UpdateSource(Enum):
    REGULATORY_BODY = "regulatory_body"
    INTERNAL_REVIEW = "internal_review"
    AUDIT_FINDING = "audit_finding"
    EXTERNAL_COUNSEL = "external_counsel"
    INDUSTRY_GUIDANCE = "industry_guidance"
    INCIDENT_RESPONSE = "incident_response"


@dataclass
class VersionInfo:
    """Version information for a document or regulation"""
    version: str
    status: VersionStatus
    created_date: datetime
    created_by: str
    approved_date: Optional[datetime] = None
    approved_by: Optional[str] = None
    change_summary: str = ""
    change_type: ChangeType = ChangeType.UPDATED
    update_source: Optional[UpdateSource] = None
    regulatory_reference: Optional[str] = None
    impact_assessment: Optional[str] = None
    effective_date: Optional[datetime] = None


@dataclass
class DocumentVersion:
    """Complete document version with content and metadata"""
    document_id: str
    version_info: VersionInfo
    content: str
    content_hash: str
    file_path: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    parent_version: Optional[str] = None
    child_versions: List[str] = field(default_factory=list)


@dataclass
class ChangeLog:
    """Change log entry"""
    id: str
    document_id: str
    version_from: Optional[str]
    version_to: str
    change_type: ChangeType
    change_summary: str
    change_details: str
    changed_by: str
    change_date: datetime
    update_source: UpdateSource
    regulatory_reference: Optional[str] = None
    impact_assessment: Optional[str] = None
    approval_required: bool = True
    approved: bool = False
    approved_by: Optional[str] = None
    approved_date: Optional[datetime] = None


class VersionControlSystem:
    """
    Comprehensive version control system for compliance documents
    """
    
    def __init__(self, knowledge_base_path: str):
        self.kb_path = Path(knowledge_base_path)
        self.db_path = self.kb_path / "version_control.db"
        self.git_repo_path = self.kb_path / ".git"
        self.initialize_database()
        self.initialize_git_repo()
    
    def initialize_database(self):
        """Initialize SQLite database for version tracking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                document_type TEXT NOT NULL,
                current_version TEXT NOT NULL,
                status TEXT NOT NULL,
                created_date TIMESTAMP NOT NULL,
                created_by TEXT NOT NULL,
                last_modified TIMESTAMP,
                last_modified_by TEXT,
                file_path TEXT NOT NULL,
                jurisdiction TEXT,
                regulation_tags TEXT,
                industry_tags TEXT,
                UNIQUE(file_path)
            )
        """)
        
        # Versions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS versions (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                version TEXT NOT NULL,
                status TEXT NOT NULL,
                content TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                metadata TEXT,
                created_date TIMESTAMP NOT NULL,
                created_by TEXT NOT NULL,
                approved_date TIMESTAMP,
                approved_by TEXT,
                change_summary TEXT,
                change_type TEXT NOT NULL,
                update_source TEXT,
                regulatory_reference TEXT,
                impact_assessment TEXT,
                effective_date TIMESTAMP,
                parent_version TEXT,
                FOREIGN KEY (document_id) REFERENCES documents (id),
                UNIQUE(document_id, version)
            )
        """)
        
        # Change log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS change_log (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                version_from TEXT,
                version_to TEXT NOT NULL,
                change_type TEXT NOT NULL,
                change_summary TEXT NOT NULL,
                change_details TEXT,
                changed_by TEXT NOT NULL,
                change_date TIMESTAMP NOT NULL,
                update_source TEXT NOT NULL,
                regulatory_reference TEXT,
                impact_assessment TEXT,
                approval_required BOOLEAN DEFAULT TRUE,
                approved BOOLEAN DEFAULT FALSE,
                approved_by TEXT,
                approved_date TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents (id)
            )
        """)
        
        # Regulatory updates tracking
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS regulatory_updates (
                id TEXT PRIMARY KEY,
                regulation_name TEXT NOT NULL,
                jurisdiction TEXT NOT NULL,
                update_date TIMESTAMP NOT NULL,
                effective_date TIMESTAMP,
                update_summary TEXT NOT NULL,
                update_details TEXT,
                source_url TEXT,
                impact_level TEXT,
                affected_documents TEXT,
                status TEXT DEFAULT 'pending',
                reviewed_by TEXT,
                reviewed_date TIMESTAMP,
                implementation_deadline TIMESTAMP
            )
        """)
        
        # Approval workflow table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS approval_workflow (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                version TEXT NOT NULL,
                workflow_step INTEGER NOT NULL,
                approver_role TEXT NOT NULL,
                approver_user TEXT,
                approval_status TEXT DEFAULT 'pending',
                approval_date TIMESTAMP,
                comments TEXT,
                FOREIGN KEY (document_id) REFERENCES documents (id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def initialize_git_repo(self):
        """Initialize Git repository for file-level version control"""
        if not self.git_repo_path.exists():
            try:
                repo = git.Repo.init(self.kb_path)
                # Create initial commit
                repo.index.add(['.'])
                repo.index.commit("Initial knowledge base commit")
            except Exception as e:
                print(f"Warning: Could not initialize Git repository: {e}")
    
    def create_document(self, document_id: str, title: str, document_type: str,
                       content: str, file_path: str, created_by: str,
                       metadata: Dict[str, Any] = None) -> DocumentVersion:
        """Create new document with initial version"""
        if metadata is None:
            metadata = {}
        
        # Generate content hash
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        
        # Create version info
        version_info = VersionInfo(
            version="1.0",
            status=VersionStatus.DRAFT,
            created_date=datetime.now(),
            created_by=created_by,
            change_summary="Initial document creation",
            change_type=ChangeType.CREATED
        )
        
        # Create document version
        doc_version = DocumentVersion(
            document_id=document_id,
            version_info=version_info,
            content=content,
            content_hash=content_hash,
            file_path=file_path,
            metadata=metadata
        )
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Insert document record
        cursor.execute("""
            INSERT INTO documents 
            (id, title, document_type, current_version, status, created_date, 
             created_by, last_modified, last_modified_by, file_path, 
             jurisdiction, regulation_tags, industry_tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            document_id, title, document_type, version_info.version,
            version_info.status.value, version_info.created_date, created_by,
            version_info.created_date, created_by, file_path,
            json.dumps(metadata.get('jurisdictions', [])),
            json.dumps(metadata.get('regulation_tags', [])),
            json.dumps(metadata.get('industry_tags', []))
        ))
        
        # Insert version record
        cursor.execute("""
            INSERT INTO versions 
            (id, document_id, version, status, content, content_hash, metadata,
             created_date, created_by, change_summary, change_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"{document_id}_v{version_info.version}", document_id,
            version_info.version, version_info.status.value, content,
            content_hash, json.dumps(metadata), version_info.created_date,
            created_by, version_info.change_summary, version_info.change_type.value
        ))
        
        # Create change log entry
        self.log_change(
            document_id=document_id,
            version_from=None,
            version_to=version_info.version,
            change_type=ChangeType.CREATED,
            change_summary="Initial document creation",
            changed_by=created_by,
            update_source=UpdateSource.INTERNAL_REVIEW
        )
        
        conn.commit()
        conn.close()
        
        # Commit to git
        self.git_commit(file_path, f"Create document {title} v{version_info.version}")
        
        return doc_version
    
    def update_document(self, document_id: str, new_content: str, updated_by: str,
                       change_summary: str, update_source: UpdateSource,
                       regulatory_reference: str = None,
                       impact_assessment: str = None,
                       effective_date: datetime = None) -> DocumentVersion:
        """Create new version of existing document"""
        
        # Get current document info
        current_version = self.get_current_version(document_id)
        if not current_version:
            raise ValueError(f"Document {document_id} not found")
        
        # Check if content actually changed
        new_content_hash = hashlib.sha256(new_content.encode()).hexdigest()
        if new_content_hash == current_version.content_hash:
            return current_version  # No changes
        
        # Generate new version number
        new_version = self.increment_version(current_version.version_info.version)
        
        # Create new version info
        version_info = VersionInfo(
            version=new_version,
            status=VersionStatus.DRAFT,
            created_date=datetime.now(),
            created_by=updated_by,
            change_summary=change_summary,
            change_type=ChangeType.UPDATED,
            update_source=update_source,
            regulatory_reference=regulatory_reference,
            impact_assessment=impact_assessment,
            effective_date=effective_date
        )
        
        # Create new document version
        doc_version = DocumentVersion(
            document_id=document_id,
            version_info=version_info,
            content=new_content,
            content_hash=new_content_hash,
            file_path=current_version.file_path,
            metadata=current_version.metadata,
            parent_version=current_version.version_info.version
        )
        
        # Store in database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Insert new version record
        cursor.execute("""
            INSERT INTO versions 
            (id, document_id, version, status, content, content_hash, metadata,
             created_date, created_by, change_summary, change_type, update_source,
             regulatory_reference, impact_assessment, effective_date, parent_version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"{document_id}_v{new_version}", document_id, new_version,
            version_info.status.value, new_content, new_content_hash,
            json.dumps(doc_version.metadata), version_info.created_date,
            updated_by, change_summary, version_info.change_type.value,
            update_source.value, regulatory_reference, impact_assessment,
            effective_date, current_version.version_info.version
        ))
        
        # Update document current version
        cursor.execute("""
            UPDATE documents 
            SET current_version = ?, last_modified = ?, last_modified_by = ?
            WHERE id = ?
        """, (new_version, version_info.created_date, updated_by, document_id))
        
        # Generate change details (diff)
        change_details = self.generate_diff(
            current_version.content, new_content
        )
        
        # Create change log entry
        self.log_change(
            document_id=document_id,
            version_from=current_version.version_info.version,
            version_to=new_version,
            change_type=ChangeType.UPDATED,
            change_summary=change_summary,
            change_details=change_details,
            changed_by=updated_by,
            update_source=update_source,
            regulatory_reference=regulatory_reference,
            impact_assessment=impact_assessment
        )
        
        conn.commit()
        conn.close()
        
        # Commit to git
        self.git_commit(
            doc_version.file_path,
            f"Update document {document_id} to v{new_version}: {change_summary}"
        )
        
        return doc_version
    
    def approve_version(self, document_id: str, version: str, approved_by: str,
                       comments: str = "") -> bool:
        """Approve a document version"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        approval_date = datetime.now()
        
        # Update version status
        cursor.execute("""
            UPDATE versions 
            SET status = ?, approved_date = ?, approved_by = ?
            WHERE document_id = ? AND version = ?
        """, (VersionStatus.APPROVED.value, approval_date, approved_by,
              document_id, version))
        
        # Update approval workflow
        cursor.execute("""
            UPDATE approval_workflow 
            SET approval_status = 'approved', approval_date = ?, comments = ?
            WHERE document_id = ? AND version = ? AND approver_user = ?
        """, (approval_date, comments, document_id, version, approved_by))
        
        # Check if all required approvals are complete
        cursor.execute("""
            SELECT COUNT(*) as pending_approvals
            FROM approval_workflow 
            WHERE document_id = ? AND version = ? AND approval_status = 'pending'
        """, (document_id, version))
        
        pending_approvals = cursor.fetchone()[0]
        
        if pending_approvals == 0:
            # All approvals complete, publish version
            cursor.execute("""
                UPDATE versions 
                SET status = ?
                WHERE document_id = ? AND version = ?
            """, (VersionStatus.PUBLISHED.value, document_id, version))
        
        conn.commit()
        conn.close()
        
        return pending_approvals == 0
    
    def get_document_history(self, document_id: str) -> List[DocumentVersion]:
        """Get complete version history for a document"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT v.*, d.title, d.document_type, d.file_path
            FROM versions v
            JOIN documents d ON v.document_id = d.id
            WHERE v.document_id = ?
            ORDER BY v.created_date DESC
        """, (document_id,))
        
        history = []
        for row in cursor.fetchall():
            version_info = VersionInfo(
                version=row['version'],
                status=VersionStatus(row['status']),
                created_date=datetime.fromisoformat(row['created_date']),
                created_by=row['created_by'],
                approved_date=datetime.fromisoformat(row['approved_date']) if row['approved_date'] else None,
                approved_by=row['approved_by'],
                change_summary=row['change_summary'],
                change_type=ChangeType(row['change_type']),
                update_source=UpdateSource(row['update_source']) if row['update_source'] else None,
                regulatory_reference=row['regulatory_reference'],
                impact_assessment=row['impact_assessment'],
                effective_date=datetime.fromisoformat(row['effective_date']) if row['effective_date'] else None
            )
            
            doc_version = DocumentVersion(
                document_id=document_id,
                version_info=version_info,
                content=row['content'],
                content_hash=row['content_hash'],
                file_path=row['file_path'],
                metadata=json.loads(row['metadata'] or '{}'),
                parent_version=row['parent_version']
            )
            
            history.append(doc_version)
        
        conn.close()
        return history
    
    def get_regulatory_updates(self, days: int = 30,
                             jurisdiction: str = None,
                             status: str = None) -> List[Dict[str, Any]]:
        """Get regulatory updates for specified period"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Build query conditions
        conditions = ["update_date >= ?"]
        params = [datetime.now() - datetime.timedelta(days=days)]
        
        if jurisdiction:
            conditions.append("jurisdiction = ?")
            params.append(jurisdiction)
        
        if status:
            conditions.append("status = ?")
            params.append(status)
        
        where_clause = " AND ".join(conditions)
        
        cursor.execute(f"""
            SELECT * FROM regulatory_updates 
            WHERE {where_clause}
            ORDER BY update_date DESC
        """, params)
        
        updates = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return updates
    
    def track_regulatory_update(self, regulation_name: str, jurisdiction: str,
                              update_summary: str, update_details: str,
                              source_url: str = None,
                              effective_date: datetime = None,
                              impact_level: str = "medium") -> str:
        """Track new regulatory update"""
        update_id = f"reg_{regulation_name}_{jurisdiction}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO regulatory_updates 
            (id, regulation_name, jurisdiction, update_date, effective_date,
             update_summary, update_details, source_url, impact_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            update_id, regulation_name, jurisdiction, datetime.now(),
            effective_date, update_summary, update_details, source_url,
            impact_level
        ))
        
        conn.commit()
        conn.close()
        
        return update_id
    
    def get_compliance_timeline(self, document_id: str = None,
                              regulation: str = None,
                              days: int = 90) -> List[Dict[str, Any]]:
        """Get compliance timeline showing upcoming deadlines and changes"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        end_date = datetime.now() + datetime.timedelta(days=days)
        
        timeline_items = []
        
        # Get version effective dates
        version_query = """
            SELECT v.document_id, v.version, v.effective_date, v.change_summary,
                   d.title, d.document_type
            FROM versions v
            JOIN documents d ON v.document_id = d.id
            WHERE v.effective_date BETWEEN ? AND ?
        """
        params = [datetime.now(), end_date]
        
        if document_id:
            version_query += " AND v.document_id = ?"
            params.append(document_id)
        
        cursor.execute(version_query, params)
        
        for row in cursor.fetchall():
            timeline_items.append({
                'type': 'version_effective',
                'date': datetime.fromisoformat(row['effective_date']),
                'title': f"{row['title']} v{row['version']} becomes effective",
                'description': row['change_summary'],
                'document_id': row['document_id'],
                'document_type': row['document_type']
            })
        
        # Get regulatory update deadlines
        reg_query = """
            SELECT * FROM regulatory_updates 
            WHERE implementation_deadline BETWEEN ? AND ?
        """
        reg_params = [datetime.now(), end_date]
        
        if regulation:
            reg_query += " AND regulation_name = ?"
            reg_params.append(regulation)
        
        cursor.execute(reg_query, reg_params)
        
        for row in cursor.fetchall():
            timeline_items.append({
                'type': 'regulatory_deadline',
                'date': datetime.fromisoformat(row['implementation_deadline']),
                'title': f"{row['regulation_name']} implementation deadline",
                'description': row['update_summary'],
                'regulation': row['regulation_name'],
                'jurisdiction': row['jurisdiction'],
                'impact_level': row['impact_level']
            })
        
        # Sort timeline by date
        timeline_items.sort(key=lambda x: x['date'])
        
        conn.close()
        return timeline_items
    
    def generate_compliance_report(self, document_id: str = None,
                                 period_days: int = 30) -> Dict[str, Any]:
        """Generate comprehensive compliance status report"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        report_date = datetime.now()
        period_start = report_date - datetime.timedelta(days=period_days)
        
        report = {
            'report_date': report_date.isoformat(),
            'period_days': period_days,
            'summary': {},
            'document_status': [],
            'recent_changes': [],
            'pending_approvals': [],
            'regulatory_updates': [],
            'compliance_gaps': []
        }
        
        # Document status summary
        doc_query = "SELECT status, COUNT(*) as count FROM documents"
        params = []
        
        if document_id:
            doc_query += " WHERE id = ?"
            params.append(document_id)
        
        doc_query += " GROUP BY status"
        
        cursor.execute(doc_query, params)
        
        status_counts = {}
        for row in cursor.fetchall():
            status_counts[row['status']] = row['count']
        
        report['summary']['document_status'] = status_counts
        
        # Recent changes
        change_query = """
            SELECT cl.*, d.title 
            FROM change_log cl
            JOIN documents d ON cl.document_id = d.id
            WHERE cl.change_date >= ?
        """
        change_params = [period_start]
        
        if document_id:
            change_query += " AND cl.document_id = ?"
            change_params.append(document_id)
        
        change_query += " ORDER BY cl.change_date DESC LIMIT 20"
        
        cursor.execute(change_query, change_params)
        
        for row in cursor.fetchall():
            report['recent_changes'].append({
                'document_id': row['document_id'],
                'document_title': row['title'],
                'version_from': row['version_from'],
                'version_to': row['version_to'],
                'change_type': row['change_type'],
                'change_summary': row['change_summary'],
                'changed_by': row['changed_by'],
                'change_date': row['change_date'],
                'approved': bool(row['approved'])
            })
        
        # Pending approvals
        approval_query = """
            SELECT aw.*, d.title, v.change_summary
            FROM approval_workflow aw
            JOIN documents d ON aw.document_id = d.id
            JOIN versions v ON aw.document_id = v.document_id AND aw.version = v.version
            WHERE aw.approval_status = 'pending'
        """
        approval_params = []
        
        if document_id:
            approval_query += " AND aw.document_id = ?"
            approval_params.append(document_id)
        
        cursor.execute(approval_query, approval_params)
        
        for row in cursor.fetchall():
            report['pending_approvals'].append({
                'document_id': row['document_id'],
                'document_title': row['title'],
                'version': row['version'],
                'approver_role': row['approver_role'],
                'change_summary': row['change_summary']
            })
        
        # Recent regulatory updates
        cursor.execute("""
            SELECT * FROM regulatory_updates 
            WHERE update_date >= ?
            ORDER BY update_date DESC
        """, [period_start])
        
        for row in cursor.fetchall():
            report['regulatory_updates'].append(dict(row))
        
        conn.close()
        return report
    
    def increment_version(self, current_version: str) -> str:
        """Increment version number"""
        try:
            parts = current_version.split('.')
            major, minor = int(parts[0]), int(parts[1])
            
            # Increment minor version
            minor += 1
            
            return f"{major}.{minor}"
        except:
            # Fallback for non-standard version formats
            return f"{current_version}.1"
    
    def generate_diff(self, old_content: str, new_content: str) -> str:
        """Generate unified diff between two content versions"""
        old_lines = old_content.splitlines(keepends=True)
        new_lines = new_content.splitlines(keepends=True)
        
        diff = difflib.unified_diff(
            old_lines, new_lines,
            fromfile="Previous Version",
            tofile="Current Version",
            lineterm=""
        )
        
        return '\n'.join(diff)
    
    def get_current_version(self, document_id: str) -> Optional[DocumentVersion]:
        """Get current version of a document"""
        history = self.get_document_history(document_id)
        return history[0] if history else None
    
    def log_change(self, document_id: str, version_to: str, change_type: ChangeType,
                   change_summary: str, changed_by: str, update_source: UpdateSource,
                   version_from: str = None, change_details: str = "",
                   regulatory_reference: str = None, impact_assessment: str = None):
        """Log a change in the change log"""
        change_id = f"change_{document_id}_{version_to}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO change_log 
            (id, document_id, version_from, version_to, change_type, 
             change_summary, change_details, changed_by, change_date, 
             update_source, regulatory_reference, impact_assessment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            change_id, document_id, version_from, version_to, change_type.value,
            change_summary, change_details, changed_by, datetime.now(),
            update_source.value, regulatory_reference, impact_assessment
        ))
        
        conn.commit()
        conn.close()
    
    def git_commit(self, file_path: str, commit_message: str):
        """Commit changes to Git repository"""
        try:
            repo = git.Repo(self.kb_path)
            repo.index.add([file_path])
            repo.index.commit(commit_message)
        except Exception as e:
            print(f"Warning: Git commit failed: {e}")


# Example usage functions
def create_regulation_version(regulation_id: str, title: str, content: str,
                            jurisdiction: str, created_by: str) -> DocumentVersion:
    """Convenience function to create regulation version"""
    vc_system = VersionControlSystem("./knowledge_base/compliance")
    
    metadata = {
        'jurisdictions': [jurisdiction],
        'regulation_tags': [regulation_id],
        'document_type': 'regulation'
    }
    
    return vc_system.create_document(
        document_id=regulation_id,
        title=title,
        document_type="regulation",
        content=content,
        file_path=f"regulations/{regulation_id}.md",
        created_by=created_by,
        metadata=metadata
    )


def update_regulation_for_change(regulation_id: str, new_content: str,
                               updated_by: str, change_summary: str,
                               regulatory_reference: str = None) -> DocumentVersion:
    """Convenience function to update regulation due to regulatory change"""
    vc_system = VersionControlSystem("./knowledge_base/compliance")
    
    return vc_system.update_document(
        document_id=regulation_id,
        new_content=new_content,
        updated_by=updated_by,
        change_summary=change_summary,
        update_source=UpdateSource.REGULATORY_BODY,
        regulatory_reference=regulatory_reference
    )


if __name__ == "__main__":
    # Example usage
    vc_system = VersionControlSystem("./knowledge_base/compliance")
    
    # Track a regulatory update
    update_id = vc_system.track_regulatory_update(
        regulation_name="GDPR",
        jurisdiction="EU",
        update_summary="New guidance on international transfers",
        update_details="European Data Protection Board issues new guidance...",
        source_url="https://edpb.europa.eu/news/...",
        effective_date=datetime(2025, 3, 1),
        impact_level="high"
    )
    
    print(f"Tracked regulatory update: {update_id}")
    
    # Generate compliance report
    report = vc_system.generate_compliance_report(period_days=30)
    print(f"Generated report with {len(report['recent_changes'])} recent changes")
