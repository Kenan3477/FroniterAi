"""
Beta Program Dashboard Launcher
Simple launcher script for the comprehensive beta program dashboard
"""

import subprocess
import sys
import os
from pathlib import Path

def launch_dashboard():
    """Launch the beta program dashboard"""
    
    # Get the directory of this script
    script_dir = Path(__file__).parent
    dashboard_path = script_dir / "beta_program" / "dashboard.py"
    
    # Check if dashboard exists
    if not dashboard_path.exists():
        print("❌ Dashboard file not found!")
        print(f"Expected location: {dashboard_path}")
        return
    
    print("🚀 Launching Frontier Beta Program Dashboard...")
    print("📊 Dashboard will be available at: http://localhost:8501")
    print("⏹️  Press Ctrl+C to stop the dashboard")
    print("=" * 60)
    
    try:
        # Launch streamlit
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", 
            str(dashboard_path),
            "--server.port", "8501",
            "--server.headless", "true",
            "--browser.gatherUsageStats", "false"
        ], cwd=str(script_dir))
        
    except KeyboardInterrupt:
        print("\n🛑 Dashboard stopped by user")
    except Exception as e:
        print(f"❌ Error launching dashboard: {e}")

if __name__ == "__main__":
    launch_dashboard()
