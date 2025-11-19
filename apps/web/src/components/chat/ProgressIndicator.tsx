'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ProgressEvent {
  status: string;
  message: string;
  progress_percent?: number;
  timestamp?: string;
}

export interface ToolEvent {
  id: string;
  tool_name: string;
  tool_description?: string;
  success?: boolean;
  duration_ms?: number;
  timestamp: string;
}

export interface HandoffEvent {
  from_agent: string;
  to_agent: string;
  reason?: string;
  timestamp: string;
}

export interface MetadataEvent {
  complexity?: string;
  model?: string;
  routing?: string;
  tools?: string[];
  toolSource?: string;
  historyLength?: number;
  models?: Record<string, string>;
}

export interface ProgressIndicatorProps {
  percent: number;
  status: string;
  message: string;
  metadata?: MetadataEvent;
  toolEvents?: ToolEvent[];
  handoffs?: HandoffEvent[];
  isComplete?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

// ============================================================================
// ProgressIndicator Component
// ============================================================================

/**
 * ProgressIndicator - Real-time progress visualization for agent execution
 *
 * Features:
 * - Animated progress bar (0-100%)
 * - Status message updates
 * - Tool execution timeline
 * - Agent handoff notifications
 * - Metadata display (model, complexity, tools)
 * - Error state handling
 * - Framer Motion animations
 *
 * Design: 100% semantic tokens (bg-surface, text-foreground, border-border, etc.)
 */
export function ProgressIndicator({
  percent,
  status,
  message,
  metadata,
  toolEvents = [],
  handoffs = [],
  isComplete = false,
  hasError = false,
  errorMessage,
}: ProgressIndicatorProps) {
  // Determine status color based on state
  const getStatusColor = () => {
    if (hasError) return 'bg-danger';
    if (isComplete) return 'bg-success';
    return 'bg-primary';
  };

  const statusColor = getStatusColor();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-border bg-surface/50 p-4 backdrop-blur-sm"
    >
      {/* Progress Bar */}
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface">
        <motion.div
          className={`h-full ${statusColor} transition-colors duration-300`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Status Message */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasError ? (
            <AlertCircle className="h-4 w-4 text-danger" />
          ) : isComplete ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className="text-sm font-medium text-foreground">
            {hasError ? 'Error' : isComplete ? 'Complete' : status}
          </span>
        </div>
        <span className="text-xs text-foreground/50">{percent}%</span>
      </div>

      <p className="mb-3 text-sm text-foreground/70">
        {hasError ? errorMessage : message}
      </p>

      {/* Metadata Display */}
      {metadata && !hasError && (
        <div className="mb-3 flex flex-wrap gap-2">
          {metadata.model && (
            <MetadataBadge icon="🤖" label={metadata.model} />
          )}
          {metadata.complexity && (
            <MetadataBadge
              icon={
                metadata.complexity === 'simple'
                  ? '⚡'
                  : metadata.complexity === 'complex'
                  ? '🧠'
                  : '🎯'
              }
              label={metadata.complexity}
            />
          )}
          {metadata.routing && (
            <MetadataBadge
              icon={metadata.routing === 'orchestrator' ? '🎭' : '🚀'}
              label={metadata.routing}
            />
          )}
          {metadata.tools && metadata.tools.length > 0 && (
            <MetadataBadge
              icon="🛠️"
              label={`${metadata.tools.length} tools`}
              title={metadata.tools.join(', ')}
            />
          )}
        </div>
      )}

      {/* Agent Handoffs */}
      <AnimatePresence mode="popLayout">
        {handoffs.map((handoff) => (
          <motion.div
            key={handoff.timestamp}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mb-2 flex items-center gap-2 rounded-md bg-info/10 p-2 text-xs"
          >
            <span className="font-medium text-info">{handoff.from_agent}</span>
            <ArrowRight className="h-3 w-3 text-info/60" />
            <span className="font-medium text-info">{handoff.to_agent}</span>
            {handoff.reason && (
              <span className="ml-auto text-foreground/50">{handoff.reason}</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Tool Execution Timeline */}
      {toolEvents.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          <div className="mb-2 text-xs font-medium text-foreground/60">
            Tool Execution
          </div>
          <AnimatePresence mode="popLayout">
            {toolEvents.map((event) => (
              <ToolEventItem key={event.id} event={event} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MetadataBadge Component
// ============================================================================

interface MetadataBadgeProps {
  icon: string;
  label: string;
  title?: string;
}

function MetadataBadge({ icon, label, title }: MetadataBadgeProps) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-md bg-info/20 px-2 py-1 text-xs text-info"
      title={title}
    >
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

// ============================================================================
// ToolEventItem Component
// ============================================================================

interface ToolEventItemProps {
  event: ToolEvent;
}

function ToolEventItem({ event }: ToolEventItemProps) {
  const isSuccess = event.success === true;
  const isPending = event.success === undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-2 text-xs"
    >
      {/* Status Icon */}
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin text-info" />
      ) : isSuccess ? (
        <CheckCircle className="h-3 w-3 text-success" />
      ) : (
        <AlertCircle className="h-3 w-3 text-danger" />
      )}

      {/* Tool Name */}
      <span
        className={`font-medium ${
          isPending
            ? 'text-info'
            : isSuccess
            ? 'text-success'
            : 'text-danger'
        }`}
      >
        {event.tool_name}
      </span>

      {/* Duration */}
      {event.duration_ms !== undefined && (
        <span className="text-foreground/50">({event.duration_ms}ms)</span>
      )}

      {/* Description */}
      {event.tool_description && (
        <span className="ml-auto truncate text-foreground/40">
          {event.tool_description}
        </span>
      )}
    </motion.div>
  );
}
