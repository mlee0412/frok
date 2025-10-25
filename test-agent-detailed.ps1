$body = @{
    input_as_text = "Hello"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/agent/run" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Success!"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "HTTP Error: $($_.Exception.Response.StatusCode)"
    Write-Host "Exception: $($_.Exception.Message)"
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Error Details:"
        $_.ErrorDetails.Message
    }
}
