#!/usr/bin/env python3
"""
Performance Testing Framework for Frontier

This script provides comprehensive performance testing capabilities including
load testing, stress testing, spike testing, and volume testing.
"""

import argparse
import asyncio
import json
import time
import statistics
import sys
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import aiohttp
import requests
from datetime import datetime
import csv


@dataclass
class TestResult:
    """Performance test result"""
    url: str
    method: str
    status_code: int
    response_time: float
    error: Optional[str] = None
    timestamp: datetime = None


@dataclass
class TestSummary:
    """Test summary statistics"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    error_rate: float
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p50_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    duration: float


class PerformanceTester:
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.results: List[TestResult] = []
        
    async def make_request(self, session: aiohttp.ClientSession, 
                          endpoint: str, method: str = 'GET', 
                          data: Dict = None, headers: Dict = None) -> TestResult:
        """Make a single HTTP request"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            if method.upper() == 'GET':
                async with session.get(url, headers=headers, timeout=self.timeout) as response:
                    await response.text()
                    response_time = time.time() - start_time
                    return TestResult(
                        url=url,
                        method=method,
                        status_code=response.status,
                        response_time=response_time,
                        timestamp=datetime.now()
                    )
            elif method.upper() == 'POST':
                async with session.post(url, json=data, headers=headers, timeout=self.timeout) as response:
                    await response.text()
                    response_time = time.time() - start_time
                    return TestResult(
                        url=url,
                        method=method,
                        status_code=response.status,
                        response_time=response_time,
                        timestamp=datetime.now()
                    )
            elif method.upper() == 'PUT':
                async with session.put(url, json=data, headers=headers, timeout=self.timeout) as response:
                    await response.text()
                    response_time = time.time() - start_time
                    return TestResult(
                        url=url,
                        method=method,
                        status_code=response.status,
                        response_time=response_time,
                        timestamp=datetime.now()
                    )
                    
        except Exception as e:
            response_time = time.time() - start_time
            return TestResult(
                url=url,
                method=method,
                status_code=0,
                response_time=response_time,
                error=str(e),
                timestamp=datetime.now()
            )
    
    async def load_test(self, endpoints: List[Dict], concurrent_users: int, 
                       duration: int, ramp_up_time: int = 0) -> TestSummary:
        """Perform load testing"""
        print(f"Starting load test with {concurrent_users} concurrent users for {duration} seconds")
        
        start_time = time.time()
        end_time = start_time + duration
        
        connector = aiohttp.TCPConnector(limit=concurrent_users * 2)
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            tasks = []
            
            # Gradual ramp-up
            if ramp_up_time > 0:
                users_per_second = concurrent_users / ramp_up_time
                for i in range(concurrent_users):
                    delay = i / users_per_second if users_per_second > 0 else 0
                    task = asyncio.create_task(
                        self._user_session(session, endpoints, end_time, delay)
                    )
                    tasks.append(task)
            else:
                for _ in range(concurrent_users):
                    task = asyncio.create_task(
                        self._user_session(session, endpoints, end_time)
                    )
                    tasks.append(task)
            
            # Wait for all tasks to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Flatten results
            all_results = []
            for result_list in results:
                if isinstance(result_list, list):
                    all_results.extend(result_list)
            
            self.results.extend(all_results)
            
        return self._calculate_summary(all_results, time.time() - start_time)
    
    async def _user_session(self, session: aiohttp.ClientSession, 
                           endpoints: List[Dict], end_time: float, 
                           delay: float = 0) -> List[TestResult]:
        """Simulate a user session"""
        if delay > 0:
            await asyncio.sleep(delay)
        
        results = []
        
        while time.time() < end_time:
            for endpoint in endpoints:
                if time.time() >= end_time:
                    break
                
                result = await self.make_request(
                    session,
                    endpoint.get('path', '/'),
                    endpoint.get('method', 'GET'),
                    endpoint.get('data'),
                    endpoint.get('headers')
                )
                results.append(result)
                
                # Think time between requests
                think_time = endpoint.get('think_time', 1)
                await asyncio.sleep(think_time)
        
        return results
    
    async def stress_test(self, endpoints: List[Dict], max_users: int, 
                         step_duration: int, step_size: int = 10) -> List[TestSummary]:
        """Perform stress testing with gradual load increase"""
        print(f"Starting stress test up to {max_users} users")
        
        summaries = []
        current_users = step_size
        
        while current_users <= max_users:
            print(f"Testing with {current_users} concurrent users...")
            
            summary = await self.load_test(
                endpoints, 
                current_users, 
                step_duration,
                ramp_up_time=min(10, step_duration // 2)
            )
            
            summary.concurrent_users = current_users
            summaries.append(summary)
            
            # Check if system is breaking down
            if summary.error_rate > 50 or summary.avg_response_time > 10:
                print(f"System breakdown detected at {current_users} users")
                break
            
            current_users += step_size
            
            # Cool down period
            await asyncio.sleep(5)
        
        return summaries
    
    async def spike_test(self, endpoints: List[Dict], normal_users: int, 
                        spike_users: int, spike_duration: int, 
                        total_duration: int) -> TestSummary:
        """Perform spike testing"""
        print(f"Starting spike test: {normal_users} -> {spike_users} users")
        
        start_time = time.time()
        
        # Normal load phase
        normal_end_time = start_time + (total_duration - spike_duration) / 2
        spike_end_time = normal_end_time + spike_duration
        final_end_time = start_time + total_duration
        
        connector = aiohttp.TCPConnector(limit=spike_users * 2)
        timeout = aiohttp.ClientTimeout(total=self.timeout)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # Start normal load
            normal_tasks = []
            for _ in range(normal_users):
                task = asyncio.create_task(
                    self._user_session(session, endpoints, final_end_time)
                )
                normal_tasks.append(task)
            
            # Wait for spike time
            await asyncio.sleep((total_duration - spike_duration) / 2)
            
            # Add spike load
            spike_tasks = []
            for _ in range(spike_users - normal_users):
                task = asyncio.create_task(
                    self._user_session(session, endpoints, spike_end_time)
                )
                spike_tasks.append(task)
            
            # Wait for all tasks
            all_tasks = normal_tasks + spike_tasks
            results = await asyncio.gather(*all_tasks, return_exceptions=True)
            
            # Flatten results
            all_results = []
            for result_list in results:
                if isinstance(result_list, list):
                    all_results.extend(result_list)
            
            self.results.extend(all_results)
        
        return self._calculate_summary(all_results, time.time() - start_time)
    
    def volume_test(self, endpoint: str, data_sizes: List[int], 
                   concurrent_users: int = 10) -> List[TestSummary]:
        """Test with varying data volumes"""
        print("Starting volume test with different data sizes")
        
        summaries = []
        
        for size in data_sizes:
            print(f"Testing with data size: {size} bytes")
            
            # Create test data
            test_data = {'data': 'x' * size}
            
            endpoints = [{
                'path': endpoint,
                'method': 'POST',
                'data': test_data,
                'think_time': 0.5
            }]
            
            # Run load test
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            summary = loop.run_until_complete(
                self.load_test(endpoints, concurrent_users, 60)
            )
            
            summary.data_size = size
            summaries.append(summary)
            
            loop.close()
        
        return summaries
    
    def _calculate_summary(self, results: List[TestResult], duration: float) -> TestSummary:
        """Calculate test summary statistics"""
        if not results:
            return TestSummary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, duration)
        
        successful_results = [r for r in results if r.error is None and 200 <= r.status_code < 400]
        failed_results = [r for r in results if r.error is not None or r.status_code >= 400]
        
        response_times = [r.response_time for r in successful_results]
        
        if not response_times:
            response_times = [0]
        
        return TestSummary(
            total_requests=len(results),
            successful_requests=len(successful_results),
            failed_requests=len(failed_results),
            error_rate=(len(failed_results) / len(results)) * 100,
            avg_response_time=statistics.mean(response_times),
            min_response_time=min(response_times),
            max_response_time=max(response_times),
            p50_response_time=statistics.median(response_times),
            p95_response_time=self._percentile(response_times, 95),
            p99_response_time=self._percentile(response_times, 99),
            requests_per_second=len(successful_results) / duration if duration > 0 else 0,
            duration=duration
        )
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        if not data:
            return 0
        
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def save_results(self, filename: str, format: str = 'json'):
        """Save test results to file"""
        if format.lower() == 'json':
            data = []
            for result in self.results:
                data.append({
                    'url': result.url,
                    'method': result.method,
                    'status_code': result.status_code,
                    'response_time': result.response_time,
                    'error': result.error,
                    'timestamp': result.timestamp.isoformat() if result.timestamp else None
                })
            
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
                
        elif format.lower() == 'csv':
            with open(filename, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['URL', 'Method', 'Status Code', 'Response Time', 'Error', 'Timestamp'])
                
                for result in self.results:
                    writer.writerow([
                        result.url,
                        result.method,
                        result.status_code,
                        result.response_time,
                        result.error or '',
                        result.timestamp.isoformat() if result.timestamp else ''
                    ])
        
        print(f"Results saved to {filename}")
    
    def print_summary(self, summary: TestSummary):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("PERFORMANCE TEST SUMMARY")
        print("=" * 60)
        print(f"Duration: {summary.duration:.2f} seconds")
        print(f"Total Requests: {summary.total_requests}")
        print(f"Successful Requests: {summary.successful_requests}")
        print(f"Failed Requests: {summary.failed_requests}")
        print(f"Error Rate: {summary.error_rate:.2f}%")
        print(f"Requests/Second: {summary.requests_per_second:.2f}")
        print("\nResponse Times (seconds):")
        print(f"  Average: {summary.avg_response_time:.3f}")
        print(f"  Minimum: {summary.min_response_time:.3f}")
        print(f"  Maximum: {summary.max_response_time:.3f}")
        print(f"  50th percentile: {summary.p50_response_time:.3f}")
        print(f"  95th percentile: {summary.p95_response_time:.3f}")
        print(f"  99th percentile: {summary.p99_response_time:.3f}")
        print("=" * 60)


def get_frontier_endpoints() -> List[Dict]:
    """Get default Frontier API endpoints for testing"""
    return [
        {
            'path': '/health',
            'method': 'GET',
            'think_time': 0.1
        },
        {
            'path': '/api/v1/status',
            'method': 'GET',
            'think_time': 0.5
        },
        {
            'path': '/api/v1/users',
            'method': 'GET',
            'headers': {'Authorization': 'Bearer test-token'},
            'think_time': 1.0
        },
        {
            'path': '/api/v1/data',
            'method': 'POST',
            'data': {'query': 'test query', 'limit': 10},
            'headers': {'Authorization': 'Bearer test-token'},
            'think_time': 2.0
        }
    ]


async def main():
    parser = argparse.ArgumentParser(description="Performance Testing for Frontier")
    parser.add_argument("--base-url", required=True, help="Base URL for testing")
    parser.add_argument("--test-type", choices=['load', 'stress', 'spike', 'volume'], 
                       default='load', help="Type of performance test")
    parser.add_argument("--concurrent-users", type=int, default=10, 
                       help="Number of concurrent users")
    parser.add_argument("--duration", type=int, default=60, 
                       help="Test duration in seconds")
    parser.add_argument("--ramp-up", type=int, default=0, 
                       help="Ramp-up time in seconds")
    parser.add_argument("--max-users", type=int, default=100, 
                       help="Maximum users for stress test")
    parser.add_argument("--spike-users", type=int, default=50, 
                       help="Peak users for spike test")
    parser.add_argument("--spike-duration", type=int, default=30, 
                       help="Duration of spike in seconds")
    parser.add_argument("--output", help="Output file for results")
    parser.add_argument("--format", choices=['json', 'csv'], default='json', 
                       help="Output format")
    parser.add_argument("--timeout", type=int, default=30, 
                       help="Request timeout in seconds")
    
    args = parser.parse_args()
    
    tester = PerformanceTester(args.base_url, args.timeout)
    endpoints = get_frontier_endpoints()
    
    try:
        if args.test_type == 'load':
            summary = await tester.load_test(
                endpoints, 
                args.concurrent_users, 
                args.duration, 
                args.ramp_up
            )
            tester.print_summary(summary)
            
        elif args.test_type == 'stress':
            summaries = await tester.stress_test(
                endpoints, 
                args.max_users, 
                args.duration
            )
            
            print("\nSTRESS TEST RESULTS:")
            for summary in summaries:
                print(f"\n{summary.concurrent_users} users:")
                print(f"  Error Rate: {summary.error_rate:.2f}%")
                print(f"  Avg Response Time: {summary.avg_response_time:.3f}s")
                print(f"  Requests/Second: {summary.requests_per_second:.2f}")
            
        elif args.test_type == 'spike':
            summary = await tester.spike_test(
                endpoints,
                args.concurrent_users,
                args.spike_users,
                args.spike_duration,
                args.duration
            )
            tester.print_summary(summary)
            
        elif args.test_type == 'volume':
            data_sizes = [1024, 10240, 102400, 1048576]  # 1KB, 10KB, 100KB, 1MB
            summaries = tester.volume_test('/api/v1/upload', data_sizes)
            
            print("\nVOLUME TEST RESULTS:")
            for summary in summaries:
                print(f"\nData size: {summary.data_size} bytes")
                print(f"  Error Rate: {summary.error_rate:.2f}%")
                print(f"  Avg Response Time: {summary.avg_response_time:.3f}s")
                print(f"  Requests/Second: {summary.requests_per_second:.2f}")
        
        # Save results if output file specified
        if args.output:
            tester.save_results(args.output, args.format)
        
        # Check if performance goals are met
        if args.test_type in ['load', 'spike']:
            if hasattr(locals(), 'summary'):
                if summary.error_rate > 5:
                    print(f"\nWARNING: Error rate ({summary.error_rate:.2f}%) exceeds 5%")
                    sys.exit(1)
                
                if summary.avg_response_time > 2:
                    print(f"\nWARNING: Average response time ({summary.avg_response_time:.3f}s) exceeds 2s")
                    sys.exit(1)
                
                if summary.p95_response_time > 5:
                    print(f"\nWARNING: 95th percentile response time ({summary.p95_response_time:.3f}s) exceeds 5s")
                    sys.exit(1)
        
        print("\nPerformance test completed successfully!")
        
    except Exception as e:
        print(f"Performance test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
