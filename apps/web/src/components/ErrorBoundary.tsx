'use client';

import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h1 className="text-xl font-bold mb-4 text-red-500">⚠️ Something went wrong</h1>
            <p className="text-gray-400 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-400">
                Error details
              </summary>
              <pre className="mt-2 text-xs bg-gray-950 p-3 rounded overflow-auto text-red-400">
                {this.state.error?.message}
              </pre>
            </details>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded transition"
              >
                Reload Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
