"""
Product Launch Dashboard Launcher
Quick launcher for the Week 1 beta soft launch dashboard
"""

import subprocess
import sys
import os
from pathlib import Path

def launch_product_dashboard():
    """Launch the product launch dashboard"""
    
    script_dir = Path(__file__).parent
    dashboard_path = script_dir / "product_launch" / "launch_dashboard.py"
    
    if not dashboard_path.exists():
        print("❌ Launch dashboard file not found!")
        print(f"Expected location: {dashboard_path}")
        return
    
    print("🚀 Launching Frontier Product Launch Dashboard...")
    print("📊 Dashboard will be available at: http://localhost:8502")
    print("⏹️  Press Ctrl+C to stop the dashboard")
    print("=" * 60)
    
    try:
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", 
            str(dashboard_path),
            "--server.port", "8502",
            "--server.headless", "true",
            "--browser.gatherUsageStats", "false"
        ], cwd=str(script_dir))
        
    except KeyboardInterrupt:
        print("\n🛑 Launch dashboard stopped by user")
    except Exception as e:
        print(f"❌ Error launching dashboard: {e}")

if __name__ == "__main__":
    launch_product_dashboard()
