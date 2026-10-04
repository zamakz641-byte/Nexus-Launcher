/// <reference types="vite/client" />

interface Window {
  nexusDesktop?: {
    chooseLibraryFolder: () => Promise<unknown | null>;
    addGameFolder: () => Promise<unknown | null>;
    scanLibrary: (sourceId?: string, force?: boolean) => Promise<unknown>;
    listLibrary: () => Promise<unknown>;
    onLibraryChanged: (callback: (payload: unknown) => void) => () => void;
    addGameExecutable: () => Promise<unknown | null>;
    removeLibraryEntry: (id: string) => Promise<unknown>;
    setGameTitle: (id: string, title: string) => Promise<unknown>;
    chooseGameExecutable: (id: string) => Promise<unknown | null>;
    chooseGameArtwork: (id: string, role: "gridArtwork" | "heroArtwork" | "logoArtwork") => Promise<unknown | null>;
    getSteamGridStatus: () => Promise<unknown>;
    getSteamAccountStatus: () => Promise<import('./steamAchievementsTypes').SteamAccountStatus>;
    saveSteamAccount: (value: { steamId:string; apiKey:string }) => Promise<import('./steamAchievementsTypes').SteamAccountStatus>;
    clearSteamAccount: () => Promise<import('./steamAchievementsTypes').SteamAccountStatus>;
    getSteamAchievements: (appId:number, locale:'fr'|'en', force?:boolean) => Promise<import('./steamAchievementsTypes').SteamAchievementResult>;
    saveSteamGridKey: (value: string) => Promise<unknown>;
    clearSteamGridKey: () => Promise<unknown>;
    searchCatalog: (query: string) => Promise<unknown>;
    system: () => Promise<unknown>;
    launchGame: (gameId: string) => Promise<unknown>;
    platform: string;
  };
}
