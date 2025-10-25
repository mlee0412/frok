Write-Host "Testing entry lights search" -ForegroundColor Cyan

Write-Host "1. Direct API test:" -ForegroundColor Yellow
$body = @{
    query = "entry"
    domain = "light"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/ha/search" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Found entities:" -ForegroundColor Green
    $response.entities | ForEach-Object {
        Write-Host "  - $($_.friendly_name) ($($_.entity_id)) - $($_.state)"
    }
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Agent test:" -ForegroundColor Yellow
$agentBody = @{
    input_as_text = "Find lights in the entry"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run" -Method POST -Body $agentBody -ContentType "application/json"
    Write-Host $response.result.output_text
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
}
