/**
 * Enhanced Agent Orchestrator with Latest OpenAI Features
 *
 * Integrates:
 * - Structured outputs
 * - Enhanced guardrails
 * - Built-in tools (web_search, file_search, code_interpreter, computer_use)
 * - Custom tools (Home Assistant, Memory)
 * - Response caching
 */

import { Agent, type AgentInputItem, type Tool } from '@openai/agents';
import {
  getToolConfiguration,
  getAgentTools,
  type ToolType,
} from './tools-unified';
import {
  buildGuardrails,
} from './guardrails';
import {
  ResponseFormats,
} from './responseSchemas';

// ============================================================================
// Types
// ============================================================================

export interface EnhancedAgentSuite {
  orchestrator: Agent;
  home: Agent;
  memory: Agent;
  research: Agent;
  code: Agent;
  general: Agent;
  primer: AgentInputItem[];
  models: {
    router: string;
    home: string;
    memory: string;
    research: string;
    code: string;
    general: string;
  };
  toolsConfig: ReturnType<typeof getToolConfiguration>;
}

export interface EnhancedAgentSuiteOptions {
  models?: {
    router?: string;
    home?: string;
    memory?: string;
    research?: string;
    code?: string;
    general?: string;
  };
  preferFastGeneral?: boolean;
  enabledTools?: ToolType[];
  useStructuredOutputs?: boolean;
  includeExperimentalTools?: boolean;
}

// ============================================================================
// Model Configuration
// ============================================================================

const FAST_MODEL_FALLBACK = process.env['OPENAI_FAST_MODEL'] ?? 'gpt-5-nano';
const BALANCED_MODEL_FALLBACK = process.env['OPENAI_GENERAL_MODEL'] ?? 'gpt-5-mini';
const COMPLEX_MODEL_FALLBACK =
  process.env['OPENAI_COMPLEX_MODEL'] ?? process.env['OPENAI_AGENT_MODEL'] ?? 'gpt-5-think';

// ============================================================================
// Helper Functions
// ============================================================================

export function supportsReasoning(model: string): boolean {
  const normalized = model.toLowerCase();

  if (normalized === 'gpt-5') return true;
  if (normalized.startsWith('gpt-5-')) {
    return /think|reason|pro/.test(normalized);
  }
  if (normalized.startsWith('o3')) return true;
  if (normalized === 'gpt-4.1' || normalized.startsWith('gpt-4.1-reasoning')) return true;
  if (normalized.includes('gpt-4o-reasoning')) return true;

  return false;
}

export function getReasoningEffort(model: string): 'low' | 'medium' | 'high' {
  const normalized = model.toLowerCase();
  if (normalized === 'gpt-5' || /think|reason|pro/.test(normalized) || normalized.startsWith('o3')) {
    return 'high';
  }

  return 'medium';
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
    settings['temperature'] = temperature;
  }

  if (supportsReasoning(model)) {
    settings['reasoning'] = {
      effort: reasoningEffort ?? getReasoningEffort(model),
    };
  }

  return settings;
}

function buildConversationPrimer(): AgentInputItem[] {
  return [
    {
      role: 'system' as const,
      content: 'Maintain a friendly, concise tone. Summaries should note any tools that were used.',
    },
  ];
}

// ============================================================================
// Enhanced Agent Suite Creation
// ============================================================================

export async function createEnhancedAgentSuite(
  options: EnhancedAgentSuiteOptions = {}
): Promise<EnhancedAgentSuite> {
  const primer = buildConversationPrimer();

  // Model configuration
  const routerModel =
    options.models?.router ?? process.env['OPENAI_ROUTER_MODEL'] ?? FAST_MODEL_FALLBACK;
  const generalModel =
    options.models?.general ??
    (options.preferFastGeneral ? BALANCED_MODEL_FALLBACK : COMPLEX_MODEL_FALLBACK);
  const homeModel = options.models?.home ?? process.env['OPENAI_HOME_MODEL'] ?? routerModel;
  const memoryModel = options.models?.memory ?? process.env['OPENAI_MEMORY_MODEL'] ?? routerModel;
  const researchModel =
    options.models?.research ?? process.env['OPENAI_RESEARCH_MODEL'] ?? BALANCED_MODEL_FALLBACK;
  const codeModel = options.models?.code ?? BALANCED_MODEL_FALLBACK;

  // Tool configuration
  const homeTools = getToolConfiguration(getAgentTools('home'), {
    includeExperimental: options.includeExperimentalTools,
  });

  const memoryTools = getToolConfiguration(getAgentTools('memory'), {
    includeExperimental: options.includeExperimentalTools,
  });

  const researchTools = getToolConfiguration(getAgentTools('research'), {
    includeExperimental: options.includeExperimentalTools,
    preferBuiltIn: true, // Use OpenAI's built-in web_search
  });

  const codeTools = getToolConfiguration(getAgentTools('code'), {
    includeExperimental: options.includeExperimentalTools,
  });

  const generalTools = getToolConfiguration(getAgentTools('general'), {
    includeExperimental: options.includeExperimentalTools,
  });

  // Guardrails
  const homeGuardrails = buildGuardrails('home');
  const memoryGuardrails = buildGuardrails('memory');
  const researchGuardrails = buildGuardrails('research');
  const generalGuardrails = buildGuardrails('general');
  const orchestratorGuardrails = buildGuardrails('orchestrator');

  // ============================================================================
  // Home Control Agent
  // ============================================================================

  const homeAgent = new Agent({
    name: 'Home Control Specialist',
    handoffDescription: 'Controls Home Assistant devices by searching and invoking automations.',
    instructions:
      'You control smart home devices through Home Assistant.\n' +
      '- Search for relevant entities with ha_search before calling ha_call.\n' +
      '- Confirm the outcome using returned verification data.\n' +
      '- If configuration is missing or a call fails, clearly explain what went wrong and suggest next steps.\n' +
      '- Always report the final state of devices after actions.',
    model: homeModel,
    modelSettings: buildModelSettings(homeModel, { temperature: 0.2, store: false }),
    tools: [...homeTools.custom, ...homeTools.builtIn] as Tool<unknown>[],
    inputGuardrails: homeGuardrails.input,
    outputGuardrails: homeGuardrails.output,
    ...(options.useStructuredOutputs && {
      response_format: ResponseFormats.smartHome,
    }),
  });

  // ============================================================================
  // Memory Agent
  // ============================================================================

  const memoryAgent = new Agent({
    name: 'Memory Specialist',
    handoffDescription: 'Stores and retrieves long-term memories about the user and household.',
    instructions:
      'You manage the persistent memory store.\n' +
      '- Use memory_search to surface relevant memories before responding.\n' +
      '- Call memory_add for new long-term preferences.\n' +
      '- Never fabricate memories—only store what the user confirms.\n' +
      '- Provide relevance scores when retrieving memories.',
    model: memoryModel,
    modelSettings: buildModelSettings(memoryModel, { temperature: 0.2, store: false }),
    tools: [...memoryTools.custom, ...memoryTools.builtIn] as Tool<unknown>[],
    inputGuardrails: memoryGuardrails.input,
    outputGuardrails: memoryGuardrails.output,
    ...(options.useStructuredOutputs && {
      response_format: ResponseFormats.memory,
    }),
  });

  // ============================================================================
  // Research Agent
  // ============================================================================

  const researchAgent = new Agent({
    name: 'Research Specialist',
    handoffDescription: 'Performs up-to-date research using web search and file search with citations.',
    instructions:
      'You handle questions that require web research or factual lookups.\n' +
      '- Use web_search for current information (OpenAI built-in tool).\n' +
      '- Use file_search to find information in uploaded documents.\n' +
      '- When summarizing, always cite sources with titles and URLs.\n' +
      '- If the search API fails, explain the limitation and offer next steps.\n' +
      '- Rate the confidence of your findings (0-1 scale).',
    model: researchModel,
    modelSettings: buildModelSettings(researchModel, { temperature: 0.3, store: false }),
    tools: [...researchTools.custom, ...researchTools.builtIn] as Tool<unknown>[],
    inputGuardrails: researchGuardrails.input,
    outputGuardrails: researchGuardrails.output,
    ...(options.useStructuredOutputs && {
      response_format: ResponseFormats.research,
    }),
  });

  // ============================================================================
  // Code Execution Agent
  // ============================================================================

  const codeAgent = new Agent({
    name: 'Code Execution Specialist',
    handoffDescription: 'Executes code, performs calculations, and analyzes data using code interpreter.',
    instructions:
      'You handle computational tasks and code execution.\n' +
      '- Use code_interpreter to run Python code in a sandbox.\n' +
      '- Explain your code and results clearly.\n' +
      '- Handle errors gracefully and suggest fixes.\n' +
      '- When generating charts/graphs, provide clear labels.\n' +
      '- Always validate inputs and outputs.',
    model: codeModel,
    modelSettings: buildModelSettings(codeModel, { temperature: 0.2, store: false }),
    tools: [...codeTools.custom, ...codeTools.builtIn] as Tool<unknown>[],
    inputGuardrails: generalGuardrails.input,
    outputGuardrails: generalGuardrails.output,
    ...(options.useStructuredOutputs && {
      response_format: ResponseFormats.code,
    }),
  });

  // ============================================================================
  // General Problem Solver
  // ============================================================================

  const generalAgent = new Agent({
    name: 'General Problem Solver',
    handoffDescription: 'Handles multi-step reasoning tasks and can coordinate across all available tools.',
    instructions:
      'You are the primary assistant for complex or multi-domain requests.\n' +
      '- Decide which tools to use and explain why.\n' +
      '- When acting on the home, double-check device states before and after actions.\n' +
      '- Use code_interpreter for calculations and data analysis.\n' +
      '- Use file_search when users reference documents.\n' +
      '- Summaries must include any important actions, tool usage, and follow-up suggestions.',
    model: generalModel,
    modelSettings: buildModelSettings(generalModel, {
      temperature: options.preferFastGeneral ? 0.2 : 0.5,
      store: true,
      reasoningEffort: options.preferFastGeneral ? 'low' : undefined,
    }),
    tools: [...generalTools.custom, ...generalTools.builtIn] as Tool<unknown>[],
    inputGuardrails: generalGuardrails.input,
    outputGuardrails: generalGuardrails.output,
    ...(options.useStructuredOutputs && {
      response_format: ResponseFormats.orchestration,
    }),
  });

  // ============================================================================
  // Orchestrator
  // ============================================================================

  const orchestrator = new Agent({
    name: 'FROK Orchestrator',
    handoffDescription: 'Routes requests to the best specialist and ensures a polished final response.',
    instructions:
      'You are the orchestrator for the FROK assistant.\n' +
      '1. Understand the user request and decide whether you can answer directly or should delegate.\n' +
      '2. Delegate smart home control tasks to the Home Control Specialist.\n' +
      '3. Delegate long-term preference tasks to the Memory Specialist.\n' +
      '4. Delegate research or news-oriented tasks to the Research Specialist.\n' +
      '5. Delegate code execution or calculations to the Code Execution Specialist.\n' +
      '6. Use the General Problem Solver when the request spans multiple domains or needs deeper reasoning.\n' +
      'Always return a concise summary that references any tools or handoffs that were used.\n' +
      'If information is missing, ask a follow-up question instead of guessing.',
    model: routerModel,
    modelSettings: buildModelSettings(routerModel, { temperature: 0.2, store: true }),
    handoffs: [homeAgent, memoryAgent, researchAgent, codeAgent, generalAgent],
    inputGuardrails: orchestratorGuardrails.input,
    outputGuardrails: orchestratorGuardrails.output,
    ...(options.useStructuredOutputs && {
      response_format: ResponseFormats.orchestration,
    }),
  });

  // ============================================================================
  // Return Suite
  // ============================================================================

  return {
    orchestrator,
    home: homeAgent,
    memory: memoryAgent,
    research: researchAgent,
    code: codeAgent,
    general: generalAgent,
    primer,
    models: {
      router: routerModel,
      home: homeModel,
      memory: memoryModel,
      research: researchModel,
      code: codeModel,
      general: generalModel,
    },
    toolsConfig: generalTools,
  };
}
