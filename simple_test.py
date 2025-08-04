try:
    print("Testing autonomous evolution engine...")
    
    # First test basic dependencies
    import os
    import json
    import time
    from datetime import datetime
    from pathlib import Path
    print("✅ Basic imports OK")
    
    # Test git
    try:
        import git
        print("✅ GitPython available")
    except:
        print("❌ GitPython not available")
        
    # Test the engine class
    from autonomous_evolution_engine import AutonomousEvolutionEngine
    print("✅ AutonomousEvolutionEngine imported")
    
    # Test initialization (without git repo)
    engine = AutonomousEvolutionEngine(".")
    print("✅ Engine initialized")
    
    print("🎉 Autonomous Evolution Engine is ready!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
