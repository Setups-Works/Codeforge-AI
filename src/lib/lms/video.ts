/**
 * Video hosting abstraction for lessons.
 *
 * Lessons store a provider-tagged reference, never a raw URL, so the host can
 * change (Drive today, a streaming service later) without touching lesson
 * data. Drive is the launch provider. Its limits are documented in
 * LMS-IMPLEMENTATION.md §6: the iframe exposes no playback events, and the file
 * must be link-shared, so entitlement is enforced by only handing the ref to
 * authorised viewers — see `canAccessLesson`.
 */

export type VideoProviderId = "drive";

export interface VideoRef {
  provider: VideoProviderId;
  /** Provider-specific id (a Drive file id for `drive`). */
  ref: string;
}

export interface VideoEmbed {
  kind: "iframe";
  src: string;
  allow: string;
}

interface VideoProvider {
  /** Extract a ref from a pasted URL or bare id; null if it is not valid. */
  parse(input: string): string | null;
  embed(ref: string): VideoEmbed;
  /** A link an admin can open or paste back (not a playback URL for learners). */
  shareUrl(ref: string): string;
}

const DRIVE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
]);
// Drive file ids are ~33 chars of [A-Za-z0-9_-]; 25+ avoids matching short words.
const DRIVE_ID = /^[A-Za-z0-9_-]{25,}$/;

function parseDrive(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (DRIVE_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !DRIVE_HOSTS.has(url.hostname)) return null;

  // Folders and shared drives are not a single playable file.
  if (/\/(drive\/)?folders\//.test(url.pathname)) return null;

  // /file/d/<id>/view, /file/u/0/d/<id>/preview, /uc?id=<id>, /open?id=<id>
  const pathMatch = url.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/);
  const id = pathMatch?.[1] ?? url.searchParams.get("id");
  return id && DRIVE_ID.test(id) ? id : null;
}

const PROVIDERS: Record<VideoProviderId, VideoProvider> = {
  drive: {
    parse: parseDrive,
    embed: (ref) => ({
      kind: "iframe",
      src: `https://drive.google.com/file/d/${encodeURIComponent(ref)}/preview`,
      allow: "autoplay; fullscreen",
    }),
    shareUrl: (ref) => `https://drive.google.com/file/d/${encodeURIComponent(ref)}/view`,
  },
};

/** Parse admin input into a stored ref, or null when the link is not usable. */
export function parseVideoInput(provider: VideoProviderId, input: string): VideoRef | null {
  const ref = PROVIDERS[provider].parse(input);
  return ref ? { provider, ref } : null;
}

/** Convenience for the launch provider. */
export const parseDriveLink = (input: string): VideoRef | null => parseVideoInput("drive", input);

/** Build the player descriptor. Only call this after an access check. */
export function toEmbed(video: VideoRef): VideoEmbed {
  return PROVIDERS[video.provider].embed(video.ref);
}

/** Admin-facing link for a stored ref, so the editor can show/re-edit it. */
export function toShareUrl(video: VideoRef): string {
  return PROVIDERS[video.provider].shareUrl(video.ref);
}
