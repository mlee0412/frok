'use client';
import * as React from 'react';

export type ToastItem = {
  id: string;
  message: string;
  variant?: 'default' | 'success' | 'error' | 'info';
  duration?: number; // ms
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, 'id'>) => string;
  remove: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const timeoutsRef = React.useRef<Record<string, number>>({});

  const remove = React.useCallback((id: string) => {
    const t = timeoutsRef.current[id];
    if (t) {
      window.clearTimeout(t);
      delete timeoutsRef.current[id];
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const item: ToastItem = { id, duration: 2800, variant: 'default', ...t };
    setItems((prev) => [...prev, item]);
    if (item.duration && item.duration > 0) {
      if (timeoutsRef.current[id]) {
        window.clearTimeout(timeoutsRef.current[id]);
        delete timeoutsRef.current[id];
      }
      timeoutsRef.current[id] = window.setTimeout(() => remove(id), item.duration) as unknown as number;
    }
    return id;
  }, [remove]);

  React.useEffect(() => {
    return () => {
      // clear all pending timeouts on unmount
      const all = Object.values(timeoutsRef.current);
      for (const tid of all) window.clearTimeout(tid);
      timeoutsRef.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[92vw] sm:max-w-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={[
              'rounded-md px-3 py-2 shadow-lg border backdrop-blur supports-[backdrop-filter]:bg-white/10',
              t.variant === 'success' ? 'border-green-400/30 text-green-300' :
              t.variant === 'error' ? 'border-red-400/30 text-red-300' :
              t.variant === 'info' ? 'border-cyan-400/30 text-cyan-300' :
              'border-white/15 text-white/90',
            ].join(' ')}
          >
            <div className="flex items-start gap-3">
              <div className="text-sm flex-1">{t.message}</div>
              <button
                aria-label="Close notification"
                className="text-xs opacity-70 hover:opacity-100"
                onClick={() => remove(t.id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <Toaster>');
  const { push, remove } = ctx;
  return {
    show: (message: string, variant?: ToastItem['variant'], duration?: number) =>
      push({ message, variant, duration }),
    success: (message: string, duration?: number) => push({ message, variant: 'success', duration }),
    error: (message: string, duration?: number) => push({ message, variant: 'error', duration }),
    info: (message: string, duration?: number) => push({ message, variant: 'info', duration }),
    remove,
  };
}
