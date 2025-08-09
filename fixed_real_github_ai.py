#!/usr/bin/env python3
"""
🔧 FIXED REAL GITHUB AI - APPLY IMPROVEMENTS
===========================================
Fixed version that actually applies real improvements to your repository.
"""

import os
import json
import time
import subprocess
import ast
import re
from pathlib import Path
from typing import Dict, List, Any

class FixedRealGitHubAI:
    """Fixed AI that actually improves real files"""
    
    def __init__(self):
        self.repo_path = Path.cwd()
        self.improvements_made = []
        print(f"🔗 Working on repository at: {self.repo_path}")
    
    def find_real_improvement_opportunities(self) -> List[Dict[str, Any]]:
        """Find real improvement opportunities in actual files"""
        print("\n🔍 Finding REAL improvement opportunities...")
        
        opportunities = []
        python_files = list(self.repo_path.glob("*.py"))
        
        for file_path in python_files[:10]:  # Limit to first 10 files for speed
            if file_path.name.startswith('.') or not file_path.exists():
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                lines = content.split('\n')
                
                # Count print statements
                print_statements = []
                for i, line in enumerate(lines, 1):
                    if re.search(r'\bprint\s*\(', line) and not line.strip().startswith('#'):
                        print_statements.append(i)
                
                # Count long lines
                long_lines = []
                for i, line in enumerate(lines, 1):
                    if len(line) > 120:
                        long_lines.append(i)
                
                # Count TODO comments
                todo_comments = []
                for i, line in enumerate(lines, 1):
                    if 'TODO' in line or 'FIXME' in line:
                        todo_comments.append(i)
                
                # Add opportunities
                if print_statements:
                    opportunities.append({
                        "file": str(file_path),
                        "type": "print_statements",
                        "count": len(print_statements),
                        "lines": print_statements[:5],  # First 5 lines
                        "description": f"Replace {len(print_statements)} print statements with logging"
                    })
                
                if long_lines:
                    opportunities.append({
                        "file": str(file_path),
                        "type": "long_lines", 
                        "count": len(long_lines),
                        "lines": long_lines[:5],
                        "description": f"Break down {len(long_lines)} long lines"
                    })
                
                if todo_comments:
                    opportunities.append({
                        "file": str(file_path),
                        "type": "todo_comments",
                        "count": len(todo_comments),
                        "lines": todo_comments[:5],
                        "description": f"Address {len(todo_comments)} TODO comments"
                    })
            
            except Exception as e:
                print(f"   Error analyzing {file_path.name}: {e}")
        
        # Sort by count (most issues first)
        opportunities.sort(key=lambda x: x["count"], reverse=True)
        
        print(f"✅ Found {len(opportunities)} improvement opportunities")
        return opportunities
    
    def apply_print_statement_fixes(self, file_path: Path, lines_to_fix: List[int]) -> bool:
        """Actually fix print statements in a real file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            modified = False
            
            # Add logging import if not present
            if 'import logging' not in content:
                # Find where to insert logging import
                for i, line in enumerate(lines):
                    if line.startswith('import ') or line.startswith('from '):
                        lines.insert(i + 1, 'import logging')
                        modified = True
                        break
                else:
                    # No imports found, add at the top
                    lines.insert(0, 'import logging')
                    lines.insert(1, '')
                    modified = True
            
            # Fix print statements
            for i, line in enumerate(lines):
                if re.search(r'\bprint\s*\(', line) and not line.strip().startswith('#'):
                    # Replace print with logging.info
                    new_line = re.sub(r'\bprint\s*\(', 'logging.info(', line)
                    if new_line != line:
                        lines[i] = new_line
                        modified = True
            
            if modified:
                # Create backup
                backup_path = file_path.with_suffix(f'.backup_{int(time.time())}.py')
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                # Write improved version
                new_content = '\n'.join(lines)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                print(f"✅ Fixed print statements in {file_path.name}")
                print(f"   Backup created: {backup_path.name}")
                return True
            
            return False
        
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")
            return False
    
    def apply_long_line_fixes(self, file_path: Path, lines_to_fix: List[int]) -> bool:
        """Actually fix long lines in a real file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            modified = False
            
            for line_num in lines_to_fix:
                if line_num <= len(lines):
                    line = lines[line_num - 1]  # Convert to 0-based index
                    
                    if len(line) > 120:
                        # Simple line breaking for strings
                        if "'" in line and line.count("'") >= 2:
                            # Break long string literals
                            indent = len(line) - len(line.lstrip())
                            if len(line) > 120:
                                # Break at reasonable point
                                break_point = 100
                                new_line1 = line[:break_point] + " \\"
                                new_line2 = " " * (indent + 4) + line[break_point:]
                                lines[line_num - 1] = new_line1
                                lines.insert(line_num, new_line2)
                                modified = True
            
            if modified:
                # Create backup
                backup_path = file_path.with_suffix(f'.backup_{int(time.time())}.py')
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                # Write improved version
                new_content = '\n'.join(lines)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                print(f"✅ Fixed long lines in {file_path.name}")
                return True
            
            return False
        
        except Exception as e:
            print(f"❌ Error fixing long lines in {file_path}: {e}")
            return False
    
    def apply_improvements(self, opportunities: List[Dict[str, Any]], max_improvements: int = 3) -> int:
        """Apply real improvements to actual files"""
        print(f"\n🔧 APPLYING TOP {max_improvements} IMPROVEMENTS:")
        
        applied = 0
        
        for i, opportunity in enumerate(opportunities[:max_improvements]):
            file_path = Path(opportunity["file"])
            improvement_type = opportunity["type"]
            
            print(f"\n   {i+1}. {opportunity['description']}")
            print(f"      File: {file_path.name}")
            
            success = False
            
            if improvement_type == "print_statements":
                success = self.apply_print_statement_fixes(file_path, opportunity["lines"])
            elif improvement_type == "long_lines":
                success = self.apply_long_line_fixes(file_path, opportunity["lines"])
            elif improvement_type == "todo_comments":
                # For TODO comments, just add a comment about addressing them
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Add comment at top of file
                    lines = content.split('\n')
                    todo_comment = f"# TODO: Address {opportunity['count']} TODO/FIXME comments in this file"
                    
                    # Find good place to insert (after shebang and docstring)
                    insert_index = 0
                    for j, line in enumerate(lines):
                        if line.startswith('#!') or '"""' in line or "'''" in line:
                            continue
                        else:
                            insert_index = j
                            break
                    
                    lines.insert(insert_index, todo_comment)
                    
                    # Create backup
                    backup_path = file_path.with_suffix(f'.backup_{int(time.time())}.py')
                    with open(backup_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    
                    # Write improved version
                    new_content = '\n'.join(lines)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    print(f"✅ Added TODO reminder to {file_path.name}")
                    success = True
                
                except Exception as e:
                    print(f"❌ Error adding TODO comment: {e}")
            
            if success:
                applied += 1
                self.improvements_made.append({
                    "file": str(file_path),
                    "type": improvement_type,
                    "description": opportunity["description"]
                })
        
        return applied
    
    def commit_to_github(self) -> bool:
        """Commit real improvements to GitHub"""
        if not self.improvements_made:
            return False
        
        try:
            print(f"\n📤 COMMITTING {len(self.improvements_made)} IMPROVEMENTS TO GITHUB...")
            
            # Add all changes
            subprocess.run(['git', 'add', '.'], check=True)
            
            # Create commit message
            commit_message = f"🤖 Real AI Improvements: {len(self.improvements_made)} code improvements\n\n"
            for improvement in self.improvements_made:
                commit_message += f"- {improvement['type']}: {Path(improvement['file']).name}\n"
            
            # Commit
            result = subprocess.run(['git', 'commit', '-m', commit_message], capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✅ Committed improvements locally")
                
                # Push to GitHub  
                push_result = subprocess.run(['git', 'push'], capture_output=True, text=True)
                
                if push_result.returncode == 0:
                    print(f"✅ Pushed to GitHub successfully!")
                    return True
                else:
                    print(f"❌ Failed to push: {push_result.stderr}")
                    return False
            else:
                if "nothing to commit" in result.stdout:
                    print("ℹ️ No changes to commit")
                    return True
                else:
                    print(f"❌ Failed to commit: {result.stderr}")
                    return False
        
        except Exception as e:
            print(f"❌ Git error: {e}")
            return False

def main():
    print("🔧 FIXED REAL GITHUB AI - APPLYING IMPROVEMENTS")
    print("=" * 60)
    print("This AI will actually apply real improvements to your repository.")
    print()
    
    ai = FixedRealGitHubAI()
    
    # Find opportunities
    opportunities = ai.find_real_improvement_opportunities()
    
    if opportunities:
        # Show top opportunities
        print(f"\n📊 TOP IMPROVEMENT OPPORTUNITIES:")
        for i, opp in enumerate(opportunities[:5], 1):
            print(f"   {i}. {opp['description']} - {Path(opp['file']).name}")
        
        # Apply improvements
        applied = ai.apply_improvements(opportunities, max_improvements=3)
        
        # Commit to GitHub
        if applied > 0:
            success = ai.commit_to_github()
            if success:
                print(f"\n🎉 SUCCESS! Applied {applied} real improvements and committed to GitHub!")
                print(f"   Check your repository to see the actual changes.")
            else:
                print(f"\n⚠️ Applied {applied} improvements but failed to commit to GitHub")
        else:
            print(f"\n⚠️ No improvements were successfully applied")
    else:
        print(f"\n✅ No improvement opportunities found - code is already clean!")
    
    return ai

if __name__ == "__main__":
    main()
