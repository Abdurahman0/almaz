import { forwardRef, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search } from 'lucide-react';
import { FieldWrap } from '../Input';
import { triggerCls, type SelectOption } from './Select';

interface ComboboxProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/** Searchable select for long lists — search pinned on top, instant filter. */
export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(
  { options, value, onChange, placeholder = 'Tanlang...', label, error, disabled, size = 'md' },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  const commit = (o: SelectOption) => {
    if (o.disabled) return;
    onChange?.(o.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(filtered.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = filtered[highlight];
      if (o) commit(o);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
    listRef.current
      ?.querySelector(`[data-index="${Math.max(0, Math.min(highlight, filtered.length - 1))}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <FieldWrap label={label} error={error}>
      <Popover.Root open={open} onOpenChange={(v) => { setOpen(v); setQuery(''); setHighlight(0); }}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            className={`group ${triggerCls(size, error)}`}
          >
            <span className={`min-w-0 truncate ${selected ? '' : 'text-muted'}`}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
              strokeWidth={1.5}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            className="float-panel float-in z-40 w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement | null)?.querySelector('input')?.focus();
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
                onKeyDown={onKeyDown}
                placeholder="Qidirish..."
                aria-label="Qidirish"
                className="h-9 w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
              />
            </div>
            <div ref={listRef} className="max-h-72 overflow-y-auto p-1" role="listbox">
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted">Hech narsa topilmadi</p>
              )}
              {filtered.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  data-index={i}
                  disabled={o.disabled}
                  onClick={() => commit(o)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex min-h-9 w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-text disabled:cursor-not-allowed disabled:opacity-45 ${
                    i === highlight ? 'bg-surface-2' : ''
                  } ${o.value === value ? 'text-accent-ink' : ''}`}
                >
                  {o.icon && <span className="shrink-0 text-muted">{o.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.description && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{o.description}</span>
                    )}
                  </span>
                  {o.value === value && <Check className="h-4 w-4 shrink-0" strokeWidth={2} />}
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldWrap>
  );
});
