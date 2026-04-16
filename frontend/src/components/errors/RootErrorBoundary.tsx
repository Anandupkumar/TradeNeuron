import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '../../utils/logger';

interface RootErrorBoundaryState {
  has_error: boolean;
  error_message: string;
}

export class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { has_error: false, error_message: '' };
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { has_error: true, error_message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('[RootErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    globalThis.location.reload();
  };

  render() {
    if (this.state.has_error) {
      return (
        <div
          className={cn(
            'flex min-h-screen flex-col items-center justify-center',
            'bg-background px-6 text-center',
          )}
        >
          <AlertTriangle className="mb-6 h-16 w-16 text-red-500" />
          <h1 className="mb-3 text-3xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="mb-8 max-w-md text-sm text-muted-foreground">
            {this.state.error_message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className={cn(
              'rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white',
              'transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-2',
              'focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background',
            )}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
