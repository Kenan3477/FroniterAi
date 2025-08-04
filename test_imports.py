import sys
print("Python version:", sys.version)

try:
    import git
    print("✅ GitPython imported successfully")
except Exception as e:
    print(f"❌ GitPython error: {e}")

try:
    import schedule
    print("✅ Schedule imported successfully")
except Exception as e:
    print(f"❌ Schedule error: {e}")

try:
    import psutil
    print("✅ Psutil imported successfully")
except Exception as e:
    print(f"❌ Psutil error: {e}")

try:
    from github_real_analyzer import get_github_analyzer
    print("✅ GitHub analyzer imported successfully")
except Exception as e:
    print(f"❌ GitHub analyzer error: {e}")

print("Basic imports test complete")
