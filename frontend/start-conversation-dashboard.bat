@echo off
setlocal enabledelayedexpansion

REM Frontier Conversational Dashboard Startup Script for Windows
REM This script sets up and starts the React conversational dashboard

echo 🚀 Starting Frontier Conversational Dashboard...

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js detected: 
node --version

REM Check if we're in the frontend directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the frontend directory.
    pause
    exit /b 1
)

REM Backup original package.json and use conversation-specific one
if exist "package-conversation.json" (
    echo [INFO] Setting up conversation dashboard configuration...
    
    REM Backup original if it exists and isn't already backed up
    if exist "package.json" if not exist "package-original.json" (
        copy "package.json" "package-original.json" >nul
        echo [INFO] Original package.json backed up as package-original.json
    )
    
    REM Use conversation-specific package.json
    copy "package-conversation.json" "package.json" >nul
    echo [SUCCESS] Conversation dashboard package.json activated
) else (
    echo [WARNING] package-conversation.json not found, using existing package.json
)

REM Check if TypeScript config exists, use conversation-specific one if available
if exist "tsconfig-conversation.json" (
    if exist "tsconfig.json" if not exist "tsconfig-original.json" (
        copy "tsconfig.json" "tsconfig-original.json" >nul
        echo [INFO] Original tsconfig.json backed up as tsconfig-original.json
    )
    copy "tsconfig-conversation.json" "tsconfig.json" >nul
    echo [SUCCESS] Conversation dashboard TypeScript config activated
)

REM Install dependencies
echo [INFO] Installing dependencies...
where yarn >nul 2>&1
if %ERRORLEVEL% equ 0 (
    yarn install
) else (
    npm install
)
echo [SUCCESS] Dependencies installed successfully

REM Check if environment file exists
if not exist ".env" if not exist ".env.local" (
    if exist ".env.development" (
        copy ".env.development" ".env.local" >nul
        echo [INFO] Created .env.local from .env.development
    ) else (
        echo [WARNING] No environment file found. Creating basic .env.local...
        (
            echo # Frontier Conversational Dashboard Environment
            echo REACT_APP_API_URL=http://localhost:8000
            echo REACT_APP_WS_URL=ws://localhost:8000
            echo REACT_APP_NAME=Frontier Dashboard
            echo REACT_APP_ENVIRONMENT=development
            echo REACT_APP_DEBUG=true
        ) > .env.local
    )
)

REM Check if backend is running
echo [INFO] Checking backend API availability...
curl -f -s "http://localhost:8000/health" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Backend API is running at http://localhost:8000
) else (
    echo [WARNING] Backend API not available at http://localhost:8000
    echo [WARNING] Make sure to start your backend server before using the conversational features
)

REM Create public directory if it doesn't exist
if not exist "public" (
    mkdir public
    echo [INFO] Created public directory
)

REM Create a simple favicon if it doesn't exist
if not exist "public\frontier-icon.svg" (
    (
        echo ^<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"^>
        echo   ^<rect width="32" height="32" fill="#2563eb"/^>
        echo   ^<path d="M8 12l8-4 8 4v8l-8 4-8-4z" fill="white"/^>
        echo   ^<circle cx="16" cy="16" r="2" fill="#2563eb"/^>
        echo ^</svg^>
    ) > public\frontier-icon.svg
    echo [INFO] Created Frontier icon
)

REM Display startup information
echo.
echo [SUCCESS] 🎉 Frontier Conversational Dashboard is starting!
echo.
echo Dashboard will be available at: http://localhost:3001
echo API Backend expected at: http://localhost:8000
echo.
echo Features available:
echo   ✨ AI-powered conversational interface
echo   📊 Real-time business metrics
echo   🎙️ Voice input capabilities
echo   🔔 Smart notifications
echo   🌙 Dark mode support
echo   📱 Responsive design
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the development server
where yarn >nul 2>&1
if %ERRORLEVEL% equ 0 (
    yarn dev
) else (
    npm run dev
)

REM Restore original configuration on exit
if exist "package-original.json" (
    copy "package-original.json" "package.json" >nul
    echo [INFO] Restored original package.json
)

if exist "tsconfig-original.json" (
    copy "tsconfig-original.json" "tsconfig.json" >nul
    echo [INFO] Restored original tsconfig.json
)

pause
