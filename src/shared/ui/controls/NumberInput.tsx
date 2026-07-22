import { forwardRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FieldWrap } from '../Input';
import { formatNumber } from '@/shared/lib/format';

interface NumberInputProps {
  value?: number | '';
  onChange?: (value: number | '') => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  min?: number;
  max?: number;
  step?: number;
  /** Unit label rendered inside the field: "g", "so'm"... */
  suffix?: string;
  placeholder?: string;
  /** Thousands-format the display on blur (prices). */
  thousands?: boolean;
}

/** Right-aligned tabular number field with custom steppers — no native spinners. */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    onChange,
    label,
    error,
    disabled,
    size = 'md',
    min,
    max,
    step = 1,
    suffix,
    placeholder,
    thousands,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  const clamp = (n: number) => {
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  };
  const nudge = (dir: 1 | -1) => {
    const base = typeof value === 'number' ? value : 0;
    onChange?.(clamp(Number((base + dir * step).toFixed(10))));
  };

  const display =
    typeof value === 'number' && !focused && thousands ? formatNumber(value) : String(value ?? '');

  return (
    <FieldWrap label={label} error={error}>
      <div
        className={`flex items-center rounded-lg border bg-bg transition-colors duration-150 focus-within:border-accent hover:border-strong ${
          size === 'sm' ? 'h-8' : 'h-10'
        } ${error ? 'border-danger' : 'border-border'} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
      >
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={display}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d.,-]/g, '').replace(',', '.');
            if (raw === '' || raw === '-') {
              onChange?.('');
              return;
            }
            const n = Number(raw);
            if (Number.isFinite(n)) onChange?.(n);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
          }}
          className="tnum w-full min-w-0 bg-transparent px-3 text-right text-sm text-text outline-none placeholder:text-muted"
        />
        {suffix && <span className="pr-2 text-xs font-medium text-muted">{suffix}</span>}
        <div className="flex h-full flex-col border-l border-border">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Oshirish"
            disabled={disabled}
            onClick={() => nudge(1)}
            className="flex flex-1 items-center justify-center px-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Kamaytirish"
            disabled={disabled}
            onClick={() => nudge(-1)}
            className="flex flex-1 items-center justify-center border-t border-border px-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </FieldWrap>
  );
});
