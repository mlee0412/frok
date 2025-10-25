Write-Host "Testing web search" -ForegroundColor Cyan

Write-Host "1. Direct API test:" -ForegroundColor Yellow
$body = @{
    query = "weather in New York"
    max_results = 3
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/search/web" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Search OK: $($response.ok)" -ForegroundColor Green
    Write-Host "Answer: $($response.answer)"
    Write-Host "Results count: $($response.results.Count)"
    $response.results | ForEach-Object {
        Write-Host "  - $($_.title): $($_.url)"
    }
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host ""
Write-Host "2. Agent test:" -ForegroundColor Yellow
$agentBody = @{
    input_as_text = "What's the weather in New York?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run" -Method POST -Body $agentBody -ContentType "application/json"
    Write-Host $response.result.output_text
} catch {
    Write-Host "Failed: $_" -ForegroundColor Red
}
