#!/bin/bash
# 🐳 Frontier AI Docker Build Test Script
# This script helps validate the Docker configuration

echo "🚀 Testing Frontier AI Docker Configuration"
echo "==========================================="

# Check if Dockerfile exists
if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile found"
else
    echo "❌ Dockerfile missing"
    exit 1
fi

# Check if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "✅ requirements.txt found"
else
    echo "❌ requirements.txt missing"
    exit 1
fi

# Check if app.py exists
if [ -f "app.py" ]; then
    echo "✅ app.py found"
else
    echo "❌ app.py missing"
    exit 1
fi

# Check if .dockerignore exists
if [ -f ".dockerignore" ]; then
    echo "✅ .dockerignore found"
else
    echo "⚠️  .dockerignore missing (optional)"
fi

echo ""
echo "🎯 Ready for Railway Deployment!"
echo "   Railway will use the Dockerfile for containerized deployment"
echo "   Expected build time: 2-4 minutes"
echo ""
echo "🌐 Deploy to Railway:"
echo "   1. Go to railway.app"
echo "   2. Connect your GitHub repository"
echo "   3. Railway will detect and use the Dockerfile automatically"
echo ""
