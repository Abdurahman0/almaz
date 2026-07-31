/** Content scheduling + caption helpers. */

export const MAX_CAPTION = 2200;

const pad = (n: number) => String(n).padStart(2, '0');

/** Combine a yyyy-MM-dd date + HH:mm time (local) into an ISO instant. */
export function combineScheduleISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

/** Split a stored ISO back into local {date:yyyy-MM-dd, time:HH:mm} for the pickers. */
export function splitScheduleLocal(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** True when the chosen date+time is now or in the past. */
export function isScheduledPast(date: string, time: string): boolean {
  if (!date || !time) return false;
  return new Date(`${date}T${time}:00`).getTime() <= Date.now();
}
