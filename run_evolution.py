#!/usr/bin/env python3
"""
Simple runner for the Comprehensive Evolution System
"""

import sys
import os
from pathlib import Path

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Import and run the system
try:
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    
    print("🏗️ Starting Comprehensive Evolution System...")
    
    # Create and start the system
    workspace_path = current_dir
    system = ComprehensiveEvolutionSystem(workspace_path)
    system.start_comprehensive_evolution()
    
    # Keep the system running
    print("✅ System started successfully!")
    print("🌐 Dashboard: http://localhost:8888")
    print("Press Ctrl+C to stop...")
    
    try:
        while True:
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping Comprehensive Evolution System...")
        system.running = False
        if system.server:
            system.server.shutdown()
        print("✅ System stopped successfully!")
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure comprehensive_evolution_system.py is in the same directory")
except Exception as e:
    print(f"❌ Error starting system: {e}")
    import traceback
    traceback.print_exc()
