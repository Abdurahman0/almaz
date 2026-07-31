import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Palette, Check } from 'lucide-react';
import { useUiStore } from '@/shared/stores/ui';
import { PRESETS } from '@/shared/lib/themes';
import { switchThemeFromEvent } from '@/shared/hooks/useThemeTransition';

/** Topbar popover: one row of curated preset swatches — bg + matched accent together.
 *  Uses Radix Popover so the menu portals to <body> and never renders behind the
 *  glass content/header panels (which create their own stacking contexts). */
export function ThemePopover() {
  const [spinning, setSpinning] = useState(false);
  const preset = useUiStore((s) => s.preset);
  const setPreset = useUiStore((s) => s.setPreset);

  const spin = () => {
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Mavzu tanlash"
          className="rounded-[var(--r-sm)] p-2 text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink"
        >
          <Palette className={`h-5 w-5 ${spinning ? 'animate-spin-once' : ''}`} strokeWidth={1.5} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} align="end" className="float-panel float-in z-[80] w-72 p-4">
          <p className="mb-2 text-xs font-medium text-muted">Mavzu</p>
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
                  className="relative h-9 w-11 overflow-hidden rounded-[var(--r-sm)] border transition-transform group-hover:scale-105"
                  style={{
                    background: p.bg,
                    borderColor: preset === p.id ? p.accent : 'var(--border-strong)',
                    borderWidth: preset === p.id ? 2 : 1,
                  }}
                >
                  <span className="absolute inset-x-1.5 bottom-1 top-3.5 rounded-sm" style={{ background: p.surface }} />
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full" style={{ background: p.accent }} />
                  {preset === p.id && (
                    <Check className="absolute bottom-0.5 left-1 h-3 w-3" style={{ color: p.accent }} strokeWidth={3} />
                  )}
                </span>
                <span className={`text-2xs font-medium ${preset === p.id ? 'text-text' : 'text-muted'}`}>{p.label}</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
