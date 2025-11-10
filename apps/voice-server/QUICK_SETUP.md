# Quick Setup Guide - Railway Deployment via GitHub

Since you've already connected Railway to your GitHub repository, follow these simple steps:

## Step 1: Configure Railway Project Settings

1. Go to your Railway Dashboard: https://railway.app/dashboard
2. Find your FROK project
3. Click on the project
4. In the settings, set **Root Directory** to: `apps/voice-server`

## Step 2: Add Environment Variables

In Railway Dashboard → Variables tab, add these variables:

```bash
PORT=3001

# API Keys (you need to obtain these)
OPENAI_API_KEY=your_openai_api_key_here

# DEEPGRAM - Get from: https://console.deepgram.com/
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# ELEVENLABS - Get from: https://elevenlabs.io/
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# CORS Configuration
ALLOWED_ORIGINS=https://frok-web.vercel.app,http://localhost:3000

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://oxosqmxohnhranyihqoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94b3NxbXhvaG5ocmFueWlocW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTAyODUsImV4cCI6MjA3NjEyNjI4NX0.mE45_lWRWKEIywVMkLckL4k0xWxFgW_GHq60XYAmZjA

# SUPABASE JWT SECRET - Get from Supabase Dashboard:
# 1. Go to: https://supabase.com/dashboard/project/oxosqmxohnhranyihqoz/settings/api
# 2. Scroll to "JWT Settings"
# 3. Copy "JWT Secret"
SUPABASE_JWT_SECRET=your_jwt_secret_from_supabase
```

### Where to Get API Keys:

**Deepgram (Speech-to-Text)**:
1. Sign up at https://console.deepgram.com/
2. Go to API Keys section
3. Create new key
4. Copy the key

**ElevenLabs (Text-to-Speech)**:
1. Sign up at https://elevenlabs.io/
2. Go to Profile → API Keys
3. Create new key
4. Copy the key
5. Go to Voice Library → Select a voice or clone your own
6. Copy the Voice ID

**Supabase JWT Secret**:
1. Go to https://supabase.com/dashboard/project/oxosqmxohnhranyihqoz/settings/api
2. Scroll down to "JWT Settings"
3. Copy the "JWT Secret" value

## Step 3: Deploy

Once environment variables are set, Railway will automatically deploy when you push to GitHub.

To trigger a manual deployment:
1. Railway Dashboard → Your Project
2. Click "Deploy" button

## Step 4: Get Your Railway URL

After deployment succeeds:
1. Railway Dashboard → Your Project → Settings → Domains
2. You'll see a URL like: `your-app.railway.app`
3. Copy this URL

## Step 5: Configure Vercel

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your FROK project
3. Go to Settings → Environment Variables
4. Add new variable:
   - Key: `NEXT_PUBLIC_VOICE_WS_URL`
   - Value: `wss://your-app.railway.app/voice/stream` (replace with your actual Railway URL)
5. Save
6. Redeploy your Next.js app (Deployments → ⋯ → Redeploy)

## Step 6: Test

1. Visit your app: `https://frok-web.vercel.app/voice`
2. Open browser console (F12)
3. Click "Start Voice Chat"
4. Look for in console:
```
[WebSocketManager] Using configured WebSocket URL
[WebSocketManager] Connected
```

## Troubleshooting

**If deployment fails**:
- Check Railway logs: Dashboard → Logs
- Verify all environment variables are set
- Check that Root Directory is set to `apps/voice-server`

**If WebSocket connection fails**:
- Verify `NEXT_PUBLIC_VOICE_WS_URL` in Vercel matches your Railway URL
- Check Railway logs for authentication errors
- Verify CORS origins include your Vercel domain

**If you need help**:
- Railway logs: `railway logs` (if CLI is set up)
- Or check Railway Dashboard → Logs

---

**Quick Checklist**:
- [ ] Railway Root Directory set to `apps/voice-server`
- [ ] All environment variables added in Railway
- [ ] Deepgram API key obtained and set
- [ ] ElevenLabs API key + Voice ID obtained and set
- [ ] Supabase JWT Secret obtained and set
- [ ] Railway deployment succeeded
- [ ] Railway URL copied
- [ ] Vercel environment variable `NEXT_PUBLIC_VOICE_WS_URL` set
- [ ] Next.js app redeployed on Vercel
- [ ] WebSocket connection tested and working
