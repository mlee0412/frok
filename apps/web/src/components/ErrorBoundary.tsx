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
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h1 className="text-xl font-bold mb-4 text-red-500">{t('error.title')}</h1>
            <p className="text-gray-400 mb-4">
              {t('error.description')}
            </p>
            {this.state.errorId && (
              <p className="text-xs text-gray-500 mb-4">
                {t('error.errorId')}: <code className="bg-gray-950 px-1 py-0.5 rounded">{this.state.errorId}</code>
              </p>
            )}
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                {t('error.details')}
              </summary>
              <pre className="mt-2 text-xs bg-gray-950 p-3 rounded overflow-auto text-red-400 max-h-40">
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
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded transition"
              >
                {t('error.reload')}
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorId: null })}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
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
