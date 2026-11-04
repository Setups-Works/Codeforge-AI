"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

/** What other parts of the lesson page (notes) can do with the video. */
interface PlayerHandle {
  currentTime: () => number;
  seek: (seconds: number) => void;
}

interface PlayerContextValue {
  /** Called by the player while it is mounted. */
  register: (handle: PlayerHandle | null) => void;
  /** Current playhead in whole seconds, or null when there is no custom player (e.g. a Drive embed). */
  currentTime: () => number | null;
  seek: (seconds: number) => boolean;
}

const Ctx = createContext<PlayerContextValue | null>(null);

export function LessonPlayerProvider({ children }: { children: ReactNode }) {
  const handle = useRef<PlayerHandle | null>(null);
  const register = useCallback((h: PlayerHandle | null) => {
    handle.current = h;
  }, []);
  const value = useMemo<PlayerContextValue>(
    () => ({
      register,
      currentTime: () => (handle.current ? Math.floor(handle.current.currentTime()) : null),
      seek: (s) => {
        if (!handle.current) return false;
        handle.current.seek(s);
        return true;
      },
    }),
    [register],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Safe outside a provider: returns a player that is never available. */
export function useLessonPlayer(): PlayerContextValue {
  return useContext(Ctx) ?? { register: () => {}, currentTime: () => null, seek: () => false };
}
