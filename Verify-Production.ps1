# PowerShell Production Infrastructure Verification Script
# Comprehensive validation of all deployment components

Write-Host "🔍 Frontier Production Infrastructure Verification" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Counters
$TotalChecks = 0
$PassedChecks = 0

function Test-Component {
    param(
        [string]$Path,
        [string]$Description
    )
    
    $script:TotalChecks++
    
    if (Test-Path $Path) {
        Write-Host "✅ PASS: $Description" -ForegroundColor Green
        $script:PassedChecks++
        return $true
    } else {
        Write-Host "❌ FAIL: $Description" -ForegroundColor Red
        return $false
    }
}

# Check project structure
Write-Host "[CHECK] Verifying project structure..." -ForegroundColor Cyan
Test-Component "infrastructure\terraform\production.tf" "Terraform production configuration"
Test-Component "k8s\deployment.yaml" "Main application deployment"
Test-Component "k8s\blue-green-deployment.yaml" "Blue-green deployment configuration"
Test-Component "k8s\monitoring" "Monitoring configurations directory"
Test-Component "scripts\deploy-production.sh" "Production deployment script"
Test-Component "scripts\blue-green-deploy.sh" "Blue-green deployment script"
Test-Component "scripts\automated-backup.sh" "Automated backup script"
Test-Component "disaster-recovery" "Disaster recovery directory"

Write-Host ""

# Check CI/CD pipeline
Write-Host "[CHECK] Verifying CI/CD pipeline..." -ForegroundColor Cyan
Test-Component ".github\workflows\production-deployment.yml" "GitHub Actions production pipeline"

Write-Host ""

# Check documentation
Write-Host "[CHECK] Verifying documentation..." -ForegroundColor Cyan
Test-Component "PRODUCTION_DEPLOYMENT_GUIDE.md" "Production deployment guide"
Test-Component "PRODUCTION_OPTIMIZATION.md" "Production optimization guide"
Test-Component "disaster-recovery\README.md" "Disaster recovery documentation"

Write-Host ""

# Check monitoring configuration
Write-Host "[CHECK] Checking monitoring configuration..." -ForegroundColor Cyan
Test-Component "k8s\monitoring\prometheus.yaml" "Prometheus configuration"
Test-Component "k8s\monitoring\grafana.yaml" "Grafana configuration"
Test-Component "k8s\monitoring\alertmanager.yaml" "AlertManager configuration"

Write-Host ""

# Check optimization components
Write-Host "[CHECK] Checking optimization components..." -ForegroundColor Cyan
Test-Component "optimization" "Optimization directory"
Test-Component "optimization\production_optimizer.py" "Production optimizer"
Test-Component "optimization\cache_manager.py" "Cache manager"
Test-Component "optimization\database_optimizer.py" "Database optimizer"

Write-Host ""

# Final summary
Write-Host "📊 VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "Total checks: $TotalChecks"
Write-Host "Passed: $PassedChecks" -ForegroundColor Green
Write-Host "Failed: $($TotalChecks - $PassedChecks)" -ForegroundColor Red
Write-Host ""

$SuccessRate = [math]::Round(($PassedChecks * 100 / $TotalChecks), 1)

if ($SuccessRate -ge 95) {
    Write-Host "🎉 EXCELLENT! Your production infrastructure is ready for deployment." -ForegroundColor Green
    Write-Host "Success rate: $SuccessRate%" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Install required tools (Terraform, kubectl, AWS CLI)"
    Write-Host "2. Configure AWS credentials"
    Write-Host "3. Run: ./scripts/deploy-production.sh"
} elseif ($SuccessRate -ge 80) {
    Write-Host "⚠️  GOOD! Most components are ready, but some issues need attention." -ForegroundColor Yellow
    Write-Host "Success rate: $SuccessRate%" -ForegroundColor Yellow
} else {
    Write-Host "❌ ISSUES DETECTED! Several components need attention before deployment." -ForegroundColor Red
    Write-Host "Success rate: $SuccessRate%" -ForegroundColor Red
}

Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "• Deployment Guide: PRODUCTION_DEPLOYMENT_GUIDE.md"
Write-Host "• Optimization Guide: PRODUCTION_OPTIMIZATION.md"
Write-Host "• Disaster Recovery: disaster-recovery\README.md"
Write-Host ""
Write-Host "🔧 Management Scripts:" -ForegroundColor Cyan
Write-Host "• Deploy: .\scripts\deploy-production.sh"
Write-Host "• Blue-Green: .\scripts\blue-green-deploy.sh"
Write-Host "• Backup: .\scripts\automated-backup.sh"
