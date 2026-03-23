import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageErrorBoundaryState {
  has_error: boolean;
  error_message: string;
}

export class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  PageErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { has_error: false, error_message: '' };
  }

  static getDerivedStateFromError(error: Error): PageErrorBoundaryState {
    return { has_error: true, error_message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ has_error: false, error_message: '' });
  };

  render() {
    if (this.state.has_error) {
      return (
        <div
          className={cn(
            'flex flex-1 flex-col items-center justify-center px-6 py-24 text-center',
          )}
        >
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-zinc-100">
            This page encountered an error
          </h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            {this.state.error_message || 'Something unexpected happened while rendering this page.'}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className={cn(
              'mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5',
              'text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700',
              'focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2',
              'focus:ring-offset-zinc-950',
            )}
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
