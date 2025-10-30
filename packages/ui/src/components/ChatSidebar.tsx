'use client';
import * as React from 'react';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

export type Thread = { id: string; title: string; pinned?: boolean; archived?: boolean; deleted_at?: string | null };

export type ChatSidebarProps = {
  threads: Thread[];
  currentId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  search?: string;
  onSearch?: (q: string) => void;
  showArchived?: boolean;
  onToggleShowArchived?: (v: boolean) => void;
  onPin?: (id: string, pinned: boolean) => void;
  onArchive?: (id: string, archived: boolean) => void;
  onDelete?: (id: string) => void;
  className?: string;
};

export function ChatSidebar({ threads, currentId, onSelect, onNew, search, onSearch, showArchived, onToggleShowArchived, onPin, onArchive, onDelete, className }: ChatSidebarProps) {
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  return (
    <aside className={[
      'w-64 h-[100dvh] sticky top-0 border-r border-border bg-surface/60 backdrop-blur-sm flex flex-col',
      className,
    ].filter(Boolean).join(' ')}>
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="text-sm font-semibold flex-1">Conversations</div>
        <Button size="sm" variant="outline" onClick={onNew}>New</Button>
      </div>
      <div className="p-2 border-b border-border flex items-center gap-2">
        <input
          value={search || ''}
          onChange={(e) => onSearch?.(e.currentTarget.value)}
          placeholder="Search"
          className="w-full border border-border rounded px-2 py-1 bg-transparent text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-foreground/70">
          <input type="checkbox" checked={!!showArchived} onChange={(e) => onToggleShowArchived?.(e.currentTarget.checked)} />
          Archived
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.map((t) => (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            className={[
              'w-full text-left rounded-md px-3 py-2 text-sm border',
              t.id === currentId ? 'border-primary text-primary bg-surface' : 'border-transparent hover:bg-surface text-foreground/80',
            ].join(' ')}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(t.id); } }}
          >
            <div className="flex items-center gap-2">
              <div className="truncate flex-1">{t.title || 'Untitled'}</div>
              <div className="flex items-center gap-1 text-xs">
                <button type="button" className="border rounded px-1 py-0.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin?.(t.id, !t.pinned); }}>{t.pinned ? 'Unpin' : 'Pin'}</button>
                <button type="button" className="border rounded px-1 py-0.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive?.(t.id, !t.archived); }}>{t.archived ? 'Unarchive' : 'Archive'}</button>
                <button type="button" className="border rounded px-1 py-0.5 hover:border-red-500 hover:text-red-500 transition" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(t.id); }}>Del</button>
              </div>
            </div>
          </div>
        ))}
        {threads.length === 0 && (
          <div className="text-xs text-foreground/60 p-3">No threads yet.</div>
        )}
      </nav>
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) {
            onDelete?.(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
      />
    </aside>
  );
}
