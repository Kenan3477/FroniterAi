#!/usr/bin/env python3
"""
PROVE SELF-EVOLUTION DEPLOYMENT TEST
===================================
Deploy to Railway and GitHub to PROVE if the system is truly self-evolving
or just bullshit automation.
"""

import os
import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

class ProveEvolutionDeployment:
    """Prove the evolution system by deploying to production"""
    
    def __init__(self):
        self.deployment_log = []
        self.start_time = datetime.now()
        
    def log_step(self, step: str, success: bool, details: str = ""):
        """Log deployment step"""
        entry = {
            "step": step,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.deployment_log.append(entry)
        
        status = "✅" if success else "❌"
        print(f"{status} {step}")
        if details:
            print(f"   {details}")
    
    def check_github_setup(self) -> bool:
        """Check if GitHub is properly configured"""
        print("🔍 CHECKING GITHUB SETUP")
        print("-" * 40)
        
        try:
            # Check if we're in a git repo
            result = subprocess.run(['git', 'status'], capture_output=True, text=True)
            if result.returncode != 0:
                self.log_step("Git Repository", False, "Not a git repository")
                return False
            
            # Check git remote
            result = subprocess.run(['git', 'remote', '-v'], capture_output=True, text=True)
            if 'github.com' not in result.stdout:
                self.log_step("GitHub Remote", False, "No GitHub remote configured")
                return False
            
            # Check for GitHub token
            github_token = os.getenv('GITHUB_TOKEN')
            if not github_token:
                self.log_step("GitHub Token", False, "GITHUB_TOKEN environment variable not set")
                return False
            
            self.log_step("GitHub Setup", True, "GitHub configured and ready")
            return True
            
        except Exception as e:
            self.log_step("GitHub Setup", False, f"Error: {e}")
            return False
    
    def check_railway_setup(self) -> bool:
        """Check if Railway is properly configured"""
        print("\n🚄 CHECKING RAILWAY SETUP")
        print("-" * 40)
        
        try:
            # Check for Railway token
            railway_token = os.getenv('RAILWAY_TOKEN')
            if not railway_token:
                self.log_step("Railway Token", False, "RAILWAY_TOKEN environment variable not set")
                return False
            
            # Check for railway.json or railway.toml
            railway_configs = ['railway.json', 'railway.toml', 'Procfile']
            config_found = False
            for config in railway_configs:
                if Path(config).exists():
                    config_found = True
                    break
            
            if not config_found:
                self.log_step("Railway Config", False, "No Railway configuration files found")
                return False
            
            self.log_step("Railway Setup", True, "Railway configured and ready")
            return True
            
        except Exception as e:
            self.log_step("Railway Setup", False, f"Error: {e}")
            return False
    
    def test_evolution_system_readiness(self) -> bool:
        """Test if the evolution system is ready for deployment"""
        print("\n🧠 TESTING EVOLUTION SYSTEM READINESS")
        print("-" * 40)
        
        try:
            # Check for key evolution files
            required_files = [
                'systematic_evolution_engine.py',
                'deep_capability_analyzer.py',
                'frontier_competitive_intelligence.py'
            ]
            
            missing_files = []
            for file_name in required_files:
                if not Path(file_name).exists():
                    missing_files.append(file_name)
            
            if missing_files:
                self.log_step("Evolution Files", False, f"Missing: {missing_files}")
                return False
            
            # Check evolution improvements log
            if not Path("evolution_improvements.json").exists():
                self.log_step("Evolution Log", False, "No evolution improvements logged")
                return False
            
            # Load and verify improvements
            with open("evolution_improvements.json", 'r') as f:
                data = json.load(f)
                improvements = data.get("implemented", [])
            
            if len(improvements) < 5:
                self.log_step("Evolution History", False, f"Only {len(improvements)} improvements - need more evidence")
                return False
            
            self.log_step("Evolution System", True, f"{len(improvements)} improvements verified")
            return True
            
        except Exception as e:
            self.log_step("Evolution System", False, f"Error: {e}")
            return False
    
    def create_deployment_app(self) -> bool:
        """Create a minimal app that demonstrates self-evolution"""
        print("\n🚀 CREATING DEPLOYMENT APP")
        print("-" * 40)
        
        try:
            # Create main deployment app
            app_content = '''#!/usr/bin/env python3
"""
FRONTIER AI - SELF-EVOLVING SYSTEM
=================================
This is the REAL test - deploy and see if it actually evolves itself.
"""

import os
import json
import time
import threading
from datetime import datetime
from pathlib import Path
from flask import Flask, jsonify, render_template_string

app = Flask(__name__)

class LiveEvolutionMonitor:
    """Monitor and trigger real evolution in production"""
    
    def __init__(self):
        self.evolution_count = 0
        self.last_evolution = None
        self.is_evolving = False
        
    def start_evolution_cycle(self):
        """Start continuous evolution monitoring"""
        def evolution_worker():
            while True:
                try:
                    if not self.is_evolving:
                        self.trigger_evolution()
                    time.sleep(300)  # Evolve every 5 minutes
                except Exception as e:
                    print(f"Evolution error: {e}")
                    time.sleep(60)
        
        threading.Thread(target=evolution_worker, daemon=True).start()
    
    def trigger_evolution(self):
        """Trigger actual evolution process"""
        self.is_evolving = True
        
        try:
            # Import evolution system
            if Path("systematic_evolution_engine.py").exists():
                import systematic_evolution_engine
                
                # Reload the module to get latest changes
                import importlib
                importlib.reload(systematic_evolution_engine)
                
                # Trigger evolution
                engine = systematic_evolution_engine.SystematicEvolutionEngine()
                improvements = engine.implement_systematic_improvements(max_improvements=1)
                
                if improvements:
                    self.evolution_count += 1
                    self.last_evolution = datetime.now()
                    
                    # Log evolution
                    evolution_log = {
                        "count": self.evolution_count,
                        "timestamp": datetime.now().isoformat(),
                        "improvements": improvements
                    }
                    
                    with open("live_evolution_log.json", "w") as f:
                        json.dump(evolution_log, f, indent=2)
                    
                    print(f"🧠 EVOLUTION #{self.evolution_count}: {len(improvements)} improvements")
                    return True
                else:
                    print("🧠 No new improvements needed")
                    return False
            else:
                print("❌ Evolution engine not found")
                return False
                
        except Exception as e:
            print(f"❌ Evolution failed: {e}")
            return False
        finally:
            self.is_evolving = False

# Global evolution monitor
evolution_monitor = LiveEvolutionMonitor()

@app.route('/')
def home():
    """Home page showing evolution status"""
    template = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Frontier AI - Self-Evolving System</title>
        <meta http-equiv="refresh" content="30">
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #1a1a1a; color: #fff; }
            .container { max-width: 800px; margin: 0 auto; }
            .status { padding: 20px; border-radius: 10px; margin: 20px 0; }
            .evolving { background: #2d5a27; border: 2px solid #4caf50; }
            .idle { background: #2d2d2d; border: 2px solid #666; }
            .evolution-log { background: #1e3a5f; border: 2px solid #2196f3; }
            .counter { font-size: 2em; color: #4caf50; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧠 Frontier AI - Self-Evolving System</h1>
            
            <div class="status {{ 'evolving' if is_evolving else 'idle' }}">
                <h2>Evolution Status: {{ 'EVOLVING' if is_evolving else 'MONITORING' }}</h2>
                <div class="counter">Evolution Count: {{ evolution_count }}</div>
                <p>Last Evolution: {{ last_evolution or 'Never' }}</p>
            </div>
            
            <div class="evolution-log">
                <h3>🔬 Live Evolution Monitoring</h3>
                <p>This system is continuously monitoring its own code and implementing improvements automatically.</p>
                <p>Refresh this page to see real evolution happening in production.</p>
                
                <h4>Recent Improvements:</h4>
                <ul>
                {% for improvement in recent_improvements %}
                    <li>{{ improvement }}</li>
                {% endfor %}
                </ul>
            </div>
            
            <div class="status">
                <h3>🎯 PROOF OF SELF-EVOLUTION</h3>
                <p>If you see the evolution count increasing and new improvements appearing, 
                   this system is ACTUALLY self-evolving in production.</p>
                <p>No bullshit - just real autonomous improvement.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Get recent improvements
    recent_improvements = []
    try:
        if Path("evolution_improvements.json").exists():
            with open("evolution_improvements.json", 'r') as f:
                data = json.load(f)
                improvements = data.get("implemented", [])
                recent_improvements = improvements[-5:]  # Last 5
    except:
        pass
    
    return render_template_string(template, 
                                is_evolving=evolution_monitor.is_evolving,
                                evolution_count=evolution_monitor.evolution_count,
                                last_evolution=evolution_monitor.last_evolution,
                                recent_improvements=recent_improvements)

@app.route('/api/evolution-status')
def evolution_status():
    """API endpoint for evolution status"""
    return jsonify({
        "is_evolving": evolution_monitor.is_evolving,
        "evolution_count": evolution_monitor.evolution_count,
        "last_evolution": evolution_monitor.last_evolution.isoformat() if evolution_monitor.last_evolution else None,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/trigger-evolution')
def trigger_evolution():
    """Manually trigger evolution for testing"""
    success = evolution_monitor.trigger_evolution()
    return jsonify({
        "success": success,
        "evolution_count": evolution_monitor.evolution_count,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("🚀 STARTING FRONTIER AI SELF-EVOLVING SYSTEM")
    print("=" * 50)
    
    # Start evolution monitoring
    evolution_monitor.start_evolution_cycle()
    
    # Start Flask app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
'''
            
            with open("deploy_evolution_app.py", "w") as f:
                f.write(app_content)
            
            self.log_step("Deployment App", True, "Created deploy_evolution_app.py")
            return True
            
        except Exception as e:
            self.log_step("Deployment App", False, f"Error: {e}")
            return False
    
    def create_deployment_configs(self) -> bool:
        """Create deployment configuration files"""
        print("\n⚙️ CREATING DEPLOYMENT CONFIGS")
        print("-" * 40)
        
        try:
            # Create Procfile for Railway
            procfile_content = "web: python deploy_evolution_app.py"
            with open("Procfile", "w") as f:
                f.write(procfile_content)
            
            # Create requirements.txt
            requirements_content = """flask==2.3.3
requests==2.31.0
python-dotenv==1.0.0
"""
            with open("requirements.txt", "w") as f:
                f.write(requirements_content)
            
            # Create railway.json
            railway_config = {
                "build": {
                    "builder": "NIXPACKS"
                },
                "deploy": {
                    "startCommand": "python deploy_evolution_app.py",
                    "healthcheckPath": "/",
                    "healthcheckTimeout": 100
                }
            }
            with open("railway.json", "w") as f:
                json.dump(railway_config, f, indent=2)
            
            self.log_step("Deployment Configs", True, "Created Procfile, requirements.txt, railway.json")
            return True
            
        except Exception as e:
            self.log_step("Deployment Configs", False, f"Error: {e}")
            return False
    
    def deploy_to_github(self) -> bool:
        """Deploy to GitHub"""
        print("\n📤 DEPLOYING TO GITHUB")
        print("-" * 40)
        
        try:
            # Add all files
            result = subprocess.run(['git', 'add', '.'], capture_output=True, text=True)
            if result.returncode != 0:
                self.log_step("Git Add", False, result.stderr)
                return False
            
            # Commit changes
            commit_msg = f"Deploy self-evolving system - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            result = subprocess.run(['git', 'commit', '-m', commit_msg], capture_output=True, text=True)
            if result.returncode != 0 and "nothing to commit" not in result.stdout:
                self.log_step("Git Commit", False, result.stderr)
                return False
            
            # Push to GitHub
            result = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, text=True)
            if result.returncode != 0:
                self.log_step("GitHub Push", False, result.stderr)
                return False
            
            self.log_step("GitHub Deployment", True, "Successfully pushed to GitHub")
            return True
            
        except Exception as e:
            self.log_step("GitHub Deployment", False, f"Error: {e}")
            return False
    
    def deploy_to_railway(self) -> bool:
        """Deploy to Railway (simulated - would need railway CLI)"""
        print("\n🚄 DEPLOYING TO RAILWAY")
        print("-" * 40)
        
        try:
            # Check if railway CLI is available
            result = subprocess.run(['railway', '--version'], capture_output=True, text=True)
            if result.returncode != 0:
                self.log_step("Railway CLI", False, "Railway CLI not installed")
                # Create deployment instructions instead
                instructions = """
RAILWAY DEPLOYMENT INSTRUCTIONS:
1. Install Railway CLI: npm install -g @railway/cli
2. Login to Railway: railway login
3. Link project: railway link
4. Deploy: railway up

OR use GitHub integration:
1. Connect GitHub repo in Railway dashboard
2. Deploy from main branch
3. Set environment variables if needed
"""
                with open("RAILWAY_DEPLOY_INSTRUCTIONS.txt", "w") as f:
                    f.write(instructions)
                
                self.log_step("Railway Deployment", False, "Railway CLI not available - created instructions")
                return False
            
            # Try to deploy with railway CLI
            result = subprocess.run(['railway', 'up'], capture_output=True, text=True)
            if result.returncode != 0:
                self.log_step("Railway Deploy", False, result.stderr)
                return False
            
            self.log_step("Railway Deployment", True, "Successfully deployed to Railway")
            return True
            
        except Exception as e:
            self.log_step("Railway Deployment", False, f"Error: {e}")
            return False
    
    def generate_deployment_report(self):
        """Generate final deployment report"""
        print("\n" + "=" * 60)
        print("🚀 DEPLOYMENT REPORT - PROVE SELF-EVOLUTION")
        print("=" * 60)
        
        total_steps = len(self.deployment_log)
        successful_steps = len([s for s in self.deployment_log if s["success"]])
        
        print(f"📊 DEPLOYMENT SUMMARY:")
        print(f"   Total Steps: {total_steps}")
        print(f"   Successful: {successful_steps}")
        print(f"   Failed: {total_steps - successful_steps}")
        print(f"   Success Rate: {successful_steps/total_steps*100:.1f}%")
        
        print(f"\n📋 DEPLOYMENT STEPS:")
        for i, step in enumerate(self.deployment_log, 1):
            status = "✅" if step["success"] else "❌"
            print(f"   {i}. {status} {step['step']}")
            if step["details"]:
                print(f"      {step['details']}")
        
        # Final assessment
        print(f"\n🎯 FINAL ASSESSMENT:")
        if successful_steps >= total_steps * 0.8:
            print("✅ DEPLOYMENT SUCCESSFUL")
            print("✅ Self-evolution system is ready for production testing")
            print("✅ Access the deployed app to see REAL evolution in action")
            print("\n🧠 PROOF OF CONCEPT:")
            print("   1. Visit the deployed URL")
            print("   2. Watch the evolution counter")
            print("   3. Refresh periodically to see new improvements")
            print("   4. Check the API endpoints for real-time data")
            print("\n🚨 REALITY CHECK:")
            print("   If the evolution counter DOESN'T increase over time,")
            print("   then it's bullshit automation, not real self-evolution.")
        else:
            print("❌ DEPLOYMENT FAILED")
            print("❌ Cannot prove self-evolution without successful deployment")
        
        # Save detailed report
        report_file = f"deployment_proof_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "deployment_summary": {
                    "total_steps": total_steps,
                    "successful": successful_steps,
                    "failed": total_steps - successful_steps,
                    "success_rate": successful_steps/total_steps*100
                },
                "deployment_log": self.deployment_log,
                "deployment_duration": str(datetime.now() - self.start_time)
            }, f, indent=2)
        
        print(f"\n📁 Detailed report saved: {report_file}")

def main():
    """Main deployment proof process"""
    
    print("🚨 PROVE SELF-EVOLUTION - DEPLOYMENT TEST")
    print("=" * 60)
    print("Let's deploy this to production and see if it ACTUALLY evolves!")
    print("No more bullshit - this is the real test.")
    print()
    
    deployer = ProveEvolutionDeployment()
    
    # Run deployment steps
    steps = [
        deployer.check_github_setup,
        deployer.check_railway_setup,
        deployer.test_evolution_system_readiness,
        deployer.create_deployment_app,
        deployer.create_deployment_configs,
        deployer.deploy_to_github,
        deployer.deploy_to_railway
    ]
    
    for step_func in steps:
        try:
            step_func()
        except Exception as e:
            print(f"❌ Step failed with exception: {e}")
        
        time.sleep(1)
    
    # Generate final report
    deployer.generate_deployment_report()

if __name__ == "__main__":
    main()
