Write-Host "Testing GPT-5 Configuration" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Check model config:" -ForegroundColor Yellow
try {
    $config = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/config" -Method GET
    Write-Host "✓ Model: $($config.model)" -ForegroundColor Green
    Write-Host "✓ Reasoning: $($config.reasoning)" -ForegroundColor Green
    Write-Host "✓ Tools: $($config.tools -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Test GPT-5 with reasoning task:" -ForegroundColor Yellow
$body = @{
    input_as_text = "Solve this step by step: If I have 3 red balls and 2 blue balls, and I randomly pick 2 balls without replacement, what's the probability both are red?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $response.result.output_text
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
