/** "1h 20m", "45m", "30s" — compact duration for course cards and curriculum rows. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s === 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Whole-number percent saved vs the compare-at price, or 0 when not discounted. */
export function discountPercent(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price || compareAt <= 0) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
