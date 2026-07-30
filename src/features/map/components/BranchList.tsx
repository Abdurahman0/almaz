import { Check, Clock, MapPin, Phone } from 'lucide-react';
import type { MapBranch } from '../types';

const fmtKm = (km?: number): string | null =>
  typeof km === 'number' ? `${km.toFixed(1)} km` : null;

/**
 * BTS pickup-branch picker (single-select), tuned for arm's-length reading on a
 * phone. Rows are ≥64px; the whole row is the tap target; the phone is a separate
 * tel: chip so tapping it dials without toggling selection. Sticky count header.
 */
export function BranchList({
  branches,
  selectedId,
  nearestId,
  onSelect,
}: {
  branches: MapBranch[];
  selectedId: string | null;
  /** Nearest branch — subtly highlighted before any selection. */
  nearestId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="pb-2">
      <div className="sticky top-0 z-10 -mx-4 bg-surface px-4 py-2 text-2xs font-semibold uppercase tracking-wide text-muted">
        Yaqin filiallar · {branches.length} ta
      </div>
      <ul className="space-y-2">
        {branches.map((b) => {
          const selected = b.id === selectedId;
          const nearest = !selected && b.id === nearestId;
          return (
            <li key={b.id}>
              <button
                type="button"
                data-branch-id={b.id}
                onClick={() => onSelect(b.id)}
                aria-pressed={selected}
                className={`flex min-h-16 w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors [touch-action:manipulation] ${
                  selected
                    ? 'border-accent bg-accent-soft'
                    : nearest
                      ? 'border-accent/50 bg-surface ring-1 ring-accent/30'
                      : 'border-border bg-surface active:bg-surface-2'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    selected ? 'border-accent bg-accent text-white' : 'border-strong text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold leading-tight text-text">{b.name}</span>
                    {fmtKm(b.distance_km) && (
                      <span className="tnum shrink-0 text-[15px] font-bold text-accent-ink">{fmtKm(b.distance_km)}</span>
                    )}
                  </span>
                  <span className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-muted">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    <span className="line-clamp-2">
                      {b.address}
                      {b.landmark ? ` — ${b.landmark}` : ''}
                    </span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted">
                    {b.work_hours && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{b.work_hours}</span>
                      </span>
                    )}
                    {b.phone && (
                      <a
                        href={`tel:${b.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex min-h-[28px] items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 font-medium text-accent-ink [touch-action:manipulation]"
                      >
                        <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> {b.phone}
                      </a>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
