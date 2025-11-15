/**
 * Enhanced Smart Stream Agent Route
 *
 * Features:
 * - Response caching for cost optimization
 * - Structured outputs with schema validation
 * - Built-in OpenAI tools (web_search, file_search, code_interpreter, computer_use)
 * - Enhanced guardrails for safety and quality
 * - Streaming progress indicators
 */

import { NextRequest } from 'next/server';
import { AgentInputItem, Runner, withTrace, type Tool } from '@openai/agents';
import { performance } from 'perf_hooks';
import { createEnhancedAgentSuite } from '@/lib/agent/orchestrator-enhanced';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { agentCache } from '@/lib/cache/agentCache';
import {
  getDefaultTools,
  getToolConfiguration,
  recommendTools,
  type ToolType,
} from '@/lib/agent/tools-unified';
import {
  parseAgentResponse,
  createErrorResponse,
} from '@/lib/agent/responseSchemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

type ChatMessage = {
  role: string;
  content: string;
};

type InputContent =
  | { type: 'input_text'; text: string; providerData?: Record<string, unknown> }
  | { type: 'input_image'; image?: string; detail?: string; providerData?: Record<string, unknown> };

// ============================================================================
// Query Classification
// ============================================================================

async function classifyQuery(query: string): Promise<'simple' | 'moderate' | 'complex'> {
  // Ultra-fast pattern matching first
  const simplePatterns = [
    /turn (on|off|the).+(light|lamp|switch|fan|tv)/i,
    /(lights?|lamps?) (on|off)/i,
    /(open|close).+(door|window|garage)/i,
    /weather|temperature|forecast/i,
    /what time is it/i,
    /^(hi|hello|hey)[\s\W]*$/i,
  ];

  if (simplePatterns.some((pattern) => pattern.test(query))) {
    return 'simple';
  }

  // Complex patterns
  const complexPatterns = [
    /(write|create|build|develop|code|implement|design)/i,
    /(analyze|explain|describe|detail).+how/i,
    /(plan|strategy|architect|system)/i,
    /(compare|contrast|difference between)/i,
    /(debug|fix|solve|troubleshoot).+(code|error|bug)/i,
    /(calculate|compute).+(complex|advanced)/i,
  ];

  if (complexPatterns.some((pattern) => pattern.test(query))) {
    return 'complex';
  }

  // Default to moderate
  return 'moderate';
}

// ============================================================================
// Model & Tool Selection
// ============================================================================

const FAST_MODEL = process.env['OPENAI_FAST_MODEL'] ?? 'gpt-5-nano';
const BALANCED_MODEL =
  process.env['OPENAI_BALANCED_MODEL'] ?? process.env['OPENAI_GENERAL_MODEL'] ?? 'gpt-5-mini';
const COMPLEX_MODEL =
  process.env['OPENAI_COMPLEX_MODEL'] ?? process.env['OPENAI_AGENT_MODEL'] ?? 'gpt-5-think';

function selectModelAndTools(
  complexity: 'simple' | 'moderate' | 'complex',
  userModel?: string,
  query?: string
) {
  const normalizedPreference = userModel?.toLowerCase();

  // Get recommended tools based on query
  const recommendedTools = query ? recommendTools(query) : [];

  // User preference overrides
  if (normalizedPreference === 'gpt-5-nano') {
    return {
      model: FAST_MODEL,
      tools: getDefaultTools('simple'),
      orchestrate: false,
    };
  }

  if (normalizedPreference === 'gpt-5-mini') {
    return {
      model: BALANCED_MODEL,
      tools: getDefaultTools('moderate'),
      orchestrate: false,
    };
  }

  if (normalizedPreference === 'gpt-5-think') {
    return {
      model: COMPLEX_MODEL,
      tools: getDefaultTools('complex'),
      orchestrate: true,
    };
  }

  if (normalizedPreference === 'gpt-5') {
    return {
      model: 'gpt-5',
      tools: getDefaultTools(complexity),
      orchestrate: complexity !== 'simple',
    };
  }

  // Smart routing based on complexity
  switch (complexity) {
    case 'simple':
      return {
        model: FAST_MODEL,
        tools: getDefaultTools('simple'),
        orchestrate: false,
      };

    case 'moderate':
      return {
        model: BALANCED_MODEL,
        tools: recommendedTools.length > 0 ? recommendedTools : getDefaultTools('moderate'),
        orchestrate: false,
      };

    case 'complex':
      return {
        model: COMPLEX_MODEL,
        tools: getDefaultTools('complex'),
        orchestrate: true,
      };

    default:
      return {
        model: BALANCED_MODEL,
        tools: getDefaultTools('moderate'),
        orchestrate: false,
      };
  }
}

// ============================================================================
// Main Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Rate limiting (5 requests per minute for AI operations)
  const rateLimit = await withRateLimit(req, rateLimitPresets.ai);
  if (!rateLimit.ok) return rateLimit.response;

  const user_id = auth.user.userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const input_as_text = String(body?.input_as_text ?? '').trim();
        const images = body?.images || [];
        const userModel = body?.model;
        const enabledTools = body?.enabled_tools;
        const conversationHistory = body?.conversation_history || [];
        const threadId = body?.thread_id;
        const useCache = body?.use_cache !== false; // Default to true
        const useStructuredOutputs = body?.use_structured_outputs !== false; // Default to true

        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        if (!input_as_text && images.length === 0) {
          send(createErrorResponse('input_as_text or images required'));
          controller.close();
          return;
        }

        // ============================================================================
        // Check Cache First
        // ============================================================================

        if (useCache && images.length === 0) {
          // Only cache text-only queries
          const cached = await agentCache.get(input_as_text, user_id, threadId);

          if (cached) {
            console.log('[smart-stream] Cache hit:', input_as_text.substring(0, 50));

            // Send metadata
            send({
              type: 'metadata',
              metadata: {
                ...cached.metadata,
                cached: true,
                cacheHitCount: cached.hitCount,
              },
            });

            // Stream cached response
            const output = cached.output;
            const chunkSize = 64;

            for (let i = 0; i < output.length; i += chunkSize) {
              const delta = output.slice(i, Math.min(i + chunkSize, output.length));
              send({ type: 'content_delta', delta, done: false });
            }

            send({
              type: 'done',
              content: output,
              done: true,
              metrics: {
                durationMs: 0,
                cached: true,
                model: cached.metadata.model,
              },
            });

            controller.close();
            return;
          }
        }

        // ============================================================================
        // Load Conversation History
        // ============================================================================

        let historyItems: AgentInputItem[] = [];
        if (threadId && conversationHistory.length === 0) {
          try {
            const supabase = auth.user.supabase;

            // Security: Verify thread belongs to user
            // Note: RLS policies already filter by user_id, so .eq('user_id') is redundant
            // but we keep it for explicit security validation
            const { data: thread, error: threadError } = await supabase
              .from('chat_threads')
              .select('id, user_id')
              .eq('id', threadId)
              .eq('user_id', user_id)
              .single();

            if (!thread) {
              // Enhanced error logging for debugging RLS issues
              console.error('[smart-stream-enhanced] Thread lookup failed:', {
                threadId,
                user_id,
                error: threadError,
                errorCode: threadError?.code,
                isDev: process.env["NODE_ENV"] === 'development',
                hasDevBypass: process.env["DEV_BYPASS_AUTH"] === 'true',
                hint: 'Check if thread exists and belongs to user. In dev mode with DEV_BYPASS_AUTH, ensure SUPABASE_SERVICE_ROLE_KEY is set.'
              });

              send(createErrorResponse('Thread not found or access denied', {
                errorCode: 'THREAD_NOT_FOUND',
                retryable: false
              }));
              controller.close();
              return;
            }

            const { data: messages } = await supabase
              .from('chat_messages')
              .select('role, content')
              .eq('thread_id', threadId)
              .order('created_at', { ascending: true })
              .limit(20);

            if (messages && messages.length > 0) {
              historyItems = messages.map((msg: ChatMessage) => {
                if (msg.role === 'user') {
                  return {
                    role: 'user' as const,
                    content: [{ type: 'input_text' as const, text: msg.content }],
                  };
                } else {
                  return {
                    role: 'assistant' as const,
                    status: 'completed' as const,
                    content: [{ type: 'output_text' as const, text: msg.content }],
                  };
                }
              });
            }
          } catch (e) {
            console.warn('[history load failed]', e);
          }
        } else if (conversationHistory.length > 0) {
          historyItems = conversationHistory;
        }

        // ============================================================================
        // Query Classification & Tool Selection
        // ============================================================================

        const complexity = await classifyQuery(input_as_text);
        const { model: selectedModel, tools: selectedTools, orchestrate } = selectModelAndTools(
          complexity,
          userModel,
          input_as_text
        );

        // Get tool configuration
        const toolsConfig = getToolConfiguration(enabledTools || selectedTools, {
          preferBuiltIn: true,
          includeExperimental: false,
        });

        console.log('[smart-stream] Configuration:', {
          complexity,
          model: selectedModel,
          orchestrate,
          tools: toolsConfig.metadata.map((t) => t.displayName),
          builtInTools: toolsConfig.builtIn.length,
          customTools: toolsConfig.custom.length,
        });

        // ============================================================================
        // Create Agent Suite
        // ============================================================================

        await withTrace('FROK Enhanced Assistant Stream', async () => {
          const suite = orchestrate
            ? await createEnhancedAgentSuite({
                preferFastGeneral: complexity !== 'complex',
                models: {
                  general: selectedModel,
                  router: FAST_MODEL,
                  home: FAST_MODEL,
                  memory: FAST_MODEL,
                  research: BALANCED_MODEL,
                  code: BALANCED_MODEL,
                },
                enabledTools: selectedTools as ToolType[],
                useStructuredOutputs,
                includeExperimentalTools: false,
                userId: user_id,
                enableHooks: true,
              })
            : null;

          // Build input content
          const content: InputContent[] = [];

          if (input_as_text) {
            content.push({ type: 'input_text', text: input_as_text });
          }

          for (const imageUrl of images) {
            content.push({
              type: 'input_image',
              image: imageUrl,
            });
          }

          const metadataModel = suite?.models.general ?? selectedModel;

          // Send metadata
          send({
            type: 'metadata',
            metadata: {
              complexity,
              model: metadataModel,
              routing: orchestrate ? 'orchestrator' : 'direct',
              historyLength: historyItems.length,
              tools: toolsConfig.metadata.map((t) => t.displayName),
              toolSource: suite ? 'enhanced' : 'custom',
              models: orchestrate ? suite?.models : { general: metadataModel },
              structuredOutputs: useStructuredOutputs,
              cached: false,
            },
          });

          // Create runner
          const runner = new Runner({
            traceMetadata: {
              __trace_source__: 'agent-builder-enhanced',
              workflow_id: process.env['WORKFLOW_ID'] || 'unknown',
              user_id,
              thread_id: threadId,
            },
          });

          let result;
          const startedAt = performance.now();

          // ============================================================================
          // Run Agent
          // ============================================================================

          if (orchestrate && suite) {
            const orchestratedConversation: AgentInputItem[] = [
              ...suite.primer,
              ...historyItems,
              {
                role: 'user',
                content,
              },
            ];

            result = await runner.run(suite.orchestrator, orchestratedConversation);
          } else {
            // Direct agent with simplified configuration
            const { Agent } = await import('@openai/agents');

            const instructions =
              complexity === 'simple'
                ? 'Be extremely concise. Execute the requested action directly without explanation unless asked.'
                : complexity === 'complex'
                ? 'Be thorough and detailed. Use reasoning effort to provide comprehensive analysis.'
                : 'Be helpful and concise. Use tools when needed.';

            const agent = new Agent({
              name: 'FROK Assistant',
              instructions,
              model: selectedModel,
              tools: [...toolsConfig.custom, ...toolsConfig.builtIn] as Tool<unknown>[],
            });

            const directConversation: AgentInputItem[] = [
              ...historyItems,
              {
                role: 'user',
                content,
              },
            ];

            result = await runner.run(agent, directConversation);
          }

          const durationMs = Math.round(performance.now() - startedAt);

          // ============================================================================
          // Process & Stream Response
          // ============================================================================

          if (result.finalOutput) {
            const output = String(result.finalOutput);

            // Try to parse structured output
            let parsedResponse = null;
            if (useStructuredOutputs) {
              try {
                parsedResponse = parseAgentResponse(output);
                console.log('[smart-stream] Structured output:', parsedResponse.type);
              } catch (e) {
                console.warn('[smart-stream] Failed to parse structured output, using raw:', e);
              }
            }

            // Stream output
            const chunkSize = 64;
            for (let i = 0; i < output.length; i += chunkSize) {
              const delta = output.slice(i, Math.min(i + chunkSize, output.length));
              send({ type: 'content_delta', delta, done: false });
            }

            // Send final response
            send({
              type: 'done',
              content: output,
              structuredOutput: parsedResponse,
              done: true,
              metrics: {
                durationMs,
                model: metadataModel,
                route: orchestrate ? 'orchestrator' : 'direct',
                complexity,
              },
              tools: toolsConfig.metadata.map((t) => t.displayName),
            });

            // ============================================================================
            // Cache Response
            // ============================================================================

            if (useCache && images.length === 0) {
              await agentCache.set(input_as_text, user_id, {
                output,
                metadata: {
                  model: metadataModel,
                  complexity,
                  routing: orchestrate ? 'orchestrator' : 'direct',
                  toolsUsed: toolsConfig.metadata.map((t) => t.displayName),
                  toolSource: suite ? 'enhanced' : 'custom',
                  models: orchestrate ? suite?.models : { general: metadataModel },
                },
              }, threadId);
            }
          } else {
            send(createErrorResponse('No response from agent', {
              errorCode: 'NO_RESPONSE',
              retryable: true,
            }));
          }
        });

        controller.close();
      } catch (error: unknown) {
        console.error('[smart-stream-enhanced error]', error);
        const message = error instanceof Error ? error.message : 'Stream failed';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(createErrorResponse(message, {
            errorCode: 'STREAM_ERROR',
            retryable: true,
          }))}\n\n`)
        );
        controller.close();
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
