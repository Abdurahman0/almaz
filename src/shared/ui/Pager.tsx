import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PagerProps {
  /** Zero-based item offset. */
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
}

/** Minimal offset pager: "X–Y / total" with prev/next. Hides itself when it all fits on one page. */
export function Pager({ offset, limit, total, onChange }: PagerProps) {
  if (total <= limit && offset === 0) return null;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm text-muted">
      <span className="tnum">
        {from}–{to} / {total}
      </span>
      <div className="flex gap-1">
        <button
          aria-label="Oldingi"
          disabled={!canPrev}
          onClick={() => onChange(Math.max(0, offset - limit))}
          className="rounded-lg border border-border p-1.5 transition-colors enabled:hover:border-strong enabled:hover:text-text disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          aria-label="Keyingi"
          disabled={!canNext}
          onClick={() => onChange(offset + limit)}
          className="rounded-lg border border-border p-1.5 transition-colors enabled:hover:border-strong enabled:hover:text-text disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
