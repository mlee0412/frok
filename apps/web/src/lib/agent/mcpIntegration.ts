/**
 * MCP (Model Context Protocol) Integration for Home Assistant
 *
 * Provides direct integration with Home Assistant using OpenAI's MCP client.
 * Enables auto-discovery of devices and services, type-safe device control.
 *
 * Features:
 * - Automatic device discovery via Home Assistant API
 * - Type-safe tool generation for discovered entities
 * - Domain-specific actions (light, switch, climate, etc.)
 * - State queries and status monitoring
 *
 * Phase 3.1: Advanced Features Implementation
 *
 * Note: This is a conceptual implementation. Full MCP integration requires
 * additional setup and may need adjustments when OpenAI's MCP SDK is released.
 *
 * @module mcpIntegration
 * @see apps/web/src/app/api/agent/mcp/discovery/route.ts
 */

import { tool } from '@openai/agents';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/**
 * Home Assistant entity types
 */
export type HAEntityDomain =
  | 'light'
  | 'switch'
  | 'climate'
  | 'cover'
  | 'fan'
  | 'lock'
  | 'media_player'
  | 'sensor'
  | 'binary_sensor'
  | 'script'
  | 'automation'
  | 'scene';

/**
 * Home Assistant entity state
 */
export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

/**
 * Home Assistant service call
 */
export interface HAServiceCall {
  domain: string;
  service: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

/**
 * MCP tool configuration
 */
export interface MCPToolConfig {
  enabled: boolean;
  autoDiscovery: boolean;
  includedDomains?: HAEntityDomain[];
  excludedEntities?: string[];
  refreshInterval?: number; // minutes
}

/**
 * Discovered MCP tool
 */
export interface DiscoveredTool {
  name: string;
  description: string;
  domain: HAEntityDomain;
  entityId: string;
  actions: string[];
  tool: ReturnType<typeof tool>;
}

// ============================================================================
// MCP Client
// ============================================================================

/**
 * Home Assistant MCP Client
 *
 * Connects to Home Assistant API and auto-discovers available devices.
 * Generates OpenAI Agent tools dynamically based on discovered entities.
 */
export class HomeAssistantMCPClient {
  private baseUrl: string;
  private apiKey: string;
  private cachedTools: DiscoveredTool[] | null = null;
  private lastDiscovery: Date | null = null;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  /**
   * Discover all available Home Assistant entities
   *
   * @param config - MCP tool configuration
   * @returns Array of discovered tools
   */
  async discoverTools(config: MCPToolConfig): Promise<DiscoveredTool[]> {
    // Check cache validity
    if (
      this.cachedTools &&
      this.lastDiscovery &&
      config.refreshInterval
    ) {
      const minutesSinceLastDiscovery =
        (Date.now() - this.lastDiscovery.getTime()) / (1000 * 60);

      if (minutesSinceLastDiscovery < config.refreshInterval) {
        return this.cachedTools;
      }
    }

    const states = await this.fetchStates();
    const tools: DiscoveredTool[] = [];

    for (const state of states) {
      const domain = state.entity_id.split('.')[0] as HAEntityDomain;

      // Filter by included domains
      if (
        config.includedDomains &&
        !config.includedDomains.includes(domain)
      ) {
        continue;
      }

      // Filter by excluded entities
      if (config.excludedEntities?.includes(state.entity_id)) {
        continue;
      }

      const discoveredTool = this.createToolFromEntity(state, domain);
      if (discoveredTool) {
        tools.push(discoveredTool);
      }
    }

    // Update cache
    this.cachedTools = tools;
    this.lastDiscovery = new Date();

    return tools;
  }

  /**
   * Fetch all entity states from Home Assistant
   */
  private async fetchStates(): Promise<HAEntityState[]> {
    const response = await fetch(`${this.baseUrl}/api/states`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Home Assistant states: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Create an OpenAI Agent tool from a Home Assistant entity
   */
  private createToolFromEntity(
    state: HAEntityState,
    domain: HAEntityDomain
  ): DiscoveredTool | null {
    const actions = this.getAvailableActions(domain);
    const friendlyName =
      (state.attributes['friendly_name'] as string) ?? state.entity_id;

    const toolName = `ha_${domain}_${state.entity_id.replace(/\./g, '_')}`;
    const description = `Control ${friendlyName} (${domain}). Available actions: ${actions.join(', ')}. Current state: ${state.state}`;

    // Create action schema dynamically based on domain
    const schemaProperties: Record<string, unknown> = {
      action: z.enum(actions as [string, ...string[]]).describe(`Action to perform on ${friendlyName}`),
    };

    // Add domain-specific parameters to schema
    if (domain === 'light') {
      schemaProperties['brightness'] = z.number().min(0).max(255).optional().describe('Brightness level (0-255)');
      schemaProperties['color_temp'] = z.number().optional().describe('Color temperature in mireds');
    } else if (domain === 'climate') {
      schemaProperties['temperature'] = z.number().optional().describe('Target temperature');
      schemaProperties['hvac_mode'] = z.enum(['off', 'heat', 'cool', 'auto', 'dry', 'fan_only']).optional().describe('HVAC mode');
    } else if (domain === 'cover') {
      schemaProperties['position'] = z.number().min(0).max(100).optional().describe('Position (0-100)');
    } else if (domain === 'fan') {
      schemaProperties['speed'] = z.number().min(0).max(100).optional().describe('Fan speed (0-100)');
    }

    // Create tool using OpenAI's tool helper
    const createdTool = tool({
      name: toolName,
      description,
      parameters: z.object(schemaProperties as Record<string, z.ZodTypeAny>),
      execute: async (args: { action: string; [key: string]: unknown }) => {
        const result = await this.executeAction(state.entity_id, domain, args.action, args);
        return result;
      },
    });

    return {
      name: toolName,
      description,
      domain,
      entityId: state.entity_id,
      actions,
      tool: createdTool,
    };
  }

  /**
   * Get available actions for a domain
   */
  private getAvailableActions(domain: HAEntityDomain): string[] {
    const actionMap: Record<HAEntityDomain, string[]> = {
      light: ['turn_on', 'turn_off', 'toggle', 'set_brightness'],
      switch: ['turn_on', 'turn_off', 'toggle'],
      climate: ['set_temperature', 'set_hvac_mode', 'turn_on', 'turn_off'],
      cover: ['open', 'close', 'stop', 'set_position'],
      fan: ['turn_on', 'turn_off', 'set_speed'],
      lock: ['lock', 'unlock'],
      media_player: ['play', 'pause', 'stop', 'volume_up', 'volume_down'],
      sensor: ['get_state'],
      binary_sensor: ['get_state'],
      script: ['turn_on'],
      automation: ['turn_on', 'turn_off', 'trigger'],
      scene: ['turn_on'],
    };

    return actionMap[domain] ?? ['get_state'];
  }

  /**
   * Execute an action on a Home Assistant entity
   */
  private async executeAction(
    entityId: string,
    domain: HAEntityDomain,
    action: string,
    params: Record<string, unknown>
  ): Promise<string> {
    const serviceCall: HAServiceCall = {
      domain,
      service: action,
      entity_id: entityId,
      data: this.buildServiceData(action, params),
    };

    const response = await fetch(`${this.baseUrl}/api/services/${domain}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entity_id: entityId,
        ...serviceCall.data,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to execute action ${action} on ${entityId}: ${response.statusText}`
      );
    }

    return `Successfully executed ${action} on ${entityId}`;
  }

  /**
   * Build service data from action parameters
   */
  private buildServiceData(
    action: string,
    params: Record<string, unknown>
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Filter out the 'action' parameter
    const { action: _action, ...rest } = params;

    // Map parameters to Home Assistant service data
    if (action === 'set_brightness' && rest['brightness'] !== undefined) {
      data['brightness'] = rest['brightness'];
    }

    if (action === 'set_temperature' && rest['temperature'] !== undefined) {
      data['temperature'] = rest['temperature'];
    }

    if (action === 'set_hvac_mode' && rest['hvac_mode'] !== undefined) {
      data['hvac_mode'] = rest['hvac_mode'];
    }

    if (action === 'set_position' && rest['position'] !== undefined) {
      data['position'] = rest['position'];
    }

    if (action === 'set_speed' && rest['speed'] !== undefined) {
      data['percentage'] = rest['speed'];
    }

    if (rest['color_temp'] !== undefined) {
      data['color_temp'] = rest['color_temp'];
    }

    return data;
  }

  /**
   * Get current state of an entity
   */
  async getState(entityId: string): Promise<HAEntityState> {
    const response = await fetch(`${this.baseUrl}/api/states/${entityId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get state for ${entityId}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Clear cached tools (force rediscovery)
   */
  clearCache(): void {
    this.cachedTools = null;
    this.lastDiscovery = null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Home Assistant MCP client instance
 *
 * @param baseUrl - Home Assistant base URL (e.g., http://homeassistant.local:8123)
 * @param apiKey - Long-lived access token from Home Assistant
 * @returns HomeAssistantMCPClient instance
 *
 * @example
 * ```typescript
 * const mcpClient = createHomeAssistantMCP(
 *   process.env.HOME_ASSISTANT_URL!,
 *   process.env.HOME_ASSISTANT_TOKEN!
 * );
 *
 * const tools = await mcpClient.discoverTools({
 *   enabled: true,
 *   autoDiscovery: true,
 *   includedDomains: ['light', 'switch', 'climate'],
 *   refreshInterval: 30, // 30 minutes
 * });
 *
 * // Use discovered tools with Agent
 * const agent = new Agent({
 *   name: 'Home Assistant Agent',
 *   tools: tools.map(t => t.tool),
 *   // ...
 * });
 * ```
 */
export function createHomeAssistantMCP(
  baseUrl: string,
  apiKey: string
): HomeAssistantMCPClient {
  return new HomeAssistantMCPClient(baseUrl, apiKey);
}

/**
 * Get default MCP configuration
 */
export function getDefaultMCPConfig(): MCPToolConfig {
  return {
    enabled: true,
    autoDiscovery: true,
    includedDomains: ['light', 'switch', 'climate', 'cover', 'fan', 'lock'],
    excludedEntities: [],
    refreshInterval: 30, // 30 minutes
  };
}

/**
 * Validate MCP configuration
 */
export function validateMCPConfig(config: Partial<MCPToolConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.enabled === undefined) {
    errors.push('enabled is required');
  }

  if (config.autoDiscovery === undefined) {
    errors.push('autoDiscovery is required');
  }

  if (config.refreshInterval !== undefined && config.refreshInterval < 1) {
    errors.push('refreshInterval must be at least 1 minute');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
