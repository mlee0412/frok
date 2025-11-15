import { NextRequest } from 'next/server';
import { Agent, AgentInputItem, Runner, type Tool } from '@openai/agents';
import { performance } from 'perf_hooks';
import { createAgentSuite, getReasoningEffort, supportsReasoning } from '@/lib/agent/orchestrator';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';
import { ProgressEmitter } from '@/lib/agent/streamingProgress';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Enhanced Streaming Route with Progress Indicators
 *
 * Phase 2.2: Real-time visibility into agent execution
 *
 * Progress events emitted:
 * - metadata: Initial request info (model, complexity, tools)
 * - progress: Status updates (query classification, agent selection, tool execution)
 * - handoff: Agent routing (orchestrator → specialist)
 * - delta: Response text chunks
 * - done: Final response with metrics
 * - error: Any errors that occur
 *
 * Event format (SSE):
 * data: {"type":"progress","timestamp":"...","data":{...}}
 */

type ChatMessage = {
  role: string;
  content: string;
};

type InputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image?: string; detail?: string };

async function classifyQuery(query: string): Promise<'simple' | 'moderate' | 'complex'> {
  const simplePatterns = [
    /turn (on|off|the).+(light|lamp|switch|fan|tv)/i,
    /(lights?|lamps?) (on|off)/i,
    /weather|temperature|forecast/i,
    /^(hi|hello|hey)[\s\W]*$/i,
  ];

  if (simplePatterns.some(pattern => pattern.test(query))) {
    return 'simple';
  }

  const complexPatterns = [
    /(write|create|build|develop|code|implement|design)/i,
    /(analyze|explain|describe|detail).+how/i,
    /(plan|strategy|architect|system)/i,
    /(compare|contrast|difference between)/i,
  ];

  if (complexPatterns.some(pattern => pattern.test(query))) {
    return 'complex';
  }

  return 'moderate';
}

const FAST_MODEL = process.env['OPENAI_FAST_MODEL'] ?? 'gpt-5-nano';
const BALANCED_MODEL = process.env['OPENAI_BALANCED_MODEL'] ?? 'gpt-5-mini';
const COMPLEX_MODEL = process.env['OPENAI_COMPLEX_MODEL'] ?? 'gpt-5-think';

function selectModelAndTools(
  complexity: 'simple' | 'moderate' | 'complex',
  userModel?: string,
  query?: string
) {
  const normalizedPreference = userModel?.toLowerCase();
  const queryLower = query?.toLowerCase() || '';

  const isHomeQuery = /\b(turn|light|lamp|switch|fan|tv|door|window)\b/i.test(queryLower);
  const isSearchQuery = /\b(search|find|lookup|what is|who is)\b/i.test(queryLower);

  // User preference overrides
  if (normalizedPreference === 'gpt-5-nano') {
    return { model: FAST_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: false };
  }

  if (normalizedPreference === 'gpt-5-mini') {
    return { model: BALANCED_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: false };
  }

  if (normalizedPreference === 'gpt-5-think') {
    return {
      model: COMPLEX_MODEL,
      tools: ['home_assistant', 'memory', 'web_search'],
      orchestrate: true,
    };
  }

  // Smart routing based on complexity AND query type
  switch (complexity) {
    case 'simple':
      if (isHomeQuery) {
        return { model: FAST_MODEL, tools: ['home_assistant'], orchestrate: false };
      }
      return { model: FAST_MODEL, tools: ['home_assistant', 'memory'], orchestrate: false };

    case 'moderate':
      if (isSearchQuery) {
        return { model: BALANCED_MODEL, tools: ['web_search', 'memory'], orchestrate: false };
      }
      return { model: BALANCED_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: false };

    case 'complex':
      return {
        model: COMPLEX_MODEL,
        tools: ['home_assistant', 'memory', 'web_search'],
        orchestrate: true,
      };

    default:
      return { model: BALANCED_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: false };
  }
}

export async function POST(req: NextRequest) {
  // Authenticate user
  const auth = await withAuth(req);
  if (!auth.ok) return auth.response;

  // Rate limiting (5 requests per minute for AI operations)
  const rateLimit = await withRateLimit(req, rateLimitPresets.ai);
  if (!rateLimit.ok) return rateLimit.response;

  const user_id = auth.user.userId;

  const stream = new ReadableStream({
    async start(controller) {
      const emitter = new ProgressEmitter(controller);

      try {
        const body = await req.json();
        const input_as_text = String(body?.input_as_text ?? '').trim();
        const images = body?.images || [];
        const userModel = body?.model;
        const enabledTools = body?.enabled_tools;
        const conversationHistory = body?.conversation_history || [];
        const threadId = body?.thread_id;

        if (!input_as_text && images.length === 0) {
          emitter.error('input_as_text or images required');
          emitter.close();
          return;
        }

        // Progress: Loading history
        let historyItems: AgentInputItem[] = [];
        if (threadId && conversationHistory.length === 0) {
          emitter.progress('loading_history', 'Loading conversation history...', 10);

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
              console.error('[stream-with-progress] Thread lookup failed:', {
                threadId,
                user_id,
                error: threadError,
                isDev: process.env["NODE_ENV"] === 'development',
                hasDevBypass: process.env["DEV_BYPASS_AUTH"] === 'true',
              });

              emitter.error('Thread not found or access denied');
              emitter.close();
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

            emitter.progress('history_loaded', `Loaded ${historyItems.length} previous messages`, 20);
          } catch (e) {
            console.warn('[history load failed]', e);
            emitter.progress('history_error', 'Could not load history, proceeding without context', 20);
          }
        } else if (conversationHistory.length > 0) {
          historyItems = conversationHistory;
          emitter.progress('history_provided', `Using ${historyItems.length} provided messages`, 20);
        }

        // Progress: Classifying query
        emitter.progress('classifying', 'Analyzing query complexity...', 30);
        const complexity = await classifyQuery(input_as_text);

        // Progress: Selecting model and tools
        emitter.progress('selecting_model', `Query complexity: ${complexity}`, 40);
        const { model: selectedModel, tools: selectedTools, orchestrate } = selectModelAndTools(
          complexity,
          userModel,
          input_as_text
        );

        emitter.progress('model_selected', `Using ${selectedModel}`, 50);

        // Progress: Loading tools
        emitter.progress('loading_tools', 'Loading AI tools...', 60);

        const loadToolset = async (userId: string) => {
          // Create user-specific memory tools for proper data isolation
          const { createUserMemoryTools } = await import('@/lib/agent/tools-user-specific');
          const { memoryAdd, memorySearch } = createUserMemoryTools(userId);

          try {
            const mod = await import('@/lib/agent/tools-improved');
            return {
              haSearch: mod.haSearch,
              haCall: mod.haCall,
              memoryAdd, // ✅ User-specific
              memorySearch, // ✅ User-specific
              webSearch: mod.webSearch,
              source: 'improved' as const,
            };
          } catch (err) {
            console.warn('[tools fallback]', err);
            const mod = await import('@/lib/agent/tools');
            return {
              haSearch: mod.haSearch,
              haCall: mod.haCall,
              memoryAdd, // ✅ User-specific
              memorySearch, // ✅ User-specific
              webSearch: mod.webSearch,
              source: 'basic' as const,
            };
          }
        };

        // Create agent suite or load tools
        let suite = null;
        if (orchestrate) {
          emitter.progress('creating_suite', 'Creating agent orchestrator...', 70);
          suite = await createAgentSuite({
            userId: user_id, // ✅ Pass authenticated user ID for memory isolation
            preferFastGeneral: complexity !== 'complex',
            models: {
              general: selectedModel,
              router: FAST_MODEL,
              home: FAST_MODEL,
              memory: FAST_MODEL,
              research: BALANCED_MODEL,
            },
          });
        }

        const toolset = suite?.tools ?? (await loadToolset(user_id)); // ✅ Pass user_id

        const toolMap: Record<string, unknown> = {
          'home_assistant': [toolset.haSearch, toolset.haCall],
          memory: [toolset.memoryAdd, toolset.memorySearch],
          web_search: toolset.webSearch,
          haSearch: toolset.haSearch,
          haCall: toolset.haCall,
          memoryAdd: toolset.memoryAdd,
          memorySearch: toolset.memorySearch,
          webSearch: toolset.webSearch,
        };

        const flattenTools = (names: string[]): Tool<unknown>[] =>
          names
            .map(name => toolMap[name])
            .flat()
            .filter(Boolean) as Tool<unknown>[];

        const requestedToolNames = enabledTools && enabledTools.length > 0 ? enabledTools : selectedTools;
        const finalTools = flattenTools(requestedToolNames);

        // Send metadata
        emitter.metadata({
          complexity,
          model: suite?.models.general ?? selectedModel,
          routing: orchestrate ? 'orchestrator' : 'direct',
          historyLength: historyItems.length,
          tools: requestedToolNames,
          toolSource: suite?.tools.source ?? toolset.source,
          models: orchestrate ? suite?.models : { general: selectedModel },
        });

        // Build input content
        const content: InputContent[] = [];
        if (input_as_text) {
          content.push({ type: 'input_text', text: input_as_text });
        }
        for (const imageUrl of images) {
          content.push({ type: 'input_image', image: imageUrl });
        }

        // Progress: Running agent
        emitter.progress('running_agent', orchestrate ? 'Running orchestrator...' : 'Running agent...', 80);

        const runner = new Runner({
          traceMetadata: {
            __trace_source__: 'agent-builder',
            workflow_id: process.env['WORKFLOW_ID'] || 'unknown',
          },
        });

        let result;
        const startedAt = performance.now();

        if (orchestrate && suite) {
          // Notify handoff to orchestrator
          emitter.handoff('User', 'FROK Orchestrator', 'Starting orchestrated execution');

          const orchestratedConversation: AgentInputItem[] = [
            ...suite.primer,
            ...historyItems,
            { role: 'user', content },
          ];

          result = await runner.run(suite.orchestrator, orchestratedConversation);
        } else {
          let instructions =
            complexity === 'simple'
              ? 'Be EXTREMELY brief. For home automation: just confirm the action. For other queries: answer in 1-2 sentences max.'
              : complexity === 'complex'
              ? 'Be thorough and detailed. Use reasoning effort to provide comprehensive analysis.'
              : 'Be helpful and concise. Use tools when needed.';

          if (complexity !== 'simple') {
            instructions += '\n\nUse Markdown formatting for clarity (bold, italics, lists, code blocks, etc.).';
          }

          const modelSettings: Record<string, unknown> = { store: true };

          if (supportsReasoning(selectedModel)) {
            modelSettings['reasoning'] = {
              effort: complexity === 'complex' ? getReasoningEffort(selectedModel) : 'low',
            };
          }

          const agent = new Agent({
            name: 'FROK Assistant',
            instructions,
            model: selectedModel,
            modelSettings,
            tools: finalTools,
          });

          const directConversation: AgentInputItem[] = [
            ...historyItems,
            { role: 'user', content },
          ];

          result = await runner.run(agent, directConversation);
        }

        const durationMs = Math.round(performance.now() - startedAt);

        // Progress: Generating response
        emitter.progress('generating_response', 'Generating response...', 90);

        if (result.finalOutput) {
          const output = String(result.finalOutput);
          const chunkSize = 64;

          // Stream response in chunks
          for (let i = 0; i < output.length; i += chunkSize) {
            const delta = output.slice(i, Math.min(i + chunkSize, output.length));
            emitter.delta(delta);
          }

          // Send done event with metrics
          emitter.done(output, {
            duration_ms: durationMs,
            model: suite?.models.general ?? selectedModel,
            complexity,
            routing: orchestrate ? 'orchestrator' : 'direct',
          });
        } else {
          emitter.error('No output generated from agent', {
            duration_ms: durationMs,
          });
        }

        emitter.close();
      } catch (error: unknown) {
        console.error('[stream-with-progress] Error:', error);
        emitter.error(
          error instanceof Error ? error.message : 'Unknown error occurred',
          {
            stack: error instanceof Error ? error.stack : undefined,
          }
        );
        emitter.close();
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
