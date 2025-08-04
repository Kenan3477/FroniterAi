#!/usr/bin/env python3
"""
Autonomous Evolution Scheduler for FrontierAI
Runs evolution cycles automatically at specified intervals
"""

import schedule
import time
import threading
import json
from datetime import datetime
from simple_config import get_config

class EvolutionScheduler:
    def __init__(self):
        # Import here to avoid circular dependency
        from autonomous_evolution_engine import get_autonomous_engine
        self.engine = get_autonomous_engine()
        self.config = get_config()
        self.is_running = False
        self.evolution_history = []
        
    def start_autonomous_evolution(self):
        """Start autonomous evolution scheduling"""
        if self.is_running:
            print("⚠️ Autonomous evolution already running")
            return
        
        print("🚀 STARTING AUTONOMOUS EVOLUTION SYSTEM")
        print("=" * 60)
        
        # Schedule evolution cycles
        evolution_interval = self.config.get('evolution.evolution_interval', 3600)  # Default 1 hour
        schedule.every(evolution_interval).seconds.do(self._run_evolution_cycle)
        
        # Schedule immediate first evolution
        schedule.every(30).seconds.do(self._run_evolution_cycle)
        
        self.is_running = True
        
        # Start scheduler in background thread
        scheduler_thread = threading.Thread(target=self._scheduler_loop)
        scheduler_thread.daemon = True
        scheduler_thread.start()
        
        print(f"✅ Autonomous evolution scheduled every {evolution_interval} seconds")
        print("🧬 System will continuously evolve and improve itself")
        print("📊 Check evolution_history.json for progress")
        
    def _scheduler_loop(self):
        """Main scheduler loop"""
        while self.is_running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def _run_evolution_cycle(self):
        """Run a complete evolution cycle"""
        print(f"\n🧬 AUTONOMOUS EVOLUTION CYCLE STARTED: {datetime.now()}")
        print("-" * 60)
        
        try:
            # Execute evolution
            result = self.engine.execute_full_evolution_cycle()
            
            # Log result
            self.evolution_history.append(result)
            
            # Save evolution history
            self._save_evolution_history()
            
            # Summary
            if 'error' not in result:
                successful = result.get('upgrades_successful', 0)
                attempted = result.get('upgrades_attempted', 0)
                
                print(f"\n✅ EVOLUTION CYCLE COMPLETE!")
                print(f"📊 {successful}/{attempted} upgrades successful")
                
                if successful > 0:
                    print(f"🎉 SYSTEM EVOLVED! {successful} improvements implemented")
                    print(f"🔗 Commit: {result.get('commit_hash', 'N/A')[:8]}")
                    
                    # Push to GitHub if configured
                    if self.config.get('evolution.auto_push', True):
                        self._push_to_github()
                else:
                    print("📈 No improvements needed at this time")
            else:
                print(f"❌ Evolution cycle failed: {result['error']}")
        
        except Exception as e:
            print(f"💥 Critical evolution error: {e}")
        
        print("-" * 60)
        
        # Clear this job (run only once for immediate evolution)
        return schedule.CancelJob
    
    def _push_to_github(self):
        """Push autonomous changes to GitHub"""
        try:
            repo = self.engine.repo
            origin = repo.remote('origin')
            origin.push()
            print("📤 Changes pushed to GitHub automatically")
        except Exception as e:
            print(f"⚠️ Failed to push to GitHub: {e}")
    
    def _save_evolution_history(self):
        """Save evolution history to file"""
        try:
            with open('evolution_history.json', 'w') as f:
                json.dump(self.evolution_history, f, indent=2)
        except Exception:
            pass
    
    def stop_autonomous_evolution(self):
        """Stop autonomous evolution"""
        self.is_running = False
        schedule.clear()
        print("🛑 Autonomous evolution stopped")
    
    def get_evolution_status(self):
        """Get current evolution status"""
        return {
            'is_running': self.is_running,
            'total_cycles': len(self.evolution_history),
            'last_evolution': self.evolution_history[-1] if self.evolution_history else None,
            'next_scheduled': str(schedule.jobs[0].next_run) if schedule.jobs else None
        }

# Global scheduler
evolution_scheduler = EvolutionScheduler()

def start_autonomous_system():
    """Start the autonomous evolution system"""
    evolution_scheduler.start_autonomous_evolution()

def get_evolution_scheduler():
    """Get the global evolution scheduler"""
    return evolution_scheduler

if __name__ == "__main__":
    # Start autonomous evolution if run directly
    start_autonomous_system()
    
    # Keep running
    try:
        while True:
            time.sleep(60)
            print(f"🔄 Autonomous evolution running... Next cycle scheduled")
    except KeyboardInterrupt:
        print("\n🛑 Stopping autonomous evolution...")
        evolution_scheduler.stop_autonomous_evolution()
