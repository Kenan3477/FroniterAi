@echo off
@echo off
echo 🚀 FRONTIER AI - RAILWAY DEPLOYMENT
echo ==================================

railway whoami
if %errorlevel% neq 0 (
    echo ❌ Not authenticated. Please run: railway login
    exit /b 1
)

echo Deploying to Railway...
railway up

echo Getting deployment domain...
railway domain

echo.
echo ✅ Deployment complete! Check Railway dashboard for status.
echo =====================================

echo.
echo 📋 Prerequisites Check:
echo - Railway account logged in
echo - GITHUB_TOKEN environment variable set in Railway
echo - Local changes committed

echo.
echo 🔧 Deploying to Railway...

REM Try Railway CLI deployment
railway deploy

if %ERRORLEVEL% neq 0 (
    echo.
    echo ⚠️ Railway CLI deployment failed or not available
    echo.
    echo 📋 Alternative deployment methods:
    echo.
    echo 1. GitHub Integration (if network allows):
    echo    - Push to GitHub: git push origin main
    echo    - Railway will auto-deploy from GitHub
    echo.
    echo 2. Manual Railway Dashboard:
    echo    - Go to railway.app/dashboard
    echo    - Click Deploy button
    echo    - Select manual deployment
    echo.
    echo 3. ZIP Upload:
    echo    - Create ZIP of project files
    echo    - Upload via Railway dashboard
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Deployment initiated!
echo 🌐 Check your Railway dashboard for deployment status
echo 📊 Your dashboard should now show REAL GitHub data

pause
