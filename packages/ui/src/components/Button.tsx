import * as React from 'react';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

function cx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(' ');
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium border focus-visible:outline-none focus-visible:ring-2 transition';
    const sizes: Record<Size, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-4 text-sm',
      lg: 'h-11 px-5 text-base',
    };
    const variants: Record<Variant, string> = {
      primary:
        'bg-[var(--color-surface)] text-[var(--color-primary)] border-[var(--color-primary)] hover:opacity-90 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/20',
      outline:
        'bg-transparent text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-surface)] focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/20',
      ghost:
        'bg-transparent text-[var(--color-foreground)] border-transparent hover:bg-[var(--color-surface)] focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-black/20',
    };

    return (
      <button ref={ref} className={cx(base, sizes[size], variants[variant], className)} {...props} />
    );
  }
);

Button.displayName = 'Button';
