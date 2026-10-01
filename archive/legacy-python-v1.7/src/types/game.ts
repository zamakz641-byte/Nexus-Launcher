export type ViewType =
  | 'accueil'
  | 'bibliotheque'
  | 'collections'
  | 'succes'
  | 'statistiques'
  | 'parametres';

export interface GameAchievement {
  id: string;
  title: string;
  description: string;
  rarity: number;
  unlocked: boolean;
  unlockedAt?: string | number | null;
  iconUrl?: string;
  iconGrayUrl?: string;
}

export interface PlaySession {
  id: string;
  gameId: string;
  gameTitle: string;
  date: string;
  endedAt?: string;
  durationSeconds?: number;
  durationMinutes: number;
}

export interface Game {
  id: string;
  source?: 'steam' | 'epic' | 'gog' | 'manual' | string;
  sourceId?: string;
  steamAppId?: string;
  steamGridDbId?: string | number;
  title: string;
  eyebrow?: string;
  logoUrl?: string;
  iconUrl?: string;
  quote?: string;
  description: string;
  genres: string[];
  playtimeSeconds?: number;
  playtimeHours: number;
  lastPlayedAt?: string | null;
  lastSession: string;
  achievementsUnlocked: number;
  totalAchievements: number;
  coverImage: string;
  heroImage: string;
  trailerUrl?: string;
  trailerEmbedUrl?: string;
  trailerPageUrl?: string;
  trailerPosterUrl?: string;
  trailerProvider?: string;
  trailerName?: string;
  trailerIsLocal?: boolean;
  accentColor: string;
  accentSecondary?: string;
  isFavorite: boolean;
  collections: string[];
  developer: string;
  publisher: string;
  releaseYear: number;
  installSizeBytes?: number;
  installSizeGb: number;
  installDir?: string;
  executablePath?: string;
  launchUri?: string;
  screenshots: string[];
  recentAchievements: GameAchievement[];
  importedAt?: string;
  updatedAt?: string;
  mediaStatus?: 'importing' | 'ready' | 'error' | string;
  warnings?: string[];
  runAsAdmin?: boolean;
  requiresElevation?: boolean;
  lastLaunchElevated?: boolean;
  identityLocked?: boolean;
  identityProvider?: string;
  identityConfidence?: number;
  canonicalTitle?: string;
  titleLocked?: boolean;
  metadataSources?: Record<string, string>;
  metadataConfidence?: Record<string, number>;
}

export type AccentTheme = 'gold' | 'cyan' | 'crimson' | 'emerald' | 'purple';

export interface LauncherSettings {
  accentTheme: AccentTheme;
  sfxEnabled: boolean;
  sfxVolume: number;
  launchAnimation: boolean;
  startupAnimation: boolean;
  ambientMotion: boolean;
  controllerHints: boolean;
  showClock: boolean;
  density: 'standard' | 'compact' | 'cinematic';
  username: string;
  statusText: string;
  avatarUrl: string;
  steamGridDbApiKey: string;
  igdbClientId: string;
  igdbClientSecret: string;
  steamWebApiKey: string;
  steamId64: string;
  autoScanSteam: boolean;
  autoDownloadTrailer: boolean;
  autoDownloadScreenshots: boolean;
  hideDuringGame: boolean;
  lowImpactMode: boolean;
  reopenAfterGame: boolean;
  startFullscreen: boolean;
  launchDelayMs: number;
  language: 'fr' | 'en' | 'es';
  metadataLanguage: 'fr' | 'en' | 'es';
  sfxPack: string;
}


export interface IdentityCandidate {
  provider: 'steam' | 'steamgriddb' | string;
  providerId: string;
  steamAppId?: string;
  steamGridDbId?: string;
  title: string;
  imageUrl?: string;
  score: number;
  releaseYear?: number;
  developer?: string;
  publisher?: string;
  description?: string;
  verified?: boolean;
}
export interface ImportCandidate {
  source: string;
  sourceId: string;
  steamAppId?: string;
  epicNamespace?: string;
  epicCatalogItemId?: string;
  epicAppName?: string;
  title: string;
  installDir?: string;
  installSizeBytes?: number;
  executablePath?: string;
  launchUri?: string;
  alreadyImported?: boolean;
  nameCandidates?: string[];
  detectedFrom?: string;
  titleLocked?: boolean;
}

export interface ImportJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  step?: string;
  progress?: number;
  message?: string;
  result?: Game;
  error?: string;
}

export interface NativeBootstrap {
  version: string;
  games: Game[];
  sessions: PlaySession[];
  settings: LauncherSettings;
  activeGame: { gameId: string; startedAt: string } | null;
  dataDirectory: string;
  platform: string;
}

export interface SoundCueItem {
  file: string;
  gain?: number;
  rate?: number;
  delayMs?: number;
}

export type SoundCue = SoundCueItem | SoundCueItem[];

export interface SoundPackManifest {
  schema: number;
  id: string;
  name: string;
  author: string;
  version: string;
  type: 'soundpack';
  license: string;
  description?: string;
  builtin?: boolean;
  assetBase: string;
  cues: Record<string, SoundCue>;
}
