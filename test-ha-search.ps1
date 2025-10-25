$body = @{
    query = "light"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/ha/search" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response:"
    $response.Content
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error body: $errorBody"
    }
}
