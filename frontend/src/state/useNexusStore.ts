import { create } from "zustand";
import type { Game, GameId, Locale, SystemInfo, ThemeId } from "../types";
import { readMediaPreferences, sanitizeMediaPreferences, type MediaPreferences } from "../media/preferences";

const readLocale = (): Locale => typeof localStorage !== "undefined" && localStorage.getItem("nexus.locale.v1") === "en" ? "en" : "fr";
const readTheme = (): ThemeId => typeof localStorage !== "undefined" && localStorage.getItem("nexus.theme.v1") === "solaris" ? "solaris" : "obsidienne";

interface NexusState {
  selectedGameId: GameId;
  previewGameId: GameId;
  locale: Locale;
  theme: ThemeId;
  mediaPreferences: MediaPreferences;
  setMediaPreferences: (value: Partial<MediaPreferences>) => void;
  inputMode: "controller" | "keyboard" | "pointer";
  discoveredGames: Game[];
  libraryRoot: string;
  libraryRoots: { id: string; path: string; enabled: boolean; kind?: "collection" | "game"; platform?: "Steam" | "Epic"; auto?: boolean; title?: string }[];
  manualGames: { id: string; executablePath: string; title: string }[];
  libraryScanErrors: Record<string, string>;
  libraryScanState: "idle" | "scanning" | "ready" | "error";
  libraryScanMessage: string;
  systemInfo: SystemInfo | null;
  setSelectedGame: (id: GameId) => void;
  setPreviewGame: (id: GameId) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeId) => void;
  setInputMode: (mode: NexusState["inputMode"]) => void;
  beginLibraryScan: () => void;
  completeLibraryScan: (games: Game[], root: string, roots?: NexusState["libraryRoots"], manualGames?: NexusState["manualGames"], scanErrors?: Record<string, string>) => void;
  failLibraryScan: (message: string) => void;
  setSystemInfo: (info: SystemInfo) => void;
}

export const useNexusStore = create<NexusState>((set) => ({
  selectedGameId: "",
  previewGameId: "",
  locale: readLocale(),
  theme: readTheme(),
  mediaPreferences: readMediaPreferences(),
  setMediaPreferences: (value) => set(state => {
    const mediaPreferences = sanitizeMediaPreferences({ ...state.mediaPreferences, ...value });
    localStorage.setItem('nexus.media.v1', JSON.stringify(mediaPreferences));
    return { mediaPreferences };
  }),
  inputMode: "controller",
  discoveredGames: [],
  libraryRoot: "",
  libraryRoots: [],
  manualGames: [],
  libraryScanErrors: {},
  libraryScanState: "idle",
  libraryScanMessage: "En attente de l’analyse locale",
  systemInfo: null,
  setSelectedGame: (selectedGameId) => set((state) => state.selectedGameId === selectedGameId ? state : { selectedGameId }),
  setPreviewGame: (previewGameId) => set((state) => state.previewGameId === previewGameId ? state : { previewGameId }),
  setLocale: (locale) => {
    localStorage.setItem("nexus.locale.v1", locale);
    set({ locale });
  },
  setTheme: (theme) => {
    localStorage.setItem("nexus.theme.v1", theme);
    set({ theme });
  },
  setInputMode: (inputMode) => set((state) => state.inputMode === inputMode ? state : { inputMode }),
  beginLibraryScan: () => set({ libraryScanState: "scanning", libraryScanMessage: "Analyse de la bibliothèque locale…" }),
  completeLibraryScan: (discoveredGames, libraryRoot, libraryRoots = [], manualGames = [], libraryScanErrors = {}) => set((state) => ({ discoveredGames, libraryRoot, libraryRoots, manualGames, libraryScanErrors, selectedGameId: discoveredGames.some((game) => game.id === state.selectedGameId) ? state.selectedGameId : discoveredGames[0]?.id ?? "", libraryScanState: "ready", libraryScanMessage: `${discoveredGames.length} jeux locaux détectés` })),
  failLibraryScan: (libraryScanMessage) => set({ libraryScanState: "error", libraryScanMessage }),
  setSystemInfo: (systemInfo) => set({ systemInfo, libraryRoot: systemInfo.libraryRoot }),
}));
