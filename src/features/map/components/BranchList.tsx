import { Check, Clock, MapPin, Phone } from 'lucide-react';
import type { MapBranch } from '../types';

const fmtKm = (km?: number): string | null =>
  typeof km === 'number' ? `${km.toFixed(1)} km` : null;

/**
 * BTS pickup-branch picker (single-select). Rendered nearest-first exactly as
 * the backend returns it. Whole row is a ≥44px touch target; the phone is a
 * separate tel: link so tapping it dials without selecting/deselecting.
 */
export function BranchList({
  branches,
  selectedId,
  onSelect,
}: {
  branches: MapBranch[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {branches.map((b) => {
        const selected = b.id === selectedId;
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onSelect(b.id)}
              aria-pressed={selected}
              className={`flex w-full items-start gap-3 rounded-[var(--r-md)] border p-3 text-left transition-colors ${
                selected
                  ? 'border-accent bg-accent-soft'
                  : 'border-border bg-surface hover:border-strong'
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
                  <span className="truncate text-sm font-semibold text-text">{b.name}</span>
                  {fmtKm(b.distance_km) && (
                    <span className="tnum shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-medium text-muted">
                      {fmtKm(b.distance_km)}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex items-start gap-1.5 text-2xs text-muted">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} />
                  <span className="min-w-0">
                    {b.address}
                    {b.landmark ? ` — ${b.landmark}` : ''}
                  </span>
                </span>
                {b.work_hours && (
                  <span className="mt-1 flex items-center gap-1.5 text-2xs text-muted">
                    <Clock className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{b.work_hours}</span>
                  </span>
                )}
                {b.phone && (
                  <a
                    href={`tel:${b.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-2xs font-medium text-accent-ink"
                  >
                    <Phone className="h-3 w-3" strokeWidth={1.75} /> {b.phone}
                  </a>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
