'use client';
import * as React from 'react';
import { Button } from './Button';

export type Agent = { id: string; name: string };

export type ThreadHeaderProps = {
  title?: string;
  agentId?: string;
  agents?: Agent[];
  onChangeAgent?: (id: string) => void;
  userEmail?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  editableTitle?: boolean;
  onRename?: (title: string) => void;
  onlineCount?: number;
  typingLabel?: string | null;
  toolsEnabled?: boolean;
  onToggleTools?: (enabled: boolean) => void;
  className?: string;
};

export function ThreadHeader({ title = 'New chat', agentId, agents = [], onChangeAgent, className, userEmail, onSignIn, onSignOut, editableTitle, onRename, onlineCount = 0, typingLabel, toolsEnabled, onToggleTools }: ThreadHeaderProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(title);
  React.useEffect(() => { setDraft(title); }, [title]);
  return (
    <div className={[
      'w-full border-b border-border bg-surface/60 backdrop-blur-sm',
      className,
    ].filter(Boolean).join(' ')}>
      <div className="container-app px-3 py-2 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input className="flex-1 min-w-0 border border-border rounded px-2 py-1 bg-transparent text-sm" value={draft} onChange={(e) => setDraft(e.currentTarget.value)} />
              <Button size="sm" onClick={() => { setEditing(false); onRename?.(draft.trim() || 'Untitled'); }}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setDraft(title); }}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold" title={title}>{title}</div>
              {editableTitle && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-foreground/60">Agent</div>
          <select
            value={agentId}
            onChange={(e) => onChangeAgent?.(e.currentTarget.value)}
            className="border border-border rounded px-2 py-1 text-sm bg-transparent"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 text-xs ml-1">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={!!toolsEnabled} onChange={(e) => onToggleTools?.(e.currentTarget.checked)} />
            Tools
          </label>
        </div>
        <div className="flex items-center gap-2 text-xs ml-1 min-w-[100px]">
          {onlineCount > 0 && (
            <div className="text-foreground/60">{onlineCount} online</div>
          )}
          {typingLabel && (
            <div className="text-primary/80 truncate max-w-[180px]" title={typingLabel}>{typingLabel}</div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {userEmail ? (
            <>
              <div className="text-xs text-foreground/60 truncate max-w-[200px]" title={userEmail}>{userEmail}</div>
              <Button size="sm" variant="outline" onClick={() => onSignOut?.()}>Sign out</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onSignIn?.()}>Sign in</Button>
          )}
        </div>
      </div>
    </div>
  );
}
