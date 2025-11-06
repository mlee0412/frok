'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import { errorHandler } from '@/lib/errorHandler';
import { I18nContext } from '@/lib/i18n/I18nProvider';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static override contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorId: Date.now().toString(36) };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to Sentry with context
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: true,
        errorId: this.state.errorId || 'unknown',
      },
      level: 'error',
    });

    // Log to error handler
    errorHandler.logError({
      message: error.message,
      stack: error.stack,
      severity: 'critical',
      context: {
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
      },
    });
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const t = this.context?.t || ((key: string) => key);

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-lg p-6">
            <h1 className="text-xl font-bold mb-4 text-danger">{t('error.title')}</h1>
            <p className="text-foreground/70 mb-4">
              {t('error.description')}
            </p>
            {this.state.errorId && (
              <p className="text-xs text-foreground/60 mb-4">
                {t('error.errorId')}: <code className="bg-background px-1 py-0.5 rounded">{this.state.errorId}</code>
              </p>
            )}
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-foreground/60 hover:text-foreground/70">
                {t('error.details')}
              </summary>
              <pre className="mt-2 text-xs bg-background p-3 rounded overflow-auto text-danger max-h-40">
                {this.state.error?.message}
                {this.state.error?.stack && (
                  <>
                    {'\n\n'}
                    {this.state.error.stack}
                  </>
                )}
              </pre>
            </details>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 rounded transition"
              >
                {t('error.reload')}
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorId: null })}
                className="flex-1 px-4 py-2 bg-surface hover:bg-surface/80 rounded transition"
              >
                {t('error.tryAgain')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
