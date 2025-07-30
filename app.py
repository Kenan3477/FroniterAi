#!/usr/bin/env python3
"""
Railway-optimized entry point for Frontier AI Evolution System
Simpler startup process for cloud deployment
"""

import os
import sys
from pathlib import Path

# Import the main system
from comprehensive_evolution_system import ComprehensiveEvolutionSystem

def main():
    """Main entry point optimized for Railway deployment"""
    print("🚀 Starting Frontier AI Evolution System on Railway...")
    
    # Set up workspace
    workspace_path = Path.cwd()
    
    # Create and start the system
    try:
        system = ComprehensiveEvolutionSystem(workspace_path)
        system.start_comprehensive_evolution()
        
        print("✅ Evolution system started successfully")
        print("🌐 Web interface should be available at the Railway URL")
        
        # Keep the process alive
        import time
        while True:
            time.sleep(10)
            print("💫 Evolution system running...")
            
    except Exception as e:
        print(f"❌ Error starting system: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
