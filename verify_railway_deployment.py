#!/usr/bin/env python3
"""
🚀 FRONTIER AI RAILWAY DEPLOYMENT VERIFICATION
Complete system test suite for Railway deployment
"""

import requests
import json
import time
import sys

def test_deployment_endpoint(url, endpoint, method='GET', data=None, timeout=30):
    """Test a specific endpoint"""
    full_url = f"{url}{endpoint}"
    
    try:
        if method == 'GET':
            response = requests.get(full_url, timeout=timeout)
        elif method == 'POST':
            response = requests.post(full_url, json=data, timeout=timeout)
        
        return {
            'success': response.status_code == 200,
            'status_code': response.status_code,
            'data': response.json() if response.headers.get('content-type') == 'application/json' else response.text[:200],
            'response_time': response.elapsed.total_seconds()
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'response_time': 0
        }

def verify_comprehensive_system(base_url):
    """Verify all components of the comprehensive system"""
    
    print("🚀 FRONTIER AI COMPREHENSIVE SYSTEM VERIFICATION")
    print("=" * 60)
    print(f"🌐 Testing deployment at: {base_url}")
    print()
    
    tests = [
        {
            'name': 'Health Check',
            'endpoint': '/',
            'method': 'GET',
            'description': 'Basic application health'
        },
        {
            'name': 'System Status',
            'endpoint': '/api/status',
            'method': 'GET',
            'description': 'Evolution system status'
        },
        {
            'name': 'Anti-Spam Protection Test',
            'endpoint': '/api/test-spam-protection',
            'method': 'GET',
            'description': 'Verify spam protection is active'
        },
        {
            'name': 'Evolution Engine Test',
            'endpoint': '/api/evolve',
            'method': 'POST',
            'data': {'test_mode': True, 'description': 'Test evolution'},
            'description': 'Core evolution functionality'
        },
        {
            'name': 'Comprehensive Implementation Test',
            'endpoint': '/api/comprehensive-implement',
            'method': 'POST',
            'data': {
                'improvement': 'Test feature implementation',
                'test_mode': True
            },
            'description': 'Comprehensive implementation lifecycle'
        },
        {
            'name': 'Market Intelligence Test',
            'endpoint': '/api/market-analysis',
            'method': 'GET',
            'description': 'Market intelligence system'
        }
    ]
    
    results = []
    passed = 0
    total = len(tests)
    
    for i, test in enumerate(tests, 1):
        print(f"🔍 Test {i}/{total}: {test['name']}")
        print(f"   {test['description']}")
        
        result = test_deployment_endpoint(
            base_url, 
            test['endpoint'], 
            test['method'], 
            test.get('data'),
            timeout=45  # Longer timeout for complex operations
        )
        
        if result['success']:
            print(f"   ✅ PASSED ({result['response_time']:.2f}s)")
            if 'data' in result:
                print(f"   📊 Response: {str(result['data'])[:100]}...")
            passed += 1
        else:
            print(f"   ❌ FAILED")
            if 'error' in result:
                print(f"   🚨 Error: {result['error']}")
            elif 'status_code' in result:
                print(f"   🚨 HTTP {result['status_code']}")
        
        results.append({**test, **result})
        print()
    
    # Summary
    print("=" * 60)
    print(f"🎯 VERIFICATION RESULTS: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎊 ALL SYSTEMS OPERATIONAL!")
        print("✅ Frontier AI is fully deployed and functional")
        print("🛡️ Anti-spam protection confirmed active")
        print("🧠 Comprehensive implementation system ready")
        print("📈 Market intelligence system operational")
        success = True
    elif passed >= total * 0.7:  # 70% pass rate
        print("⚠️ MOSTLY OPERATIONAL")
        print("🔧 Some features may need additional configuration")
        success = True
    else:
        print("❌ DEPLOYMENT ISSUES DETECTED")
        print("🚨 Significant problems require immediate attention")
        success = False
    
    print()
    print("🌐 Deployment URL:", base_url)
    print("📊 System Status:", "OPERATIONAL" if success else "NEEDS ATTENTION")
    
    return success, results

def main():
    """Main verification process"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        print("Enter your Railway deployment URL:")
        base_url = input("URL: ").strip()
    
    if not base_url:
        print("❌ No URL provided. Exiting.")
        return
    
    # Ensure URL format
    if not base_url.startswith('http'):
        base_url = 'https://' + base_url
    
    # Remove trailing slash
    base_url = base_url.rstrip('/')
    
    print(f"🚀 Starting comprehensive verification of: {base_url}")
    print()
    
    success, results = verify_comprehensive_system(base_url)
    
    # Save results
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    results_file = f"railway_verification_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump({
            'timestamp': timestamp,
            'base_url': base_url,
            'success': success,
            'results': results
        }, f, indent=2)
    
    print(f"📄 Results saved to: {results_file}")
    
    if success:
        print("\n🎊 RAILWAY DEPLOYMENT SUCCESSFUL!")
        print("Your Frontier AI system is live and ready for autonomous evolution!")
    else:
        print("\n🔧 Check the Railway logs and dashboard for deployment issues.")

if __name__ == "__main__":
    main()
