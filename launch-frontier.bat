@echo off
echo 🚀 Starting Frontier System Components...

rem Navigate to Frontier directory
cd /d "%~dp0"

echo 📁 Current directory: %cd%

rem Check if we're in the right directory
if not exist "run_frontier.py" (
    echo ❌ Error: run_frontier.py not found. Please run this script from the Frontier directory.
    pause
    exit /b 1
)

echo ✅ Found Frontier system files

rem Start Backend API
echo 🌐 Starting Backend API Server...
start "Frontier Backend" python run_frontier.py

rem Wait a moment for backend to start
timeout /t 3 /nobreak >nul

rem Start Frontend Development Server
echo 🎨 Starting Frontend Development Server...
cd frontend
if exist "package.json" (
    if not exist "node_modules" (
        echo 📦 Installing frontend dependencies...
        npm install
    )
    start "Frontier Frontend" npm run dev
) else (
    echo ⚠️  package.json not found, starting simple HTTP server...
    start "Frontier Frontend" python -m http.server 3000
)

cd ..

rem Start AI Processing Engine
echo 🤖 Starting AI Processing Engine...
start "Frontier AI" python -c "from modules.ai_engine import start_ai_engine; start_ai_engine()"

rem Start Beta Dashboard
echo 🧪 Starting Beta Program Dashboard...
start "Beta Dashboard" python launch_beta_dashboard.py

rem Start Production Dashboard
echo 📊 Starting Production Dashboard...
start "Production Dashboard" python launch_product_dashboard.py

echo.
echo 🎉 Frontier System Launch Complete!
echo.
echo 📋 Services Started:
echo    🌐 Backend API: http://localhost:8000
echo    🎨 Frontend: http://localhost:3000
echo    🤖 AI Engine: Running
echo    🧪 Beta Dashboard: http://localhost:8001
echo    📊 Production Dashboard: http://localhost:8002
echo.
echo ✅ System is ready for use!
echo.
pause
