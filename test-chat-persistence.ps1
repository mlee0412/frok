Write-Host "Testing Chat Persistence" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Create new thread:" -ForegroundColor Yellow
try {
    $createRes = Invoke-RestMethod -Uri "http://localhost:3000/api/chat/threads" -Method POST `
        -Body (@{ title = "Test Chat" } | ConvertTo-Json) -ContentType "application/json"
    if ($createRes.ok) {
        $threadId = $createRes.thread.id
        Write-Host "✓ Created thread: $threadId" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "2. Add user message:" -ForegroundColor Yellow
        $userMsg = Invoke-RestMethod -Uri "http://localhost:3000/api/chat/messages" -Method POST `
            -Body (@{ thread_id = $threadId; role = "user"; content = "Hello, test message!" } | ConvertTo-Json) `
            -ContentType "application/json"
        Write-Host "✓ User message: $($userMsg.message.id)" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "3. Add assistant message:" -ForegroundColor Yellow
        $assistantMsg = Invoke-RestMethod -Uri "http://localhost:3000/api/chat/messages" -Method POST `
            -Body (@{ thread_id = $threadId; role = "assistant"; content = "Hello! This is a **test** response with `code` and formatting." } | ConvertTo-Json) `
            -ContentType "application/json"
        Write-Host "✓ Assistant message: $($assistantMsg.message.id)" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "4. Load threads:" -ForegroundColor Yellow
        $threads = Invoke-RestMethod -Uri "http://localhost:3000/api/chat/threads" -Method GET
        Write-Host "✓ Found $($threads.threads.Count) thread(s)" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "5. Load messages:" -ForegroundColor Yellow
        $messages = Invoke-RestMethod -Uri "http://localhost:3000/api/chat/messages?thread_id=$threadId" -Method GET
        Write-Host "✓ Found $($messages.messages.Count) message(s)" -ForegroundColor Green
        $messages.messages | ForEach-Object {
            Write-Host "  - [$($_.role)] $($_.content.Substring(0, [Math]::Min(50, $_.content.Length)))..."
        }
        
        Write-Host ""
        Write-Host "6. Update thread title:" -ForegroundColor Yellow
        $updateRes = Invoke-RestMethod -Uri "http://localhost:3000/api/chat/threads/$threadId" -Method PATCH `
            -Body (@{ title = "Updated Test Chat" } | ConvertTo-Json) -ContentType "application/json"
        Write-Host "✓ Updated: $($updateRes.thread.title)" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "7. Delete thread:" -ForegroundColor Yellow
        Invoke-RestMethod -Uri "http://localhost:3000/api/chat/threads/$threadId" -Method DELETE | Out-Null
        Write-Host "✓ Thread deleted" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
