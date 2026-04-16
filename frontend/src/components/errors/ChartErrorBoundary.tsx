import React from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '../../utils/logger';

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
    logger.error('[ChartErrorBoundary]', error, info.componentStack);
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
            'border border-border bg-card/50',
            this.props.className ?? 'h-64 w-full',
          )}
        >
          <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">Chart unavailable</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5',
              'text-xs font-medium text-muted-foreground transition-colors hover:bg-accent',
              'focus:outline-none focus:ring-2 focus:ring-ring',
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
