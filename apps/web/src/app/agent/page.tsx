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
import { ChatKitLauncher } from '@/components/ChatKitLauncher';

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
  const [density, setDensity] = React.useState<'cozy' | 'compact'>('cozy');
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

  const formatTimestamp = React.useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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

  const pinnedThreads = React.useMemo(
    () => filteredThreads.filter((thread) => thread.pinned),
    [filteredThreads]
  );

  const regularThreads = React.useMemo(
    () => filteredThreads.filter((thread) => !thread.pinned),
    [filteredThreads]
  );

  const archivedCount = React.useMemo(
    () => threads.filter((thread) => thread.archived).length,
    [threads]
  );

  const isCompact = density === 'compact';

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

  const copyMessageToClipboard = React.useCallback(
    async (message: Message) => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message.content);
        } else if (typeof document !== 'undefined') {
          const textarea = document.createElement('textarea');
          textarea.value = message.content;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'absolute';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        } else {
          throw new Error('Clipboard unavailable');
        }
        showToast('Message copied to clipboard', 'success');
      } catch (err) {
        console.error('Failed to copy message:', err);
        showToast('Failed to copy message', 'error');
      }
    },
    [showToast]
  );

  const renderThreadCard = (thread: Thread) => {
    const isActive = activeThreadId === thread.id;
    const cachedMessages = messageCache[thread.id];
    const directLastMessage =
      thread.messages.length > 0
        ? thread.messages[thread.messages.length - 1]
        : undefined;
    const cachedLastMessage =
      cachedMessages && cachedMessages.length > 0
        ? cachedMessages[cachedMessages.length - 1]
        : undefined;
    const resolvedLastMessage = directLastMessage ?? cachedLastMessage;
    const lastTimestamp = resolvedLastMessage?.timestamp ?? thread.createdAt;
    const previewSource = resolvedLastMessage?.content?.trim();
    const preview = previewSource && previewSource.length > 0 ? previewSource : 'New conversation';
    const previewSnippet =
      preview.length > 120 ? `${preview.slice(0, 117)}…` : preview;

    return (
      <div
        key={thread.id}
        onClick={() => setActiveThreadId(thread.id)}
        className={`group relative cursor-pointer rounded-2xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          isActive
            ? 'border-sky-500/60 bg-sky-500/10 shadow-lg shadow-sky-900/30'
            : 'border-white/5 bg-white/5 hover:border-sky-500/40 hover:bg-white/10'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setActiveThreadId(thread.id);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="truncate">{thread.title}</span>
              {thread.pinned && <span title="Pinned" className="text-yellow-300">📌</span>}
              {thread.archived && <span title="Archived" className="text-slate-400">📦</span>}
              {thread.branchedFrom && (
                <span className="text-xs text-purple-300" title="Branched conversation">🌿</span>
              )}
            </div>
            <div className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {previewSnippet}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
              <span>{formatTimestamp(lastTimestamp)}</span>
              {thread.folder && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                  📁 {thread.folder}
                </span>
              )}
              {thread.tags && thread.tags.length > 0 && (
                <span className="line-clamp-1">🏷️ {thread.tags.slice(0, 3).join(', ')}{thread.tags.length > 3 ? '…' : ''}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setEditingOptionsThreadId(thread.id);
              }}
              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-400/40 hover:text-sky-200"
              title="Thread options"
            >
              🛠️
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                togglePinThread(thread.id);
              }}
              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] text-slate-200 hover:border-yellow-400/40 hover:text-yellow-200"
              title={thread.pinned ? 'Unpin thread' : 'Pin thread'}
            >
              📌
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                toggleArchiveThread(thread.id);
              }}
              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] text-slate-200 hover:border-blue-400/40 hover:text-blue-200"
              title={thread.archived ? 'Unarchive thread' : 'Archive thread'}
            >
              {thread.archived ? '📂' : '📦'}
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                deleteThread(thread.id);
              }}
              className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] text-rose-300 hover:border-rose-400/40 hover:text-rose-200"
              title="Delete thread"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
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
    <div className="relative flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-sm font-medium text-slate-200 shadow-lg backdrop-blur transition hover:border-sky-500/40 hover:text-white lg:hidden"
        aria-label="Toggle sidebar"
      >
        <span className="text-base">{sidebarOpen ? '✕' : '☰'}</span>
        <span className="text-xs uppercase tracking-widest">Menu</span>
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/10 bg-slate-950/70 backdrop-blur transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Conversations</p>
                <h2 className="text-lg font-semibold text-white">Agent workspace</h2>
              </div>
              <button
                onClick={createNewThread}
                className="rounded-lg border border-sky-500/60 bg-sky-500/20 px-3 py-1.5 text-sm font-semibold text-sky-100 shadow-sm transition hover:border-sky-400 hover:bg-sky-500/30"
                title="Cmd/Ctrl + K"
              >
                + New
              </button>
            </div>
            <div className="relative mt-4">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">🔍</span>
              <input
                type="text"
                placeholder="Search by title, tag, or content"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/60 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-white"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="rounded-full bg-white/5 px-2 py-0.5">⌘K new chat</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5">⌘⇧L delete chat</span>
              {showArchived && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-200">Showing archived</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              {allFolders.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">Folders</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedFolder(null)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selectedFolder === null
                          ? 'border-sky-500/40 bg-sky-500/10 text-white'
                          : 'border-white/5 bg-white/5 text-slate-300 hover:border-sky-500/30 hover:text-white'
                      }`}
                    >
                      All conversations
                    </button>
                    {allFolders.map((folder) => (
                      <button
                        key={folder}
                        onClick={() => setSelectedFolder(folder)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selectedFolder === folder
                            ? 'border-sky-500/40 bg-sky-500/10 text-white'
                            : 'border-white/5 bg-white/5 text-slate-300 hover:border-sky-500/30 hover:text-white'
                        }`}
                      >
                        {folder}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {allTags.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            setSelectedTags((prev) =>
                              prev.includes(tag)
                                ? prev.filter((value) => value !== tag)
                                : [...prev, tag]
                            );
                          }}
                          className={`rounded-full px-3 py-1 text-xs transition ${
                            isSelected
                              ? 'bg-sky-500 text-black shadow shadow-sky-500/30'
                              : 'bg-white/5 text-slate-300 hover:bg-sky-500/20 hover:text-white'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-900 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Show archived ({archivedCount})</span>
                </label>
                {(selectedFolder || selectedTags.length > 0 || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedFolder(null);
                      setSelectedTags([]);
                      setSearchQuery('');
                    }}
                    className="text-[11px] font-medium text-sky-300 underline-offset-4 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {loadingThreads ? (
                  <ThreadListSkeleton />
                ) : filteredThreads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                    {searchQuery || selectedTags.length > 0 || selectedFolder
                      ? 'No conversations match the current filters.'
                      : 'Create your first conversation to get started.'}
                  </div>
                ) : (
                  <>
                    {pinnedThreads.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500">
                          <span>Pinned</span>
                          <span className="text-slate-600">{pinnedThreads.length}</span>
                        </div>
                        <div className="space-y-2">
                          {pinnedThreads.map((thread) => renderThreadCard(thread))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        <span>Recent</span>
                        <span className="text-slate-600">{regularThreads.length}</span>
                      </div>
                      <div className="space-y-2">
                        {regularThreads.map((thread) => renderThreadCard(thread))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-white/10 bg-slate-950/80 px-6 py-5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-sky-400">
                <span>Agent Control Room</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
                  Live
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white">FROK Agent</h1>
                {exportSuccess && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-200 animate-pulse">
                    ✓ Exported
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  🧠 {modelName}
                </span>
                {activeThread?.agentStyle && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 capitalize">
                    🎨 {activeThread.agentStyle}
                  </span>
                )}
                {activeThread?.enabledTools && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    🧰 {activeThread.enabledTools.length} tools
                  </span>
                )}
                {activeThread?.projectContext && (
                  <span className="line-clamp-1 max-w-xs text-slate-400">
                    📋 {activeThread.projectContext}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-xs text-slate-200 shadow-sm">
                <button
                  onClick={() => setDensity('cozy')}
                  className={`px-3 py-1.5 transition ${
                    !isCompact ? 'bg-sky-500/20 text-white' : 'hover:bg-white/10'
                  }`}
                >
                  Cozy
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`px-3 py-1.5 transition ${
                    isCompact ? 'bg-sky-500/20 text-white' : 'hover:bg-white/10'
                  }`}
                >
                  Compact
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowMemoryModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
                  title="Agent core memory"
                >
                  🧠 Memory
                </button>
                <button
                  onClick={() => setShowUserMemoriesModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
                  title="View stored user memories"
                >
                  📚 Notebook
                </button>
                <button
                  onClick={() => setShowTTSSettings(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
                  title="Text-to-speech settings"
                >
                  🔊 Voice
                </button>
                {activeThread && activeThread.messages.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
                    >
                      🔗 Share
                    </button>
                    <div className="relative export-menu-container">
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
                      >
                        📥 Export
                      </button>
                      {showExportMenu && (
                        <div className="absolute right-0 top-full mt-2 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 text-sm shadow-xl">
                          <button
                            onClick={handleExportDownload}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-200 transition hover:bg-slate-800"
                          >
                            💾 Download Markdown
                          </button>
                          <button
                            onClick={handleExportCopy}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-slate-200 transition hover:bg-slate-800"
                          >
                            📋 Copy Markdown
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <ChatKitLauncher />
              </div>
            </div>
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
            const isAssistant = msg.role === 'assistant';
            const isEditing = msg.role === 'user' && editingMessageId === msg.id;
            const bubbleWidthClass = isCompact ? 'max-w-2xl' : 'max-w-3xl';
            const bubblePaddingClass = isCompact ? 'px-4 py-3' : 'px-5 py-4';

            const metadataBadges: React.ReactNode[] = [];
            if (toolSourceLabel) {
              metadataBadges.push(
                <span
                  key="tool-source"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                >
                  ⚙️ {toolSourceLabel}
                </span>
              );
            }
            if (msg.toolsUsed && msg.toolsUsed.length > 0) {
              metadataBadges.push(
                <span
                  key="tools"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                >
                  🔧 {msg.toolsUsed.join(', ')}
                </span>
              );
            }
            if (typeof msg.executionTime === 'number') {
              metadataBadges.push(
                <span
                  key="execution"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                >
                  ⏱️ {(msg.executionTime / 1000).toFixed(2)}s
                </span>
              );
            }

            const actionButtons: React.ReactNode[] = [
              <button
                key="copy"
                onClick={() => copyMessageToClipboard(msg)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/20 hover:text-white"
              >
                📋 Copy
              </button>,
            ];

            if (isAssistant && !msg.isRegenerating) {
              if (currentMessageId === msg.id && ttsState !== 'idle') {
                if (ttsState === 'speaking') {
                  actionButtons.push(
                    <button
                      key="pause"
                      onClick={pause}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/20 hover:text-white"
                      title="Pause voice playback"
                    >
                      ⏸️ Pause
                    </button>
                  );
                } else {
                  actionButtons.push(
                    <button
                      key="resume"
                      onClick={resume}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/20 hover:text-white"
                      title="Resume voice playback"
                    >
                      ▶️ Resume
                    </button>
                  );
                }
                actionButtons.push(
                  <button
                    key="stop"
                    onClick={stop}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-white"
                    title="Stop voice playback"
                  >
                    ⏹️ Stop
                  </button>
                );
              } else {
                actionButtons.push(
                  <button
                    key="tts"
                    onClick={() => speak(msg.content, msg.id)}
                    disabled={ttsState !== 'idle'}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/20 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500"
                    title="Read response aloud"
                  >
                    🔊 Listen
                  </button>
                );
              }
              actionButtons.push(
                <button
                  key="regenerate"
                  onClick={() => regenerateResponse(msgIndex)}
                  disabled={loading || isStreaming}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/20 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500"
                  title="Regenerate response"
                >
                  🔄 Regenerate
                </button>
              );
            }

            if (msg.role === 'user' && !isEditing) {
              actionButtons.push(
                <button
                  key="branch"
                  onClick={() => createBranch(msgIndex)}
                  disabled={loading || isStreaming}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-purple-400/40 hover:bg-purple-500/20 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500"
                  title="Branch conversation from here"
                >
                  🌿 Branch
                </button>
              );
              actionButtons.push(
                <button
                  key="edit"
                  onClick={() => startEditMessage(msg.id, msg.content)}
                  disabled={loading || isStreaming}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/20 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500"
                  title="Edit and re-run message"
                >
                  ✏️ Edit
                </button>
              );
            }

            const showActionRow = metadataBadges.length > 0 || actionButtons.length > 0;

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-3 ${
                  isAssistant ? 'justify-start' : 'justify-end'
                }`}
              >
                {isAssistant && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-lg">
                    AI
                  </div>
                )}

                <div
                  className={`${bubbleWidthClass} ${bubblePaddingClass} relative rounded-3xl border shadow-xl shadow-slate-900/30 backdrop-blur transition ${
                    isAssistant
                      ? 'border-white/10 bg-white/5 text-slate-100 rounded-tl-xl'
                      : 'border-sky-500/40 bg-gradient-to-br from-sky-500 via-indigo-500 to-blue-600 text-white rounded-tr-xl'
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em]">
                      <span className={isAssistant ? 'text-sky-200' : 'text-white/80'}>
                        {isAssistant ? activeThread?.agentName ?? 'FROK Assistant' : 'You'}
                      </span>
                      {isAssistant && msg.routing && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200">
                          🧠 {msg.routing === 'orchestrator' ? 'Orchestrated' : 'Direct'}
                        </span>
                      )}
                      {isAssistant && msg.model && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200">
                          🧩 {msg.model}
                        </span>
                      )}
                      {isAssistant && msg.complexity && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] capitalize text-slate-200">
                          📊 {msg.complexity}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                      {typeof msg.timestamp === 'number' && <span>{formatTimestamp(msg.timestamp)}</span>}
                      {typeof msg.latencyMs === 'number' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200">
                          ⚡ {(msg.latencyMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {msg.images && msg.images.length > 0 && (
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      {msg.images.map((img, i) => (
                        <div key={i} className="overflow-hidden rounded-xl border border-white/10">
                          <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                          <div className="bg-black/60 px-2 py-1 text-[10px] text-white">
                            {img.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white focus:border-sky-500/60 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        rows={4}
                        autoFocus
                        placeholder="Edit your message..."
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => saveEditedMessage(msgIndex)}
                          disabled={!editContent.trim() || loading}
                          className="inline-flex items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500"
                        >
                          💾 Save & Re-run
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-white"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <MessageContent content={msg.content} role={msg.role} />
                  )}

                  {msg.files && msg.files.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                      {msg.files.map((file, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1"
                        >
                          📎 {file.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.role === 'assistant' && msg.isRegenerating && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-sky-200">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400"></span>
                      Regenerating...
                    </div>
                  )}

                  {showActionRow && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-slate-300">
                      <div className="flex flex-wrap gap-2">{metadataBadges}</div>
                      <div className="flex flex-wrap items-center gap-2 opacity-0 transition group-hover:opacity-100">
                        {actionButtons}
                      </div>
                    </div>
                  )}
                </div>

                {!isAssistant && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white shadow-lg">
                    U
                  </div>
                )}
              </div>
            );
          })}
          {isStreaming && streamingContent && (
            <div className="group flex items-start gap-3 justify-start">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-lg">
                AI
              </div>

              <div
                className={`${isCompact ? 'max-w-2xl px-4 py-3' : 'max-w-3xl px-5 py-4'} rounded-3xl border border-sky-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950/80 text-slate-100 shadow-xl shadow-slate-900/30 backdrop-blur`}
              >
                {streamingMeta && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-sky-200">
                    {streamingMeta.routing && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px]">
                        🧠 {streamingMeta.routing === 'orchestrator' ? 'Orchestrated' : 'Direct'}
                      </span>
                    )}
                    {streamingMeta.model && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px]">
                        🧩 {streamingMeta.model}
                      </span>
                    )}
                    {streamingMeta.complexity && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px] capitalize">
                        📊 {streamingMeta.complexity}
                      </span>
                    )}
                    {streamingMeta.tools && streamingMeta.tools.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px]">
                        🔧 {streamingMeta.tools.join(', ')}
                      </span>
                    )}
                    {streamingMeta.toolSource && formatToolSource(streamingMeta.toolSource) && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px]">
                        ⚙️ {formatToolSource(streamingMeta.toolSource)}
                      </span>
                    )}
                  </div>
                )}
                <MessageContent content={streamingContent} role="assistant" />
                <div className="mt-3 flex items-center gap-2 text-xs text-sky-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400"></span>
                  Streaming…
                </div>
              </div>
            </div>
          )}
          {loading && !isStreaming && (
            <div className="group flex items-start gap-3 justify-start">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-lg">
                AI
              </div>

              <div className={`${isCompact ? 'max-w-2xl px-4 py-3' : 'max-w-3xl px-5 py-4'} rounded-3xl border border-white/10 bg-white/5 text-slate-100 shadow-xl shadow-slate-900/30 backdrop-blur`}> 
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400"></span>
                  Preparing response…
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-8 z-10 rounded-full border border-white/10 bg-slate-950/80 p-3 text-white shadow-xl backdrop-blur transition hover:border-sky-500/40 hover:bg-sky-500/20 hover:text-white hover:shadow-sky-900/40"
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
        <div className="border-t border-white/10 bg-slate-950/80 px-6 py-5 backdrop-blur">
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
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-xl border border-white/10"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f !== file))
                        }
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-rose-500/80 text-xs text-white opacity-0 transition hover:bg-rose-500 group-hover:opacity-100"
                      >
                        ×
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-[10px] text-white">
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
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                    >
                      <span>📎 {file.name}</span>
                      <button
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f !== file))
                        }
                        className="text-slate-400 transition hover:text-rose-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex gap-3">
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
              className="group relative inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500"
              title="Attach images (Vision enabled)"
            >
              🖼️
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md border border-white/10 bg-slate-900/90 px-2 py-1 text-[10px] text-white opacity-0 shadow-lg transition group-hover:opacity-100 whitespace-nowrap">
                Vision enabled
              </span>
            </button>

            {/* Voice Input Button */}
            <button
              onClick={handleVoiceInput}
              disabled={loading || recordingState === 'processing'}
              className={`group relative inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition ${
                recordingState === 'recording'
                  ? 'border-rose-500/60 bg-rose-500/20 text-rose-100 animate-pulse'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white'
              } disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500`}
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
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md border border-white/10 bg-slate-900/90 px-2 py-1 text-[10px] text-white opacity-0 shadow-lg transition group-hover:opacity-100 whitespace-nowrap">
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
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/60 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              disabled={loading}
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="rounded-xl border border-rose-500/60 bg-rose-500/20 px-5 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-400/60 hover:bg-rose-500/30"
              >
                ⬛ Stop
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={loading || (!input.trim() && files.length === 0)}
                className="rounded-xl bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-500"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/90 px-6 py-6 text-slate-100 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Share Conversation</h2>
            <p className="mt-1 text-sm text-slate-400">
              Generate a secure link to share this conversation with collaborators.
            </p>

            {shareUrl ? (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Share link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    />
                    <button
                      onClick={copyShareUrl}
                      className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/30"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Anyone with this link can view this conversation in read-only mode.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareUrl(null);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-slate-300">
                  Decide how long your share link should remain available.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleShare()}
                    disabled={shareLoading}
                    className="w-full rounded-lg border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                  >
                    {shareLoading ? 'Creating…' : 'Create permanent link'}
                  </button>
                  <button
                    onClick={() => handleShare(7)}
                    disabled={shareLoading}
                    className="w-full rounded-lg border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                  >
                    {shareLoading ? 'Creating…' : 'Create link (7-day expiry)'}
                  </button>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-white"
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
