# FROK Voice Server

Standalone WebSocket server for FROK voice assistant real-time streaming.

## Why Separate Server?

Vercel's serverless functions don't support persistent WebSocket connections required for real-time voice streaming. This server handles the WebSocket endpoint separately while the main Next.js app stays on Vercel.

## Architecture

```
┌─────────────────┐      HTTPS      ┌──────────────┐
│                 │ ───────────────> │              │
│  Next.js App    │                  │   Vercel     │
│  (Vercel)       │ <─────────────── │              │
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

## Features

- ✅ WebSocket server for bidirectional audio streaming
- ✅ JWT authentication via Supabase
- ✅ Rate limiting (5 concurrent connections per user)
- ✅ CORS configuration for Vercel frontend
- ✅ Health check endpoint for monitoring
- ✅ Graceful shutdown handling

## Development

### Prerequisites

- Node.js 18+
- pnpm
- API keys: OpenAI, Deepgram, ElevenLabs
- Supabase project (for authentication)

### Setup

1. Install dependencies:
```bash
cd apps/voice-server
pnpm install
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run development server:
```bash
pnpm dev
```

Server will start on `http://localhost:3001`
- WebSocket: `ws://localhost:3001/voice/stream`
- Health check: `http://localhost:3001/health`

### Testing Locally

**Prerequisites**:
- OpenAI API key (https://platform.openai.com/api-keys)
- Deepgram API key (https://console.deepgram.com/)
- ElevenLabs API key + Voice ID (https://elevenlabs.io/)

**Setup Steps**:

1. Create `.env` file in `apps/voice-server/`:
```bash
cp .env.example .env
# Edit .env with your API keys
```

2. Required environment variables:
```bash
# From apps/web/.env.local
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Voice API Keys (obtain from respective platforms)
DEEPGRAM_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# Local development settings
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
```

3. Start voice server:
```bash
cd apps/voice-server
pnpm dev
```

4. Configure Next.js app to use local voice server:
```bash
# Add to apps/web/.env.local
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:3001/voice/stream
```

5. Start Next.js app:
```bash
cd apps/web
pnpm dev
```

6. Navigate to `http://localhost:3000/voice` in your browser

## Deployment to Railway

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_USERNAME/frok)

### Manual Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Create new project:
```bash
cd apps/voice-server
railway init
```

4. Add environment variables in Railway dashboard:
```
PORT=3001
OPENAI_API_KEY=your_key
DEEPGRAM_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id
ALLOWED_ORIGINS=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

5. Deploy:
```bash
railway up
```

6. Get your Railway URL:
```bash
railway domain
```

7. Update Next.js app environment variable:
```
NEXT_PUBLIC_VOICE_WS_URL=wss://your-app.railway.app/voice/stream
```

8. Redeploy Next.js app on Vercel with new env var

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (Railway auto-assigns) | Yes |
| `OPENAI_API_KEY` | OpenAI API key for LLM | Yes |
| `DEEPGRAM_API_KEY` | Deepgram API key for STT | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for TTS | Yes |
| `ELEVENLABS_VOICE_ID` | Your cloned voice ID | Yes |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret (for verification) | Yes |

## API Endpoints

### WebSocket: `/voice/stream`

**Authentication:** JWT token via query param `?token=xxx` or `Authorization: Bearer xxx` header

**Messages:**

Client → Server:
- `{ type: 'audio_input', data: string }` - Base64 audio chunk
- `{ type: 'end_utterance' }` - Manual end signal
- `{ type: 'interrupt' }` - Cancel current response

Server → Client:
- `{ type: 'stt_result', text: string }` - Transcription result
- `{ type: 'llm_token', token: string }` - LLM streaming token
- `{ type: 'audio_chunk', data: string }` - TTS audio (base64 MP3)
- `{ type: 'response_complete' }` - Response finished
- `{ type: 'error', error: string }` - Error message

### HTTP: `/health`

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "service": "frok-voice-server",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "uptime": 12345
}
```

## Monitoring

- Railway provides automatic health checks via `/health` endpoint
- Logs are available in Railway dashboard
- Set up alerts for service downtime

## Scaling

Railway auto-scales based on load:
- Handles up to 100 concurrent WebSocket connections per instance
- Rate limit: 5 connections per user
- Consider upgrading Railway plan for higher traffic

## Troubleshooting

### WebSocket connection fails
- Check `ALLOWED_ORIGINS` includes your Vercel domain
- Verify JWT token is valid and not expired
- Check Railway logs for authentication errors

### Audio quality issues
- Verify ElevenLabs API key and voice ID
- Check network latency between Railway and ElevenLabs
- Consider upgrading ElevenLabs plan for better quality

### High latency
- Railway's free tier may have slower cold starts
- Upgrade to paid plan for dedicated resources
- Consider deploying to region closest to your users

## Cost Estimate

**Railway**: $5-20/month (depending on usage)
**APIs**:
- OpenAI GPT-4o: ~$0.01 per conversation
- Deepgram STT: ~$0.0043/minute
- ElevenLabs TTS: ~$0.30/1000 characters (Creator tier)

Estimated cost for 1000 conversations/month: ~$30-50

## License

MIT
