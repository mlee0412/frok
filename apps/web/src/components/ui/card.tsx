import React from 'react';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border p-4 ${className || ''}`}>{children}</div>;
}
