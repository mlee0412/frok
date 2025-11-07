'use client';

import React from 'react';
import { Button } from '@frok/ui';
import { useTranslations } from '@/lib/i18n/I18nProvider';

type SuggestedPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

type Suggestion = {
  icon: string;
  text: string;
  category: string;
};

// Fallback prompts if API fails
const FALLBACK_PROMPTS: Suggestion[] = [
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

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

type CachedSuggestions = {
  suggestions: Suggestion[];
  timestamp: number;
};

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  const t = useTranslations('agent.suggestions');
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>(FALLBACK_PROMPTS);
  const [loading, setLoading] = React.useState(false);
  const cacheRef = React.useRef<CachedSuggestions | null>(null);

  React.useEffect(() => {
    const fetchSuggestions = async () => {
      // Check cache first
      if (cacheRef.current) {
        const age = Date.now() - cacheRef.current.timestamp;
        if (age < CACHE_DURATION_MS) {
          // Cache is still valid
          setSuggestions(cacheRef.current.suggestions);
          return;
        }
      }

      try {
        setLoading(true);
        const res = await fetch('/api/agent/suggestions');
        const data = await res.json();

        if (data.ok && data.suggestions) {
          // Update cache
          cacheRef.current = {
            suggestions: data.suggestions,
            timestamp: Date.now(),
          };
          setSuggestions(data.suggestions);
        } else {
          // Fallback to static prompts
          setSuggestions(FALLBACK_PROMPTS);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        // Fallback to static prompts
        setSuggestions(FALLBACK_PROMPTS);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []); // Only fetch once on mount

  return (
    <div className="space-y-4">
      <div className="text-center text-foreground/60">
        <h3 className="text-lg font-medium mb-2">
          👋 {t('title')}
          {loading && (
            <span className="ml-2 text-xs text-primary/400">({t('refreshing')})</span>
          )}
        </h3>
        <p className="text-sm">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
        {suggestions.map((prompt, i) => (
          <Button
            key={i}
            onClick={() => onSelect(prompt.text)}
            disabled={disabled || loading}
            variant="ghost"
            className="group flex items-start gap-3 p-4 bg-surface hover:bg-surface/80 rounded-xl h-auto text-left"
          >
            <span className="text-2xl">{prompt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white group-hover:text-primary/400 transition">
                {prompt.text}
              </p>
              <p className="text-xs text-foreground/60 mt-1">{prompt.category}</p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
