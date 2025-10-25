import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { useChatStore } from '../src/store/chat';

// Minimal localStorage stub for persist middleware
beforeAll(() => {
  const mem: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
    key: (i: number) => Object.keys(mem)[i] || null,
    length: 0,
  } as any;
});

beforeEach(() => {
  // Reset store state
  (useChatStore as any).setState({
    threads: [{ id: 't1', title: 'Welcome', agentId: 'default' }],
    currentId: 't1',
    messages: { t1: [] },
    creating: false,
  }, true);
});

describe('chat store', () => {
  it('creates a new thread and switches current', () => {
    const id = useChatStore.getState().newThread('New chat', 'default');
    expect(id).toBeTruthy();
    expect(useChatStore.getState().currentId).toBe(id);
    expect(useChatStore.getState().threads[0]?.id).toBe(id);
  });

  it('adds user and assistant messages and appends tokens', () => {
    const tid = useChatStore.getState().currentId!;
    const mUser = useChatStore.getState().addUserMessage(tid, 'Hello');
    expect(mUser).toBeTruthy();
    const mAsst = useChatStore.getState().startAssistantMessage(tid);
    useChatStore.getState().appendAssistantToken(tid, mAsst, 'Hi');
    const msgs = useChatStore.getState().messages[tid] || [];
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[1].role).toBe('assistant');
    expect(msgs[1].content).toBe('Hi');
  });
});
