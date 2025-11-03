'use client';

import React from 'react';

export interface GridLayoutProps {
  children: React.ReactNode;
  columns?: number;
  gap?: string;
  className?: string;
}

export function GridLayout({ children, columns = 2, gap = '12px', className = '' }: GridLayoutProps) {
  return (
    <div
      className={`lovelace-grid-layout ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}
