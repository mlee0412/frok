'use client';

import * as React from 'react';
import { Button } from './Button';

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading && !loading) {
      onOpenChange(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Handle Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  // Auto-focus cancel button and implement focus trap
  React.useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus cancel button on open
    cancelButtonRef.current?.focus();

    // Focus trap implementation
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleTabKey);

    return () => {
      dialog.removeEventListener('keydown', handleTabKey);
      // Restore focus on close
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  const variantStyles = {
    danger: 'border-red-500/20 bg-red-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    info: 'border-sky-500/20 bg-sky-500/5',
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        ref={dialogRef}
        className={`bg-background border ${variantStyles[variant]} rounded-lg p-6 max-w-md w-full shadow-2xl animate-slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-foreground mb-2"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="text-sm text-foreground/70 mb-6"
        >
          {description}
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isLoading || loading}
            className={variant === 'danger' ? 'border-red-500 text-red-500 hover:bg-red-500/10' : ''}
          >
            {isLoading || loading ? 'Loading...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook for easier usage
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange'> | null>(null);

  const confirm = React.useCallback((options: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        ...options,
        onConfirm: async () => {
          await options.onConfirm();
          resolve(true);
        },
      });
      setIsOpen(true);
    });
  }, []);

  const dialog = config ? (
    <ConfirmDialog
      {...config}
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setConfig(null);
        }
      }}
    />
  ) : null;

  return { confirm, dialog };
}
