import { forwardRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { uz } from 'date-fns/locale';
import { FieldWrap } from '../Input';
import { Calendar } from './Calendar';
import { triggerCls } from './Select';

/** Bottom-sheet on mobile, anchored popover on >=640px. */
export const sheetCls =
  'float-panel float-in z-[70] max-sm:!fixed max-sm:!inset-x-0 max-sm:!bottom-0 max-sm:!top-auto max-sm:!transform-none max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:[&_button]:min-h-11';

interface DatePickerProps {
  /** ISO date string yyyy-MM-dd (empty = unset). */
  value?: string;
  onChange?: (iso: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  placeholder?: string;
}

/** Input-styled date field opening a themed Uzbek calendar. */
export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  { value, onChange, label, error, disabled, size = 'md', placeholder = 'Sanani tanlang' },
  ref,
) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;
  const valid = date && isValid(date);

  return (
    <FieldWrap label={label} error={error}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={triggerCls(size, error)}
          >
            <span className={`tnum min-w-0 truncate ${valid ? '' : 'text-muted'}`}>
              {valid ? format(date, 'd-MMMM, yyyy', { locale: uz }) : placeholder}
            </span>
            <CalendarDays className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content sideOffset={4} align="start" className={sheetCls}>
            <Calendar
              mode="single"
              selected={valid ? date : undefined}
              defaultMonth={valid ? date : undefined}
              onSelect={(d) => {
                if (d) onChange?.(format(d, 'yyyy-MM-dd'));
                setOpen(false);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldWrap>
  );
});
