import { format, parseISO, differenceInCalendarDays } from 'date-fns';

const THIN_SPACE = ' ';

/** 1234567 -> "1 234 567" (uz-UZ grouping, thin-space thousands) */
export function formatNumber(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 })
    .format(n)
    .replace(/[\s\u00A0\u202F,]/g, THIN_SPACE);
}

/** Abbreviated amount WITHOUT currency: 24_800_000 -> "24.8 mln" */
export function formatShortAmount(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}${THIN_SPACE}mlrd`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}${THIN_SPACE}mln`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(0)}${THIN_SPACE}ming`;
  return formatNumber(n);
}

/** Amount + currency word as separate parts (currency renders muted/smaller). */
export function moneyParts(value: number | string, short = false): { amount: string; unit: string } {
  return { amount: short ? formatShortAmount(value) : formatNumber(value), unit: "so'm" };
}

/** Full currency: "24 800 000 so'm" */
export function formatMoney(value: number | string): string {
  return `${formatNumber(value)}${THIN_SPACE}so'm`;
}

/** Abbreviated: 24_800_000 -> "24.8 mln so'm" */
export function formatMoneyShort(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return `0${THIN_SPACE}so'm`;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}${THIN_SPACE}mlrd so'm`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}${THIN_SPACE}mln so'm`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(0)}${THIN_SPACE}ming so'm`;
  return formatMoney(n);
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy');
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy HH:mm');
  } catch {
    return iso;
  }
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return iso;
  }
}

/** Days until next anniversary of a date (e.g. wedding day). */
export function daysUntilAnniversary(iso: string, from = new Date()): number {
  const d = parseISO(iso);
  const next = new Date(from.getFullYear(), d.getMonth(), d.getDate());
  if (next < from) next.setFullYear(next.getFullYear() + 1);
  return differenceInCalendarDays(next, from);
}
