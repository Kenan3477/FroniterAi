#!/usr/bin/env python3
"""
Quick Start - Enhanced Frontier AI Evolution System
Double-click this file to start the enhanced dashboard with continuous analysis
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    print("🚀 STARTING ENHANCED FRONTIER AI EVOLUTION SYSTEM")
    print("=" * 60)
    print("🔍 Continuous Repository Analysis: ENABLED")
    print("🚀 Auto Dashboard Upgrades: ENABLED") 
    print("📊 Real-time Stats: CONNECTED")
    print("🤖 Autonomous Evolution: ACTIVE")
    print("=" * 60)
    print()
    
    # Change to the correct directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    try:
        # Start the enhanced dashboard
        subprocess.run([sys.executable, "enhanced_frontier_dashboard.py"])
    except KeyboardInterrupt:
        print("\n🛑 System stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to continue...")

if __name__ == "__main__":
    main()
