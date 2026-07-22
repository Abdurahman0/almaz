import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useUiStore } from '@/shared/stores/ui';
import { PRESETS } from '@/shared/lib/themes';
import { switchThemeFromEvent } from '@/shared/hooks/useThemeTransition';

/** Topbar popover: one row of curated preset swatches — bg + matched accent together. */
export function ThemePopover() {
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const preset = useUiStore((s) => s.preset);
  const setPreset = useUiStore((s) => s.setPreset);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: MouseEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const spin = () => {
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Mavzu tanlash"
        aria-expanded={open}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink"
      >
        <Palette className={`h-5 w-5 ${spinning ? 'animate-spin-once' : ''}`} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="card-velvet absolute right-0 top-11 z-50 w-72 p-4">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-caps text-muted">Mavzu</p>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                aria-label={`Mavzu: ${p.label}`}
                aria-pressed={preset === p.id}
                onClick={(e) => {
                  spin();
                  switchThemeFromEvent(e, () => setPreset(p.id));
                }}
                className="group flex flex-col items-center gap-1"
              >
                <span
                  className="relative h-9 w-11 overflow-hidden rounded-lg border transition-transform group-hover:scale-105"
                  style={{
                    background: p.bg,
                    borderColor: preset === p.id ? p.accent : 'var(--border-strong)',
                    borderWidth: preset === p.id ? 2 : 1,
                  }}
                >
                  <span
                    className="absolute inset-x-1.5 bottom-1 top-3.5 rounded-sm"
                    style={{ background: p.surface }}
                  />
                  <span
                    className="absolute right-1 top-1 h-2 w-2 rounded-full"
                    style={{ background: p.accent }}
                  />
                  {preset === p.id && (
                    <Check
                      className="absolute bottom-0.5 left-1 h-3 w-3"
                      style={{ color: p.accent }}
                      strokeWidth={3}
                    />
                  )}
                </span>
                <span
                  className={`text-2xs font-medium ${
                    preset === p.id ? 'text-text' : 'text-muted'
                  }`}
                >
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
