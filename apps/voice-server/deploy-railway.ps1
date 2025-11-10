# Railway Deployment Script for FROK Voice Server (PowerShell)
# This script helps you deploy the voice server step-by-step

$ErrorActionPreference = "Stop"

Write-Host "🚀 FROK Voice Server - Railway Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI not found" -ForegroundColor Red
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
    Write-Host "✅ Railway CLI installed" -ForegroundColor Green
}

Write-Host "📝 Step 1: Login to Railway" -ForegroundColor Yellow
Write-Host "This will open a browser window for authentication..."
Read-Host "Press Enter to continue"
railway login

Write-Host ""
Write-Host "✅ Logged in to Railway" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Step 2: Link to Railway Project" -ForegroundColor Yellow
Write-Host "This will connect this directory to your Railway project..."
Read-Host "Press Enter to continue"
railway link

Write-Host ""
Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Step 3: Set Environment Variables" -ForegroundColor Yellow
Write-Host "You'll need to provide the following:"
Write-Host "  - OPENAI_API_KEY"
Write-Host "  - DEEPGRAM_API_KEY"
Write-Host "  - ELEVENLABS_API_KEY"
Write-Host "  - ELEVENLABS_VOICE_ID"
Write-Host "  - NEXT_PUBLIC_SUPABASE_URL"
Write-Host "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
Write-Host "  - SUPABASE_JWT_SECRET"
Write-Host "  - ALLOWED_ORIGINS"
Write-Host ""

# Check if .env file exists
if (Test-Path .env) {
    Write-Host "Found .env file locally" -ForegroundColor Green
    $useEnv = Read-Host "Would you like to use values from .env? (y/n)"

    if ($useEnv -eq "y") {
        Write-Host "Setting environment variables from .env file..."

        # Read .env and set variables
        Get-Content .env | ForEach-Object {
            $line = $_.Trim()
            # Skip comments and empty lines
            if ($line -and -not $line.StartsWith("#")) {
                $parts = $line -split "=", 2
                if ($parts.Length -eq 2) {
                    $key = $parts[0].Trim()
                    $value = $parts[1].Trim().Trim('"')
                    Write-Host "Setting $key..."
                    railway variables set "$key=$value" 2>&1 | Out-Null
                }
            }
        }

        Write-Host "✅ Environment variables set from .env" -ForegroundColor Green
    }
    else {
        Write-Host "Please set variables manually using:"
        Write-Host "  railway variables set KEY=VALUE"
    }
}
else {
    Write-Host "⚠️  No .env file found" -ForegroundColor Yellow
    Write-Host "Setting environment variables manually..."
    Write-Host ""

    # PORT
    Write-Host "Setting PORT=3001..."
    railway variables set "PORT=3001"

    # API Keys
    $openaiKey = Read-Host "Enter your OPENAI_API_KEY"
    railway variables set "OPENAI_API_KEY=$openaiKey"

    $deepgramKey = Read-Host "Enter your DEEPGRAM_API_KEY"
    railway variables set "DEEPGRAM_API_KEY=$deepgramKey"

    $elevenlabsKey = Read-Host "Enter your ELEVENLABS_API_KEY"
    railway variables set "ELEVENLABS_API_KEY=$elevenlabsKey"

    $voiceId = Read-Host "Enter your ELEVENLABS_VOICE_ID"
    railway variables set "ELEVENLABS_VOICE_ID=$voiceId"

    # Supabase
    $supabaseUrl = Read-Host "Enter your NEXT_PUBLIC_SUPABASE_URL"
    railway variables set "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl"

    $supabaseAnon = Read-Host "Enter your NEXT_PUBLIC_SUPABASE_ANON_KEY"
    railway variables set "NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabaseAnon"

    $jwtSecret = Read-Host "Enter your SUPABASE_JWT_SECRET (from Supabase Dashboard → Settings → API)"
    railway variables set "SUPABASE_JWT_SECRET=$jwtSecret"

    # CORS
    $origins = Read-Host "Enter ALLOWED_ORIGINS (comma-separated, e.g., https://your-app.vercel.app,http://localhost:3000)"
    railway variables set "ALLOWED_ORIGINS=$origins"

    Write-Host "✅ Environment variables set" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Step 4: Deploy to Railway" -ForegroundColor Yellow
Write-Host "This will build and deploy your voice server..."
Read-Host "Press Enter to continue"
railway up

Write-Host ""
Write-Host "✅ Deployment initiated" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Step 5: Get Railway Domain" -ForegroundColor Yellow
Write-Host "Getting your Railway domain URL..."
$domain = railway domain 2>&1

if ($domain) {
    Write-Host "✅ Your voice server URL: $domain" -ForegroundColor Green
    Write-Host ""
    Write-Host "WebSocket endpoint: wss://$domain/voice/stream"
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Add this to your Vercel environment variables:"
    Write-Host "   NEXT_PUBLIC_VOICE_WS_URL=wss://$domain/voice/stream"
    Write-Host ""
    Write-Host "2. Redeploy your Next.js app on Vercel for changes to take effect"
    Write-Host ""
    Write-Host "3. Test by visiting: https://your-app.vercel.app/voice"
}
else {
    Write-Host "⚠️  Could not retrieve domain automatically" -ForegroundColor Yellow
    Write-Host "Run: railway domain"
    Write-Host "Or check Railway Dashboard → Settings → Domains"
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor logs: railway logs"
Write-Host "Check status: railway status"
Write-Host "View in browser: railway open"
