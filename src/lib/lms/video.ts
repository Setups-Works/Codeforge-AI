/**
 * Video hosting abstraction for lessons.
 *
 * Lessons store a provider-tagged reference, never a raw URL, so the host can
 * change (Drive today, a streaming service later) without touching lesson
 * data. Drive is the launch provider. Its limits are documented in
 * LMS-IMPLEMENTATION.md §6: the iframe exposes no playback events, and the file
 * must be link-shared, so entitlement is enforced by only handing the ref to
 * authorised viewers — see `canAccessLesson`.
 *
 * Two providers:
 *  - `drive`: a Google Drive file shown in Drive's own embedded player.
 *  - `file`: a direct MP4/WebM link on an allow-listed host, played by our
 *    custom player (speed, resume, keyboard, notes at the playhead, ...). It
 *    needs a host that serves real video files; Drive does not.
 */

export type VideoProviderId = "drive" | "file";

export interface Caption {
  label: string;
  /** BCP-47 language code, e.g. "en", "ta". */
  lang: string;
  /** https URL of a WebVTT file on an allow-listed host. */
  url: string;
}

export interface VideoRef {
  provider: VideoProviderId;
  /** Provider-specific id (a Drive file id for `drive`, the file URL for `file`). */
  ref: string;
  /** Subtitles; only used by the custom player. */
  captions?: Caption[];
}

export type VideoEmbed =
  | { kind: "iframe"; src: string; allow: string }
  | { kind: "video"; src: string; mime: string; captions: Caption[] };

/** Hosts the custom player may load video and captions from (NEXT_PUBLIC_VIDEO_HOSTS, comma-separated; `*.cdn.com` allowed). */
export function videoHosts(env: string | undefined = process.env.NEXT_PUBLIC_VIDEO_HOSTS): string[] {
  return (env ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
}

export function hostAllowed(hostname: string, hosts: string[]): boolean {
  const host = hostname.toLowerCase();
  return hosts.some((h) => (h.startsWith("*.") ? host.endsWith(h.slice(1)) && host.length > h.length - 1 : host === h));
}

const FILE_TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/mp4", m3u8: "application/vnd.apple.mpegurl" };

function fileExtension(pathname: string): string | null {
  const m = pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m && FILE_TYPES[m[1]] ? m[1] : null;
}

/** An https link to a video file on an allow-listed host, normalised; null otherwise. */
function parseFile(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!hostAllowed(url.hostname, videoHosts())) return null;
  if (!fileExtension(url.pathname)) return null;
  return url.toString();
}

/** Validate a WebVTT caption link the same way (https, allow-listed host, .vtt). */
export function parseCaptionUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !hostAllowed(url.hostname, videoHosts()) || !/\.vtt$/i.test(url.pathname)) return null;
  return url.toString();
}

interface VideoProvider {
  /** Extract a ref from a pasted URL or bare id; null if it is not valid. */
  parse(input: string): string | null;
  embed(ref: string): VideoEmbed;
  /** A link an admin can open or paste back (not a playback URL for learners). */
  shareUrl(ref: string): string;
}

const mimeFor = (url: string) => FILE_TYPES[fileExtension(new URL(url).pathname) ?? "mp4"];

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
  file: {
    parse: parseFile,
    embed: (ref) => ({ kind: "video", src: ref, mime: mimeFor(ref), captions: [] }),
    shareUrl: (ref) => ref,
  },
};

/** Parse admin input into a stored ref, or null when the link is not usable. */
export function parseVideoInput(provider: VideoProviderId, input: string): VideoRef | null {
  const ref = PROVIDERS[provider].parse(input);
  return ref ? { provider, ref } : null;
}

/** Convenience for the launch provider. */
export const parseDriveLink = (input: string): VideoRef | null => parseVideoInput("drive", input);

/** Accept whatever the admin pasted: a Drive link/id, or a direct video file link. */
export function parseVideoLink(input: string): VideoRef | null {
  return parseVideoInput("drive", input) ?? parseVideoInput("file", input);
}

/** Build the player descriptor. Only call this after an access check. */
export function toEmbed(video: VideoRef): VideoEmbed {
  const embed = PROVIDERS[video.provider].embed(video.ref);
  return embed.kind === "video" ? { ...embed, captions: video.captions ?? [] } : embed;
}

/** Admin-facing link for a stored ref, so the editor can show/re-edit it. */
export function toShareUrl(video: VideoRef): string {
  return PROVIDERS[video.provider].shareUrl(video.ref);
}
