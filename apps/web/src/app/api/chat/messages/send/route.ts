import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateBody } from '@/lib/api/withValidation';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { getSupabaseServer } from '@/lib/supabase/server';
import { errorHandler } from '@/lib/errorHandler';
import { routeMessage, getOpenAIModelId, analyzeMessageComplexity } from '@/lib/agent/routing';
import type { AgentModel } from '@/components/chat/AgentSelector';
import { z } from 'zod';

// ============================================================================
// Send Message API Route
// ============================================================================

/**
 * POST /api/chat/messages/send
 *
 * Sends a message to a thread and gets AI response
 *
 * Features:
 * - Authentication required
 * - Rate limiting (AI tier: 5 req/min)
 * - Input validation with Zod
 * - Server-Sent Events (SSE) streaming support
 * - Optimistic message creation
 * - AI agent integration
 * - File attachment support
 */

const SendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  fileUrls: z.array(z.string().url()).optional(),
  agentModel: z.enum(['gpt-5-think', 'gpt-5-mini', 'gpt-5-nano', 'auto']).default('auto'),
});

export async function POST(req: NextRequest) {
  // Rate limiting (AI tier: 5 requests per minute)
  const rateLimitResult = await withRateLimit(req, {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (!rateLimitResult.ok) return rateLimitResult.response;

  // Authentication
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Validation
  const validated = await validateBody(req, SendMessageSchema);
  if (!validated.ok) return validated.response;

  const { threadId, content, fileUrls, agentModel } = validated.data;
  const userId = auth.user.userId;

  try {
    const supabase = await getSupabaseServer();

    // Verify thread ownership and get history
    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('id, user_id')
      .eq('id', threadId)
      .eq('user_id', userId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { ok: false, error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Get thread history for routing context
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    const threadHistory = messages || [];

    // Route to appropriate model (default to 'auto' if not provided)
    const routing = routeMessage(content, agentModel || 'auto', threadHistory);
    const selectedModel = routing.model;
    const openaiModelId = getOpenAIModelId(selectedModel);
    const complexity = analyzeMessageComplexity(content);

    // Insert user message with agent metadata
    const { data: userMessage, error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        thread_id: threadId,
        user_id: userId,
        role: 'user',
        content,
        metadata: {
          ...(fileUrls ? { fileUrls } : {}),
          requestedModel: agentModel,
        },
      })
      .select()
      .single();

    if (userMessageError || !userMessage) {
      throw new Error('Failed to create user message');
    }

    // Check if client accepts SSE
    const acceptHeader = req.headers.get('accept') || '';
    const supportsSSE = acceptHeader.includes('text/event-stream');

    if (supportsSSE) {
      // Return streaming response with agent info
      return createSSEResponse(
        threadId,
        content,
        userId,
        selectedModel,
        openaiModelId,
        routing.reasoning,
        complexity
      );
    } else {
      // Return immediate response (non-streaming) with agent info
      const assistantMessage = await getAIResponse(
        threadId,
        content,
        userId,
        selectedModel,
        openaiModelId,
        routing.reasoning,
        complexity
      );

      return NextResponse.json({
        ok: true,
        message: {
          id: assistantMessage.id,
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date(assistantMessage.created_at).getTime(),
        },
        agent: {
          model: selectedModel,
          reasoning: routing.reasoning,
          complexity: complexity.score,
        },
      });
    }
  } catch (error: unknown) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'high',
      context: { route: '/api/chat/messages/send', userId, threadId },
    });

    return NextResponse.json(
      { ok: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create Server-Sent Events (SSE) streaming response with agent info
 */
function createSSEResponse(
  threadId: string,
  content: string,
  userId: string,
  selectedModel: AgentModel,
  openaiModelId: string,
  routingReasoning: string,
  complexity: { score: number; factors: { length: number; codeBlocks: number; mathSymbols: number; questionDepth: number; technicalTerms: number; }; recommendedModel: AgentModel; }
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send agent metadata first
        const agentInfo = JSON.stringify({
          type: 'agent',
          model: selectedModel,
          reasoning: routingReasoning,
          complexity: complexity.score,
          openaiModel: openaiModelId,
        });
        controller.enqueue(encoder.encode(`data: ${agentInfo}\n\n`));

        // Simulate streaming AI response
        // TODO: Replace with actual OpenAI API call using openaiModelId
        const fullResponse = await getAIResponseContent(content, openaiModelId);
        const words = fullResponse.split(' ');

        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');

          const data = JSON.stringify({ type: 'content', content: chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // Simulate streaming delay based on model speed
          const delay = selectedModel === 'gpt-5-think' ? 80 : selectedModel === 'gpt-5-mini' ? 50 : 30;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Save complete message to database with agent metadata
        const supabase = await getSupabaseServer();
        await supabase.from('chat_messages').insert({
          thread_id: threadId,
          user_id: userId,
          role: 'assistant' as const,
          content: fullResponse,
          metadata: {
            agentModel: selectedModel,
            openaiModel: openaiModelId,
            routingReasoning,
            complexityScore: complexity.score,
            complexityFactors: complexity.factors,
          } as Record<string, unknown>,
        });

        // Send done signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Get AI response (non-streaming) with agent info
 */
async function getAIResponse(
  threadId: string,
  content: string,
  userId: string,
  selectedModel: AgentModel,
  openaiModelId: string,
  routingReasoning: string,
  complexity: { score: number; factors: { length: number; codeBlocks: number; mathSymbols: number; questionDepth: number; technicalTerms: number; }; recommendedModel: AgentModel; }
) {
  const supabase = await getSupabaseServer();

  // TODO: Replace with actual OpenAI API call using openaiModelId
  const responseContent = await getAIResponseContent(content, openaiModelId);

  // Insert assistant message with agent metadata
  const { data: assistantMessage, error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      user_id: userId,
      role: 'assistant' as const,
      content: responseContent,
      metadata: {
        agentModel: selectedModel,
        openaiModel: openaiModelId,
        routingReasoning,
        complexityScore: complexity.score,
        complexityFactors: complexity.factors,
      } as Record<string, unknown>,
    })
    .select()
    .single();

  if (error || !assistantMessage) {
    throw new Error('Failed to create assistant message');
  }

  return assistantMessage;
}

/**
 * Generate AI response content
 * TODO: Replace with actual OpenAI API integration
 */
async function getAIResponseContent(userMessage: string, openaiModelId: string): Promise<string> {
  // Placeholder AI response with model-aware behavior
  const modelInfo = openaiModelId.includes('gpt-5') ? 'GPT-5' : 'AI model';

  const responses = [
    `I understand you said: "${userMessage}". How can I help you further? (Processing with ${modelInfo})`,
    `That's an interesting question about "${userMessage}". Let me explain using ${modelInfo}...`,
    `Based on your message about "${userMessage}", here's what I think using ${modelInfo}...`,
  ];

  // Simulate AI processing delay based on model complexity
  const delay = openaiModelId.includes('think') ? 1000 : openaiModelId.includes('mini') ? 600 : 400;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex] ?? responses[0] ?? `I understand. How can I help you with "${userMessage}"?`;
}
