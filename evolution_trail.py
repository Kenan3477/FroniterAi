#!/usr/bin/env python3
"""
🧬 Evolution Trail Module for FrontierAI System
Comprehensive tracking of all system changes and evolutionary steps
"""

import os
import sys
import json
import sqlite3
import hashlib
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict, field
from pathlib import Path
from enum import Enum
import difflib
import subprocess
import psutil
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChangeType(Enum):
    """Types of changes that can be tracked"""
    CODE_MODIFICATION = "code_modification"
    FILE_ADDITION = "file_addition"
    FILE_DELETION = "file_deletion"
    FILE_RENAME = "file_rename"
    CONFIGURATION_CHANGE = "configuration_change"
    DEPENDENCY_UPDATE = "dependency_update"
    ARCHITECTURE_CHANGE = "architecture_change"
    PERFORMANCE_OPTIMIZATION = "performance_optimization"
    SECURITY_IMPROVEMENT = "security_improvement"
    BUG_FIX = "bug_fix"
    FEATURE_ADDITION = "feature_addition"
    REFACTORING = "refactoring"
    DOCUMENTATION_UPDATE = "documentation_update"
    TEST_ADDITION = "test_addition"
    DATABASE_MIGRATION = "database_migration"
    DEPLOYMENT_CHANGE = "deployment_change"

class ChangeStatus(Enum):
    """Status of a change"""
    PROPOSED = "proposed"
    IN_PROGRESS = "in_progress"
    IMPLEMENTED = "implemented"
    TESTED = "tested"
    DEPLOYED = "deployed"
    ROLLED_BACK = "rolled_back"
    FAILED = "failed"

class ImpactLevel(Enum):
    """Impact level of changes"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"

@dataclass
class PerformanceMetrics:
    """Performance metrics for a change"""
    execution_time_ms: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    disk_io_mb: float = 0.0
    network_io_mb: float = 0.0
    response_time_ms: float = 0.0
    throughput_rps: float = 0.0
    error_rate_percent: float = 0.0
    benchmark_score: float = 0.0
    
@dataclass
class FileSnapshot:
    """Snapshot of a file at a point in time"""
    file_path: str
    content_hash: str
    size_bytes: int
    modified_time: datetime
    permissions: str
    content_preview: str = ""  # First 500 chars for preview
    line_count: int = 0
    
@dataclass
class ChangeRecord:
    """Complete record of a system change"""
    change_id: str
    timestamp: datetime
    change_type: ChangeType
    status: ChangeStatus
    title: str
    description: str
    author: str
    impact_level: ImpactLevel
    
    # Files affected
    affected_files: List[str] = field(default_factory=list)
    before_snapshots: List[FileSnapshot] = field(default_factory=list)
    after_snapshots: List[FileSnapshot] = field(default_factory=list)
    
    # Change details
    diff_content: str = ""
    lines_added: int = 0
    lines_removed: int = 0
    files_added: int = 0
    files_removed: int = 0
    files_modified: int = 0
    
    # Decision rationale
    decision_rationale: str = ""
    alternatives_considered: List[str] = field(default_factory=list)
    risk_assessment: Dict[str, Any] = field(default_factory=dict)
    success_criteria: List[str] = field(default_factory=list)
    
    # Performance impact
    performance_before: Optional[PerformanceMetrics] = None
    performance_after: Optional[PerformanceMetrics] = None
    performance_impact: Dict[str, float] = field(default_factory=dict)
    
    # Dependencies and relationships
    depends_on: List[str] = field(default_factory=list)  # Other change IDs
    related_changes: List[str] = field(default_factory=list)
    rollback_plan: str = ""
    
    # Testing and validation
    test_results: Dict[str, Any] = field(default_factory=dict)
    validation_status: str = "pending"
    deployment_notes: str = ""
    
    # Metadata
    tags: List[str] = field(default_factory=list)
    external_references: List[str] = field(default_factory=list)  # Issues, PRs, docs
    duration_hours: float = 0.0
    effort_estimate_hours: float = 0.0

class EvolutionTrail:
    """Main class for tracking system evolution"""
    
    def __init__(self, database_path: str = None, repository_path: str = None):
        self.repository_path = repository_path or os.getcwd()
        self.database_path = database_path or os.path.join(self.repository_path, "evolution_trail.db")
        self.current_session_id = self._generate_session_id()
        self._ensure_database()
        
    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        return f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.getpid()}"
    
    def _ensure_database(self):
        """Ensure database exists and has correct schema"""
        with sqlite3.connect(self.database_path) as conn:
            self._create_tables(conn)
    
    def _create_tables(self, conn: sqlite3.Connection):
        """Create database tables for evolution tracking"""
        
        # Main changes table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS changes (
                change_id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                change_type TEXT NOT NULL,
                status TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                author TEXT,
                impact_level TEXT,
                
                affected_files TEXT,  -- JSON array
                lines_added INTEGER DEFAULT 0,
                lines_removed INTEGER DEFAULT 0,
                files_added INTEGER DEFAULT 0,
                files_removed INTEGER DEFAULT 0,
                files_modified INTEGER DEFAULT 0,
                
                decision_rationale TEXT,
                alternatives_considered TEXT,  -- JSON array
                risk_assessment TEXT,  -- JSON object
                success_criteria TEXT,  -- JSON array
                
                depends_on TEXT,  -- JSON array
                related_changes TEXT,  -- JSON array
                rollback_plan TEXT,
                
                test_results TEXT,  -- JSON object
                validation_status TEXT DEFAULT 'pending',
                deployment_notes TEXT,
                
                tags TEXT,  -- JSON array
                external_references TEXT,  -- JSON array
                duration_hours REAL DEFAULT 0.0,
                effort_estimate_hours REAL DEFAULT 0.0,
                
                session_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # File snapshots table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS file_snapshots (
                snapshot_id TEXT PRIMARY KEY,
                change_id TEXT NOT NULL,
                snapshot_type TEXT NOT NULL,  -- 'before' or 'after'
                file_path TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                size_bytes INTEGER,
                modified_time TEXT,
                permissions TEXT,
                content_preview TEXT,
                line_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (change_id) REFERENCES changes (change_id)
            )
        """)
        
        # Diffs table for detailed change tracking
        conn.execute("""
            CREATE TABLE IF NOT EXISTS diffs (
                diff_id TEXT PRIMARY KEY,
                change_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                diff_content TEXT,
                diff_format TEXT DEFAULT 'unified',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (change_id) REFERENCES changes (change_id)
            )
        """)
        
        # Performance metrics table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS performance_metrics (
                metric_id TEXT PRIMARY KEY,
                change_id TEXT NOT NULL,
                metric_type TEXT NOT NULL,  -- 'before' or 'after'
                execution_time_ms REAL DEFAULT 0.0,
                memory_usage_mb REAL DEFAULT 0.0,
                cpu_usage_percent REAL DEFAULT 0.0,
                disk_io_mb REAL DEFAULT 0.0,
                network_io_mb REAL DEFAULT 0.0,
                response_time_ms REAL DEFAULT 0.0,
                throughput_rps REAL DEFAULT 0.0,
                error_rate_percent REAL DEFAULT 0.0,
                benchmark_score REAL DEFAULT 0.0,
                measurement_time TEXT,
                environment_info TEXT,  -- JSON object
                FOREIGN KEY (change_id) REFERENCES changes (change_id)
            )
        """)
        
        # Evolution milestones table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS milestones (
                milestone_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                target_date TEXT,
                completion_date TEXT,
                status TEXT DEFAULT 'planned',
                associated_changes TEXT,  -- JSON array of change_ids
                success_metrics TEXT,  -- JSON object
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # System state snapshots table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS system_snapshots (
                snapshot_id TEXT PRIMARY KEY,
                change_id TEXT,
                snapshot_time TEXT NOT NULL,
                system_version TEXT,
                commit_hash TEXT,
                branch_name TEXT,
                total_files INTEGER,
                total_lines_of_code INTEGER,
                dependencies TEXT,  -- JSON object
                configuration_hash TEXT,
                health_status TEXT,
                performance_baseline TEXT,  -- JSON object
                FOREIGN KEY (change_id) REFERENCES changes (change_id)
            )
        """)
        
        # Create indexes for better performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_changes_timestamp ON changes (timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_changes_type ON changes (change_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_changes_status ON changes (status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_changes_author ON changes (author)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_change_id ON file_snapshots (change_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_diffs_change_id ON diffs (change_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_change_id ON performance_metrics (change_id)")
        
        conn.commit()
    
    def _generate_change_id(self) -> str:
        """Generate unique change ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        return f"change_{timestamp}"
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of file content"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception:
            return "error_calculating_hash"
    
    def _get_file_stats(self, file_path: str) -> Tuple[int, datetime, str]:
        """Get file statistics"""
        try:
            stat = os.stat(file_path)
            size = stat.st_size
            modified = datetime.fromtimestamp(stat.st_mtime)
            permissions = oct(stat.st_mode)[-3:]
            return size, modified, permissions
        except Exception:
            return 0, datetime.now(), "000"
    
    def _get_file_preview(self, file_path: str, max_chars: int = 500) -> str:
        """Get preview of file content"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(max_chars)
                return content
        except Exception:
            return "Binary file or read error"
    
    def _count_lines(self, file_path: str) -> int:
        """Count lines in a file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return sum(1 for _ in f)
        except Exception:
            return 0
    
    def create_file_snapshot(self, file_path: str) -> FileSnapshot:
        """Create a snapshot of a file's current state"""
        content_hash = self._calculate_file_hash(file_path)
        size, modified, permissions = self._get_file_stats(file_path)
        preview = self._get_file_preview(file_path)
        line_count = self._count_lines(file_path)
        
        return FileSnapshot(
            file_path=file_path,
            content_hash=content_hash,
            size_bytes=size,
            modified_time=modified,
            permissions=permissions,
            content_preview=preview,
            line_count=line_count
        )
    
    def measure_performance(self, test_function=None, duration_seconds: int = 5) -> PerformanceMetrics:
        """Measure current system performance"""
        start_time = time.time()
        process = psutil.Process()
        
        # Initial measurements
        cpu_percent = process.cpu_percent()
        memory_info = process.memory_info()
        io_counters = process.io_counters() if hasattr(process, 'io_counters') else None
        
        # Wait and measure again for more accurate CPU usage
        time.sleep(min(duration_seconds, 1))
        
        cpu_percent = process.cpu_percent()
        memory_mb = memory_info.rss / 1024 / 1024  # Convert to MB
        
        disk_io_mb = 0.0
        if io_counters:
            disk_io_mb = (io_counters.read_bytes + io_counters.write_bytes) / 1024 / 1024
        
        execution_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # If test function provided, measure its performance
        if test_function and callable(test_function):
            try:
                func_start = time.time()
                test_function()
                execution_time = (time.time() - func_start) * 1000
            except Exception as e:
                logger.warning(f"Error measuring test function performance: {e}")
        
        return PerformanceMetrics(
            execution_time_ms=execution_time,
            memory_usage_mb=memory_mb,
            cpu_usage_percent=cpu_percent,
            disk_io_mb=disk_io_mb,
            network_io_mb=0.0,  # Would need network monitoring
            response_time_ms=execution_time,
            throughput_rps=0.0,  # Would need load testing
            error_rate_percent=0.0,
            benchmark_score=100.0 - cpu_percent - (memory_mb / 100)  # Simple score
        )
    
    def start_change_tracking(self, 
                            change_type: ChangeType,
                            title: str,
                            description: str = "",
                            author: str = "",
                            impact_level: ImpactLevel = ImpactLevel.MEDIUM) -> str:
        """Start tracking a new change"""
        
        change_id = self._generate_change_id()
        
        # Get current system author if not provided
        if not author:
            try:
                result = subprocess.run(['git', 'config', 'user.name'], 
                                      capture_output=True, text=True, cwd=self.repository_path)
                author = result.stdout.strip() or "Unknown"
            except Exception:
                author = "System"
        
        # Create initial change record
        change_record = ChangeRecord(
            change_id=change_id,
            timestamp=datetime.now(),
            change_type=change_type,
            status=ChangeStatus.PROPOSED,
            title=title,
            description=description,
            author=author,
            impact_level=impact_level
        )
        
        # Measure baseline performance
        try:
            change_record.performance_before = self.measure_performance()
        except Exception as e:
            logger.warning(f"Could not measure baseline performance: {e}")
        
        # Save to database
        self._save_change_record(change_record)
        
        logger.info(f"Started tracking change: {change_id} - {title}")
        return change_id
    
    def add_file_changes(self, change_id: str, file_paths: List[str]):
        """Add file changes to an existing change record"""
        
        # Take before snapshots
        before_snapshots = []
        for file_path in file_paths:
            if os.path.exists(file_path):
                snapshot = self.create_file_snapshot(file_path)
                before_snapshots.append(snapshot)
                self._save_file_snapshot(change_id, snapshot, "before")
        
        # Update change record
        with sqlite3.connect(self.database_path) as conn:
            affected_files_json = json.dumps(file_paths)
            conn.execute("""
                UPDATE changes 
                SET affected_files = ?, updated_at = CURRENT_TIMESTAMP
                WHERE change_id = ?
            """, (affected_files_json, change_id))
            conn.commit()
        
        logger.info(f"Added {len(file_paths)} files to change tracking: {change_id}")
    
    def complete_change_tracking(self, 
                                change_id: str,
                                decision_rationale: str = "",
                                test_results: Dict[str, Any] = None,
                                deployment_notes: str = "") -> ChangeRecord:
        """Complete tracking of a change with final measurements"""
        
        # Get current change record
        change_record = self.get_change_record(change_id)
        if not change_record:
            raise ValueError(f"Change record not found: {change_id}")
        
        # Take after snapshots
        affected_files = change_record.affected_files
        after_snapshots = []
        diffs = []
        
        for file_path in affected_files:
            if os.path.exists(file_path):
                # Create after snapshot
                after_snapshot = self.create_file_snapshot(file_path)
                after_snapshots.append(after_snapshot)
                self._save_file_snapshot(change_id, after_snapshot, "after")
                
                # Generate diff
                before_snapshot = self._get_before_snapshot(change_id, file_path)
                if before_snapshot:
                    diff = self._generate_diff(before_snapshot, after_snapshot)
                    if diff:
                        diffs.append(diff)
                        self._save_diff(change_id, file_path, diff)
        
        # Measure final performance
        performance_after = None
        try:
            performance_after = self.measure_performance()
        except Exception as e:
            logger.warning(f"Could not measure final performance: {e}")
        
        # Calculate performance impact
        performance_impact = {}
        if change_record.performance_before and performance_after:
            performance_impact = self._calculate_performance_impact(
                change_record.performance_before, performance_after
            )
        
        # Calculate change statistics
        stats = self._calculate_change_stats(diffs)
        
        # Update change record
        change_record.status = ChangeStatus.IMPLEMENTED
        change_record.after_snapshots = after_snapshots
        change_record.diff_content = "\n".join(diffs)
        change_record.decision_rationale = decision_rationale
        change_record.test_results = test_results or {}
        change_record.deployment_notes = deployment_notes
        change_record.performance_after = performance_after
        change_record.performance_impact = performance_impact
        change_record.lines_added = stats["lines_added"]
        change_record.lines_removed = stats["lines_removed"]
        change_record.files_modified = stats["files_modified"]
        
        # Save updated record
        self._save_change_record(change_record)
        
        # Save performance metrics
        if performance_after:
            self._save_performance_metrics(change_id, performance_after, "after")
        
        logger.info(f"Completed change tracking: {change_id}")
        return change_record
    
    def _get_before_snapshot(self, change_id: str, file_path: str) -> Optional[FileSnapshot]:
        """Get before snapshot for a file"""
        with sqlite3.connect(self.database_path) as conn:
            cursor = conn.execute("""
                SELECT content_hash, size_bytes, modified_time, permissions, 
                       content_preview, line_count
                FROM file_snapshots 
                WHERE change_id = ? AND file_path = ? AND snapshot_type = 'before'
            """, (change_id, file_path))
            
            row = cursor.fetchone()
            if row:
                return FileSnapshot(
                    file_path=file_path,
                    content_hash=row[0],
                    size_bytes=row[1],
                    modified_time=datetime.fromisoformat(row[2]),
                    permissions=row[3],
                    content_preview=row[4],
                    line_count=row[5]
                )
        return None
    
    def _generate_diff(self, before_snapshot: FileSnapshot, after_snapshot: FileSnapshot) -> str:
        """Generate diff between two file snapshots"""
        try:
            # For now, use a simple hash comparison
            if before_snapshot.content_hash == after_snapshot.content_hash:
                return ""  # No changes
            
            # Try to read full content for detailed diff
            try:
                with open(before_snapshot.file_path, 'r', encoding='utf-8') as f:
                    before_lines = f.readlines()
            except Exception:
                before_lines = [before_snapshot.content_preview]
            
            try:
                with open(after_snapshot.file_path, 'r', encoding='utf-8') as f:
                    after_lines = f.readlines()
            except Exception:
                after_lines = [after_snapshot.content_preview]
            
            # Generate unified diff
            diff_lines = list(difflib.unified_diff(
                before_lines,
                after_lines,
                fromfile=f"before/{before_snapshot.file_path}",
                tofile=f"after/{after_snapshot.file_path}",
                lineterm=''
            ))
            
            return '\n'.join(diff_lines)
            
        except Exception as e:
            logger.warning(f"Could not generate diff: {e}")
            return f"File changed: {before_snapshot.file_path}"
    
    def _calculate_performance_impact(self, before: PerformanceMetrics, after: PerformanceMetrics) -> Dict[str, float]:
        """Calculate performance impact between before and after metrics"""
        impact = {}
        
        # Calculate percentage changes
        if before.execution_time_ms > 0:
            impact["execution_time_change_percent"] = ((after.execution_time_ms - before.execution_time_ms) / before.execution_time_ms) * 100
        
        if before.memory_usage_mb > 0:
            impact["memory_usage_change_percent"] = ((after.memory_usage_mb - before.memory_usage_mb) / before.memory_usage_mb) * 100
        
        if before.cpu_usage_percent > 0:
            impact["cpu_usage_change_percent"] = ((after.cpu_usage_percent - before.cpu_usage_percent) / before.cpu_usage_percent) * 100
        
        # Absolute changes
        impact["execution_time_change_ms"] = after.execution_time_ms - before.execution_time_ms
        impact["memory_usage_change_mb"] = after.memory_usage_mb - before.memory_usage_mb
        impact["cpu_usage_change_percent_abs"] = after.cpu_usage_percent - before.cpu_usage_percent
        
        # Overall performance score change
        impact["benchmark_score_change"] = after.benchmark_score - before.benchmark_score
        
        return impact
    
    def _calculate_change_stats(self, diffs: List[str]) -> Dict[str, int]:
        """Calculate statistics from diff content"""
        lines_added = 0
        lines_removed = 0
        files_modified = len(diffs)
        
        for diff in diffs:
            for line in diff.split('\n'):
                if line.startswith('+') and not line.startswith('+++'):
                    lines_added += 1
                elif line.startswith('-') and not line.startswith('---'):
                    lines_removed += 1
        
        return {
            "lines_added": lines_added,
            "lines_removed": lines_removed,
            "files_modified": files_modified
        }
    
    def _save_change_record(self, change_record: ChangeRecord):
        """Save change record to database"""
        with sqlite3.connect(self.database_path) as conn:
            # Convert complex fields to JSON
            affected_files_json = json.dumps(change_record.affected_files)
            alternatives_json = json.dumps(change_record.alternatives_considered)
            risk_assessment_json = json.dumps(change_record.risk_assessment)
            success_criteria_json = json.dumps(change_record.success_criteria)
            depends_on_json = json.dumps(change_record.depends_on)
            related_changes_json = json.dumps(change_record.related_changes)
            test_results_json = json.dumps(change_record.test_results)
            tags_json = json.dumps(change_record.tags)
            external_refs_json = json.dumps(change_record.external_references)
            
            conn.execute("""
                INSERT OR REPLACE INTO changes (
                    change_id, timestamp, change_type, status, title, description, author, impact_level,
                    affected_files, lines_added, lines_removed, files_added, files_removed, files_modified,
                    decision_rationale, alternatives_considered, risk_assessment, success_criteria,
                    depends_on, related_changes, rollback_plan,
                    test_results, validation_status, deployment_notes,
                    tags, external_references, duration_hours, effort_estimate_hours,
                    session_id, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                change_record.change_id,
                change_record.timestamp.isoformat(),
                change_record.change_type.value,
                change_record.status.value,
                change_record.title,
                change_record.description,
                change_record.author,
                change_record.impact_level.value,
                affected_files_json,
                change_record.lines_added,
                change_record.lines_removed,
                change_record.files_added,
                change_record.files_removed,
                change_record.files_modified,
                change_record.decision_rationale,
                alternatives_json,
                risk_assessment_json,
                success_criteria_json,
                depends_on_json,
                related_changes_json,
                change_record.rollback_plan,
                test_results_json,
                change_record.validation_status,
                change_record.deployment_notes,
                tags_json,
                external_refs_json,
                change_record.duration_hours,
                change_record.effort_estimate_hours,
                self.current_session_id
            ))
            conn.commit()
    
    def _save_file_snapshot(self, change_id: str, snapshot: FileSnapshot, snapshot_type: str):
        """Save file snapshot to database"""
        snapshot_id = f"{change_id}_{snapshot_type}_{hashlib.md5(snapshot.file_path.encode()).hexdigest()[:8]}"
        
        with sqlite3.connect(self.database_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO file_snapshots (
                    snapshot_id, change_id, snapshot_type, file_path, content_hash,
                    size_bytes, modified_time, permissions, content_preview, line_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                snapshot_id, change_id, snapshot_type, snapshot.file_path, snapshot.content_hash,
                snapshot.size_bytes, snapshot.modified_time.isoformat(), snapshot.permissions,
                snapshot.content_preview, snapshot.line_count
            ))
            conn.commit()
    
    def _save_diff(self, change_id: str, file_path: str, diff_content: str):
        """Save diff to database"""
        diff_id = f"{change_id}_{hashlib.md5(file_path.encode()).hexdigest()[:8]}"
        
        with sqlite3.connect(self.database_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO diffs (
                    diff_id, change_id, file_path, diff_content, diff_format
                ) VALUES (?, ?, ?, ?, ?)
            """, (diff_id, change_id, file_path, diff_content, "unified"))
            conn.commit()
    
    def _save_performance_metrics(self, change_id: str, metrics: PerformanceMetrics, metric_type: str):
        """Save performance metrics to database"""
        metric_id = f"{change_id}_{metric_type}_{int(time.time())}"
        
        with sqlite3.connect(self.database_path) as conn:
            conn.execute("""
                INSERT INTO performance_metrics (
                    metric_id, change_id, metric_type, execution_time_ms, memory_usage_mb,
                    cpu_usage_percent, disk_io_mb, network_io_mb, response_time_ms,
                    throughput_rps, error_rate_percent, benchmark_score, measurement_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metric_id, change_id, metric_type, metrics.execution_time_ms, metrics.memory_usage_mb,
                metrics.cpu_usage_percent, metrics.disk_io_mb, metrics.network_io_mb, metrics.response_time_ms,
                metrics.throughput_rps, metrics.error_rate_percent, metrics.benchmark_score,
                datetime.now().isoformat()
            ))
            conn.commit()
    
    def get_change_record(self, change_id: str) -> Optional[ChangeRecord]:
        """Retrieve a specific change record"""
        with sqlite3.connect(self.database_path) as conn:
            cursor = conn.execute("""
                SELECT change_id, timestamp, change_type, status, title, description, author, impact_level,
                       affected_files, lines_added, lines_removed, files_added, files_removed, files_modified,
                       decision_rationale, alternatives_considered, risk_assessment, success_criteria,
                       depends_on, related_changes, rollback_plan,
                       test_results, validation_status, deployment_notes,
                       tags, external_references, duration_hours, effort_estimate_hours
                FROM changes WHERE change_id = ?
            """, (change_id,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            # Parse JSON fields
            affected_files = json.loads(row[8]) if row[8] else []
            alternatives = json.loads(row[15]) if row[15] else []
            risk_assessment = json.loads(row[16]) if row[16] else {}
            success_criteria = json.loads(row[17]) if row[17] else []
            depends_on = json.loads(row[18]) if row[18] else []
            related_changes = json.loads(row[19]) if row[19] else []
            test_results = json.loads(row[21]) if row[21] else {}
            tags = json.loads(row[24]) if row[24] else []
            external_refs = json.loads(row[25]) if row[25] else []
            
            return ChangeRecord(
                change_id=row[0],
                timestamp=datetime.fromisoformat(row[1]),
                change_type=ChangeType(row[2]),
                status=ChangeStatus(row[3]),
                title=row[4],
                description=row[5] or "",
                author=row[6] or "",
                impact_level=ImpactLevel(row[7]),
                affected_files=affected_files,
                lines_added=row[9] or 0,
                lines_removed=row[10] or 0,
                files_added=row[11] or 0,
                files_removed=row[12] or 0,
                files_modified=row[13] or 0,
                decision_rationale=row[14] or "",
                alternatives_considered=alternatives,
                risk_assessment=risk_assessment,
                success_criteria=success_criteria,
                depends_on=depends_on,
                related_changes=related_changes,
                rollback_plan=row[20] or "",
                test_results=test_results,
                validation_status=row[22] or "pending",
                deployment_notes=row[23] or "",
                tags=tags,
                external_references=external_refs,
                duration_hours=row[26] or 0.0,
                effort_estimate_hours=row[27] or 0.0
            )
    
    def query_changes(self, 
                     change_type: Optional[ChangeType] = None,
                     status: Optional[ChangeStatus] = None,
                     author: Optional[str] = None,
                     impact_level: Optional[ImpactLevel] = None,
                     start_date: Optional[datetime] = None,
                     end_date: Optional[datetime] = None,
                     tags: Optional[List[str]] = None,
                     limit: int = 100) -> List[ChangeRecord]:
        """Query changes with various filters"""
        
        conditions = []
        params = []
        
        if change_type:
            conditions.append("change_type = ?")
            params.append(change_type.value)
        
        if status:
            conditions.append("status = ?")
            params.append(status.value)
        
        if author:
            conditions.append("author LIKE ?")
            params.append(f"%{author}%")
        
        if impact_level:
            conditions.append("impact_level = ?")
            params.append(impact_level.value)
        
        if start_date:
            conditions.append("timestamp >= ?")
            params.append(start_date.isoformat())
        
        if end_date:
            conditions.append("timestamp <= ?")
            params.append(end_date.isoformat())
        
        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)
        
        query = f"""
            SELECT change_id FROM changes 
            {where_clause}
            ORDER BY timestamp DESC 
            LIMIT ?
        """
        params.append(limit)
        
        with sqlite3.connect(self.database_path) as conn:
            cursor = conn.execute(query, params)
            change_ids = [row[0] for row in cursor.fetchall()]
        
        # Get full records
        records = []
        for change_id in change_ids:
            record = self.get_change_record(change_id)
            if record:
                # Filter by tags if specified
                if not tags or any(tag in record.tags for tag in tags):
                    records.append(record)
        
        return records
    
    def get_evolution_timeline(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get evolution timeline for the last N days"""
        start_date = datetime.now() - timedelta(days=days)
        
        with sqlite3.connect(self.database_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as total_changes,
                    SUM(lines_added) as total_lines_added,
                    SUM(lines_removed) as total_lines_removed,
                    SUM(files_modified) as total_files_modified,
                    COUNT(CASE WHEN change_type = 'feature_addition' THEN 1 END) as features_added,
                    COUNT(CASE WHEN change_type = 'bug_fix' THEN 1 END) as bugs_fixed,
                    COUNT(CASE WHEN change_type = 'performance_optimization' THEN 1 END) as optimizations,
                    COUNT(CASE WHEN change_type = 'security_improvement' THEN 1 END) as security_improvements
                FROM changes 
                WHERE timestamp >= ?
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
            """, (start_date.isoformat(),))
            
            timeline = []
            for row in cursor.fetchall():
                timeline.append({
                    "date": row[0],
                    "total_changes": row[1],
                    "total_lines_added": row[2] or 0,
                    "total_lines_removed": row[3] or 0,
                    "total_files_modified": row[4] or 0,
                    "features_added": row[5] or 0,
                    "bugs_fixed": row[6] or 0,
                    "optimizations": row[7] or 0,
                    "security_improvements": row[8] or 0
                })
            
            return timeline
    
    def get_evolution_statistics(self) -> Dict[str, Any]:
        """Get overall evolution statistics"""
        with sqlite3.connect(self.database_path) as conn:
            # Total statistics
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_changes,
                    SUM(lines_added) as total_lines_added,
                    SUM(lines_removed) as total_lines_removed,
                    SUM(files_modified) as total_files_modified,
                    AVG(duration_hours) as avg_duration_hours,
                    MIN(timestamp) as first_change,
                    MAX(timestamp) as last_change
                FROM changes
            """)
            total_stats = cursor.fetchone()
            
            # Statistics by type
            cursor = conn.execute("""
                SELECT change_type, COUNT(*) as count
                FROM changes
                GROUP BY change_type
                ORDER BY count DESC
            """)
            type_stats = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Statistics by status
            cursor = conn.execute("""
                SELECT status, COUNT(*) as count
                FROM changes
                GROUP BY status
                ORDER BY count DESC
            """)
            status_stats = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Statistics by impact level
            cursor = conn.execute("""
                SELECT impact_level, COUNT(*) as count
                FROM changes
                GROUP BY impact_level
                ORDER BY count DESC
            """)
            impact_stats = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Author statistics
            cursor = conn.execute("""
                SELECT author, COUNT(*) as count
                FROM changes
                GROUP BY author
                ORDER BY count DESC
                LIMIT 10
            """)
            author_stats = {row[0]: row[1] for row in cursor.fetchall()}
            
            return {
                "total_changes": total_stats[0] or 0,
                "total_lines_added": total_stats[1] or 0,
                "total_lines_removed": total_stats[2] or 0,
                "total_files_modified": total_stats[3] or 0,
                "average_duration_hours": total_stats[4] or 0.0,
                "first_change": total_stats[5],
                "last_change": total_stats[6],
                "by_type": type_stats,
                "by_status": status_stats,
                "by_impact": impact_stats,
                "by_author": author_stats
            }
    
    def generate_evolution_report(self, 
                                 output_file: str = None,
                                 format: str = "markdown",
                                 days: int = 30) -> str:
        """Generate comprehensive evolution report"""
        if output_file is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"evolution_report_{timestamp}.{format.lower()}"
        
        # Gather data
        timeline = self.get_evolution_timeline(days)
        statistics = self.get_evolution_statistics()
        recent_changes = self.query_changes(limit=20)
        
        if format.lower() == "markdown":
            report = self._generate_markdown_report(timeline, statistics, recent_changes, days)
        elif format.lower() == "html":
            report = self._generate_html_report(timeline, statistics, recent_changes, days)
        elif format.lower() == "json":
            report = self._generate_json_report(timeline, statistics, recent_changes, days)
        else:
            raise ValueError(f"Unsupported report format: {format}")
        
        # Save report
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report)
        
        logger.info(f"Evolution report generated: {output_file}")
        return output_file
    
    def _generate_markdown_report(self, timeline, statistics, recent_changes, days) -> str:
        """Generate markdown evolution report"""
        return f"""# 🧬 FrontierAI Evolution Trail Report

*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*  
*Period: Last {days} days*

## 📊 Executive Summary

The FrontierAI system has undergone **{statistics['total_changes']}** tracked changes with a total of **{statistics['total_lines_added']:,}** lines added and **{statistics['total_lines_removed']:,}** lines removed across **{statistics['total_files_modified']}** files.

### Key Metrics
- **Total Changes**: {statistics['total_changes']:,}
- **Lines Added**: {statistics['total_lines_added']:,}
- **Lines Removed**: {statistics['total_lines_removed']:,}
- **Net Lines**: {(statistics['total_lines_added'] - statistics['total_lines_removed']):,}
- **Files Modified**: {statistics['total_files_modified']:,}
- **Average Duration**: {statistics['average_duration_hours']:.1f} hours per change

## 📈 Evolution Timeline ({days} days)

| Date | Changes | Lines + | Lines - | Files | Features | Bugs | Optimizations |
|------|---------|---------|---------|-------|----------|------|---------------|
{''.join(f'| {day["date"]} | {day["total_changes"]} | {day["total_lines_added"]:,} | {day["total_lines_removed"]:,} | {day["total_files_modified"]} | {day["features_added"]} | {day["bugs_fixed"]} | {day["optimizations"]} |' + chr(10) for day in timeline[:10])}

## 🔄 Change Distribution

### By Type
{''.join(f'- **{change_type.replace("_", " ").title()}**: {count} changes' + chr(10) for change_type, count in statistics['by_type'].items())}

### By Status
{''.join(f'- **{status.replace("_", " ").title()}**: {count} changes' + chr(10) for status, count in statistics['by_status'].items())}

### By Impact Level
{''.join(f'- **{impact.replace("_", " ").title()}**: {count} changes' + chr(10) for impact, count in statistics['by_impact'].items())}

## 👥 Contributors

{''.join(f'- **{author}**: {count} changes' + chr(10) for author, count in statistics['by_author'].items())}

## 🔄 Recent Changes (Last 20)

{''.join(f'''### {change.title}
- **ID**: `{change.change_id}`
- **Type**: {change.change_type.value.replace("_", " ").title()}
- **Status**: {change.status.value.replace("_", " ").title()}
- **Impact**: {change.impact_level.value.title()}
- **Author**: {change.author}
- **Date**: {change.timestamp.strftime('%Y-%m-%d %H:%M')}
- **Files**: {len(change.affected_files)} affected
- **Changes**: +{change.lines_added} -{change.lines_removed} lines

{change.description[:200]}{'...' if len(change.description) > 200 else ''}

---

''' for change in recent_changes)}

## 📈 Performance Impact Analysis

### Changes with Measured Performance Impact
{len([c for c in recent_changes if c.performance_impact])} of the recent changes have measured performance impacts.

### Notable Performance Changes
{''.join(f'''
**{change.title}**:
- Execution Time: {change.performance_impact.get("execution_time_change_percent", 0):.1f}% change
- Memory Usage: {change.performance_impact.get("memory_usage_change_percent", 0):.1f}% change
- CPU Usage: {change.performance_impact.get("cpu_usage_change_percent", 0):.1f}% change

''' for change in recent_changes[:5] if change.performance_impact)}

## 🎯 Evolution Insights

### System Growth
- The codebase has grown by **{(statistics['total_lines_added'] - statistics['total_lines_removed']):,}** net lines
- **{statistics['by_type'].get('feature_addition', 0)}** new features have been added
- **{statistics['by_type'].get('bug_fix', 0)}** bugs have been fixed
- **{statistics['by_type'].get('performance_optimization', 0)}** performance optimizations implemented

### Development Velocity
- Average of **{statistics['total_changes'] / max(days, 1):.1f}** changes per day
- **{statistics['average_duration_hours']:.1f}** hours average development time per change

### Quality Focus
- **{statistics['by_type'].get('security_improvement', 0)}** security improvements
- **{statistics['by_type'].get('test_addition', 0)}** test additions
- **{statistics['by_type'].get('refactoring', 0)}** refactoring efforts

---

*This report was automatically generated by the FrontierAI Evolution Trail system*  
*For detailed change information, query the evolution database directly*
"""
    
    def _generate_html_report(self, timeline, statistics, recent_changes, days) -> str:
        """Generate HTML evolution report"""
        # Convert markdown to HTML-friendly format
        markdown_report = self._generate_markdown_report(timeline, statistics, recent_changes, days)
        
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FrontierAI Evolution Trail Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-6xl mx-auto">
            <div class="bg-white rounded-lg shadow-lg p-8">
                <h1 class="text-4xl font-bold text-gray-800 mb-8">🧬 FrontierAI Evolution Trail Report</h1>
                
                <div class="grid md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-blue-50 rounded-lg p-6 text-center">
                        <div class="text-3xl font-bold text-blue-600">{statistics['total_changes']}</div>
                        <div class="text-blue-700">Total Changes</div>
                    </div>
                    <div class="bg-green-50 rounded-lg p-6 text-center">
                        <div class="text-3xl font-bold text-green-600">{statistics['total_lines_added']:,}</div>
                        <div class="text-green-700">Lines Added</div>
                    </div>
                    <div class="bg-red-50 rounded-lg p-6 text-center">
                        <div class="text-3xl font-bold text-red-600">{statistics['total_lines_removed']:,}</div>
                        <div class="text-red-700">Lines Removed</div>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-6 text-center">
                        <div class="text-3xl font-bold text-purple-600">{statistics['total_files_modified']}</div>
                        <div class="text-purple-700">Files Modified</div>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-6 mb-8">
                    <h3 class="text-xl font-semibold mb-4">Evolution Timeline</h3>
                    <canvas id="timelineChart" width="400" height="200"></canvas>
                </div>
                
                <div class="grid md:grid-cols-2 gap-8 mb-8">
                    <div class="bg-white border rounded-lg p-6">
                        <h3 class="text-xl font-semibold mb-4">Change Types</h3>
                        <canvas id="typeChart" width="300" height="300"></canvas>
                    </div>
                    <div class="bg-white border rounded-lg p-6">
                        <h3 class="text-xl font-semibold mb-4">Contributors</h3>
                        <div class="space-y-2">
                            {''.join(f'<div class="flex justify-between"><span>{author}</span><span class="font-semibold">{count}</span></div>' for author, count in list(statistics['by_author'].items())[:10])}
                        </div>
                    </div>
                </div>
                
                <div class="bg-white border rounded-lg p-6">
                    <h3 class="text-xl font-semibold mb-4">Recent Changes</h3>
                    <div class="space-y-4">
                        {''.join(f'''
                        <div class="border-l-4 border-blue-500 pl-4 py-2">
                            <h4 class="font-semibold">{change.title}</h4>
                            <div class="text-sm text-gray-600">
                                <span class="inline-block bg-gray-200 rounded px-2 py-1 mr-2">{change.change_type.value.replace("_", " ").title()}</span>
                                <span class="inline-block bg-blue-200 rounded px-2 py-1 mr-2">{change.status.value.replace("_", " ").title()}</span>
                                <span>{change.author} • {change.timestamp.strftime('%Y-%m-%d %H:%M')}</span>
                            </div>
                            <p class="text-gray-700 mt-2">{change.description[:150]}{'...' if len(change.description) > 150 else ''}</p>
                        </div>
                        ''' for change in recent_changes[:10])}
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Timeline Chart
        const timelineCtx = document.getElementById('timelineChart').getContext('2d');
        const timelineData = {json.dumps([{"date": day["date"], "changes": day["total_changes"]} for day in timeline[:30]])};
        
        new Chart(timelineCtx, {{
            type: 'line',
            data: {{
                labels: timelineData.map(d => d.date),
                datasets: [{{
                    label: 'Changes per Day',
                    data: timelineData.map(d => d.changes),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1
                }}]
            }},
            options: {{
                responsive: true,
                scales: {{
                    y: {{
                        beginAtZero: true
                    }}
                }}
            }}
        }});
        
        // Change Types Chart
        const typeCtx = document.getElementById('typeChart').getContext('2d');
        const typeData = {json.dumps(list(statistics['by_type'].items())[:8])};
        
        new Chart(typeCtx, {{
            type: 'doughnut',
            data: {{
                labels: typeData.map(d => d[0].replace('_', ' ')),
                datasets: [{{
                    data: typeData.map(d => d[1]),
                    backgroundColor: [
                        '#EF4444', '#F97316', '#EAB308', '#22C55E',
                        '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
                    ]
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false
            }}
        }});
    </script>
</body>
</html>"""
    
    def _generate_json_report(self, timeline, statistics, recent_changes, days) -> str:
        """Generate JSON evolution report"""
        report_data = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "report_period_days": days,
                "format_version": "1.0"
            },
            "summary": statistics,
            "timeline": timeline,
            "recent_changes": [
                {
                    "change_id": change.change_id,
                    "timestamp": change.timestamp.isoformat(),
                    "change_type": change.change_type.value,
                    "status": change.status.value,
                    "title": change.title,
                    "description": change.description,
                    "author": change.author,
                    "impact_level": change.impact_level.value,
                    "affected_files": change.affected_files,
                    "lines_added": change.lines_added,
                    "lines_removed": change.lines_removed,
                    "files_modified": change.files_modified,
                    "performance_impact": change.performance_impact
                }
                for change in recent_changes
            ]
        }
        
        return json.dumps(report_data, indent=2, default=str)

# Example usage and testing
async def main():
    """Main function for testing the evolution trail"""
    trail = EvolutionTrail()
    
    print("🧬 FrontierAI Evolution Trail Test")
    print("=" * 50)
    
    try:
        # Test change tracking
        print("📝 Testing change tracking...")
        
        # Start tracking a new change
        change_id = trail.start_change_tracking(
            change_type=ChangeType.FEATURE_ADDITION,
            title="Test Evolution Trail Integration",
            description="Testing the evolution trail system with sample changes",
            impact_level=ImpactLevel.MEDIUM
        )
        
        print(f"   Started tracking change: {change_id}")
        
        # Add some file changes
        test_files = [__file__]  # Track changes to this file
        trail.add_file_changes(change_id, test_files)
        print(f"   Added {len(test_files)} files to tracking")
        
        # Simulate some work
        await asyncio.sleep(1)
        
        # Complete the change
        change_record = trail.complete_change_tracking(
            change_id,
            decision_rationale="Testing evolution trail functionality",
            test_results={"test_status": "passed", "coverage": 95.0},
            deployment_notes="Test deployment successful"
        )
        
        print(f"   Completed change tracking")
        print(f"   Lines added: {change_record.lines_added}")
        print(f"   Lines removed: {change_record.lines_removed}")
        
        # Test querying
        print("\n🔍 Testing queries...")
        
        recent_changes = trail.query_changes(limit=5)
        print(f"   Found {len(recent_changes)} recent changes")
        
        feature_changes = trail.query_changes(change_type=ChangeType.FEATURE_ADDITION, limit=10)
        print(f"   Found {len(feature_changes)} feature additions")
        
        # Test statistics
        print("\n📊 Testing statistics...")
        
        stats = trail.get_evolution_statistics()
        print(f"   Total changes: {stats['total_changes']}")
        print(f"   Total lines added: {stats['total_lines_added']}")
        print(f"   Total files modified: {stats['total_files_modified']}")
        
        timeline = trail.get_evolution_timeline(7)
        print(f"   Timeline entries (7 days): {len(timeline)}")
        
        # Generate report
        print("\n📄 Generating evolution report...")
        
        report_file = trail.generate_evolution_report(format="markdown", days=30)
        print(f"   Markdown report: {report_file}")
        
        html_report = trail.generate_evolution_report(format="html", days=30)
        print(f"   HTML report: {html_report}")
        
        json_report = trail.generate_evolution_report(format="json", days=30)
        print(f"   JSON report: {json_report}")
        
        print(f"\n✅ Evolution Trail test completed successfully!")
        print(f"📁 Files generated:")
        print(f"   • {trail.database_path} - Evolution database")
        print(f"   • {report_file} - Markdown report")
        print(f"   • {html_report} - HTML report")
        print(f"   • {json_report} - JSON report")
        
    except Exception as e:
        print(f"❌ Evolution trail test failed: {e}")
        logger.exception("Test error")

if __name__ == "__main__":
    asyncio.run(main())
