# Voice Assistant Deployment Guide

## ⚠️ WebSocket Limitation on Vercel

The voice assistant feature requires **persistent WebSocket connections** for real-time bidirectional audio streaming. **Vercel's serverless functions DO NOT support WebSocket upgrades.**

### Current Status

- ✅ **Build & Deploy**: Successfully builds on Vercel
- ❌ **Runtime WebSocket**: Fails to establish WebSocket connection
- ✅ **Local Development**: Works perfectly with `pnpm dev`

### Error Message

When attempting to connect to the voice endpoint on Vercel, you'll see:
```
WebSocket connection to 'wss://frok-web.vercel.app/api/voice/stream' failed
```

---

## Deployment Options

### Option 1: Deploy Voice Endpoint Separately (Recommended)

Deploy ONLY the voice WebSocket endpoint to a platform with WebSocket support:

#### Railway (Easiest)
1. Create new Railway project
2. Deploy a standalone Node.js server with the voice endpoint
3. Update your Next.js app to connect to Railway WebSocket URL

```typescript
// apps/web/src/lib/voice/config.ts
export const VOICE_WS_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL || 'ws://localhost:3000/api/voice/stream';
```

#### Render
Similar to Railway, deploy a standalone Node.js WebSocket server.

#### Fly.io
Excellent for low-latency global deployment with WebSocket support.

### Option 2: Use Alternative Architecture (No WebSocket)

Replace WebSocket with HTTP-based streaming:

#### Server-Sent Events (SSE) for Server → Client
- Unidirectional: Server pushes updates to client
- Supported on Vercel
- Good for: LLM streaming, TTS audio chunks

#### HTTP POST for Client → Server
- Regular API calls for audio uploads
- Polling or long-polling for status

#### Implementation Example
```typescript
// POST /api/voice/transcribe - Upload audio chunk
// GET /api/voice/stream/[sessionId] - SSE for responses
```

**Trade-offs:**
- ✅ Works on Vercel serverless
- ✅ No separate deployment needed
- ❌ Higher latency (not true real-time)
- ❌ More complex client code

### Option 3: Self-Hosted Server

Deploy entire Next.js app to a server with WebSocket support:
- DigitalOcean App Platform
- AWS EC2 with Docker
- Your own VPS

---

## Recommended Solution

For production use, I recommend:

1. **Keep main app on Vercel** (frontend, API routes, static pages)
2. **Deploy voice endpoint to Railway** (WebSocket server)
3. **Configure environment variable**: `NEXT_PUBLIC_VOICE_WS_URL=wss://your-voice-server.railway.app`

This hybrid approach gives you:
- ✅ Vercel's excellent Next.js hosting
- ✅ Railway's WebSocket support
- ✅ Minimal infrastructure complexity
- ✅ Easy scaling

### Railway Deployment Example

Create `apps/voice-server/`:
```typescript
// apps/voice-server/index.ts
import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();
const server = app.listen(3001);
const wss = new WebSocketServer({ server });

// Import your voice route logic here
wss.on('connection', (ws) => {
  // Voice session handling
});
```

Deploy:
```bash
cd apps/voice-server
railway up
```

---

## Local Development

Voice features work perfectly in local development:

```bash
pnpm dev
# Voice WebSocket available at ws://localhost:3000/api/voice/stream
```

---

## Future Improvements

### Phase 2: HTTP-Based Alternative (Planned)

To make voice features work on Vercel without separate deployment:

1. Replace WebSocket with:
   - `POST /api/voice/upload` - Upload audio chunks
   - `GET /api/voice/stream/[id]` - SSE for LLM + TTS responses
   - `POST /api/voice/interrupt/[id]` - Cancel generation

2. Client-side buffer management
3. Slightly higher latency but serverless-compatible

### Phase 3: Edge Runtime Exploration

Monitor Vercel's Edge Runtime WebSocket support. Currently experimental and not production-ready for audio streaming.

---

## Documentation

- [Vercel WebSocket Limitations](https://vercel.com/docs/functions/runtimes#websockets)
- [Railway WebSocket Guide](https://docs.railway.app/guides/websockets)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**Last Updated**: 2025-01-10
**Status**: Voice feature fully implemented, requires separate WebSocket server deployment
