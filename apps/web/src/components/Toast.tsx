'use client';

type ToastProps = {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
};

export function Toast({ message, type, onDismiss }: ToastProps) {
  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-sky-600',
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }[type];

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`}
      role="alert"
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="text-white/80 hover:text-white transition"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

type ToastContainerProps = {
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
