@echo off
REM Frontier AI Model Deployment Script for Windows
REM This script automates the deployment of the AI model infrastructure

setlocal enabledelayedexpansion

REM Configuration
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development
if "%PROFILE%"=="" set PROFILE=dev
if "%GPU_ENABLED%"=="" set GPU_ENABLED=false

echo.
echo 🚀 Frontier AI Model Deployment Script
echo Environment: %ENVIRONMENT%
echo Profile: %PROFILE%
echo GPU Enabled: %GPU_ENABLED%
echo.

REM Function to check if Docker is running
:check_docker
echo Checking Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)
echo ✅ Docker is running

REM Function to check for GPU support
:check_gpu
if "%GPU_ENABLED%"=="true" (
    echo Checking GPU support...
    nvidia-smi >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ nvidia-smi not found. Please install NVIDIA drivers.
        exit /b 1
    )
    echo ✅ GPU support available
)
goto :eof

REM Function to create necessary directories
:create_directories
echo Creating directories...
if not exist "data\models" mkdir data\models
if not exist "data\logs" mkdir data\logs
if not exist "data\cache" mkdir data\cache
if not exist "ssl" mkdir ssl
echo ✅ Directories created
goto :eof

REM Function to generate SSL certificates for development
:generate_ssl_certs
if not exist "ssl\cert.pem" (
    echo Generating SSL certificates for development...
    openssl req -x509 -newkey rsa:4096 -keyout ssl\key.pem -out ssl\cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost" >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️ OpenSSL not found. Skipping SSL certificate generation.
        echo You can generate certificates manually or install OpenSSL.
    ) else (
        echo ✅ SSL certificates generated
    )
) else (
    echo ✅ SSL certificates already exist
)
goto :eof

REM Function to set up environment variables
:setup_environment
echo Setting up environment...
if not exist ".env" (
    echo Creating .env file...
    (
        echo # Database Configuration
        echo POSTGRES_PASSWORD=frontier_secure_password_12345
        echo.
        echo # JWT Configuration
        echo JWT_SECRET_KEY=your_jwt_secret_key_here_replace_with_secure_key
        echo.
        echo # OpenAI API Key ^(set this to your actual key^)
        echo # OPENAI_API_KEY=your_openai_api_key_here
        echo.
        echo # Environment
        echo ENVIRONMENT=%ENVIRONMENT%
        echo.
        echo # Model Configuration
        echo MODEL_CACHE_DIR=./data/models
        echo LOG_LEVEL=INFO
        echo.
        echo # Redis Configuration
        echo REDIS_URL=redis://localhost:6379
        echo.
        echo # Database URL
        echo DATABASE_URL=postgresql://frontier_user:frontier_secure_password@localhost:5432/frontier_ai
    ) > .env
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)
goto :eof

REM Function to build Docker images
:build_images
echo Building Docker images...
if "%GPU_ENABLED%"=="true" (
    docker-compose build app-gpu
) else (
    docker-compose build app-%PROFILE%
)
if %errorlevel% neq 0 (
    echo ❌ Failed to build Docker images
    exit /b 1
)
echo ✅ Docker images built
goto :eof

REM Function to start services
:start_services
echo Starting services...

REM Start infrastructure services first
docker-compose up -d redis postgres
if %errorlevel% neq 0 (
    echo ❌ Failed to start infrastructure services
    exit /b 1
)

REM Wait for services to be ready
echo Waiting for Redis and PostgreSQL to be ready...
timeout /t 15 /nobreak >nul

REM Initialize models
echo Initializing AI models...
docker-compose --profile init up model-init
if %errorlevel% neq 0 (
    echo ⚠️ Model initialization failed, but continuing...
)

REM Start application
if "%GPU_ENABLED%"=="true" (
    docker-compose --profile gpu up -d app-gpu nginx
) else (
    docker-compose --profile %PROFILE% up -d app-%PROFILE%
    if "%PROFILE%"=="prod" (
        docker-compose up -d nginx
    )
)
if %errorlevel% neq 0 (
    echo ❌ Failed to start application services
    exit /b 1
)

echo ✅ Services started
goto :eof

REM Function to show service status
:show_status
echo Service Status:
docker-compose ps
echo.

echo Service URLs:
if "%PROFILE%"=="dev" (
    echo API Documentation: http://localhost:8000/docs
    echo API Redoc: http://localhost:8000/redoc
    echo Jupyter Notebook: http://localhost:8888
) else (
    echo API Documentation: https://localhost/docs
    echo API Redoc: https://localhost/redoc
)
echo Health Check: http://localhost:8000/api/v1/ai/system/health
echo.
goto :eof

REM Function to run tests
:run_tests
echo Running system tests...

REM Wait a bit for services to fully start
echo Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Test health endpoint
echo Testing health endpoint...
curl -f http://localhost:8000/api/v1/ai/system/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Health check passed
) else (
    echo ❌ Health check failed
    exit /b 1
)

echo ✅ All tests passed
goto :eof

REM Function to stop services
:stop_services
echo Stopping services...
docker-compose down
echo ✅ Services stopped
goto :eof

REM Function to clean up
:cleanup
echo Cleaning up...
docker-compose down -v
docker system prune -f
echo ✅ Cleanup completed
goto :eof

REM Main deployment function
:deploy
echo Starting deployment...

call :check_docker
if %errorlevel% neq 0 exit /b 1

if "%GPU_ENABLED%"=="true" (
    call :check_gpu
    if %errorlevel% neq 0 exit /b 1
)

call :create_directories
call :generate_ssl_certs
call :setup_environment
call :build_images
if %errorlevel% neq 0 exit /b 1

call :start_services
if %errorlevel% neq 0 exit /b 1

call :show_status

echo.
echo 🎉 Deployment completed successfully!
echo.
echo To run tests: %~nx0 test
echo To stop services: %~nx0 stop
echo To clean up: %~nx0 cleanup
goto :eof

REM Script arguments handling
if "%1"=="" goto deploy
if "%1"=="deploy" goto deploy
if "%1"=="test" goto run_tests
if "%1"=="stop" goto stop_services
if "%1"=="cleanup" goto cleanup
if "%1"=="status" goto show_status

echo Usage: %~nx0 {deploy^|test^|stop^|cleanup^|status}
echo.
echo Commands:
echo   deploy  - Deploy the AI model infrastructure
echo   test    - Run system tests
echo   stop    - Stop all services
echo   cleanup - Stop services and clean up volumes
echo   status  - Show service status
echo.
echo Environment variables:
echo   ENVIRONMENT - development^|production (default: development)
echo   PROFILE     - dev^|prod (default: dev)
echo   GPU_ENABLED - true^|false (default: false)
exit /b 1
