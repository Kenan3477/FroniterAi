class RailwayEnvironmentAdapter:
    """Adapter for Railway environment-specific configurations"""
    
    @staticmethod
    def is_railway_environment():
        """Check if running in Railway environment"""
        return os.environ.get('RAILWAY_ENVIRONMENT') is not None
    
    @staticmethod
    def get_repo_path():
        """Get repository path in Railway environment"""
        # In Railway, code is deployed to /app
        if RailwayEnvironmentAdapter.is_railway_environment():
            return "/app"
        # For local development
        return os.path.dirname(os.path.abspath(__file__))
    
    @staticmethod
    def setup_analysis_dir():
        """Set up directory for analysis results"""
        if RailwayEnvironmentAdapter.is_railway_environment():
            # In Railway, use a directory that persists between runs
            base_dir = "/tmp/frontier_analysis"
        else:
            base_dir = "analysis"
            
        os.makedirs(base_dir, exist_ok=True)
        return base_dir
        
    @staticmethod
    def get_github_token():
        """Get GitHub token from environment variables"""
        return os.environ.get('GITHUB_TOKEN')

"""
FrontierAI - Code Analysis Module
Scans Python code to identify improvement opportunities and suggest optimizations
RAILWAY DEPLOYMENT READY VERSION
"""

import ast
import os
import re
import json
import logging
import threading
import time
import sys
import requests
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
import tempfile
from git import Repo
import shutil

# Configure logging
logger = logging.getLogger(__name__)

class CodeAnalyzer:
    """Analyzes Python code to identify improvement opportunities."""
    
    def __init__(self, repo_path: str, github_repo: str = None, github_token: str = None):
        self.repo_path = repo_path
        self.analyzed_files = {}
        self.total_issues = 0
        self.total_opportunities = 0
        self.total_lines = 0
        self.scan_timestamp = None
        self.github_repo = github_repo  # Format: "username/repo"
        self.github_token = github_token or os.environ.get('GITHUB_TOKEN')
        self.is_railway = os.environ.get('RAILWAY_ENVIRONMENT') == 'production'
    
    def clone_github_repo(self, target_dir=None, branch="main"):
        """Clone a GitHub repository to analyze its code"""
        if not self.github_repo:
            raise ValueError("GitHub repository not specified")
        
        repo_url = f"https://github.com/{self.github_repo}.git"
        if self.github_token:
            # Use token for private repositories
            repo_url = f"https://{self.github_token}@github.com/{self.github_repo}.git"
            
        if target_dir is None:
            target_dir = tempfile.mkdtemp(prefix="frontier_analysis_")
        
        logger.info(f"Cloning repository {self.github_repo} to {target_dir}")
        
        try:
            # Clone the repository
            Repo.clone_from(repo_url, target_dir, branch=branch)
            logger.info(f"Successfully cloned repository to {target_dir}")
            # Update repo path to the cloned directory
            self.repo_path = target_dir
            return target_dir
        except Exception as e:
            logger.error(f"Failed to clone repository: {str(e)}")
            raise
    
    def get_github_repo_info(self):
        """Fetch repository information from GitHub API"""
        if not self.github_repo:
            return None
            
        url = f"https://api.github.com/repos/{self.github_repo}"
        headers = {}
        
        if self.github_token:
            headers["Authorization"] = f"token {self.github_token}"
            
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch GitHub repository info: {str(e)}")
            return None
            
    def get_github_commit_history(self, limit=30):
        """Fetch commit history from GitHub API"""
        if not self.github_repo:
            return []
            
        url = f"https://api.github.com/repos/{self.github_repo}/commits"
        headers = {}
        params = {"per_page": limit}
        
        if self.github_token:
            headers["Authorization"] = f"token {self.github_token}"
            
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch GitHub commit history: {str(e)}")
            return []
    
    def scan_repository(self) -> Dict[str, Dict]:
        """Scan all Python files in the repository."""
        logger.info(f"🔍 Starting repository scan: {self.repo_path}")
        self.scan_timestamp = datetime.now()
        results = {}
        total_files = 0
        ignored_dirs = ['.git', 'venv', 'env', '__pycache__', 'backup_files']
        
        for root, dirs, files in os.walk(self.repo_path):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, self.repo_path)
                    logger.info(f"Analyzing: {rel_path}")
                    
                    try:
                        results[rel_path] = self.analyze_file(file_path)
                        total_files += 1
                        
                        # Update totals
                        self.total_lines += results[rel_path]['loc']
                        self.total_issues += len(results[rel_path]['issues'])
                        self.total_opportunities += len(results[rel_path]['improvement_opportunities'])
                    except Exception as e:
                        logger.error(f"Error analyzing {rel_path}: {str(e)}")
                        results[rel_path] = {
                            'loc': 0,
                            'issues': [f"Failed to analyze: {str(e)}"],
                            'complexity': 0,
                            'missing_docstrings': [],
                            'improvement_opportunities': []
                        }
        
        self.analyzed_files = results
        logger.info(f"✅ Repository scan complete. Analyzed {total_files} files with {self.total_issues} issues and {self.total_opportunities} improvement opportunities.")
        return results
    
    def analyze_file(self, file_path: str) -> Dict:
        """Analyze a single Python file for quality and improvement opportunities."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Try with a different encoding if UTF-8 fails
            with open(file_path, 'r', encoding='latin-1') as f:
                content = f.read()
                
        # Results structure
        analysis = {
            'loc': len(content.splitlines()),
            'issues': [],
            'complexity': self._calculate_complexity(content),
            'missing_docstrings': [],
            'improvement_opportunities': [],
            'file_size': os.path.getsize(file_path),
            'imports': self._extract_imports(content),
            'last_modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
        }
        
        # Check for TODO comments
        todos = re.findall(r'#\s*TODO[:\s]*(.*?)$', content, re.MULTILINE)
        for todo in todos:
            analysis['improvement_opportunities'].append({
                'type': 'todo',
                'element': todo.strip(),
                'recommendation': f"Address TODO: {todo.strip()}"
            })
        
        # Check for commented-out code
        commented_code = re.findall(r'^\s*#\s*(def|class|import|from|if|for|while)\s+', content, re.MULTILINE)
        if commented_code:
            analysis['improvement_opportunities'].append({
                'type': 'commented_code',
                'count': len(commented_code),
                'recommendation': f"Remove or refactor {len(commented_code)} instances of commented-out code"
            })
        
        # Parse AST
        try:
            tree = ast.parse(content)
            self._analyze_ast(tree, analysis, content)
        except SyntaxError as e:
            line_num = e.lineno if hasattr(e, 'lineno') else 0
            analysis['issues'].append({
                'type': 'syntax_error',
                'line': line_num,
                'message': str(e)
            })
        
        return analysis
    
    def _analyze_ast(self, tree: ast.AST, analysis: Dict, content: str) -> None:
        """Analyze AST for quality issues."""
        functions = []
        classes = []
        
        # Check for missing docstrings in functions and classes
        for node in ast.walk(tree):
            # Track function and class definitions
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    'name': node.name,
                    'lineno': node.lineno,
                    'has_docstring': bool(ast.get_docstring(node))
                })
                
                # Check for missing docstrings
                if not ast.get_docstring(node):
                    analysis['missing_docstrings'].append(node.name)
                    analysis['improvement_opportunities'].append({
                        'type': 'missing_docstring',
                        'element': node.name,
                        'line': node.lineno,
                        'recommendation': f"Add docstring to function '{node.name}'"
                    })
                
                # Check for function length
                func_lines = self._count_node_lines(node, content)
                if func_lines > 50:
                    analysis['improvement_opportunities'].append({
                        'type': 'long_function',
                        'element': node.name,
                        'line': node.lineno,
                        'lines': func_lines,
                        'recommendation': f"Consider breaking function '{node.name}' ({func_lines} lines) into smaller functions"
                    })
                    
                # Check for too many arguments
                if len(node.args.args) > 5:
                    analysis['improvement_opportunities'].append({
                        'type': 'too_many_args',
                        'element': node.name,
                        'line': node.lineno,
                        'arg_count': len(node.args.args),
                        'recommendation': f"Function '{node.name}' has {len(node.args.args)} parameters, consider refactoring"
                    })
                
                # Check for security issues
                self._check_security_issues(node, analysis)
                
            # Class definitions
            elif isinstance(node, ast.ClassDef):
                classes.append({
                    'name': node.name,
                    'lineno': node.lineno,
                    'has_docstring': bool(ast.get_docstring(node))
                })
                
                # Check for missing docstrings
                if not ast.get_docstring(node):
                    analysis['missing_docstrings'].append(node.name)
                    analysis['improvement_opportunities'].append({
                        'type': 'missing_docstring',
                        'element': node.name,
                        'line': node.lineno,
                        'recommendation': f"Add docstring to class '{node.name}'"
                    })
            
            # Check for bare except clauses
            elif isinstance(node, ast.ExceptHandler) and node.type is None:
                analysis['issues'].append({
                    'type': 'bare_except',
                    'line': node.lineno,
                    'message': "Bare except clause detected - should catch specific exceptions"
                })
                
            # Check for hardcoded passwords or secrets
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and isinstance(node.value, ast.Constant):
                        var_name = target.id.lower()
                        if any(secret_word in var_name for secret_word in ['password', 'secret', 'token', 'key', 'apikey']):
                            if isinstance(node.value.value, str) and len(node.value.value) > 5:
                                analysis['issues'].append({
                                    'type': 'hardcoded_secret',
                                    'line': node.lineno,
                                    'message': f"Potential hardcoded secret in variable '{target.id}' - consider using environment variables"
                                })
                                
            # Check for eval and exec usage
            elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id in ['eval', 'exec']:
                    analysis['issues'].append({
                        'type': 'dangerous_function',
                        'line': node.lineno,
                        'message': f"Usage of potentially dangerous function '{node.func.id}' - could lead to code injection"
                    })
        
        # Add metadata
        analysis['functions_count'] = len(functions)
        analysis['classes_count'] = len(classes)
        analysis['functions'] = functions
        analysis['classes'] = classes
        
    def _check_security_issues(self, node: ast.FunctionDef, analysis: Dict) -> None:
        """Check for security issues in a function"""
        # Walk through the function body
        for subnode in ast.walk(node):
            # Check for SQL injection vulnerabilities
            if isinstance(subnode, ast.Call) and isinstance(subnode.func, ast.Attribute):
                if subnode.func.attr in ['execute', 'executemany', 'executescript']:
                    # Check if any f-strings or string concatenation is used
                    has_sql_injection_risk = False
                    
                    # Check for string formatting arguments
                    for arg in subnode.args:
                        if isinstance(arg, ast.JoinedStr) or (isinstance(arg, ast.BinOp) and isinstance(arg.op, ast.Add)):
                            has_sql_injection_risk = True
                            break
                    
                    if has_sql_injection_risk:
                        analysis['issues'].append({
                            'type': 'sql_injection',
                            'line': subnode.lineno,
                            'message': "Potential SQL injection vulnerability - use parameterized queries instead of string formatting"
                        })
                        
            # Check for shell injection vulnerabilities
            if isinstance(subnode, ast.Call) and isinstance(subnode.func, ast.Name):
                if subnode.func.id in ['system', 'popen', 'call', 'check_output', 'check_call', 'run']:
                    # Check if any arguments involve string concatenation or f-strings
                    for arg in subnode.args:
                        if isinstance(arg, ast.JoinedStr) or (isinstance(arg, ast.BinOp) and isinstance(arg.op, ast.Add)):
                            analysis['issues'].append({
                                'type': 'shell_injection',
                                'line': subnode.lineno,
                                'message': "Potential shell injection vulnerability - use subprocess with shell=False and pass arguments as a list"
                            })
                            break
    
    def _count_node_lines(self, node, content):
        """Count the number of lines in a node."""
        if hasattr(node, 'end_lineno'):
            return node.end_lineno - node.lineno + 1
        
        # Fallback for older Python versions
        lines = content.splitlines()
        start = node.lineno - 1
        
        # Count indentation of the first line
        first_line = lines[start]
        indentation = len(first_line) - len(first_line.lstrip())
        
        count = 1
        for i in range(start + 1, len(lines)):
            if not lines[i].strip():  # Skip empty lines
                count += 1
                continue
                
            # If indentation is less than or equal to the original function, we've exited the function
            current_indent = len(lines[i]) - len(lines[i].lstrip())
            if current_indent <= indentation:
                break
                
            count += 1
            
        return count
    
    def _extract_imports(self, content):
        """Extract all imports from the file."""
        imports = []
        
        # Match standard imports
        for match in re.finditer(r'^import\s+([\w\s,]+)', content, re.MULTILINE):
            for item in match.group(1).split(','):
                imports.append(item.strip())
                
        # Match from imports
        for match in re.finditer(r'^from\s+([\w\.]+)\s+import\s+([\w\s,\*]+)', content, re.MULTILINE):
            module = match.group(1)
            for item in match.group(2).split(','):
                imports.append(f"{module}.{item.strip()}")
                
        return imports
    
    def _calculate_complexity(self, content: str) -> int:
        """Calculate cyclomatic complexity."""
        # Count control flow statements
        control_statements = len(re.findall(r'\bif\b|\bfor\b|\bwhile\b|\bexcept\b|\belif\b|\bwith\b', content))
        return control_statements + 1
    
    def generate_improvement_report(self) -> str:
        """Generate a markdown report of all improvement opportunities."""
        if not self.analyzed_files:
            return "# No files have been analyzed yet\n\nRun `scan_repository()` first."
            
        report = f"# FrontierAI Code Improvement Report\n\n"
        report += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        report += f"**Repository:** {self.repo_path}\n\n"
        report += f"## Summary\n\n"
        report += f"- **Files Analyzed:** {len(self.analyzed_files)}\n"
        report += f"- **Total Lines of Code:** {self.total_lines:,}\n"
        report += f"- **Issues Found:** {self.total_issues}\n"
        report += f"- **Improvement Opportunities:** {self.total_opportunities}\n\n"
        
        # Sort files by number of issues + opportunities
        sorted_files = sorted(
            self.analyzed_files.items(),
            key=lambda x: len(x[1]['issues']) + len(x[1]['improvement_opportunities']),
            reverse=True
        )
        
        # Add file-specific sections
        for file_path, analysis in sorted_files:
            total_issues = len(analysis['issues']) + len(analysis['improvement_opportunities'])
            if total_issues == 0:
                continue  # Skip files with no issues or opportunities
                
            report += f"## {file_path}\n\n"
            report += f"- **Lines of code:** {analysis['loc']}\n"
            report += f"- **Complexity score:** {analysis['complexity']}\n"
            report += f"- **Functions:** {analysis.get('functions_count', 'N/A')}\n"
            report += f"- **Classes:** {analysis.get('classes_count', 'N/A')}\n"
            report += f"- **Last modified:** {analysis.get('last_modified', 'N/A')}\n"
            
            if analysis['issues']:
                report += "\n### Issues\n\n"
                for issue in analysis['issues']:
                    if isinstance(issue, dict):
                        report += f"- **{issue['type']}** (line {issue['line']}): {issue['message']}\n"
                    else:
                        report += f"- {issue}\n"
            
            if analysis['improvement_opportunities']:
                report += "\n### Improvement Opportunities\n\n"
                for opportunity in analysis['improvement_opportunities']:
                    if 'line' in opportunity:
                        report += f"- **{opportunity['type']}** (line {opportunity['line']}): {opportunity['recommendation']}\n"
                    else:
                        report += f"- **{opportunity['type']}**: {opportunity['recommendation']}\n"
            
            report += "\n---\n\n"
        
        return report
    
    def get_summary_stats(self) -> Dict:
        """Get summary statistics for the repository."""
        if not self.analyzed_files:
            return {"status": "No files analyzed"}
            
        # Safely handle missing docstrings field which might be None, list, or missing
        missing_docstrings_count = 0
        for file_data in self.analyzed_files.values():
            missing_docs = file_data.get('missing_docstrings', [])
            if isinstance(missing_docs, list):
                missing_docstrings_count += len(missing_docs)
            
        # Safely calculate average complexity
        complexity_values = []
        for file_data in self.analyzed_files.values():
            complexity = file_data.get('complexity')
            if isinstance(complexity, (int, float)):
                complexity_values.append(complexity)
        
        avg_complexity = sum(complexity_values) / len(complexity_values) if complexity_values else 0
            
        return {
            "timestamp": self.scan_timestamp.isoformat() if self.scan_timestamp else None,
            "files_analyzed": len(self.analyzed_files),
            "total_lines": self.total_lines,
            "total_issues": self.total_issues,
            "total_opportunities": self.total_opportunities,
            "avg_complexity": avg_complexity,
            "missing_docstrings": missing_docstrings_count,
        }
    
    def generate_report(self, output_path):
        """Generate a markdown report from the analysis results."""
        with open(output_path, 'w', encoding='utf-8') as f:
            # Report header
            f.write(f"# Code Analysis Report\n\n")
            f.write(f"Generated on: {self.scan_timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Summary section
            f.write(f"## Summary\n\n")
            f.write(f"- Repository: {self.repo_path}\n")
            if self.github_repo:
                f.write(f"- GitHub Repository: {self.github_repo}\n")
            f.write(f"- Files analyzed: {len(self.analyzed_files)}\n")
            f.write(f"- Total lines of code: {self.total_lines}\n")
            f.write(f"- Total issues found: {self.total_issues}\n")
            f.write(f"- Total improvement opportunities: {self.total_opportunities}\n\n")
            
            # Results by file
            f.write(f"## Analysis by File\n\n")
            
            # Sort files by issues + opportunities for prioritization
            sorted_files = sorted(
                self.analyzed_files.items(),
                key=lambda x: len(x[1].get('issues', [])) + len(x[1].get('improvement_opportunities', [])),
                reverse=True
            )
            
            for file_path, data in sorted_files:
                relative_path = os.path.relpath(file_path, self.repo_path)
                f.write(f"### {relative_path}\n\n")
                f.write(f"- Lines of code: {data.get('loc', 0)}\n")
                f.write(f"- Issues: {len(data.get('issues', []))}\n")
                f.write(f"- Opportunities: {len(data.get('improvement_opportunities', []))}\n\n")
                
                if len(data.get('issues', [])) > 0 or len(data.get('improvement_opportunities', [])) > 0:
                    f.write("#### Details\n\n")
                    
                    # Write issues
                    issues = data.get('issues', [])
                    if issues:
                        f.write("🔴 **Issues Found**\n")
                        for issue in issues:
                            if isinstance(issue, dict):
                                f.write(f"- {issue.get('type', 'Unknown')}: {issue.get('message', str(issue))}\n")
                            else:
                                f.write(f"- {issue}\n")
                        f.write("\n")
                    
                    # Write improvement opportunities
                    opportunities = data.get('improvement_opportunities', [])
                    if opportunities:
                        f.write("� **Improvement Opportunities**\n")
                        for opp in opportunities:
                            if isinstance(opp, dict):
                                f.write(f"- {opp.get('type', 'Unknown')}: {opp.get('recommendation', str(opp))}\n")
                            else:
                                f.write(f"- {opp}\n")
                        f.write("\n")
                    
                    f.write("\n")
            
            # Recommendations
            f.write(f"## Recommendations\n\n")
            f.write("Based on the analysis, here are recommendations for improving code quality:\n\n")
            
            # Count different types of issues from the actual data
            total_issues = sum(len(data.get('issues', [])) for data in self.analyzed_files.values())
            total_opportunities = sum(len(data.get('improvement_opportunities', [])) for data in self.analyzed_files.values())
            
            if total_issues > 0:
                f.write(f"- � **Fix {total_issues} issues** found across the codebase\n")
            
            if total_opportunities > 0:
                f.write(f"- � **Address {total_opportunities} improvement opportunities** to enhance code quality\n")
            
            f.write("- 📚 **Add documentation** where missing\n")
            f.write("- 🧹 **Refactor complex functions** into smaller, more manageable units\n")
            f.write("- � **Review security concerns** and use environment variables for sensitive data\n")
            
            # Footer
            f.write(f"\n---\n")
            f.write(f"Report generated by FrontierAI Code Analyzer\n")
        
        logger.info(f"Report generated successfully: {output_path}")
        return output_path
    
    def save_results(self, output_path):
        """Save the raw analysis results to a JSON file."""
        results = {
            "summary": self.get_summary_stats(),
            "files": self.analyzed_files,
            "repo_path": self.repo_path,
            "github_repo": self.github_repo,
            "is_railway": self.is_railway
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
            
        logger.info(f"Analysis results saved successfully: {output_path}")
        return output_path

def analyze_repository(repo_path, output_md=None, output_json=None):
    """
    Analyze a repository and generate reports.
    
    Args:
        repo_path: Path to the repository to analyze
        output_md: Path to save the Markdown report
        output_json: Path to save the JSON results
        
    Returns:
        CodeAnalyzer instance with the analysis results
    """
    logger.info(f"Starting code analysis on {repo_path}")
    analyzer = CodeAnalyzer(repo_path)
    analyzer.scan_repository()
    
    if output_md:
        analyzer.generate_report(output_md)
        
    if output_json:
        analyzer.save_results(output_json)
    
    logger.info(f"Analysis complete. Found {analyzer.total_issues} issues and {analyzer.total_opportunities} improvement opportunities.")
    return analyzer

class CodeAnalysisScheduler:
    """Scheduler for periodic code analysis"""
    
    def __init__(self, repo_path, interval_hours=24, output_dir=None):
        self.repo_path = repo_path
        self.interval_hours = interval_hours
        self.output_dir = output_dir or os.path.join(repo_path, 'analysis')
        self.last_run = None
        self.next_run = None
        self.running = False
        self.thread = None
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
    def start(self):
        """Start the scheduler"""
        if self.running:
            logger.warning("Scheduler is already running")
            return
            
        self.running = True
        self.next_run = datetime.now()  # Run immediately
        self.thread = threading.Thread(target=self._run)
        self.thread.daemon = True
        self.thread.start()
        
        logger.info(f"Code analysis scheduler started with interval of {self.interval_hours} hours")
        
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            
        logger.info("Code analysis scheduler stopped")
        
    def _run(self):
        """Main scheduler loop"""
        while self.running:
            now = datetime.now()
            
            if now >= self.next_run:
                try:
                    # Generate timestamp for filenames
                    timestamp = now.strftime("%Y%m%d_%H%M%S")
                    output_md = os.path.join(self.output_dir, f"analysis_{timestamp}.md")
                    output_json = os.path.join(self.output_dir, f"analysis_{timestamp}.json")
                    
                    # Run analysis
                    logger.info(f"Running scheduled code analysis")
                    analyzer = analyze_repository(self.repo_path, output_md, output_json)
                    
                    self.last_run = now
                    self.next_run = now + timedelta(hours=self.interval_hours)
                    
                    logger.info(f"Scheduled analysis complete. Next run at {self.next_run}")
                except Exception as e:
                    logger.error(f"Error during scheduled analysis: {str(e)}")
                    # Retry in 1 hour on error
                    self.next_run = now + timedelta(hours=1)
            
            # Sleep for a while before checking again
            time.sleep(60)  # Check every minute
    def save_report_to_file(self, output_path: str) -> None:
        """Save the improvement report to a markdown file."""
        report = self.generate_improvement_report()
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        logger.info(f"✅ Report saved to: {output_path}")
    
    def export_json(self, output_path: str) -> None:
        """Export analysis results to a JSON file."""
        # Convert datetime objects to strings for JSON serialization
        export_data = {
            "summary": self.get_summary_stats(),
            "files": self.analyzed_files
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, default=str)
        logger.info(f"✅ JSON data exported to: {output_path}")

class CodeAnalysisScheduler:
    """Scheduler for periodic code analysis"""
    
    def __init__(self, repo_path: str, interval_hours: int = 24, github_repo: str = None):
        self.repo_path = repo_path
        self.interval_seconds = interval_hours * 3600
        self.running = False
        self.scheduler_thread = None
        self.last_run = None
        self.next_run = None
        self.github_repo = github_repo  # Format: "username/repo"
        self.is_railway = os.environ.get('RAILWAY_ENVIRONMENT') == 'production'
    
    def start_scheduling(self):
        """Start periodic code analysis"""
        if self.running:
            return
            
        self.running = True
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.scheduler_thread.start()
        logger.info(f"🔍 Scheduled code analysis started (interval: {self.interval_seconds//3600} hours)")
        
        # If on Railway and GitHub repo is specified, do an initial clone
        if self.is_railway and self.github_repo:
            self._ensure_repo_available()
    
    def stop_scheduling(self):
        """Stop periodic code analysis"""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=1.0)
            logger.info("🛑 Scheduled code analysis stopped")
    
    def _ensure_repo_available(self):
        """Ensure the repository is available for analysis on Railway"""
        try:
            # If we're on Railway, we need to clone or update the repo
            if self.is_railway and self.github_repo:
                repo_dir = os.path.join(self.repo_path, 'github_repo')
                
                # Check if directory exists
                if os.path.exists(repo_dir):
                    logger.info(f"Repository directory exists, pulling latest changes...")
                    # Pull latest changes
                    os.chdir(repo_dir)
                    os.system('git pull')
                else:
                    logger.info(f"Cloning repository {self.github_repo}...")
                    # Clone the repository
                    os.system(f'git clone https://github.com/{self.github_repo}.git {repo_dir}')
                
                # Update repo path to the cloned directory
                self.repo_path = repo_dir
                logger.info(f"Repository ready at {self.repo_path}")
                
            return True
        except Exception as e:
            logger.error(f"Error ensuring repository availability: {str(e)}")
            return False
    
    def _scheduler_loop(self):
        """Main scheduler loop"""
        # Run immediately on start
        self._run_analysis()
        
        while self.running:
            time.sleep(60)  # Check every minute
            
            # Calculate time until next run
            if self.next_run and datetime.now() >= self.next_run:
                self._run_analysis()
    
    def _run_analysis(self):
        """Run code analysis and save results"""
        try:
            logger.info(f"🔍 Starting scheduled code analysis: {self.repo_path}")
            self.last_run = datetime.now()
            
            # Ensure repo is up-to-date if on Railway
            if self.is_railway and self.github_repo:
                self._ensure_repo_available()
            
            # Create output paths
            output_dir = os.path.join(self.repo_path, 'analysis')
            os.makedirs(output_dir, exist_ok=True)
            output_md = os.path.join(output_dir, "code_analysis_report.md")
            output_json = os.path.join(output_dir, "code_analysis_data.json")
            
            # Run analysis
            analyzer = analyze_repository(self.repo_path, output_md, output_json)
            
            # Schedule next run
            self.next_run = datetime.now().replace(microsecond=0) + timedelta(seconds=self.interval_seconds)
            logger.info(f"✅ Scheduled analysis complete. Next run at {self.next_run}")
            
            return analyzer.get_summary_stats()
            
        except Exception as e:
            logger.error(f"Scheduled analysis error: {str(e)}")
            # Still schedule next run even if this one failed
            self.next_run = datetime.now().replace(microsecond=0) + timedelta(seconds=self.interval_seconds)

    def get_status(self) -> Dict:
        """Get the current status of the scheduler"""
        return {
            "running": self.running,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "interval_hours": self.interval_seconds // 3600,
            "github_repo": self.github_repo,
            "environment": "Railway" if self.is_railway else "Local",
            "repo_path": self.repo_path
        }

# Utility function to run a standalone analysis
def analyze_repository(repo_path: str, output_md: str = None, output_json: str = None) -> CodeAnalyzer:
    """Run a complete analysis on a repository and optionally save reports."""
    analyzer = CodeAnalyzer(repo_path)
    analyzer.scan_repository()
    
    if output_md:
        analyzer.save_report_to_file(output_md)
    
    if output_json:
        analyzer.export_json(output_json)
    
    return analyzer

if __name__ == "__main__":
    # If run as a script, analyze the current directory
    import sys
    
    if len(sys.argv) > 1:
        repo_path = sys.argv[1]
    else:
        repo_path = os.getcwd()
        
    output_md = os.path.join(repo_path, "code_analysis_report.md")
    output_json = os.path.join(repo_path, "code_analysis_data.json")
    
    print(f"Starting analysis of {repo_path}...")
    analyzer = analyze_repository(repo_path, output_md, output_json)
    print(f"Analysis complete. Found {analyzer.total_issues} issues and {analyzer.total_opportunities} improvement opportunities.")
    print(f"Reports saved to {output_md} and {output_json}")
# End of CodeAnalyzer module