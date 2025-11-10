#!/bin/bash

# Railway Deployment Script for FROK Voice Server
# This script helps you deploy the voice server step-by-step

set -e  # Exit on error

echo "🚀 FROK Voice Server - Railway Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
    echo -e "${GREEN}✅ Railway CLI installed${NC}"
fi

echo -e "${YELLOW}📝 Step 1: Login to Railway${NC}"
echo "This will open a browser window for authentication..."
read -p "Press Enter to continue..."
railway login

echo ""
echo -e "${GREEN}✅ Logged in to Railway${NC}"
echo ""

echo -e "${YELLOW}📝 Step 2: Link to Railway Project${NC}"
echo "This will connect this directory to your Railway project..."
read -p "Press Enter to continue..."
railway link

echo ""
echo -e "${GREEN}✅ Project linked${NC}"
echo ""

echo -e "${YELLOW}📝 Step 3: Set Environment Variables${NC}"
echo "You'll need to provide the following:"
echo "  - OPENAI_API_KEY"
echo "  - DEEPGRAM_API_KEY"
echo "  - ELEVENLABS_API_KEY"
echo "  - ELEVENLABS_VOICE_ID"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_JWT_SECRET"
echo "  - ALLOWED_ORIGINS"
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo -e "${GREEN}Found .env file locally${NC}"
    echo "Would you like to use values from .env? (y/n)"
    read -r use_env

    if [ "$use_env" = "y" ]; then
        echo "Setting environment variables from .env file..."

        # Read .env and set variables
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            if [[ ! $key =~ ^# ]] && [[ -n $key ]]; then
                # Remove quotes from value
                value="${value%\"}"
                value="${value#\"}"
                echo "Setting $key..."
                railway variables set "$key=$value" 2>/dev/null || echo "⚠️  Warning: Could not set $key"
            fi
        done < .env

        echo -e "${GREEN}✅ Environment variables set from .env${NC}"
    else
        echo "Please set variables manually using:"
        echo "  railway variables set KEY=VALUE"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Setting environment variables manually..."
    echo ""

    # PORT
    echo "Setting PORT=3001..."
    railway variables set PORT=3001

    # API Keys
    echo -e "${YELLOW}Enter your OPENAI_API_KEY:${NC}"
    read -r openai_key
    railway variables set "OPENAI_API_KEY=$openai_key"

    echo -e "${YELLOW}Enter your DEEPGRAM_API_KEY:${NC}"
    read -r deepgram_key
    railway variables set "DEEPGRAM_API_KEY=$deepgram_key"

    echo -e "${YELLOW}Enter your ELEVENLABS_API_KEY:${NC}"
    read -r elevenlabs_key
    railway variables set "ELEVENLABS_API_KEY=$elevenlabs_key"

    echo -e "${YELLOW}Enter your ELEVENLABS_VOICE_ID:${NC}"
    read -r voice_id
    railway variables set "ELEVENLABS_VOICE_ID=$voice_id"

    # Supabase
    echo -e "${YELLOW}Enter your NEXT_PUBLIC_SUPABASE_URL:${NC}"
    read -r supabase_url
    railway variables set "NEXT_PUBLIC_SUPABASE_URL=$supabase_url"

    echo -e "${YELLOW}Enter your NEXT_PUBLIC_SUPABASE_ANON_KEY:${NC}"
    read -r supabase_anon
    railway variables set "NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon"

    echo -e "${YELLOW}Enter your SUPABASE_JWT_SECRET (from Supabase Dashboard → Settings → API):${NC}"
    read -r jwt_secret
    railway variables set "SUPABASE_JWT_SECRET=$jwt_secret"

    # CORS
    echo -e "${YELLOW}Enter ALLOWED_ORIGINS (comma-separated, e.g., https://your-app.vercel.app,http://localhost:3000):${NC}"
    read -r origins
    railway variables set "ALLOWED_ORIGINS=$origins"

    echo -e "${GREEN}✅ Environment variables set${NC}"
fi

echo ""
echo -e "${YELLOW}📝 Step 4: Deploy to Railway${NC}"
echo "This will build and deploy your voice server..."
read -p "Press Enter to continue..."
railway up

echo ""
echo -e "${GREEN}✅ Deployment initiated${NC}"
echo ""

echo -e "${YELLOW}📝 Step 5: Get Railway Domain${NC}"
echo "Getting your Railway domain URL..."
domain=$(railway domain 2>&1 || echo "")

if [ -n "$domain" ]; then
    echo -e "${GREEN}✅ Your voice server URL: $domain${NC}"
    echo ""
    echo "WebSocket endpoint: wss://$domain/voice/stream"
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo "1. Add this to your Vercel environment variables:"
    echo "   NEXT_PUBLIC_VOICE_WS_URL=wss://$domain/voice/stream"
    echo ""
    echo "2. Redeploy your Next.js app on Vercel for changes to take effect"
    echo ""
    echo "3. Test by visiting: https://your-app.vercel.app/voice"
else
    echo -e "${YELLOW}⚠️  Could not retrieve domain automatically${NC}"
    echo "Run: railway domain"
    echo "Or check Railway Dashboard → Settings → Domains"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "Monitor logs: railway logs"
echo "Check status: railway status"
echo "View in browser: railway open"
