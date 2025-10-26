import { AgentInputItem, Runner, withTrace } from '@openai/agents';
import { createAgentSuite } from './orchestrator';

export type WorkflowInput = { input_as_text: string };

export async function runWorkflow(workflow: WorkflowInput) {
  return await withTrace('FROK Assistant', async () => {
    const suite = await createAgentSuite();

    const conversationHistory: AgentInputItem[] = [
      ...suite.primer,
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

    const result = await runner.run(suite.orchestrator, conversationHistory);

    if (!result.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    return { output_text: String(result.finalOutput) };
  });
}
