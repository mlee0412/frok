'use client';

import React, { useState } from 'react';
import { Button, Modal } from '@frok/ui';
import { useUserMemories, useDeleteUserMemory, useAddUserMemory } from '@/hooks/queries/useMemories';
import { useTranslations } from '@/lib/i18n/I18nProvider';

type UserMemoriesModalProps = {
  onClose: () => void;
};

export function UserMemoriesModal({ onClose }: UserMemoriesModalProps) {
  const t = useTranslations('memory.userMemories');
  const tCommon = useTranslations('common');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newMemory, setNewMemory] = useState({ content: '', tags: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  // Use TanStack Query hooks
  const { data: memories = [], isLoading: loading, error } = useUserMemories(selectedTag || undefined);
  const deleteMemoryMutation = useDeleteUserMemory();
  const addMemoryMutation = useAddUserMemory();

  const addMemory = async () => {
    if (!newMemory.content.trim()) return;

    try {
      const tags = newMemory.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await addMemoryMutation.mutateAsync({
        content: newMemory.content.trim(),
        tags,
      });

      setNewMemory({ content: '', tags: '' });
      setShowAddForm(false);
    } catch (e) {
      console.error('Failed to add memory:', e);
      alert(t('addError'));
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      await deleteMemoryMutation.mutateAsync(memoryId);
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert(t('deleteError'));
    }
  };

  // Extract all unique tags
  const allTags = Array.from(
    new Set(memories.flatMap((m) => m.tags))
  ).sort();

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`📚 ${t('title')}`}
      description={t('description')}
      size="xl"
      footer={
        <Button onClick={onClose} variant="outline">
          {tCommon('close')}
        </Button>
      }
    >

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs text-foreground/70 mb-2">{t('filterByTag')}:</label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setSelectedTag(null)}
                variant={selectedTag === null ? 'primary' : 'outline'}
                size="sm"
                className="rounded-full"
              >
                {t('all')} ({memories.length})
              </Button>
              {allTags.map((tag) => (
                <Button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  variant={selectedTag === tag ? 'primary' : 'outline'}
                  size="sm"
                  className="rounded-full"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
            ⚠️ {t('loadError')}
          </div>
        )}

        {/* Add Memory Button/Form */}
        <div className="mb-4">
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              variant="primary"
              size="sm"
            >
              + {t('addNew')}
            </Button>
          ) : (
            <div className="bg-surface rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">{t('addNew')}</h3>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMemory({ content: '', tags: '' });
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-foreground/70"
                >
                  {tCommon('cancel')}
                </Button>
              </div>

              <div>
                <label className="block text-xs text-foreground/70 mb-1">{t('contentLabel')} *</label>
                <textarea
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  placeholder={t('contentPlaceholder')}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-sm resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs text-foreground/70 mb-1">{t('tagsLabel')}</label>
                <input
                  type="text"
                  value={newMemory.tags}
                  onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                  placeholder={t('tagsPlaceholder')}
                  className="w-full px-3 py-2 bg-surface border border-border rounded text-sm"
                />
              </div>

              <Button
                onClick={addMemory}
                variant="primary"
                size="sm"
                disabled={!newMemory.content.trim() || addMemoryMutation.isPending}
              >
                {addMemoryMutation.isPending ? t('adding') : t('addButton')}
              </Button>
            </div>
          )}
        </div>

        {/* Memories List */}
        <div>
          <h3 className="text-sm font-medium mb-3">
            {selectedTag ? t('memoriesTagged', { tag: selectedTag }) : t('allMemories')} ({memories.length})
          </h3>

          {loading ? (
            <div className="text-center text-foreground/60 py-12">
              <div className="inline-block w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin mb-2"></div>
              <p>{tCommon('loading')}</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center text-foreground/60 py-12">
              <p className="text-4xl mb-2">📭</p>
              <p>{t('noMemories')}</p>
              <p className="text-xs mt-1">
                {selectedTag
                  ? t('tryDifferentTag')
                  : t('agentWillCreate')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-surface rounded-lg p-4 flex items-start gap-3 hover:bg-surface/80 transition group"
                >
                  <div className="flex-1">
                    <p className="text-sm mb-2">{memory.content}</p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {memory.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-info/20 text-info rounded cursor-pointer hover:bg-info/30 transition"
                              onClick={() => setSelectedTag(tag)}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <span className="text-xs text-foreground/60">
                        {new Date(memory.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => deleteMemory(memory.id)}
                    variant="ghost"
                    size="sm"
                    className="text-foreground/70 hover:text-danger opacity-0 group-hover:opacity-100 hover:bg-danger/10"
                    title={tCommon('delete')}
                  >
                    🗑️
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-start gap-2 text-xs text-foreground/70">
            <span>💡</span>
            <div>
              <p className="font-medium mb-1">{t('aboutTitle')}:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>{t('aboutPoint1')}</li>
                <li>{t('aboutPoint2')}</li>
                <li>{t('aboutPoint3')}</li>
                <li>{t('aboutPoint4')}</li>
              </ul>
            </div>
          </div>
        </div>
    </Modal>
  );
}
