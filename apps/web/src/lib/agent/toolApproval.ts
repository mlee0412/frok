/**
 * Tool Approval System
 *
 * Phase 2.3: User confirmation for potentially dangerous actions
 *
 * This system provides safety guardrails for agent tool execution:
 * - Identifies dangerous tool operations
 * - Requires explicit user approval before execution
 * - Maintains audit trail of approvals/denials
 * - Configurable risk levels and approval rules
 *
 * Risk Levels:
 * - LOW: Safe operations (search, read-only)
 * - MEDIUM: Moderate risk (write data, send emails)
 * - HIGH: Dangerous operations (delete, unlock doors, financial transactions)
 * - CRITICAL: Extremely dangerous (security systems, irreversible actions)
 *
 * Approval Flow:
 * 1. Agent attempts to call a tool
 * 2. System checks if tool requires approval
 * 3. If yes, sends approval request to user
 * 4. User approves or denies
 * 5. Action executes (if approved) or is canceled (if denied)
 * 6. Result logged to audit trail
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export type ToolApprovalRequest = {
  id: string;
  tool_name: string;
  tool_description: string;
  parameters: Record<string, unknown>;
  risk_level: RiskLevel;
  risk_reason: string;
  requested_at: string;
  expires_at: string;
  status: ApprovalStatus;
  user_id: string;
  thread_id?: string;
};

export type ToolApprovalResponse = {
  id: string;
  status: 'approved' | 'denied';
  user_id: string;
  responded_at: string;
  reason?: string;
};

export type ToolApprovalAuditEntry = {
  id: string;
  tool_name: string;
  parameters: Record<string, unknown>;
  risk_level: RiskLevel;
  status: ApprovalStatus;
  requested_at: string;
  responded_at?: string;
  user_id: string;
  thread_id?: string;
  approval_reason?: string;
  execution_result?: unknown;
};

/**
 * Tool Risk Configuration
 *
 * Defines which tools require approval and their risk levels
 */
const TOOL_RISK_CONFIG: Record<string, { level: RiskLevel; requiresApproval: boolean; dangerousOperations?: string[] }> = {
  // Home Assistant tools
  ha_call: {
    level: 'high',
    requiresApproval: true,
    dangerousOperations: [
      'lock.unlock',           // Unlocking doors
      'alarm_control_panel.disarm', // Disarming security
      'garage_door.open',      // Opening garage
      'climate.turn_off',      // Turning off heat/AC in extreme weather
      'cover.open',            // Opening window coverings (security risk)
    ],
  },
  ha_search: {
    level: 'low',
    requiresApproval: false, // Read-only, safe
  },

  // Memory tools
  memory_add: {
    level: 'low',
    requiresApproval: false, // Adding memories is safe
  },
  memory_search: {
    level: 'low',
    requiresApproval: false, // Search is read-only
  },
  memory_search_enhanced: {
    level: 'low',
    requiresApproval: false, // Search is read-only
  },

  // Web search tools
  web_search: {
    level: 'low',
    requiresApproval: false, // Read-only
  },
  custom_web_search: {
    level: 'low',
    requiresApproval: false, // Read-only
  },

  // Export tools (medium risk - creates files)
  pdf_generator: {
    level: 'medium',
    requiresApproval: false, // User explicitly requests document generation
  },
  pptx_generator: {
    level: 'medium',
    requiresApproval: false,
  },
  docx_generator: {
    level: 'medium',
    requiresApproval: false,
  },

  // Code execution (high risk)
  code_interpreter: {
    level: 'high',
    requiresApproval: true, // Executing code should require approval
  },

  // Computer use (critical risk)
  computer_use: {
    level: 'critical',
    requiresApproval: true, // Desktop automation is very dangerous
  },

  // Image generation (low risk, costs money)
  image_generation: {
    level: 'medium',
    requiresApproval: false, // User explicitly requests images
  },
};

/**
 * Approval Manager
 *
 * Manages tool approval requests and responses
 */
export class ToolApprovalManager {
  private pendingApprovals: Map<string, ToolApprovalRequest>;
  private approvalTimeout: number;

  constructor(approvalTimeoutMs: number = 60000) {
    this.pendingApprovals = new Map();
    this.approvalTimeout = approvalTimeoutMs;
  }

  /**
   * Check if a tool requires approval
   */
  requiresApproval(toolName: string, parameters?: Record<string, unknown>): boolean {
    const config = TOOL_RISK_CONFIG[toolName];

    if (!config || !config.requiresApproval) {
      return false;
    }

    // Check for dangerous operations in ha_call
    if (toolName === 'ha_call' && parameters && config.dangerousOperations) {
      const domain = String(parameters['domain'] || '');
      const service = String(parameters['service'] || '');
      const operation = `${domain}.${service}`;

      // Only require approval for dangerous operations
      return config.dangerousOperations.includes(operation);
    }

    return true;
  }

  /**
   * Get risk level for a tool
   */
  getRiskLevel(toolName: string, parameters?: Record<string, unknown>): RiskLevel {
    const config = TOOL_RISK_CONFIG[toolName];

    if (!config) {
      return 'medium'; // Default to medium risk for unknown tools
    }

    // Escalate risk for dangerous operations
    if (toolName === 'ha_call' && parameters && config.dangerousOperations) {
      const domain = String(parameters['domain'] || '');
      const service = String(parameters['service'] || '');
      const operation = `${domain}.${service}`;

      if (config.dangerousOperations.includes(operation)) {
        return 'critical'; // Escalate to critical for dangerous operations
      }
    }

    return config.level;
  }

  /**
   * Get risk explanation
   */
  getRiskReason(toolName: string, parameters?: Record<string, unknown>): string {
    const level = this.getRiskLevel(toolName, parameters);

    if (toolName === 'ha_call' && parameters) {
      const domain = String(parameters['domain'] || '');
      const service = String(parameters['service'] || '');
      const entityId = parameters['entity_id'];

      if (domain === 'lock' && service === 'unlock') {
        return `⚠️ CRITICAL: Unlocking door "${entityId}" poses a security risk`;
      }

      if (domain === 'alarm_control_panel' && service === 'disarm') {
        return '⚠️ CRITICAL: Disarming security system poses a security risk';
      }

      if (domain === 'garage_door' && service === 'open') {
        return `⚠️ CRITICAL: Opening garage "${entityId}" poses a security risk`;
      }

      if (domain === 'climate' && service === 'turn_off') {
        return '⚠️ WARNING: Turning off climate control may be unsafe in extreme weather';
      }

      if (domain === 'cover' && service === 'open') {
        return `⚠️ WARNING: Opening coverings "${entityId}" may expose your home`;
      }
    }

    if (toolName === 'code_interpreter') {
      return '⚠️ HIGH RISK: Executing arbitrary code requires approval';
    }

    if (toolName === 'computer_use') {
      return '⚠️ CRITICAL: Desktop automation has full system access';
    }

    // Default messages by risk level
    switch (level) {
      case 'critical':
        return '⚠️ CRITICAL RISK: This action could compromise security or cause irreversible damage';
      case 'high':
        return '⚠️ HIGH RISK: This action could have significant consequences';
      case 'medium':
        return '⚠️ MODERATE RISK: This action requires user confirmation';
      case 'low':
      default:
        return 'This is a safe operation';
    }
  }

  /**
   * Create approval request
   */
  createApprovalRequest(
    toolName: string,
    toolDescription: string,
    parameters: Record<string, unknown>,
    userId: string,
    threadId?: string
  ): ToolApprovalRequest {
    const id = `approval_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.approvalTimeout);

    const request: ToolApprovalRequest = {
      id,
      tool_name: toolName,
      tool_description: toolDescription,
      parameters,
      risk_level: this.getRiskLevel(toolName, parameters),
      risk_reason: this.getRiskReason(toolName, parameters),
      requested_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      user_id: userId,
      thread_id: threadId,
    };

    this.pendingApprovals.set(id, request);

    // Auto-expire after timeout
    setTimeout(() => {
      const existingRequest = this.pendingApprovals.get(id);
      if (existingRequest && existingRequest.status === 'pending') {
        existingRequest.status = 'expired';
        this.pendingApprovals.delete(id);
      }
    }, this.approvalTimeout);

    return request;
  }

  /**
   * Respond to approval request
   */
  respondToApproval(
    requestId: string,
    status: 'approved' | 'denied',
    userId: string,
    reason?: string
  ): ToolApprovalResponse | null {
    const request = this.pendingApprovals.get(requestId);

    if (!request) {
      return null; // Request not found or expired
    }

    if (request.status !== 'pending') {
      return null; // Already responded or expired
    }

    if (request.user_id !== userId) {
      throw new Error('User ID mismatch - cannot approve request from different user');
    }

    // Update request status
    request.status = status;
    this.pendingApprovals.delete(requestId);

    const response: ToolApprovalResponse = {
      id: requestId,
      status,
      user_id: userId,
      responded_at: new Date().toISOString(),
      reason,
    };

    return response;
  }

  /**
   * Get pending approval request
   */
  getPendingApproval(requestId: string): ToolApprovalRequest | null {
    return this.pendingApprovals.get(requestId) || null;
  }

  /**
   * Get all pending approvals for a user
   */
  getPendingApprovalsForUser(userId: string): ToolApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(
      req => req.user_id === userId && req.status === 'pending'
    );
  }

  /**
   * Clear expired approvals
   */
  clearExpired(): void {
    const now = Date.now();

    for (const [id, request] of this.pendingApprovals.entries()) {
      const expiresAt = new Date(request.expires_at).getTime();

      if (now > expiresAt) {
        request.status = 'expired';
        this.pendingApprovals.delete(id);
      }
    }
  }
}

/**
 * Global approval manager instance
 */
export const globalApprovalManager = new ToolApprovalManager(60000); // 60 second timeout

/**
 * Tool execution wrapper with approval
 *
 * Wraps tool execution to require approval for dangerous operations
 */
export async function executeToolWithApproval<T>(
  toolName: string,
  toolDescription: string,
  parameters: Record<string, unknown>,
  toolFunction: () => Promise<T>,
  userId: string,
  threadId?: string,
  approvalCallback?: (request: ToolApprovalRequest) => Promise<'approved' | 'denied'>
): Promise<T> {
  // Check if approval is required
  if (!globalApprovalManager.requiresApproval(toolName, parameters)) {
    // Execute directly without approval
    return await toolFunction();
  }

  // Create approval request
  const request = globalApprovalManager.createApprovalRequest(
    toolName,
    toolDescription,
    parameters,
    userId,
    threadId
  );

  // If callback provided, use it to get approval
  if (approvalCallback) {
    const decision = await approvalCallback(request);

    if (decision === 'approved') {
      globalApprovalManager.respondToApproval(request.id, 'approved', userId);
      return await toolFunction();
    } else {
      globalApprovalManager.respondToApproval(request.id, 'denied', userId);
      throw new Error(`Tool execution denied by user: ${toolName}`);
    }
  }

  // No callback - throw error indicating approval needed
  throw new Error(
    `Tool "${toolName}" requires approval before execution. Request ID: ${request.id}`
  );
}

/**
 * Example usage:
 *
 * ```typescript
 * // In agent route:
 * import { executeToolWithApproval, globalApprovalManager } from '@/lib/agent/toolApproval';
 *
 * // Wrap dangerous tool calls:
 * const result = await executeToolWithApproval(
 *   'ha_call',
 *   'Unlock front door',
 *   { domain: 'lock', service: 'unlock', entity_id: 'lock.front_door' },
 *   async () => haCall.execute({ ... }),
 *   userId,
 *   threadId,
 *   async (request) => {
 *     // Send approval request to frontend via SSE
 *     emitter.emit({
 *       type: 'approval_required',
 *       data: request
 *     });
 *
 *     // Wait for user response
 *     return await waitForApprovalResponse(request.id);
 *   }
 * );
 * ```
 */
