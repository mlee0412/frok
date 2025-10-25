Write-Host "Testing GET /api/agent/run"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run?q=Hello" -Method GET
    Write-Host "Success!"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:"
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 10
    }
}
