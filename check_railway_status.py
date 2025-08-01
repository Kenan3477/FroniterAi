#!/usr/bin/env python3
"""
Check Railway Deployment Status
Verify your self-evolution system is working on Railway
"""

import requests
import time

def check_railway_deployment():
    """Check if the Railway deployment is working"""
    print("🚀 Checking Your Railway Deployment")
    print("=" * 40)
    
    # Note: You'll need to replace this with your actual Railway URL
    # Look for it in your Railway dashboard
    railway_url = "https://your-app-name.railway.app"  # Replace with your actual URL
    
    print("📝 To get your Railway URL:")
    print("1. Go to your Railway dashboard")
    print("2. Click on your FroniterAi project")
    print("3. Look for the public URL (usually shown prominently)")
    print("4. Update the railway_url variable in this script")
    print()
    
    # Test basic connectivity
    try:
        print("🌐 Testing basic connectivity...")
        response = requests.get(railway_url, timeout=10)
        
        if response.status_code == 200:
            print("✅ Your Frontier AI is LIVE on Railway!")
            print(f"📡 Status: {response.status_code}")
            print(f"🌐 URL: {railway_url}")
            
            # Test the heartbeat endpoint
            print("\n💓 Testing GitHub connection...")
            heartbeat_url = f"{railway_url}/api/heartbeat-status"
            heartbeat_response = requests.get(heartbeat_url, timeout=10)
            
            if heartbeat_response.status_code == 200:
                data = heartbeat_response.json()
                print("✅ GitHub monitoring is working!")
                print(f"📊 Repository Status: {data.get('status', 'unknown')}")
                print(f"📁 Files Being Monitored: {data.get('files_count', 0)}")
                print(f"🐍 Python Files Analyzed: {data.get('python_files_count', 0)}")
                
                if data.get('files_count', 0) > 0:
                    print("\n🎉 SUCCESS! Your self-evolution system is:")
                    print(f"   ✅ Monitoring {data.get('files_count', 0)} files")
                    print(f"   ✅ Analyzing {data.get('python_files_count', 0)} Python files")
                    print("   ✅ Ready for autonomous evolution!")
                else:
                    print("\n⏳ System starting up, files will be detected soon...")
            else:
                print(f"⚠️  Heartbeat endpoint returned: {heartbeat_response.status_code}")
                
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"🔍 Cannot reach {railway_url}")
        print("📝 This is normal if you haven't updated the URL yet")
        print(f"Error: {e}")
    
    print("\n🎯 Next Steps:")
    print("1. Get your Railway public URL from the dashboard")
    print("2. Update the railway_url in this script")
    print("3. Run this script again to verify everything is working")
    print("4. Visit your URL to see the live dashboard!")

if __name__ == "__main__":
    check_railway_deployment()
