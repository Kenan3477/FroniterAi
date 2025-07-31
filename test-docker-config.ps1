# 🐳 Frontier AI Docker Build Test Script (PowerShell)
# This script helps validate the Docker configuration

Write-Host "🚀 Testing Frontier AI Docker Configuration" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Check if Dockerfile exists
if (Test-Path "Dockerfile") {
    Write-Host "✅ Dockerfile found" -ForegroundColor Green
} else {
    Write-Host "❌ Dockerfile missing" -ForegroundColor Red
    exit 1
}

# Check if requirements.txt exists
if (Test-Path "requirements.txt") {
    Write-Host "✅ requirements.txt found" -ForegroundColor Green
} else {
    Write-Host "❌ requirements.txt missing" -ForegroundColor Red
    exit 1
}

# Check if app.py exists
if (Test-Path "app.py") {
    Write-Host "✅ app.py found" -ForegroundColor Green
} else {
    Write-Host "❌ app.py missing" -ForegroundColor Red
    exit 1
}

# Check if .dockerignore exists
if (Test-Path ".dockerignore") {
    Write-Host "✅ .dockerignore found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .dockerignore missing (optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Ready for Railway Deployment!" -ForegroundColor Green
Write-Host "   Railway will use the Dockerfile for containerized deployment"
Write-Host "   Expected build time: 2-4 minutes"
Write-Host ""
Write-Host "🌐 Deploy to Railway:" -ForegroundColor Cyan
Write-Host "   1. Go to railway.app"
Write-Host "   2. Connect your GitHub repository"
Write-Host "   3. Railway will detect and use the Dockerfile automatically"
Write-Host ""
