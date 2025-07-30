# PowerShell Production Infrastructure Verification Script
# Comprehensive validation of all deployment components

param(
    [switch]$Detailed = $false
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Blue = "Cyan"

# Counters
$TotalChecks = 0
$PassedChecks = 0
$FailedChecks = 0

function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warn {
    param($Message)
    Write-Host "[WARN] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Write-Header {
    param($Message)
    Write-Host "[CHECK] $Message" -ForegroundColor $Blue
}

function Test-FileExists {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    $script:TotalChecks++
    
    if (Test-Path $FilePath) {
        Write-Host "✅ PASS: $Description" -ForegroundColor $Green
        $script:PassedChecks++
        return $true
    } else {
        Write-Host "❌ FAIL: $Description" -ForegroundColor $Red
        $script:FailedChecks++
        return $false
    }
}

function Test-DirectoryExists {
    param(
        [string]$DirectoryPath,
        [string]$Description
    )
    
    $script:TotalChecks++
    
    if (Test-Path $DirectoryPath -PathType Container) {
        Write-Host "✅ PASS: $Description" -ForegroundColor $Green
        $script:PassedChecks++
        return $true
    } else {
        Write-Host "❌ FAIL: $Description" -ForegroundColor $Red
        $script:FailedChecks++
        return $false
    }
}

function Test-ContentExists {
    param(
        [string]$FilePath,
        [string]$Pattern,
        [string]$Description
    )
    
    $script:TotalChecks++
    
    if ((Test-Path $FilePath) -and (Select-String -Path $FilePath -Pattern $Pattern -Quiet)) {
        Write-Host "✅ PASS: $Description" -ForegroundColor $Green
        $script:PassedChecks++
        return $true
    } else {
        Write-Host "❌ FAIL: $Description" -ForegroundColor $Red
        $script:FailedChecks++
        return $false
    }
}

# Main verification function
Write-Host "🔍 Frontier Production Infrastructure Verification" -ForegroundColor $Blue
Write-Host "================================================" -ForegroundColor $Blue
Write-Host ""

# Check project structure
Write-Header "Verifying project structure..."
Test-FileExists "infrastructure\terraform\production.tf" "Terraform production configuration"
Test-FileExists "k8s\deployment.yaml" "Main application deployment"
Test-FileExists "k8s\blue-green-deployment.yaml" "Blue-green deployment configuration"
Test-DirectoryExists "k8s\monitoring" "Monitoring configurations directory"
Test-FileExists "scripts\deploy-production.sh" "Production deployment script"
Test-FileExists "scripts\blue-green-deploy.sh" "Blue-green deployment script"
Test-FileExists "scripts\automated-backup.sh" "Automated backup script"
Test-DirectoryExists "disaster-recovery" "Disaster recovery directory"

Write-Host ""

# Check CI/CD pipeline
Write-Header "Verifying CI/CD pipeline..."
Test-FileExists ".github\workflows\production-deployment.yml" "GitHub Actions production pipeline"

Write-Host ""

# Check documentation
Write-Header "Verifying documentation..."
Test-FileExists "PRODUCTION_DEPLOYMENT_GUIDE.md" "Production deployment guide"
Test-FileExists "PRODUCTION_OPTIMIZATION.md" "Production optimization guide"
Test-FileExists "disaster-recovery\README.md" "Disaster recovery documentation"

Write-Host ""

# Check configuration completeness
Write-Header "Checking configuration completeness..."

Test-ContentExists "infrastructure\terraform\production.tf" "module.*vpc" "VPC configuration present"
Test-ContentExists "infrastructure\terraform\production.tf" "module.*eks" "EKS configuration present"
Test-ContentExists "infrastructure\terraform\production.tf" "aws_db_instance" "RDS configuration present"
Test-ContentExists "infrastructure\terraform\production.tf" "aws_elasticache_replication_group" "ElastiCache configuration present"

Write-Host ""

# Check monitoring configuration
Write-Header "Checking monitoring configuration..."

Test-ContentExists "k8s\monitoring\prometheus.yaml" "prometheus" "Prometheus configuration present"
Test-ContentExists "k8s\monitoring\grafana.yaml" "grafana" "Grafana configuration present"
Test-ContentExists "k8s\monitoring\alertmanager.yaml" "alertmanager" "AlertManager configuration present"

Write-Host ""

# Check blue-green deployment
Write-Header "Checking blue-green deployment configuration..."

Test-ContentExists "k8s\blue-green-deployment.yaml" "color: blue" "Blue deployment configuration present"
Test-ContentExists "k8s\blue-green-deployment.yaml" "color: green" "Green deployment configuration present"

Write-Host ""

# Check security configurations
Write-Header "Checking security configurations..."

Test-ContentExists "k8s\deployment.yaml" "NetworkPolicy" "Network policies configured"
Test-ContentExists "k8s\deployment.yaml" "securityContext" "Security contexts configured"

Write-Host ""

# Check optimization components
Write-Header "Checking optimization components..."

Test-DirectoryExists "optimization" "Optimization directory exists"
Test-FileExists "optimization\production_optimizer.py" "Production optimizer"
Test-FileExists "optimization\cache_manager.py" "Cache manager"
Test-FileExists "optimization\database_optimizer.py" "Database optimizer"
Test-FileExists "optimization\ai_batching.py" "AI batching system"
Test-FileExists "optimization\scaling_manager.py" "Scaling manager"
Test-FileExists "optimization\performance_monitor.py" "Performance monitor"

Write-Host ""

# Final summary
Write-Host "📊 VERIFICATION SUMMARY" -ForegroundColor $Blue
Write-Host "======================" -ForegroundColor $Blue
Write-Host "Total checks: $TotalChecks"
Write-Host "Passed: $PassedChecks" -ForegroundColor $Green
Write-Host "Failed: $FailedChecks" -ForegroundColor $Red
Write-Host ""

$SuccessRate = [math]::Round(($PassedChecks * 100 / $TotalChecks), 1)

if ($SuccessRate -ge 95) {
    Write-Host "🎉 EXCELLENT! Your production infrastructure is ready for deployment." -ForegroundColor $Green
    Write-Host "Success rate: $SuccessRate%" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Install required tools (Terraform, kubectl, AWS CLI)"
    Write-Host "2. Configure AWS credentials"
    Write-Host "3. Run: ./scripts/deploy-production.sh"
    Write-Host "4. Monitor: Access Grafana dashboard after deployment"
} elseif ($SuccessRate -ge 80) {
    Write-Host "⚠️  GOOD! Most components are ready, but some issues need attention." -ForegroundColor $Yellow
    Write-Host "Success rate: $SuccessRate%" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Please fix the failed checks before deployment."
} else {
    Write-Host "❌ ISSUES DETECTED! Several components need attention before deployment." -ForegroundColor $Red
    Write-Host "Success rate: $SuccessRate%" -ForegroundColor $Red
    Write-Host ""
    Write-Host "Please address all failed checks before proceeding."
}

Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor $Blue
Write-Host "• Deployment Guide: PRODUCTION_DEPLOYMENT_GUIDE.md"
Write-Host "• Optimization Guide: PRODUCTION_OPTIMIZATION.md"
Write-Host "• Disaster Recovery: disaster-recovery\README.md"
Write-Host ""
Write-Host "🔧 Management Scripts:" -ForegroundColor $Blue
Write-Host "• Deploy: .\scripts\deploy-production.sh"
Write-Host "• Blue-Green: .\scripts\blue-green-deploy.sh"
Write-Host "• Backup: .\scripts\automated-backup.sh"
Write-Host ""

# Show file structure if detailed flag is set
if ($Detailed) {
    Write-Host "📁 Infrastructure File Structure:" -ForegroundColor $Blue
    Get-ChildItem -Recurse | Where-Object { 
        $_.Name -like "*.tf" -or 
        $_.Name -like "*.yaml" -or 
        $_.Name -like "*.yml" -or 
        $_.Name -like "*deploy*" -or
        $_.Name -like "*production*"
    } | Select-Object Name, Directory, LastWriteTime | Format-Table -AutoSize
}
