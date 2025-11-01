/**
 * Unified Tool System - Built-in + Custom Tools
 *
 * Integrates OpenAI's built-in tools (web_search, file_search, code_interpreter,
 * computer_use) with FROK's custom tools (Home Assistant, Memory).
 */

import type { Tool } from '@openai/agents';
import { z } from 'zod';

// Import existing custom tools
import {
  haSearch,
  haCall,
  memoryAdd,
  memorySearch,
  webSearch as customWebSearch,
} from './tools-improved';

// ============================================================================
// Built-in Tool Types
// ============================================================================

export type BuiltInToolType =
  | 'web_search'
  | 'file_search'
  | 'code_interpreter'
  | 'computer_use'
  | 'image_generation';

export type CustomToolType =
  | 'ha_search'
  | 'ha_call'
  | 'memory_add'
  | 'memory_search'
  | 'custom_web_search';

export type ToolType = BuiltInToolType | CustomToolType;

// ============================================================================
// Tool Configurations
// ============================================================================

/**
 * Built-in tool configurations for OpenAI
 */
export const builtInToolConfigs = {
  web_search: {
    type: 'web_search' as const,
    web_search: {
      enabled: true,
    },
  },

  file_search: {
    type: 'file_search' as const,
    file_search: {
      enabled: true,
      max_num_results: 20,
    },
  },

  code_interpreter: {
    type: 'code_interpreter' as const,
    code_interpreter: {
      enabled: true,
    },
  },

  computer_use: {
    type: 'computer_use' as const,
    computer_use: {
      enabled: true,
      display_width_px: 1024,
      display_height_px: 768,
      display_number: 1,
    },
  },

  image_generation: {
    type: 'dalle' as const,
    dalle: {
      enabled: true,
      quality: 'standard' as const,
      size: '1024x1024' as const,
      style: 'natural' as const,
    },
  },
};

/**
 * Custom tool wrapper for consistency
 */
export const customTools = {
  ha_search: haSearch,
  ha_call: haCall,
  memory_add: memoryAdd,
  memory_search: memorySearch,
  custom_web_search: customWebSearch,
};

// ============================================================================
// Tool Categories & Descriptions
// ============================================================================

export const toolCategories = {
  // Smart Home
  smart_home: {
    name: 'Smart Home Control',
    description: 'Control and monitor Home Assistant devices',
    tools: ['ha_search', 'ha_call'] as const,
    icon: '🏠',
  },

  // Information & Research
  research: {
    name: 'Research & Information',
    description: 'Search the web, find information, and retrieve documents',
    tools: ['web_search', 'file_search', 'custom_web_search'] as const,
    icon: '🔍',
  },

  // Code & Computation
  code: {
    name: 'Code & Computation',
    description: 'Execute code, perform calculations, and analyze data',
    tools: ['code_interpreter'] as const,
    icon: '💻',
  },

  // Memory & Preferences
  memory: {
    name: 'Memory & Preferences',
    description: 'Store and retrieve long-term memories and user preferences',
    tools: ['memory_add', 'memory_search'] as const,
    icon: '🧠',
  },

  // Creative
  creative: {
    name: 'Creative Tools',
    description: 'Generate images and creative content',
    tools: ['image_generation'] as const,
    icon: '🎨',
  },

  // Advanced (experimental)
  advanced: {
    name: 'Advanced Tools',
    description: 'Computer use and automation (experimental)',
    tools: ['computer_use'] as const,
    icon: '🤖',
  },
};

// ============================================================================
// Tool Metadata
// ============================================================================

export const toolMetadata: Record<ToolType, {
  displayName: string;
  description: string;
  category: keyof typeof toolCategories;
  costPerUse?: string;
  requiresAuth?: boolean;
  experimental?: boolean;
  dependencies?: string[];
}> = {
  // Built-in tools
  web_search: {
    displayName: 'Web Search',
    description: 'Search the web for up-to-date information using OpenAI\'s built-in search',
    category: 'research',
    costPerUse: 'Included in API call',
    requiresAuth: false,
    experimental: false,
  },

  file_search: {
    displayName: 'File Search',
    description: 'Search through uploaded documents and files in vector storage',
    category: 'research',
    costPerUse: '$0.10/GB/day storage + $2.50/1k searches',
    requiresAuth: false,
    experimental: false,
    dependencies: ['Vector store with uploaded files'],
  },

  code_interpreter: {
    displayName: 'Code Interpreter',
    description: 'Execute Python code in a secure sandbox environment',
    category: 'code',
    costPerUse: '$0.03 per session',
    requiresAuth: false,
    experimental: false,
  },

  computer_use: {
    displayName: 'Computer Use',
    description: 'Control computer interface for automation (experimental)',
    category: 'advanced',
    costPerUse: 'Varies by action',
    requiresAuth: false,
    experimental: true,
  },

  image_generation: {
    displayName: 'Image Generation',
    description: 'Generate images from text descriptions using DALL-E',
    category: 'creative',
    costPerUse: '$0.040 per 1024x1024 image',
    requiresAuth: false,
    experimental: false,
  },

  // Custom tools
  ha_search: {
    displayName: 'Home Assistant Search',
    description: 'Search for smart home devices and areas in Home Assistant',
    category: 'smart_home',
    costPerUse: 'Free',
    requiresAuth: true,
    experimental: false,
    dependencies: ['HOME_ASSISTANT_URL', 'HOME_ASSISTANT_TOKEN'],
  },

  ha_call: {
    displayName: 'Home Assistant Control',
    description: 'Control smart home devices through Home Assistant',
    category: 'smart_home',
    costPerUse: 'Free',
    requiresAuth: true,
    experimental: false,
    dependencies: ['HOME_ASSISTANT_URL', 'HOME_ASSISTANT_TOKEN'],
  },

  memory_add: {
    displayName: 'Add Memory',
    description: 'Store persistent memories and user preferences',
    category: 'memory',
    costPerUse: 'Embedding cost (~$0.0001)',
    requiresAuth: true,
    experimental: false,
    dependencies: ['OPENAI_API_KEY', 'SUPABASE'],
  },

  memory_search: {
    displayName: 'Search Memories',
    description: 'Search through stored memories using semantic search',
    category: 'memory',
    costPerUse: 'Embedding cost (~$0.0001)',
    requiresAuth: true,
    experimental: false,
    dependencies: ['OPENAI_API_KEY', 'SUPABASE'],
  },

  custom_web_search: {
    displayName: 'Custom Web Search',
    description: 'Search using Tavily or DuckDuckGo (fallback for built-in)',
    category: 'research',
    costPerUse: 'Free (DuckDuckGo) or Tavily API cost',
    requiresAuth: false,
    experimental: false,
  },
};

// ============================================================================
// Tool Selection & Configuration
// ============================================================================

/**
 * Get tool configuration based on enabled tools
 */
export function getToolConfiguration(
  enabledTools: ToolType[],
  options?: {
    preferBuiltIn?: boolean;
    includeExperimental?: boolean;
  }
) {
  const builtInTools: unknown[] = [];
  const customToolsList: Tool<unknown>[] = [];

  for (const toolName of enabledTools) {
    const metadata = toolMetadata[toolName];

    // Skip experimental tools unless explicitly enabled
    if (metadata.experimental && !options?.includeExperimental) {
      console.log(`[tools] Skipping experimental tool: ${toolName}`);
      continue;
    }

    // Check if tool is built-in
    if (toolName in builtInToolConfigs) {
      builtInTools.push(builtInToolConfigs[toolName as BuiltInToolType]);
    }
    // Otherwise, use custom tool
    else if (toolName in customTools) {
      customToolsList.push(customTools[toolName as CustomToolType]);
    } else {
      console.warn(`[tools] Unknown tool: ${toolName}`);
    }
  }

  return {
    builtIn: builtInTools,
    custom: customToolsList,
    all: [...customToolsList], // Custom tools go through function calling
    metadata: enabledTools.map((tool) => toolMetadata[tool]),
  };
}

/**
 * Get default tools for different complexity levels
 */
export function getDefaultTools(complexity: 'simple' | 'moderate' | 'complex'): ToolType[] {
  switch (complexity) {
    case 'simple':
      // Fast, lightweight tools only
      return ['ha_search', 'ha_call', 'memory_search'];

    case 'moderate':
      // Common tools with web search
      return ['ha_search', 'ha_call', 'memory_search', 'memory_add', 'web_search'];

    case 'complex':
      // All tools including code execution
      return [
        'ha_search',
        'ha_call',
        'memory_search',
        'memory_add',
        'web_search',
        'file_search',
        'code_interpreter',
      ];

    default:
      return ['ha_search', 'ha_call', 'memory_search', 'web_search'];
  }
}

/**
 * Get specialized tool sets for different agent types
 */
export function getAgentTools(agentType: 'home' | 'memory' | 'research' | 'code' | 'general'): ToolType[] {
  switch (agentType) {
    case 'home':
      return ['ha_search', 'ha_call'];

    case 'memory':
      return ['memory_add', 'memory_search'];

    case 'research':
      return ['web_search', 'file_search', 'memory_search'];

    case 'code':
      return ['code_interpreter', 'web_search'];

    case 'general':
      return [
        'ha_search',
        'ha_call',
        'memory_add',
        'memory_search',
        'web_search',
        'file_search',
        'code_interpreter',
      ];

    default:
      return ['web_search', 'memory_search'];
  }
}

/**
 * Validate tool dependencies
 */
export function validateToolDependencies(tools: ToolType[]): {
  valid: boolean;
  missing: { tool: ToolType; dependencies: string[] }[];
} {
  const missing: { tool: ToolType; dependencies: string[] }[] = [];

  for (const tool of tools) {
    const metadata = toolMetadata[tool];
    if (!metadata.dependencies || metadata.dependencies.length === 0) continue;

    const missingDeps = metadata.dependencies.filter((dep) => {
      // Check if environment variable exists
      if (dep.startsWith('HOME_ASSISTANT') || dep === 'OPENAI_API_KEY' || dep === 'TAVILY_API_KEY') {
        return !process.env[dep];
      }

      // Check if service is available
      if (dep === 'SUPABASE') {
        return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
      }

      return false;
    });

    if (missingDeps.length > 0) {
      missing.push({ tool, dependencies: missingDeps });
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// Tool Selection Helpers
// ============================================================================

/**
 * Get recommended tools based on query
 */
export function recommendTools(query: string): ToolType[] {
  const queryLower = query.toLowerCase();
  const recommended: ToolType[] = [];

  // Smart home keywords
  if (/\b(turn|light|switch|climate|thermostat|lock|unlock|dim|brighten)\b/i.test(query)) {
    recommended.push('ha_search', 'ha_call');
  }

  // Code/calculation keywords
  if (/\b(calculate|compute|analyze|code|python|script|data|chart|graph)\b/i.test(query)) {
    recommended.push('code_interpreter');
  }

  // Memory keywords
  if (/\b(remember|recall|forget|preference|save|store)\b/i.test(query)) {
    recommended.push('memory_search', 'memory_add');
  }

  // Research keywords
  if (/\b(search|find|lookup|latest|current|news|research)\b/i.test(query)) {
    recommended.push('web_search');
  }

  // Document keywords
  if (/\b(document|file|pdf|read|find in|search in)\b/i.test(query)) {
    recommended.push('file_search');
  }

  // Image generation keywords
  if (/\b(generate|create|draw|image|picture|illustration|visualize)\b/i.test(query)) {
    recommended.push('image_generation');
  }

  // Default fallback
  if (recommended.length === 0) {
    recommended.push('web_search', 'memory_search');
  }

  return recommended;
}

/**
 * Get tool display information for UI
 */
export function getToolDisplayInfo(tool: ToolType) {
  const metadata = toolMetadata[tool];
  const category = toolCategories[metadata.category];

  return {
    name: metadata.displayName,
    description: metadata.description,
    category: category.name,
    categoryIcon: category.icon,
    cost: metadata.costPerUse,
    requiresAuth: metadata.requiresAuth,
    experimental: metadata.experimental,
    dependencies: metadata.dependencies,
  };
}

// ============================================================================
// Export
// ============================================================================

export {
  // Tool types
  type BuiltInToolType,
  type CustomToolType,
  type ToolType,

  // Configurations
  builtInToolConfigs,
  customTools,

  // Selection functions
  getToolConfiguration,
  getDefaultTools,
  getAgentTools,
  recommendTools,
  validateToolDependencies,
  getToolDisplayInfo,

  // Categories & metadata
  toolCategories,
  toolMetadata,
};
