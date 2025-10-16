# Ensure Node version from .nvmrc is active
if (Test-Path .nvmrc) { nvm use (Get-Content .nvmrc | Select-Object -First 1) | Out-Null }

# Activate Python venv if present
if (Test-Path .\.venv\Scripts\Activate.ps1) {
  . .\.venv\Scripts\Activate.ps1
  Write-Host "Python: " -NoNewline; python --version
  Write-Host "Pip:    " -NoNewline; pip --version
} else {
  Write-Host "No .venv found. Run infra\scripts\bootstrap.ps1 first." -ForegroundColor Yellow
}

Write-Host "Node:   " -NoNewline; node -v
Write-Host "npm:    " -NoNewline; npm -v
Write-Host "pnpm:   " -NoNewline; pnpm -v
Write-Host "`nDev shell ready. When done: 'deactivate'" -ForegroundColor Green
