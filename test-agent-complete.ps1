Write-Host "Testing Agent with all tools" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test 1: Basic response (no tools)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run?q=Hello" -Method GET
    Write-Host "✓ Success" -ForegroundColor Green
    Write-Host $response.result.output_text
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 2: Search for lights in kitchen (HA search tool)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run?q=Search+for+lights+in+the+kitchen" -Method GET
    Write-Host "✓ Success" -ForegroundColor Green
    Write-Host $response.result.output_text
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
