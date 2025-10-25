import { supabaseClient } from './supabaseClient';

export type PresenceMeta = { typing?: boolean; email?: string };

export type PresenceControls = {
  leave: () => void;
  setTyping: (typing: boolean) => void;
  getState: () => Record<string, PresenceMeta[]>;
};

export function joinThreadPresence(
  threadId: string,
  key: string,
  payload: PresenceMeta = {},
  onSync?: (state: Record<string, PresenceMeta[]>) => void,
): PresenceControls {
  const supa = supabaseClient();
  const channel = supa.channel(`presence:chat:${threadId}`, {
    config: { presence: { key } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    try { onSync?.(channel.presenceState() as unknown as Record<string, PresenceMeta[]>); } catch {}
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
    getState: () => channel.presenceState() as unknown as Record<string, PresenceMeta[]>,
  };
}
