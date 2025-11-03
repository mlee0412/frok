'use client';

import React from 'react';

export interface VerticalStackProps {
  children: React.ReactNode;
  gap?: string;
  className?: string;
}

export function VerticalStack({ children, gap = '12px', className = '' }: VerticalStackProps) {
  return (
    <div
      className={`lovelace-vertical-stack ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}
