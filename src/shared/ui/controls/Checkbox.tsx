import { forwardRef, type ReactNode } from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Minus } from 'lucide-react';

interface CheckboxProps {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: ReactNode;
  name?: string;
}

/** 18px themed checkbox; check mark draws itself via stroke-dashoffset. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, onCheckedChange, disabled, label, name },
  ref,
) {
  const box = (
    <RadixCheckbox.Root
      ref={ref}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
      disabled={disabled}
      name={name}
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-strong bg-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-accent-btn data-[state=checked]:bg-accent-btn data-[state=indeterminate]:border-accent-btn data-[state=indeterminate]:bg-accent-btn"
    >
      <RadixCheckbox.Indicator>
        {checked === 'indeterminate' ? (
          <Minus className="h-3 w-3 text-on-accent" strokeWidth={3} />
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6.5 L4.8 9 L10 3"
              stroke="var(--on-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 14,
                strokeDashoffset: 14,
                animation: 'checkDraw 120ms ease-out forwards',
              }}
            />
          </svg>
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (!label) return box;
  return (
    <label
      className={`inline-flex select-none items-center gap-2.5 text-sm text-text ${
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
      }`}
    >
      {box}
      {label}
    </label>
  );
});
