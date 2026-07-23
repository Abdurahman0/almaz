import { forwardRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Clock } from 'lucide-react';
import { FieldWrap } from '../Input';
import { triggerCls } from './Select';

interface TimePickerProps {
  /** "HH:mm" */
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function Column({ items, active, onPick }: { items: string[]; active?: string; onPick: (v: string) => void }) {
  return (
    <div className="max-h-56 w-14 overflow-y-auto p-1">
      {items.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className={`tnum block w-full rounded-md px-2 py-1.5 text-center text-sm transition-colors hover:bg-surface-2 ${
            v === active ? 'bg-accent-soft font-semibold text-accent-ink' : 'text-text'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/** Two scroll columns (hours / 5-min minutes) in a themed popover. */
export const TimePicker = forwardRef<HTMLButtonElement, TimePickerProps>(function TimePicker(
  { value, onChange, label, error, disabled, size = 'md' },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [h = '09', m = '00'] = (value ?? '').split(':');

  return (
    <FieldWrap label={label} error={error}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button ref={ref} type="button" disabled={disabled} className={triggerCls(size, error)}>
            <span className={`tnum ${value ? '' : 'text-muted'}`}>{value || '--:--'}</span>
            <Clock className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={4} align="start" className="float-panel float-in z-[70] overflow-hidden">
            <div className="flex divide-x divide-[var(--border)]">
              <Column items={HOURS} active={h} onPick={(nh) => onChange?.(`${nh}:${m}`)} />
              <Column
                items={MINUTES}
                active={m}
                onPick={(nm) => {
                  onChange?.(`${h}:${nm}`);
                  setOpen(false);
                }}
              />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldWrap>
  );
});
