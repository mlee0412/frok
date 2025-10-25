import { Agent, AgentInputItem, Runner, withTrace } from '@openai/agents';

export type WorkflowInput = { input_as_text: string };

function supportsReasoning(model: string): boolean {
  // GPT-5, o3, and other advanced reasoning models
  return /(gpt-5|o3|gpt-4\.1|gpt-4o-reasoning)/i.test(model);
}

function getReasoningEffort(model: string): 'low' | 'medium' | 'high' {
  // GPT-5 and o3 get maximum reasoning capability
  if (/(gpt-5|o3)/i.test(model)) return 'high';
  return 'medium';
}

export async function runWorkflow(workflow: WorkflowInput) {
  return await withTrace('FROK Assistant', async () => {
    // Import tools dynamically to avoid module-level init issues
    const { haSearch, haCall, memoryAdd, memorySearch, webSearch } = await import('./tools');
    
    const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';
    
    const agent = new Agent({
      name: 'FROK Assistant',
      instructions:
        'Be concise and helpful.\n' +
        'Use tools only when needed; summarize results back to the user.\n' +
        'Persistent memory: store important user preferences and context; retrieve when relevant.\n' +
        'Home Assistant: verify success only when HA returns ok:true with a non-empty result; otherwise ask for clarification.\n' +
        'Web search: use to find current information online.\n' +
        'Respect data privacy; only access external services when obviously necessary.',
      model: MODEL,
      modelSettings: supportsReasoning(MODEL)
        ? { reasoning: { effort: getReasoningEffort(MODEL) }, store: true }
        : { store: true },
      tools: [haSearch, haCall, memoryAdd, memorySearch, webSearch],
    });
    
    const conversationHistory: AgentInputItem[] = [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: workflow.input_as_text,
          },
        ],
      },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'agent-builder',
        workflow_id: process.env.WORKFLOW_ID || 'unknown',
      },
    });

    const result = await runner.run(agent, [...conversationHistory]);

    if (!result.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    return { output_text: String(result.finalOutput) };
  });
}
