import { useEffect, useCallback, useRef } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command key on Mac
};

export type KeyboardShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Hook for handling keyboard shortcuts
 * @example
 * useKeyboardShortcut({ key: 's', ctrl: true }, () => {
 *   console.log('Ctrl+S pressed');
 * });
 */
export function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  handler: KeyboardShortcutHandler,
  options: {
    enabled?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {}
): void {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options;
  const handlerRef = useRef(handler);

  // Keep handler ref up to date
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const matchesCtrl = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
      const matchesShift = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
      const matchesAlt = shortcut.alt === undefined || event.altKey === shortcut.alt;
      const matchesMeta = shortcut.meta === undefined || event.metaKey === shortcut.meta;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        handlerRef.current(event);
      }
    },
    [shortcut, enabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for handling multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{ shortcut: KeyboardShortcut; handler: KeyboardShortcutHandler }>,
  options: { enabled?: boolean } = {}
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const { shortcut, handler } of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
        const matchesShift = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
        const matchesAlt = shortcut.alt === undefined || event.altKey === shortcut.alt;
        const matchesMeta = shortcut.meta === undefined || event.metaKey === shortcut.meta;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          event.preventDefault();
          handler(event);
          break; // Only handle first match
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Common keyboard shortcuts
 */
export const commonShortcuts = {
  save: { key: 's', ctrl: true },
  close: { key: 'Escape' },
  search: { key: '/', ctrl: true },
  help: { key: '?' },
  newItem: { key: 'n', ctrl: true },
  delete: { key: 'Backspace', ctrl: true },
} as const;
