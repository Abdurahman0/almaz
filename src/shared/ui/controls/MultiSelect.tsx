import { forwardRef, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Search, X } from 'lucide-react';
import { FieldWrap } from '../Input';
import { Checkbox } from './Checkbox';
import { triggerCls, type SelectOption } from './Select';

interface MultiSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/** Multi-select: checkbox menu, trigger shows removable chips (max 2 + "+N"). */
export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(function MultiSelect(
  { options, value, onChange, placeholder = 'Tanlang...', label, error, disabled, size = 'md' },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const chips = value
    .map((v) => options.find((o) => o.value === v))
    .filter((o): o is SelectOption => Boolean(o));

  return (
    <FieldWrap label={label} error={error}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            className={`${triggerCls(size, error)} h-auto min-h-10 flex-wrap py-1.5`}
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {chips.length === 0 && <span className="text-muted">{placeholder}</span>}
              {chips.slice(0, 2).map((o) => (
                <span
                  key={o.value}
                  className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink"
                >
                  {o.label}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${o.label} olib tashlash`}
                    onClick={(e) => { e.stopPropagation(); toggle(o.value); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggle(o.value); }
                    }}
                    className="rounded-sm hover:text-danger"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </span>
                </span>
              ))}
              {chips.length > 2 && (
                <span className="rounded-md bg-muted-soft px-1.5 py-0.5 text-xs font-medium text-muted">
                  +{chips.length - 2}
                </span>
              )}
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
          >
            {options.length > 10 && (
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.5} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Qidirish..."
                  aria-label="Qidirish"
                  className="h-9 w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
                />
              </div>
            )}
            <div className="max-h-72 overflow-y-auto p-1">
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-sm text-muted">Hech narsa topilmadi</p>
              )}
              {filtered.map((o) => (
                <label
                  key={o.value}
                  className={`flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-text hover:bg-surface-2 ${
                    o.disabled ? 'cursor-not-allowed opacity-45' : ''
                  }`}
                >
                  <Checkbox
                    checked={value.includes(o.value)}
                    onCheckedChange={() => toggle(o.value)}
                    disabled={o.disabled}
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                </label>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldWrap>
  );
});
