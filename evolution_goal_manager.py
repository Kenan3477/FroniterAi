#!/usr/bin/env python3
"""
🎯 Evolution Goal Manager
Quick CLI interface for setting evolution goals and tasks
"""

import json
import requests
from pathlib import Path

class EvolutionGoalManager:
    def __init__(self, api_url="http://localhost:8002"):
        self.api_url = api_url
        
    def set_goals(self):
        """Interactive goal setting"""
        print("🎯 Evolution Goal Manager")
        print("========================")
        
        # Primary goal
        print("\n1. Primary Goal:")
        goals = [
            "general_optimization",
            "performance_boost", 
            "code_quality",
            "documentation",
            "security_hardening",
            "architecture_refactor"
        ]
        
        for i, goal in enumerate(goals, 1):
            print(f"   {i}. {goal}")
        
        choice = input("Select primary goal (1-6): ")
        try:
            primary_goal = goals[int(choice) - 1]
        except (ValueError, IndexError):
            primary_goal = "general_optimization"
        
        # Target areas
        print("\n2. Target Areas (enter numbers separated by commas):")
        areas = [
            "performance",
            "code_quality",
            "documentation", 
            "security",
            "testing",
            "architecture"
        ]
        
        for i, area in enumerate(areas, 1):
            print(f"   {i}. {area}")
        
        area_input = input("Select areas (e.g., 1,2,3): ")
        target_areas = []
        
        try:
            for num in area_input.split(','):
                idx = int(num.strip()) - 1
                if 0 <= idx < len(areas):
                    target_areas.append(areas[idx])
        except ValueError:
            target_areas = ["performance", "code_quality"]
        
        if not target_areas:
            target_areas = ["performance", "code_quality"]
        
        # Priority files
        print("\n3. Priority Files (optional):")
        print("   Enter file patterns, one per line (press Enter twice when done):")
        priority_files = []
        
        while True:
            pattern = input("   ")
            if not pattern.strip():
                break
            priority_files.append(pattern.strip())
        
        # Confirmation
        print(f"\n🎯 Evolution Goals:")
        print(f"   Primary: {primary_goal}")
        print(f"   Areas: {', '.join(target_areas)}")
        if priority_files:
            print(f"   Priority files: {', '.join(priority_files)}")
        
        confirm = input("\nApply these goals? (y/N): ")
        if confirm.lower() == 'y':
            self.update_goals({
                'primary_goal': primary_goal,
                'target_areas': target_areas,
                'priority_files': priority_files
            })
    
    def add_task(self):
        """Add a specific evolution task"""
        print("\n📋 Add Evolution Task")
        print("=====================")
        
        description = input("Task description: ")
        if not description.strip():
            print("❌ Task description required")
            return
        
        print("Priority levels:")
        print("   1. Low")
        print("   2. Medium") 
        print("   3. High")
        
        priority_choice = input("Select priority (1-3, default 2): ")
        priorities = ["low", "medium", "high"]
        
        try:
            priority = priorities[int(priority_choice) - 1]
        except (ValueError, IndexError):
            priority = "medium"
        
        self.add_evolution_task(description, priority)
    
    def update_goals(self, goals_data):
        """Send goals update to evolution system"""
        try:
            response = requests.post(f"{self.api_url}/api/update-goals", json=goals_data, timeout=5)
            
            if response.status_code == 200:
                print("✅ Goals updated successfully!")
            else:
                print("❌ Failed to update goals")
                
        except requests.exceptions.RequestException:
            print("⚠️  Evolution system not running - goals will be saved for next startup")
            self.save_goals_locally(goals_data)
    
    def add_evolution_task(self, description, priority):
        """Add task to evolution system"""
        try:
            task_data = {
                'description': description,
                'priority': priority
            }
            
            response = requests.post(f"{self.api_url}/api/add-task", json=task_data, timeout=5)
            
            if response.status_code == 200:
                print("✅ Task added successfully!")
            else:
                print("❌ Failed to add task")
                
        except requests.exceptions.RequestException:
            print("⚠️  Evolution system not running - task will be saved for next startup")
            self.save_task_locally(description, priority)
    
    def save_goals_locally(self, goals_data):
        """Save goals to local file for next startup"""
        goals_file = Path("evolution_goals.json")
        
        try:
            if goals_file.exists():
                with open(goals_file, 'r') as f:
                    existing = json.load(f)
            else:
                existing = {'goals': {}, 'tasks': []}
            
            existing['goals'] = goals_data
            
            with open(goals_file, 'w') as f:
                json.dump(existing, f, indent=2)
            
            print(f"💾 Goals saved to {goals_file}")
            
        except Exception as e:
            print(f"❌ Failed to save goals: {e}")
    
    def save_task_locally(self, description, priority):
        """Save task to local file for next startup"""
        goals_file = Path("evolution_goals.json")
        
        try:
            if goals_file.exists():
                with open(goals_file, 'r') as f:
                    existing = json.load(f)
            else:
                existing = {'goals': {}, 'tasks': []}
            
            task = {
                'description': description,
                'priority': priority,
                'saved_locally': True
            }
            
            existing['tasks'].append(task)
            
            with open(goals_file, 'w') as f:
                json.dump(existing, f, indent=2)
            
            print(f"💾 Task saved to {goals_file}")
            
        except Exception as e:
            print(f"❌ Failed to save task: {e}")
    
    def show_status(self):
        """Show current evolution status"""
        try:
            response = requests.get(f"{self.api_url}/api/status", timeout=5)
            
            if response.status_code == 200:
                status = response.json()
                print(f"\n📊 Evolution Status:")
                print(f"   Running: {'✅ Yes' if status['running'] else '❌ No'}")
                print(f"   Generation: {status['generation']}")
            else:
                print("❌ Failed to get status")
                
        except requests.exceptions.RequestException:
            print("⚠️  Evolution system not running")

def main():
    """Main CLI interface"""
    manager = EvolutionGoalManager()
    
    while True:
        print("\n🎯 Evolution Goal Manager")
        print("========================")
        print("1. Set evolution goals")
        print("2. Add specific task")
        print("3. Show evolution status")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ")
        
        if choice == '1':
            manager.set_goals()
        elif choice == '2':
            manager.add_task()
        elif choice == '3':
            manager.show_status()
        elif choice == '4':
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()
