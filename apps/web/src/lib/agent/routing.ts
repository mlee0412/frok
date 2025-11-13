import type { AgentModel } from '@/components/chat/AgentSelector';

// ============================================================================
// Agent Routing Logic
// ============================================================================

/**
 * Determines which GPT-5 model to use based on complexity analysis
 *
 * Features:
 * - Auto-routing based on message complexity
 * - Token count estimation
 * - Code detection
 * - Math/reasoning detection
 * - Research query detection
 */

export interface MessageComplexity {
  score: number; // 0-100
  factors: {
    length: number; // 0-100
    codeBlocks: number; // count
    mathSymbols: number; // count
    questionDepth: number; // 0-100
    technicalTerms: number; // count
  };
  recommendedModel: AgentModel;
}

export function analyzeMessageComplexity(content: string): MessageComplexity {
  const length = content.length;

  // Factor 1: Length (longer = more complex)
  const lengthScore = Math.min(100, (length / 500) * 100);

  // Factor 2: Code blocks
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  const codeScore = Math.min(100, codeBlocks * 30);

  // Factor 3: Math symbols
  const mathSymbols = (content.match(/[∫∑∏∂∇∆∞√π]/g) || []).length;
  const mathScore = Math.min(100, mathSymbols * 20);

  // Factor 4: Question depth (multiple questions, follow-ups)
  const questionMarks = (content.match(/\?/g) || []).length;
  const multipleQuestions = questionMarks > 2;
  const followUpWords = ['why', 'how', 'explain', 'elaborate', 'detail', 'analyze'];
  const hasFollowUps = followUpWords.some(word => content.toLowerCase().includes(word));
  const questionDepthScore = (multipleQuestions ? 40 : 0) + (hasFollowUps ? 40 : 0);

  // Factor 5: Technical terms
  const technicalKeywords = [
    'algorithm', 'architecture', 'optimization', 'refactor', 'design pattern',
    'performance', 'scalability', 'complexity', 'implementation', 'framework',
    'infrastructure', 'asynchronous', 'concurrent', 'distributed', 'microservice',
  ];
  const technicalTerms = technicalKeywords.filter(term =>
    content.toLowerCase().includes(term)
  ).length;
  const technicalScore = Math.min(100, technicalTerms * 15);

  // Calculate weighted complexity score
  const complexityScore = (
    lengthScore * 0.2 +
    codeScore * 0.3 +
    mathScore * 0.2 +
    questionDepthScore * 0.15 +
    technicalScore * 0.15
  );

  // Determine recommended model
  let recommendedModel: AgentModel;
  if (complexityScore >= 70) {
    recommendedModel = 'gpt-5-think'; // High complexity
  } else if (complexityScore >= 40) {
    recommendedModel = 'gpt-5-mini'; // Medium complexity
  } else {
    recommendedModel = 'gpt-5-nano'; // Low complexity
  }

  return {
    score: Math.round(complexityScore),
    factors: {
      length: Math.round(lengthScore),
      codeBlocks,
      mathSymbols,
      questionDepth: Math.round(questionDepthScore),
      technicalTerms,
    },
    recommendedModel,
  };
}

/**
 * Routes message to appropriate model
 */
export function routeMessage(
  content: string,
  selectedModel: AgentModel,
  threadHistory?: Array<{ role: string; content: string }>
): { model: AgentModel; reasoning: string } {
  // If user explicitly selected a model (not auto), use it
  if (selectedModel !== 'auto') {
    return {
      model: selectedModel,
      reasoning: `User selected ${selectedModel}`,
    };
  }

  // Auto-routing based on complexity
  const complexity = analyzeMessageComplexity(content);

  // Consider thread history for context
  if (threadHistory && threadHistory.length > 10) {
    // Long conversations might benefit from more capable model
    if (complexity.score < 70) {
      complexity.score += 10;
      if (complexity.score >= 70 && complexity.recommendedModel === 'gpt-5-mini') {
        complexity.recommendedModel = 'gpt-5-think';
      } else if (complexity.score >= 40 && complexity.recommendedModel === 'gpt-5-nano') {
        complexity.recommendedModel = 'gpt-5-mini';
      }
    }
  }

  return {
    model: complexity.recommendedModel,
    reasoning: `Auto-routed based on complexity (${complexity.score}/100)`,
  };
}

/**
 * Get OpenAI model ID from agent model
 */
export function getOpenAIModelId(model: AgentModel): string {
  switch (model) {
    case 'gpt-5-think':
      return 'gpt-5-turbo-2024-04-09'; // Placeholder - replace with actual GPT-5 think model
    case 'gpt-5-mini':
      return 'gpt-5-turbo-2024-04-09'; // Placeholder - replace with actual GPT-5 mini model
    case 'gpt-5-nano':
      return 'gpt-5-turbo-2024-04-09'; // Placeholder - replace with actual GPT-5 nano model
    case 'auto':
      return 'gpt-5-turbo-2024-04-09'; // Fallback
    default:
      return 'gpt-5-turbo-2024-04-09';
  }
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Estimate response cost
 */
export function estimateCost(
  model: AgentModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<AgentModel, { input: number; output: number } | null> = {
    'gpt-5-think': { input: 0.00005, output: 0.00015 }, // $50/1M tokens avg
    'gpt-5-mini': { input: 0.000005, output: 0.000015 }, // $10/1M tokens avg
    'gpt-5-nano': { input: 0.000001, output: 0.000003 }, // $2/1M tokens avg
    'auto': null,
  };

  const modelPricing = pricing[model];
  if (!modelPricing) return 0;

  return inputTokens * modelPricing.input + outputTokens * modelPricing.output;
}
