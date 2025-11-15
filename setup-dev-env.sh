#!/bin/bash
# Development Environment Setup Script
# This script helps configure .env.local for local development

set -e

echo "🚀 FROK Development Environment Setup"
echo "======================================"
echo ""

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled. Edit .env.local manually."
        exit 1
    fi
    echo "📝 Backing up existing .env.local to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Copy from example
echo "📋 Creating .env.local from .env.example..."
cp .env.example .env.local

# Prompt for configuration mode
echo ""
echo "Choose development mode:"
echo "  1) DEV_BYPASS_AUTH (Quick testing, no login required)"
echo "  2) Real Authentication (Production-like, requires login)"
echo ""
read -p "Select mode (1 or 2): " mode

if [ "$mode" = "1" ]; then
    echo ""
    echo "🔧 Configuring DEV_BYPASS_AUTH mode..."
    echo ""

    # Enable DEV_BYPASS_AUTH
    if grep -q "^# DEV_BYPASS_AUTH=" .env.local; then
        sed -i 's/^# DEV_BYPASS_AUTH=/DEV_BYPASS_AUTH=/' .env.local
    else
        echo "DEV_BYPASS_AUTH=true" >> .env.local
    fi

    echo "✅ DEV_BYPASS_AUTH enabled"
    echo ""
    echo "⚠️  IMPORTANT: Service role key is already set from .env.example"
    echo "   This bypasses Row Level Security (RLS) for development."
    echo ""

elif [ "$mode" = "2" ]; then
    echo ""
    echo "🔧 Configuring Real Authentication mode..."
    echo ""
    echo "✅ DEV_BYPASS_AUTH disabled (real auth required)"
    echo ""
    echo "📝 You'll need to sign in at http://localhost:3000/auth/sign-in"
    echo ""
else
    echo "❌ Invalid mode. Setup cancelled."
    exit 1
fi

# Check for required keys
echo "🔑 Required API Keys:"
echo ""

# Supabase Anon Key
if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=.\\+" .env.local; then
    echo "⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is empty"
    echo "   Get it from: Supabase Dashboard → Settings → API → anon key"
    read -p "   Enter Supabase ANON Key (or press Enter to skip): " anon_key
    if [ ! -z "$anon_key" ]; then
        sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" .env.local
        echo "   ✅ ANON key configured"
    fi
fi

# OpenAI API Key
if ! grep -q "OPENAI_API_KEY=.\\+" .env.local || grep -q "OPENAI_API_KEY=your_openai_api_key_here" .env.local; then
    echo "⚠️  OPENAI_API_KEY is empty or placeholder"
    echo "   Get it from: https://platform.openai.com/api-keys"
    read -p "   Enter OpenAI API Key (or press Enter to skip): " openai_key
    if [ ! -z "$openai_key" ]; then
        sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$openai_key|" .env.local
        echo "   ✅ OpenAI key configured"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review .env.local and add any missing keys"
echo "   2. Start dev server: pnpm dev"
if [ "$mode" = "2" ]; then
    echo "   3. Sign in at: http://localhost:3000/auth/sign-in"
    echo "   4. Test agent chat: http://localhost:3000/agent"
else
    echo "   3. Test agent chat: http://localhost:3000/agent (no login needed)"
fi
echo ""
echo "📚 Documentation:"
echo "   - docs/fixes/AUTH_401_RESOLUTION.md"
echo "   - docs/fixes/THREAD_ACCESS_FIX.md"
echo ""
