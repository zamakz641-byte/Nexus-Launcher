/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useLauncherStore } from './store/useLauncherStore';
import { useController } from './services/useController';
import { configureSoundPack, playSfx } from './services/sound';
import { nativeApi } from './services/native';

import { ActivePlayingBar } from './components/ActivePlayingBar';
import { SearchModal } from './components/SearchModal';
import { GameDetailsModal } from './components/GameDetailsModal';
import { AddGameModal } from './components/AddGameModal';
import { HomeView } from './views/HomeView';
import { LibraryView } from './views/LibraryView';
import { CollectionsView } from './views/CollectionsView';
import { AchievementsView } from './views/AchievementsView';
import { StatisticsView } from './views/StatisticsView';
import { SettingsView } from './views/SettingsView';
import { NexusTopNav } from './components/NexusTopNav';
import { ViewTransition } from './components/ViewTransition';

const LaunchOverlay = React.lazy(() => import('./components/LaunchOverlay').then((module) => ({ default: module.LaunchOverlay })));


const ACCENT_COLORS = {
  gold: '#f7cb58',
  cyan: '#38bdf8',
  crimson: '#ef4444',
  emerald: '#10b981',
  purple: '#c084fc',
} as const;

const waitMs = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function preloadImage(url?: string, timeoutMs = 2200): Promise<void> {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      image.onload = null;
      image.onerror = null;
      resolve();
    };
    image.onload = finish;
    image.onerror = finish;
    image.decoding = 'async';
    image.src = url;
    if (image.complete) finish();
    window.setTimeout(finish, timeoutMs);
  });
}

async function waitForStableFirstFrame(urls: Array<string | undefined>): Promise<void> {
  window.__nexusBootStatus?.('Préchargement de l’interface…');

  const fontReady = document.fonts?.ready
    ? Promise.race([document.fonts.ready.then(() => undefined), waitMs(1800)])
    : Promise.resolve();
  const mediaReady = Promise.race([
    Promise.all(urls.filter(Boolean).slice(0, 6).map((url) => preloadImage(url))).then(() => undefined),
    waitMs(2400),
  ]);

  await Promise.all([fontReady, mediaReady]);
  window.__nexusBootStatus?.('Stabilisation du premier écran…');

  // The root can exist before layout/paint is actually stable in WebView2.
  // Two paints plus a short settle window prevents revealing during the first
  // fullscreen/compositor resize or while the hero swaps from cache to media.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  await waitMs(180);

  const surface = document.getElementById('nexus-root');
  if (!surface) throw new Error('Surface Nexus introuvable après le rendu React.');
  const rect = surface.getBoundingClientRect();
  if (rect.width < 320 || rect.height < 240) {
    throw new Error(`Surface Nexus instable (${Math.round(rect.width)}×${Math.round(rect.height)}).`);
  }
}

export default function App() {
  const store = useLauncherStore();
  const {
    games, settings, sessions, ready, nativeError, setNativeError, updateSettings,
    activeView, selectedGameId, selectedGame, launchSequenceGameId,
    playingGameId, playingStartTime, searchOpen, detailsOpen, addGameOpen,
    switchView, selectGame, toggleFavorite, triggerLaunch, completeLaunch,
    cancelLaunch, stopCurrentGame, setSearchOpen, setDetailsOpen, setAddGameOpen,
    resetToDefaults, refreshLibrary, deleteGame, refreshGameMedia, syncAchievements,
  } = store;

  const launchTargetGame = useMemo(() => games.find((game) => game.id === launchSequenceGameId) || null, [games, launchSequenceGameId]);
  const currentlyPlayingGame = useMemo(() => games.find((game) => game.id === playingGameId) || null, [games, playingGameId]);
  const bootReleasedRef = useRef(false);

  useEffect(() => {
    if (!ready || bootReleasedRef.current) return;
    bootReleasedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        window.__nexusBootStatus?.('Préparation de la bibliothèque…');
        await waitForStableFirstFrame([
          selectedGame?.heroImage,
          selectedGame?.logoUrl,
          selectedGame?.coverImage,
          selectedGame?.iconUrl,
          settings.avatarUrl,
        ]);
        if (cancelled) return;

        if (settings.startupAnimation) {
          await configureSoundPack(settings.sfxPack).catch(() => undefined);
          if (!cancelled && !window.__nexusBootAudioStarted) {
            playSfx('startup', settings.sfxEnabled, settings.sfxVolume);
          }
        }

        if (!cancelled) {
          window.__nexusBootReady?.({ animate: settings.startupAnimation, status: 'Préparation finale…' });
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Nexus] First-frame readiness failed:', error);
        window.__nexusBootFail?.(message);
      }
    })();

    return () => { cancelled = true; };
  }, [ready, selectedGame?.id, settings.avatarUrl, settings.sfxEnabled, settings.sfxPack, settings.sfxVolume, settings.startupAnimation]);

  useEffect(() => {
    const onPointerOver = (event: PointerEvent) => {
      if (!settings.sfxEnabled || event.pointerType !== 'mouse') return;
      const origin = event.target instanceof Element ? event.target : null;
      const target = origin?.closest<HTMLElement>('button, [role="button"]');
      if (!target || target.matches(':disabled')) return;
      const previous = event.relatedTarget;
      if (previous instanceof Node && target.contains(previous)) return;
      playSfx('hover', true, Math.min(0.42, settings.sfxVolume * 0.58));
    };
    document.addEventListener('pointerover', onPointerOver);
    return () => document.removeEventListener('pointerover', onPointerOver);
  }, [settings.sfxEnabled, settings.sfxVolume]);

  const selectNextGame = () => {
    if (!games.length) return;
    const currentIndex = Math.max(0, games.findIndex((game) => game.id === selectedGameId));
    selectGame(games[(currentIndex + 1) % games.length].id);
  };
  const selectPrevGame = () => {
    if (!games.length) return;
    const currentIndex = Math.max(0, games.findIndex((game) => game.id === selectedGameId));
    selectGame(games[(currentIndex - 1 + games.length) % games.length].id);
  };

  const quitLauncher = async () => {
    try { const api = await nativeApi(); await api.quit_launcher(); }
    catch (error) { setNativeError(error instanceof Error ? error.message : String(error)); }
  };

  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const el = event.target instanceof HTMLElement ? event.target : null;
      if (!el || !el.closest('#nexus-v2-scroll')) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);

  useController({
    activeView,
    switchView,
    onSelectNextGame: selectNextGame,
    onSelectPrevGame: selectPrevGame,
    onLaunchSelected: () => selectedGameId && triggerLaunch(selectedGameId),
    onOpenDetails: () => selectedGame && setDetailsOpen(true),
    onOpenSearch: () => setSearchOpen(true),
    onBack: () => {
      if (detailsOpen) setDetailsOpen(false);
      else if (searchOpen) setSearchOpen(false);
      else if (addGameOpen) setAddGameOpen(false);
      else if (launchSequenceGameId) cancelLaunch();
      else if (activeView !== 'accueil') switchView('accueil');
    },
    modalOpen: Boolean(searchOpen || detailsOpen || addGameOpen || launchSequenceGameId),
    sfxEnabled: settings.sfxEnabled,
  });

  return (
    <div id="nexus-root" className="nexus-shell relative flex h-screen w-screen overflow-hidden bg-[#02070d] font-sans text-[#eef3f7] antialiased select-none" style={{ ['--nexus-accent' as string]: ACCENT_COLORS[settings.accentTheme] || '#38bdf8', ['--nexus-game-accent' as string]: selectedGame?.accentColor || ACCENT_COLORS[settings.accentTheme] || '#38bdf8' } as React.CSSProperties}>
      <main className="relative flex h-full w-full flex-1 flex-col overflow-hidden bg-[#02070d]">
        <NexusTopNav activeView={activeView} onNavigate={switchView} onSearch={() => setSearchOpen(true)} onSettings={() => switchView('parametres')} />

        <div id="nexus-v2-scroll" className="relative h-full w-full overflow-y-auto overflow-x-hidden">
          {!ready ? (
            <div className="grid min-h-full place-items-center"><div className="text-[9px] font-black uppercase tracking-[.35em] text-sky-300/60">Initialisation Nexus…</div></div>
          ) : (
            <ViewTransition viewKey={activeView}>
              {activeView === 'accueil' && <HomeView games={games} sessions={sessions} selectedGame={selectedGame} onSelectGame={selectGame} onLaunchGame={triggerLaunch} onOpenDetails={() => selectedGame && setDetailsOpen(true)} onToggleFavorite={toggleFavorite} onNavigate={switchView} onAddGame={() => setAddGameOpen(true)} ambientMotion={settings.ambientMotion} language={settings.language} />}
              {activeView === 'bibliotheque' && <LibraryView games={games} onSelectGame={selectGame} onLaunchGame={triggerLaunch} onOpenDetails={(id) => { selectGame(id); setDetailsOpen(true); }} onToggleFavorite={toggleFavorite} onOpenAddGame={() => setAddGameOpen(true)} />}
              {activeView === 'collections' && <CollectionsView games={games} onSelectGame={selectGame} onLaunchGame={triggerLaunch} />}
              {activeView === 'succes' && <AchievementsView games={games} selectedGameId={selectedGameId} settings={settings} onSelectGame={selectGame} onOpenSettings={() => switchView('parametres')} onSyncAchievements={syncAchievements} />}
              {activeView === 'statistiques' && <StatisticsView games={games} sessions={sessions} />}
              {activeView === 'parametres' && <SettingsView settings={settings} onUpdateSettings={updateSettings} onResetDefaults={resetToDefaults} onQuit={() => void quitLauncher()} />}
            </ViewTransition>
          )}
        </div>

        <ActivePlayingBar game={currentlyPlayingGame} startTime={playingStartTime} onStop={stopCurrentGame} />
      </main>
      {/* V2: no persistent footer dock. Controller focus carries the interaction state. */}

      <React.Suspense fallback={null}>
        <LaunchOverlay game={launchTargetGame} durationMs={settings.launchDelayMs} onComplete={completeLaunch} onCancel={cancelLaunch} />
      </React.Suspense>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} games={games} onSelectGame={(id) => { selectGame(id); switchView('accueil'); }} onLaunchGame={triggerLaunch} />
      <GameDetailsModal game={selectedGame} isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} onLaunch={triggerLaunch} onToggleFavorite={toggleFavorite} onRefreshMedia={refreshGameMedia} onDelete={async (id) => { await deleteGame(id, false); setDetailsOpen(false); }} onLibraryChanged={refreshLibrary} />
      <AddGameModal isOpen={addGameOpen} autoScan={settings.autoScanSteam} onClose={() => setAddGameOpen(false)} onImported={refreshLibrary} />

      {nativeError && <div className="fixed bottom-12 left-1/2 z-[150] flex max-w-[620px] -translate-x-1/2 items-center gap-3 rounded-2xl border border-rose-400/20 bg-[#19090d]/95 px-4 py-3 text-[9.5px] text-rose-100 shadow-2xl"><span className="min-w-0 flex-1">{nativeError}</span><button onClick={() => setNativeError(null)} className="rounded-lg bg-white/[0.06] px-2 py-1 text-[8px] font-bold text-white/70">Fermer</button></div>}
    </div>
  );
}
