"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, ExternalLink, MonitorPlay } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TutorialVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
}

interface VideosResponse {
  configured: boolean;
  videos: TutorialVideo[];
  lang: string;
  langs: { code: string; label: string }[];
}

/** Fallback pills before the API answers. Tamil first — priority audience. */
const DEFAULT_LANGS = [
  { code: "ta", label: "Tamil" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "bn", label: "Bengali" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
];

/**
 * Custom tutorial player for the Editorial tab. Tamil-first language switcher,
 * poster-first playback (the heavy YouTube iframe only loads on play, via the
 * privacy-enhanced youtube-nocookie embed) and a playlist of alternates.
 */
export function EditorialVideos({ slug, title }: { slug: string; title: string }) {
  const [lang, setLang] = useState("ta");
  const [current, setCurrent] = useState<TutorialVideo | null>(null);
  const [started, setStarted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery<VideosResponse>({
    queryKey: ["editorial-videos", slug, lang],
    queryFn: async () => {
      const res = await fetch(`/api/questions/videos?slug=${encodeURIComponent(slug)}&lang=${lang}`);
      if (!res.ok) throw new Error("Failed to load videos");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  // New language, new playlist: lead with its first video, paused on a poster.
  useEffect(() => {
    setCurrent(data?.videos[0] ?? null);
    setStarted(false);
    setExpanded(false);
  }, [data]);

  const langs = data?.langs ?? DEFAULT_LANGS;
  const playlist = (data?.videos ?? []).filter((v) => v.id !== current?.id);
  const visiblePlaylist = expanded ? playlist : playlist.slice(0, 0);

  const searchUrl = (code: string) => {
    const label = langs.find((l) => l.code === code)?.label ?? "";
    const q = `${title} coding problem solution ${code === "en" ? "explained" : label}`;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  };

  function switchLang(code: string) {
    setLang(code);
  }

  return (
    <section className="border-t pt-5">
      <div className="mb-3 flex items-center gap-2">
        <MonitorPlay className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Video tutorials</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.configured ? (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <p>Video search isn&apos;t enabled on this deployment yet.</p>
          <Button asChild size="sm" variant="outline" className="mt-2.5 gap-1.5">
            <a href={searchUrl(lang)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> Search tutorials on YouTube
            </a>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          {/* Player header: language switcher lives inside the player */}
          <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
            {langs.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => switchLang(l.code)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  lang === l.code
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {current ? (
            <>
              {/* Stage: poster until play, then the nocookie embed */}
              <div className="relative aspect-video w-full bg-black">
                {started ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&rel=0`}
                    title={current.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="size-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="group relative size-full"
                    aria-label={`Play: ${current.title}`}
                  >
                    {current.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={current.thumbnail.replace("mqdefault", "hqdefault")}
                        alt=""
                        className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-linear-to-t from-black/50 via-transparent to-transparent">
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                        <Play className="ml-0.5 size-6" />
                      </span>
                    </span>
                  </button>
                )}
              </div>

              {/* Now playing bar */}
              <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-semibold">{current.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{current.channel}</p>
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${current.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3" /> YouTube
                </a>
              </div>

              {/* Playlist */}
              {visiblePlaylist.length > 0 && (
                <ul className="divide-y">
                  {visiblePlaylist.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrent(v);
                          setStarted(true);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50"
                      >
                        <span className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                          {v.thumbnail && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={v.thumbnail} alt="" loading="lazy" className="size-full object-cover" />
                          )}
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                            <Play className="size-4 text-white drop-shadow" />
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-2 text-xs font-medium leading-snug">{v.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{v.channel}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {playlist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="block w-full border-t px-3 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  {expanded ? "Show less" : `Show ${playlist.length} more videos`}
                </button>
              )}
            </>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              <p>No {langs.find((l) => l.code === lang)?.label} tutorials found for this problem.</p>
              <Button asChild size="sm" variant="outline" className="mt-2.5 gap-1.5">
                <a href={searchUrl(lang)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" /> Search on YouTube
                </a>
              </Button>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Community videos from YouTube — quality varies. The AI mentor can explain this exact problem against your own code.
      </p>
    </section>
  );
}
