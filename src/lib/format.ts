/** 1250 -> "1.250" (ohne Intl, damit es auf allen Android-Versionen gleich aussieht). */
export function formatCoins(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.abs(Math.trunc(value)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** +176 / -350 / ±0 */
export function formatDelta(value: number): string {
  if (value === 0) return '±0';
  return (value > 0 ? '+' : '') + formatCoins(value);
}

/** "gerade eben", "vor 5 Min.", "vor 3 Std.", "vor 2 Tagen", danach Datum. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'gestern' : `vor ${days} Tagen`;
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}
