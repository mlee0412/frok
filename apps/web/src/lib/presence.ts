import { supabaseClient } from './supabaseClient';

export type PresenceControls = {
  leave: () => void;
  setTyping: (typing: boolean) => void;
  getState: () => Record<string, any[]>;
};

export function joinThreadPresence(
  threadId: string,
  key: string,
  payload: { typing?: boolean; email?: string } = {},
  onSync?: (state: Record<string, any[]>) => void,
): PresenceControls {
  const supa = supabaseClient();
  const channel = supa.channel(`presence:chat:${threadId}`, {
    config: { presence: { key } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    try { onSync?.(channel.presenceState()); } catch {}
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.track({ typing: false, ...payload });
    }
  });

  return {
    leave: () => {
      try { channel.unsubscribe(); } catch {}
      try { supa.removeChannel(channel); } catch {}
    },
    setTyping: (typing: boolean) => {
      try { channel.track({ typing }); } catch {}
    },
    getState: () => channel.presenceState(),
  };
}
