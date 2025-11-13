'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@frok/ui';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 *
 * Features:
 * - Catches and displays component errors gracefully
 * - Optional custom fallback UI
 * - Error reporting callback
 * - Reset functionality to retry
 * - Prevents full app crashes from component errors
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<CustomError />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-danger/10 border border-danger/30 mb-4">
            <AlertCircle size={40} className="text-danger" strokeWidth={1.5} />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>

          <p className="text-sm text-foreground/60 max-w-md mb-6">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>

          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          </div>

          {/* Error details (development only) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-foreground/60 hover:text-foreground">
                Error details (development only)
              </summary>
              <pre className="mt-2 p-4 rounded-lg bg-surface/50 text-xs text-foreground/80 overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
