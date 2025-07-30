#!/usr/bin/env python3
"""
🏗️ Comprehensive Evolution System Launcher
========================================

This script starts the Comprehensive Evolution System that:
- Creates entire code blocks (not line-by-line changes)
- Stops all processes when given tasks
- Implements comprehensive features across multiple files
- Shows results by opening created pages/demos
- Has all the functionality of the true evolution system PLUS more

Usage:
    python run_comprehensive_evolution.py

Features:
    ✅ Task-focused operation (stops everything for tasks)
    ✅ Comprehensive code generation
    ✅ Web interface on localhost:8888
    ✅ Automatic file backup and testing
    ✅ Opens created demos and pages
    ✅ Full React component generation
    ✅ API service creation
    ✅ Performance monitoring
"""

import sys
import time
import webbrowser
from pathlib import Path
from comprehensive_evolution_system import ComprehensiveEvolutionSystem

def main():
    print("🏗️ COMPREHENSIVE EVOLUTION SYSTEM")
    print("=" * 50)
    print("✨ Features:")
    print("   🛑 Stops all processes for tasks")
    print("   🏗️ Creates entire code blocks")
    print("   📱 Generates complete UI components")
    print("   🌐 Opens created demos automatically")
    print("   ⚡ Web interface on localhost:8888")
    print("=" * 50)
    
    # Initialize the system
    workspace_path = Path.cwd()
    system = ComprehensiveEvolutionSystem(workspace_path)
    
    print(f"📁 Workspace: {workspace_path}")
    print(f"🌐 Web Interface: http://localhost:8888")
    print("=" * 50)
    
    try:
        # Start the comprehensive evolution system
        system.start_comprehensive_evolution()
        
        # Open the web interface
        print("🌐 Opening web interface...")
        time.sleep(2)  # Give server time to start
        webbrowser.open("http://localhost:8888")
        
        print("\n✅ System is running!")
        print("📋 INSTRUCTIONS:")
        print("   1. Use the web interface to add tasks")
        print("   2. System will stop evolution and focus on your task")
        print("   3. Created files and demos will open automatically")
        print("   4. System returns to autonomous mode after completion")
        print("\n🛑 Press Ctrl+C to stop")
        
        # Keep running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Comprehensive Evolution System stopped")
        if hasattr(system, 'server') and system.server:
            system.server.shutdown()
        print("✅ Clean shutdown complete")

if __name__ == "__main__":
    main()
