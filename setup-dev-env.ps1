# Development Environment Setup Script (PowerShell)
# This script helps configure .env.local for local development

Write-Host "🚀 FROK Development Environment Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local already exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "❌ Setup cancelled. Edit .env.local manually." -ForegroundColor Red
        exit 1
    }
    Write-Host "📝 Backing up existing .env.local to .env.local.backup" -ForegroundColor Yellow
    Copy-Item .env.local .env.local.backup -Force
}

# Copy from example
Write-Host "📋 Creating .env.local from .env.example..." -ForegroundColor Cyan
Copy-Item .env.example .env.local -Force

# Prompt for configuration mode
Write-Host ""
Write-Host "Choose development mode:" -ForegroundColor Cyan
Write-Host "  1) DEV_BYPASS_AUTH (Quick testing, no login required)"
Write-Host "  2) Real Authentication (Production-like, requires login)"
Write-Host ""
$mode = Read-Host "Select mode (1 or 2)"

if ($mode -eq "1") {
    Write-Host ""
    Write-Host "🔧 Configuring DEV_BYPASS_AUTH mode..." -ForegroundColor Cyan
    Write-Host ""

    # Enable DEV_BYPASS_AUTH
    $content = Get-Content .env.local -Raw
    if ($content -match "# DEV_BYPASS_AUTH=") {
        $content = $content -replace "# DEV_BYPASS_AUTH=", "DEV_BYPASS_AUTH="
    } else {
        $content += "`nDEV_BYPASS_AUTH=true`n"
    }
    Set-Content .env.local $content -NoNewline

    Write-Host "✅ DEV_BYPASS_AUTH enabled" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Service role key is already set from .env.example" -ForegroundColor Yellow
    Write-Host "   This bypasses Row Level Security (RLS) for development."
    Write-Host ""

} elseif ($mode -eq "2") {
    Write-Host ""
    Write-Host "🔧 Configuring Real Authentication mode..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ DEV_BYPASS_AUTH disabled (real auth required)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 You'll need to sign in at http://localhost:3000/auth/sign-in" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Invalid mode. Setup cancelled." -ForegroundColor Red
    exit 1
}

# Check for required keys
Write-Host "🔑 Required API Keys:" -ForegroundColor Cyan
Write-Host ""

# Supabase Anon Key
$content = Get-Content .env.local -Raw
if ($content -notmatch "NEXT_PUBLIC_SUPABASE_ANON_KEY=.+") {
    Write-Host "⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is empty" -ForegroundColor Yellow
    Write-Host "   Get it from: Supabase Dashboard → Settings → API → anon key"
    $anonKey = Read-Host "   Enter Supabase ANON Key (or press Enter to skip)"
    if ($anonKey) {
        $content = $content -replace "NEXT_PUBLIC_SUPABASE_ANON_KEY=.*", "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"
        Set-Content .env.local $content -NoNewline
        Write-Host "   ✅ ANON key configured" -ForegroundColor Green
    }
}

# OpenAI API Key
if ($content -notmatch "OPENAI_API_KEY=.+" -or $content -match "OPENAI_API_KEY=your_openai_api_key_here") {
    Write-Host "⚠️  OPENAI_API_KEY is empty or placeholder" -ForegroundColor Yellow
    Write-Host "   Get it from: https://platform.openai.com/api-keys"
    $openaiKey = Read-Host "   Enter OpenAI API Key (or press Enter to skip)"
    if ($openaiKey) {
        $content = Get-Content .env.local -Raw
        $content = $content -replace "OPENAI_API_KEY=.*", "OPENAI_API_KEY=$openaiKey"
        Set-Content .env.local $content -NoNewline
        Write-Host "   ✅ OpenAI key configured" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Review .env.local and add any missing keys"
Write-Host "   2. Start dev server: pnpm dev"
if ($mode -eq "2") {
    Write-Host "   3. Sign in at: http://localhost:3000/auth/sign-in"
    Write-Host "   4. Test agent chat: http://localhost:3000/agent"
} else {
    Write-Host "   3. Test agent chat: http://localhost:3000/agent (no login needed)"
}
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - docs/fixes/AUTH_401_RESOLUTION.md"
Write-Host "   - docs/fixes/THREAD_ACCESS_FIX.md"
Write-Host ""
