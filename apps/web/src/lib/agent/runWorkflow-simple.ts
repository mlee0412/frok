import { Agent, AgentInputItem, Runner, withTrace } from '@openai/agents';

export type WorkflowInput = { input_as_text: string };

export async function runWorkflowSimple(workflow: WorkflowInput) {
  return await withTrace('FROK Assistant', async () => {
    const MODEL = process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini';
    
    const agent = new Agent({
      name: 'FROK Assistant',
      instructions: 'Be concise and helpful.',
      model: MODEL,
      modelSettings: { store: true },
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
