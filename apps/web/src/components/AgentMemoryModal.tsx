'use client';

import React, { useState } from 'react';
import { Button, Modal } from '@frok/ui';
import { useAgentMemories, useAddAgentMemory, useDeleteAgentMemory } from '@/hooks/queries/useMemories';
import { useTranslations } from '@/lib/i18n/I18nProvider';

type AgentMemoryModalProps = {
  agentName: string;
  onClose: () => void;
};

const MEMORY_TYPES = [
  { id: 'core', name: 'Core Knowledge', description: 'Fundamental facts about the agent' },
  { id: 'user_preference', name: 'User Preferences', description: 'User-specific settings' },
  { id: 'fact', name: 'Facts', description: 'Important facts to remember' },
  { id: 'skill', name: 'Skills', description: 'Capabilities and expertise' },
];

export function AgentMemoryModal({ agentName, onClose }: AgentMemoryModalProps) {
  const t = useTranslations('memory');
  const tCommon = useTranslations('common');
  const [newMemory, setNewMemory] = useState({ type: 'core', content: '', importance: 5 });

  // Use TanStack Query hooks
  const { data: memories = [], isLoading: loading, error } = useAgentMemories(agentName);
  const addMemoryMutation = useAddAgentMemory();
  const deleteMemoryMutation = useDeleteAgentMemory();

  const addMemory = async () => {
    if (!newMemory.content.trim()) return;

    try {
      await addMemoryMutation.mutateAsync({
        agentName: agentName,
        memoryType: newMemory.type,
        content: newMemory.content.trim(),
        importance: newMemory.importance,
      });
      setNewMemory({ type: 'core', content: '', importance: 5 });
    } catch (e) {
      console.error('Failed to add memory:', e);
      alert('Failed to add memory');
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      await deleteMemoryMutation.mutateAsync(memoryId);
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert('Failed to delete memory');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`🧠 ${t('agentMemory.title')}`}
      description={t('agentMemory.description')}
      size="lg"
      footer={
        <Button onClick={onClose} variant="outline">
          {tCommon('close')}
        </Button>
      }
    >

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
            <div className="font-medium mb-1">⚠️ {t('agentMemory.loadError')}</div>
            <div className="text-xs text-danger/80">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
            {error instanceof Error && error.message.includes('auth') && (
              <div className="mt-2 text-xs text-danger/60">
                💡 Hint: Try signing out and signing back in
              </div>
            )}
          </div>
        )}

        {/* Add New Memory */}
        <div className="bg-surface rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium mb-3">{t('agentMemory.addNew')}</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-foreground/70 mb-1">{t('agentMemory.type')}</label>
                <select
                  value={newMemory.type}
                  onChange={(e) => setNewMemory({ ...newMemory, type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-sm"
                >
                  {MEMORY_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-foreground/70 mb-1">
                  {t('agentMemory.importance')}: {newMemory.importance}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newMemory.importance}
                  onChange={(e) => setNewMemory({ ...newMemory, importance: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-foreground/70 mb-1">{t('agentMemory.content')}</label>
              <textarea
                value={newMemory.content}
                onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                placeholder={t('agentMemory.contentPlaceholder')}
                className="w-full px-3 py-2 bg-surface border border-border rounded text-sm resize-none"
                rows={2}
              />
            </div>
            <Button
              onClick={addMemory}
              disabled={!newMemory.content.trim()}
              variant="primary"
              size="sm"
            >
              {t('agentMemory.addButton')}
            </Button>
          </div>
        </div>

        {/* Existing Memories */}
        <div>
          <h3 className="text-sm font-medium mb-3">{t('agentMemory.storedTitle', { count: memories.length })}</h3>
          {loading ? (
            <div className="text-center text-foreground/60 py-8">{tCommon('loading')}</div>
          ) : memories.length === 0 ? (
            <div className="text-center text-foreground/60 py-8">
              {t('agentMemory.empty')}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-surface rounded-lg p-3 flex items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-info/20 text-info rounded">
                        {MEMORY_TYPES.find((t) => t.id === memory.memory_type)?.name}
                      </span>
                      <span className="text-xs text-foreground/60">
                        {t('agentMemory.importanceLabel')}: {memory.importance}/10
                      </span>
                    </div>
                    <p className="text-sm">{memory.content}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      Added {new Date(memory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => deleteMemory(memory.id)}
                    variant="ghost"
                    size="sm"
                    className="text-foreground/70 hover:text-danger"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
    </Modal>
  );
}
