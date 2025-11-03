'use client';
import * as React from 'react';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

// Helper function to get translations - works in both apps/web and other contexts
function useTranslationsOrFallback(namespace: string) {
  try {
    // Try to import from apps/web i18n provider
    const { useTranslations } = require('@/lib/i18n/I18nProvider');
    return useTranslations(namespace);
  } catch {
    // Fallback for non-i18n contexts - return English strings
    return (key: string) => {
      const fallbacks: Record<string, string> = {
        'title': 'Conversations',
        'new': 'New',
        'searchPlaceholder': 'Search',
        'archived': 'Archived',
        'untitled': 'Untitled',
        'pin': 'Pin',
        'unpin': 'Unpin',
        'archive': 'Archive',
        'unarchive': 'Unarchive',
        'delete': 'Del',
        'noThreads': 'No threads yet.',
        'deleteTitle': 'Delete Conversation',
        'deleteDescription': 'Are you sure you want to delete this conversation? This action cannot be undone.',
        'deleteButton': 'Delete',
        'cancel': 'Cancel',
      };
      return fallbacks[key] || key;
    };
  }
}

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
  const t = useTranslationsOrFallback('chat.sidebar');
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  return (
    <aside className={[
      'w-64 h-[100dvh] sticky top-0 border-r border-border bg-surface/60 backdrop-blur-sm flex flex-col',
      className,
    ].filter(Boolean).join(' ')}>
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="text-sm font-semibold flex-1">{t('title')}</div>
        <Button size="sm" variant="outline" onClick={onNew}>{t('new')}</Button>
      </div>
      <div className="p-2 border-b border-border flex items-center gap-2">
        <input
          value={search || ''}
          onChange={(e) => onSearch?.(e.currentTarget.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full border border-border rounded px-2 py-1 bg-transparent text-sm"
        />
        <label className="flex items-center gap-1 text-xs text-foreground/70">
          <input type="checkbox" checked={!!showArchived} onChange={(e) => onToggleShowArchived?.(e.currentTarget.checked)} />
          {t('archived')}
        </label>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.map((thread) => (
          <div
            key={thread.id}
            role="button"
            tabIndex={0}
            className={[
              'w-full text-left rounded-md px-3 py-2 text-sm border',
              thread.id === currentId ? 'border-primary text-primary bg-surface' : 'border-transparent hover:bg-surface text-foreground/80',
            ].join(' ')}
            onClick={() => onSelect(thread.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(thread.id); } }}
          >
            <div className="flex items-center gap-2">
              <div className="truncate flex-1">{thread.title || t('untitled')}</div>
              <div className="flex items-center gap-1 text-xs">
                <button type="button" className="border rounded px-1 py-0.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin?.(thread.id, !thread.pinned); }}>{thread.pinned ? t('unpin') : t('pin')}</button>
                <button type="button" className="border rounded px-1 py-0.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArchive?.(thread.id, !thread.archived); }}>{thread.archived ? t('unarchive') : t('archive')}</button>
                <button type="button" className="border rounded px-1 py-0.5 hover:border-red-500 hover:text-red-500 transition" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirmId(thread.id); }}>{t('delete')}</button>
              </div>
            </div>
          </div>
        ))}
        {threads.length === 0 && (
          <div className="text-xs text-foreground/60 p-3">{t('noThreads')}</div>
        )}
      </nav>
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title={t('deleteTitle')}
        description={t('deleteDescription')}
        confirmLabel={t('deleteButton')}
        cancelLabel={t('cancel')}
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
