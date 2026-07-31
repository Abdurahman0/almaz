/** Phone display + tel: helpers for inbox customers. */

/** Digits only. */
const digits = (p: string) => p.replace(/\D/g, '');

/** tel: target — normalise a UZ number to +998……, else keep raw digits. */
export function telHref(phone: string): string {
  const d = digits(phone);
  if (d.startsWith('998')) return `+${d}`;
  if (d.length === 9) return `+998${d}`;
  return `+${d}`;
}

/** Human display — group a full 12-digit UZ number, else a lenient +digits. */
export function formatPhone(phone: string): string {
  const d = digits(phone);
  const full = d.startsWith('998') ? d : d.length === 9 ? `998${d}` : d;
  if (full.length === 12) return `+998 ${full.slice(3, 5)} ${full.slice(5, 8)} ${full.slice(8, 10)} ${full.slice(10)}`;
  return `+${full}`;
}
