'use client';

import React, { useState, useEffect } from 'react';

type UserMemory = {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
};

type UserMemoriesModalProps = {
  onClose: () => void;
};

export function UserMemoriesModal({ onClose }: UserMemoriesModalProps) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, [selectedTag]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const url = selectedTag 
        ? `/api/memory/list?tag=${encodeURIComponent(selectedTag)}&limit=100`
        : `/api/memory/list?limit=100`;
      
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.ok) {
        setMemories(json.memories);
      }
    } catch (e) {
      console.error('Failed to load memories:', e);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/memory/list?id=${memoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.ok) {
        setMemories(memories.filter((m) => m.id !== memoryId));
      }
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-2">Filter by Tag:</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-3 py-1 rounded-full text-xs transition ${
                  selectedTag === null
                    ? 'bg-sky-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                All ({memories.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs transition ${
                    selectedTag === tag
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

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
                  
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="text-gray-400 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition px-2 py-1 hover:bg-red-500/10 rounded"
                    title="Delete memory"
                  >
                    🗑️
                  </button>
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
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
