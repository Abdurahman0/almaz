import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import {
  endOfDay, format, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, subDays, subMonths,
} from 'date-fns';
import { uz } from 'date-fns/locale';
import { Calendar } from './Calendar';
import { triggerCls } from './Select';
import { sheetCls } from './DatePicker';

export interface Range {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: Range;
  onChange: (range: Range) => void;
  size?: 'sm' | 'md';
}

const presets: Array<{ label: string; make: () => Range }> = [
  { label: 'Bugun', make: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Kecha', make: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: 'Shu hafta', make: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Shu oy', make: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "O'tgan oy", make: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Shu yil', make: () => ({ from: startOfYear(new Date()), to: endOfDay(new Date()) }) },
];

/** Range picker with Uzbek presets column; two-click selection in the grid. */
export function DateRangePicker({ value, onChange, size = 'md' }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  const display = `${format(value.from, 'd-MMM', { locale: uz })} — ${format(value.to, 'd-MMM, yyyy', { locale: uz })}`;

  const commit = (r: DateRange | undefined) => {
    setDraft(r);
    if (r?.from && r?.to) {
      onChange({ from: startOfDay(r.from), to: endOfDay(r.to) });
      setOpen(false);
      setDraft(undefined);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={(v) => { setOpen(v); setDraft(undefined); }}>
      <Popover.Trigger asChild>
        <button type="button" className={`${triggerCls(size)} w-auto min-w-56`}>
          <span className="tnum truncate">{display}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="end" className={sheetCls}>
          <div className="flex max-sm:flex-col">
            <div className="flex flex-col gap-0.5 border-b border-border p-2 sm:border-b-0 sm:border-r">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { onChange(p.make()); setOpen(false); }}
                  className="rounded-md px-3 py-1.5 text-left text-sm text-text transition-colors hover:bg-surface-2"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Calendar
              mode="range"
              selected={draft ?? { from: value.from, to: value.to }}
              defaultMonth={value.from}
              onSelect={commit}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
