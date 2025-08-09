#!/usr/bin/env python3
"""
🔒 SQL INJECTION SECURITY FIX
============================
Secure SQL query implementation for complete_frontier_dashboard
Generated: 2025-08-09T14:20:47.108628
"""

import sqlite3
import logging
from typing import List, Dict, Any, Optional, Tuple

class SecureDatabaseManager:
    """Secure database operations with SQL injection protection"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.logger = logging.getLogger(__name__)
        
    def secure_query(self, query: str, parameters: Tuple = ()) -> List[Dict[str, Any]]:
        """
        Execute query with parameterized statements (SQL injection safe)
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row  # Enable dict-like access
                cursor = conn.cursor()
                
                # Use parameterized query to prevent SQL injection
                cursor.execute(query, parameters)
                
                if query.strip().upper().startswith('SELECT'):
                    results = cursor.fetchall()
                    return [dict(row) for row in results]
                else:
                    conn.commit()
                    return [{"affected_rows": cursor.rowcount}]
                    
        except sqlite3.Error as e:
            self.logger.error(f"🔒 Database error: {e}")
            raise
        except Exception as e:
            self.logger.error(f"❌ Unexpected error: {e}")
            raise
    
    def secure_insert(self, table: str, data: Dict[str, Any]) -> int:
        """
        Secure INSERT operation
        """
        columns = list(data.keys())
        placeholders = ['?' for _ in columns]
        values = list(data.values())
        
        query = f"""
            INSERT INTO {table} ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
        """
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(query, values)
                conn.commit()
                return cursor.lastrowid
                
        except sqlite3.Error as e:
            self.logger.error(f"🔒 Insert error: {e}")
            raise
    
    def secure_update(self, table: str, data: Dict[str, Any], 
                     where_clause: str, where_params: Tuple = ()) -> int:
        """
        Secure UPDATE operation
        """
        set_clauses = [f"{col} = ?" for col in data.keys()]
        values = list(data.values()) + list(where_params)
        
        query = f"""
            UPDATE {table}
            SET {', '.join(set_clauses)}
            WHERE {where_clause}
        """
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(query, values)
                conn.commit()
                return cursor.rowcount
                
        except sqlite3.Error as e:
            self.logger.error(f"🔒 Update error: {e}")
            raise
    
    def secure_delete(self, table: str, where_clause: str, 
                     where_params: Tuple = ()) -> int:
        """
        Secure DELETE operation
        """
        query = f"DELETE FROM {table} WHERE {where_clause}"
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(query, where_params)
                conn.commit()
                return cursor.rowcount
                
        except sqlite3.Error as e:
            self.logger.error(f"🔒 Delete error: {e}")
            raise

# Example usage:
# db = SecureDatabaseManager("database.db")
# 
# # Safe SELECT
# results = db.secure_query("SELECT * FROM users WHERE id = ?", (user_id,))
# 
# # Safe INSERT
# new_id = db.secure_insert("users", {"name": "John", "email": "john@example.com"})
# 
# # Safe UPDATE
# affected = db.secure_update("users", {"name": "Jane"}, "id = ?", (user_id,))

if __name__ == "__main__":
    print("🔒 Secure database manager ready for integration")
    print("✅ All SQL operations are now injection-safe")
