import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { validateBody } from '@/lib/api/withValidation';
import { withRateLimit } from '@/lib/api/withRateLimit';
import { getSupabaseServer } from '@/lib/supabase/server';
import { errorHandler } from '@/lib/errorHandler';
import { routeMessage, getOpenAIModelId, analyzeMessageComplexity } from '@/lib/agent/routing';
import type { AgentModel } from '@/components/chat/AgentSelector';
import { getOpenAIClient } from '@/lib/openai';
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

        // Stream AI response using OpenAI API
        const openai = getOpenAIClient();
        const stream = await openai.chat.completions.create({
          model: openaiModelId,
          messages: [
            {
              role: 'system',
              content: 'You are FROK, a helpful AI assistant. Be concise, friendly, and accurate.',
            },
            {
              role: 'user',
              content,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          stream: true,
        });

        let fullResponse = '';
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullResponse += delta;
            const data = JSON.stringify({ type: 'content', content: delta });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
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

  // Get OpenAI API response
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
 * Generate AI response content using OpenAI API
 */
async function getAIResponseContent(userMessage: string, openaiModelId: string): Promise<string> {
  const openai = getOpenAIClient();

  try {
    const completion = await openai.chat.completions.create({
      model: openaiModelId,
      messages: [
        {
          role: 'system',
          content: 'You are FROK, a helpful AI assistant. Be concise, friendly, and accurate.',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0]?.message?.content?.trim();
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    return responseContent;
  } catch (error) {
    errorHandler.logError({
      message: error instanceof Error ? error.message : 'OpenAI API error',
      severity: 'high',
      context: { function: 'getAIResponseContent', model: openaiModelId },
    });

    // Fallback response
    return "I'm sorry, I encountered an error processing your request. Please try again.";
  }
}
