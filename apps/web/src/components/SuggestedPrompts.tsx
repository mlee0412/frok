'use client';

import React from 'react';

type SuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

const STARTER_PROMPTS = [
  {
    icon: '💡',
    text: 'Check the status of my smart home devices',
    category: 'Home Assistant',
  },
  {
    icon: '🌐',
    text: 'Search the web for latest AI news',
    category: 'Web Search',
  },
  {
    icon: '🧠',
    text: 'What do you remember about my preferences?',
    category: 'Memory',
  },
  {
    icon: '📊',
    text: 'Analyze this image and explain what you see',
    category: 'Vision',
  },
  {
    icon: '🏠',
    text: 'Turn on the kitchen lights and set brightness to 80%',
    category: 'Home Control',
  },
  {
    icon: '🔍',
    text: 'Help me understand quantum computing',
    category: 'Learning',
  },
];

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div className="space-y-4">
      <div className="text-center text-gray-400">
        <h3 className="text-lg font-medium mb-2">👋 How can I help you today?</h3>
        <p className="text-sm">Try one of these suggestions or type your own message</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
        {STARTER_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelect(prompt.text)}
            disabled={disabled}
            className="group flex items-start gap-3 p-4 bg-gray-800 hover:bg-gray-750 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <span className="text-2xl">{prompt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white group-hover:text-sky-400 transition">
                {prompt.text}
              </p>
              <p className="text-xs text-gray-500 mt-1">{prompt.category}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
