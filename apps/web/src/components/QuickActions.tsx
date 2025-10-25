'use client';

import React from 'react';

type QuickAction = {
  icon: string;
  label: string;
  prompt: string;
  condition?: 'hasMessages' | 'always';
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: '📝',
    label: 'Summarize',
    prompt: 'Summarize our conversation so far',
    condition: 'hasMessages',
  },
  {
    icon: '🧠',
    label: 'My Memories',
    prompt: 'What do you remember about me?',
    condition: 'always',
  },
  {
    icon: '💡',
    label: 'HA Status',
    prompt: 'Check the status of all my smart home devices',
    condition: 'always',
  },
  {
    icon: '🌐',
    label: 'News',
    prompt: 'Search for today\'s top technology news',
    condition: 'always',
  },
];

type QuickActionsProps = {
  onAction: (prompt: string) => void;
  hasMessages: boolean;
  disabled?: boolean;
};

export function QuickActions({ onAction, hasMessages, disabled }: QuickActionsProps) {
  const visibleActions = QUICK_ACTIONS.filter(
    (action) => action.condition === 'always' || (action.condition === 'hasMessages' && hasMessages)
  );

  if (visibleActions.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
      {visibleActions.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action.prompt)}
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-850 disabled:text-gray-600 rounded-lg text-sm whitespace-nowrap transition"
          title={action.prompt}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
