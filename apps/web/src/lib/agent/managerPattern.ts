/**
 * Manager Pattern Implementation for OpenAI Agents SDK
 *
 * Implements the "agents-as-tools" pattern where specialist agents can be used
 * as tools by a manager agent, maintaining full control instead of handoff delegation.
 *
 * Key differences from Handoffs:
 * - Manager: Agent keeps control, uses sub-agents as tools, summarizes final answer
 * - Handoffs: Agent transfers control to specialist, specialist provides final answer
 *
 * Use Cases:
 * - Complex reasoning requiring multiple perspectives
 * - Coordinated multi-domain analysis
 * - Synthesis of specialist outputs into unified response
 *
 * Phase 4: Advanced Multi-Agent Patterns
 *
 * @module managerPattern
 * @see apps/web/src/lib/agent/orchestrator-enhanced.ts
 */

import { Agent, tool } from '@openai/agents';
import type { Tool } from '@openai/agents';
import { z } from 'zod';
import { createEnhancedAgentSuite } from './orchestrator-enhanced';

// ============================================================================
// Types
// ============================================================================

/**
 * Manager pattern configuration
 */
export interface ManagerPatternConfig {
  /**
   * Enable manager pattern (agents-as-tools)
   * When true, specialist agents are available as tools
   * When false, uses traditional handoffs pattern only
   */
  enabled: boolean;

  /**
   * Which specialists to expose as tools
   * Default: all specialists
   */
  enabledSpecialists?: ('home' | 'memory' | 'research' | 'code' | 'general')[];

  /**
   * User ID for agent creation
   */
  userId: string;
}

/**
 * Tool-wrapped specialist agent
 */
export interface SpecialistTool {
  name: string;
  description: string;
  specialist: 'home' | 'memory' | 'research' | 'code' | 'general';
  tool: Tool<unknown>;
}

// ============================================================================
// Specialist Agent Tools
// ============================================================================

/**
 * Create a tool wrapper for a specialist agent
 *
 * This implements the "agents-as-tools" manager pattern where the orchestrator
 * can use specialist agents as tools while maintaining control of the conversation.
 *
 * @param agentName - Name of the specialist agent
 * @param agentDescription - Description of the specialist's capabilities
 * @param agent - The specialist agent instance
 * @returns Tool that executes the specialist agent
 */
function createAgentTool(
  agentName: string,
  agentDescription: string,
  agent: Agent
): Tool<unknown> {
  return tool({
    name: `call_${agentName.toLowerCase().replace(/\s+/g, '_')}`,
    description: `${agentDescription} Returns the specialist's analysis for synthesis into your response.`,
    parameters: z.object({
      query: z
        .string()
        .describe('The specific question or task for this specialist to analyze'),
      context: z
        .string()
        .optional()
        .describe('Additional context from the conversation relevant to this query'),
    }),
    execute: async ({ query, context }) => {
      try {
        // Build input with context if provided
        const input = context ? `Context: ${context}\n\nQuery: ${query}` : query;

        // Run the specialist agent as a sub-process
        const result = await agent.run(input);

        // Return the specialist's output for the manager to synthesize
        return {
          specialist: agentName,
          analysis: result.finalOutput,
          success: true,
        };
      } catch (error: unknown) {
        return {
          specialist: agentName,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        };
      }
    },
  });
}

// ============================================================================
// Manager Pattern Creation
// ============================================================================

/**
 * Create specialist agent tools for manager pattern
 *
 * Converts specialist agents into tools that the manager can invoke
 * while maintaining control over the conversation flow and final synthesis.
 *
 * @param config - Manager pattern configuration
 * @returns Array of specialist tools and the manager agent
 */
export async function createManagerPattern(config: ManagerPatternConfig): Promise<{
  manager: Agent;
  specialistTools: SpecialistTool[];
  specialists: {
    home: Agent;
    memory: Agent;
    research: Agent;
    code: Agent;
    general: Agent;
  };
}> {
  // Create the enhanced agent suite
  const suite = await createEnhancedAgentSuite({
    userId: config.userId,
    useStructuredOutputs: false, // Manager doesn't need structured outputs
  });

  // Determine which specialists to enable as tools
  const enabledSpecialists = config.enabledSpecialists ?? [
    'home',
    'memory',
    'research',
    'code',
    'general',
  ];

  // Create tool wrappers for enabled specialists
  const specialistTools: SpecialistTool[] = [];

  if (enabledSpecialists.includes('home')) {
    specialistTools.push({
      name: 'call_home_specialist',
      description: 'Analyze smart home control requirements and device states',
      specialist: 'home',
      tool: createAgentTool(
        'Home Control Specialist',
        'Expert in smart home device control and automation.',
        suite.home
      ),
    });
  }

  if (enabledSpecialists.includes('memory')) {
    specialistTools.push({
      name: 'call_memory_specialist',
      description: 'Retrieve and analyze long-term user preferences and memories',
      specialist: 'memory',
      tool: createAgentTool(
        'Memory Specialist',
        'Expert in user preferences, habits, and long-term context.',
        suite.memory
      ),
    });
  }

  if (enabledSpecialists.includes('research')) {
    specialistTools.push({
      name: 'call_research_specialist',
      description: 'Conduct research and gather current information from web sources',
      specialist: 'research',
      tool: createAgentTool(
        'Research Specialist',
        'Expert in web research, fact-checking, and information gathering.',
        suite.research
      ),
    });
  }

  if (enabledSpecialists.includes('code')) {
    specialistTools.push({
      name: 'call_code_specialist',
      description: 'Execute code, perform calculations, and analyze data',
      specialist: 'code',
      tool: createAgentTool(
        'Code Execution Specialist',
        'Expert in Python code execution, calculations, and data analysis.',
        suite.code
      ),
    });
  }

  if (enabledSpecialists.includes('general')) {
    specialistTools.push({
      name: 'call_general_specialist',
      description: 'Handle complex multi-domain reasoning and problem-solving',
      specialist: 'general',
      tool: createAgentTool(
        'General Problem Solver',
        'Expert in complex reasoning spanning multiple domains.',
        suite.general
      ),
    });
  }

  // Create the manager agent with specialist tools
  const manager = new Agent({
    name: 'FROK Manager',
    instructions:
      'You are the manager of a team of specialist agents.\n\n' +
      'Your role:\n' +
      '1. Analyze user requests and determine which specialists can provide valuable insights\n' +
      '2. Call multiple specialists as tools to gather comprehensive analysis\n' +
      '3. Synthesize specialist outputs into a coherent, unified response\n' +
      '4. Maintain conversation context and ensure smooth user experience\n\n' +
      'Available specialists:\n' +
      '- Home Control: Smart home devices and automation\n' +
      '- Memory: User preferences and long-term context\n' +
      '- Research: Web search and current information\n' +
      '- Code Execution: Calculations and data analysis\n' +
      '- General Problem Solver: Complex multi-domain reasoning\n\n' +
      'Strategy:\n' +
      '- For simple queries: Answer directly without calling specialists\n' +
      '- For complex queries: Call relevant specialists and synthesize their insights\n' +
      '- For multi-domain queries: Call multiple specialists and integrate their analyses\n' +
      '- Always provide a complete, well-integrated final answer',
    model: suite.models.router,
    tools: specialistTools.map((st) => st.tool) as Tool<unknown>[],
  });

  return {
    manager,
    specialistTools,
    specialists: {
      home: suite.home,
      memory: suite.memory,
      research: suite.research,
      code: suite.code,
      general: suite.general,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a hybrid agent that supports both manager pattern and handoffs
 *
 * This creates an orchestrator that can:
 * 1. Use specialists as tools (manager pattern) for synthesis tasks
 * 2. Hand off to specialists (handoffs pattern) for specialized conversations
 *
 * @param config - Manager pattern configuration
 * @returns Hybrid orchestrator with both capabilities
 */
export async function createHybridOrchestrator(config: ManagerPatternConfig): Promise<{
  orchestrator: Agent;
  manager: Agent;
  specialists: {
    home: Agent;
    memory: Agent;
    research: Agent;
    code: Agent;
    general: Agent;
  };
}> {
  // Create the enhanced agent suite (with handoffs)
  const suite = await createEnhancedAgentSuite({
    userId: config.userId,
    useStructuredOutputs: false,
  });

  // Create the manager pattern
  const managerPattern = await createManagerPattern(config);

  // Create a meta-orchestrator that can choose between manager and handoffs
  const orchestrator = new Agent({
    name: 'FROK Hybrid Orchestrator',
    instructions:
      'You are a meta-orchestrator that can use two different patterns:\n\n' +
      '1. Manager Pattern (via tools):\n' +
      '   - Use when synthesis of multiple specialist perspectives is needed\n' +
      '   - Call specialist tools to gather insights, then integrate into unified response\n' +
      '   - Best for: Complex analysis, multi-perspective reasoning, coordination\n\n' +
      '2. Handoff Pattern (via handoffs):\n' +
      '   - Use when a specialist should take full control of the conversation\n' +
      '   - Hand off to specialist for direct, extended interaction\n' +
      '   - Best for: Specialized conversations, iterative refinement, domain expertise\n\n' +
      'Choose the appropriate pattern based on the user request.\n' +
      'For simple queries, answer directly without using either pattern.',
    model: suite.models.router,
    tools: managerPattern.specialistTools.map((st) => st.tool) as Tool<unknown>[],
    handoffs: [suite.home, suite.memory, suite.research, suite.code, suite.general],
  });

  return {
    orchestrator,
    manager: managerPattern.manager,
    specialists: managerPattern.specialists,
  };
}

/**
 * Get default manager pattern configuration
 */
export function getDefaultManagerConfig(userId: string): ManagerPatternConfig {
  return {
    enabled: true,
    enabledSpecialists: ['home', 'memory', 'research', 'code', 'general'],
    userId,
  };
}
