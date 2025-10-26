import { Agent, type AgentInputItem, type InputGuardrail, type OutputGuardrail, type Tool } from '@openai/agents';

const FAST_MODEL_FALLBACK = process.env.OPENAI_FAST_MODEL ?? 'gpt-4.1-mini';
const BALANCED_MODEL_FALLBACK = process.env.OPENAI_GENERAL_MODEL ?? 'gpt-4.1';
const COMPLEX_MODEL_FALLBACK =
  process.env.OPENAI_COMPLEX_MODEL ?? process.env.OPENAI_AGENT_MODEL ?? BALANCED_MODEL_FALLBACK;

type AgentTool = Tool<unknown>;

export interface LoadedTools {
  haSearch: AgentTool;
  haCall: AgentTool;
  memoryAdd: AgentTool;
  memorySearch: AgentTool;
  webSearch: AgentTool;
  source: 'improved' | 'basic';
}

export interface AgentSuite {
  orchestrator: Agent;
  home: Agent;
  memory: Agent;
  research: Agent;
  general: Agent;
  tools: LoadedTools;
  primer: AgentInputItem[];
  models: {
    router: string;
    home: string;
    memory: string;
    research: string;
    general: string;
  };
}

export interface AgentSuiteOptions {
  models?: {
    router?: string;
    home?: string;
    memory?: string;
    research?: string;
    general?: string;
  };
  preferFastGeneral?: boolean;
}

export function supportsReasoning(model: string): boolean {
  const normalized = model.toLowerCase();

  if (normalized.includes('gpt-5')) return true;
  if (normalized.startsWith('o3')) return true;
  if (normalized === 'gpt-4.1' || normalized.startsWith('gpt-4.1-reasoning')) return true;
  if (normalized.includes('gpt-4o-reasoning')) return true;

  return false;
}

export function getReasoningEffort(model: string): 'low' | 'medium' | 'high' {
  const normalized = model.toLowerCase();
  if (normalized.includes('gpt-5') || normalized.startsWith('o3')) {
    return 'high';
  }

  return 'medium';
}

const sanitizeInputGuardrail: InputGuardrail = {
  name: 'sanitize-user-input',
  async execute({ input }) {
    const text =
      typeof input === 'string'
        ? input
        : input
            .map(item => {
              if (item.type === 'input_text') return item.text ?? '';
              if (item.type === 'input_image') return '[image]';
              return '';
            })
            .join(' ');

    const normalized = text.replace(/\s+/g, ' ').trim();

    return {
      tripwireTriggered: false,
      outputInfo: {
        length: normalized.length,
      },
    };
  },
};

const outputQualityGuardrail: OutputGuardrail = {
  name: 'final-output-quality',
  async execute({ agentOutput }) {
    const text = typeof agentOutput === 'string' ? agentOutput.trim() : JSON.stringify(agentOutput);

    return {
      tripwireTriggered: false,
      outputInfo: {
        length: text.length,
        hasPunctuation: /[.!?]$/.test(text),
      },
    };
  },
};

async function loadTools(): Promise<LoadedTools> {
  try {
    const mod = await import('./tools-improved');
    return {
      haSearch: mod.haSearch,
      haCall: mod.haCall,
      memoryAdd: mod.memoryAdd,
      memorySearch: mod.memorySearch,
      webSearch: mod.webSearch,
      source: 'improved',
    };
  } catch (error) {
    console.warn('[frok-agent] falling back to base tools due to error:', error);
    const mod = await import('./tools');
    return {
      haSearch: mod.haSearch,
      haCall: mod.haCall,
      memoryAdd: mod.memoryAdd,
      memorySearch: mod.memorySearch,
      webSearch: mod.webSearch,
      source: 'basic',
    };
  }
}

function buildModelSettings(
  model: string,
  {
    temperature,
    store = true,
    reasoningEffort,
  }: {
    temperature?: number;
    store?: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high';
  } = {}
) {
  const settings: Record<string, unknown> = { store };
  if (typeof temperature === 'number') {
    settings.temperature = temperature;
  }

  if (supportsReasoning(model)) {
    settings.reasoning = {
      effort: reasoningEffort ?? getReasoningEffort(model),
    };
  }

  return settings;
}

function buildConversationPrimer(): AgentInputItem[] {
  return [
    {
      role: 'system',
      content: [
        {
          type: 'input_text',
          text: 'Maintain a friendly, concise tone. Summaries should note any tools that were used.',
        },
      ],
    },
  ];
}

export async function createAgentSuite(options: AgentSuiteOptions = {}): Promise<AgentSuite> {
  const tools = await loadTools();
  const primer = buildConversationPrimer();

  const routerModel =
    options.models?.router ?? process.env.OPENAI_ROUTER_MODEL ?? FAST_MODEL_FALLBACK;
  const generalModel =
    options.models?.general ?? (options.preferFastGeneral ? BALANCED_MODEL_FALLBACK : COMPLEX_MODEL_FALLBACK);
  const homeModel = options.models?.home ?? process.env.OPENAI_HOME_MODEL ?? routerModel;
  const memoryModel = options.models?.memory ?? process.env.OPENAI_MEMORY_MODEL ?? routerModel;
  const researchModel =
    options.models?.research ?? process.env.OPENAI_RESEARCH_MODEL ?? BALANCED_MODEL_FALLBACK;

  const homeAgent = new Agent({
    name: 'Home Control Specialist',
    handoffDescription: 'Controls Home Assistant devices by searching and invoking automations.',
    instructions:
      'You control smart home devices through Home Assistant.\n' +
      '- Search for relevant entities with ha_search before calling ha_call.\n' +
      '- Confirm the outcome using returned verification data.\n' +
      '- If configuration is missing or a call fails, clearly explain what went wrong and suggest next steps.',
    model: homeModel,
    modelSettings: buildModelSettings(homeModel, { temperature: 0.2, store: false }),
    tools: [tools.haSearch, tools.haCall],
  });

  const memoryAgent = new Agent({
    name: 'Memory Specialist',
    handoffDescription: 'Stores and retrieves long-term memories about the user and household.',
    instructions:
      'You manage the persistent memory store.\n' +
      '- Use memory_search to surface relevant memories before responding.\n' +
      '- Call memory_add for new long-term preferences.\n' +
      '- Never fabricate memories—only store what the user confirms.',
    model: memoryModel,
    modelSettings: buildModelSettings(memoryModel, { temperature: 0.2, store: false }),
    tools: [tools.memoryAdd, tools.memorySearch],
  });

  const researchAgent = new Agent({
    name: 'Research Specialist',
    handoffDescription: 'Performs up-to-date research using web search and summarizes results with citations.',
    instructions:
      'You handle questions that require web research or factual lookups.\n' +
      '- Use web_search to gather current information.\n' +
      '- When summarizing, mention key sources or URLs when available.\n' +
      '- If the search API fails, explain the limitation and offer next steps.',
    model: researchModel,
    modelSettings: buildModelSettings(researchModel, { temperature: 0.3, store: false }),
    tools: [tools.webSearch, tools.memorySearch],
  });

  const generalAgent = new Agent({
    name: 'General Problem Solver',
    handoffDescription: 'Handles multi-step reasoning tasks and can coordinate across all available tools.',
    instructions:
      'You are the primary assistant for complex or multi-domain requests.\n' +
      '- Decide which tools to use and explain why.\n' +
      '- When acting on the home, double-check device states before and after actions.\n' +
      '- Summaries must include any important actions, tool usage, and follow-up suggestions.',
    model: generalModel,
    modelSettings: buildModelSettings(generalModel, {
      temperature: options.preferFastGeneral ? 0.2 : 0.5,
      store: true,
      reasoningEffort: options.preferFastGeneral ? 'low' : undefined,
    }),
    tools: [tools.haSearch, tools.haCall, tools.memoryAdd, tools.memorySearch, tools.webSearch],
  });

  const orchestrator = new Agent({
    name: 'FROK Orchestrator',
    handoffDescription: 'Routes requests to the best specialist and ensures a polished final response.',
    instructions:
      'You are the orchestrator for the FROK assistant.\n' +
      '1. Understand the user request and decide whether you can answer directly or should delegate.\n' +
      '2. Delegate smart home control tasks to the Home Control Specialist.\n' +
      '3. Delegate long-term preference tasks to the Memory Specialist.\n' +
      '4. Delegate research or news-oriented tasks to the Research Specialist.\n' +
      '5. Use the General Problem Solver when the request spans multiple domains or needs deeper reasoning.\n' +
      'Always return a concise summary that references any tools or handoffs that were used.\n' +
      'If information is missing, ask a follow-up question instead of guessing.',
    model: routerModel,
    modelSettings: buildModelSettings(routerModel, { temperature: 0.2, store: true }),
    handoffs: [homeAgent, memoryAgent, researchAgent, generalAgent],
    inputGuardrails: [sanitizeInputGuardrail],
    outputGuardrails: [outputQualityGuardrail],
  });

  return {
    orchestrator,
    home: homeAgent,
    memory: memoryAgent,
    research: researchAgent,
    general: generalAgent,
    tools,
    primer,
    models: {
      router: routerModel,
      home: homeModel,
      memory: memoryModel,
      research: researchModel,
      general: generalModel,
    },
  };
}

