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

/** "Asha Rao" -> "Asha R."; privacy-friendly name for public reviews and Q&A. */
export function publicName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Learner";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** 125 -> "2:05", 3725 -> "1:02:05". */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "2:05" / "1:02:05" / "90" -> seconds, or null when it isn't a valid timestamp. */
export function parseTimestamp(input: string): number | null {
  const v = input.trim();
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v);
  const m = v.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, h, min, sec] = m;
  if (Number(min) > 59 && h !== undefined) return null;
  if (Number(sec) > 59) return null;
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(sec);
}
