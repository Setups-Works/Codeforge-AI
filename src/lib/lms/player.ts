import { parseCaptionUrl, type Caption } from "@/lib/lms/video";

/** Pure helpers behind the custom player, kept apart from the component so they are unit-tested. */

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Next faster/slower speed from the list; stays at the ends. Unknown values snap to the nearest step first. */
export function stepSpeed(current: number, direction: 1 | -1): number {
  let nearest = 0;
  SPEEDS.forEach((s, i) => {
    if (Math.abs(s - current) < Math.abs(SPEEDS[nearest] - current)) nearest = i;
  });
  return SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, nearest + direction))];
}

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** A lesson counts as watched once this much of it has played. */
export const AUTO_COMPLETE_FRACTION = 0.9;

export function shouldAutoComplete(seconds: number, duration: number): boolean {
  return duration > 0 && seconds / duration >= AUTO_COMPLETE_FRACTION;
}

/** Where to resume: the saved position, unless it is trivially early or the video is basically finished. */
export function resumePoint(saved: number, duration: number): number {
  if (!(saved > 5)) return 0;
  if (duration > 0 && saved >= duration - 10) return 0;
  return Math.floor(saved);
}

/** Parse the admin's caption lines ("Label | lang | https://…/file.vtt"), reporting every bad line. */
export function parseCaptionLines(text: string): { captions: Caption[]; errors: string[] } {
  const captions: Caption[] = [];
  const errors: string[] = [];
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [label, lang, ...rest] = line.split("|").map((p) => p.trim());
      const url = parseCaptionUrl(rest.join("|"));
      if (!label || !lang || !/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(lang)) errors.push(`Line ${i + 1}: use “Label | language code | link”`);
      else if (!url) errors.push(`Line ${i + 1}: the link must be an https .vtt file on an allowed video host`);
      else captions.push({ label, lang, url });
    });
  return { captions: captions.slice(0, 12), errors };
}

export const captionsToText = (captions: Caption[] | undefined): string => (captions ?? []).map((c) => `${c.label} | ${c.lang} | ${c.url}`).join("\n");
