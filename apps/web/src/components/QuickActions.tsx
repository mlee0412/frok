'use client';

import React from 'react';
import { Button } from '@frok/ui';
import { useTranslations } from '@/lib/i18n/I18nProvider';

type QuickAction = {
  icon: string;
  labelKey: string;
  promptKey: string;
  condition?: 'hasMessages' | 'always';
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: '📝',
    labelKey: 'summarize',
    promptKey: 'summarizePrompt',
    condition: 'hasMessages',
  },
  {
    icon: '🧠',
    labelKey: 'myMemories',
    promptKey: 'myMemoriesPrompt',
    condition: 'always',
  },
  {
    icon: '💡',
    labelKey: 'haStatus',
    promptKey: 'haStatusPrompt',
    condition: 'always',
  },
  {
    icon: '🌐',
    labelKey: 'news',
    promptKey: 'newsPrompt',
    condition: 'always',
  },
];

type QuickActionsProps = {
  onAction: (prompt: string) => void;
  hasMessages: boolean;
  disabled?: boolean;
};

export function QuickActions({ onAction, hasMessages, disabled }: QuickActionsProps) {
  const t = useTranslations('agent.quickActions');

  const visibleActions = QUICK_ACTIONS.filter(
    (action) => action.condition === 'always' || (action.condition === 'hasMessages' && hasMessages)
  );

  if (visibleActions.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
      {visibleActions.map((action, i) => (
        <Button
          key={i}
          onClick={() => onAction(t(action.promptKey))}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="whitespace-nowrap"
          title={t(action.promptKey)}
        >
          <span>{action.icon}</span>
          <span>{t(action.labelKey)}</span>
        </Button>
      ))}
    </div>
  );
}
