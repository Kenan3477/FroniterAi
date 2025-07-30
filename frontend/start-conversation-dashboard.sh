#!/bin/bash

# Frontier Conversational Dashboard Startup Script
# This script sets up and starts the React conversational dashboard

set -e  # Exit on any error

echo "🚀 Starting Frontier Conversational Dashboard..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Backup original package.json and use conversation-specific one
if [ -f "package-conversation.json" ]; then
    print_status "Setting up conversation dashboard configuration..."
    
    # Backup original if it exists and isn't already backed up
    if [ -f "package.json" ] && [ ! -f "package-original.json" ]; then
        cp package.json package-original.json
        print_status "Original package.json backed up as package-original.json"
    fi
    
    # Use conversation-specific package.json
    cp package-conversation.json package.json
    print_success "Conversation dashboard package.json activated"
else
    print_warning "package-conversation.json not found, using existing package.json"
fi

# Check if TypeScript config exists, use conversation-specific one if available
if [ -f "tsconfig-conversation.json" ]; then
    if [ -f "tsconfig.json" ] && [ ! -f "tsconfig-original.json" ]; then
        cp tsconfig.json tsconfig-original.json
        print_status "Original tsconfig.json backed up as tsconfig-original.json"
    fi
    cp tsconfig-conversation.json tsconfig.json
    print_success "Conversation dashboard TypeScript config activated"
fi

# Install dependencies
print_status "Installing dependencies..."
if command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi
print_success "Dependencies installed successfully"

# Check if environment file exists
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    if [ -f ".env.development" ]; then
        cp .env.development .env.local
        print_status "Created .env.local from .env.development"
    else
        print_warning "No environment file found. Creating basic .env.local..."
        cat > .env.local << EOF
# Frontier Conversational Dashboard Environment
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_NAME=Frontier Dashboard
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG=true
EOF
    fi
fi

# Check if backend is running
print_status "Checking backend API availability..."
if curl -f -s "http://localhost:8000/health" > /dev/null 2>&1; then
    print_success "Backend API is running at http://localhost:8000"
else
    print_warning "Backend API not available at http://localhost:8000"
    print_warning "Make sure to start your backend server before using the conversational features"
fi

# Create public directory if it doesn't exist
if [ ! -d "public" ]; then
    mkdir -p public
    print_status "Created public directory"
fi

# Create a simple favicon if it doesn't exist
if [ ! -f "public/favicon.ico" ]; then
    cat > public/frontier-icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#2563eb"/>
  <path d="M8 12l8-4 8 4v8l-8 4-8-4z" fill="white"/>
  <circle cx="16" cy="16" r="2" fill="#2563eb"/>
</svg>
EOF
    print_status "Created Frontier icon"
fi

# Function to start the development server
start_dev_server() {
    print_status "Starting development server on port 3001..."
    echo
    print_success "🎉 Frontier Conversational Dashboard is starting!"
    echo
    echo -e "${BLUE}Dashboard will be available at:${NC} http://localhost:3001"
    echo -e "${BLUE}API Backend expected at:${NC} http://localhost:8000"
    echo
    echo -e "${YELLOW}Features available:${NC}"
    echo "  ✨ AI-powered conversational interface"
    echo "  📊 Real-time business metrics"
    echo "  🎙️ Voice input capabilities"
    echo "  🔔 Smart notifications"
    echo "  🌙 Dark mode support"
    echo "  📱 Responsive design"
    echo
    echo -e "${GREEN}Press Ctrl+C to stop the server${NC}"
    echo

    # Start the server
    if command -v yarn &> /dev/null; then
        yarn dev
    else
        npm run dev
    fi
}

# Function to restore original configuration
restore_original() {
    if [ -f "package-original.json" ]; then
        cp package-original.json package.json
        print_status "Restored original package.json"
    fi
    
    if [ -f "tsconfig-original.json" ]; then
        cp tsconfig-original.json tsconfig.json
        print_status "Restored original tsconfig.json"
    fi
}

# Trap to restore original config on exit
trap restore_original EXIT

# Start the development server
start_dev_server
