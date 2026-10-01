import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LaunchSequence } from "./components/LaunchSequence";
import { StartupSequence } from "./components/StartupSequence";
import { Onboarding } from "./components/Onboarding";
import { TopNavigation } from "./components/TopNavigation";
import { libraryClient } from "./services/libraryClient";
import { useGamepadNavigation } from "./hooks/useGamepadNavigation";
import { HomeScreen } from "./screens/HomeScreen";
import { launcherClient } from "./services/launcherClient";
import { useNexusStore } from "./state/useNexusStore";
import { applyImageFallback } from "./utils/imageFallback";
import { getGameAccent } from "./theme/gameAccents";
import { sfx } from "./audio/sfx";
import { premiumEase, routeDirection, routeVariants } from "./motion/transitions";
import type { Game } from "./types";

const LibraryScreen = lazy(() => import("./screens/LibraryScreen").then((module) => ({ default: module.LibraryScreen })));
const SearchScreen = lazy(() => import("./screens/SearchScreen").then((module) => ({ default: module.SearchScreen })));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen").then((module) => ({ default: module.SettingsScreen })));
const GameDetailScreen = lazy(() => import("./screens/GameDetailScreen").then((module) => ({ default: module.GameDetailScreen })));
const DownloadsScreen = lazy(() => import("./screens/DownloadsScreen").then((module) => ({ default: module.DownloadsScreen })));

export function App() {
  const { t } = useTranslation();
  useGamepadNavigation();
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const direction = routeDirection(previousPath.current, location.pathname, (location.state as { direction?: number } | null)?.direction);
  useEffect(() => { previousPath.current = location.pathname; }, [location.pathname]);
  const selectedGameId = useNexusStore((state) => state.selectedGameId);
  const previewGameId = useNexusStore((state) => state.previewGameId);
  const theme = useNexusStore((state) => state.theme);
  const inputMode = useNexusStore((state) => state.inputMode);
  const discoveredGames = useNexusStore((state) => state.discoveredGames);
  const beginLibraryScan = useNexusStore((state) => state.beginLibraryScan);
  const completeLibraryScan = useNexusStore((state) => state.completeLibraryScan);
  const failLibraryScan = useNexusStore((state) => state.failLibraryScan);
  const setSystemInfo = useNexusStore((state) => state.setSystemInfo);
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null);
  const [launchPhase, setLaunchPhase] = useState<"enter" | "launching" | "error">("enter");
  const launchReady = useRef<(() => void) | null>(null);
  const launchLock = useRef(false);
  const initialScan = useRef<ReturnType<typeof libraryClient.scan> | null>(null);
  const initialSystemInfo = useRef<ReturnType<typeof libraryClient.system> | null>(null);
  const [startupOpen, setStartupOpen] = useState(() => Boolean(window.nexusDesktop));
  const [notice, setNotice] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(() => localStorage.getItem("nexus.onboarding.complete.v1") !== "true");
  const selectedGame = useMemo(() => discoveredGames.find((game) => game.id === selectedGameId) ?? discoveredGames[0], [discoveredGames, selectedGameId]);
  const backdropGame = useMemo(() => discoveredGames.find((game) => game.id === previewGameId) ?? selectedGame, [discoveredGames, previewGameId, selectedGame]);

  useEffect(() => {
    const controller = new AbortController();
    beginLibraryScan();
    initialSystemInfo.current ??= libraryClient.system();
    void initialSystemInfo.current.then((info) => { if (!controller.signal.aborted) setSystemInfo(info); }).catch(() => undefined);
    initialScan.current ??= libraryClient.scan(window.nexusDesktop ? undefined : localStorage.getItem("nexus.library.root.v1") || undefined);
    void initialScan.current.then((result) => {
      if (!controller.signal.aborted) completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) failLibraryScan(error instanceof Error ? error.message : "settings.scanError");
    });
    return () => controller.abort();
  }, [beginLibraryScan, completeLibraryScan, failLibraryScan, setSystemInfo]);

  useEffect(() => libraryClient.onLibraryChanged((result) => {
    completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
  }), [completeLibraryScan]);

  useEffect(() => {
    if (window.nexusDesktop) return;
    const timer = window.setInterval(() => {
      void libraryClient.pollChanges().then((result) => {
        if (result) completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
      }).catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [completeLibraryScan]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  useEffect(() => {
    sfx.preload();
    if (!window.nexusDesktop) return;
    let active = true;
    const soundTimer = window.setTimeout(() => sfx.play("startup"), 160);
    const scan = initialScan.current?.then(() => undefined, () => undefined) ?? Promise.resolve();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void Promise.race([
      Promise.all([sfx.delay(reducedMotion ? 250 : 1300), scan]),
      sfx.delay(reducedMotion ? 1600 : 2600),
    ]).then(() => { if (active) setStartupOpen(false); });
    return () => {
      active = false;
      window.clearTimeout(soundTimer);
    };
  }, []);

  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      if (inputMode === "pointer") return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target || !target.matches("button, a[href], input, select, textarea, [tabindex]")) return;
      sfx.play("move");
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("button, a[href], [role='menuitem'], [role='menuitemradio']") : null;
      if (!target) return;
      if (target.dataset.sfx === "launch" || target.dataset.sfx === "silent") return;
      sfx.play("confirm");
    };
    window.addEventListener("focusin", onFocus);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("focusin", onFocus);
      window.removeEventListener("click", onClick);
    };
  }, [inputMode]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || window.location.pathname !== "/") return;
      if (event.key === "ArrowDown" && document.activeElement?.closest(".top-navigation")) {
        event.preventDefault(); document.querySelector<HTMLButtonElement>(".hero-game .nexus-button")?.focus();
        return;
      }
      if (event.key === "ArrowDown" && document.activeElement?.closest(".hero-game")) {
        event.preventDefault(); document.querySelector<HTMLButtonElement>(`.game-tile[data-selected="true"]`)?.focus();
        return;
      }
      if (event.key === "ArrowUp" && document.activeElement?.closest(".hero-game")) {
        event.preventDefault(); document.querySelector<HTMLButtonElement>(".top-navigation__route[data-active='true']")?.focus();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (onboardingOpen || location.pathname !== "/") return;
    const timer = window.setTimeout(() => document.querySelector<HTMLButtonElement>(`.game-tile[data-selected="true"]`)?.focus(), 220);
    return () => window.clearTimeout(timer);
  }, [location.pathname, onboardingOpen]);

  const launch = async () => {
    if (!selectedGame || launchLock.current) { if (!selectedGame) setNotice(t("home.noSelected")); return; }
    launchLock.current = true;
    const game = selectedGame;
    setNotice(null);
    setLaunchPhase("enter");
    setLaunchingGame(game);
    try {
      sfx.play("launch");
      await Promise.race([new Promise<void>((resolve) => { launchReady.current = resolve; }), sfx.delay(520)]);
      launchReady.current = null;
      setLaunchPhase("launching");
      await launcherClient.launchGame(game);
      await sfx.delay(320);
    } catch (error) {
      setLaunchPhase("error");
      setNotice(error instanceof Error ? error.message : t("home.launchError"));
      await sfx.delay(1500);
    } finally {
      launchReady.current = null;
      setLaunchingGame(null);
      launchLock.current = false;
    }
  };
  const completeOnboarding = () => { localStorage.setItem("nexus.onboarding.complete.v1", "true"); setOnboardingOpen(false); };
  const replayOnboarding = () => { localStorage.removeItem("nexus.onboarding.complete.v1"); setOnboardingOpen(true); };
  const addFolderFromOnboarding = async () => {
    const result = await libraryClient.addFolder();
    if (result) completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="nexus-shell" data-theme={theme} data-input={inputMode} data-route={location.pathname === "/" ? "home" : location.pathname.startsWith("/game/") ? "detail" : "interior"} style={{ "--game-accent": selectedGame ? getGameAccent(selectedGame.id) : "var(--color-focus)" } as CSSProperties}>
        <div className="media-backdrop" aria-hidden="true">
          <AnimatePresence initial={false} mode="popLayout">
            {backdropGame ? backdropGame.heroArtwork || !backdropGame.artwork.includes("/assets/brand/nexus-mark")
              ? <motion.img animate={{ opacity: 1, scale: 1 }} className="media-backdrop__image" exit={{ opacity: 0 }} initial={{ opacity: 0, scale: 1.015 }} key={backdropGame.id} onError={(event) => applyImageFallback(event, backdropGame.artwork)} src={backdropGame.heroArtwork ?? backdropGame.artwork} transition={{ opacity: { duration: 0.36 }, scale: { duration: 0.52 } }} />
              : <motion.div className="media-backdrop__fallback" key={backdropGame.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .34 }}><img src="/assets/brand/nexus-mark.png" alt="" /></motion.div>
              : null}
          </AnimatePresence>
          <div className="media-backdrop__grade" />
        </div>
        <TopNavigation />
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            className="route-stage"
            key={location.pathname}
            custom={direction}
            variants={routeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: .29, ease: premiumEase }}
          >
            <Suspense fallback={<div className="route-loading"><span />{t("home.loadingSpace")}</div>}>
              <Routes location={location}>
                <Route path="/" element={selectedGame ? <HomeScreen selectedGame={selectedGame} onLaunch={launch} /> : <div className="route-loading"><span />{t("home.scanning")}</div>} />
                <Route path="/library" element={<LibraryScreen />} />
                <Route path="/search" element={<SearchScreen />} />
                <Route path="/game/:gameId" element={<GameDetailScreen onLaunch={launch} />} />
                <Route path="/settings" element={<SettingsScreen onReplayOnboarding={replayOnboarding} />} />
                <Route path="/downloads" element={<DownloadsScreen />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>{notice ? <motion.div aria-live="polite" className="system-notice" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>{notice}</motion.div> : null}</AnimatePresence>
        <AnimatePresence>{startupOpen ? <StartupSequence key="startup" /> : null}</AnimatePresence>
        <AnimatePresence>{launchingGame ? <LaunchSequence game={launchingGame} key="launch" phase={launchPhase} onReady={() => launchReady.current?.()} /> : null}</AnimatePresence>
        <Onboarding open={onboardingOpen && !startupOpen} onComplete={completeOnboarding} onAddFolder={addFolderFromOnboarding} />
      </main>
    </MotionConfig>
  );
}
