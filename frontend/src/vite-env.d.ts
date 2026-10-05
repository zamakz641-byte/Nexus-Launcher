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
    connectSteamAccount: () => Promise<import('./steamAchievementsTypes').SteamAccountStatus>;
    cancelSteamConnection: () => Promise<import('./steamAchievementsTypes').SteamAccountStatus>;
    onSteamDataChanged: (callback:()=>void) => ()=>void;
    getAchievementNotificationSettings: () => Promise<{enabled:boolean;locale:'fr'|'en'}>;
    setAchievementNotificationSettings: (value:{enabled:boolean;locale:'fr'|'en'}) => Promise<{enabled:boolean;locale:'fr'|'en'}>;
    testAchievementNotification: (locale:'fr'|'en') => Promise<{ok:true}>;
    getSanCompanionStatus: () => Promise<{enabled:boolean;installed:boolean;executable:string;supported:boolean}>;
    chooseSanExecutable: () => Promise<{enabled:boolean;installed:boolean;executable:string;supported:boolean}>;
    setSanCompanionEnabled: (enabled:boolean) => Promise<{enabled:boolean;installed:boolean;executable:string;supported:boolean}>;
    launchSanCompanion: () => Promise<{state:string}>;
    openSanDownload: () => Promise<{ok:true}>;
    getSteamLibrary: (force?: boolean) => Promise<import('./storeAccountsTypes').StoreLibraryResult>;
    getStoreAccountStatus: (provider: import('./storeAccountsTypes').StoreProvider) => Promise<import('./storeAccountsTypes').StoreAccountStatus>;
    connectStoreAccount: (provider: import('./storeAccountsTypes').StoreProvider) => Promise<import('./storeAccountsTypes').StoreAccountStatus>;
    clearStoreAccount: (provider: import('./storeAccountsTypes').StoreProvider) => Promise<import('./storeAccountsTypes').StoreAccountStatus>;
    getStoreLibrary: (provider: import('./storeAccountsTypes').StoreProvider, force?: boolean) => Promise<import('./storeAccountsTypes').StoreLibraryResult>;
    saveSteamAccount: (value: { steamId:string; apiKey:string }) => Promise<import('./steamAchievementsTypes').SteamAccountStatus>;
    clearSteamAccount: () => Promise<import('./steamAchievementsTypes').SteamAccountStatus>;
    getSteamAchievements: (appId:number, locale:'fr'|'en', force?:boolean) => Promise<import('./steamAchievementsTypes').SteamAchievementResult>;
    saveSteamGridKey: (value: string) => Promise<unknown>;
    clearSteamGridKey: () => Promise<unknown>;
    searchCatalog: (query: string) => Promise<unknown>;
    system: () => Promise<unknown>;
    launchGame: (gameId: string, locale?:'fr'|'en') => Promise<unknown>;
    platform: string;
  };
}
