import { CheckCircle } from 'lucide-react';

interface Props {
  explanation: string[] | null;
  reasons: string[];
}

export function ExplainabilityPanel({ explanation, reasons }: Props) {
  if (explanation && explanation.length > 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Why this signal
        </p>
        <ul className="space-y-1.5">
          {explanation.map((sentence, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{sentence}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (reasons.length > 0) {
    return (
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Reasons
        </p>
        <div className="flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <span
              key={reason}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {reason}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
