import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const base = 'h-9 w-full rounded-md bg-surface border border-border px-3 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1';
    return <input ref={ref} className={[base, className].filter(Boolean).join(' ')} {...props} />;
  }
);

Input.displayName = 'Input';
