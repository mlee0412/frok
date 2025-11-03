'use client';

import React from 'react';
import type { ThemeGradient } from './theme';
import { getCardStyles } from './theme';

export interface BaseCardProps {
  /** Entity name to display */
  name: string;
  /** Icon (mdi icon class or emoji) */
  icon?: string;
  /** Current state text */
  state?: string;
  /** Additional label/subtitle */
  label?: string;
  /** Whether the card is in active state */
  isActive?: boolean;
  /** Theme gradient to apply */
  gradient: ThemeGradient;
  /** Card height */
  height?: string;
  /** Click handler */
  onClick?: () => void;
  /** Long press handler */
  onLongPress?: () => void;
  /** Whether card is disabled/pending */
  disabled?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Custom children (overrides default layout) */
  children?: React.ReactNode;
  /** CSS class name */
  className?: string;
  /** Enable pulse animation */
  pulse?: boolean;
}

export function BaseCard({
  name,
  icon,
  state,
  label,
  isActive = true,
  gradient,
  height = '95px',
  onClick,
  onLongPress,
  disabled = false,
  loading = false,
  children,
  className = '',
  pulse = false,
}: BaseCardProps) {
  const [isPressing, setIsPressing] = React.useState(false);
  const pressTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = () => {
    if (onLongPress && !disabled) {
      setIsPressing(true);
      pressTimer.current = setTimeout(() => {
        onLongPress();
        setIsPressing(false);
      }, 500);
    }
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsPressing(false);
  };

  const handleClick = () => {
    if (onClick && !disabled && !isPressing) {
      onClick();
    }
  };

  const cardStyle: React.CSSProperties = {
    ...getCardStyles(gradient, isActive),
    height,
    padding: '14px',
    cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
    opacity: disabled ? 0.6 : 1,
    position: 'relative',
    overflow: 'hidden',
    ...(pulse && isActive && {
      animation: 'pulse 2s ease-in-out infinite',
    }),
  };

  // Custom children layout
  if (children) {
    return (
      <div
        className={`lovelace-card ${className}`}
        style={cardStyle}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {children}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[15px]">
            <div className="animate-spin h-8 w-8 border-4 border-white/20 border-t-white rounded-full" />
          </div>
        )}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // Default icon + text layout
  return (
    <div
      className={`lovelace-card ${className}`}
      style={cardStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex items-start gap-3 h-full">
        {/* Icon */}
        {icon && (
          <div
            className="flex-shrink-0"
            style={{
              color: gradient.iconColor,
              fontSize: '48px',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...(pulse && isActive && {
                animation: 'iconPulse 2s ease-in-out infinite',
                filter: `drop-shadow(0 0 10px ${gradient.iconColor})`,
              }),
            }}
          >
            {icon}
          </div>
        )}

        {/* Text content */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Name */}
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: gradient.textColor,
              letterSpacing: '0.5px',
              marginBottom: state || label ? '4px' : 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>

          {/* State */}
          {state && (
            <div
              style={{
                fontSize: '11px',
                color: gradient.textColor,
                opacity: 0.8,
                marginBottom: label ? '2px' : 0,
              }}
            >
              {state}
            </div>
          )}

          {/* Label */}
          {label && (
            <div
              style={{
                fontSize: '11px',
                color: gradient.textColor,
                opacity: 0.7,
              }}
            >
              {label}
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-[15px]">
          <div className="animate-spin h-8 w-8 border-4 border-white/20 border-t-white rounded-full" />
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
