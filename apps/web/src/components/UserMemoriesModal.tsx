'use client';

import React, { useState } from 'react';
import { Button } from '@frok/ui';
import { useUserMemories, useDeleteUserMemory, useAddUserMemory } from '@/hooks/queries/useMemories';

type UserMemoriesModalProps = {
  onClose: () => void;
};

export function UserMemoriesModal({ onClose }: UserMemoriesModalProps) {
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
      alert('Failed to add memory');
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Delete this memory? This cannot be undone.')) return;

    try {
      await deleteMemoryMutation.mutateAsync(memoryId);
    } catch (e) {
      console.error('Failed to delete memory:', e);
      alert('Failed to delete memory');
    }
  };

  // Extract all unique tags
  const allTags = Array.from(
    new Set(memories.flatMap((m) => m.tags))
  ).sort();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">📚 User Memories</h2>
            <p className="text-sm text-gray-400 mt-1">
              Memories stored by the agent during conversations. These are used to personalize your experience.
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-2xl leading-none"
          >
            ×
          </Button>
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Filter by Tag:</label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setSelectedTag(null)}
                variant={selectedTag === null ? 'primary' : 'outline'}
                size="sm"
                className="rounded-full"
              >
                All ({memories.length})
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
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            ⚠️ Failed to load memories. Please try refreshing.
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
              + Add New Memory
            </Button>
          ) : (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Add New Memory</h3>
                <Button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewMemory({ content: '', tags: '' });
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400"
                >
                  Cancel
                </Button>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Content *</label>
                <textarea
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  placeholder="What should the agent remember about you?"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newMemory.tags}
                  onChange={(e) => setNewMemory({ ...newMemory, tags: e.target.value })}
                  placeholder="e.g., preference, work, personal"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm"
                />
              </div>

              <Button
                onClick={addMemory}
                variant="primary"
                size="sm"
                disabled={!newMemory.content.trim() || addMemoryMutation.isPending}
              >
                {addMemoryMutation.isPending ? 'Adding...' : 'Add Memory'}
              </Button>
            </div>
          )}
        </div>

        {/* Memories List */}
        <div>
          <h3 className="text-sm font-medium mb-3">
            {selectedTag ? `Memories tagged "${selectedTag}"` : 'All Memories'} ({memories.length})
          </h3>

          {loading ? (
            <div className="text-center text-gray-500 py-12">
              <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-sky-500 rounded-full animate-spin mb-2"></div>
              <p>Loading memories...</p>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-4xl mb-2">📭</p>
              <p>No memories found.</p>
              <p className="text-xs mt-1">
                {selectedTag 
                  ? 'Try selecting a different tag or "All"'
                  : 'The agent will create memories as you interact'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-start gap-3 hover:bg-gray-750 transition group"
                >
                  <div className="flex-1">
                    <p className="text-sm mb-2">{memory.content}</p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {memory.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded cursor-pointer hover:bg-sky-500/30 transition"
                              onClick={() => setSelectedTag(tag)}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <span className="text-xs text-gray-500">
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
                    className="text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10"
                    title="Delete memory"
                  >
                    🗑️
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 pt-4 border-t border-gray-800">
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <span>💡</span>
            <div>
              <p className="font-medium mb-1">About User Memories:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Created automatically by the agent when you share preferences or important facts</li>
                <li>Used to personalize responses across all conversations</li>
                <li>Can be deleted if no longer relevant</li>
                <li>Stored securely and only accessible by you</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
