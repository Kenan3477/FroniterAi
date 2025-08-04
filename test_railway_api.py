import requests
import json

try:
    print("🔍 Testing Railway API Endpoint...")
    response = requests.get("https://web-production-3ef05.up.railway.app/api/evolution/heartbeat", timeout=15)
    print(f"📡 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"🔗 Connection Status: {data.get('connection_status', 'unknown')}")
        print(f"📊 Total Commits: {data.get('total_commits', 'unknown')}")
        print(f"📁 Total Files: {data.get('total_files', 'unknown')}")
        print(f"📂 Repository: {data.get('repository', 'unknown')}")
        print(f"📏 Repository Size: {data.get('repository_size', 'unknown')}")
        
        # Check if it's real or simulated data
        if data.get('connection_status') == 'connected' and data.get('total_commits', 0) > 150:
            print("✅ REAL GITHUB DATA ACTIVE!")
        elif data.get('connection_status') == 'simulated':
            print("⚠️ SIMULATED DATA - GITHUB_TOKEN NOT SET IN RAILWAY")
        else:
            print("❓ UNKNOWN DATA SOURCE")
            
        print("\n📋 Raw Response (first 1000 chars):")
        print(json.dumps(data, indent=2)[:1000])
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
except Exception as e:
    print(f"💥 Error: {e}")
    
print("\n" + "="*60)
print("🎯 DIAGNOSIS:")
print("If you see 'simulated' status or commits < 150:")
print("1. Go to Railway Dashboard")
print("2. Select your FroniterAi project")  
print("3. Go to Variables tab")
print("4. Add: GITHUB_TOKEN = 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")
print("5. Railway will auto-redeploy with real GitHub data!")
print("="*60)
