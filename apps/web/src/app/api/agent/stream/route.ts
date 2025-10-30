import { AgentInputItem, Runner, withTrace } from '@openai/agents';
import { performance } from 'perf_hooks';
import { createAgentSuite } from '@/lib/agent/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
          const suite = await createAgentSuite();

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
            ...suite.primer,
            {
              role: 'user',
              content,
            },
          ];

          const orchestratorTools = [
            suite.tools.haSearch?.name ?? 'ha_search',
            suite.tools.haCall?.name ?? 'ha_call',
            suite.tools.memoryAdd?.name ?? 'memory_add',
            suite.tools.memorySearch?.name ?? 'memory_search',
            suite.tools.webSearch?.name ?? 'web_search',
          ];

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                metadata: {
                  toolset: suite.tools.source,
                  tools: orchestratorTools,
                  mode: 'orchestrator',
                  models: suite.models,
                },
              })}\n\n`
            )
          );

          const runner = new Runner({
            traceMetadata: {
              __trace_source__: 'agent-builder',
              workflow_id: process.env["WORKFLOW_ID"] || 'unknown',
            },
          });

          // Run agent and get result
          const startedAt = performance.now();
          const result = await runner.run(suite.orchestrator, conversationHistory);
          const durationMs = Math.round(performance.now() - startedAt);

          if (result.finalOutput) {
            // Optimized streaming: larger chunks, no artificial delay
            const output = String(result.finalOutput);

            const chunkSize = 48;

            for (let i = 0; i < output.length; i += chunkSize) {
              const delta = output.slice(i, Math.min(i + chunkSize, output.length));
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ delta, done: false })}\n\n`)
              );
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  content: output,
                  done: true,
                  metrics: {
                    durationMs,
                    model: suite.models.general,
                    route: 'orchestrator',
                  },
                })}\n\n`
              )
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
