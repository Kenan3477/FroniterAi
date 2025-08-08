#!/usr/bin/env python3
"""
Advanced Code Analyzer Test Script
Tests the code analyzer with security checks and scheduled analysis
"""
import os
import sys
import time
import logging
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path to find code_analyzer
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the code analyzer
from code_analyzer import CodeAnalyzer, CodeAnalysisScheduler

def test_security_analysis():
    """Test the security analysis features"""
    logger.info("Testing security analysis features...")
    
    # Create a test file with security issues
    test_dir = os.path.join(os.getcwd(), 'test_analyzer')
    os.makedirs(test_dir, exist_ok=True)
    
    # SQL Injection vulnerability test
    sql_injection_test = os.path.join(test_dir, 'sql_injection_test.py')
    with open(sql_injection_test, 'w') as f:
        f.write("""
# Test file with SQL injection vulnerability
import sqlite3

def unsafe_query(user_input):
    \"\"\"Execute an unsafe SQL query\"\"\"
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # VULNERABLE: Uses string formatting with user input
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    cursor.execute(query)
    
    return cursor.fetchall()

def unsafe_query2(user_id):
    \"\"\"Another unsafe SQL query\"\"\"
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # VULNERABLE: Uses string concatenation with user input
    query = "SELECT * FROM users WHERE id = " + user_id
    cursor.execute(query)
    
    return cursor.fetchall()
        """)
    
    # Shell injection vulnerability test
    shell_injection_test = os.path.join(test_dir, 'shell_injection_test.py')
    with open(shell_injection_test, 'w') as f:
        f.write("""
# Test file with shell injection vulnerability
import os
import subprocess

def unsafe_command(user_input):
    \"\"\"Execute an unsafe shell command\"\"\"
    # VULNERABLE: Uses string formatting with user input
    cmd = f"ls -la {user_input}"
    os.system(cmd)
    
    # VULNERABLE: Another example
    output = subprocess.check_output("grep " + user_input + " /var/log/app.log", shell=True)
    return output
        """)
    
    # Hardcoded secrets test
    hardcoded_secrets_test = os.path.join(test_dir, 'hardcoded_secrets_test.py')
    with open(hardcoded_secrets_test, 'w') as f:
        f.write("""
# Test file with hardcoded secrets
import requests

def connect_to_api():
    \"\"\"Connect to an API with hardcoded credentials\"\"\"
    # VULNERABLE: Hardcoded API key
    api_key = "sk_test_123456789abcdefghijklmnopqrstuvwxyz"
    
    # VULNERABLE: Hardcoded password
    db_password = "super_secret_password123"
    
    # VULNERABLE: Hardcoded token
    auth_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ"
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "X-API-Key": api_key
    }
    
    response = requests.get("https://api.example.com/data", headers=headers)
    return response.json()
        """)
    
    # Dangerous functions test
    dangerous_functions_test = os.path.join(test_dir, 'dangerous_functions_test.py')
    with open(dangerous_functions_test, 'w') as f:
        f.write("""
# Test file with dangerous functions
def execute_dynamic_code(user_input):
    \"\"\"Execute dynamic code from user input\"\"\"
    # VULNERABLE: Uses eval on user input
    result = eval(user_input)
    
    # VULNERABLE: Uses exec on user input
    exec(f"print({user_input})")
    
    return result
        """)
    
    # Run analysis on the test directory
    analyzer = CodeAnalyzer(test_dir)
    results = analyzer.scan_repository()
    
    # Print results
    logger.info(f"Security analysis found {analyzer.total_issues} issues")
    
    # Generate and save report
    report_path = os.path.join(test_dir, 'security_analysis_report.md')
    analyzer.save_report_to_file(report_path)
    logger.info(f"Security analysis report saved to: {report_path}")
    
    return results

def test_scheduler():
    """Test the code analysis scheduler"""
    logger.info("Testing code analysis scheduler...")
    
    repo_path = os.getcwd()
    scheduler = CodeAnalysisScheduler(repo_path, interval_hours=1)  # Use 1 hour for testing
    
    # Start the scheduler
    scheduler.start_scheduling()
    
    # Wait for the initial analysis to complete
    time.sleep(5)
    
    # Check status
    status = scheduler.get_status()
    logger.info(f"Scheduler status: {status}")
    
    # Force another analysis
    scheduler._run_analysis()
    
    # Check status again
    status = scheduler.get_status()
    logger.info(f"Updated scheduler status: {status}")
    
    # Stop the scheduler
    scheduler.stop_scheduling()
    
    return status

def main():
    """Run all code analyzer tests"""
    logger.info("Starting code analyzer tests...")
    
    # Test security analysis
    security_results = test_security_analysis()
    
    # Test scheduler
    scheduler_status = test_scheduler()
    
    logger.info("All tests completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
