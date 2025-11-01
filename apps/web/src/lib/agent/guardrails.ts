/**
 * Enhanced Guardrails System for Agent Safety & Quality
 *
 * Provides comprehensive input/output validation, content filtering,
 * and safety checks for agent interactions.
 */

import type { InputGuardrail, OutputGuardrail } from '@openai/agents';

// ============================================================================
// Configuration
// ============================================================================

const GUARDRAILS_CONFIG = {
  // Cost limits
  maxCostPerRequest: parseFloat(process.env['MAX_COST_PER_REQUEST'] || '0.50'), // $0.50
  maxTokensPerRequest: parseInt(process.env['MAX_TOKENS_PER_REQUEST'] || '50000', 10),

  // Content limits
  maxInputLength: 10000,
  maxOutputLength: 50000,

  // Safety thresholds
  sensitiveDataThreshold: 0.8,
  injectionConfidenceThreshold: 0.7,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract text from various input formats
 */
function extractText(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        const itemType = (item as { type?: string }).type;
        if (itemType === 'input_text') {
          return (item as { text?: string }).text ?? '';
        }
        if (itemType === 'input_image') {
          return '[image]';
        }
        return '';
      })
      .join(' ');
  }

  return String(input);
}

/**
 * Calculate cost based on model and token usage
 * Note: Currently unused but kept for future implementation when usage data is available
 */
// @ts-expect-error - Function is intentionally unused, kept for future implementation
function calculateCost(model: string, tokens: number): number {
  const pricing: Record<string, number> = {
    'gpt-5-nano': 0.000001,
    'gpt-5-mini': 0.000002,
    'gpt-5-think': 0.000005,
    'gpt-5': 0.000010,
    'gpt-4o': 0.000005,
    'gpt-4o-mini': 0.000001,
  };

  return tokens * (pricing[model] || 0.000005);
}

// ============================================================================
// Input Guardrails
// ============================================================================

/**
 * Sanitize and normalize user input
 */
export const sanitizeInputGuardrail: InputGuardrail = {
  name: 'sanitize-user-input',
  async execute({ input }) {
    const text = extractText(input);
    const normalized = text.replace(/\s+/g, ' ').trim();

    // Check length limits
    if (normalized.length > GUARDRAILS_CONFIG.maxInputLength) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: `Input exceeds maximum length of ${GUARDRAILS_CONFIG.maxInputLength} characters`,
          length: normalized.length,
        },
      };
    }

    return {
      tripwireTriggered: false,
      outputInfo: {
        originalLength: text.length,
        normalizedLength: normalized.length,
      },
    };
  },
};

/**
 * Detect and filter sensitive information (PII)
 */
export const contentFilterGuardrail: InputGuardrail = {
  name: 'content-filter',
  async execute({ input }) {
    const text = extractText(input);

    // Check for Social Security Numbers (US)
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const ssnMatches = text.match(ssnRegex);
    if (ssnMatches && ssnMatches.length > 0) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: 'Sensitive information detected: Social Security Number',
          type: 'PII',
          pattern: 'SSN',
        },
      };
    }

    // Check for Credit Card Numbers
    const ccRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
    const ccMatches = text.match(ccRegex);
    if (ccMatches && ccMatches.length > 0) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: 'Sensitive information detected: Credit Card Number',
          type: 'PII',
          pattern: 'CC',
        },
      };
    }

    // Check for Email addresses (pattern detection, not blocking)
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = text.match(emailRegex);

    // Check for Phone Numbers
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const phoneMatches = text.match(phoneRegex);

    return {
      tripwireTriggered: false,
      outputInfo: {
        containsEmail: (emailMatches?.length || 0) > 0,
        containsPhone: (phoneMatches?.length || 0) > 0,
        checks: 'passed',
      },
    };
  },
};

/**
 * Detect prompt injection attempts
 */
export const promptInjectionGuardrail: InputGuardrail = {
  name: 'prompt-injection-detection',
  async execute({ input }) {
    const text = extractText(input).toLowerCase();

    // Common prompt injection patterns
    const injectionPatterns = [
      /ignore (previous|above|all) (instructions|prompts|rules)/,
      /disregard (previous|above|all) (instructions|prompts|rules)/,
      /forget (everything|all|previous)/,
      /you are now (a|an) (different|new)/,
      /new instructions:/,
      /system:\s/,
      /\[system\]/,
      /override (instructions|prompt|rules)/,
      /act as (if|though) you (are|were)/,
      /pretend (you are|to be)/,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(text)) {
        return {
          tripwireTriggered: true,
          outputInfo: {
            error: 'Potential prompt injection detected',
            pattern: pattern.source,
            confidence: GUARDRAILS_CONFIG.injectionConfidenceThreshold,
          },
        };
      }
    }

    // Check for excessive special characters (potential obfuscation)
    const specialCharRatio =
      (text.match(/[^a-z0-9\s]/g)?.length || 0) / Math.max(text.length, 1);
    if (specialCharRatio > 0.3) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: 'Suspicious input pattern detected',
          reason: 'High special character ratio',
          ratio: specialCharRatio,
        },
      };
    }

    return {
      tripwireTriggered: false,
      outputInfo: { safetyCheck: 'passed' },
    };
  },
};

// ============================================================================
// Output Guardrails
// ============================================================================

/**
 * Validate output quality and structure
 */
export const outputQualityGuardrail: OutputGuardrail = {
  name: 'output-quality-check',
  async execute({ agentOutput }) {
    const text = typeof agentOutput === 'string' ? agentOutput.trim() : JSON.stringify(agentOutput);

    // Check minimum length
    if (text.length < 10) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: 'Output too short (minimum 10 characters)',
          length: text.length,
        },
      };
    }

    // Check maximum length
    if (text.length > GUARDRAILS_CONFIG.maxOutputLength) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: `Output exceeds maximum length of ${GUARDRAILS_CONFIG.maxOutputLength} characters`,
          length: text.length,
        },
      };
    }

    // Quality checks
    const hasPunctuation = /[.!?]$/.test(text);
    const hasProperCapitalization = /^[A-Z]/.test(text);
    const isNotAllCaps = text !== text.toUpperCase();

    return {
      tripwireTriggered: false,
      outputInfo: {
        length: text.length,
        hasPunctuation,
        hasProperCapitalization,
        isNotAllCaps,
        qualityScore: [hasPunctuation, hasProperCapitalization, isNotAllCaps].filter(Boolean).length / 3,
      },
    };
  },
};

/**
 * Smart home action safety checks
 */
export const homeAssistantSafetyGuardrail: OutputGuardrail = {
  name: 'home-assistant-safety',
  async execute() {
    // TODO: Implement when tool calls are available via OutputGuardrail
    // The OutputGuardrail type doesn't currently provide toolCalls parameter
    return {
      tripwireTriggered: false,
      outputInfo: { checked: 'ha_safety_not_implemented' },
    };

    /* Original implementation - needs proper type support with toolCalls
    const dangerousActions = [
      'unlock',
      'disarm',
      'garage_open',
      'door_unlock',
      'alarm_disarm',
      'disable',
      'delete',
      'remove',
    ];

    const criticalEntities = ['lock', 'alarm_control_panel', 'garage_door'];

    if (!toolCalls || toolCalls.length === 0) {
      return {
        tripwireTriggered: false,
        outputInfo: { checked: 'no_tool_calls' },
      };
    }

    for (const toolCall of toolCalls) {
      if (toolCall.name !== 'ha_call') continue;

      const args = toolCall.arguments as { service?: string; entity_id?: string; domain?: string };

      // Check for dangerous services
      const isDangerous = dangerousActions.some((action) =>
        args.service?.toLowerCase().includes(action)
      );

      // Check for critical entity domains
      const isCritical = criticalEntities.some((entity) =>
        args.entity_id?.toLowerCase().includes(entity) || args.domain?.toLowerCase().includes(entity)
      );

      if (isDangerous || isCritical) {
        return {
          tripwireTriggered: true,
          outputInfo: {
            error: 'Dangerous smart home action requires explicit user confirmation',
            action: args.service,
            entity: args.entity_id || args.domain,
            reason: isDangerous ? 'dangerous_service' : 'critical_entity',
          },
        };
      }
    }

    return {
      tripwireTriggered: false,
      outputInfo: {
        toolCallsChecked: toolCalls.length,
        safe: true,
      },
    };
    */
  },
};

/**
 * Cost control and budget enforcement
 */
export const costLimitGuardrail: OutputGuardrail = {
  name: 'cost-limit-enforcement',
  async execute() {
    // TODO: Implement cost tracking when usage data is available
    // The OutputGuardrail type doesn't currently provide usage/metadata
    return {
      tripwireTriggered: false,
      outputInfo: { checked: 'cost_limit_not_implemented' },
    };

    /* Original implementation - needs proper type support
    const totalTokens = usage.totalTokens || 0;
    const model = (metadata as { model?: string })?.model || 'unknown';

    // Calculate cost
    const estimatedCost = calculateCost(model, totalTokens);

    // Check token limit
    if (totalTokens > GUARDRAILS_CONFIG.maxTokensPerRequest) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: `Request exceeded token limit: ${totalTokens} tokens`,
          limit: GUARDRAILS_CONFIG.maxTokensPerRequest,
          cost: estimatedCost,
        },
      };
    }

    // Check cost limit
    if (estimatedCost > GUARDRAILS_CONFIG.maxCostPerRequest) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: `Request exceeded cost limit: $${estimatedCost.toFixed(4)}`,
          limit: GUARDRAILS_CONFIG.maxCostPerRequest,
          tokens: totalTokens,
        },
      };
    }

    return {
      tripwireTriggered: false,
      outputInfo: {
        tokens: totalTokens,
        estimatedCost,
        withinBudget: true,
      },
    };
    */
  },
};

/**
 * Detect and prevent information leakage
 */
export const informationLeakageGuardrail: OutputGuardrail = {
  name: 'information-leakage-prevention',
  async execute({ agentOutput }) {
    const text = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);

    // Check for API keys or tokens
    const apiKeyPatterns = [
      /sk-[a-zA-Z0-9]{32,}/g, // OpenAI keys
      /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
      /xox[baprs]-[a-zA-Z0-9-]+/g, // Slack tokens
      /AIza[a-zA-Z0-9_-]{35}/g, // Google API keys
    ];

    for (const pattern of apiKeyPatterns) {
      if (pattern.test(text)) {
        return {
          tripwireTriggered: true,
          outputInfo: {
            error: 'Potential API key or token detected in output',
            pattern: pattern.source,
          },
        };
      }
    }

    // Check for environment variable leakage
    if (/process\.env|os\.environ|getenv/i.test(text)) {
      return {
        tripwireTriggered: true,
        outputInfo: {
          error: 'Potential environment variable reference in output',
          risk: 'information_disclosure',
        },
      };
    }

    return {
      tripwireTriggered: false,
      outputInfo: { securityCheck: 'passed' },
    };
  },
};

// ============================================================================
// Guardrail Collections
// ============================================================================

/**
 * Standard input guardrails for all agents
 */
export const standardInputGuardrails: InputGuardrail[] = [
  sanitizeInputGuardrail,
  contentFilterGuardrail,
  promptInjectionGuardrail,
];

/**
 * Standard output guardrails for all agents
 */
export const standardOutputGuardrails: OutputGuardrail[] = [
  outputQualityGuardrail,
  costLimitGuardrail,
  informationLeakageGuardrail,
];

/**
 * Smart home specific guardrails
 */
export const smartHomeGuardrails = {
  input: [...standardInputGuardrails],
  output: [...standardOutputGuardrails, homeAssistantSafetyGuardrail],
};

/**
 * Research/web search specific guardrails
 */
export const researchGuardrails = {
  input: [...standardInputGuardrails],
  output: [...standardOutputGuardrails],
};

// ============================================================================
// Guardrail Builder
// ============================================================================

/**
 * Build guardrails based on agent capabilities
 */
export function buildGuardrails(agentType: 'orchestrator' | 'home' | 'memory' | 'research' | 'general') {
  switch (agentType) {
    case 'home':
      return smartHomeGuardrails;

    case 'research':
      return researchGuardrails;

    case 'orchestrator':
    case 'memory':
    case 'general':
    default:
      return {
        input: standardInputGuardrails,
        output: standardOutputGuardrails,
      };
  }
}
