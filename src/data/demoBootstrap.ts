import type { Game, NativeBootstrap } from '../types/game';

const hero = '/art/nexus-aetherfall-hero.png';

const makeGame = (game: Partial<Game> & Pick<Game, 'id' | 'title' | 'accentColor'>): Game => ({
  id: game.id,
  source: 'manual',
  title: game.title,
  eyebrow: game.eyebrow || 'WORLDS PLAY TOGETHER',
  description: game.description || 'Explore un monde immense, retrouve ta progression et reprends l’aventure en un instant.',
  genres: game.genres || ['Action', 'Aventure'],
  playtimeHours: game.playtimeHours || 0,
  lastSession: game.lastSession || 'Jamais',
  achievementsUnlocked: game.achievementsUnlocked || 0,
  totalAchievements: game.totalAchievements || 42,
  coverImage: game.coverImage || hero,
  heroImage: game.heroImage || hero,
  accentColor: game.accentColor,
  isFavorite: game.isFavorite || false,
  collections: game.collections || [],
  developer: game.developer || 'Nexus Worlds',
  publisher: game.publisher || 'Nexus Publishing',
  releaseYear: game.releaseYear || 2026,
  installSizeGb: game.installSizeGb || 64,
  screenshots: game.screenshots || [hero],
  recentAchievements: game.recentAchievements || [],
  ...game,
});

export const DEMO_GAMES: Game[] = [
  makeGame({
    id: 'aetherwalkers',
    title: 'Aetherwalkers',
    eyebrow: 'FARTHER TOGETHER',
    accentColor: '#66ddff',
    playtimeHours: 48.6,
    achievementsUnlocked: 31,
    isFavorite: true,
    quote: 'Some worlds stay with you.',
    description: 'Traverse des royaumes suspendus et rallume le Nexus avant que les derniers mondes ne s’effondrent.',
  }),
  makeGame({ id: 'void-system', title: 'Void System', accentColor: '#8b9dff', playtimeHours: 21.4, achievementsUnlocked: 18, genres: ['RPG', 'Science-fiction'] }),
  makeGame({ id: 'emberfall', title: 'Emberfall', accentColor: '#ff9d55', playtimeHours: 12.8, achievementsUnlocked: 9, genres: ['Action', 'RPG'] }),
  makeGame({ id: 'drift', title: 'Neon Drift', accentColor: '#39c5ff', playtimeHours: 34.2, achievementsUnlocked: 27, genres: ['Course', 'Arcade'] }),
  makeGame({ id: 'mech-frontier', title: 'Mech Frontier', accentColor: '#9ac8ff', playtimeHours: 8.5, achievementsUnlocked: 6, genres: ['Stratégie', 'Action'] }),
  makeGame({ id: 'lumen', title: 'Lumen', accentColor: '#e6c46c', playtimeHours: 17.1, achievementsUnlocked: 14, genres: ['Aventure', 'Exploration'] }),
];

export const DEMO_BOOTSTRAP: NativeBootstrap = {
  version: '1.7.0-preview',
  games: DEMO_GAMES,
  sessions: [],
  settings: {
    accentTheme: 'cyan', sfxEnabled: false, sfxVolume: 0.62, launchAnimation: true,
    startupAnimation: true, ambientMotion: true, controllerHints: true, showClock: true,
    density: 'cinematic', username: 'NexusPlayer', statusText: 'Prêt à jouer', avatarUrl: '',
    steamGridDbApiKey: '', igdbClientId: '', igdbClientSecret: '', steamWebApiKey: '', steamId64: '',
    autoScanSteam: true, autoDownloadTrailer: true, autoDownloadScreenshots: true,
    hideDuringGame: true, lowImpactMode: true, reopenAfterGame: true, startFullscreen: true,
    launchDelayMs: 3200, language: 'fr', metadataLanguage: 'fr', sfxPack: 'nexus-glass',
  },
  activeGame: null,
  dataDirectory: '',
  platform: 'win32',
};
