#!/usr/bin/env python3
"""
🔗 REAL GITHUB-CONNECTED SELF-EVOLVING AI
==========================================
This AI actually connects to your GitHub repo and makes real improvements.
No simulation. No fake data. REAL repository analysis and code improvements.
"""

import os
import json
import time
import subprocess
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import ast
import re
from dataclasses import dataclass

@dataclass
class RealImprovementResult:
    """Real improvement made to actual code"""
    file_path: str
    improvement_type: str
    old_code: str
    new_code: str
    reasoning: str
    success: bool
    commit_hash: Optional[str] = None
    pr_number: Optional[int] = None

class RealGitHubConnectedAI:
    """AI that actually connects to and improves real GitHub repositories"""
    
    def __init__(self, repo_owner: str, repo_name: str, github_token: str = None):
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.github_token = github_token or os.environ.get('GITHUB_TOKEN')
        self.repo_path = Path.cwd()
        self.improvements_made = []
        
        print(f"🔗 Connecting to REAL GitHub repo: {repo_owner}/{repo_name}")
        self._verify_github_connection()
    
    def _verify_github_connection(self):
        """Verify we can actually connect to GitHub"""
        try:
            # Check if we're in a git repo
            result = subprocess.run(['git', 'remote', '-v'], capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception("Not in a git repository")
            
            # Check GitHub API connection
            if self.github_token:
                headers = {'Authorization': f'token {self.github_token}'}
                response = requests.get(f'https://api.github.com/repos/{self.repo_owner}/{self.repo_name}', headers=headers)
                if response.status_code == 200:
                    print(f"✅ GitHub API connection verified")
                else:
                    print(f"⚠️ GitHub API connection failed: {response.status_code}")
            else:
                print("⚠️ No GitHub token - limited API access")
            
            print(f"✅ Connected to local git repository")
            
        except Exception as e:
            print(f"❌ GitHub connection failed: {e}")
    
    def analyze_real_repository(self) -> Dict[str, Any]:
        """Analyze the ACTUAL repository for real improvement opportunities"""
        print("\n🔍 Analyzing REAL repository...")
        
        analysis = {
            "timestamp": time.time(),
            "repository": f"{self.repo_owner}/{self.repo_name}",
            "files_analyzed": 0,
            "real_issues_found": [],
            "improvement_opportunities": []
        }
        
        # Analyze actual Python files in the repo
        python_files = list(self.repo_path.glob("*.py"))
        analysis["files_analyzed"] = len(python_files)
        
        for file_path in python_files:
            if file_path.name.startswith('.'):
                continue
                
            print(f"   Analyzing: {file_path.name}")
            file_issues = self._analyze_python_file(file_path)
            analysis["real_issues_found"].extend(file_issues)
        
        # Find REAL improvement opportunities
        analysis["improvement_opportunities"] = self._identify_real_improvements(analysis["real_issues_found"])
        
        print(f"✅ Repository analysis complete:")
        print(f"   Files analyzed: {analysis['files_analyzed']}")
        print(f"   Real issues found: {len(analysis['real_issues_found'])}")
        print(f"   Improvement opportunities: {len(analysis['improvement_opportunities'])}")
        
        return analysis
    
    def _analyze_python_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Analyze a real Python file for actual issues"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Parse AST to find real issues
            try:
                tree = ast.parse(content)
                
                # Find actual code issues
                for node in ast.walk(tree):
                    # Check for hardcoded values
                    if isinstance(node, ast.Str) and len(node.s) > 10:
                        if any(keyword in node.s.lower() for keyword in ['password', 'key', 'secret', 'token']):
                            issues.append({
                                "file": str(file_path),
                                "type": "hardcoded_secret",
                                "line": getattr(node, 'lineno', 0),
                                "description": "Potential hardcoded secret found",
                                "severity": "high"
                            })
                    
                    # Check for missing error handling
                    if isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Attribute) and node.func.attr in ['open', 'requests.get', 'subprocess.run']:
                            # Check if it's in a try block
                            # This is a simplified check - real implementation would be more sophisticated
                            issues.append({
                                "file": str(file_path),
                                "type": "missing_error_handling",
                                "line": getattr(node, 'lineno', 0),
                                "description": f"Call to {node.func.attr if hasattr(node.func, 'attr') else 'function'} without error handling",
                                "severity": "medium"
                            })
                
            except SyntaxError as e:
                issues.append({
                    "file": str(file_path),
                    "type": "syntax_error",
                    "line": e.lineno,
                    "description": f"Syntax error: {e.msg}",
                    "severity": "high"
                })
            
            # Check for code smells using regex patterns
            lines = content.split('\n')
            for i, line in enumerate(lines, 1):
                # Long lines
                if len(line) > 120:
                    issues.append({
                        "file": str(file_path),
                        "type": "long_line",
                        "line": i,
                        "description": f"Line too long ({len(line)} chars)",
                        "severity": "low"
                    })
                
                # TODO comments
                if 'TODO' in line or 'FIXME' in line:
                    issues.append({
                        "file": str(file_path),
                        "type": "todo_comment",
                        "line": i,
                        "description": "TODO/FIXME comment found",
                        "severity": "low"
                    })
                
                # Print statements (should use logging)
                if re.search(r'\bprint\s*\(', line) and not line.strip().startswith('#'):
                    issues.append({
                        "file": str(file_path),
                        "type": "print_statement",
                        "line": i,
                        "description": "Print statement should use logging",
                        "severity": "low"
                    })
        
        except Exception as e:
            print(f"   Error analyzing {file_path}: {e}")
        
        return issues
    
    def _identify_real_improvements(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify real improvements based on actual issues found"""
        improvements = []
        
        # Group issues by type and file
        issue_groups = {}
        for issue in issues:
            key = f"{issue['file']}:{issue['type']}"
            if key not in issue_groups:
                issue_groups[key] = []
            issue_groups[key].append(issue)
        
        # Create improvement opportunities
        for key, group_issues in issue_groups.items():
            file_path, issue_type = key.split(':', 1)
            
            improvement = {
                "file": file_path,
                "type": issue_type,
                "count": len(group_issues),
                "severity": group_issues[0]["severity"],
                "description": self._get_improvement_description(issue_type, len(group_issues)),
                "lines_affected": [issue["line"] for issue in group_issues],
                "implementable": True
            }
            
            improvements.append(improvement)
        
        # Sort by priority (severity + count)
        priority_map = {"high": 3, "medium": 2, "low": 1}
        improvements.sort(key=lambda x: priority_map.get(x["severity"], 0) * x["count"], reverse=True)
        
        return improvements
    
    def _get_improvement_description(self, issue_type: str, count: int) -> str:
        """Get description for improvement type"""
        descriptions = {
            "hardcoded_secret": f"Move {count} hardcoded secret(s) to environment variables",
            "missing_error_handling": f"Add error handling to {count} function call(s)",
            "long_line": f"Break down {count} long line(s) for better readability",
            "todo_comment": f"Address {count} TODO/FIXME comment(s)",
            "print_statement": f"Replace {count} print statement(s) with proper logging",
            "syntax_error": f"Fix {count} syntax error(s)"
        }
        
        return descriptions.get(issue_type, f"Fix {count} {issue_type} issue(s)")
    
    def implement_real_improvement(self, improvement: Dict[str, Any]) -> RealImprovementResult:
        """Actually implement a real improvement to real code"""
        print(f"\n🔧 Implementing REAL improvement: {improvement['description']}")
        
        file_path = Path(improvement['file'])
        if not file_path.exists():
            return RealImprovementResult(
                file_path=str(file_path),
                improvement_type=improvement['type'],
                old_code="",
                new_code="",
                reasoning="File not found",
                success=False
            )
        
        try:
            # Read the actual file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            modified_content = content
            
            # Apply real improvements based on type
            if improvement['type'] == 'print_statement':
                modified_content = self._fix_print_statements(modified_content, file_path)
            elif improvement['type'] == 'long_line':
                modified_content = self._fix_long_lines(modified_content)
            elif improvement['type'] == 'missing_error_handling':
                modified_content = self._add_error_handling(modified_content, file_path)
            elif improvement['type'] == 'hardcoded_secret':
                modified_content = self._externalize_secrets(modified_content, file_path)
            
            # Only write if there are actual changes
            if modified_content != original_content:
                # Create backup
                backup_path = file_path.with_suffix(f'.backup_{int(time.time())}.py')
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(original_content)
                
                # Write improved version
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                
                # Create improvement result
                result = RealImprovementResult(
                    file_path=str(file_path),
                    improvement_type=improvement['type'],
                    old_code=original_content[:500] + "..." if len(original_content) > 500 else original_content,
                    new_code=modified_content[:500] + "..." if len(modified_content) > 500 else modified_content,
                    reasoning=improvement['description'],
                    success=True
                )
                
                self.improvements_made.append(result)
                
                print(f"✅ Improvement applied to {file_path.name}")
                print(f"   Backup created: {backup_path.name}")
                
                return result
            else:
                return RealImprovementResult(
                    file_path=str(file_path),
                    improvement_type=improvement['type'],
                    old_code=original_content[:200] + "...",
                    new_code=modified_content[:200] + "...",
                    reasoning="No changes needed",
                    success=False
                )
        
        except Exception as e:
            print(f"❌ Error implementing improvement: {e}")
            return RealImprovementResult(
                file_path=str(file_path),
                improvement_type=improvement['type'],
                old_code="",
                new_code="",
                reasoning=f"Error: {e}",
                success=False
            )
    
    def _fix_print_statements(self, content: str, file_path: Path) -> str:
        """Replace print statements with proper logging"""
        lines = content.split('\n')
        modified_lines = []
        needs_logging_import = False
        
        for line in lines:
            if re.search(r'\bprint\s*\(', line) and not line.strip().startswith('#'):
                # Replace print with logging
                indentation = len(line) - len(line.lstrip())
                indent = ' ' * indentation
                
                # Extract the print content
                print_match = re.search(r'print\s*\((.*)\)', line)
                if print_match:
                    print_content = print_match.group(1)
                    new_line = f"{indent}logging.info({print_content})"
                    modified_lines.append(new_line)
                    needs_logging_import = True
                else:
                    modified_lines.append(line)
            else:
                modified_lines.append(line)
        
        # Add logging import if needed
        if needs_logging_import and 'import logging' not in content:
            # Find where to insert the import
            import_line_found = False
            final_lines = []
            
            for line in modified_lines:
                if line.startswith('import ') or line.startswith('from '):
                    final_lines.append(line)
                    if not import_line_found:
                        final_lines.append('import logging')
                        import_line_found = True
                else:
                    if not import_line_found and line.strip() and not line.startswith('#'):
                        final_lines.append('import logging')
                        final_lines.append('')
                        import_line_found = True
                    final_lines.append(line)
            
            if not import_line_found:
                final_lines.insert(0, 'import logging')
                final_lines.insert(1, '')
            
            return '\n'.join(final_lines)
        
        return '\n'.join(modified_lines)
    
    def _fix_long_lines(self, content: str) -> str:
        """Break down long lines"""
        lines = content.split('\n')
        modified_lines = []
        
        for line in lines:
            if len(line) > 120 and not line.strip().startswith('#'):
                # Try to break the line intelligently
                if '(' in line and ')' in line:
                    # Function call or similar - break at commas
                    indentation = len(line) - len(line.lstrip())
                    indent = ' ' * (indentation + 4)
                    
                    # Simple line breaking for function calls
                    if line.count(',') > 0:
                        parts = line.split(',')
                        if len(parts) > 1:
                            modified_lines.append(parts[0] + ',')
                            for part in parts[1:-1]:
                                modified_lines.append(indent + part.strip() + ',')
                            modified_lines.append(indent + parts[-1].strip())
                        else:
                            modified_lines.append(line)
                    else:
                        modified_lines.append(line)
                else:
                    modified_lines.append(line)
            else:
                modified_lines.append(line)
        
        return '\n'.join(modified_lines)
    
    def _add_error_handling(self, content: str, file_path: Path) -> str:
        """Add basic error handling to risky operations"""
        lines = content.split('\n')
        modified_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Check for risky operations that need error handling
            risky_patterns = [
                r'open\s*\(',
                r'requests\.',
                r'subprocess\.',
                r'json\.loads\s*\(',
                r'int\s*\(',
                r'float\s*\('
            ]
            
            needs_try_catch = any(re.search(pattern, line) for pattern in risky_patterns)
            
            if needs_try_catch and 'try:' not in line and not any('try:' in prev_line for prev_line in lines[max(0, i-3):i]):
                # Add try-except block
                indentation = len(line) - len(line.lstrip())
                indent = ' ' * indentation
                
                modified_lines.append(f"{indent}try:")
                modified_lines.append(f"    {line}")
                modified_lines.append(f"{indent}except Exception as e:")
                modified_lines.append(f"{indent}    logging.error(f'Error in {file_path.name}: {{e}}')")
                modified_lines.append(f"{indent}    raise")
            else:
                modified_lines.append(line)
            
            i += 1
        
        return '\n'.join(modified_lines)
    
    def _externalize_secrets(self, content: str, file_path: Path) -> str:
        """Move hardcoded secrets to environment variables"""
        lines = content.split('\n')
        modified_lines = []
        needs_os_import = False
        
        for line in lines:
            # Look for potential secrets
            secret_patterns = [
                (r'password\s*=\s*["\']([^"\']+)["\']', 'PASSWORD'),
                (r'api_key\s*=\s*["\']([^"\']+)["\']', 'API_KEY'),
                (r'secret\s*=\s*["\']([^"\']+)["\']', 'SECRET'),
                (r'token\s*=\s*["\']([^"\']+)["\']', 'TOKEN')
            ]
            
            modified_line = line
            for pattern, env_name in secret_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    var_name = re.search(r'(\w+)\s*=', line).group(1)
                    modified_line = f"{var_name} = os.environ.get('{env_name}', '{match.group(1)}')"
                    needs_os_import = True
                    break
            
            modified_lines.append(modified_line)
        
        # Add os import if needed
        if needs_os_import and 'import os' not in content:
            final_lines = []
            import_added = False
            
            for line in modified_lines:
                if line.startswith('import ') or line.startswith('from '):
                    final_lines.append(line)
                    if not import_added:
                        final_lines.append('import os')
                        import_added = True
                else:
                    if not import_added and line.strip() and not line.startswith('#'):
                        final_lines.append('import os')
                        final_lines.append('')
                        import_added = True
                    final_lines.append(line)
            
            return '\n'.join(final_lines)
        
        return '\n'.join(modified_lines)
    
    def commit_improvements_to_github(self) -> bool:
        """Commit the real improvements to the actual GitHub repository"""
        if not self.improvements_made:
            print("❌ No improvements to commit")
            return False
        
        try:
            print(f"\n📤 Committing {len(self.improvements_made)} real improvements to GitHub...")
            
            # Add all modified files
            subprocess.run(['git', 'add', '.'], check=True)
            
            # Create commit message
            commit_message = f"🤖 AI Improvements: {len(self.improvements_made)} real code improvements\n\n"
            for improvement in self.improvements_made:
                if improvement.success:
                    commit_message += f"- {improvement.improvement_type}: {Path(improvement.file_path).name}\n"
            
            # Commit changes
            result = subprocess.run(['git', 'commit', '-m', commit_message], capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✅ Committed improvements locally")
                
                # Push to GitHub
                push_result = subprocess.run(['git', 'push'], capture_output=True, text=True)
                
                if push_result.returncode == 0:
                    print(f"✅ Pushed improvements to GitHub repository")
                    
                    # Get commit hash
                    commit_hash_result = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True)
                    if commit_hash_result.returncode == 0:
                        commit_hash = commit_hash_result.stdout.strip()
                        print(f"✅ Commit hash: {commit_hash[:8]}")
                        
                        # Update improvement results with commit hash
                        for improvement in self.improvements_made:
                            improvement.commit_hash = commit_hash
                    
                    return True
                else:
                    print(f"❌ Failed to push to GitHub: {push_result.stderr}")
                    return False
            else:
                if "nothing to commit" in result.stdout:
                    print("ℹ️ No changes to commit")
                    return True
                else:
                    print(f"❌ Failed to commit: {result.stderr}")
                    return False
        
        except subprocess.CalledProcessError as e:
            print(f"❌ Git command failed: {e}")
            return False
        except Exception as e:
            print(f"❌ Error committing to GitHub: {e}")
            return False
    
    def run_real_evolution_cycle(self) -> Dict[str, Any]:
        """Run a complete real evolution cycle on the actual repository"""
        print("\n🚀 RUNNING REAL EVOLUTION CYCLE")
        print("=" * 50)
        
        cycle_start = time.time()
        
        # 1. Analyze real repository
        analysis = self.analyze_real_repository()
        
        # 2. Implement real improvements
        improvements_applied = 0
        for improvement in analysis["improvement_opportunities"][:5]:  # Limit to top 5
            if improvement["implementable"]:
                result = self.implement_real_improvement(improvement)
                if result.success:
                    improvements_applied += 1
        
        # 3. Commit to real GitHub
        commit_success = self.commit_improvements_to_github() if improvements_applied > 0 else False
        
        cycle_report = {
            "timestamp": time.time(),
            "duration_seconds": time.time() - cycle_start,
            "repository": f"{self.repo_owner}/{self.repo_name}",
            "files_analyzed": analysis["files_analyzed"],
            "issues_found": len(analysis["real_issues_found"]),
            "improvements_identified": len(analysis["improvement_opportunities"]),
            "improvements_applied": improvements_applied,
            "committed_to_github": commit_success,
            "real_changes_made": [
                {
                    "file": imp.file_path,
                    "type": imp.improvement_type,
                    "success": imp.success,
                    "commit_hash": imp.commit_hash
                }
                for imp in self.improvements_made
            ]
        }
        
        print(f"\n🎯 REAL EVOLUTION CYCLE COMPLETE")
        print(f"   Duration: {cycle_report['duration_seconds']:.1f} seconds")
        print(f"   Files analyzed: {cycle_report['files_analyzed']}")
        print(f"   Issues found: {cycle_report['issues_found']}")
        print(f"   Improvements applied: {cycle_report['improvements_applied']}")
        print(f"   Committed to GitHub: {cycle_report['committed_to_github']}")
        
        return cycle_report

def main():
    """Main function to run real GitHub-connected AI"""
    
    print("🔗 REAL GITHUB-CONNECTED SELF-EVOLVING AI")
    print("=" * 60)
    print("This AI ACTUALLY connects to your GitHub repo and makes REAL improvements.")
    print("No simulation. No fake data. REAL code analysis and improvements.")
    print()
    
    # Get repository info from git
    try:
        # Get repository info
        result = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True)
        if result.returncode == 0:
            remote_url = result.stdout.strip()
            if 'github.com' in remote_url:
                # Parse owner/repo from URL
                if remote_url.startswith('git@github.com:'):
                    repo_part = remote_url.split('git@github.com:')[1].replace('.git', '')
                elif 'github.com/' in remote_url:
                    repo_part = remote_url.split('github.com/')[1].replace('.git', '')
                else:
                    raise Exception("Could not parse GitHub URL")
                
                repo_owner, repo_name = repo_part.split('/')
                
                print(f"📁 Detected repository: {repo_owner}/{repo_name}")
                
                # Initialize real AI
                ai = RealGitHubConnectedAI(repo_owner, repo_name)
                
                # Run real evolution cycle
                cycle_report = ai.run_real_evolution_cycle()
                
                # Save real report
                report_file = f"real_evolution_cycle_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(report_file, 'w') as f:
                    json.dump(cycle_report, f, indent=2)
                
                print(f"\n📁 Real evolution report saved: {report_file}")
                
                if cycle_report["committed_to_github"]:
                    print(f"\n🎉 SUCCESS: Real improvements committed to GitHub!")
                    print(f"   Check your repository to see the actual changes.")
                else:
                    print(f"\n⚠️ No changes committed (no improvements needed or errors occurred)")
                
                return ai
            else:
                print("❌ This is not a GitHub repository")
                return None
        else:
            print("❌ Could not detect git repository")
            return None
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    ai = main()
