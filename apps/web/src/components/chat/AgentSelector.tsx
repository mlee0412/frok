'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from '@/lib/i18n/I18nProvider';

// ============================================================================
// AgentSelector Component
// ============================================================================

/**
 * AgentSelector - AI model selection with routing presets
 *
 * Features:
 * - GPT-5 model variants (think, mini, nano)
 * - Complexity-based routing recommendations
 * - Visual model cards with capabilities
 * - Token cost estimates
 * - Response time estimates
 * - Preset selectors (coding, research, chat, creative)
 */

export type AgentModel = 'gpt-5.1' | 'gpt-5.1-codex-mini' | 'gpt-5.1-chat-latest' | 'auto';

export interface AgentCapabilities {
  reasoning: number; // 0-100
  speed: number; // 0-100
  cost: number; // 0-100 (lower is cheaper)
  contextWindow: number; // tokens
}

export interface ModelConfig {
  id: AgentModel;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
  useCases: string[];
  costPerMillion: number; // USD
  avgResponseTime: number; // seconds
}

const MODELS: Record<AgentModel, ModelConfig | null> = {
  'gpt-5.1': {
    id: 'gpt-5.1',
    name: 'GPT-5.1 Thinking',
    description: 'Advanced reasoning with adaptive thinking (Nov 2025)',
    capabilities: {
      reasoning: 100,
      speed: 60, // Faster on simple tasks with adaptive reasoning
      cost: 90,
      contextWindow: 128_000,
    },
    useCases: ['Complex reasoning', 'System design', 'Research analysis', 'Strategic planning'],
    costPerMillion: 50,
    avgResponseTime: 8, // Improved from 12s with adaptive reasoning
  },
  'gpt-5.1-codex-mini': {
    id: 'gpt-5.1-codex-mini',
    name: 'GPT-5.1 Codex Mini',
    description: 'Balanced model optimized for coding and agentic tasks',
    capabilities: {
      reasoning: 85,
      speed: 80, // Improved with GPT-5.1 efficiency updates
      cost: 50,
      contextWindow: 64_000,
    },
    useCases: ['Code review', 'Debugging', 'API design', 'General chat'],
    costPerMillion: 10,
    avgResponseTime: 4, // Improved from 5s
  },
  'gpt-5.1-chat-latest': {
    id: 'gpt-5.1-chat-latest',
    name: 'GPT-5.1 Instant',
    description: 'Fastest model with warmer, more conversational tone',
    capabilities: {
      reasoning: 70, // Enhanced instruction following
      speed: 100,
      cost: 20,
      contextWindow: 16_000,
    },
    useCases: ['Quick answers', 'Casual chat', 'Brainstorming', 'Simple tasks'],
    costPerMillion: 2,
    avgResponseTime: 1.5, // Improved from 2s
  },
  auto: null, // Auto-routing doesn't have specific config
};

export interface AgentSelectorProps {
  selectedModel: AgentModel;
  onModelChange: (model: AgentModel) => void;
  showDetails?: boolean;
  compact?: boolean;
}

export function AgentSelector({
  selectedModel,
  onModelChange,
  showDetails = false,
  compact = false,
}: AgentSelectorProps) {
  const t = useTranslations('chat.agent');
  const [expanded, setExpanded] = useState(!compact);

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition hover:border-primary"
      >
        <span className="text-base">🤖</span>
        <span className="font-medium">
          {selectedModel === 'auto'
            ? t('auto')
            : MODELS[selectedModel]?.name || 'GPT-5.1 Codex Mini'}
        </span>
        <svg
          className="h-4 w-4 text-foreground/60"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <motion.div layout className="rounded-lg border border-border bg-surface p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-sm font-semibold text-foreground">{t('selectModel')}</h3>
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-foreground/60 hover:text-foreground"
          >
            {t('collapse')}
          </button>
        )}
      </div>

      {/* Model Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Auto Mode */}
        <ModelCard
          model={{
            id: 'auto',
            name: t('auto'),
            description: t('autoDescription'),
            capabilities: {
              reasoning: 75,
              speed: 75,
              cost: 50,
              contextWindow: 64_000,
            },
            useCases: [t('autoUseCase1'), t('autoUseCase2')],
            costPerMillion: 0,
            avgResponseTime: 0,
          }}
          isSelected={selectedModel === 'auto'}
          onClick={() => onModelChange('auto')}
          showDetails={showDetails}
        />

        {/* GPT-5.1 Models */}
        {(['gpt-5.1', 'gpt-5.1-codex-mini', 'gpt-5.1-chat-latest'] as AgentModel[]).map(
          (modelId) => {
            const config = MODELS[modelId];
            if (!config) return null;

            return (
              <ModelCard
                key={modelId}
                model={config}
                isSelected={selectedModel === modelId}
                onClick={() => onModelChange(modelId)}
                showDetails={showDetails}
              />
            );
          },
        )}
      </div>

      {/* Preset Selectors */}
      {showDetails && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 text-xs font-medium text-foreground/70">{t('presets')}</div>
          <div className="flex flex-wrap gap-2">
            <PresetButton
              label={t('presetCoding')}
              icon="💻"
              onClick={() => onModelChange('gpt-5.1')}
            />
            <PresetButton
              label={t('presetResearch')}
              icon="🔍"
              onClick={() => onModelChange('gpt-5.1-codex-mini')}
            />
            <PresetButton
              label={t('presetChat')}
              icon="💬"
              onClick={() => onModelChange('gpt-5.1-chat-latest')}
            />
            <PresetButton
              label={t('presetCreative')}
              icon="🎨"
              onClick={() => onModelChange('auto')}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// ModelCard Component
// ============================================================================

interface ModelCardProps {
  model: ModelConfig;
  isSelected: boolean;
  onClick: () => void;
  showDetails: boolean;
}

function ModelCard({ model, isSelected, onClick, showDetails }: ModelCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-surface hover:border-primary/50'
      }`}
    >
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
          ✓
        </div>
      )}

      {/* Model Name */}
      <div className="text-sm font-semibold text-foreground">{model.name}</div>

      {/* Description */}
      <div className="text-xs text-foreground/70">{model.description}</div>

      {/* Capabilities (if details enabled) */}
      {showDetails && (
        <div className="mt-2 space-y-1">
          <CapabilityBar label="Reasoning" value={model.capabilities.reasoning} color="primary" />
          <CapabilityBar label="Speed" value={model.capabilities.speed} color="success" />
          <CapabilityBar label="Cost" value={100 - model.capabilities.cost} color="info" inverted />
        </div>
      )}

      {/* Stats (if details enabled) */}
      {showDetails && model.costPerMillion > 0 && (
        <div className="mt-2 flex items-center gap-3 text-xs text-foreground/60">
          <span>${model.costPerMillion}/1M</span>
          <span>•</span>
          <span>~{model.avgResponseTime}s</span>
        </div>
      )}
    </button>
  );
}

// ============================================================================
// CapabilityBar Component
// ============================================================================

interface CapabilityBarProps {
  label: string;
  value: number; // 0-100
  color: 'primary' | 'success' | 'info' | 'warning';
  inverted?: boolean;
}

function CapabilityBar({ label, value, color, inverted = false }: CapabilityBarProps) {
  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-success',
    info: 'bg-info',
    warning: 'bg-warning',
  };

  const displayValue = inverted ? 100 - value : value;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-foreground/70">
        <span>{label}</span>
        <span>{displayValue}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full transition-all ${colorClasses[color]}`}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// PresetButton Component
// ============================================================================

interface PresetButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
}

function PresetButton({ label, icon, onClick }: PresetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground transition hover:border-primary hover:bg-primary/10"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
