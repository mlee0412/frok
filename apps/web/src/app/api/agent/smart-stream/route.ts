import { Agent, AgentInputItem, Runner, withTrace } from '@openai/agents';
import { getReasoningEffort, supportsReasoning } from '@/lib/agent/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function selectModelAndTools(complexity: 'simple' | 'moderate' | 'complex', userModel?: string) {
  // User preference overrides (from thread settings)
  if (userModel === 'gpt-5-nano') {
    return { model: 'gpt-4o-mini', tools: ['home_assistant', 'web_search'] };
  }
  if (userModel === 'gpt-5') {
    return { model: 'gpt-5', tools: ['home_assistant', 'memory', 'web_search'] };
  }

  // Smart routing based on complexity
  switch (complexity) {
    case 'simple':
      // Fast model, minimal tools for quick actions
      return {
        model: 'gpt-4o-mini',
        tools: ['home_assistant', 'web_search'], // Essential tools only
      };
    
    case 'moderate':
      // Balanced model, most common tools
      return {
        model: 'gpt-4o',
        tools: ['home_assistant', 'memory', 'web_search'],
      };
    
    case 'complex':
      // Powerful model, all tools available
      return {
        model: process.env.OPENAI_AGENT_MODEL || 'gpt-4o',
        tools: ['home_assistant', 'memory', 'web_search'],
      };
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const input_as_text = String(body?.input_as_text ?? '').trim();
        const images = body?.images || [];
        const userModel = body?.model; // From thread settings
        const enabledTools = body?.enabled_tools; // From thread settings
        const conversationHistory = body?.conversation_history || []; // Previous messages
        const threadId = body?.thread_id; // For loading history from DB
        
        if (!input_as_text && images.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'input_as_text or images required' })}\n\n`));
          controller.close();
          return;
        }

        // Load conversation history from database if thread_id provided
        let historyItems: AgentInputItem[] = [];
        if (threadId && conversationHistory.length === 0) {
          try {
            const { getSupabaseServer } = await import('@/lib/supabase/server');
            const supabase = getSupabaseServer();
            const { data: messages } = await supabase
              .from('chat_messages')
              .select('role, content')
              .eq('thread_id', threadId)
              .order('created_at', { ascending: true })
              .limit(20); // Last 20 messages for context
            
            if (messages && messages.length > 0) {
              historyItems = messages.map((msg: any) => {
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

        // Smart routing: Classify query complexity
        const complexity = await classifyQuery(input_as_text);
        const { model, tools: selectedTools } = selectModelAndTools(complexity, userModel);

        // Send metadata about routing decision
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            metadata: { 
              complexity, 
              model,
              routing: 'smart',
              historyLength: historyItems.length
            } 
          })}\n\n`)
        );

        await withTrace('FROK Assistant Stream', async () => {
          // Use improved tools with better performance and accuracy
          const { haSearch, haCall, memoryAdd, memorySearch, webSearch } = await import('@/lib/agent/tools-improved');
          
          // Map both database format (snake_case) and code format (camelCase) to actual tools
          const toolMap: Record<string, any> = {
            // Database format (from enabled_tools column)
            'home_assistant': [haSearch, haCall], // HA uses 2 tools
            'memory': [memoryAdd, memorySearch], // Memory uses 2 tools
            'web_search': webSearch,
            'tavily_search': webSearch, // Same as web_search
            'image_generation': null, // Not implemented yet
            
            // Legacy camelCase format (for backwards compatibility)
            'haSearch': haSearch,
            'haCall': haCall,
            'memoryAdd': memoryAdd,
            'memorySearch': memorySearch,
            'webSearch': webSearch,
          };

          // Flatten tool arrays and remove nulls
          const flattenTools = (names: string[]) => {
            const tools = names
              .map(name => toolMap[name])
              .flat()
              .filter(Boolean);
            
            // Log tool selection for debugging
            console.log('[tools]', {
              requested: names,
              loaded: tools.map((t: any) => t?.name || 'unknown'),
              count: tools.length,
            });
            
            return tools;
          };

          // Use user's enabled tools if specified, otherwise use smart selection
          const finalTools = enabledTools && enabledTools.length > 0
            ? flattenTools(enabledTools)
            : flattenTools(selectedTools);

          // Adjust instructions based on complexity
          let instructions = complexity === 'simple'
            ? 'Be extremely concise. Execute the requested action directly without explanation unless asked.'
            : complexity === 'complex'
            ? 'Be thorough and detailed. Use reasoning effort to provide comprehensive analysis.'
            : 'Be helpful and concise. Use tools when needed.';
          
          // Add HA-specific instructions if tools are available
          const hasHA = finalTools.some((t: any) => t?.name === 'ha_search' || t?.name === 'ha_call');
          if (hasHA) {
            instructions += `\n\nHome Assistant Tools:\n- Use ha_search first to find entity IDs before controlling devices\n- For lights/switches: use domain "light" or "switch" with service "turn_on" or "turn_off"\n- Always report the verification result to confirm success\n- If you get an error, explain it clearly to the user`;
          }

          const agent = new Agent({
            name: 'FROK Assistant',
            instructions,
            model,
            modelSettings: supportsReasoning(model)
              ? { 
                  reasoning: { 
                    effort: complexity === 'complex' ? getReasoningEffort(model) : 'low' 
                  }, 
                  store: true 
                }
              : { store: true },
            tools: finalTools,
          });

          // Build current message content with text and images
          const content: any[] = [];
          
          if (input_as_text) {
            content.push({ type: 'input_text', text: input_as_text });
          }
          
          for (const imageUrl of images) {
            content.push({
              type: 'input_image',
              source: imageUrl,
            });
          }

          // Build full conversation with history + current message
          const fullConversation: AgentInputItem[] = [
            ...historyItems,
            {
              role: 'user',
              content,
            },
          ];

          const runner = new Runner({
            traceMetadata: {
              __trace_source__: 'agent-builder',
              workflow_id: process.env.WORKFLOW_ID || 'unknown',
            },
          });

          // Run agent and get result
          const result = await runner.run(agent, fullConversation);

          if (result.finalOutput) {
            // Optimized streaming: word-based chunks for natural reading
            const output = String(result.finalOutput);
            const words = output.split(/(\s+)/); // Split but keep whitespace
            let accumulated = '';
            
            // Stream word by word for smooth, natural appearance
            for (let i = 0; i < words.length; i++) {
              accumulated += words[i];
              
              // Send update every 3-5 words for optimal performance/smoothness balance
              if (i % 4 === 0 || i === words.length - 1) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: accumulated, done: false })}\n\n`)
                );
              }
            }

            // Send final complete message
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: output, done: true })}\n\n`)
            );
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'No response from agent' })}\n\n`)
            );
          }
        });

        controller.close();
      } catch (error: any) {
        console.error('[smart-stream error]', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: error?.message || 'Stream failed' })}\n\n`)
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
