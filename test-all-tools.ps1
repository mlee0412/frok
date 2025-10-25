Write-Host "Testing all agent tools" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test 1: HA Search (ha_search tool)" -ForegroundColor Yellow
$body1 = @{ input_as_text = "Find all lights in the living room" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run" -Method POST -Body $body1 -ContentType "application/json"
    Write-Host "✓ Success" -ForegroundColor Green
    Write-Host $response.result.output_text
} catch { Write-Host "✗ Failed: $_" -ForegroundColor Red }

Write-Host ""
Write-Host "Test 2: Memory Add (memory_add tool)" -ForegroundColor Yellow
$body2 = @{ input_as_text = "Remember that I prefer my lights at 40% brightness" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run" -Method POST -Body $body2 -ContentType "application/json"
    Write-Host "✓ Success" -ForegroundColor Green
    Write-Host $response.result.output_text
} catch { Write-Host "✗ Failed: $_" -ForegroundColor Red }

Write-Host ""
Write-Host "Test 3: Memory Search (memory_search tool)" -ForegroundColor Yellow
$body3 = @{ input_as_text = "What brightness do I prefer?" } | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run" -Method POST -Body $body3 -ContentType "application/json"
    Write-Host "✓ Success" -ForegroundColor Green
    Write-Host $response.result.output_text
} catch { Write-Host "✗ Failed: $_" -ForegroundColor Red }

Write-Host ""
Write-Host "All tests complete!" -ForegroundColor Cyan
