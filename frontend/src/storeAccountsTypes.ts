export type StoreProvider = 'epic' | 'gog';
export interface StoreAccountStatus { configured: boolean; storageAvailable: boolean; displayName?: string; error?: 'cancelled' | 'timeout' | 'storage-unavailable' | 'invalid-auth' | 'error' }
export interface StoreLibraryResult {
  source: 'Steam' | 'Epic' | 'GOG';
  state: 'ready' | 'unconfigured' | 'offline' | 'error' | 'private';
  lastSynced: string | null;
  cached: boolean;
  games: { id: string; title: string; playtimeMinutes?: number }[];
}
