param(
  [switch]$Force
)

Write-Host "==> Using Node version from .nvmrc" -ForegroundColor Cyan
if (Test-Path .nvmrc) {
  $nodeVersion = Get-Content .nvmrc | Select-Object -First 1
  nvm install $nodeVersion | Out-Null
  nvm use $nodeVersion | Out-Null
  node -v
} else {
  Write-Host "No .nvmrc found; skipping Node pin." -ForegroundColor Yellow
}

Write-Host "==> Creating Python venv (.venv)" -ForegroundColor Cyan
if ((-not (Test-Path .venv)) -or $Force) {
  py -3.12 -m venv .venv
}
.\.venv\Scripts\Activate.ps1
python --version
pip install -U pip
deactivate

Write-Host "==> Done. Ready to install project deps." -ForegroundColor Green
