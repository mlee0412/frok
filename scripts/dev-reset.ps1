# Kill Node, free ports (3000/3001/4000), clear Next cache

$ports = @(3000, 3001, 4000)

Write-Host "▶ Stopping node.exe processes..." -ForegroundColor Cyan
try {
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
} catch {}

Write-Host "▶ Freeing ports: $($ports -join ', ')" -ForegroundColor Cyan
foreach ($p in $ports) {
  # collect unique PIDs bound to :<port>
  $pids = netstat -ano | Select-String ":$p\s" | ForEach-Object {
    ($_.ToString() -split '\s+')[-1]
  } | Where-Object { $_ -match '^\d+$' } | Sort-Object -Unique

  foreach ($procId in $pids) {
    if ($procId -eq $PID) { continue }    # don't kill this shell
    if ($procId -eq 4)   { continue }     # PID 4 = System
    try { taskkill /PID $procId /F 2>$null | Out-Null; Write-Host "  ✓ Killed PID $procId (port $p)" -ForegroundColor DarkGray }
    catch { Write-Host "  ! Could not kill PID $procId (port $p)" -ForegroundColor Yellow }
  }
}

Write-Host "▶ Clearing Next.js cache (.next)..." -ForegroundColor Cyan
Remove-Item "C:\Dev\FROK\apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Dev reset completed." -ForegroundColor Green