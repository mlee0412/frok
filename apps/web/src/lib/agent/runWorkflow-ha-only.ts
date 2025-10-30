import { AgentInputItem, Runner, withTrace } from '@openai/agents';
import { createAgentSuite } from './orchestrator';

export type WorkflowInput = { input_as_text: string };

export async function runWorkflowHaOnly(workflow: WorkflowInput) {
  return await withTrace('FROK Assistant (Home Assistant only)', async () => {
    const suite = await createAgentSuite({ preferFastGeneral: true });

    const conversationHistory: AgentInputItem[] = [
      ...suite.primer,
      {
        role: 'user',
        content: [{ type: 'input_text', text: workflow.input_as_text }],
      },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'agent-builder',
        workflow_id: process.env["WORKFLOW_ID"] || 'unknown',
      },
    });

    const result = await runner.run(suite.home, conversationHistory);
    if (!result.finalOutput) throw new Error('Agent result is undefined');
    return { output_text: String(result.finalOutput) };
  });
}
