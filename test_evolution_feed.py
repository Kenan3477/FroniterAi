#!/usr/bin/env python3
"""
Test script for the Real Evolution Feed System
"""

import sys
import os
import json
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.getcwd())

try:
    from real_evolution_feed import RealEvolutionFeed
    print("✅ Real Evolution Feed imported successfully")
    
    # Initialize the feed
    print("\n🔄 Initializing Evolution Feed...")
    feed = RealEvolutionFeed()
    print("✅ Evolution Feed initialized")
    
    # Run security scan
    print("\n🔍 Running comprehensive security scan...")
    result = feed.scan_and_report_security_issues()
    print(f"✅ Security scan completed!")
    print(f"   📁 Files scanned: {result.get('files_scanned', 0)}")
    print(f"   ⚠️  Issues found: {result.get('issues_found', 0)}")
    print(f"   🆔 Scan ID: {result.get('scan_id', 'N/A')}")
    
    # Get recent activities
    print("\n📡 Retrieving recent activities...")
    activities = feed.get_recent_activities(limit=10)
    print(f"✅ Found {len(activities)} recent activities:")
    
    for i, activity in enumerate(activities[:5], 1):
        print(f"   {i}. {activity['title']} ({activity['severity']})")
        print(f"      📅 {activity['created_at']}")
        print(f"      📝 {activity['description'][:80]}...")
        if activity.get('files_affected'):
            print(f"      📄 Files: {len(activity['files_affected'])}")
        print()
    
    print("🎉 Evolution Feed System is working correctly!")
    print(f"🌐 You can now access the Enhanced Evolution Dashboard at:")
    print(f"   http://localhost:5000/evolution")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure real_evolution_feed.py exists in the current directory")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
