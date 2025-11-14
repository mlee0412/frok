import { NextRequest } from 'next/server';
import { Agent, AgentInputItem, Runner, withTrace } from '@openai/agents';
import { performance } from 'perf_hooks';
import { createAgentSuite, getReasoningEffort, supportsReasoning } from '@/lib/agent/orchestrator';
import { extractFinalText } from '@/lib/agent/extractAgentOutput';
import { withAuth } from '@/lib/api/withAuth';
import { withRateLimit, rateLimitPresets } from '@/lib/api/withRateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Type definitions for agent streaming
type ChatMessage = {
  role: string;
  content: string;
};

type AgentTool = {
  name?: string;
  [key: string]: unknown;
};

type InputContent =
  | { type: 'input_text'; text: string; providerData?: Record<string, unknown> }
  | { type: 'input_image'; image?: string; detail?: string; providerData?: Record<string, unknown> };

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

  if (simplePatterns.some(pattern => pattern.test(query))) {
    return 'simple';
  }

  // Complex patterns
  const complexPatterns = [
    /(write|create|build|develop|code|implement|design)/i,
    /(analyze|explain|describe|detail).+how/i,
    /(plan|strategy|architect|system)/i,
    /(compare|contrast|difference between)/i,
    /(debug|fix|solve|troubleshoot).+(code|error|bug)/i,
  ];

  if (complexPatterns.some(pattern => pattern.test(query))) {
    return 'complex';
  }

  // Default to moderate
  return 'moderate';
}

// AI Models - GPT-5 family with fallbacks
const FAST_MODEL = process.env["OPENAI_FAST_MODEL"] ?? 'gpt-5-nano';
const BALANCED_MODEL = process.env["OPENAI_BALANCED_MODEL"] ?? process.env["OPENAI_GENERAL_MODEL"] ?? 'gpt-5-mini';
const COMPLEX_MODEL = process.env["OPENAI_COMPLEX_MODEL"] ?? process.env["OPENAI_AGENT_MODEL"] ?? 'gpt-5-thinking';

function selectModelAndTools(
  complexity: 'simple' | 'moderate' | 'complex',
  userModel?: string,
  query?: string
) {
  const normalizedPreference = userModel?.toLowerCase();
  const queryLower = query?.toLowerCase() || '';

  // Detect query type for smart tool selection
  const isHomeQuery = /\b(turn|light|lamp|switch|fan|tv|door|window|garage|climate|thermostat|lock|unlock|dim|brighten|open|close)\b/i.test(queryLower);
  const isSearchQuery = /\b(search|find|lookup|what is|who is|when|where|how to|recipe|news)\b/i.test(queryLower);

  // User preference overrides (from thread settings)
  if (normalizedPreference === 'gpt-5-nano' || normalizedPreference === 'nano' || normalizedPreference === 'fast') {
    return { model: FAST_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: false };
  }

  if (normalizedPreference === 'gpt-5-mini' || normalizedPreference === 'mini' || normalizedPreference === 'balanced') {
    return { model: BALANCED_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: false };
  }

  if (normalizedPreference === 'gpt-5-thinking' || normalizedPreference === 'thinking' || normalizedPreference === 'reasoning') {
    return {
      model: COMPLEX_MODEL,
      tools: ['home_assistant', 'memory', 'web_search'],
      orchestrate: true,
    };
  }

  if (normalizedPreference === 'gpt-5' || normalizedPreference === 'gpt-5-pro' || normalizedPreference === 'pro') {
    return {
      model: 'gpt-5', // Main GPT-5 model
      tools: ['home_assistant', 'memory', 'web_search'],
      orchestrate: complexity !== 'simple',
    };
  }

  // Legacy model support (gpt-4o era)
  if (normalizedPreference === 'gpt-4o' || normalizedPreference === 'gpt-4o-mini') {
    return { model: BALANCED_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: false };
  }

  if (normalizedPreference === 'o1') {
    return { model: COMPLEX_MODEL, tools: ['home_assistant', 'memory', 'web_search'], orchestrate: true };
  }

  // Smart routing based on complexity AND query type
  switch (complexity) {
    case 'simple':
      // Fast model, minimal tools for quick actions
      if (isHomeQuery) {
        // Home automation - only HA tools, no web search
        return {
          model: FAST_MODEL,
          tools: ['home_assistant'],
          orchestrate: false,
        };
      } else if (isSearchQuery) {
        // Quick search - only web search
        return {
          model: FAST_MODEL,
          tools: ['web_search'],
          orchestrate: false,
        };
      } else {
        // General simple query
        return {
          model: FAST_MODEL,
          tools: ['home_assistant', 'memory'],
          orchestrate: false,
        };
      }

    case 'moderate':
      // Balanced model, most common tools
      return {
        model: BALANCED_MODEL,
        tools: ['home_assistant', 'memory', 'web_search'],
        orchestrate: false,
      };

    case 'complex':
      // Powerful model, all tools available
      return {
        model: COMPLEX_MODEL,
        tools: ['home_assistant', 'memory', 'web_search'],
        orchestrate: true,
      };

    default:
      // Fallback to balanced model
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
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const input_as_text = String(body?.input_as_text ?? '').trim();
        const images = body?.images || [];
        const userModel = body?.user_model ?? body?.model; // From thread settings (new + legacy)
        const enabledTools = body?.enabled_tools; // From thread settings
        const conversationHistory = body?.conversation_history || []; // Previous messages
        const threadId = body?.thread_id; // For loading history from DB

        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        if (!input_as_text && images.length === 0) {
          send({ error: 'input_as_text or images required' });
          controller.close();
          return;
        }

        // Load conversation history from database if thread_id provided
        let historyItems: AgentInputItem[] = [];
        if (threadId && conversationHistory.length === 0) {
          try {
            const supabase = auth.user.supabase;

            // Security: Verify thread belongs to user
            const { data: thread } = await supabase
              .from('chat_threads')
              .select('id')
              .eq('id', threadId)
              .eq('user_id', user_id)
              .single();

            if (!thread) {
              send({ error: 'Thread not found or access denied' });
              controller.close();
              return;
            }

            const { data: messages } = await supabase
              .from('chat_messages')
              .select('role, content')
              .eq('thread_id', threadId)
              .order('created_at', { ascending: true })
              .limit(20); // Last 20 messages for context

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
          // Use provided history
          historyItems = conversationHistory;
        }

        // Save user message to database (for persistence)
        if (threadId && input_as_text) {
          try {
            const supabase = auth.user.supabase;
            await supabase.from('chat_messages').insert({
              thread_id: threadId,
              user_id: user_id,
              role: 'user',
              content: input_as_text,
              metadata: images.length > 0 ? { images } : null,
            });
          } catch (dbError) {
            console.error('[smart-stream] User message save failed:', dbError);
            // Continue anyway - streaming is more important than persistence
          }
        }

        // Smart routing: Classify query complexity
        const complexity = await classifyQuery(input_as_text);
        const { model: selectedModel, tools: selectedTools, orchestrate } = selectModelAndTools(
          complexity,
          userModel,
          input_as_text
        );

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

        await withTrace('FROK Assistant Stream', async () => {
          const suite = orchestrate
            ? await createAgentSuite({
                userId: user_id, // ✅ Pass authenticated user ID for memory isolation
                preferFastGeneral: complexity !== 'complex',
                models: {
                  general: selectedModel,
                  router: FAST_MODEL,
                  home: FAST_MODEL,
                  memory: FAST_MODEL,
                  research: process.env["OPENAI_RESEARCH_MODEL"] ?? BALANCED_MODEL,
                },
              })
            : null;

          const toolset = suite?.tools ?? (await loadToolset(user_id)); // ✅ Pass user_id

          const toolMap: Record<string, any> = {
            'home_assistant': [toolset.haSearch, toolset.haCall],
            memory: [toolset.memoryAdd, toolset.memorySearch],
            web_search: toolset.webSearch,
            tavily_search: toolset.webSearch,
            image_generation: null,
            haSearch: toolset.haSearch,
            haCall: toolset.haCall,
            memoryAdd: toolset.memoryAdd,
            memorySearch: toolset.memorySearch,
            webSearch: toolset.webSearch,
          };

          const flattenTools = (names: string[]) =>
            names
              .map(name => toolMap[name])
              .flat()
              .filter(Boolean);

          const requestedToolNames = enabledTools && enabledTools.length > 0 ? enabledTools : selectedTools;
          const finalTools = flattenTools(requestedToolNames);
          const finalToolNames = finalTools.map((t: AgentTool) => t?.name || 'unknown');

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

          send({
            metadata: {
              complexity,
              model: metadataModel,
              routing: orchestrate ? 'orchestrator' : 'direct',
              historyLength: historyItems.length,
              tools: finalToolNames,
              toolSource: suite?.tools.source ?? toolset.source,
              models: orchestrate ? suite?.models : { general: metadataModel },
            },
          });

          const runner = new Runner({
            traceMetadata: {
              __trace_source__: 'agent-builder',
              workflow_id: process.env["WORKFLOW_ID"] || 'unknown',
            },
          });

          let result;
          const startedAt = performance.now();

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
            let instructions =
              complexity === 'simple'
                ? 'Be EXTREMELY brief. For home automation: just confirm the action (e.g., "Lights turned off"). For other queries: answer in 1-2 sentences max. NO explanations unless explicitly asked.'
                : complexity === 'complex'
                ? 'Be thorough and detailed. Use reasoning effort to provide comprehensive analysis.'
                : 'Be helpful and concise. Use tools when needed.';

            // Add rich formatting instructions for moderate/complex queries only
            if (complexity !== 'simple') {
              instructions += `\n\n## Response Formatting Guidelines:
- Use **Markdown** formatting to structure your responses clearly
- Use **bold** for emphasis and important terms
- Use *italics* for subtle emphasis
- Create **bulleted lists** (with -) or **numbered lists** (with 1., 2., etc.) for step-by-step instructions or multiple items
- Use \`inline code\` for technical terms, commands, file names, and code snippets
- Use code blocks with language tags for longer code examples:
  \`\`\`language
  code here
  \`\`\`
- Include relevant **links** with descriptive text: [Link Text](URL)
- Use ### headings to organize long responses into sections
- Use > blockquotes for important notes or warnings
- When presenting data, use **tables** in markdown format
- When referencing web search results, **always include clickable links** to sources
- For image-related queries, describe what images would show but note you cannot directly display images

Examples of good formatting:
- "Here are the **3 key steps**:\n1. First step\n2. Second step\n3. Third step"
- "According to [Source Name](URL), the answer is..."
- "**Important**: Make sure to backup your data first"
- "Run the command: \`npm install package-name\`"`;
            }

            const hasHA = finalTools.some((t) => t?.name === 'ha_search' || t?.name === 'ha_call');
            if (hasHA) {
              instructions += `\n\n## Home Assistant Tools:
- Use ha_search first to find entity IDs before controlling devices
- For lights/switches: use domain "light" or "switch" with service "turn_on" or "turn_off"
- Always report the verification result to confirm success
- If you get an error, explain it clearly to the user`;
            }

            // Build model settings with performance optimizations
            const modelSettings: Record<string, unknown> = { store: true };

            // Reasoning effort for reasoning-capable models (no temperature for reasoning models)
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
              {
                role: 'user',
                content,
              },
            ];

            result = await runner.run(agent, directConversation);
          }

          const durationMs = Math.round(performance.now() - startedAt);

          const output = extractFinalText(result);

          if (output) {
            const finalText = output.trim();
            const chunkSize = 64;

            for (let i = 0; i < finalText.length; i += chunkSize) {
              const delta = finalText.slice(i, Math.min(i + chunkSize, finalText.length));
              send({ delta, done: false });
            }

            if (threadId) {
              try {
                const supabase = auth.user.supabase;
                await supabase.from('chat_messages').insert({
                  thread_id: threadId,
                  user_id: user_id,
                  role: 'assistant',
                  content: finalText,
                  metadata: {
                    model: metadataModel,
                    route: orchestrate ? 'orchestrator' : 'direct',
                    complexity,
                    durationMs,
                    tools: orchestrate ? undefined : finalToolNames,
                  },
                });

                await supabase
                  .from('chat_threads')
                  .update({
                    last_message_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', threadId)
                  .eq('user_id', user_id);
              } catch (dbError) {
                console.error('[smart-stream] Assistant message save failed:', dbError);
              }
            }

            send({
              content: finalText,
              done: true,
              metrics: {
                durationMs,
                model: metadataModel,
                route: orchestrate ? 'orchestrator' : 'direct',
              },
              tools: orchestrate ? undefined : finalToolNames,
            });
          } else {
            console.error('[smart-stream] No final output resolved from agent:', {
              resultKeys: result ? Object.keys(result) : [],
              model: selectedModel,
              complexity,
              orchestrate,
              hasTools: finalTools.length > 0,
            });
            send({
              error: 'No response from agent',
              debug:
                process.env.NODE_ENV === 'development'
                  ? {
                      model: selectedModel,
                      resultType: typeof result?.finalOutput,
                    }
                  : undefined,
            });
          }
        });

        controller.close();
      } catch (error: unknown) {
        console.error('[smart-stream error]', error);
        const message = error instanceof Error ? error.message : 'Stream failed';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
