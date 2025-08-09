#!/usr/bin/env python3
"""
COMPREHENSIVE API TEST - VERIFY ALL 7 CORE APIS WORK
Tests all FrontierAI APIs to ensure complete functionality
"""

import requests
import json
from datetime import datetime

def test_api(endpoint, description, method="GET", data=None):
    """Test an API endpoint and return status"""
    try:
        if method == "POST":
            response = requests.post(f"http://localhost:5000/api/{endpoint}", json=data, timeout=10)
        else:
            response = requests.get(f"http://localhost:5000/api/{endpoint}", timeout=10)
        
        status = "✅ WORKING" if response.status_code == 200 else f"❌ FAILED ({response.status_code})"
        data_size = len(response.text) if response.text else 0
        print(f"{endpoint:20} | {status:15} | {data_size:6} bytes | {description}")
        return response.status_code == 200
    except Exception as e:
        print(f"{endpoint:20} | ❌ ERROR     |      0 bytes | {description} - {str(e)}")
        return False

def main():
    print("=" * 80)
    print("🔥 REAL FRONTIERAI - COMPREHENSIVE API TEST")
    print("=" * 80)
    print(f"Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("API Endpoint         | Status         | Size      | Description")
    print("-" * 80)
    
    # Test all 7 core APIs
    apis = [
        ("real-metrics", "Real system metrics and performance data", "GET", None),
        ("analyze-github", "GitHub repository analysis", "POST", {"owner": "octocat", "repo": "Hello-World"}),
        ("health-real", "Real system health monitoring", "GET", None),
        ("market-analysis", "AI market analysis and trends", "GET", None),
        ("database-status", "Database operations and statistics", "GET", None),
        ("evolution-status", "Autonomous evolution system status", "GET", None),
        ("background-services", "Background services monitoring", "GET", None)
    ]
    
    working_count = 0
    total_count = len(apis)
    
    for endpoint, description, method, data in apis:
        if test_api(endpoint, description, method, data):
            working_count += 1
    
    print("-" * 80)
    print(f"RESULTS: {working_count}/{total_count} APIs working")
    
    if working_count == total_count:
        print("🎉 SUCCESS: ALL APIS ARE WORKING PERFECTLY!")
        print("✅ READY FOR RAILWAY DEPLOYMENT")
    else:
        print(f"⚠️  WARNING: {total_count - working_count} APIs not working")
        print("❌ Need to fix issues before deployment")
    
    print("=" * 80)

if __name__ == "__main__":
    main()
