#!/usr/bin/env python3
"""
Test script for the real evolution system
"""

import os
import sys
import traceback
from pathlib import Path

def test_evolution_system():
    print("🚀 Testing Frontier AI Evolution System")
    print("=" * 50)
    
    try:
        # Import the system
        from comprehensive_evolution_system import ComprehensiveEvolutionSystem
        print("✅ Import successful")
        
        # Create system instance
        workspace_path = Path.cwd()
        system = ComprehensiveEvolutionSystem(str(workspace_path))
        print(f"✅ System created with workspace: {workspace_path}")
        
        # Test adding a task
        print("\n🎯 Testing task creation...")
        result = system.add_task("Create user profile component", "ui")
        print(f"✅ Task result: {result}")
        
        # Check for generated files
        print("\n📂 Checking for generated files...")
        generated_dir = workspace_path / "generated_files"
        
        if generated_dir.exists():
            print(f"✅ Found generated_files directory: {generated_dir}")
            
            # List all files
            files_found = []
            for root, dirs, files in os.walk(generated_dir):
                for file in files:
                    file_path = Path(root) / file
                    size = file_path.stat().st_size
                    files_found.append((str(file_path), size))
            
            if files_found:
                print(f"✅ Found {len(files_found)} generated files:")
                for file_path, size in files_found[:10]:  # Show first 10
                    relative_path = Path(file_path).relative_to(workspace_path)
                    print(f"   📄 {relative_path} ({size:,} bytes)")
                
                if len(files_found) > 10:
                    print(f"   ... and {len(files_found)-10} more files")
                    
                # Show content of first file
                if files_found:
                    first_file = Path(files_found[0][0])
                    print(f"\n📖 Sample content from {first_file.name}:")
                    try:
                        with open(first_file, 'r', encoding='utf-8') as f:
                            content = f.read()[:500]  # First 500 chars
                            print(f"   {content}")
                            if len(content) == 500:
                                print("   ...")
                    except Exception as e:
                        print(f"   Error reading file: {e}")
                        
            else:
                print("⚠️ generated_files directory exists but is empty")
        else:
            print("❌ No generated_files directory found")
        
        # Test evolution data
        print("\n📊 Testing evolution data...")
        evolution_data = system.get_evolution_data()
        print("Current evolution metrics:")
        for key, value in evolution_data.items():
            print(f"   {key}: {value}")
            
        print("\n🎉 Evolution system test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        print("\n📊 Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_evolution_system()
    sys.exit(0 if success else 1)
