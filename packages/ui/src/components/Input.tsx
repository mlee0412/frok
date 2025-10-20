import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const base = 'h-9 w-full rounded-md bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring,#22d3ee)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/20';
    return <input ref={ref} className={[base, className].filter(Boolean).join(' ')} {...props} />;
  }
);

Input.displayName = 'Input';
