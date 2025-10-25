'use client';

import React, { useState, useEffect } from 'react';

type AgentMemory = {
  id: string;
  memory_type: string;
  content: string;
  importance: number;
  created_at: string;
};

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
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMemory, setNewMemory] = useState({ type: 'core', content: '', importance: 5 });

  useEffect(() => {
    loadMemories();
  }, [agentName]);

  const loadMemories = async () => {
    try {
      const res = await fetch(`/api/agent/memory?agent_name=${encodeURIComponent(agentName)}&limit=20`);
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

  const addMemory = async () => {
    if (!newMemory.content.trim()) return;

    try {
      const res = await fetch('/api/agent/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentName,
          memory_type: newMemory.type,
          content: newMemory.content.trim(),
          importance: newMemory.importance,
        }),
      });
      const json = await res.json();

      if (json.ok) {
        setMemories([json.memory, ...memories]);
        setNewMemory({ type: 'core', content: '', importance: 5 });
      }
    } catch (e) {
      console.error('Failed to add memory:', e);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      const res = await fetch(`/api/agent/memory?id=${memoryId}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (json.ok) {
        setMemories(memories.filter((m) => m.id !== memoryId));
      }
    } catch (e) {
      console.error('Failed to delete memory:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">🧠 Agent Core Memory</h2>
        <p className="text-sm text-gray-400 mb-4">
          Manage persistent memories that the agent remembers across all conversations.
        </p>

        {/* Add New Memory */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium mb-3">Add New Memory</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select
                  value={newMemory.type}
                  onChange={(e) => setNewMemory({ ...newMemory, type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm"
                >
                  {MEMORY_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Importance (1-10): {newMemory.importance}
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
              <label className="block text-xs text-gray-400 mb-1">Content</label>
              <textarea
                value={newMemory.content}
                onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                placeholder="Enter memory content..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm resize-none"
                rows={2}
              />
            </div>
            <button
              onClick={addMemory}
              disabled={!newMemory.content.trim()}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm"
            >
              Add Memory
            </button>
          </div>
        </div>

        {/* Existing Memories */}
        <div>
          <h3 className="text-sm font-medium mb-3">Stored Memories ({memories.length})</h3>
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading memories...</div>
          ) : memories.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No memories yet. Add your first memory above.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="bg-gray-800 rounded-lg p-3 flex items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded">
                        {MEMORY_TYPES.find((t) => t.id === memory.memory_type)?.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        Importance: {memory.importance}/10
                      </span>
                    </div>
                    <p className="text-sm">{memory.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Added {new Date(memory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMemory(memory.id)}
                    className="text-gray-400 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
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
