'use client';

import React from 'react';

export interface HorizontalStackProps {
  children: React.ReactNode;
  gap?: string;
  className?: string;
}

export function HorizontalStack({ children, gap = '12px', className = '' }: HorizontalStackProps) {
  return (
    <div
      className={`lovelace-horizontal-stack ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}
