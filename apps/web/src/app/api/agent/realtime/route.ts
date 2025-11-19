import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { z } from 'zod';

// Validation schema
const InitSessionSchema = z.object({
  threadId: z.string().optional(),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
});

export async function POST(req: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await withRateLimit(req, rateLimitPresets.ai);
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // 2. Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { threadId, voice = 'alloy' } = InitSessionSchema.parse(body);

    // 3. Fetch Chat History (Context Sync)
    let contextInstructions = '';
    if (threadId) {
      const supabase = auth.user.supabase;
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false }) // Get latest first
        .limit(10);

      if (messages && messages.length > 0) {
        const history = messages
          .reverse() // Back to chronological order
          .map((m: any) => `${m.role}: ${m.content}`)
          .join('\n');
        contextInstructions = `\n\nRecent Conversation History:\n${history}\n\nContinue the conversation naturally from here.`;
      }
    }

    // 4. Create OpenAI Realtime Session
    // We use the REST API to create a session and get a client_secret
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-realtime', // Latest Realtime API model (Nov 2025, 66.5% ComplexFuncBench)
        voice,
        instructions: `You are FROK, an advanced AI assistant. Be concise, friendly, and helpful.
        You have access to the user's chat history.
        ${contextInstructions}`,
        modalities: ['audio', 'text'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI Session Creation Failed:', error);
      throw new Error(`OpenAI API Error: ${error}`);
    }

    const sessionData = await response.json();

    // 5. Return Client Secret
    return NextResponse.json({
      ok: true,
      data: {
        sessionId: sessionData.id,
        clientSecret: sessionData.client_secret.value,
      },
    });
  } catch (error: unknown) {
    console.error('[Realtime Init] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to initialize session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
