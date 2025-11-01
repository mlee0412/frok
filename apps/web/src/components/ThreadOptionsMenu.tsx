'use client';

import React, { useState } from 'react';

type ThreadOptionsMenuProps = {
  threadId: string;
  currentTags?: string[];
  currentFolder?: string;
  currentTools?: string[];
  currentModel?: string;
  currentStyle?: string;
  allTags: string[];
  allFolders: string[];
  onUpdateTags: (tags: string[]) => void;
  onUpdateFolder: (folder: string | null) => void;
  onUpdateTools: (tools: string[]) => void;
  onUpdateModel: (model: string) => void;
  onUpdateStyle: (style: string) => void;
  onClose: () => void;
};

const AVAILABLE_TOOLS = [
  { id: 'home_assistant', name: 'Home Assistant', icon: '🏠' },
  { id: 'memory', name: 'Persistent Memory', icon: '🧠' },
  { id: 'web_search', name: 'Web Search (DuckDuckGo)', icon: '🔍' },
  { id: 'tavily_search', name: 'Web Search (Tavily)', icon: '🌐' },
  { id: 'image_generation', name: 'Image Generation', icon: '🎨' },
];

const AVAILABLE_MODELS = [
  { id: 'auto', name: 'Auto (Recommended)', description: 'Automatically selects the best model based on query complexity' },
  { id: 'gpt-5-think', name: 'GPT-5 Think', description: 'Most capable, best for complex reasoning' },
  { id: 'gpt-5', name: 'GPT-5', description: 'Balanced performance and capability' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Fast and efficient for most tasks' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Fastest, best for simple queries' },
];

const AGENT_STYLES = [
  { id: 'balanced', name: 'Balanced', description: 'Friendly and professional' },
  { id: 'concise', name: 'Concise', description: 'Brief and to the point' },
  { id: 'detailed', name: 'Detailed', description: 'Thorough explanations' },
  { id: 'technical', name: 'Technical', description: 'Expert and precise' },
  { id: 'casual', name: 'Casual', description: 'Relaxed and conversational' },
];

export function ThreadOptionsMenu({
  threadId: _threadId,
  currentTags = [],
  currentFolder,
  currentTools = AVAILABLE_TOOLS.map(t => t.id),
  currentModel = 'auto',
  currentStyle = 'balanced',
  allTags,
  allFolders,
  onUpdateTags,
  onUpdateFolder,
  onUpdateTools,
  onUpdateModel,
  onUpdateStyle,
  onClose,
}: ThreadOptionsMenuProps) {
  const [activeTab, setActiveTab] = useState<'organize' | 'tools' | 'config'>('organize');
  const [tags, setTags] = useState<string[]>(currentTags);
  const [folder, setFolder] = useState<string>(currentFolder || '');
  const [enabledTools, setEnabledTools] = useState<string[]>(currentTools);
  const [selectedModel, setSelectedModel] = useState<string>(currentModel);
  const [selectedStyle, setSelectedStyle] = useState<string>(currentStyle);
  const [newTag, setNewTag] = useState('');
  const [newFolder, setNewFolder] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleToggleTool = (toolId: string) => {
    setEnabledTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(t => t !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSave = () => {
    onUpdateTags(tags);
    onUpdateFolder(folder || null);
    onUpdateTools(enabledTools);
    onUpdateModel(selectedModel);
    onUpdateStyle(selectedStyle);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Thread Settings</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('organize')}
            className={`px-4 py-2 text-sm transition ${
              activeTab === 'organize'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            📁 Organize
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 text-sm transition ${
              activeTab === 'tools'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🔧 Tools
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-sm transition ${
              activeTab === 'config'
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            ⚙️ Config
          </button>
        </div>

        {/* Organize Tab */}
        {activeTab === 'organize' && (<div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-sky-500 text-white px-2 py-1 rounded text-sm flex items-center gap-1"
              >
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-300">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add new tag..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-sky-500 text-sm"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded text-sm transition"
            >
              Add
            </button>
          </div>
          {allTags.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Existing tags:</p>
              <div className="flex flex-wrap gap-1">
                {allTags
                  .filter((t) => !tags.includes(t))
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setTags([...tags, tag])}
                      className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs hover:bg-gray-700"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Folder */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Folder</label>
          <div className="flex gap-2 mb-2">
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-sky-500 text-sm"
            >
              <option value="">No folder</option>
              {allFolders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              {newFolder && <option value={newFolder}>{newFolder} (new)</option>}
            </select>
          </div>
          <input
            type="text"
            value={newFolder}
            onChange={(e) => {
              setNewFolder(e.target.value);
              if (e.target.value) setFolder(e.target.value);
            }}
            placeholder="Or create new folder..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-sky-500 text-sm"
          />
        </div></div>)}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div>
            <p className="text-sm text-gray-400 mb-4">
              Select which tools the agent can use in this conversation.
            </p>
            <div className="space-y-2">
              {AVAILABLE_TOOLS.map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition"
                >
                  <input
                    type="checkbox"
                    checked={enabledTools.includes(tool.id)}
                    onChange={() => handleToggleTool(tool.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-lg">{tool.icon}</span>
                  <span className="flex-1 text-sm">{tool.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">AI Model</label>
              <div className="space-y-2">
                {AVAILABLE_MODELS.map((model) => (
                  <label
                    key={model.id}
                    className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition"
                  >
                    <input
                      type="radio"
                      name="model"
                      checked={selectedModel === model.id}
                      onChange={() => setSelectedModel(model.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {model.name}
                        {model.id === 'auto' && <span className="ml-2 text-xs text-green-400">✓ Default</span>}
                      </div>
                      {model.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 <strong>Auto mode</strong> analyzes your query and selects the optimal model for speed and accuracy
              </p>
            </div>

            {/* Agent Style */}
            <div>
              <label className="block text-sm font-medium mb-2">Agent Style</label>
              <div className="space-y-2">
                {AGENT_STYLES.map((style) => (
                  <label
                    key={style.id}
                    className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition"
                  >
                    <input
                      type="radio"
                      name="agentStyle"
                      checked={selectedStyle === style.id}
                      onChange={() => setSelectedStyle(style.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{style.name}</div>
                      <div className="text-xs text-gray-500">{style.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Project Context */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Project Context (Optional)</label>
              <textarea
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="Add context about this project or conversation topic..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-sky-500 text-sm resize-none"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Help the agent understand the project scope and maintain context
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
