# FROK Complete Setup Script
# This runs all setup steps in sequence

param(
    [switch]$Force
)

Write-Host "`n=== FROK Complete Setup ===" -ForegroundColor Cyan
Write-Host "This will set up your entire development environment.`n" -ForegroundColor Gray

# Step 1: Check prerequisites
Write-Host "`n[Step 1/4] Checking prerequisites..." -ForegroundColor Cyan
.\scripts\check-setup.ps1

$continue = Read-Host "`nDo you want to continue with setup? (Y/N)"
if ($continue -ne "Y" -and $continue -ne "y") {
    Write-Host "Setup cancelled." -ForegroundColor Yellow
    exit
}

# Step 2: Bootstrap
Write-Host "`n[Step 2/4] Running bootstrap..." -ForegroundColor Cyan
.\scripts\bootstrap.ps1 -Force:$Force

if ($LASTEXITCODE -ne 0) {
    Write-Host "Bootstrap failed! Please check the errors above." -ForegroundColor Red
    exit 1
}

# Step 3: Install root dependencies
Write-Host "`n[Step 3/4] Installing root dependencies..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Root npm install failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Install web dependencies
Write-Host "`n[Step 4/4] Installing web dependencies..." -ForegroundColor Cyan
Push-Location web
npm install
$webInstallSuccess = $LASTEXITCODE -eq 0
Pop-Location

if (-not $webInstallSuccess) {
    Write-Host "Web npm install failed!" -ForegroundColor Red
    exit 1
}

# Success!
Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "`nYour FROK development environment is ready!" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start dev environment:  .\scripts\dev.ps1" -ForegroundColor White
Write-Host "  2. Go to web directory:    cd web" -ForegroundColor White
Write-Host "  3. Start Next.js server:   npm run dev" -ForegroundColor White
Write-Host "  4. Open browser:           http://localhost:3000" -ForegroundColor White

Write-Host "`n💡 Helpful Commands:" -ForegroundColor Cyan
Write-Host "  - Format code:     npm run format" -ForegroundColor White
Write-Host "  - Lint code:       npm run lint" -ForegroundColor White
Write-Host "  - Check setup:     .\scripts\check-setup.ps1" -ForegroundColor White

Write-Host "`n📖 Documentation: See SETUP_GUIDE.md for more details`n" -ForegroundColor Gray
