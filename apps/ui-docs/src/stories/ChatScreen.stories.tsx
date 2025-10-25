import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { ChatSidebar, ThreadHeader, ChatMessage, ChatInput } from '@frok/ui';

const meta: Meta = {
  title: 'Chat/ChatScreen',
};
export default meta;

type Thread = { id: string; title: string; pinned?: boolean; archived?: boolean; deleted_at?: string | null };

type Story = StoryObj;

export const Basic: Story = {
  render: () => <DemoChatScreen />,
};

function DemoChatScreen() {
  const [threads, setThreads] = React.useState<Thread[]>([
    { id: 't1', title: 'Welcome', pinned: true },
    { id: 't2', title: 'Ideas' },
    { id: 't3', title: 'Shopping list', archived: true },
  ]);
  const [currentId, setCurrentId] = React.useState('t1');
  const [messages, setMessages] = React.useState<{ id: string; role: 'user'|'assistant'; content: string }[]>([
    { id: 'm1', role: 'assistant', content: 'Hello! This is a demo chat.' }
  ]);
  const [search, setSearch] = React.useState('');
  const [showArchived, setShowArchived] = React.useState(false);

  const visibleThreads = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads
      .filter((t) => !t.deleted_at)
      .filter((t) => (showArchived ? true : !t.archived))
      .filter((t) => (q ? (t.title || '').toLowerCase().includes(q) : true))
      .sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)));
  }, [threads, search, showArchived]);

  function onSend(text: string) {
    setMessages((m) => [...m, { id: Math.random().toString(36).slice(2), role: 'user', content: text }]);
    setTimeout(() => setMessages((m) => [...m, { id: Math.random().toString(36).slice(2), role: 'assistant', content: 'Echo: ' + text }]), 300);
  }

  return (
    <div className="min-h-[80vh] border border-border rounded overflow-hidden flex">
      <ChatSidebar
        threads={visibleThreads}
        currentId={currentId}
        onSelect={(id) => setCurrentId(id)}
        onNew={() => setThreads((ts) => [{ id: Math.random().toString(36).slice(2), title: 'New chat' }, ...ts])}
        search={search}
        onSearch={setSearch}
        showArchived={showArchived}
        onToggleShowArchived={setShowArchived}
        onPin={(id, pinned) => setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, pinned } : t)))}
        onArchive={(id, archived) => setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, archived } : t)))}
        onDelete={(id) => setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t)))}
      />
      <main className="flex-1 flex flex-col">
        <ThreadHeader title={threads.find((t) => t.id === currentId)?.title || 'New chat'} agentId={'default'} agents={[{ id: 'default', name: 'Default' }]} editableTitle onRename={(title) => setThreads((ts) => ts.map((t) => (t.id === currentId ? { ...t, title } : t)))} />
        <div className="flex-1 p-3 space-y-2 overflow-y-auto">
          {messages.map((m) => (<ChatMessage key={m.id} role={m.role} content={m.content} />))}
        </div>
        <div className="p-3 border-t border-border">
          <ChatInput onSend={onSend} />
        </div>
      </main>
    </div>
  );
}
