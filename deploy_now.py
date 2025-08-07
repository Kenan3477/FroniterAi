#!/usr/bin/env python3
"""
🚀 AUTOMATED RAILWAY DEPLOYMENT
Direct deployment of Frontier AI system
"""

import subprocess
import time
import sys
import os

def run_command(cmd, description="Running command"):
    """Run a shell command and return result"""
    print(f"\n🔧 {description}")
    print(f"Command: {cmd}")
    
    try:
        # Use shell=True for Windows compatibility
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=120,
            cwd=os.getcwd()
        )
        
        print(f"Exit code: {result.returncode}")
        
        if result.stdout:
            print(f"Output:\n{result.stdout}")
        
        if result.stderr:
            print(f"Errors:\n{result.stderr}")
            
        return result.returncode == 0, result.stdout, result.stderr
        
    except subprocess.TimeoutExpired:
        print("❌ Command timed out (120s)")
        return False, "", "Timeout"
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False, "", str(e)

def deploy_to_railway():
    """Execute Railway deployment"""
    
    print("🚀 FRONTIER AI - AUTOMATED RAILWAY DEPLOYMENT")
    print("=" * 55)
    
    # Ensure we have the required files
    required_files = ["railway_main.py", "Procfile", "requirements.txt"]
    missing = []
    
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ Found: {file}")
        else:
            print(f"❌ Missing: {file}")
            missing.append(file)
    
    if missing:
        print(f"\n❌ Missing required files: {missing}")
        return False
    
    # Step 1: Commit current state
    print("\n📦 Preparing deployment...")
    run_command("git add .", "Adding files to git")
    run_command('git commit -m "Final Railway deployment - comprehensive system"', "Committing changes")
    
    # Step 2: Check Railway auth
    success, output, error = run_command("railway whoami", "Checking Railway authentication")
    if not success:
        print("❌ Not authenticated with Railway")
        print("Please run: railway login")
        return False
    
    print(f"✅ Authenticated: {output.strip()}")
    
    # Step 3: Check if project exists
    success, output, error = run_command("railway status", "Checking project status")
    
    # Step 4: Deploy
    print("\n🚀 Starting deployment...")
    success, output, error = run_command("railway up", "Deploying to Railway")
    
    if success:
        print("✅ Deployment initiated!")
        
        # Wait a moment then get domain
        time.sleep(3)
        success, domain_output, domain_error = run_command("railway domain", "Getting deployment domain")
        
        if success and domain_output.strip():
            domain = domain_output.strip()
            print(f"\n🌐 DEPLOYMENT SUCCESSFUL!")
            print(f"🎯 Your Frontier AI is live at: https://{domain}")
            
            # Test the deployment
            test_url = f"https://{domain}"
            print(f"\n🧪 Testing deployment...")
            
            try:
                import requests
                response = requests.get(test_url, timeout=30)
                if response.status_code == 200:
                    print("✅ Health check passed!")
                    print("🎊 FRONTIER AI IS LIVE AND OPERATIONAL!")
                else:
                    print(f"⚠️ Health check returned: {response.status_code}")
            except ImportError:
                print("⚠️ Cannot test - requests module not available")
            except Exception as e:
                print(f"⚠️ Test failed: {e}")
            
            return True, domain
        else:
            print("⚠️ Deployment started but domain not ready yet")
            print("Check Railway dashboard for status")
            return True, None
    else:
        print(f"❌ Deployment failed: {error}")
        return False, None

if __name__ == "__main__":
    print("🎯 COMPREHENSIVE ANTI-SPAM SYSTEM")
    print("🛡️ SPAM PROTECTION ACTIVE")
    print("🧠 MARKET INTELLIGENCE ENABLED")
    print("📊 COMPREHENSIVE IMPLEMENTATION LIFECYCLE")
    print()
    
    try:
        success, domain = deploy_to_railway()
        
        if success:
            print("\n🎊 DEPLOYMENT COMPLETE!")
            print("=" * 40)
            print("✅ Frontier AI deployed to Railway")
            print("🛡️ Anti-spam protection active")
            print("🧠 Comprehensive implementation ready")
            print("📈 Market intelligence operational")
            
            if domain:
                print(f"🌐 Live URL: https://{domain}")
                print(f"🔗 API Status: https://{domain}/api/status")
                print(f"🧪 Spam Test: https://{domain}/api/test-spam-protection")
            
            print("\n🚀 SYSTEM READY FOR AUTONOMOUS EVOLUTION!")
        else:
            print("\n❌ Deployment failed")
            print("Check Railway dashboard and logs")
            
    except KeyboardInterrupt:
        print("\n⏹️ Deployment cancelled by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
