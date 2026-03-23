import React from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  className?: string;
}

interface ChartErrorBoundaryState {
  has_error: boolean;
}

export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { has_error: false };
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { has_error: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ChartErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ has_error: false });
  };

  render() {
    if (this.state.has_error) {
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg',
            'border border-zinc-800 bg-zinc-900/50',
            this.props.className ?? 'h-64 w-full',
          )}
        >
          <BarChart3 className="mb-3 h-8 w-8 text-zinc-600" />
          <p className="mb-4 text-sm text-zinc-500">Chart unavailable</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5',
              'text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700',
              'focus:outline-none focus:ring-2 focus:ring-zinc-600',
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
