# FROK Setup Checker
# Run this to verify your system prerequisites

Write-Host "`n=== FROK Project Setup Checker ===`n" -ForegroundColor Cyan

$allGood = $true

# Check nvm
Write-Host "[Checking] Node Version Manager (nvm)..." -NoNewline
try {
    $nvmVersion = nvm version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ Installed" -ForegroundColor Green
        Write-Host "  Version: $nvmVersion" -ForegroundColor Gray
    } else {
        throw
    }
} catch {
    Write-Host " ✗ Not Found" -ForegroundColor Red
    Write-Host "  Install from: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Yellow
    $allGood = $false
}

# Check Python 3.12
Write-Host "[Checking] Python 3.12..." -NoNewline
try {
    $pyVersion = py -3.12 --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ Installed" -ForegroundColor Green
        Write-Host "  Version: $pyVersion" -ForegroundColor Gray
    } else {
        throw
    }
} catch {
    Write-Host " ✗ Not Found" -ForegroundColor Red
    Write-Host "  Install from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  Make sure to check 'Add Python to PATH' during installation!" -ForegroundColor Yellow
    $allGood = $false
}

# Check Git
Write-Host "[Checking] Git..." -NoNewline
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ Installed" -ForegroundColor Green
        Write-Host "  Version: $gitVersion" -ForegroundColor Gray
    } else {
        throw
    }
} catch {
    Write-Host " ✗ Not Found" -ForegroundColor Red
    Write-Host "  Install from: https://git-scm.com/download/win" -ForegroundColor Yellow
    $allGood = $false
}

# Check pnpm
Write-Host "[Checking] pnpm..." -NoNewline
try {
    $pnpmVersion = pnpm -v 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ Installed" -ForegroundColor Green
        Write-Host "  Version: $pnpmVersion" -ForegroundColor Gray
    } else {
        throw
    }
} catch {
    Write-Host " ✗ Not Found" -ForegroundColor Red
    Write-Host "  Install from: https://pnpm.io/installation" -ForegroundColor Yellow
    $allGood = $false
}

# Check if Node 22.11.0 is installed via nvm
Write-Host "[Checking] Node.js 22.11.0 (via nvm)..." -NoNewline
try {
    $nodeVersion = (Get-Content .nvmrc | Select-Object -First 1).Trim()
    $nvmList = nvm list 2>&1 | Out-String
    if ($nvmList -match [regex]::Escape($nodeVersion)) {
        Write-Host " ✓ Installed" -ForegroundColor Green
        Write-Host "  Version: $nodeVersion" -ForegroundColor Gray
    } else {
        Write-Host " ⚠ Not Installed" -ForegroundColor Yellow
        Write-Host "  Run: nvm install $nodeVersion" -ForegroundColor Yellow
        Write-Host "  Then: nvm use $nodeVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ⚠ Could not verify" -ForegroundColor Yellow
}

# Check if .venv exists
Write-Host "[Checking] Python Virtual Environment (.venv)..." -NoNewline
if (Test-Path .\.venv) {
    Write-Host " ✓ Exists" -ForegroundColor Green
} else {
    Write-Host " ⚠ Not Created" -ForegroundColor Yellow
    Write-Host "  Run: .\\infra\\scripts\\bootstrap.ps1" -ForegroundColor Yellow
}

# Check if node_modules exist at root
Write-Host "[Checking] Root node_modules..." -NoNewline
if (Test-Path .\node_modules) {
    Write-Host " ✓ Exists" -ForegroundColor Green
} else {
    Write-Host " ⚠ Not Installed" -ForegroundColor Yellow
    Write-Host "  Run: pnpm install" -ForegroundColor Yellow
}

# Check if apps/web/node_modules exist
Write-Host "[Checking] apps/web node_modules..." -NoNewline
if (Test-Path .\apps\web\node_modules) {
    Write-Host " ✓ Exists" -ForegroundColor Green
} else {
    Write-Host " ⚠ Not Installed" -ForegroundColor Yellow
    Write-Host "  Run: pnpm install" -ForegroundColor Yellow
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ All prerequisites are installed!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: .\infra\scripts\bootstrap.ps1" -ForegroundColor White
    Write-Host "  2. Run: pnpm install" -ForegroundColor White
    Write-Host "  3. Run: .\infra\scripts\dev.ps1" -ForegroundColor White
    Write-Host "  4. Run: pnpm dev (or pnpm dev:web)" -ForegroundColor White
} else {
    Write-Host "⚠ Some prerequisites are missing. Please install them first." -ForegroundColor Yellow
    Write-Host "See SETUP_GUIDE.md for detailed instructions." -ForegroundColor Yellow
}

Write-Host "`nFor complete setup instructions, see: SETUP_GUIDE.md`n" -ForegroundColor Gray
