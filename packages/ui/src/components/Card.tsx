import * as React from 'react';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
};

export function Card({ className, ...props }: CardProps) {
  const base = 'rounded-2xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-sm';
  return <div className={[base, className].filter(Boolean).join(' ')} {...props} />;
}
