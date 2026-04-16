import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-14 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-red-500" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-muted px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/80"
        >
          Try again
        </button>
      )}
    </div>
  );
}
