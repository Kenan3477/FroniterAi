#!/bin/bash
# Railway Build Script Override
# This script forces Railway to use our workspace configuration

echo "🚨 RAILWAY BUILD OVERRIDE ACTIVE 🚨"
echo "Repository: FroniterAi (Omnivox Backend)"
echo "Build Type: NPM Workspace Monorepo"
echo "Date: $(date)"

echo ""
echo "📁 Current Directory:"
pwd

echo ""
echo "📋 Directory Contents:"
ls -la

echo ""
echo "🔍 Checking for workspace configuration:"
if [ -f "package.json" ]; then
    echo "✅ Root package.json found"
    if grep -q "workspaces" package.json; then
        echo "✅ NPM workspace configuration detected"
    else
        echo "❌ No workspace configuration in package.json"
    fi
else
    echo "❌ No root package.json found"
fi

echo ""
echo "🔍 Checking backend directory:"
if [ -d "backend" ]; then
    echo "✅ Backend directory found"
    ls -la backend/ | head -10
else
    echo "❌ No backend directory found"
fi

echo ""
echo "🚨 Railway should use: npm install (NOT npm ci)"
echo "🚨 Reason: This is an NPM workspace monorepo"
echo "🚨 package-lock.json is managed at workspace root level"

echo ""
echo "📋 Correct build sequence:"
echo "1. npm install (installs all workspace dependencies)"  
echo "2. cd backend && npm run build"
echo "3. cd backend && npm run start"