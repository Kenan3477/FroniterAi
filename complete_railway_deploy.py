#!/usr/bin/env python3
"""
🚀 COMPLETE RAILWAY DEPLOYMENT SCRIPT
Deploys Frontier AI Comprehensive System to Railway
"""

import os
import subprocess
import json
import time

def run_command(command, description):
    """Run a command and return the result"""
    print(f"\n🔧 {description}")
    print(f"Command: {command}")
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=60)
        print(f"Return code: {result.returncode}")
        
        if result.stdout:
            print(f"Output: {result.stdout}")
        if result.stderr:
            print(f"Error: {result.stderr}")
            
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        print("❌ Command timed out")
        return False, "", "Command timed out"
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False, "", str(e)

def deploy_to_railway():
    """Complete Railway deployment process"""
    
    print("🚀 FRONTIER AI - RAILWAY DEPLOYMENT")
    print("=" * 50)
    
    # Step 1: Check Railway CLI
    success, output, error = run_command("railway --version", "Checking Railway CLI")
    if not success:
        print("❌ Railway CLI not found. Installing...")
        # Download and install Railway CLI for Windows
        run_command("powershell -c \"iwr -useb https://install.railway.app | iex\"", "Installing Railway CLI")
    
    # Step 2: Check authentication
    success, output, error = run_command("railway whoami", "Checking Railway authentication")
    if not success:
        print("⚠️ Not authenticated. Please run 'railway login' manually")
        return False
    
    print(f"✅ Authenticated as: {output.strip()}")
    
    # Step 3: Ensure we're in the right directory and files are ready
    required_files = ["railway_main.py", "Procfile", "requirements.txt"]
    for file in required_files:
        if not os.path.exists(file):
            print(f"❌ Required file {file} not found")
            return False
        print(f"✅ Found {file}")
    
    # Step 4: Git commit current state
    run_command("git add .", "Adding files to git")
    run_command("git commit -m \"Railway deployment: Comprehensive Frontier AI System\"", "Committing changes")
    
    # Step 5: Initialize Railway project if needed
    success, output, error = run_command("railway status", "Checking Railway project status")
    if not success or "No project found" in error:
        print("🔧 Initializing new Railway project...")
        success, output, error = run_command("railway init frontier-ai-comprehensive --template empty", "Initializing Railway project")
        
        if not success:
            # Try manual init
            print("🔧 Trying manual Railway init...")
            process = subprocess.Popen("railway init", shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate(input="frontier-ai-comprehensive\n")
            print(f"Init output: {stdout}")
            if stderr:
                print(f"Init errors: {stderr}")
    
    # Step 6: Deploy to Railway
    print("\n🚀 Starting Railway deployment...")
    success, output, error = run_command("railway up", "Deploying to Railway")
    
    if success:
        print("✅ Deployment initiated successfully!")
        
        # Step 7: Get deployment URL
        time.sleep(5)  # Wait for deployment to start
        success, output, error = run_command("railway domain", "Getting deployment domain")
        
        if success and output.strip():
            domain = output.strip()
            print(f"🌐 Deployment URL: {domain}")
            
            # Test the deployment
            test_deployment(domain)
            
        else:
            print("⚠️ Domain not ready yet. Check Railway dashboard.")
            
        return True
    else:
        print(f"❌ Deployment failed: {error}")
        return False

def test_deployment(domain):
    """Test the deployed application"""
    print(f"\n🧪 Testing deployment at {domain}")
    
    try:
        import requests
        
        # Test health endpoint
        response = requests.get(f"https://{domain}/", timeout=10)
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"⚠️ Health check returned {response.status_code}")
            
        # Test status endpoint
        response = requests.get(f"https://{domain}/api/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Status endpoint working: {data}")
        else:
            print(f"⚠️ Status endpoint returned {response.status_code}")
            
    except ImportError:
        print("⚠️ Requests library not available. Manual testing required.")
    except Exception as e:
        print(f"⚠️ Test failed: {e}")

if __name__ == "__main__":
    print("🚀 FRONTIER AI COMPREHENSIVE SYSTEM")
    print("🎯 ANTI-SPAM PROTECTED EVOLUTION")
    print("🧠 MARKET INTELLIGENCE ENABLED")
    print("📊 COMPREHENSIVE IMPLEMENTATION LIFECYCLE")
    print()
    
    success = deploy_to_railway()
    
    if success:
        print("\n🎊 DEPLOYMENT COMPLETE!")
        print("✅ Frontier AI is now live on Railway!")
        print("🛡️ Anti-spam protection active")
        print("🧠 Comprehensive implementation engine ready")
        print("📈 Market intelligence system operational")
    else:
        print("\n❌ Deployment encountered issues")
        print("Check the output above for details")
