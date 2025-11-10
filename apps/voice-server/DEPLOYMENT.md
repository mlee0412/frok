# Voice Server Deployment Guide

Complete step-by-step guide for deploying the FROK Voice Server to Railway.

## Overview

This guide covers deploying the voice WebSocket server to Railway while keeping the main Next.js app on Vercel.

**Architecture**:
```
┌─────────────────┐      HTTPS      ┌──────────────┐
│                 │ ───────────────> │              │
│  Next.js App    │                  │   Vercel     │
│  (Frontend)     │ <─────────────── │              │
│                 │                  └──────────────┘
└────────┬────────┘
         │
         │ WebSocket (wss://)
         │
         v
┌─────────────────┐
│                 │
│  Voice Server   │      STT → LLM → TTS
│  (Railway)      │      Real-time Audio Streaming
│                 │
└─────────────────┘
```

## Prerequisites

### 1. API Keys Required

You need to obtain the following API keys:

**OpenAI** (for LLM):
- Sign up at https://platform.openai.com/
- Navigate to API Keys section
- Create new key
- Cost: ~$0.01 per conversation

**Deepgram** (for Speech-to-Text):
- Sign up at https://console.deepgram.com/
- Get API key from dashboard
- Cost: ~$0.0043/minute

**ElevenLabs** (for Text-to-Speech):
- Sign up at https://elevenlabs.io/
- Get API key from settings
- Clone your voice or use a preset voice
- Get Voice ID from voice library
- Cost: ~$0.30/1000 characters (Creator tier)

**Supabase** (for authentication):
- Your existing Supabase project
- URL: From `NEXT_PUBLIC_SUPABASE_URL`
- Anon Key: From `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- JWT Secret: From Supabase Dashboard → Settings → API → JWT Secret

### 2. Railway Account

- Sign up at https://railway.app/
- No credit card required for starter plan
- $5/month usage included

## Deployment Steps

### Step 1: Prepare Repository

Ensure your voice-server package is committed:

```bash
cd apps/voice-server
git add .
git commit -m "feat: voice server ready for Railway deployment"
git push origin main
```

### Step 2: Create Railway Project

**Option A: Using Railway CLI**

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Create new project from voice-server directory:
```bash
cd apps/voice-server
railway init
```

4. Link to your GitHub repository (recommended for auto-deploys):
```bash
railway link
```

**Option B: Using Railway Dashboard**

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select your FROK repository
5. Set root directory to `apps/voice-server`

### Step 3: Configure Environment Variables

In Railway Dashboard → Variables, add:

```bash
# Port (Railway auto-assigns, but good to specify)
PORT=3001

# API Keys
OPENAI_API_KEY=sk-proj-...
DEEPGRAM_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# Supabase (copy from apps/web/.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_JWT_SECRET=your_jwt_secret_from_dashboard

# CORS Configuration
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

**Important**: Replace `your-app.vercel.app` with your actual Vercel domain.

### Step 4: Deploy

Railway will automatically deploy when you push to GitHub (if linked), or you can manually deploy:

```bash
railway up
```

Monitor deployment logs:
```bash
railway logs
```

### Step 5: Get Railway URL

After deployment succeeds:

```bash
railway domain
```

This will output something like: `your-app.railway.app`

Or check in Railway Dashboard → Settings → Domains.

### Step 6: Configure Next.js App

Update your Next.js app's Vercel environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
```bash
NEXT_PUBLIC_VOICE_WS_URL=wss://your-app.railway.app/voice/stream
```
3. Redeploy your Next.js app for changes to take effect

### Step 7: Test Connection

1. Visit your Next.js app: `https://your-app.vercel.app/voice`
2. Open browser console (F12)
3. Click "Start Voice Chat"
4. Check for successful WebSocket connection:
```
[WebSocketManager] Using configured WebSocket URL
[WebSocketManager] Connected
```

## Verification Checklist

- [ ] Voice server deployed to Railway
- [ ] Health check endpoint responding: `https://your-app.railway.app/health`
- [ ] Environment variables configured correctly
- [ ] Vercel environment variable `NEXT_PUBLIC_VOICE_WS_URL` set
- [ ] Next.js app redeployed with new env var
- [ ] WebSocket connection succeeds in browser console
- [ ] Voice chat functionality working end-to-end

## Troubleshooting

### WebSocket Connection Fails

**Check CORS Configuration**:
```bash
# Verify ALLOWED_ORIGINS includes your Vercel domain
railway variables get ALLOWED_ORIGINS
```

**Check Railway Logs**:
```bash
railway logs
# Look for: "Not allowed by CORS" or "Unauthorized"
```

**Solution**: Add your Vercel domain to `ALLOWED_ORIGINS` and redeploy.

### Authentication Errors

**Error**: "Unauthorized: Invalid token"

**Check**:
1. Verify Supabase credentials are correct
2. Ensure JWT secret matches your Supabase project
3. Check token is being passed from Next.js client

**Debug**:
```bash
# Check Supabase JWT Secret
# Go to Supabase Dashboard → Settings → API → JWT Secret
# Compare with SUPABASE_JWT_SECRET in Railway
```

### API Errors (STT/LLM/TTS)

**Check API Keys**:
```bash
railway variables get OPENAI_API_KEY
railway variables get DEEPGRAM_API_KEY
railway variables get ELEVENLABS_API_KEY
```

**Check API Quotas**:
- OpenAI: https://platform.openai.com/usage
- Deepgram: https://console.deepgram.com/billing
- ElevenLabs: https://elevenlabs.io/app/usage

### High Latency

**Possible Causes**:
- Railway's free tier has slower cold starts
- Geographic distance between Railway and API providers
- Network congestion

**Solutions**:
1. Upgrade to Railway's paid plan for dedicated resources
2. Deploy to Railway region closest to your users
3. Consider upgrading API provider plans for better performance

### Rate Limiting Issues

**Error**: "Too many concurrent connections"

**Current Limit**: 5 connections per user

**Solution**: If you need more, edit `apps/voice-server/src/index.ts`:
```typescript
const MAX_CONNECTIONS_PER_USER = 10; // Increase as needed
```

## Monitoring

### Health Checks

Railway automatically monitors `/health` endpoint.

Manual check:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "frok-voice-server",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "uptime": 12345
}
```

### Logs

View real-time logs:
```bash
railway logs --follow
```

Filter by error level:
```bash
railway logs | grep ERROR
```

### Metrics

Railway Dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Response times

Set up alerts for service downtime in Railway Dashboard → Settings → Alerts.

## Cost Estimation

**Railway**: $5-20/month
- Starter: $5/month (512MB RAM, shared CPU)
- Developer: $10/month (1GB RAM, shared CPU)
- Team: $20/month (2GB RAM, dedicated CPU)

**APIs** (per 1000 conversations):
- OpenAI GPT-4o: ~$10
- Deepgram STT: ~$4.30
- ElevenLabs TTS: ~$30 (Creator tier)

**Total Estimated Cost**: $50-100/month for moderate usage

## Scaling Considerations

**Current Capacity**: ~100 concurrent WebSocket connections per instance

**To Scale**:
1. Upgrade Railway plan for more resources
2. Enable horizontal scaling in Railway settings
3. Consider load balancing for multiple instances
4. Monitor connection count: Railway Metrics → Active Connections

## Security Best Practices

- [ ] JWT tokens verified for all connections
- [ ] Rate limiting active (5 connections per user)
- [ ] CORS properly configured
- [ ] API keys stored as environment variables (never in code)
- [ ] HTTPS/WSS used in production
- [ ] Regular security updates: `pnpm update`

## Rollback Procedure

If deployment fails or has issues:

```bash
# View deployment history
railway deployments list

# Rollback to previous deployment
railway deployments rollback <deployment-id>
```

Or in Railway Dashboard → Deployments → Rollback.

## Support

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- FROK Issues: https://github.com/your-username/frok/issues

---

**Next Steps**: After successful deployment, consider:
1. Setting up monitoring alerts
2. Implementing usage analytics
3. Adding backup API providers for resilience
4. Performance optimization based on production metrics
