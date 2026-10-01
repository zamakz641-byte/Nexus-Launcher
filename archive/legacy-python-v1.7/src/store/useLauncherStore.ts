import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Game, LauncherSettings, ViewType, PlaySession } from '../types/game';
import { bootstrapNative, nativeApi } from '../services/native';
import { configureSoundPack, playSfx, suspendSfx, resumeSfx } from '../services/sound';

const DEFAULT_SETTINGS: LauncherSettings = {
  accentTheme: 'gold',
  sfxEnabled: true,
  sfxVolume: 0.62,
  launchAnimation: true,
  startupAnimation: true,
  ambientMotion: true,
  controllerHints: true,
  showClock: true,
  density: 'cinematic',
  username: 'NexusPlayer',
  statusText: 'Prêt à jouer',
  avatarUrl: '',
  steamGridDbApiKey: '',
  igdbClientId: '',
  igdbClientSecret: '',
  steamWebApiKey: '',
  steamId64: '',
  autoScanSteam: true,
  autoDownloadTrailer: true,
  autoDownloadScreenshots: true,
  hideDuringGame: true,
  lowImpactMode: true,
  reopenAfterGame: true,
  startFullscreen: true,
  launchDelayMs: 2450,
  language: 'fr',
  metadataLanguage: 'fr',
  sfxPack: 'nexus-glass',
};

const LIBRARY_CACHE_KEY = 'nexus.library.cache.v1';

function readCachedGames(): Game[] {
  try {
    const raw = window.localStorage.getItem(LIBRARY_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedGames(games: Game[]): void {
  try {
    if (games.length) window.localStorage.setItem(LIBRARY_CACHE_KEY, JSON.stringify(games));
    else window.localStorage.removeItem(LIBRARY_CACHE_KEY);
  } catch {
    // LocalStorage is only a warm-start cache. SQLite remains the source of truth.
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function useLauncherStore() {
  const [games, setGames] = useState<Game[]>(() => readCachedGames());
  const [settings, setSettings] = useState<LauncherSettings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  // Keep the app surface hidden behind the raw HTML startup screen until the
  // first native/bootstrap attempt has actually resolved. Games are still read
  // from the warm cache immediately, but they cannot flash before the startup.
  const [ready, setReady] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('accueil');
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [launchSequenceGameId, setLaunchSequenceGameId] = useState<string | null>(null);
  const [playingGameId, setPlayingGameId] = useState<string | null>(null);
  const [playingStartTime, setPlayingStartTime] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const mountedRef = useRef(true);
  // Native game-exit events are registered once. Keep the latest audio settings
  // in a ref so the instant wake cue never captures the bootstrap defaults.
  const settingsRef = useRef<LauncherSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    void configureSoundPack(settings.sfxPack).catch(() => {});
  }, [settings.sfxPack]);

  const syncFromNative = useCallback(async (attempts = 4) => {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
      try {
        const api = await nativeApi();
        const [nextGames, nextSessions] = await Promise.all([api.list_games(), api.list_sessions()]);
        if (!mountedRef.current) return;
        setGames(nextGames);
        writeCachedGames(nextGames);
        setSessions(nextSessions);
        setSelectedGameId((current) => {
          if (current && nextGames.some((game) => game.id === current)) return current;
          return nextGames[0]?.id || '';
        });
        setNativeError(null);
        return;
      } catch (error) {
        lastError = error;
        if (attempt + 1 < attempts) await wait(160 + attempt * 180);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Synchronisation Nexus impossible.'));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      let lastError: unknown = null;
      // pywebview can be visually ready before every generated JS method is
      // callable. Never turn a transient bridge race into an empty library.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const bootstrap = await bootstrapNative();
          if (!mountedRef.current) return;
          const nextGames = bootstrap.games || [];
          setGames(nextGames);
          writeCachedGames(nextGames);
          setSessions(bootstrap.sessions || []);
          setSettings({ ...DEFAULT_SETTINGS, ...(bootstrap.settings || {}) });
          setSelectedGameId((current) => {
            if (current && nextGames.some((game) => game.id === current)) return current;
            return nextGames[0]?.id || '';
          });
          if (bootstrap.activeGame) {
            setPlayingGameId(bootstrap.activeGame.gameId);
            const started = Date.parse(bootstrap.activeGame.startedAt);
            setPlayingStartTime(Number.isFinite(started) ? started : Date.now());
          }
          setNativeError(null);
          setReady(true);
          return;
        } catch (error) {
          lastError = error;
          window.__nexusBootStatus?.(attempt < 2 ? `Nouvelle tentative du moteur local… (${attempt + 2}/3)` : 'Diagnostic du moteur local…');
          if (attempt < 2) await wait(420 + attempt * 520);
        }
      }

      if (!mountedRef.current) return;
      // A failed native bootstrap is not a usable launcher. Keep the cinematic
      // boot surface visible and expose recovery controls instead of revealing
      // a half-connected UI that can turn black on the first native action.
      const message = lastError instanceof Error ? lastError.message : String(lastError || 'Le pont pywebview n’est pas prêt.');
      setNativeError(message);
      window.__nexusBootFail?.(message);
    })();

    const onStarted = (event: Event) => {
      // Ignore stale/native events while the boot gate still owns the screen.
      // Nothing should be allowed to hide the renderer before first reveal.
      if (document.documentElement.dataset.nexusBoot !== 'complete') return;
      const detail = (event as CustomEvent<{ gameId?: string; startedAt?: string }>).detail || {};
      if (detail.gameId) setPlayingGameId(detail.gameId);
      if (detail.startedAt) {
        const started = Date.parse(detail.startedAt);
        setPlayingStartTime(Number.isFinite(started) ? started : Date.now());
      }
      document.documentElement.classList.add('nexus-sleep');
      suspendSfx();
    };
    const onExit = () => {
      document.documentElement.classList.remove('nexus-sleep');
      setPlayingGameId(null);
      setPlayingStartTime(null);
      resumeSfx();
      const latest = settingsRef.current;
      playSfx('wake', latest.sfxEnabled, latest.sfxVolume);
      // Re-fetch asynchronously after the native window is already visible.
      // The user gets the launcher back immediately; stats catch up a moment later.
      void syncFromNative().catch(() => {});
    };
    window.addEventListener('nexus-game-started', onStarted as EventListener);
    window.addEventListener('nexus-game-exited', onExit as EventListener);
    return () => {
      mountedRef.current = false;
      document.documentElement.classList.remove('nexus-sleep');
      window.removeEventListener('nexus-game-started', onStarted as EventListener);
      window.removeEventListener('nexus-game-exited', onExit as EventListener);
    };
  }, [syncFromNative]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) suspendSfx();
      else resumeSfx();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const selectedGame = useMemo<Game | null>(
    () => games.find((g) => g.id === selectedGameId) || games[0] || null,
    [games, selectedGameId]
  );

  const switchView = useCallback((view: ViewType) => {
    playSfx('confirm', settings.sfxEnabled, settings.sfxVolume);
    setActiveView(view);
  }, [settings.sfxEnabled, settings.sfxVolume]);

  const selectGame = useCallback((id: string) => {
    if (id !== selectedGameId) {
      playSfx('focus', settings.sfxEnabled, settings.sfxVolume);
      setSelectedGameId(id);
    }
  }, [selectedGameId, settings.sfxEnabled, settings.sfxVolume]);

  const toggleFavorite = useCallback(async (id: string) => {
    const game = games.find((g) => g.id === id);
    if (!game) return;
    const nextFavorite = !game.isFavorite;
    const nextCollections = nextFavorite
      ? Array.from(new Set([...(game.collections || []), 'Favoris']))
      : (game.collections || []).filter((item) => item !== 'Favoris');
    setGames((prev) => prev.map((g) => g.id === id ? { ...g, isFavorite: nextFavorite, collections: nextCollections } : g));
    playSfx('confirm', settings.sfxEnabled, settings.sfxVolume);
    try {
      const api = await nativeApi();
      const updated = await api.update_game(id, { isFavorite: nextFavorite, collections: nextCollections });
      if (updated) setGames((prev) => prev.map((g) => g.id === id ? updated : g));
    } catch {
      void syncFromNative().catch(() => {});
    }
  }, [games, settings.sfxEnabled, settings.sfxVolume, syncFromNative]);

  const startNativeGame = useCallback(async (id: string) => {
    if (import.meta.env.DEV && !window.pywebview?.api) {
      setPlayingGameId(id);
      setPlayingStartTime(Date.now());
      return;
    }
    const api = await nativeApi();
    const result = await api.launch_game(id);
    if (!result?.ok) throw new Error(result?.error || 'Le jeu n’a pas pu être lancé.');
    setPlayingGameId(id);
    const started = result.startedAt ? Date.parse(result.startedAt) : Date.now();
    setPlayingStartTime(Number.isFinite(started) ? started : Date.now());
    // The native window may disappear immediately after this when low-impact mode is enabled.
    suspendSfx();
  }, []);

  const triggerLaunch = useCallback((id: string) => {
    const game = games.find((g) => g.id === id);
    if (!game) return;
    setSelectedGameId(id);
    playSfx('launch', settings.sfxEnabled, settings.sfxVolume);
    if (settings.launchAnimation) {
      setLaunchSequenceGameId(id);
    } else {
      void startNativeGame(id).catch((error) => {
        setNativeError(error instanceof Error ? error.message : String(error));
        resumeSfx();
      });
    }
  }, [games, settings.launchAnimation, settings.sfxEnabled, settings.sfxVolume, startNativeGame]);

  const completeLaunch = useCallback(async (id: string) => {
    setLaunchSequenceGameId(null);
    try {
      await startNativeGame(id);
    } catch (error) {
      setNativeError(error instanceof Error ? error.message : String(error));
      resumeSfx();
      playSfx('back', settings.sfxEnabled, settings.sfxVolume);
    }
  }, [settings.sfxEnabled, settings.sfxVolume, startNativeGame]);

  const cancelLaunch = useCallback(() => {
    playSfx('back', settings.sfxEnabled, settings.sfxVolume);
    setLaunchSequenceGameId(null);
  }, [settings.sfxEnabled, settings.sfxVolume]);

  const stopCurrentGame = useCallback(async () => {
    try {
      const api = await nativeApi();
      await api.stop_game();
    } catch (error) {
      setNativeError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const updateSettings = useCallback(async (partial: Partial<LauncherSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    if (!('sfxVolume' in partial)) {
      playSfx('toggle', partial.sfxEnabled ?? settings.sfxEnabled, settings.sfxVolume);
    }
    try {
      const api = await nativeApi();
      const saved = await api.update_settings(partial);
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
    } catch (error) {
      setNativeError(error instanceof Error ? error.message : String(error));
    }
  }, [settings.sfxEnabled, settings.sfxVolume]);

  const resetToDefaults = useCallback(async () => {
    try {
      const api = await nativeApi();
      const saved = await api.reset_settings();
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
      playSfx('confirm', true, 0.55);
    } catch (error) {
      setNativeError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const deleteGame = useCallback(async (gameId: string, deleteMedia = false) => {
    const api = await nativeApi();
    await api.delete_game(gameId, deleteMedia);
    await syncFromNative();
  }, [syncFromNative]);

  const refreshGameMedia = useCallback(async (gameId: string) => {
    const api = await nativeApi();
    return api.refresh_media(gameId);
  }, []);

  const syncAchievements = useCallback(async (gameId: string) => {
    const api = await nativeApi();
    const result = await api.sync_achievements(gameId);
    if (!result?.ok) throw new Error(result?.error || 'Synchronisation des succès impossible.');
    if (result.game) {
      setGames((prev) => {
        const next = prev.map((game) => game.id === gameId ? result.game as Game : game);
        writeCachedGames(next);
        return next;
      });
    }
    return result;
  }, []);

  return {
    games,
    settings,
    sessions,
    ready,
    nativeError,
    setNativeError,
    activeView,
    selectedGameId,
    selectedGame,
    launchSequenceGameId,
    playingGameId,
    playingStartTime,
    searchOpen,
    detailsOpen,
    addGameOpen,
    switchView,
    selectGame,
    toggleFavorite,
    triggerLaunch,
    completeLaunch,
    cancelLaunch,
    stopCurrentGame,
    setSearchOpen,
    setDetailsOpen,
    setAddGameOpen,
    updateSettings,
    resetToDefaults,
    refreshLibrary: syncFromNative,
    deleteGame,
    refreshGameMedia,
    syncAchievements,
  };
}
