import { useState } from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { uz } from 'date-fns/locale';
import { format, setMonth, setYear } from 'date-fns';

type View = 'days' | 'months' | 'years';

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const navBtn =
  'flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60';

/**
 * Fully themed calendar (react-day-picker v9), Uzbek locale, Monday start.
 * Clicking the month title flips to a 12-month grid, then a 12-year grid.
 */
export function Calendar(props: DayPickerProps) {
  const [view, setView] = useState<View>('days');
  const [month, setMonthState] = useState<Date>(props.defaultMonth ?? new Date());
  const [yearBase, setYearBase] = useState(() => Math.floor(month.getFullYear() / 12) * 12);

  if (view === 'months') {
    return (
      <div className="w-64 animate-[floatIn_150ms_ease-out] p-2">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className={navBtn} aria-label="Oldingi yil"
            onClick={() => setMonthState((m) => setYear(m, m.getFullYear() - 1))}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-md font-semibold text-text hover:bg-surface-2"
            onClick={() => { setYearBase(Math.floor(month.getFullYear() / 12) * 12); setView('years'); }}
          >
            {month.getFullYear()}
          </button>
          <button type="button" className={navBtn} aria-label="Keyingi yil"
            onClick={() => setMonthState((m) => setYear(m, m.getFullYear() + 1))}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {UZ_MONTHS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => { setMonthState((m) => setMonth(m, i)); setView('days'); }}
              className={`rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-surface-2 ${
                month.getMonth() === i ? 'bg-accent-soft font-semibold text-accent-ink' : 'text-text'
              }`}
            >
              {label.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'years') {
    return (
      <div className="w-64 animate-[floatIn_150ms_ease-out] p-2">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className={navBtn} aria-label="Oldingi" onClick={() => setYearBase((b) => b - 12)}>
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <span className="text-md font-semibold text-text">
            {yearBase}–{yearBase + 11}
          </span>
          <button type="button" className={navBtn} aria-label="Keyingi" onClick={() => setYearBase((b) => b + 12)}>
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => { setMonthState((m) => setYear(m, y)); setView('months'); }}
              className={`tnum rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-surface-2 ${
                month.getFullYear() === y ? 'bg-accent-soft font-semibold text-accent-ink' : 'text-text'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DayPicker
      {...props}
      locale={uz}
      weekStartsOn={1}
      month={month}
      onMonthChange={setMonthState}
      showOutsideDays
      components={{
        CaptionLabel: () => (
          <button
            type="button"
            onClick={() => setView('months')}
            className="rounded-md px-2 py-0.5 text-md font-semibold text-text hover:bg-surface-2"
          >
            {UZ_MONTHS[month.getMonth()]} {format(month, 'yyyy')}
          </button>
        ),
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          ),
      }}
      classNames={{
        root: 'p-2 select-none',
        months: 'flex gap-4',
        month: 'space-y-2',
        month_caption: 'flex h-8 items-center justify-center',
        nav: 'absolute inset-x-2 top-2 flex justify-between',
        button_previous: navBtn,
        button_next: navBtn,
        month_grid: 'border-collapse',
        weekdays: '',
        weekday: 'h-8 w-9 text-center text-2xs font-medium uppercase tracking-caps text-muted',
        week: '',
        day: 'p-0 text-center',
        day_button:
          'tnum h-9 w-9 rounded-md text-sm text-text transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 aria-selected:hover:bg-accent-btn',
        today: '[&>button]:outline [&>button]:outline-1 [&>button]:outline-accent',
        selected: '[&>button]:bg-accent-btn [&>button]:text-on-accent [&>button]:font-semibold',
        range_start: 'rdp-range-start [&>button]:bg-accent-btn [&>button]:text-on-accent [&>button]:rounded-r-none',
        range_end: 'rdp-range-end [&>button]:bg-accent-btn [&>button]:text-on-accent [&>button]:rounded-l-none',
        range_middle: '[&>button]:bg-accent-soft [&>button]:text-text [&>button]:rounded-none [&>button]:font-normal',
        outside: '[&>button]:opacity-35',
        disabled: '[&>button]:line-through [&>button]:opacity-30 [&>button]:cursor-not-allowed',
        hidden: 'invisible',
      }}
    />
  );
}
