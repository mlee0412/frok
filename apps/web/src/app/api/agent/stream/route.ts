import { Agent, AgentInputItem, Runner, withTrace } from '@openai/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function supportsReasoning(model: string): boolean {
  return /(gpt-5|o3|gpt-4\.1|gpt-4o-reasoning)/i.test(model);
}

function getReasoningEffort(model: string): 'low' | 'medium' | 'high' {
  if (/(gpt-5|o3)/i.test(model)) return 'high';
  return 'medium';
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await req.json();
        const input_as_text = String(body?.input_as_text ?? '').trim();
        const images = body?.images || [];
        
        if (!input_as_text && images.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'input_as_text or images required' })}\n\n`));
          controller.close();
          return;
        }

        await withTrace('FROK Assistant Stream', async () => {
          const { haSearch, haCall, memoryAdd, memorySearch, webSearch } = await import('@/lib/agent/tools');
          
          const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';
          
          const agent = new Agent({
            name: 'FROK Assistant',
            instructions:
              'Be concise and helpful.\n' +
              'Use tools only when needed; summarize results back to the user.\n' +
              'Persistent memory: store important user preferences and context; retrieve when relevant.\n' +
              'Home Assistant: verify success only when HA returns ok:true with a non-empty result; otherwise ask for clarification.\n' +
              'Web search: use to find current information online.\n' +
              'Vision: when images are provided, analyze them carefully and describe what you see.\n' +
              'Respect data privacy; only access external services when obviously necessary.',
            model: MODEL,
            modelSettings: supportsReasoning(MODEL)
              ? { reasoning: { effort: getReasoningEffort(MODEL) }, store: true }
              : { store: true },
            tools: [haSearch, haCall, memoryAdd, memorySearch, webSearch],
          });

          // Build content with text and images
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

          const conversationHistory: AgentInputItem[] = [
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
          const result = await runner.run(agent, conversationHistory);

          if (result.finalOutput) {
            // Optimized streaming: larger chunks, no artificial delay
            const output = String(result.finalOutput);
            
            // Send in character chunks for smoother streaming (no word boundaries)
            const chunkSize = 5; // Send 5 characters at a time for balance between smoothness and efficiency
            
            for (let i = 0; i < output.length; i += chunkSize) {
              const chunk = output.slice(0, Math.min(i + chunkSize, output.length));
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
              );
              // No artificial delay - send as fast as possible
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
        console.error('[stream error]', error);
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
