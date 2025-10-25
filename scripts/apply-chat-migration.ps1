# Apply Chat System Migration
# This script helps you apply the chat_threads and chat_messages database migration

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " FROK - Apply Chat System Migration" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$migrationFile = Join-Path $PSScriptRoot "..\packages\db\migrations\0005_chat_system_alter.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Migration file found" -ForegroundColor Green
Write-Host ""

Write-Host "Migration Contents (SAFE - Checks before adding):" -ForegroundColor Yellow
Write-Host "- Adds missing columns to existing chat_threads table" -ForegroundColor White
Write-Host "- Adds missing columns to existing chat_messages table" -ForegroundColor White
Write-Host "- Creates agent_memories table if missing" -ForegroundColor White
Write-Host "- Adds indexes for performance (if missing)" -ForegroundColor White
Write-Host "- Sets up RLS policies for security" -ForegroundColor White
Write-Host "- Creates/updates triggers for auto-updating timestamps" -ForegroundColor White
Write-Host ""
Write-Host "✅ This migration is IDEMPOTENT - safe to run multiple times!" -ForegroundColor Green
Write-Host ""

Write-Host "📋 To apply this migration, you have 2 options:" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 1: Supabase Dashboard (Recommended)" -ForegroundColor Yellow
Write-Host "  1. Go to your Supabase project dashboard" -ForegroundColor White
Write-Host "  2. Click on 'SQL Editor' in the left sidebar" -ForegroundColor White
Write-Host "  3. Copy the migration file contents:" -ForegroundColor White
Write-Host "     Location: $migrationFile" -ForegroundColor Gray
Write-Host "  4. Paste into SQL Editor and click 'Run'" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Supabase CLI" -ForegroundColor Yellow
Write-Host "  If you have Supabase CLI installed:" -ForegroundColor White
Write-Host "  $ supabase db push" -ForegroundColor Gray
Write-Host ""

Write-Host "🔍 Opening migration file location..." -ForegroundColor Cyan
Start-Process "explorer.exe" -ArgumentList "/select,`"$migrationFile`""

Write-Host ""
Write-Host "Press any key to open migration file in default text editor..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process $migrationFile

Write-Host ""
Write-Host "✅ Next Steps:" -ForegroundColor Green
Write-Host "  1. Apply the migration using one of the options above" -ForegroundColor White
Write-Host "  2. Restart your dev server: pnpm dev:all" -ForegroundColor White
Write-Host "  3. Test the chat at http://localhost:3000/agent" -ForegroundColor White
Write-Host ""
Write-Host "📖 For more details, see: AGENT_IMPROVEMENTS_APPLIED.md" -ForegroundColor Cyan
Write-Host ""
