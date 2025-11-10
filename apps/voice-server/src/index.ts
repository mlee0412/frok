/**
 * FROK Voice Server - Standalone WebSocket Server for Railway
 *
 * This server handles real-time voice assistant WebSocket connections
 * that are not supported by Vercel's serverless functions.
 *
 * Architecture:
 * - Express HTTP server for health checks and CORS
 * - WebSocket server for voice streaming (STT → LLM → TTS)
 * - JWT authentication via Supabase
 * - Rate limiting per user connection
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupVoiceSession } from './voiceSession.js';
import { verifyAuthToken } from './auth.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env['PORT'] || '3001', 10);
const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] || 'http://localhost:3000').split(',');

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'frok-voice-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/voice/stream',
  verifyClient: async (info, callback) => {
    try {
      // Extract authorization token from query params or headers
      const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
      const token =
        url.searchParams.get('token') ||
        info.req.headers['authorization']?.replace('Bearer ', '');

      if (!token) {
        callback(false, 401, 'Unauthorized: No token provided');
        return;
      }

      // Verify JWT token
      const user = await verifyAuthToken(token);

      if (!user) {
        callback(false, 401, 'Unauthorized: Invalid token');
        return;
      }

      // Attach user to request for later use
      (info.req as any).user = user;
      callback(true);
    } catch (error) {
      console.error('[WebSocketServer] Verification error:', error);
      callback(false, 500, 'Internal server error');
    }
  },
});

// Connection tracking for rate limiting
const userConnections = new Map<string, number>();
const MAX_CONNECTIONS_PER_USER = 5;

wss.on('connection', async (ws: WebSocket, req: any) => {
  const user = req.user;
  const userId = user.id;

  console.log(`[VoiceServer] New connection from user ${userId}`);

  // Rate limiting: Check concurrent connections
  const currentConnections = userConnections.get(userId) || 0;
  if (currentConnections >= MAX_CONNECTIONS_PER_USER) {
    console.warn(`[VoiceServer] Rate limit exceeded for user ${userId}`);
    ws.close(1008, 'Too many concurrent connections');
    return;
  }

  // Track connection
  userConnections.set(userId, currentConnections + 1);

  // Setup voice session
  try {
    await setupVoiceSession(ws, userId);
  } catch (error) {
    console.error('[VoiceServer] Session setup error:', error);
    ws.close(1011, 'Session setup failed');
  }

  // Cleanup on disconnect
  ws.on('close', () => {
    const count = userConnections.get(userId) || 1;
    if (count <= 1) {
      userConnections.delete(userId);
    } else {
      userConnections.set(userId, count - 1);
    }
    console.log(`[VoiceServer] Connection closed for user ${userId}`);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[VoiceServer] HTTP server listening on port ${PORT}`);
  console.log(`[VoiceServer] WebSocket endpoint: ws://localhost:${PORT}/voice/stream`);
  console.log(`[VoiceServer] Health check: http://localhost:${PORT}/health`);
  console.log(`[VoiceServer] Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[VoiceServer] SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('[VoiceServer] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[VoiceServer] SIGINT received, closing server gracefully');
  server.close(() => {
    console.log('[VoiceServer] Server closed');
    process.exit(0);
  });
});
