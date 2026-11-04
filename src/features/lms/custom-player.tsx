"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Maximize2, Minimize2, RotateCcw, Settings2 } from "@/components/icons";
import { useLessonPlayer } from "@/features/lms/player-context";
import { formatTimestamp } from "@/lib/lms/format";
import { clamp, resumePoint, SPEEDS, stepSpeed } from "@/lib/lms/player";
import type { Caption } from "@/lib/lms/video";
import { cn } from "@/lib/utils";

const PREF_KEY = "swl-player-prefs";
const SAVE_EVERY_MS = 15_000;
const UP_NEXT_SECONDS = 5;

interface Prefs {
  volume: number;
  muted: boolean;
  rate: number;
  captions: string | null;
}
const DEFAULT_PREFS: Prefs = { volume: 1, muted: false, rate: 1, captions: null };

function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    // private mode etc.: preferences just don't persist
  }
}

// Small inline icons: the icon set has no transport controls.
const Svg = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-5", className)} aria-hidden>{children}</svg>
);
const PlayIcon = () => <Svg><path d="M8 5v14l11-7z" /></Svg>;
const PauseIcon = () => <Svg><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></Svg>;
const VolumeIcon = ({ muted, level }: { muted: boolean; level: number }) => (
  <Svg>
    <path d="M3 9v6h4l5 5V4L7 9z" />
    {!muted && level > 0 && <path d="M15.5 8.5a5 5 0 0 1 0 7l-1.4-1.4a3 3 0 0 0 0-4.2z" />}
    {!muted && level > 0.5 && <path d="M18.3 5.7a9 9 0 0 1 0 12.6l-1.4-1.4a7 7 0 0 0 0-9.8z" />}
    {muted && <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="2" fill="none" />}
  </Svg>
);

interface Props {
  src: string;
  mime: string;
  captions: Caption[];
  title: string;
  poster?: string | null;
  lessonId: string;
  /** Saved position to resume from (seconds). */
  startAt: number;
  /** Send playback position to the server (enrolled learners on video lessons). */
  track: boolean;
  /** Faint moving text over the video (the viewer's email) to discourage screen-recording leaks. */
  watermark?: string | null;
  /** Where "Up next" goes when the video ends. */
  next?: { href: string; title: string } | null;
}

/** The course video player: speed, resume, keyboard shortcuts, captions, PiP, fullscreen, auto-complete and notes integration. */
export function CustomPlayer({ src, mime, captions, title, poster, lessonId, startAt, track, watermark, next }: Props) {
  const router = useRouter();
  const player = useLessonPlayer();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(0);
  const completedRef = useRef(false);

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [menu, setMenu] = useState<"speed" | "captions" | null>(null);
  const [hoverAt, setHoverAt] = useState<{ x: number; seconds: number } | null>(null);
  const [error, setError] = useState(false);
  const [resumed, setResumed] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [pipSupported, setPipSupported] = useState(false);

  // ── preferences ──
  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    setPipSupported(typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled));
  }, []);
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.volume = prefs.volume;
    v.muted = prefs.muted;
    v.playbackRate = prefs.rate;
  }, [prefs.volume, prefs.muted, prefs.rate]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    for (const t of Array.from(v.textTracks)) t.mode = t.language === prefs.captions ? "showing" : "disabled";
  }, [prefs.captions, captions]);

  // ── position saving ──
  const save = useCallback(
    (force = false) => {
      const v = video.current;
      if (!track || !v || !v.duration || Number.isNaN(v.duration)) return;
      const now = Date.now();
      if (!force && now - lastSaved.current < SAVE_EVERY_MS) return;
      lastSaved.current = now;
      fetch(`/api/learn/lessons/${lessonId}/position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: v.currentTime, duration: v.duration }),
        keepalive: true,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { completed?: boolean; xpEarned?: number } | null) => {
          if (d?.completed && !completedRef.current) {
            completedRef.current = true;
            toast.success(d.xpEarned ? `Lesson complete — +${d.xpEarned} XP` : "Lesson complete");
            router.refresh();
          }
        })
        .catch(() => {});
    },
    [track, lessonId, router],
  );
  useEffect(() => {
    const onHide = () => save(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      save(true);
    };
  }, [save]);

  // ── actions ──
  const seek = useCallback((seconds: number) => {
    const v = video.current;
    if (v && v.duration) v.currentTime = clamp(seconds, 0, v.duration);
  }, []);
  const togglePlay = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setError(true));
    else v.pause();
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else box.current?.requestFullscreen().catch(() => {});
  }, []);
  const togglePip = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    else v.requestPictureInPicture().catch(() => {});
  }, []);
  const cycleCaptions = useCallback(() => {
    if (!captions.length) return;
    const order = [null, ...captions.map((c) => c.lang)];
    update({ captions: order[(order.indexOf(prefs.captions) + 1) % order.length] });
  }, [captions, prefs.captions, update]);

  useEffect(() => {
    player.register({ currentTime: () => video.current?.currentTime ?? 0, seek });
    return () => player.register(null);
  }, [player, seek]);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // auto-hide controls while playing
  const poke = useCallback(() => {
    setShowControls(true);
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => setShowControls(false), 2800);
  }, []);
  useEffect(() => () => { if (idle.current) clearTimeout(idle.current); }, []);

  // up-next countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (next) router.push(next.href);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, next, router]);

  // ── keyboard ──
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    const v = video.current;
    if (!v || e.altKey || e.ctrlKey || e.metaKey) return;
    const handled = (fn: () => void) => {
      e.preventDefault();
      fn();
      poke();
    };
    switch (e.key) {
      case " ":
      case "k":
        return handled(togglePlay);
      case "ArrowLeft":
        return handled(() => seek(v.currentTime - 5));
      case "ArrowRight":
        return handled(() => seek(v.currentTime + 5));
      case "j":
        return handled(() => seek(v.currentTime - 10));
      case "l":
        return handled(() => seek(v.currentTime + 10));
      case "ArrowUp":
        return handled(() => update({ volume: clamp(prefs.volume + 0.05, 0, 1), muted: false }));
      case "ArrowDown":
        return handled(() => update({ volume: clamp(prefs.volume - 0.05, 0, 1) }));
      case "m":
        return handled(() => update({ muted: !prefs.muted }));
      case "f":
        return handled(toggleFullscreen);
      case "c":
        return handled(cycleCaptions);
      case "p":
        if (pipSupported) return handled(togglePip);
        return;
      case ">":
        return handled(() => update({ rate: stepSpeed(prefs.rate, 1) }));
      case "<":
        return handled(() => update({ rate: stepSpeed(prefs.rate, -1) }));
      case "Home":
        return handled(() => seek(0));
      case "End":
        return handled(() => seek(v.duration));
      default:
        if (/^[0-9]$/.test(e.key) && v.duration) return handled(() => seek((Number(e.key) / 10) * v.duration));
    }
  }

  // ── seek bar ──
  const fractionAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = bar.current!.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1);
  };
  function onBarDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(fractionAt(e) * duration);
  }
  function onBarMove(e: PointerEvent<HTMLDivElement>) {
    const f = fractionAt(e);
    setHoverAt({ x: f * 100, seconds: f * duration });
    if (e.buttons === 1) seek(f * duration);
  }

  function onDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const v = video.current;
    if (!v) return;
    if (x < 0.33) seek(v.currentTime - 10);
    else if (x > 0.66) seek(v.currentTime + 10);
    else toggleFullscreen();
  }

  const pct = duration ? (time / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;
  const controlsOn = showControls || !playing || menu !== null;

  const btn = "flex h-9 min-w-9 items-center justify-center rounded px-1.5 text-sm font-medium text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div
      ref={box}
      tabIndex={0}
      role="region"
      aria-label={`Video player: ${title}`}
      onKeyDown={onKeyDown}
      onMouseMove={poke}
      onMouseLeave={() => playing && setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("group relative select-none overflow-hidden bg-black outline-none", fullscreen ? "size-full" : "aspect-video rounded-xl border")}
    >
      <video
        ref={video}
        className="size-full"
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback"
        crossOrigin={captions.length ? "anonymous" : undefined}
        onClick={togglePlay}
        onDoubleClick={onDoubleClick as never}
        onPlay={() => { setPlaying(true); setCountdown(null); poke(); }}
        onPause={() => { setPlaying(false); setShowControls(true); save(true); }}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onPlaying={() => setWaiting(false)}
        onError={() => setError(true)}
        onTimeUpdate={(e) => {
          setTime(e.currentTarget.currentTime);
          save();
        }}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length) setBuffered(b.end(b.length - 1));
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          setWaiting(false);
          const at = resumePoint(startAt, v.duration);
          if (at > 0) {
            v.currentTime = at;
            setResumed(at);
            setTimeout(() => setResumed(null), 6000);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          save(true);
          if (next) setCountdown(UP_NEXT_SECONDS);
        }}
      >
        <source src={src} type={mime} />
        {captions.map((c) => (
          <track key={c.lang} kind="subtitles" src={c.url} srcLang={c.lang} label={c.label} />
        ))}
      </video>

      {watermark && (
        <span aria-hidden className="pointer-events-none absolute left-[8%] top-[10%] text-xs font-medium text-white/20 animate-[swl-wm_40s_linear_infinite]">
          {watermark}
        </span>
      )}

      {waiting && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="size-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {!playing && !waiting && !error && countdown === null && (
        <button type="button" onClick={togglePlay} aria-label="Play" className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-[#006bff] text-white">
          <PlayIcon />
        </button>
      )}

      {resumed !== null && (
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-black/75 px-3 py-1.5 text-xs text-white">
          Resumed at {formatTimestamp(resumed)}
          <button type="button" className="font-semibold text-[#6aa8ff] hover:underline" onClick={() => { seek(0); setResumed(null); }}>Start over</button>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white">
          <p className="text-sm">This video couldn&apos;t be loaded. Check your connection and try again.</p>
          <button type="button" className="rounded-md bg-[#006bff] px-4 py-2 text-sm font-medium" onClick={() => { setError(false); setWaiting(true); video.current?.load(); }}>
            Retry
          </button>
        </div>
      )}

      {countdown !== null && next && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-white">
          <p className="text-xs uppercase tracking-wider text-white/60">Up next</p>
          <p className="text-lg font-semibold">{next.title}</p>
          <p className="text-sm text-white/70">Starting in {countdown}s</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-md bg-[#006bff] px-4 py-2 text-sm font-medium" onClick={() => router.push(next.href)}>Play now</button>
            <button type="button" className="flex items-center gap-1.5 rounded-md bg-white/15 px-4 py-2 text-sm" onClick={() => { setCountdown(null); seek(0); }}>
              <RotateCcw className="size-3.5" /> Replay
            </button>
            <button type="button" className="rounded-md bg-white/15 px-4 py-2 text-sm" onClick={() => setCountdown(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* controls */}
      <div className={cn("absolute inset-x-0 bottom-0 bg-black/70 px-3 pb-2 pt-3 transition-opacity", controlsOn ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div
          ref={bar}
          role="slider"
          tabIndex={-1}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(time)}
          aria-valuetext={`${formatTimestamp(time)} of ${formatTimestamp(duration)}`}
          onPointerDown={onBarDown}
          onPointerMove={onBarMove}
          onPointerLeave={() => setHoverAt(null)}
          className="relative h-5 cursor-pointer touch-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-white/25 group-hover:h-1.5">
            <div className="absolute inset-y-0 left-0 rounded bg-white/35" style={{ width: `${bufPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded bg-[#006bff]" style={{ width: `${pct}%` }} />
          </div>
          <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#006bff]" style={{ left: `${pct}%` }} />
          {hoverAt && (
            <span className="absolute -top-6 -translate-x-1/2 rounded bg-black px-1.5 py-0.5 text-[11px] text-white" style={{ left: `${hoverAt.x}%` }}>
              {formatTimestamp(hoverAt.seconds)}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-0.5">
          <button type="button" className={btn} onClick={togglePlay} aria-label={playing ? "Pause (k)" : "Play (k)"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" className={btn} onClick={() => seek((video.current?.currentTime ?? 0) - 10)} aria-label="Back 10 seconds (j)">−10</button>
          <button type="button" className={btn} onClick={() => seek((video.current?.currentTime ?? 0) + 10)} aria-label="Forward 10 seconds (l)">+10</button>

          <div className="group/vol flex items-center">
            <button type="button" className={btn} onClick={() => update({ muted: !prefs.muted })} aria-label={prefs.muted ? "Unmute (m)" : "Mute (m)"}>
              <VolumeIcon muted={prefs.muted || prefs.volume === 0} level={prefs.volume} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={prefs.muted ? 0 : prefs.volume}
              onChange={(e) => update({ volume: Number(e.target.value), muted: false })}
              aria-label="Volume"
              className="hidden h-1 w-20 cursor-pointer accent-[#006bff] group-hover/vol:block focus-visible:block"
            />
          </div>

          <span className="ml-1 text-xs tabular-nums text-white/90">
            {formatTimestamp(time)} / {formatTimestamp(duration)}
          </span>

          <div className="ml-auto flex items-center gap-0.5">
            <div className="relative">
              <button type="button" className={cn(btn, "tabular-nums")} onClick={() => setMenu(menu === "speed" ? null : "speed")} aria-label="Playback speed" aria-expanded={menu === "speed"}>
                {prefs.rate}×
              </button>
              {menu === "speed" && (
                <ul className="absolute bottom-11 right-0 w-24 rounded-md bg-black/90 py-1 text-sm text-white" role="menu">
                  {SPEEDS.map((s) => (
                    <li key={s}>
                      <button type="button" role="menuitemradio" aria-checked={prefs.rate === s} className={cn("w-full px-3 py-1.5 text-left hover:bg-white/15", prefs.rate === s && "text-[#6aa8ff]")} onClick={() => { update({ rate: s }); setMenu(null); }}>
                        {s === 1 ? "Normal" : `${s}×`}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {captions.length > 0 && (
              <div className="relative">
                <button type="button" className={cn(btn, prefs.captions && "text-[#6aa8ff]")} onClick={() => setMenu(menu === "captions" ? null : "captions")} aria-label="Captions (c)" aria-expanded={menu === "captions"}>
                  CC
                </button>
                {menu === "captions" && (
                  <ul className="absolute bottom-11 right-0 min-w-32 rounded-md bg-black/90 py-1 text-sm text-white" role="menu">
                    {[{ lang: null as string | null, label: "Off" }, ...captions].map((c) => (
                      <li key={c.lang ?? "off"}>
                        <button type="button" role="menuitemradio" aria-checked={prefs.captions === c.lang} className={cn("w-full px-3 py-1.5 text-left hover:bg-white/15", prefs.captions === c.lang && "text-[#6aa8ff]")} onClick={() => { update({ captions: c.lang }); setMenu(null); }}>
                          {c.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {pipSupported && (
              <button type="button" className={btn} onClick={togglePip} aria-label="Picture in picture (p)">
                <Settings2 className="size-4" />
              </button>
            )}
            <button type="button" className={btn} onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"}>
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
