# PowerShell Railway Deployment Script
Write-Host "🚀 FRONTIER AI - RAILWAY DEPLOYMENT" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

# Check authentication
Write-Host "Checking Railway authentication..." -ForegroundColor Yellow
$authResult = & railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with Railway" -ForegroundColor Red
    Write-Host "Please run: railway login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Authenticated: $authResult" -ForegroundColor Green

# Commit latest changes
Write-Host "Committing latest changes..." -ForegroundColor Yellow
git add .
git commit -m "Railway deployment: Comprehensive Frontier AI System"

# Deploy to Railway
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Cyan
$deployResult = & railway up 2>&1
Write-Host $deployResult

# Get domain
Write-Host "Getting deployment domain..." -ForegroundColor Yellow
$domainResult = & railway domain 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "🌐 Deployment URL: https://$domainResult" -ForegroundColor Green
} else {
    Write-Host "⚠️ Domain not ready yet. Check Railway dashboard." -ForegroundColor Yellow
}

Write-Host "✅ Deployment process complete!" -ForegroundColor Green
