'use client';

import * as React from 'react';
import { MessageContent } from '@/components/MessageContent';
import { SuggestedPrompts } from '@/components/SuggestedPrompts';
import { QuickActions } from '@/components/QuickActions';
import { downloadMarkdown, copyToClipboard } from '@/lib/exportConversation';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ThreadOptionsMenu } from '@/components/ThreadOptionsMenu';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThreadListSkeleton, MessageSkeleton } from '@/components/LoadingSkeleton';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { TTSSettingsModal } from '@/components/TTSSettings';
import { AgentMemoryModal } from '@/components/AgentMemoryModal';
import { UserMemoriesModal } from '@/components/UserMemoriesModal';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  files?: { name: string; url: string; type?: string }[];
  images?: { url: string; name: string }[];
  toolsUsed?: string[];
  executionTime?: number;
  isRegenerating?: boolean;
  model?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
  routing?: 'direct' | 'orchestrator';
  latencyMs?: number;
  toolSource?: string;
  availableModels?: Record<string, string>;
};

type Thread = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  branchedFrom?: string; // Thread ID this was branched from
  tags?: string[];
  folder?: string;
  pinned?: boolean;
  archived?: boolean;
  enabledTools?: string[];
  model?: string; // GPT model selection
  agentStyle?: string; // Agent style/tone
  projectContext?: string; // Project/conversation context
  agentName?: string; // Agent name for memory isolation
};

export default function AgentPage() {
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [modelName, setModelName] = React.useState('gpt-5-mini');
  const [loadingThreads, setLoadingThreads] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  
  // Performance: Message cache to avoid reloading on thread switch
  const [messageCache, setMessageCache] = React.useState<Record<string, Message[]>>({});

  // Performance: Abort controllers for request deduplication
  const loadingRef = React.useRef<Record<string, AbortController>>({});
  const [streamingContent, setStreamingContent] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingMeta, setStreamingMeta] = React.useState<{
    model?: string;
    complexity?: 'simple' | 'moderate' | 'complex';
    routing?: 'direct' | 'orchestrator';
    tools?: string[];
    toolSource?: string;
    historyLength?: number;
    models?: Record<string, string>;
  } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [exportSuccess, setExportSuccess] = React.useState(false);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [showTagModal, setShowTagModal] = React.useState(false);
  const [editingOptionsThreadId, setEditingOptionsThreadId] = React.useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [showArchived, setShowArchived] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);
  const [shareLoading, setShareLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [showTTSSettings, setShowTTSSettings] = React.useState(false);
  const [showMemoryModal, setShowMemoryModal] = React.useState(false);
  const [showUserMemoriesModal, setShowUserMemoriesModal] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  const { recordingState, audioLevel, startRecording, stopRecording, transcribeAudio } = useVoiceRecorder();
  const { ttsState, currentMessageId, settings: ttsSettings, voices: ttsVoices, speak, pause, resume, stop, updateSettings: updateTTSSettings } = useTextToSpeech();
  const { toasts, showToast, dismissToast } = useToast();

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const formatToolSource = React.useCallback((source?: string) => {
    if (!source) return '';
    if (source === 'improved') return 'Enhanced tools';
    if (source === 'basic') return 'Base tools';
    return source;
  }, []);

  // Extract all unique tags and folders
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    threads.forEach((t) => t.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [threads]);

  const allFolders = React.useMemo(() => {
    const folders = new Set<string>();
    threads.forEach((t) => {
      if (t.folder) folders.add(t.folder);
    });
    return Array.from(folders).sort();
  }, [threads]);

  // Filter threads based on search, folder, tags, archived
  const filteredThreads = React.useMemo(() => {
    let filtered = threads;

    // Filter by archived status
    if (!showArchived) {
      filtered = filtered.filter((t) => !t.archived);
    }

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter((t) => t.folder === selectedFolder);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((t) =>
        selectedTags.every((tag) => t.tags?.includes(tag))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((thread) => {
        if (thread.title.toLowerCase().includes(query)) return true;
        if (thread.tags?.some((tag) => tag.toLowerCase().includes(query))) return true;
        return thread.messages.some((msg) =>
          msg.content.toLowerCase().includes(query)
        );
      });
    }

    // Sort: pinned first, then by date
    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [threads, searchQuery, selectedFolder, selectedTags, showArchived]);

  // Fetch model config and threads on mount
  React.useEffect(() => {
    fetch('/api/agent/config')
      .then((res) => res.json())
      .then((data) => setModelName(data.model))
      .catch(() => setModelName('gpt-5-mini'));

    loadThreads();
  }, []);

  // Load threads from backend
  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const res = await fetch('/api/chat/threads');
      const json = await res.json();
      if (json.ok && json.threads) {
        setThreads(json.threads.map((t: any) => ({
          id: t.id,
          title: t.title,
          messages: [],
          createdAt: new Date(t.created_at).getTime(),
          tags: t.tags || [],
          folder: t.folder,
          pinned: t.pinned || false,
          archived: t.archived || false,
          enabledTools: t.enabled_tools || ['home_assistant', 'memory', 'web_search', 'tavily_search', 'image_generation'],
          model: t.model || 'gpt-5-mini',
          agentStyle: t.agent_style || 'balanced',
        })));
      }
    } catch (e) {
      console.error('Failed to load threads:', e);
    } finally {
      setLoadingThreads(false);
    }
  };

  // Load messages when thread changes (with caching and deduplication)
  React.useEffect(() => {
    if (!activeThreadId) return;
    
    const loadMessages = async () => {
      // Performance: Check cache first
      if (messageCache[activeThreadId]) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThreadId ? { ...t, messages: messageCache[activeThreadId] } : t
          )
        );
        return; // Cache hit - no API call needed!
      }

      // Performance: Cancel any previous request for this thread
      if (loadingRef.current[activeThreadId]) {
        loadingRef.current[activeThreadId].abort();
      }

      // Create new abort controller for request deduplication
      const controller = new AbortController();
      loadingRef.current[activeThreadId] = controller;

      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/chat/messages?thread_id=${activeThreadId}`, {
          signal: controller.signal,
        });
        const json = await res.json();

        if (json.ok && json.messages) {
          const messages = json.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).getTime(),
          }));

          // Performance: Update cache
          setMessageCache((prev) => ({ ...prev, [activeThreadId]: messages }));

          // Update thread state
          setThreads((prev) =>
            prev.map((t) =>
              t.id === activeThreadId ? { ...t, messages } : t
            )
          );
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          // Request was cancelled - this is expected, ignore
          return;
        }
        console.error('Failed to load messages:', e);
      } finally {
        setLoadingMessages(false);
        delete loadingRef.current[activeThreadId];
      }
    };

    loadMessages();
  }, [activeThreadId, messageCache]);

  // Auto-scroll to bottom on new messages or streaming content
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages, streamingContent, isStreaming]);

  // Detect scroll position to show/hide scroll-to-bottom button
  const handleScroll = React.useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    setShowScrollButton(!isNearBottom);
  }, []);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Performance: Helper to update both threads and cache simultaneously
  const updateThreadMessages = React.useCallback((threadId: string, messages: Message[]) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, messages } : t))
    );
    setMessageCache((prev) => ({ ...prev, [threadId]: messages }));
  }, []);

  const createNewThread = React.useCallback(async () => {
    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticThread: Thread = {
      id: tempId,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    
    setThreads((prev) => [optimisticThread, ...prev]);
    setActiveThreadId(tempId);
    
    try {
      const res = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const json = await res.json();

      if (json.ok && json.thread) {
        const newThread: Thread = {
          id: json.thread.id,
          title: json.thread.title,
          messages: [],
          createdAt: new Date(json.thread.created_at).getTime(),
          tags: [],
          pinned: false,
          archived: false,
        };
        
        // Replace optimistic thread with real one
        setThreads((prev) => prev.map((t) => (t.id === tempId ? newThread : t)));
        setActiveThreadId(newThread.id);
      } else {
        // Rollback on error
        setThreads((prev) => prev.filter((t) => t.id !== tempId));
        setActiveThreadId(null);
        showToast('Failed to create new chat', 'error');
      }
    } catch (e) {
      console.error('Failed to create thread:', e);
      // Rollback on error
      setThreads((prev) => prev.filter((t) => t.id !== tempId));
      setActiveThreadId(null);
      showToast('Failed to create new chat', 'error');
    }
  }, [showToast]);

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
    // Auto-send after a small delay to allow user to see the input
    setTimeout(() => {
      sendMessage();
    }, 100);
  };

  const sendMessage = async () => {
    if (!input.trim() && files.length === 0) return;
    
    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      await createNewThread();
      currentThreadId = threads[0]?.id;
      if (!currentThreadId) return;
    }

    const userContent = input;
    const userFiles = files;
    setInput('');
    setFiles([]);
    setLoading(true);

    // Process images to base64
    const imageFiles = userFiles.filter(f => f.type.startsWith('image/'));
    const images: { url: string; name: string }[] = [];
    
    for (const file of imageFiles) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      images.push({ url: base64, name: file.name });
    }

    try {
      // Save user message to backend
      const userRes = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: currentThreadId,
          role: 'user',
          content: userContent,
        }),
      });
      const userJson = await userRes.json();

      if (userJson.ok && userJson.message) {
        const userMessage: Message = {
          id: userJson.message.id,
          role: 'user',
          content: userJson.message.content,
          timestamp: new Date(userJson.message.created_at).getTime(),
          images: images.length > 0 ? images : undefined,
        };

        // Performance: Update both threads and cache
        const currentMessages = activeThread?.messages || [];
        updateThreadMessages(currentThreadId, [...currentMessages, userMessage]);
        
        // Update title if first message
        if (currentMessages.length === 0) {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === currentThreadId
                ? { ...t, title: userContent.slice(0, 40) }
                : t
            )
          );
        }

        // Auto-generate smart title if first message
        if (activeThread?.messages.length === 0) {
          // Suggest title in background (non-blocking)
          fetch(`/api/chat/threads/${currentThreadId}/suggest-title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstMessage: userContent }),
          })
            .then(res => res.json())
            .then(json => {
              if (json.ok && json.title) {
                // Update thread title
                fetch(`/api/chat/threads/${currentThreadId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: json.title }),
                });
                
                // Update local state
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === currentThreadId ? { ...t, title: json.title } : t
                  )
                );
              }
            })
            .catch(err => console.error('Title suggestion failed:', err));
        }
      }

      // Stream agent response with smart routing and conversation history
      setIsStreaming(true);
      setStreamingContent('');
      setStreamingMeta(null);
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/agent/smart-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input_as_text: userContent,
          images: images.length > 0 ? images.map(img => img.url) : undefined,
          model: activeThread?.model || 'gpt-5-mini',
          enabled_tools: activeThread?.enabledTools,
          thread_id: currentThreadId, // Pass thread ID for conversation history
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let routingMetadata: {
        model?: string;
        complexity?: 'simple' | 'moderate' | 'complex';
        routing?: 'direct' | 'orchestrator';
        tools?: string[];
        toolSource?: string;
        historyLength?: number;
        models?: Record<string, string>;
      } | null = null;
      let runMetrics: { durationMs?: number; model?: string; route?: string } | null = null;
      let streamedTools: string[] | undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }

              if (data.metadata) {
                routingMetadata = data.metadata;
                setStreamingMeta({
                  model: data.metadata.model,
                  complexity: data.metadata.complexity,
                  routing: data.metadata.routing,
                  tools: data.metadata.tools,
                  toolSource: data.metadata.toolSource,
                  historyLength: data.metadata.historyLength,
                  models: data.metadata.models,
                });
                continue;
              }

              if (typeof data.delta === 'string') {
                assistantContent += data.delta;
                setStreamingContent(assistantContent);
                continue;
              }

              if (data.metrics) {
                runMetrics = data.metrics;
              }

              if (Array.isArray(data.tools)) {
                streamedTools = data.tools;
              }

              if (typeof data.content === 'string') {
                assistantContent = data.content;
                setStreamingContent(data.content);
              }

              if (data.done) {
                setStreamingMeta(null);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }

      setIsStreaming(false);
      setStreamingMeta(null);
      setStreamingContent('');

      // Save final assistant message to backend
      const assistantRes = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: currentThreadId,
          role: 'assistant',
          content: assistantContent,
        }),
      });
      const assistantJson = await assistantRes.json();

      if (assistantJson.ok && assistantJson.message) {
        const toolList = streamedTools && streamedTools.length > 0 ? streamedTools : routingMetadata?.tools;

        const assistantMessage: Message = {
          id: assistantJson.message.id,
          role: 'assistant',
          content: assistantJson.message.content,
          timestamp: new Date(assistantJson.message.created_at).getTime(),
          toolsUsed: toolList,
          executionTime: runMetrics?.durationMs,
          latencyMs: runMetrics?.durationMs,
          model: routingMetadata?.model,
          complexity: routingMetadata?.complexity,
          routing: routingMetadata?.routing,
          toolSource: routingMetadata?.toolSource,
          availableModels: routingMetadata?.models,
        };

        // Performance: Update both threads and cache
        const currentMessages = activeThread?.messages || [];
        updateThreadMessages(currentThreadId, [...currentMessages, assistantMessage]);
      }
    } catch (e: any) {
      console.error('Send message error:', e);
      
      // Don't show error if it was aborted by user
      if (e.name !== 'AbortError') {
        const errorMessage: Message = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `Error: ${e?.message || 'Request failed'}`,
          timestamp: Date.now(),
        };

        setThreads((prev) =>
          prev.map((t) =>
            t.id === currentThreadId
              ? { ...t, messages: [...t.messages, errorMessage] }
              : t
          )
        );
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingMeta(null);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingMeta(null);
      setLoading(false);
    }
  };

  const regenerateResponse = async (messageIndex: number) => {
    if (!activeThreadId || !activeThread) return;

    const messages = activeThread.messages;
    if (messageIndex < 1) return; // Need at least one user message

    // Get the user message before this assistant message
    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;

    // Mark the message as regenerating
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? {
              ...t,
              messages: t.messages.map((m, i) =>
                i === messageIndex ? { ...m, isRegenerating: true } : m
              ),
            }
          : t
      )
    );

    setLoading(true);
    const startTime = Date.now();

    try {
      // Use streaming for regeneration with smart routing and conversation history
      setIsStreaming(true);
      setStreamingContent('');
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/agent/smart-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input_as_text: userMessage.content,
          images: userMessage.images?.map(img => img.url),
          model: activeThread?.model || 'gpt-5-mini',
          enabled_tools: activeThread?.enabledTools,
          thread_id: activeThreadId, // Pass thread ID for conversation history
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Regeneration failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let newContent = '';
      let routingMetadata: {
        model?: string;
        complexity?: 'simple' | 'moderate' | 'complex';
        routing?: 'direct' | 'orchestrator';
        tools?: string[];
        toolSource?: string;
        historyLength?: number;
        models?: Record<string, string>;
      } | null = null;
      let runMetrics: { durationMs?: number; model?: string; route?: string } | null = null;
      let streamedTools: string[] | undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);

              if (data.metadata) {
                routingMetadata = data.metadata;
                setStreamingMeta({
                  model: data.metadata.model,
                  complexity: data.metadata.complexity,
                  routing: data.metadata.routing,
                  tools: data.metadata.tools,
                  toolSource: data.metadata.toolSource,
                  historyLength: data.metadata.historyLength,
                  models: data.metadata.models,
                });
                continue;
              }

              if (typeof data.delta === 'string') {
                newContent += data.delta;
                setStreamingContent(newContent);

                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === activeThreadId
                      ? {
                          ...t,
                          messages: t.messages.map((m, i) =>
                            i === messageIndex
                              ? { ...m, content: newContent, isRegenerating: true }
                              : m
                          ),
                        }
                      : t
                  )
                );
                continue;
              }

              if (data.metrics) {
                runMetrics = data.metrics;
              }

              if (Array.isArray(data.tools)) {
                streamedTools = data.tools;
              }

              if (typeof data.content === 'string') {
                newContent = data.content;
                setStreamingContent(data.content);

                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === activeThreadId
                      ? {
                          ...t,
                          messages: t.messages.map((m, i) =>
                            i === messageIndex
                              ? { ...m, content: data.content, isRegenerating: true }
                              : m
                          ),
                        }
                      : t
                  )
                );
              }

              if (data.done) {
                setStreamingMeta(null);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }

      setIsStreaming(false);
      setStreamingMeta(null);
      setStreamingContent('');

      const metricsDuration = runMetrics?.durationMs ?? Date.now() - startTime;

      // Update final message in backend
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: activeThreadId,
          role: 'assistant',
          content: newContent,
        }),
      });

      // Update in state with execution time
      const resolvedTools = streamedTools && streamedTools.length > 0 ? streamedTools : routingMetadata?.tools;

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                messages: t.messages.map((m, i) =>
                  i === messageIndex
                    ? {
                        ...m,
                        content: newContent,
                        isRegenerating: false,
                        executionTime: metricsDuration,
                        latencyMs: metricsDuration,
                        toolsUsed: resolvedTools || m.toolsUsed,
                        model: routingMetadata?.model || m.model,
                        complexity: routingMetadata?.complexity || m.complexity,
                        routing: routingMetadata?.routing || m.routing,
                        toolSource: routingMetadata?.toolSource || m.toolSource,
                        availableModels: routingMetadata?.models || m.availableModels,
                      }
                    : m
                ),
              }
            : t
        )
      );
    } catch (e: any) {
      console.error('Regenerate error:', e);
      
      // Restore original message on error
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                messages: t.messages.map((m, i) =>
                  i === messageIndex ? { ...m, isRegenerating: false } : m
                ),
              }
            : t
        )
      );
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingMeta(null);
      abortControllerRef.current = null;
    }
  };

  const deleteThread = async (id: string) => {
    try {
      await fetch(`/api/chat/threads/${id}`, { method: 'DELETE' });
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (activeThreadId === id) {
        setActiveThreadId(threads[0]?.id || null);
      }
    } catch (e) {
      console.error('Failed to delete thread:', e);
    }
  };

  const handleExportDownload = () => {
    if (!activeThread) return;
    downloadMarkdown(activeThread);
    setShowExportMenu(false);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const handleExportCopy = async () => {
    if (!activeThread) return;
    try {
      await copyToClipboard(activeThread);
      setShowExportMenu(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const togglePinThread = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    const newPinned = !thread.pinned;
    
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, pinned: newPinned } : t))
      );
    } catch (e) {
      console.error('Failed to pin/unpin thread:', e);
    }
  };

  const toggleArchiveThread = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    const newArchived = !thread.archived;
    
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: newArchived }),
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, archived: newArchived } : t))
      );
    } catch (e) {
      console.error('Failed to archive/unarchive thread:', e);
    }
  };

  const updateThreadTags = async (threadId: string, tags: string[]) => {
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, tags } : t))
      );
    } catch (e) {
      console.error('Failed to update tags:', e);
    }
  };

  const updateThreadFolder = async (threadId: string, folder: string | null) => {
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, folder: folder || undefined } : t))
      );
    } catch (e) {
      console.error('Failed to update folder:', e);
    }
  };

  const updateThreadTools = async (threadId: string, tools: string[]) => {
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_tools: tools }),
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, enabledTools: tools } : t))
      );
      showToast('Tools updated successfully', 'success');
    } catch (e) {
      console.error('Failed to update tools:', e);
      showToast('Failed to update tools', 'error');
    }
  };

  const updateThreadModel = async (threadId: string, model: string) => {
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, model } : t))
      );
      showToast(`Model changed to ${model}`, 'success');
    } catch (e) {
      console.error('Failed to update model:', e);
      showToast('Failed to update model', 'error');
    }
  };

  const updateThreadStyle = async (threadId: string, style: string) => {
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_style: style }),
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, agentStyle: style } : t))
      );
      showToast(`Agent style changed to ${style}`, 'success');
    } catch (e) {
      console.error('Failed to update style:', e);
      showToast('Failed to update style', 'error');
    }
  };

  const handleShare = async (expiresInDays?: number) => {
    if (!activeThreadId) return;

    setShareLoading(true);
    try {
      const res = await fetch(`/api/chat/threads/${activeThreadId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays }),
      });
      const json = await res.json();

      if (json.ok) {
        setShareUrl(json.shareUrl);
        showToast('Share link created successfully!', 'success');
      } else {
        showToast('Failed to create share link: ' + json.error, 'error');
      }
    } catch (e: any) {
      showToast('Failed to create share link', 'error');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      showToast('Share link copied to clipboard!', 'success');
    }
  };

  const handleVoiceInput = async () => {
    if (recordingState === 'recording') {
      // Stop recording and transcribe
      const audioBlob = await stopRecording();
      if (audioBlob) {
        try {
          const transcription = await transcribeAudio(audioBlob);
          setInput(transcription);
          showToast('Audio transcribed successfully!', 'success');
        } catch (e: any) {
          console.error('Transcription error:', e);
          showToast('Failed to transcribe audio: ' + e.message, 'error');
        }
      }
    } else {
      // Start recording
      const success = await startRecording();
      if (!success) {
        showToast('Failed to access microphone. Please check permissions.', 'error');
      }
    }
  };

  const startEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const createBranch = async (messageIndex: number) => {
    if (!activeThreadId || !activeThread) return;

    try {
      // Create new thread
      const res = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: `${activeThread.title} (Branch)`,
        }),
      });
      const json = await res.json();
      
      if (json.ok && json.thread) {
        const newBranch: Thread = {
          id: json.thread.id,
          title: json.thread.title,
          messages: activeThread.messages.slice(0, messageIndex + 1),
          createdAt: new Date(json.thread.created_at).getTime(),
          branchedFrom: activeThreadId,
        };

        // Save all messages to the new branch
        for (const msg of newBranch.messages) {
          await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              thread_id: newBranch.id,
              role: msg.role,
              content: msg.content,
            }),
          });
        }

        setThreads([newBranch, ...threads]);
        setActiveThreadId(newBranch.id);
      }
    } catch (e) {
      console.error('Failed to create branch:', e);
    }
  };

  const saveEditedMessage = async (messageIndex: number) => {
    if (!activeThreadId || !activeThread || !editContent.trim()) return;

    const newContent = editContent.trim();
    setEditingMessageId(null);
    setEditContent('');
    setLoading(true);

    try {
      // Update the user message in state
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? {
                ...t,
                messages: t.messages.map((m, i) =>
                  i === messageIndex ? { ...m, content: newContent } : m
                ),
              }
            : t
        )
      );

      // Remove all messages after this one
      const messagesUpToEdit = activeThread.messages.slice(0, messageIndex + 1);
      
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: messagesUpToEdit.map((m, i) => i === messageIndex ? { ...m, content: newContent } : m) }
            : t
        )
      );

      // Re-run agent with edited message using smart routing and conversation history
      setIsStreaming(true);
      setStreamingContent('');
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/agent/smart-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input_as_text: newContent,
          model: activeThread?.model || 'gpt-5-mini',
          enabled_tools: activeThread?.enabledTools,
          thread_id: activeThreadId, // Pass thread ID for conversation history
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Stream request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let routingMetadata: {
        model?: string;
        complexity?: 'simple' | 'moderate' | 'complex';
        routing?: 'direct' | 'orchestrator';
        tools?: string[];
        toolSource?: string;
        historyLength?: number;
        models?: Record<string, string>;
      } | null = null;
      let runMetrics: { durationMs?: number; model?: string; route?: string } | null = null;
      let streamedTools: string[] | undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);

              if (data.metadata) {
                routingMetadata = data.metadata;
                setStreamingMeta({
                  model: data.metadata.model,
                  complexity: data.metadata.complexity,
                  routing: data.metadata.routing,
                  tools: data.metadata.tools,
                  toolSource: data.metadata.toolSource,
                  historyLength: data.metadata.historyLength,
                  models: data.metadata.models,
                });
                continue;
              }

              if (typeof data.delta === 'string') {
                assistantContent += data.delta;
                setStreamingContent(assistantContent);
                continue;
              }

              if (data.metrics) {
                runMetrics = data.metrics;
              }

              if (Array.isArray(data.tools)) {
                streamedTools = data.tools;
              }

              if (typeof data.content === 'string') {
                assistantContent = data.content;
                setStreamingContent(data.content);
              }

              if (data.done) {
                setStreamingMeta(null);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }

      setIsStreaming(false);
      setStreamingMeta(null);
      setStreamingContent('');

      // Save new assistant response
      const assistantRes = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: activeThreadId,
          role: 'assistant',
          content: assistantContent,
        }),
      });
      const assistantJson = await assistantRes.json();

      if (assistantJson.ok && assistantJson.message) {
        const toolList = streamedTools && streamedTools.length > 0 ? streamedTools : routingMetadata?.tools;

        const assistantMessage: Message = {
          id: assistantJson.message.id,
          role: 'assistant',
          content: assistantJson.message.content,
          timestamp: new Date(assistantJson.message.created_at).getTime(),
          toolsUsed: toolList,
          executionTime: runMetrics?.durationMs,
          latencyMs: runMetrics?.durationMs,
          model: routingMetadata?.model,
          complexity: routingMetadata?.complexity,
          routing: routingMetadata?.routing,
          toolSource: routingMetadata?.toolSource,
          availableModels: routingMetadata?.models,
        };

        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeThreadId
              ? { ...t, messages: [...messagesUpToEdit.map((m, i) => i === messageIndex ? { ...m, content: newContent } : m), assistantMessage] }
              : t
          )
        );
      }
    } catch (e: any) {
      console.error('Edit message error:', e);
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  };

  React.useEffect(() => {
    if (!loadingThreads && threads.length === 0) {
      createNewThread();
    }
  }, [loadingThreads, threads.length]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: New chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        createNewThread();
      }
      // Cmd/Ctrl + Shift + L: Clear current thread
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (activeThreadId) {
          deleteThread(activeThreadId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeThreadId, threads]);

  // Close export menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);

  return (
    <ErrorBoundary>
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-gray-900 border-r border-gray-800 flex flex-col
        fixed lg:relative inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-4 border-b border-gray-800 space-y-3">
          <button
            onClick={createNewThread}
            className="w-full py-2 px-4 bg-sky-500 hover:bg-sky-600 rounded-lg font-medium text-black transition"
            title="Cmd/Ctrl + K"
          >
            + New Chat
          </button>
          
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-sky-500 transition"
            />
            <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-gray-500 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <div>⌘/Ctrl + K: New Chat</div>
            <div>⌘/Ctrl + ⇧ + L: Delete Chat</div>
          </div>
        </div>

        {/* Folders */}
        {allFolders.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-800">
            <div className="text-xs font-semibold text-gray-400 mb-2">📁 FOLDERS</div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                  !selectedFolder ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50'
                }`}
              >
                All Chats
              </button>
              {allFolders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                    selectedFolder === folder ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50'
                  }`}
                >
                  {folder}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-800">
            <div className="text-xs font-semibold text-gray-400 mb-2">🏷️ TAGS</div>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                    );
                  }}
                  className={`px-2 py-0.5 rounded text-xs transition ${
                    selectedTags.includes(tag)
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

        {/* Archive toggle */}
        <div className="px-4 py-2 border-b border-gray-800">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show Archived
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingThreads ? (
            <ThreadListSkeleton />
          ) : filteredThreads.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              {searchQuery ? 'No chats match your search' : 'No chats yet'}
            </div>
          ) : (
            filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className={`p-3 mb-2 rounded-lg cursor-pointer transition group ${
                activeThreadId === thread.id
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-800/50'
              }`}
              onClick={() => setActiveThreadId(thread.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {thread.pinned && <span className="text-yellow-500" title="Pinned">📌</span>}
                    {thread.archived && <span className="text-gray-600" title="Archived">📦</span>}
                    <div className="font-medium truncate">{thread.title}</div>
                    {thread.branchedFrom && (
                      <span className="text-xs bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded" title="Branched conversation">
                        🌿
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingOptionsThreadId(thread.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-sky-400 text-xs"
                    title="Tags & Folder"
                  >
                    🏷️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinThread(thread.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-yellow-500 text-xs"
                    title={thread.pinned ? 'Unpin' : 'Pin'}
                  >
                    📌
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleArchiveThread(thread.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-400 text-xs"
                    title={thread.archived ? 'Unarchive' : 'Archive'}
                  >
                    {thread.archived ? '📂' : '📦'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(thread.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 text-xs ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
              {thread.folder && (
                <div className="text-xs text-gray-500 mt-1">
                  📁 {thread.folder}
                </div>
              )}
              {thread.tags && thread.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {thread.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {thread.messages.length} messages
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              FROK Agent
              <span className="inline-flex items-center gap-1 bg-sky-500/20 text-sky-400 text-xs px-2 py-0.5 rounded-full">
                🔄 Live
              </span>
              {exportSuccess && (
                <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full animate-pulse">
                  ✓ Exported
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {modelName} • 🏠 HA • 🧠 Memory • 🌐 Web • 👁️ Vision
            </p>
          </div>
          
          {/* Settings, Export and Share buttons */}
          <div className="flex gap-2">
            {/* Agent Memory */}
            <button
              onClick={() => setShowMemoryModal(true)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition flex items-center gap-2"
              title="Agent Core Memory"
            >
              🧠
            </button>

            {/* User Memories */}
            <button
              onClick={() => setShowUserMemoriesModal(true)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition flex items-center gap-2"
              title="View memories stored by agent"
            >
              📚
            </button>

            {/* TTS Settings */}
            <button
              onClick={() => setShowTTSSettings(true)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition flex items-center gap-2"
              title="Text-to-Speech Settings"
            >
              🔊
            </button>

            {activeThread && activeThread.messages.length > 0 && (
              <>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition flex items-center gap-2"
                >
                  🔗 Share
                </button>
                
                <div className="relative export-menu-container">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition flex items-center gap-2"
                >
                  📥 Export
                </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden">
                  <button
                    onClick={handleExportDownload}
                    className="w-full px-4 py-2 text-left hover:bg-gray-700 transition text-sm flex items-center gap-2"
                  >
                    💾 Download MD
                  </button>
                  <button
                    onClick={handleExportCopy}
                    className="w-full px-4 py-2 text-left hover:bg-gray-700 transition text-sm flex items-center gap-2"
                  >
                    📋 Copy MD
                  </button>
                </div>
              )}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6 relative"
        >
          {loadingMessages ? (
            <MessageSkeleton />
          ) : null}
          
          {/* Show suggested prompts when no messages */}
          {!loadingMessages && activeThread && activeThread.messages.length === 0 && !loading && (
            <div className="py-12">
              <SuggestedPrompts onSelect={handleSuggestedPrompt} disabled={loading} />
            </div>
          )}

          {activeThread?.messages.map((msg, msgIndex) => {
            const toolSourceLabel = formatToolSource(msg.toolSource);

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
              {/* Avatar for assistant */}
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm mt-1">
                  AI
                </div>
              )}
              
              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 relative group shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-sm'
                }`}
              >
                {msg.images && msg.images.length > 0 && (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {msg.images.map((img, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-auto object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                          {img.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && (msg.model || msg.complexity || msg.routing || msg.toolSource) && (
                  <div className="mb-3 -mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                    {msg.routing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-700 bg-gray-900/70">
                        🧠 {msg.routing === 'orchestrator' ? 'Orchestrator' : 'Direct'}
                      </span>
                    )}
                    {msg.model && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-700 bg-gray-900/70">
                        🧩 {msg.model}
                      </span>
                    )}
                    {msg.complexity && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-700 bg-gray-900/70 capitalize">
                        📊 {msg.complexity}
                      </span>
                    )}
                    {toolSourceLabel && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-700 bg-gray-900/70">
                        🔧 {toolSourceLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* Edit mode for user messages */}
                {msg.role === 'user' && editingMessageId === msg.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 text-white border border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                      rows={4}
                      autoFocus
                      placeholder="Edit your message..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEditedMessage(msgIndex)}
                        disabled={!editContent.trim() || loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        💾 Save & Re-run
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <MessageContent content={msg.content} role={msg.role} />
                )}
                
                {/* Edit and Branch buttons for user messages */}
                {msg.role === 'user' && !editingMessageId && (
                  <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition flex gap-2">
                    <button
                      onClick={() => createBranch(msgIndex)}
                      disabled={loading || isStreaming}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-xs transition flex items-center gap-1"
                      title="Branch conversation from here"
                    >
                      🌿 Branch
                    </button>
                    <button
                      onClick={() => startEditMessage(msg.id, msg.content)}
                      disabled={loading || isStreaming}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-xs transition flex items-center gap-1"
                      title="Edit message"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
                
                {msg.files && msg.files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.files.map((file, i) => (
                      <div
                        key={i}
                        className="text-xs opacity-75 flex items-center gap-1"
                      >
                        📎 {file.name}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Tool usage and metadata */}
                {msg.role === 'assistant' && (msg.toolsUsed || msg.executionTime) && (
                  <div className="mt-3 pt-2 border-t border-gray-700 flex items-center gap-3 text-xs text-gray-400">
                    {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span>🔧</span>
                        <span>{msg.toolsUsed.join(', ')}</span>
                      </div>
                    )}
                    {msg.executionTime && (
                      <div className="flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{(msg.executionTime / 1000).toFixed(2)}s</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message actions (for assistant messages) */}
                {msg.role === 'assistant' && !msg.isRegenerating && (
                  <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition flex gap-2">
                    {/* TTS Control */}
                    {currentMessageId === msg.id && ttsState !== 'idle' ? (
                      <div className="flex gap-1">
                        {ttsState === 'speaking' ? (
                          <button
                            onClick={pause}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition"
                            title="Pause"
                          >
                            ⏸️
                          </button>
                        ) : (
                          <button
                            onClick={resume}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition"
                            title="Resume"
                          >
                            ▶️
                          </button>
                        )}
                        <button
                          onClick={stop}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition"
                          title="Stop"
                        >
                          ⏹️
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => speak(msg.content, msg.id)}
                        disabled={ttsState !== 'idle'}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-xs transition"
                        title="Read aloud"
                      >
                        🔊
                      </button>
                    )}
                    <button
                      onClick={() => regenerateResponse(msgIndex)}
                      disabled={loading || isStreaming}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg text-xs transition flex items-center gap-1"
                      title="Regenerate response"
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                )}

                {/* Regenerating indicator */}
                {msg.isRegenerating && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-sky-400">
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></div>
                    Regenerating...
                  </div>
                )}
              </div>
              
              {/* Avatar for user */}
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm mt-1">
                  U
                </div>
              )}
            </div>
            );
          })}
          {isStreaming && streamingContent && (
            <div className="flex items-start gap-3 justify-start">
              {/* Avatar for streaming assistant */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm mt-1">
                AI
              </div>

              <div className="max-w-2xl rounded-2xl rounded-tl-sm px-5 py-3.5 bg-gray-800 text-gray-100 border border-gray-700 shadow-lg">
                {streamingMeta && (
                  <div className="mb-2 flex flex-wrap gap-2 text-xs text-sky-300">
                    {streamingMeta.routing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10">
                        🧠 {streamingMeta.routing === 'orchestrator' ? 'Orchestrator' : 'Direct'}
                      </span>
                    )}
                    {streamingMeta.model && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10">
                        🧩 {streamingMeta.model}
                      </span>
                    )}
                    {streamingMeta.complexity && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10 capitalize">
                        📊 {streamingMeta.complexity}
                      </span>
                    )}
                    {streamingMeta.tools && streamingMeta.tools.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10">
                        🔧 {streamingMeta.tools.join(', ')}
                      </span>
                    )}
                    {streamingMeta.toolSource && formatToolSource(streamingMeta.toolSource) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-sky-500/40 bg-sky-500/10">
                        ⚙️ {formatToolSource(streamingMeta.toolSource)}
                      </span>
                    )}
                  </div>
                )}
                <MessageContent content={streamingContent} role="assistant" />
                <div className="mt-2 flex items-center gap-2 text-xs text-sky-400">
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></div>
                  Streaming...
                </div>
              </div>
            </div>
          )}
          {loading && !isStreaming && (
            <div className="flex items-start gap-3 justify-start">
              {/* Avatar for loading */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm mt-1">
                AI
              </div>
              
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-5 py-3.5 border border-gray-700 shadow-lg">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <div
                    className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg border border-gray-600 transition-all hover:scale-110 z-10"
              title="Scroll to bottom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          {/* Quick Actions */}
          <QuickActions
            onAction={handleSuggestedPrompt}
            hasMessages={(activeThread?.messages.length ?? 0) > 0}
            disabled={loading || isStreaming}
          />
          
          {files.length > 0 && (
            <div className="mb-2 space-y-2">
              {/* Image previews */}
              {files.filter(f => f.type.startsWith('image/')).length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {files.filter(f => f.type.startsWith('image/')).map((file, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f !== file))
                        }
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate rounded-b-lg">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Other files */}
              {files.filter(f => !f.type.startsWith('image/')).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.filter(f => !f.type.startsWith('image/')).map((file, i) => (
                    <div
                      key={i}
                      className="bg-gray-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      <span>📎 {file.name}</span>
                      <button
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f !== file))
                        }
                        className="text-gray-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || recordingState !== 'idle'}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-850 disabled:text-gray-600 rounded-lg transition group relative"
              title="Attach images (Vision enabled)"
            >
              🖼️
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                Vision enabled
              </span>
            </button>
            
            {/* Voice Input Button */}
            <button
              onClick={handleVoiceInput}
              disabled={loading || recordingState === 'processing'}
              className={`px-4 py-2 rounded-lg transition relative ${
                recordingState === 'recording'
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-gray-800 hover:bg-gray-700 disabled:bg-gray-850 disabled:text-gray-600'
              }`}
              title={recordingState === 'recording' ? 'Stop recording' : 'Voice input'}
            >
              {recordingState === 'recording' ? (
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full" style={{ transform: `scale(${1 + audioLevel})` }}></div>
                  🎤
                </span>
              ) : recordingState === 'processing' ? (
                '⏳'
              ) : (
                '🎤'
              )}
              {recordingState === 'idle' && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  Voice input
                </span>
              )}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-sky-500 transition"
              disabled={loading}
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium text-white transition"
              >
                ⬛ Stop
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && files.length === 0)}
                className="px-6 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium text-black transition"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Share Conversation</h2>
            
            {shareUrl ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                    />
                    <button
                      onClick={copyShareUrl}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded transition"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Anyone with this link can view this conversation (read-only)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareUrl(null);
                  }}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Create a public link to share this conversation with others.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleShare()}
                    disabled={shareLoading}
                    className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-700 rounded transition"
                  >
                    {shareLoading ? 'Creating...' : 'Create Permanent Link'}
                  </button>
                  <button
                    onClick={() => handleShare(7)}
                    disabled={shareLoading}
                    className="w-full px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-700 rounded transition"
                  >
                    {shareLoading ? 'Creating...' : 'Create Link (Expires in 7 days)'}
                  </button>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thread Options Modal */}
      {editingOptionsThreadId && (
        <ThreadOptionsMenu
          threadId={editingOptionsThreadId}
          currentTags={threads.find((t) => t.id === editingOptionsThreadId)?.tags}
          currentFolder={threads.find((t) => t.id === editingOptionsThreadId)?.folder}
          currentTools={threads.find((t) => t.id === editingOptionsThreadId)?.enabledTools}
          currentModel={threads.find((t) => t.id === editingOptionsThreadId)?.model}
          currentStyle={threads.find((t) => t.id === editingOptionsThreadId)?.agentStyle}
          allTags={allTags}
          allFolders={allFolders}
          onUpdateTags={(tags) => updateThreadTags(editingOptionsThreadId, tags)}
          onUpdateFolder={(folder) => updateThreadFolder(editingOptionsThreadId, folder)}
          onUpdateTools={(tools) => updateThreadTools(editingOptionsThreadId, tools)}
          onUpdateModel={(model) => updateThreadModel(editingOptionsThreadId, model)}
          onUpdateStyle={(style) => updateThreadStyle(editingOptionsThreadId, style)}
          onClose={() => setEditingOptionsThreadId(null)}
        />
      )}

      {/* TTS Settings Modal */}
      {showTTSSettings && (
        <TTSSettingsModal
          settings={ttsSettings}
          voices={ttsVoices}
          onUpdate={(newSettings) => {
            updateTTSSettings(newSettings);
            showToast('TTS settings updated', 'success');
          }}
          onClose={() => setShowTTSSettings(false)}
        />
      )}

      {/* Agent Memory Modal */}
      {showMemoryModal && (
        <AgentMemoryModal
          agentName={activeThread?.agentName || 'FROK Assistant'}
          onClose={() => setShowMemoryModal(false)}
        />
      )}

      {/* User Memories Modal */}
      {showUserMemoriesModal && (
        <UserMemoriesModal
          onClose={() => setShowUserMemoriesModal(false)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
    </ErrorBoundary>
  );
}
