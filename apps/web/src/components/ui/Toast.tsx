import { forwardRef, useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  /**
   * Toast message
   */
  message: string;

  /**
   * Toast variant
   * @default 'info'
   */
  variant?: 'success' | 'error' | 'warning' | 'info';

  /**
   * Duration in milliseconds before auto-dismiss
   * @default 5000
   */
  duration?: number;

  /**
   * Callback when toast is dismissed
   */
  onDismiss?: () => void;

  /**
   * Whether to show the toast
   */
  isOpen?: boolean;
}

/**
 * Toast - Temporary notification component
 *
 * Features:
 * - Auto-dismiss after duration
 * - Manual dismiss with X button
 * - Animated slide-in from bottom
 * - Semantic variants (success/error/warning/info)
 *
 * @example
 * ```tsx
 * <Toast message="Device updated successfully" variant="success" />
 * ```
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      message,
      variant = 'info',
      duration = 5000,
      onDismiss,
      isOpen = true,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(isOpen);

    useEffect(() => {
      setIsVisible(isOpen);
    }, [isOpen]);

    useEffect(() => {
      if (isVisible && duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
      }
    }, [isVisible, duration]);

    const handleDismiss = () => {
      setIsVisible(false);
      setTimeout(() => {
        onDismiss?.();
      }, 300); // Wait for exit animation
    };

    if (!isVisible) return null;

    const variantConfig = {
      success: {
        icon: CheckCircle,
        bg: 'bg-success/10',
        border: 'border-success/30',
        text: 'text-success',
      },
      error: {
        icon: AlertCircle,
        bg: 'bg-danger/10',
        border: 'border-danger/30',
        text: 'text-danger',
      },
      warning: {
        icon: AlertTriangle,
        bg: 'bg-warning/10',
        border: 'border-warning/30',
        text: 'text-warning',
      },
      info: {
        icon: Info,
        bg: 'bg-info/10',
        border: 'border-info/30',
        text: 'text-info',
      },
    };

    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={`
          fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2
          z-50 w-full max-w-md mx-4
          ${isVisible ? 'animate-slide-up' : 'animate-slide-down'}
        `}
      >
        <div
          className={`
            flex items-center gap-3 p-4 rounded-lg border
            shadow-lg backdrop-blur-sm
            ${config.bg} ${config.border}
          `}
        >
          <Icon size={20} className={config.text} />
          <p className={`flex-1 text-sm font-medium ${config.text}`}>
            {message}
          </p>
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 p-1 rounded-md
              hover:bg-surface/50 transition-colors
              ${config.text}
            `}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }
);

Toast.displayName = 'Toast';

/**
 * ToastContainer - Manages multiple toasts
 */
export interface ToastItem {
  id: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer = forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ toasts, onDismiss }, ref) => {
    return (
      <div ref={ref} className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            onDismiss={() => onDismiss(toast.id)}
            isOpen={true}
          />
        ))}
      </div>
    );
  }
);

ToastContainer.displayName = 'ToastContainer';
