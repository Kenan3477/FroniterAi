#!/usr/bin/env python3
"""
🔥 NUCLEAR SPAM CLEANUP - ELIMINATE ALL DUPLICATE FILES 🔥
This script will identify and delete ALL spam files with multiple patterns
"""

import os
import glob
import subprocess
import sys

def nuclear_cleanup():
    """Delete ALL spam files with various patterns"""
    
    print("🚨 NUCLEAR SPAM CLEANUP STARTING...")
    print("=" * 60)
    
    # All spam patterns to eliminate
    spam_patterns = [
        "security_improvement_*.py",
        "performance_improvement_*.py", 
        "railway_autonomous_*.py",
        "real_autonomous_improvement_*.py",
        "autonomous_*_20250806_*.py",
        "forced_autonomous_*.py",
        "*_20250806_*.py",
        "security_*_[0-9]*.py",
        "improvement_*_[0-9]*.py"
    ]
    
    total_deleted = 0
    
    for pattern in spam_patterns:
        print(f"\n🔍 Searching for pattern: {pattern}")
        files = glob.glob(pattern)
        
        if files:
            print(f"📁 Found {len(files)} files matching pattern")
            for file in files:
                try:
                    os.remove(file)
                    print(f"❌ Deleted: {file}")
                    total_deleted += 1
                except Exception as e:
                    print(f"⚠️ Failed to delete {file}: {e}")
        else:
            print("✅ No files found for this pattern")
    
    print(f"\n🎯 CLEANUP COMPLETE: {total_deleted} spam files deleted")
    
    # Stage and commit the cleanup
    if total_deleted > 0:
        print("\n📝 Committing cleanup...")
        try:
            subprocess.run(["git", "add", "-A"], check=True)
            subprocess.run([
                "git", "commit", "-m", 
                f"🧹 NUCLEAR CLEANUP: Deleted {total_deleted} additional spam files\n\nComplete elimination of all spam patterns"
            ], check=True)
            print("✅ Cleanup committed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Git commit failed: {e}")
    
    return total_deleted

def scan_directory():
    """Scan for potential spam files"""
    print("\n🔍 SCANNING FOR REMAINING SPAM...")
    
    all_py_files = glob.glob("*.py")
    potential_spam = []
    
    # Look for suspicious patterns
    suspicious_patterns = [
        lambda f: "improvement" in f.lower(),
        lambda f: "autonomous" in f.lower() and any(char.isdigit() for char in f),
        lambda f: "security_" in f.lower() and any(char.isdigit() for char in f),
        lambda f: "20250806" in f,
        lambda f: f.count("_") > 3,  # Files with lots of underscores
    ]
    
    legitimate_files = [
        "real_autonomous_evolution.py",
        "autonomous_evolution_system.py", 
        "autonomous_evolution_engine.py",
        "autonomous_frontier_ai.py",
        "autonomous_scheduler.py",
        "autonomous_self_evolution.py"
    ]
    
    for file in all_py_files:
        if file in legitimate_files:
            continue
            
        for pattern in suspicious_patterns:
            if pattern(file):
                potential_spam.append(file)
                break
    
    if potential_spam:
        print(f"⚠️ Found {len(potential_spam)} potentially suspicious files:")
        for file in potential_spam[:20]:  # Show first 20
            print(f"  - {file}")
        if len(potential_spam) > 20:
            print(f"  ... and {len(potential_spam) - 20} more")
    else:
        print("✅ No obvious spam patterns detected")
    
    return potential_spam

if __name__ == "__main__":
    print("🔥 FRONTIER AI SPAM ELIMINATION TOOL")
    print("This will delete ALL duplicate/spam files")
    
    # First scan for what's there
    suspicious = scan_directory()
    
    # Then do nuclear cleanup
    deleted = nuclear_cleanup()
    
    # Final scan
    remaining = scan_directory()
    
    print(f"\n📊 CLEANUP SUMMARY:")
    print(f"Files deleted: {deleted}")
    print(f"Suspicious files before: {len(suspicious)}")
    print(f"Suspicious files after: {len(remaining)}")
    
    if remaining:
        print(f"\n⚠️ WARNING: {len(remaining)} potentially suspicious files remain")
        print("You may need to review and delete these manually")
    else:
        print("\n🎉 SUCCESS: Repository appears clean of spam files!")
