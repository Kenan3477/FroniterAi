"""
FrontierAI Database Manager
Handles all database operations and schema management
"""

import sqlite3
import logging
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
import json

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Centralized database management for FrontierAI"""
    
    def __init__(self, db_path: str = None):
        """
        Initialize database manager
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path or os.environ.get('DATABASE_PATH', 'frontier_ai.db')
        self.initialized = False
        
    def initialize(self):
        """Initialize database with all required tables"""
        try:
            self._create_tables()
            self.initialized = True
            logger.info(f"Database initialized successfully: {self.db_path}")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    def _create_tables(self):
        """Create all required database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Evolution tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS autonomous_evolutions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                evolution_type TEXT NOT NULL,
                target_system TEXT NOT NULL,
                changes_made TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                performance_impact REAL,
                decision_factors TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # System metrics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                context TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Code analysis results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS code_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repository TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                files_analyzed INTEGER,
                issues_found INTEGER,
                opportunities INTEGER,
                analysis_data TEXT,
                github_url TEXT,
                security_score INTEGER DEFAULT 10,
                complexity_score REAL DEFAULT 0,
                maintainability_score REAL DEFAULT 10,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # GitHub repositories table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS github_repositories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner TEXT NOT NULL,
                name TEXT NOT NULL,
                full_name TEXT NOT NULL,
                description TEXT,
                language TEXT,
                stars INTEGER DEFAULT 0,
                forks INTEGER DEFAULT 0,
                last_analyzed DATETIME,
                analysis_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(owner, name)
            )
        ''')
        
        # Evolution decisions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS evolution_decisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                decision_context TEXT NOT NULL,
                factors_considered TEXT NOT NULL,
                decision_made TEXT NOT NULL,
                confidence_score REAL,
                outcome TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        logger.info("Database tables created successfully")
    
    def log_evolution(self, evolution_type: str, target: str, changes: str, 
                     success: bool, performance: float = None, factors: str = None):
        """
        Log an autonomous evolution event
        
        Args:
            evolution_type: Type of evolution performed
            target: Target system/component
            changes: Description of changes made
            success: Whether evolution was successful
            performance: Performance impact score
            factors: Decision factors that led to evolution
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO autonomous_evolutions 
            (timestamp, evolution_type, target_system, changes_made, success, performance_impact, decision_factors)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            evolution_type,
            target,
            changes,
            success,
            performance,
            factors
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Evolution logged: {evolution_type} on {target}")
    
    def log_metric(self, name: str, value: float, context: str = ""):
        """
        Log a system metric
        
        Args:
            name: Metric name
            value: Metric value
            context: Additional context
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO system_metrics (timestamp, metric_name, metric_value, context)
            VALUES (?, ?, ?, ?)
        ''', (datetime.now().isoformat(), name, value, context))
        
        conn.commit()
        conn.close()
    
    def log_decision(self, context: str, factors: str, decision: str, 
                    confidence: float = None, outcome: str = None):
        """
        Log an autonomous decision
        
        Args:
            context: Decision context
            factors: Factors considered
            decision: Decision made
            confidence: Confidence score (0.0 to 1.0)
            outcome: Decision outcome (if known)
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO evolution_decisions 
            (timestamp, decision_context, factors_considered, decision_made, confidence_score, outcome)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            context,
            factors,
            decision,
            confidence,
            outcome
        ))
        
        conn.commit()
        conn.close()
    
    def store_analysis_result(self, repository: str, analysis_data: Dict):
        """
        Store code analysis results
        
        Args:
            repository: Repository identifier
            analysis_data: Analysis results dictionary
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO code_analysis 
            (repository, files_analyzed, issues_found, opportunities, 
             analysis_data, github_url, security_score, complexity_score, maintainability_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            repository,
            analysis_data.get('files_analyzed', 0),
            analysis_data.get('issues_found', 0),
            analysis_data.get('opportunities', 0),
            json.dumps(analysis_data),
            analysis_data.get('github_url', repository),
            analysis_data.get('security_score', 10),
            analysis_data.get('complexity_score', 0.0),
            analysis_data.get('maintainability_score', 10.0)
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Analysis results stored for: {repository}")
    
    def get_evolution_stats(self) -> Dict:
        """Get evolution statistics"""
        if not self.initialized:
            return {"error": "Database not initialized"}
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get basic stats
        cursor.execute('SELECT COUNT(*) FROM autonomous_evolutions WHERE success = 1')
        successful = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM autonomous_evolutions')
        total = cursor.fetchone()[0]
        
        cursor.execute('SELECT AVG(performance_impact) FROM autonomous_evolutions WHERE success = 1')
        avg_performance = cursor.fetchone()[0] or 0.0
        
        # Get recent evolutions
        cursor.execute('''
            SELECT evolution_type, target_system, timestamp 
            FROM autonomous_evolutions 
            ORDER BY timestamp DESC 
            LIMIT 10
        ''')
        recent_evolutions = [
            {"type": row[0], "target": row[1], "timestamp": row[2]}
            for row in cursor.fetchall()
        ]
        
        conn.close()
        
        return {
            "total_evolutions": total,
            "successful_evolutions": successful,
            "success_rate": successful / max(total, 1),
            "average_performance_impact": avg_performance,
            "recent_evolutions": recent_evolutions
        }
    
    def get_recent_metrics(self, limit: int = 100) -> List[Dict]:
        """Get recent system metrics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT metric_name, metric_value, timestamp, context
            FROM system_metrics 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        
        metrics = [
            {
                "name": row[0],
                "value": row[1],
                "timestamp": row[2],
                "context": row[3]
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        return metrics
    
    def get_analysis_history(self, repository: str = None) -> List[Dict]:
        """Get code analysis history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        if repository:
            cursor.execute('''
                SELECT repository, timestamp, files_analyzed, issues_found, 
                       opportunities, security_score, complexity_score, maintainability_score
                FROM code_analysis 
                WHERE repository = ?
                ORDER BY timestamp DESC
            ''', (repository,))
        else:
            cursor.execute('''
                SELECT repository, timestamp, files_analyzed, issues_found, 
                       opportunities, security_score, complexity_score, maintainability_score
                FROM code_analysis 
                ORDER BY timestamp DESC 
                LIMIT 50
            ''')
        
        results = [
            {
                "repository": row[0],
                "timestamp": row[1],
                "files_analyzed": row[2],
                "issues_found": row[3],
                "opportunities": row[4],
                "security_score": row[5],
                "complexity_score": row[6],
                "maintainability_score": row[7]
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        return results
    
    def health_check(self) -> Dict:
        """Perform database health check"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Test basic query
            cursor.execute('SELECT COUNT(*) FROM sqlite_master WHERE type="table"')
            table_count = cursor.fetchone()[0]
            
            # Test write capability
            test_timestamp = datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO system_metrics (timestamp, metric_name, metric_value, context)
                VALUES (?, ?, ?, ?)
            ''', (test_timestamp, 'health_check', 1.0, 'database_test'))
            
            conn.commit()
            conn.close()
            
            return {
                "status": "healthy",
                "initialized": self.initialized,
                "tables": table_count,
                "path": self.db_path,
                "writable": True
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "initialized": self.initialized,
                "path": self.db_path
            }
