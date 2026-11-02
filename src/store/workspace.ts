import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LanguageId } from "@/lib/constants";

interface WorkspaceState {
  /** auto-saved drafts keyed by `${questionId}:${language}` */
  drafts: Record<string, string>;
  language: LanguageId;
  fontSize: number;
  vimMode: boolean;
  saveDraft: (questionId: string, language: string, code: string) => void;
  getDraft: (questionId: string, language: string) => string | undefined;
  clearDraft: (questionId: string, language: string) => void;
  setLanguage: (language: LanguageId) => void;
  setFontSize: (fontSize: number) => void;
  setVimMode: (vimMode: boolean) => void;
}

const MAX_DRAFTS = 100;

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      drafts: {},
      language: "javascript",
      fontSize: 14,
      vimMode: false,

      saveDraft: (questionId, language, code) =>
        set((state) => {
          const drafts = { ...state.drafts, [`${questionId}:${language}`]: code };
          // Evict oldest entries so localStorage stays bounded
          const keys = Object.keys(drafts);
          if (keys.length > MAX_DRAFTS) {
            for (const key of keys.slice(0, keys.length - MAX_DRAFTS)) {
              delete drafts[key];
            }
          }
          return { drafts };
        }),

      getDraft: (questionId, language) =>
        get().drafts[`${questionId}:${language}`],

      clearDraft: (questionId, language) =>
        set((state) => {
          const drafts = { ...state.drafts };
          delete drafts[`${questionId}:${language}`];
          return { drafts };
        }),

      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setVimMode: (vimMode) => set({ vimMode }),
    }),
    { name: "setups-works-workspace" },
  ),
);
