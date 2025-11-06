import React, { Component, ReactNode } from 'react';
import { Card } from '@frok/ui';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <Card className="p-4 border-danger/30 bg-danger/5">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-danger">
              Error in {this.props.componentName || 'Component'}
            </h3>
            <p className="text-xs text-foreground/60">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3 py-1 text-xs rounded-md bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook for using error boundary in functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  fallbackComponent?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary componentName={componentName} fallbackComponent={fallbackComponent}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}