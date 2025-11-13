'use client';

import { type ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnifiedChatStore, useUIState } from '@/store/unifiedChatStore';
import { ChatSidebar } from './ChatSidebar';
import { ChatBottomSheet } from './ChatBottomSheet';
import { VoiceSheet } from './VoiceSheet';

// ============================================================================
// ChatLayout Component
// ============================================================================

export interface ChatLayoutProps {
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ChatLayout - Main responsive layout container
 *
 * Desktop (≥768px):
 * - Fixed sidebar on left (256px)
 * - Main content area
 * - Voice sheet slides from right
 *
 * Mobile (<768px):
 * - Bottom sheet for thread navigation
 * - Full-screen main content
 * - Voice sheet slides from bottom
 *
 * Features:
 * - Responsive breakpoints
 * - Gesture support
 * - Smooth animations with Framer Motion
 * - Accessibility (keyboard navigation, ARIA)
 */
export function ChatLayout({ children, className }: ChatLayoutProps) {
  const { isSidebarOpen, isVoiceSheetOpen } = useUIState();
  const toggleSidebar = useUnifiedChatStore((state) => state.toggleSidebar);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      // Cmd/Ctrl + K: Toggle voice (handled by VoiceSheet)
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return (
    <div
      className={`relative flex h-[100dvh] w-full overflow-hidden bg-background ${className || ''}`}
    >
      {/* Desktop Sidebar (≥768px) */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -256, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -256, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            className="hidden md:block"
          >
            <ChatSidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <motion.main
        layout
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className="relative flex flex-1 flex-col overflow-hidden"
      >
        {children}
      </motion.main>

      {/* Voice Sheet (Slides from right on desktop, bottom on mobile) */}
      <AnimatePresence mode="wait">
        {isVoiceSheetOpen && <VoiceSheet />}
      </AnimatePresence>

      {/* Mobile Bottom Sheet (<768px) */}
      <div className="md:hidden">
        <ChatBottomSheet />
      </div>
    </div>
  );
}

// ============================================================================
// ChatHeader - Sticky header with navigation controls
// ============================================================================

export interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  /** Show back button on mobile */
  showBack?: boolean;
  onBack?: () => void;
  /** Additional actions (e.g., settings button) */
  actions?: ReactNode;
  className?: string;
}

export function ChatHeader({
  title = 'Chat',
  subtitle,
  showBack = false,
  onBack,
  actions,
  className,
}: ChatHeaderProps) {
  const toggleSidebar = useUnifiedChatStore((state) => state.toggleSidebar);
  const toggleVoiceSheet = useUnifiedChatStore((state) => state.toggleVoiceSheet);
  const { isSidebarOpen, isVoiceSheetOpen } = useUIState();

  return (
    <header
      className={`sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-surface/60 px-4 backdrop-blur-sm ${className || ''}`}
    >
      {/* Mobile: Back button OR Sidebar toggle */}
      <div className="flex items-center gap-2 md:hidden">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle thread list"
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-surface hover:text-foreground transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Desktop: Sidebar toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="hidden h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-surface hover:text-foreground transition-colors md:flex"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          {isSidebarOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Title and Subtitle */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-foreground/60">{subtitle}</p>
        )}
      </div>

      {/* Voice Toggle Button */}
      <button
        type="button"
        onClick={toggleVoiceSheet}
        aria-label={isVoiceSheetOpen ? 'Close voice assistant' : 'Open voice assistant'}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          isVoiceSheetOpen
            ? 'bg-primary text-white'
            : 'text-foreground/70 hover:bg-surface hover:text-foreground'
        }`}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
          />
        </svg>
      </button>

      {/* Additional Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

// ============================================================================
// ChatContent - Scrollable content area
// ============================================================================

export interface ChatContentProps {
  children: ReactNode;
  className?: string;
}

export function ChatContent({ children, className }: ChatContentProps) {
  return (
    <div
      className={`flex-1 overflow-y-auto overscroll-contain ${className || ''}`}
      style={{
        // iOS momentum scrolling
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// ChatFooter - Fixed footer for input area
// ============================================================================

export interface ChatFooterProps {
  children: ReactNode;
  className?: string;
}

export function ChatFooter({ children, className }: ChatFooterProps) {
  return (
    <footer
      className={`sticky bottom-0 z-10 border-t border-border bg-surface/60 backdrop-blur-sm p-4 ${className || ''}`}
    >
      {children}
    </footer>
  );
}
