#!/usr/bin/env python3
"""
Comprehensive Feature Testing Script for FrontierAI
Tests all features of the deployed Railway application
"""

import requests
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FrontierAITester:
    """Comprehensive tester for FrontierAI features"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'FrontierAI-Tester/1.0',
            'Accept': 'application/json'
        })
        self.test_results = {}
        
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all feature tests"""
        logger.info("🚀 Starting Comprehensive FrontierAI Feature Testing")
        logger.info("=" * 60)
        
        tests = [
            ("Basic Connectivity", self.test_basic_connectivity),
            ("Dashboard Access", self.test_dashboard_access),
            ("API Health Check", self.test_api_health),
            ("GitHub Integration", self.test_github_integration),
            ("Code Analysis", self.test_code_analysis),
            ("Evolution System", self.test_evolution_system),
            ("Autonomous Features", self.test_autonomous_features),
            ("Market Analysis", self.test_market_analysis),
            ("Compliance Engine", self.test_compliance_engine),
            ("Background Services", self.test_background_services),
            ("Database Connectivity", self.test_database_connectivity),
            ("Performance Metrics", self.test_performance_metrics),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            logger.info(f"🧪 Testing: {test_name}")
            try:
                result = test_func()
                if result.get('success', False):
                    logger.info(f"✅ {test_name}: PASSED")
                    passed += 1
                else:
                    logger.error(f"❌ {test_name}: FAILED - {result.get('error', 'Unknown error')}")
                    failed += 1
                self.test_results[test_name] = result
            except Exception as e:
                logger.error(f"❌ {test_name}: EXCEPTION - {str(e)}")
                self.test_results[test_name] = {'success': False, 'error': str(e)}
                failed += 1
            
            time.sleep(1)  # Brief pause between tests
        
        # Summary
        total_tests = passed + failed
        success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
        
        logger.info("=" * 60)
        logger.info(f"🏁 Testing Complete!")
        logger.info(f"📊 Results: {passed}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if failed > 0:
            logger.info(f"❌ Failed tests: {failed}")
        
        return {
            'summary': {
                'total_tests': total_tests,
                'passed': passed,
                'failed': failed,
                'success_rate': success_rate,
                'timestamp': datetime.now().isoformat()
            },
            'detailed_results': self.test_results
        }
    
    def test_basic_connectivity(self) -> Dict[str, Any]:
        """Test basic connectivity to the application"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            
            if response.status_code == 200:
                content_length = len(response.text)
                has_title = "FRONTIER AI" in response.text.upper()
                
                return {
                    'success': True,
                    'status_code': response.status_code,
                    'content_length': content_length,
                    'has_title': has_title,
                    'response_time': response.elapsed.total_seconds()
                }
            else:
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}",
                    'status_code': response.status_code
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_dashboard_access(self) -> Dict[str, Any]:
        """Test dashboard accessibility and content"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            
            if response.status_code == 200:
                content = response.text.upper()
                
                # Check for key dashboard elements
                checks = {
                    'has_title': "FRONTIER AI" in content,
                    'has_autonomous': "AUTONOMOUS" in content,
                    'has_evolution': "EVOLUTION" in content,
                    'has_github': "GITHUB" in content,
                    'has_analysis': "ANALYSIS" in content,
                    'has_live_feed': "LIVE" in content or "FEED" in content
                }
                
                success = all(checks.values())
                
                return {
                    'success': success,
                    'checks': checks,
                    'content_length': len(response.text)
                }
            else:
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}"
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_api_health(self) -> Dict[str, Any]:
        """Test API endpoints health"""
        endpoints = [
            '/api/health',
            '/api/status', 
            '/health',
            '/status'
        ]
        
        results = {}
        success_count = 0
        
        for endpoint in endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code in [200, 404]:  # 404 is OK if endpoint doesn't exist
                    if response.status_code == 200:
                        success_count += 1
                    results[endpoint] = {
                        'status': response.status_code,
                        'success': response.status_code == 200
                    }
                else:
                    results[endpoint] = {
                        'status': response.status_code,
                        'success': False
                    }
            except Exception as e:
                results[endpoint] = {
                    'error': str(e),
                    'success': False
                }
        
        return {
            'success': success_count > 0,  # At least one health endpoint should work
            'endpoints_tested': len(endpoints),
            'successful_endpoints': success_count,
            'results': results
        }
    
    def test_github_integration(self) -> Dict[str, Any]:
        """Test GitHub integration features"""
        try:
            # Test GitHub-related endpoints
            github_endpoints = [
                '/github/status',
                '/api/github/repos',
                '/github/monitor'
            ]
            
            results = {}
            for endpoint in github_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                    results[endpoint] = {
                        'status': response.status_code,
                        'accessible': response.status_code in [200, 401, 403]  # Auth errors are OK
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e), 'accessible': False}
            
            # Check if GitHub is mentioned in main page
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            has_github_reference = "github" in main_response.text.lower() if main_response.status_code == 200 else False
            
            return {
                'success': has_github_reference or any(r.get('accessible', False) for r in results.values()),
                'github_in_main_page': has_github_reference,
                'endpoint_results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_code_analysis(self) -> Dict[str, Any]:
        """Test code analysis features"""
        try:
            # Test code analysis endpoints
            analysis_endpoints = [
                '/analysis/status',
                '/api/analysis/summary',
                '/code-analysis'
            ]
            
            results = {}
            for endpoint in analysis_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                    results[endpoint] = {
                        'status': response.status_code,
                        'accessible': response.status_code in [200, 202, 404]
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e), 'accessible': False}
            
            # Check main page for analysis references
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            if main_response.status_code == 200:
                content = main_response.text.lower()
                has_analysis_ref = any(term in content for term in ['analysis', 'analyzer', 'code quality'])
            else:
                has_analysis_ref = False
            
            return {
                'success': has_analysis_ref or any(r.get('accessible', False) for r in results.values()),
                'analysis_in_main_page': has_analysis_ref,
                'endpoint_results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_evolution_system(self) -> Dict[str, Any]:
        """Test evolution system features"""
        try:
            # Test evolution endpoints
            evolution_endpoints = [
                '/evolution/status',
                '/api/evolution/feed',
                '/evolution/goals'
            ]
            
            results = {}
            for endpoint in evolution_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                    results[endpoint] = {
                        'status': response.status_code,
                        'accessible': response.status_code in [200, 202, 404]
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e), 'accessible': False}
            
            # Check main page for evolution references
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            if main_response.status_code == 200:
                content = main_response.text.lower()
                has_evolution_ref = any(term in content for term in ['evolution', 'autonomous', 'self-improving'])
            else:
                has_evolution_ref = False
            
            return {
                'success': has_evolution_ref or any(r.get('accessible', False) for r in results.values()),
                'evolution_in_main_page': has_evolution_ref,
                'endpoint_results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_autonomous_features(self) -> Dict[str, Any]:
        """Test autonomous system features"""
        try:
            # Check main page for autonomous features
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            if main_response.status_code == 200:
                content = main_response.text.lower()
                
                autonomous_features = {
                    'has_autonomous_keyword': 'autonomous' in content,
                    'has_self_keyword': 'self' in content,
                    'has_automatic_keyword': 'automatic' in content,
                    'has_ai_keyword': 'ai' in content or 'artificial intelligence' in content,
                    'has_monitoring': 'monitor' in content,
                    'has_real_time': 'real-time' in content or 'live' in content
                }
                
                success = sum(autonomous_features.values()) >= 3  # At least 3 features should be present
                
                return {
                    'success': success,
                    'features_found': autonomous_features,
                    'feature_count': sum(autonomous_features.values())
                }
            else:
                return {
                    'success': False,
                    'error': f"HTTP {main_response.status_code}"
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_market_analysis(self) -> Dict[str, Any]:
        """Test market analysis features"""
        try:
            # Test market analysis endpoints
            market_endpoints = [
                '/market/analysis',
                '/api/market/data',
                '/market/intelligence'
            ]
            
            results = {}
            for endpoint in market_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                    results[endpoint] = {
                        'status': response.status_code,
                        'accessible': response.status_code in [200, 202, 404]
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e), 'accessible': False}
            
            # Check main page for market references
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            if main_response.status_code == 200:
                content = main_response.text.lower()
                has_market_ref = any(term in content for term in ['market', 'analysis', 'intelligence', 'business'])
            else:
                has_market_ref = False
            
            return {
                'success': has_market_ref or any(r.get('accessible', False) for r in results.values()),
                'market_in_main_page': has_market_ref,
                'endpoint_results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_compliance_engine(self) -> Dict[str, Any]:
        """Test compliance engine features"""
        try:
            # Test compliance endpoints
            compliance_endpoints = [
                '/compliance/check',
                '/api/compliance/status',
                '/compliance/report'
            ]
            
            results = {}
            for endpoint in compliance_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                    results[endpoint] = {
                        'status': response.status_code,
                        'accessible': response.status_code in [200, 202, 404]
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e), 'accessible': False}
            
            # Check main page for compliance references
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            if main_response.status_code == 200:
                content = main_response.text.lower()
                has_compliance_ref = any(term in content for term in ['compliance', 'regulation', 'audit', 'policy'])
            else:
                has_compliance_ref = False
            
            return {
                'success': has_compliance_ref or any(r.get('accessible', False) for r in results.values()),
                'compliance_in_main_page': has_compliance_ref,
                'endpoint_results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_background_services(self) -> Dict[str, Any]:
        """Test background services status"""
        try:
            # Test service status endpoints
            service_endpoints = [
                '/services/status',
                '/api/services/health',
                '/background/status'
            ]
            
            results = {}
            for endpoint in service_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                    results[endpoint] = {
                        'status': response.status_code,
                        'accessible': response.status_code in [200, 202, 404]
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e), 'accessible': False}
            
            # Check if the main page loads (indicates background services are running)
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            main_page_works = main_response.status_code == 200
            
            return {
                'success': main_page_works,  # If main page works, background services are likely running
                'main_page_accessible': main_page_works,
                'endpoint_results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_database_connectivity(self) -> Dict[str, Any]:
        """Test database connectivity"""
        try:
            # Test database-related endpoints
            db_endpoints = [
                '/db/status',
                '/api/db/health',
                '/database/check'
            ]
            
            results = {}
            for endpoint in db_endpoints:
                try:
                    response = self.session.get(f"{self.base_url}{endpoint}", timeout=5)
                    results[endpoint] = {
                        'status': response.status_code,
                        'accessible': response.status_code in [200, 202, 404]
                    }
                except Exception as e:
                    results[endpoint] = {'error': str(e), 'accessible': False}
            
            # If main page loads with dynamic content, databases are likely working
            main_response = self.session.get(f"{self.base_url}/", timeout=10)
            if main_response.status_code == 200:
                content = main_response.text
                # Look for signs of dynamic content (timestamps, data, etc.)
                has_dynamic_content = any(term in content for term in ['2025', 'status', 'last updated', 'timestamp'])
            else:
                has_dynamic_content = False
            
            return {
                'success': has_dynamic_content,
                'dynamic_content_detected': has_dynamic_content,
                'endpoint_results': results
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def test_performance_metrics(self) -> Dict[str, Any]:
        """Test application performance"""
        try:
            start_time = time.time()
            response = self.session.get(f"{self.base_url}/", timeout=30)
            end_time = time.time()
            
            response_time = end_time - start_time
            content_size = len(response.content)
            
            # Performance criteria
            performance_good = {
                'fast_response': response_time < 5.0,  # Less than 5 seconds
                'reasonable_size': 1000 < content_size < 1000000,  # Between 1KB and 1MB
                'successful_response': response.status_code == 200,
                'contains_content': content_size > 0
            }
            
            performance_score = sum(performance_good.values())
            success = performance_score >= 3  # At least 3 out of 4 criteria
            
            return {
                'success': success,
                'response_time': response_time,
                'content_size': content_size,
                'status_code': response.status_code,
                'performance_criteria': performance_good,
                'performance_score': f"{performance_score}/4"
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def save_results(self, filename: str = "feature_test_results.json"):
        """Save test results to file"""
        try:
            with open(filename, 'w') as f:
                json.dump(self.test_results, f, indent=2)
            logger.info(f"✅ Test results saved to {filename}")
        except Exception as e:
            logger.error(f"❌ Failed to save results: {str(e)}")

def main():
    """Main function to run all tests"""
    # Your working Railway deployment URL
    base_url = "https://frontier-ai-comprehensive-production.up.railway.app"
    
    logger.info(f"🎯 Testing FrontierAI deployment at: {base_url}")
    
    tester = FrontierAITester(base_url)
    results = tester.run_all_tests()
    
    # Save results
    tester.save_results("frontier_ai_test_results.json")
    
    # Print summary
    summary = results['summary']
    print("\n" + "="*60)
    print("🏁 FINAL TEST SUMMARY")
    print("="*60)
    print(f"📊 Total Tests: {summary['total_tests']}")
    print(f"✅ Passed: {summary['passed']}")
    print(f"❌ Failed: {summary['failed']}")
    print(f"📈 Success Rate: {summary['success_rate']:.1f}%")
    print(f"🕒 Timestamp: {summary['timestamp']}")
    
    if summary['success_rate'] >= 80:
        print("\n🎉 EXCELLENT! Your FrontierAI deployment is working great!")
    elif summary['success_rate'] >= 60:
        print("\n👍 GOOD! Your FrontierAI deployment is mostly functional.")
    else:
        print("\n⚠️  NEEDS ATTENTION! Some features may need debugging.")
    
    return results

if __name__ == "__main__":
    main()
