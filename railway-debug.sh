#!/bin/bash

# Railway Build Debug Script
echo "🚂 Railway Build Debug Information"
echo "=================================="
echo "Current directory: $(pwd)"
echo "Contents of current directory:"
ls -la

echo ""
echo "Looking for backend directory:"
if [ -d "backend" ]; then
    echo "✅ Found backend directory"
    echo "Contents of backend directory:"
    ls -la backend/
    
    if [ -f "backend/package.json" ]; then
        echo "✅ Found backend/package.json"
        echo "Backend package.json name:"
        cat backend/package.json | grep '"name"'
    else
        echo "❌ No backend/package.json found"
    fi
    
    if [ -f "backend/nixpacks.toml" ]; then
        echo "✅ Found backend/nixpacks.toml"
    else
        echo "❌ No backend/nixpacks.toml found"
    fi
else
    echo "❌ No backend directory found"
    echo "Available directories:"
    find . -maxdepth 1 -type d -name "*" | head -10
fi

echo ""
echo "Environment variables:"
echo "PWD: $PWD"
echo "HOME: $HOME"
echo "NODE_ENV: $NODE_ENV"

echo ""
echo "🚂 Railway should be configured to:"
echo "1. Root Directory: backend"
echo "2. Build Command: npm run build"
echo "3. Start Command: npm run start"