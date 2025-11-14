import { VoiceAgent } from './voiceAgent';

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

type VoiceAgentRecord = {
  agent: VoiceAgent;
  userId: string;
  createdAt: number;
  expiresAt: number;
};

const registry = new Map<string, VoiceAgentRecord>();

function isExpired(record: VoiceAgentRecord) {
  return Date.now() > record.expiresAt;
}

function refresh(record: VoiceAgentRecord) {
  record.expiresAt = Date.now() + SESSION_TTL_MS;
}

export function registerVoiceAgent(sessionId: string, userId: string, agent: VoiceAgent) {
  registry.set(sessionId, {
    agent,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function getVoiceAgent(sessionId: string, userId?: string): VoiceAgent | null {
  const record = registry.get(sessionId);
  if (!record) {
    return null;
  }

  if (isExpired(record)) {
    registry.delete(sessionId);
    return null;
  }

  if (userId && record.userId !== userId) {
    return null;
  }

  refresh(record);
  return record.agent;
}

export function removeVoiceAgent(sessionId: string, userId?: string): VoiceAgent | null {
  const record = registry.get(sessionId);
  if (!record) {
    return null;
  }

  if (userId && record.userId !== userId) {
    return null;
  }

  registry.delete(sessionId);
  return record.agent;
}

export function listVoiceSessionsForUser(userId: string): Array<{ sessionId: string; createdAt: number }> {
  const sessions: Array<{ sessionId: string; createdAt: number }> = [];

  for (const [sessionId, record] of registry.entries()) {
    if (isExpired(record)) {
      registry.delete(sessionId);
      continue;
    }

    if (record.userId === userId) {
      sessions.push({ sessionId, createdAt: record.createdAt });
    }
  }

  return sessions;
}

export function clearExpiredVoiceSessions() {
  for (const [sessionId, record] of registry.entries()) {
    if (isExpired(record)) {
      registry.delete(sessionId);
    }
  }
}
