#!/usr/bin/env python3
"""
REAL FrontierAI Feature Testing Script
Tests actual functionality, not just HTML keywords
This will expose what's actually working vs what's fake
"""

import requests
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any
import subprocess
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RealFrontierAITester:
    """REAL tester that checks actual functionality"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'FrontierAI-RealTester/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        self.real_results = {}
        
    def run_real_tests(self) -> Dict[str, Any]:
        """Run actual functionality tests"""
        logger.info("🔍 REAL FUNCTIONALITY TESTING - No More BS!")
        logger.info("=" * 60)
        
        tests = [
            ("API Response Validation", self.test_api_responses),
            ("Code Analysis Functionality", self.test_code_analysis_real),
            ("GitHub Integration Reality", self.test_github_integration_real),
            ("Database Operations", self.test_database_functionality),
            ("Evolution System Reality", self.test_evolution_system_real),
            ("Market Analysis Truth", self.test_market_analysis_real),
            ("System Health Real Check", self.test_system_health_real),
            ("Background Services Truth", self.test_background_services_real),
        ]
        
        passed = 0
        failed = 0
        total_time = time.time()
        
        for test_name, test_func in tests:
            logger.info(f"🧪 REAL TEST: {test_name}")
            try:
                start_time = time.time()
                result = test_func()
                end_time = time.time()
                
                result['duration'] = end_time - start_time
                self.real_results[test_name] = result
                
                if result.get('real_functionality', False):
                    logger.info(f"✅ {test_name}: ACTUALLY WORKS")
                    passed += 1
                else:
                    logger.info(f"❌ {test_name}: FAKE/BROKEN - {result.get('reason', 'No real functionality')}")
                    failed += 1
                    
            except Exception as e:
                logger.error(f"💥 {test_name}: CRASHED - {str(e)}")
                self.real_results[test_name] = {
                    'real_functionality': False,
                    'reason': f"Test crashed: {str(e)}",
                    'error': str(e)
                }
                failed += 1
                
            time.sleep(1)  # Don't hammer the server
            
        total_time = time.time() - total_time
        
        # Generate real results
        summary = {
            'timestamp': datetime.now().isoformat(),
            'total_tests': len(tests),
            'actually_working': passed,
            'fake_or_broken': failed,
            'reality_score': round((passed / len(tests)) * 100, 1),
            'total_duration': round(total_time, 2),
            'detailed_results': self.real_results
        }
        
        # Save results
        with open('real_frontier_ai_test_results.json', 'w') as f:
            json.dump(summary, f, indent=2)
            
        logger.info("=" * 60)
        logger.info("🎯 REAL RESULTS SUMMARY")
        logger.info("=" * 60)
        logger.info(f"📊 Total Tests: {len(tests)}")
        logger.info(f"✅ Actually Working: {passed}")
        logger.info(f"❌ Fake/Broken: {failed}")
        logger.info(f"📈 Reality Score: {summary['reality_score']}%")
        logger.info(f"⏱️ Total Time: {summary['total_duration']}s")
        
        if summary['reality_score'] < 50:
            logger.info("🚨 MAJORITY OF FEATURES ARE FAKE!")
        elif summary['reality_score'] < 80:
            logger.info("⚠️ Many features are not really working")
        else:
            logger.info("🎉 Most features are actually functional!")
            
        return summary
    
    def test_api_responses(self) -> Dict[str, Any]:
        """Test if APIs return actual data vs HTML"""
        apis_to_test = [
            '/api/metrics',
            '/api/evolution-log', 
            '/health',
            '/api/businesses',
            '/api/code-analysis-results',
            '/api/github-analysis',
            '/market/analysis',
            '/api/market/data'
        ]
        
        real_apis = 0
        fake_apis = 0
        api_results = {}
        
        for api in apis_to_test:
            try:
                response = self.session.get(f"{self.base_url}{api}", timeout=10)
                content = response.text
                
                # Check if it's returning HTML (fake) or JSON (potentially real)
                is_html = content.strip().startswith('<!DOCTYPE html') or '<html' in content[:100]
                is_json = False
                
                if not is_html:
                    try:
                        json.loads(content)
                        is_json = True
                    except:
                        pass
                
                if is_json and response.status_code == 200:
                    real_apis += 1
                    api_results[api] = {'status': 'REAL', 'code': response.status_code}
                elif response.status_code == 404:
                    fake_apis += 1
                    api_results[api] = {'status': 'NOT_IMPLEMENTED', 'code': 404}
                else:
                    fake_apis += 1
                    api_results[api] = {'status': 'RETURNS_HTML', 'code': response.status_code}
                    
            except Exception as e:
                fake_apis += 1
                api_results[api] = {'status': 'ERROR', 'error': str(e)}
        
        return {
            'real_functionality': real_apis > fake_apis,
            'real_apis': real_apis,
            'fake_apis': fake_apis,
            'details': api_results,
            'reason': f"Only {real_apis}/{len(apis_to_test)} APIs actually work"
        }
    
    def test_code_analysis_real(self) -> Dict[str, Any]:
        """Test if code analysis actually analyzes code"""
        try:
            # Try to run code analysis on a real repository
            test_payload = {
                'repo': 'octocat/Hello-World',
                'github_token': ''
            }
            
            response = self.session.post(
                f"{self.base_url}/api/github-analysis",
                json=test_payload,
                timeout=30
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Check if it contains actual analysis data
                    if isinstance(data, dict) and any(key in data for key in ['analysis', 'results', 'files_analyzed', 'issues']):
                        return {
                            'real_functionality': True,
                            'reason': 'Returns real analysis data'
                        }
                except:
                    pass
            
            # Check if the response is just HTML
            if '<!DOCTYPE html' in response.text:
                return {
                    'real_functionality': False,
                    'reason': 'Returns HTML instead of analysis results'
                }
            
            return {
                'real_functionality': False,
                'reason': f'No real analysis functionality - status {response.status_code}'
            }
            
        except Exception as e:
            return {
                'real_functionality': False,
                'reason': f'Code analysis failed: {str(e)}'
            }
    
    def test_github_integration_real(self) -> Dict[str, Any]:
        """Test if GitHub integration actually works"""
        try:
            # Test GitHub API calls
            response = self.session.get(f"{self.base_url}/api/code-analysis-results", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Check if it has real GitHub data
                    if isinstance(data, dict) and 'github' in str(data).lower():
                        return {
                            'real_functionality': True,
                            'reason': 'Contains GitHub integration data'
                        }
                except:
                    pass
            
            return {
                'real_functionality': False,
                'reason': 'No real GitHub integration detected'
            }
            
        except Exception as e:
            return {
                'real_functionality': False,
                'reason': f'GitHub integration test failed: {str(e)}'
            }
    
    def test_database_functionality(self) -> Dict[str, Any]:
        """Test if database operations actually work"""
        try:
            # Try to create a business record
            test_business = {
                'name': f'Test Business {int(time.time())}',
                'industry': 'Testing'
            }
            
            response = self.session.post(
                f"{self.base_url}/api/businesses",
                json=test_business,
                timeout=10
            )
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('success'):
                        return {
                            'real_functionality': True,
                            'reason': 'Database operations work'
                        }
                except:
                    pass
            
            return {
                'real_functionality': False,
                'reason': 'Database operations not working'
            }
            
        except Exception as e:
            return {
                'real_functionality': False,
                'reason': f'Database test failed: {str(e)}'
            }
    
    def test_evolution_system_real(self) -> Dict[str, Any]:
        """Test if evolution system actually evolves anything"""
        try:
            response = self.session.get(f"{self.base_url}/api/evolution-log", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Check if there are actual evolution records
                    if isinstance(data, (list, dict)) and data:
                        return {
                            'real_functionality': True,
                            'reason': 'Evolution system has activity'
                        }
                except:
                    pass
            
            return {
                'real_functionality': False,
                'reason': 'No real evolution activity detected'
            }
            
        except Exception as e:
            return {
                'real_functionality': False,
                'reason': f'Evolution system test failed: {str(e)}'
            }
    
    def test_market_analysis_real(self) -> Dict[str, Any]:
        """Test if market analysis produces real insights"""
        try:
            # Check for actual market analysis data
            endpoints = ['/api/metrics', '/api/evolution-log']
            
            for endpoint in endpoints:
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Look for market-related data
                        if any(term in str(data).lower() for term in ['competitor', 'market', 'analysis', 'intelligence']):
                            return {
                                'real_functionality': True,
                                'reason': 'Found market analysis data'
                            }
                    except:
                        continue
            
            return {
                'real_functionality': False,
                'reason': 'No real market analysis data found'
            }
            
        except Exception as e:
            return {
                'real_functionality': False,
                'reason': f'Market analysis test failed: {str(e)}'
            }
    
    def test_system_health_real(self) -> Dict[str, Any]:
        """Test if system health monitoring is real"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Check if it has real health metrics
                    if isinstance(data, dict) and any(key in data for key in ['status', 'uptime', 'cpu', 'memory']):
                        return {
                            'real_functionality': True,
                            'reason': 'Real health metrics detected'
                        }
                except:
                    pass
            
            return {
                'real_functionality': False,
                'reason': 'No real health monitoring detected'
            }
            
        except Exception as e:
            return {
                'real_functionality': False,
                'reason': f'Health monitoring test failed: {str(e)}'
            }
    
    def test_background_services_real(self) -> Dict[str, Any]:
        """Test if background services are actually running"""
        try:
            # Check metrics over time to see if background services are updating data
            response1 = self.session.get(f"{self.base_url}/api/metrics", timeout=10)
            time.sleep(2)
            response2 = self.session.get(f"{self.base_url}/api/metrics", timeout=10)
            
            if response1.status_code == 200 and response2.status_code == 200:
                try:
                    data1 = response1.json()
                    data2 = response2.json()
                    
                    # Check if any metrics changed (indicating background activity)
                    if data1 != data2:
                        return {
                            'real_functionality': True,
                            'reason': 'Background services are updating metrics'
                        }
                except:
                    pass
            
            return {
                'real_functionality': False,
                'reason': 'No background service activity detected'
            }
            
        except Exception as e:
            return {
                'real_functionality': False,
                'reason': f'Background services test failed: {str(e)}'
            }

if __name__ == "__main__":
    url = "https://frontier-ai-comprehensive-production.up.railway.app"
    
    print("🔍 STARTING REAL FUNCTIONALITY TEST")
    print("🚨 This will expose what's actually working vs what's fake!")
    print()
    
    tester = RealFrontierAITester(url)
    results = tester.run_real_tests()
    
    print()
    print("📋 DETAILED FINDINGS:")
    for test_name, result in results['detailed_results'].items():
        status = "✅ REAL" if result.get('real_functionality') else "❌ FAKE"
        print(f"  {status} {test_name}: {result.get('reason', 'Unknown')}")
