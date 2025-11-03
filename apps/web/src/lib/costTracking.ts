/**
 * Cost tracking utilities for AI agent invocations
 *
 * Estimates costs based on model usage and token consumption.
 * Uses approximate token counts based on character length.
 */

// Model pricing (per 1M tokens)
// Source: OpenAI pricing as of 2025
const MODEL_PRICING = {
  'gpt-5-nano': {
    input: 0.10,   // $0.10 per 1M input tokens
    output: 0.20,  // $0.20 per 1M output tokens
  },
  'gpt-5-mini': {
    input: 0.15,   // $0.15 per 1M input tokens
    output: 0.60,  // $0.60 per 1M output tokens
  },
  'gpt-5-think': {
    input: 2.50,   // $2.50 per 1M input tokens
    output: 10.00, // $10.00 per 1M output tokens
  },
  'gpt-5': {
    input: 5.00,   // $5.00 per 1M input tokens
    output: 15.00, // $15.00 per 1M output tokens
  },
  'gpt-4': {
    input: 30.00,  // $30.00 per 1M input tokens
    output: 60.00, // $60.00 per 1M output tokens
  },
  // Fallback for unknown models
  'unknown': {
    input: 1.00,
    output: 2.00,
  },
} as const;

// Tool usage costs (fixed per use)
const TOOL_COSTS = {
  'web_search': 0.001,         // $0.001 per search
  'code_interpreter': 0.03,     // $0.03 per session
  'file_search': 0.0025,        // $0.0025 per 1k searches
  'image_generation': 0.040,    // $0.040 per 1024x1024 image
  'ha_search': 0,               // Free (local)
  'ha_call': 0,                 // Free (local)
  'memory_add': 0,              // Free (database operation)
  'memory_search': 0,           // Free (database operation)
  'custom_web_search': 0.001,   // $0.001 per search (Tavily)
} as const;

type ModelName = keyof typeof MODEL_PRICING;
type ToolName = keyof typeof TOOL_COSTS;

/**
 * Estimate token count from text length
 * Rule of thumb: 1 token ≈ 4 characters for English text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for a single message interaction
 * @param model - Model name (e.g., 'gpt-5-mini')
 * @param inputText - User input text
 * @param outputText - Assistant output text
 * @param tools - Array of tools used in the interaction
 * @returns Estimated cost in USD
 */
export function calculateMessageCost(
  model: string,
  inputText: string,
  outputText: string,
  tools: string[] = []
): number {
  // Get model pricing (fallback to 'unknown' if model not found)
  const modelKey = (model in MODEL_PRICING ? model : 'unknown') as ModelName;
  const pricing = MODEL_PRICING[modelKey];

  // Estimate tokens
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);

  // Calculate model costs
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const modelCost = inputCost + outputCost;

  // Calculate tool costs
  const toolCost = tools.reduce((total, tool) => {
    const toolKey = (tool in TOOL_COSTS ? tool : 'web_search') as ToolName;
    return total + (TOOL_COSTS[toolKey] || 0);
  }, 0);

  return modelCost + toolCost;
}

/**
 * Calculate total cost for multiple messages
 * @param messages - Array of messages with model and tool info
 * @returns Total estimated cost in USD
 */
export function calculateTotalCost(
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    tools?: string[];
  }>
): number {
  let totalCost = 0;
  let currentUserMessage = '';

  for (const message of messages) {
    if (message.role === 'user') {
      // Store user message for next calculation
      currentUserMessage = message.content;
    } else if (message.role === 'assistant') {
      // Calculate cost for this interaction
      const model = message.model || 'gpt-5-mini';
      const tools = message.tools || [];
      const cost = calculateMessageCost(
        model,
        currentUserMessage,
        message.content,
        tools
      );
      totalCost += cost;
      currentUserMessage = ''; // Reset
    }
  }

  return totalCost;
}

/**
 * Format cost as currency string
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.0023")
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.0001) return '< $0.0001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Get cost breakdown by model
 * @param messages - Array of messages
 * @returns Object with costs per model
 */
export function getCostBreakdown(
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    tools?: string[];
  }>
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  let currentUserMessage = '';

  for (const message of messages) {
    if (message.role === 'user') {
      currentUserMessage = message.content;
    } else if (message.role === 'assistant') {
      const model = message.model || 'gpt-5-mini';
      const tools = message.tools || [];
      const cost = calculateMessageCost(
        model,
        currentUserMessage,
        message.content,
        tools
      );
      breakdown[model] = (breakdown[model] || 0) + cost;
      currentUserMessage = '';
    }
  }

  return breakdown;
}

/**
 * Get cost statistics for a time period
 * @param messages - Array of messages with timestamps
 * @param periodDays - Number of days to analyze (default: 7)
 * @returns Statistics object
 */
export function getCostStatistics(
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    model?: string;
    tools?: string[];
    timestamp: number;
  }>,
  periodDays: number = 7
): {
  totalCost: number;
  averageCostPerMessage: number;
  costByModel: Record<string, number>;
  costByDay: Array<{ date: string; cost: number }>;
  messageCount: number;
} {
  const now = Date.now();
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

  // Filter messages within period
  const periodMessages = messages.filter((m) => m.timestamp >= periodStart);

  // Calculate total cost
  const totalCost = calculateTotalCost(periodMessages);

  // Get assistant message count
  const messageCount = periodMessages.filter((m) => m.role === 'assistant').length;

  // Calculate average cost per message
  const averageCostPerMessage = messageCount > 0 ? totalCost / messageCount : 0;

  // Get cost breakdown by model
  const costByModel = getCostBreakdown(periodMessages);

  // Get cost by day
  const costByDay: Array<{ date: string; cost: number }> = [];
  const dailyCosts: Record<string, number> = {};

  let currentUserMessage = '';
  for (const message of periodMessages) {
    if (message.role === 'user') {
      currentUserMessage = message.content;
    } else if (message.role === 'assistant') {
      const dateStr = new Date(message.timestamp).toISOString().split('T')[0];
      if (!dateStr) continue; // Skip if date parsing fails (shouldn't happen)

      const model = message.model || 'gpt-5-mini';
      const tools = message.tools || [];
      const cost = calculateMessageCost(
        model,
        currentUserMessage,
        message.content,
        tools
      );
      dailyCosts[dateStr] = (dailyCosts[dateStr] || 0) + cost;
      currentUserMessage = '';
    }
  }

  // Convert daily costs to array
  for (const [date, cost] of Object.entries(dailyCosts)) {
    costByDay.push({ date, cost });
  }
  costByDay.sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCost,
    averageCostPerMessage,
    costByModel,
    costByDay,
    messageCount,
  };
}

/**
 * Estimate cost for a message before sending
 * Useful for showing user estimated cost
 */
export function estimateCost(
  model: string,
  inputText: string,
  estimatedOutputLength: number = 500,
  tools: string[] = []
): number {
  const estimatedOutput = 'x'.repeat(estimatedOutputLength);
  return calculateMessageCost(model, inputText, estimatedOutput, tools);
}
