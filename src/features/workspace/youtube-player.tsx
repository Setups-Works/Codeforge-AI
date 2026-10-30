"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play } from "@/components/icons";

/** Minimal slice of the YouTube IFrame Player API we use. */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// YT.PlayerState values
const ENDED = 0;
const PLAYING = 1;
const BUFFERING = 3;

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * Chrome-less YouTube player: the native controls, title bar, channel link,
 * share/watch-later buttons and "More videos" panel are never reachable — the
 * iframe ignores pointer events and our own control bar drives it through the
 * IFrame API. While paused/ended/loading a poster covers the frame so YouTube's
 * own paused-state UI can't show through.
 */
export function YouTubePlayer({
  videoId,
  title,
  poster,
}: {
  videoId: string;
  title: string;
  poster?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<number>(-1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let player: YTPlayer | null = null;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      // The API replaces its mount node with the iframe; give it a fresh child.
      const node = document.createElement("div");
      mountRef.current.replaceChildren(node);
      player = new YT.Player(node, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          cc_load_policy: 0,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            setDuration(player!.getDuration());
            setReady(true);
          },
          onStateChange: (e) => {
            setState(e.data);
            if (player) setDuration(player.getDuration());
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current = null;
      player?.destroy();
    };
  }, [videoId]);

  // Progress ticker — only while actually playing.
  useEffect(() => {
    if (state !== PLAYING) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (p) setTime(p.getCurrentTime());
    }, 400);
    return () => clearInterval(id);
  }, [state]);

  const playing = state === PLAYING;
  // Show our poster whenever YouTube's own overlays could appear.
  const covered = !ready || !(playing || state === BUFFERING);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else {
      if (state === ENDED) p.seekTo(0, true);
      p.playVideo();
    }
  }, [playing, state]);

  function seek(v: number) {
    playerRef.current?.seekTo(v, true);
    setTime(v);
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  }

  function fullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  return (
    <div ref={stageRef} className="group relative aspect-video w-full overflow-hidden bg-black">
      {/* Iframe can't be clicked or hovered: no YouTube title/share/overlay UI. */}
      <div
        ref={mountRef}
        aria-label={title}
        className="pointer-events-none absolute inset-0 [&_iframe]:size-full"
      />

      {/* Click-catcher + poster that hides YouTube's paused/loading chrome */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause: ${title}` : `Play: ${title}`}
        className="absolute inset-0 flex items-center justify-center"
      >
        {covered && (
          <>
            {poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" className="absolute inset-0 size-full object-cover opacity-90" />
            )}
            <span className="absolute inset-0 bg-black/30" />
            <span className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              {!ready || state === -1 ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <Play className="ml-0.5 size-6" />
              )}
            </span>
          </>
        )}
      </button>

      {/* Our own control bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-linear-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-white">
        <button type="button" onClick={toggle} className="text-xs font-medium" aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <span className="w-20 shrink-0 text-[11px] tabular-nums">
          {fmt(time)} / {fmt(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
        />
        <button type="button" onClick={toggleMute} className="text-[11px] font-medium" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? "Unmute" : "Mute"}
        </button>
        <button type="button" onClick={fullscreen} className="text-[11px] font-medium" aria-label="Fullscreen">
          Full
        </button>
      </div>
    </div>
  );
}
