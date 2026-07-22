import type { ReactNode } from 'react';

interface EmptyStateProps {
  heading: string;
  hint?: string;
  action?: ReactNode;
}

/** Quiet empty state: one subtle ring outline + a short line of text. */
export function EmptyState({ heading, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="28" r="13" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="2" />
        <path
          d="M24 6 l5 6 -5 6 -5 -6 z"
          stroke="var(--accent)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
      <div>
        <p className="text-sm font-semibold text-text">{heading}</p>
        {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
