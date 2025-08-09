"""
FrontierAI GitHub Repository Analyzer
Analyzes GitHub repositories for code quality, security, and improvement opportunities
"""

import requests
import json
import logging
import os
import tempfile
import subprocess
from typing import Dict, List, Any, Optional
from datetime import datetime
import re
import ast

logger = logging.getLogger(__name__)

class GitHubAnalyzer:
    """
    Analyzes GitHub repositories for code quality and improvement opportunities
    """
    
    def __init__(self, db_manager):
        """
        Initialize GitHub analyzer
        
        Args:
            db_manager: Database manager for storing results
        """
        self.db = db_manager
        self.github_token = os.environ.get('GITHUB_TOKEN')
        self.headers = {
            "User-Agent": "FrontierAI-Analyzer/1.0",
            "Accept": "application/vnd.github.v3+json"
        }
        
        if self.github_token:
            self.headers["Authorization"] = f"token {self.github_token}"
        
        logger.info("GitHub Analyzer initialized")
    
    def analyze_repository(self, repo_url: str) -> Dict:
        """
        Analyze a GitHub repository
        
        Args:
            repo_url: GitHub repository URL or owner/repo format
            
        Returns:
            Analysis results dictionary
        """
        try:
            # Parse repository information
            repo_info = self._parse_repo_url(repo_url)
            if not repo_info:
                return {"error": "Invalid repository URL format"}
            
            logger.info(f"Analyzing repository: {repo_info['owner']}/{repo_info['name']}")
            
            # Gather repository data
            repo_data = self._fetch_repository_data(repo_info)
            if not repo_data:
                return {"error": "Failed to fetch repository data"}
            
            # Analyze repository contents
            analysis_results = self._analyze_repository_contents(repo_info, repo_data)
            
            # Store results in database
            self.db.store_analysis_result(
                repository=f"{repo_info['owner']}/{repo_info['name']}",
                analysis_data=analysis_results
            )
            
            logger.info(f"Analysis completed for {repo_info['owner']}/{repo_info['name']}")
            return analysis_results
            
        except Exception as e:
            logger.error(f"Repository analysis failed: {e}")
            return {"error": str(e)}
    
    def _parse_repo_url(self, repo_url: str) -> Optional[Dict]:
        """
        Parse repository URL to extract owner and name
        
        Args:
            repo_url: Repository URL or owner/repo format
            
        Returns:
            Dictionary with owner and name, or None if invalid
        """
        # Handle owner/repo format
        if '/' in repo_url and not repo_url.startswith('http'):
            parts = repo_url.split('/')
            if len(parts) == 2:
                return {"owner": parts[0], "name": parts[1]}
        
        # Handle full GitHub URLs
        patterns = [
            r'github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$',
            r'github\.com/([^/]+)/([^/]+)/.*'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, repo_url)
            if match:
                return {"owner": match.group(1), "name": match.group(2)}
        
        return None
    
    def _fetch_repository_data(self, repo_info: Dict) -> Optional[Dict]:
        """
        Fetch repository data from GitHub API
        
        Args:
            repo_info: Dictionary with owner and name
            
        Returns:
            Repository data dictionary or None if failed
        """
        try:
            # Get basic repository information
            repo_url = f"https://api.github.com/repos/{repo_info['owner']}/{repo_info['name']}"
            response = requests.get(repo_url, headers=self.headers, timeout=30)
            
            if response.status_code == 404:
                return {"error": "Repository not found"}
            elif response.status_code != 200:
                return {"error": f"GitHub API error: {response.status_code}"}
            
            repo_data = response.json()
            
            # Get additional data
            repo_data['languages'] = self._fetch_languages(repo_info)
            repo_data['contributors'] = self._fetch_contributors(repo_info)
            repo_data['commits'] = self._fetch_recent_commits(repo_info)
            repo_data['issues'] = self._fetch_issues_summary(repo_info)
            
            return repo_data
            
        except Exception as e:
            logger.error(f"Failed to fetch repository data: {e}")
            return None
    
    def _fetch_languages(self, repo_info: Dict) -> Dict:
        """Fetch repository languages"""
        try:
            url = f"https://api.github.com/repos/{repo_info['owner']}/{repo_info['name']}/languages"
            response = requests.get(url, headers=self.headers, timeout=10)
            return response.json() if response.status_code == 200 else {}
        except:
            return {}
    
    def _fetch_contributors(self, repo_info: Dict) -> List[Dict]:
        """Fetch repository contributors"""
        try:
            url = f"https://api.github.com/repos/{repo_info['owner']}/{repo_info['name']}/contributors"
            response = requests.get(url, headers=self.headers, timeout=10, params={"per_page": 10})
            return response.json() if response.status_code == 200 else []
        except:
            return []
    
    def _fetch_recent_commits(self, repo_info: Dict) -> List[Dict]:
        """Fetch recent commits"""
        try:
            url = f"https://api.github.com/repos/{repo_info['owner']}/{repo_info['name']}/commits"
            response = requests.get(url, headers=self.headers, timeout=10, params={"per_page": 20})
            return response.json() if response.status_code == 200 else []
        except:
            return []
    
    def _fetch_issues_summary(self, repo_info: Dict) -> Dict:
        """Fetch issues summary"""
        try:
            url = f"https://api.github.com/repos/{repo_info['owner']}/{repo_info['name']}/issues"
            response = requests.get(url, headers=self.headers, timeout=10, params={"state": "all", "per_page": 100})
            
            if response.status_code == 200:
                issues = response.json()
                open_issues = len([i for i in issues if i['state'] == 'open'])
                closed_issues = len([i for i in issues if i['state'] == 'closed'])
                
                return {
                    "total": len(issues),
                    "open": open_issues,
                    "closed": closed_issues
                }
            
            return {"total": 0, "open": 0, "closed": 0}
        except:
            return {"total": 0, "open": 0, "closed": 0}
    
    def _analyze_repository_contents(self, repo_info: Dict, repo_data: Dict) -> Dict:
        """
        Analyze repository contents and generate insights
        
        Args:
            repo_info: Repository owner/name info
            repo_data: Repository data from GitHub API
            
        Returns:
            Comprehensive analysis results
        """
        analysis = {
            "repository": f"{repo_info['owner']}/{repo_info['name']}",
            "analyzed_at": datetime.now().isoformat(),
            "github_url": repo_data.get('html_url', ''),
            "basic_info": self._extract_basic_info(repo_data),
            "languages": repo_data.get('languages', {}),
            "activity_metrics": self._analyze_activity(repo_data),
            "code_quality": self._assess_code_quality(repo_data),
            "security_assessment": self._assess_security(repo_data),
            "maintainability": self._assess_maintainability(repo_data),
            "recommendations": []
        }
        
        # Generate specific recommendations
        analysis["recommendations"] = self._generate_recommendations(analysis)
        
        # Calculate overall scores
        analysis["scores"] = self._calculate_scores(analysis)
        
        # Add summary statistics
        analysis.update({
            "files_analyzed": self._estimate_file_count(repo_data),
            "issues_found": len(self._identify_potential_issues(analysis)),
            "opportunities": len(analysis["recommendations"]),
            "security_score": analysis["scores"]["security"],
            "complexity_score": analysis["scores"]["complexity"],
            "maintainability_score": analysis["scores"]["maintainability"]
        })
        
        return analysis
    
    def _extract_basic_info(self, repo_data: Dict) -> Dict:
        """Extract basic repository information"""
        return {
            "name": repo_data.get('name', ''),
            "description": repo_data.get('description', ''),
            "stars": repo_data.get('stargazers_count', 0),
            "forks": repo_data.get('forks_count', 0),
            "watchers": repo_data.get('watchers_count', 0),
            "size": repo_data.get('size', 0),
            "created_at": repo_data.get('created_at', ''),
            "updated_at": repo_data.get('updated_at', ''),
            "default_branch": repo_data.get('default_branch', 'main'),
            "topics": repo_data.get('topics', []),
            "license": repo_data.get('license', {}).get('name', 'None') if repo_data.get('license') else 'None'
        }
    
    def _analyze_activity(self, repo_data: Dict) -> Dict:
        """Analyze repository activity metrics"""
        commits = repo_data.get('commits', [])
        contributors = repo_data.get('contributors', [])
        issues = repo_data.get('issues', {})
        
        # Calculate activity scores
        commit_frequency = len(commits) / max(1, 30)  # Commits per day (last 30 commits)
        contributor_count = len(contributors)
        issue_resolution_rate = issues.get('closed', 0) / max(1, issues.get('total', 1))
        
        return {
            "commit_frequency": commit_frequency,
            "contributor_count": contributor_count,
            "issue_resolution_rate": issue_resolution_rate,
            "recent_commits": len(commits),
            "active_contributors": len([c for c in contributors if c.get('contributions', 0) > 1]),
            "activity_score": min((commit_frequency + contributor_count * 0.1 + issue_resolution_rate) / 3, 1.0)
        }
    
    def _assess_code_quality(self, repo_data: Dict) -> Dict:
        """Assess code quality based on available metrics"""
        languages = repo_data.get('languages', {})
        
        # Calculate language distribution
        total_bytes = sum(languages.values()) if languages else 1
        language_dist = {lang: bytes_count/total_bytes for lang, bytes_count in languages.items()}
        
        # Assess based on languages and patterns
        quality_indicators = {
            "has_documentation": self._check_documentation_presence(repo_data),
            "has_tests": self._check_test_presence(languages),
            "language_diversity": len(languages),
            "primary_language": max(languages.items(), key=lambda x: x[1])[0] if languages else "Unknown",
            "modern_languages": self._assess_modern_languages(languages)
        }
        
        # Calculate quality score
        quality_score = 0.0
        if quality_indicators["has_documentation"]: quality_score += 0.3
        if quality_indicators["has_tests"]: quality_score += 0.3
        if quality_indicators["modern_languages"]: quality_score += 0.2
        if quality_indicators["language_diversity"] > 1: quality_score += 0.1
        quality_score += min(quality_indicators["language_diversity"] * 0.05, 0.1)
        
        return {
            "indicators": quality_indicators,
            "language_distribution": language_dist,
            "quality_score": min(quality_score, 1.0)
        }
    
    def _assess_security(self, repo_data: Dict) -> Dict:
        """Assess security aspects of the repository"""
        security_features = {
            "has_security_policy": False,  # Would check for SECURITY.md
            "dependency_management": self._check_dependency_management(repo_data.get('languages', {})),
            "branch_protection": repo_data.get('default_branch', '') != '',
            "license_present": repo_data.get('license') is not None,
            "secrets_detection": True  # Assume modern repos have this
        }
        
        # Calculate security score
        security_score = sum(security_features.values()) / len(security_features)
        
        return {
            "features": security_features,
            "security_score": security_score,
            "risk_level": "Low" if security_score > 0.7 else "Medium" if security_score > 0.4 else "High"
        }
    
    def _assess_maintainability(self, repo_data: Dict) -> Dict:
        """Assess repository maintainability"""
        factors = {
            "recent_activity": len(repo_data.get('commits', [])) > 5,
            "multiple_contributors": len(repo_data.get('contributors', [])) > 1,
            "issue_management": repo_data.get('issues', {}).get('total', 0) > 0,
            "documentation_quality": self._check_documentation_presence(repo_data),
            "size_manageable": repo_data.get('size', 0) < 100000  # Less than 100MB
        }
        
        maintainability_score = sum(factors.values()) / len(factors)
        
        return {
            "factors": factors,
            "maintainability_score": maintainability_score,
            "maintenance_level": "High" if maintainability_score > 0.7 else "Medium" if maintainability_score > 0.4 else "Low"
        }
    
    def _generate_recommendations(self, analysis: Dict) -> List[str]:
        """Generate specific recommendations based on analysis"""
        recommendations = []
        
        # Code quality recommendations
        if not analysis["code_quality"]["indicators"]["has_documentation"]:
            recommendations.append("Add comprehensive documentation (README, API docs)")
        
        if not analysis["code_quality"]["indicators"]["has_tests"]:
            recommendations.append("Implement unit tests and CI/CD pipeline")
        
        # Security recommendations
        security_score = analysis["security_assessment"]["security_score"]
        if security_score < 0.7:
            recommendations.append("Improve security practices (dependency scanning, branch protection)")
        
        if not analysis["security_assessment"]["features"]["license_present"]:
            recommendations.append("Add an appropriate license to the repository")
        
        # Activity recommendations
        activity_score = analysis["activity_metrics"]["activity_score"]
        if activity_score < 0.3:
            recommendations.append("Increase development activity and contributor engagement")
        
        if analysis["activity_metrics"]["contributor_count"] < 2:
            recommendations.append("Encourage contributions and expand the contributor base")
        
        # Maintainability recommendations
        if analysis["maintainability"]["maintainability_score"] < 0.5:
            recommendations.append("Improve code organization and maintainability practices")
        
        return recommendations
    
    def _calculate_scores(self, analysis: Dict) -> Dict:
        """Calculate overall scores"""
        return {
            "security": analysis["security_assessment"]["security_score"] * 10,
            "complexity": (1 - analysis["code_quality"]["quality_score"]) * 10,  # Lower is better
            "maintainability": analysis["maintainability"]["maintainability_score"] * 10,
            "overall": (
                analysis["security_assessment"]["security_score"] + 
                analysis["code_quality"]["quality_score"] + 
                analysis["maintainability"]["maintainability_score"]
            ) / 3 * 10
        }
    
    def _identify_potential_issues(self, analysis: Dict) -> List[str]:
        """Identify potential issues from analysis"""
        issues = []
        
        if analysis["security_assessment"]["security_score"] < 0.5:
            issues.append("Low security score")
        
        if analysis["code_quality"]["quality_score"] < 0.4:
            issues.append("Code quality concerns")
        
        if analysis["activity_metrics"]["activity_score"] < 0.2:
            issues.append("Low repository activity")
        
        if not analysis["basic_info"]["license"]:
            issues.append("Missing license")
        
        return issues
    
    # Helper methods
    def _check_documentation_presence(self, repo_data: Dict) -> bool:
        """Check if repository has documentation"""
        # In a real implementation, this would check for README, docs folder, etc.
        return repo_data.get('size', 0) > 100  # Assume larger repos have docs
    
    def _check_test_presence(self, languages: Dict) -> bool:
        """Check if repository likely has tests"""
        # Simple heuristic based on language presence
        test_indicators = ['Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust']
        return any(lang in test_indicators for lang in languages.keys())
    
    def _assess_modern_languages(self, languages: Dict) -> bool:
        """Assess if repository uses modern programming languages"""
        modern_langs = ['Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Swift', 'Kotlin']
        return any(lang in modern_langs for lang in languages.keys())
    
    def _check_dependency_management(self, languages: Dict) -> bool:
        """Check if repository has dependency management"""
        # In real implementation, would check for package.json, requirements.txt, etc.
        return len(languages) > 0  # Simple heuristic
    
    def _estimate_file_count(self, repo_data: Dict) -> int:
        """Estimate number of files based on repository size"""
        size_kb = repo_data.get('size', 0)
        # Rough estimate: 1 file per 5KB on average
        return max(1, size_kb // 5)
