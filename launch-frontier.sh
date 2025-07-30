#!/bin/bash

# Frontier System Launch Script
echo "🚀 Starting Frontier System Components..."

# Navigate to Frontier directory
cd "$(dirname "$0")/.."

echo "📁 Current directory: $(pwd)"

# Check if we're in the right directory
if [ ! -f "run_frontier.py" ]; then
    echo "❌ Error: run_frontier.py not found. Please run this script from the Frontier directory."
    exit 1
fi

echo "✅ Found Frontier system files"

# Function to start a service in background
start_service() {
    local service_name=$1
    local command=$2
    
    echo "🔄 Starting $service_name..."
    
    # Start service in background and capture PID
    $command &
    local pid=$!
    
    echo "✅ $service_name started with PID: $pid"
    echo $pid > "${service_name,,}.pid"
}

# Start Backend API
echo "🌐 Starting Backend API Server..."
start_service "Backend" "python run_frontier.py"

# Wait a moment for backend to start
sleep 3

# Start Frontend Development Server
echo "🎨 Starting Frontend Development Server..."
cd frontend
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    start_service "Frontend" "npm run dev"
else
    echo "⚠️  package.json not found, starting simple HTTP server..."
    start_service "Frontend" "python -m http.server 3000"
fi

cd ..

# Start AI Processing Engine
echo "🤖 Starting AI Processing Engine..."
start_service "AI-Engine" "python -c 'from modules.ai_engine import start_ai_engine; start_ai_engine()'"

# Start Beta Dashboard
echo "🧪 Starting Beta Program Dashboard..."
start_service "Beta-Dashboard" "python launch_beta_dashboard.py"

# Start Production Dashboard
echo "📊 Starting Production Dashboard..."
start_service "Production-Dashboard" "python launch_product_dashboard.py"

echo ""
echo "🎉 Frontier System Launch Complete!"
echo ""
echo "📋 Services Started:"
echo "   🌐 Backend API: http://localhost:8000"
echo "   🎨 Frontend: http://localhost:3000"
echo "   🤖 AI Engine: Running"
echo "   🧪 Beta Dashboard: http://localhost:8001"
echo "   📊 Production Dashboard: http://localhost:8002"
echo ""
echo "🔍 Service PIDs saved to *.pid files"
echo "🛑 To stop all services, run: ./stop-frontier.sh"
echo ""
echo "✅ System is ready for use!"
