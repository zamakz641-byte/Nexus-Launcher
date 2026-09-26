import { ArrowsClockwise, Database, DownloadSimple, Eye, FilmSlate, FolderOpen, FolderSimplePlus, GameController, HardDrives, Images, Link, MoonStars, Palette, SlidersHorizontal, Translate } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useNexusStore } from "../state/useNexusStore";
import { libraryClient } from "../services/libraryClient";
import type { Locale, ThemeId } from "../types";
import { sfx } from "../audio/sfx";
import type { AudioPreferences } from "../audio/sfx";

type SettingsSection = "interface" | "libraries" | "metadata" | "media" | "downloads" | "play" | "accessibility";

const sections: { id: SettingsSection; icon: ReactNode }[] = [
  { id: "interface", icon: <Palette size={20} /> },
  { id: "libraries", icon: <Link size={20} /> },
  { id: "metadata", icon: <Database size={20} /> },
  { id: "media", icon: <FilmSlate size={20} /> },
  { id: "downloads", icon: <DownloadSimple size={20} /> },
  { id: "play", icon: <GameController size={20} /> },
  { id: "accessibility", icon: <Eye size={20} /> },
];

const isSettingsSection = (value: string | null): value is SettingsSection => sections.some((item) => item.id === value);

function SettingsRow({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <div className="settings-row"><span className="settings-row__icon">{icon}</span><span><strong>{title}</strong><small>{description}</small></span>{children}</div>;
}

export function SettingsScreen({ onReplayOnboarding }: { onReplayOnboarding: () => void }) {
  const { t, i18n } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [audioPreferences, setAudioPreferences] = useState(() => sfx.getPreferences());
  const [steamGridKey, setSteamGridKey] = useState("");
  const [steamGridStatus, setSteamGridStatus] = useState<{ configured: boolean; storageAvailable: boolean; lastCheck: string } | null>(null);
  const [steamGridMessage, setSteamGridMessage] = useState("");
  const [pendingGame, setPendingGame] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => { void window.nexusDesktop?.getSteamGridStatus().then((status) => setSteamGridStatus(status as typeof steamGridStatus)); }, []);
  const saveSteamGridKey = async () => {
    if (!window.nexusDesktop) return;
    try {
      const status = await window.nexusDesktop.saveSteamGridKey(steamGridKey) as NonNullable<typeof steamGridStatus>;
      setSteamGridStatus(status); setSteamGridKey("");
      setSteamGridMessage(status.lastCheck === "invalid" ? "settings.keyInvalid" : status.lastCheck === "offline" ? "settings.keyOffline" : "settings.keySaved");
    } catch (error) { setSteamGridMessage(error instanceof Error ? error.message : "settings.saveError"); }
  };
  const clearSteamGridKey = async () => {
    if (!window.nexusDesktop) return;
    try { setSteamGridStatus(await window.nexusDesktop.clearSteamGridKey() as NonNullable<typeof steamGridStatus>); setSteamGridMessage("settings.keyRemoved"); }
    catch (error) { setSteamGridMessage(error instanceof Error ? error.message : "settings.removeError"); }
  };
  const updateAudio = (next: Partial<AudioPreferences>) => { sfx.setPreferences(next); setAudioPreferences(sfx.getPreferences()); };
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section: SettingsSection = isSettingsSection(requestedSection) ? requestedSection : "interface";
  const chooseSection = (next: SettingsSection) => {
    setSearchParams(next === "interface" ? {} : { section: next }, { replace: true });
  };
  const locale = useNexusStore((state) => state.locale);
  const theme = useNexusStore((state) => state.theme);
  const setLocale = useNexusStore((state) => state.setLocale);
  const setTheme = useNexusStore((state) => state.setTheme);
  const discoveredGames = useNexusStore((state) => state.discoveredGames);
  const libraryRoot = useNexusStore((state) => state.libraryRoot);
  const libraryRoots = useNexusStore((state) => state.libraryRoots);
  const manualGames = useNexusStore((state) => state.manualGames);
  const libraryScanErrors = useNexusStore((state) => state.libraryScanErrors);
  const libraryScanState = useNexusStore((state) => state.libraryScanState);
  const libraryScanMessage = useNexusStore((state) => state.libraryScanMessage);
  const beginLibraryScan = useNexusStore((state) => state.beginLibraryScan);
  const completeLibraryScan = useNexusStore((state) => state.completeLibraryScan);
  const failLibraryScan = useNexusStore((state) => state.failLibraryScan);
  const systemInfo = useNexusStore((state) => state.systemInfo);
  const chooseLocale = (value: Locale) => { setLocale(value); void i18n.changeLanguage(value); document.documentElement.lang = value; document.documentElement.dir = i18n.dir(value); };
  const configuredProviders = [systemInfo?.providers.local, systemInfo?.providers.steamStore, systemInfo?.providers.steamGridDb].filter(Boolean).length;
  const keyCheck = steamGridStatus?.lastCheck;
  const keyCheckLabel = t(keyCheck === "valid" ? "settings.checkValid" : keyCheck === "invalid" ? "settings.checkInvalid" : keyCheck === "offline" ? "settings.checkOffline" : "settings.checkNever");
  const trailerCount = discoveredGames.filter((game) => game.trailer.url).length;
  const executableCount = discoveredGames.filter((game) => game.executablePath).length;
  const steamCount = libraryRoots.filter((root) => root.platform === "Steam").length;
  const epicCount = libraryRoots.filter((root) => root.platform === "Epic").length;
  const scanLocalLibrary = async () => {
    beginLibraryScan();
    try {
      const result = await libraryClient.scan(undefined, true);
      completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
    } catch (error) {
      failLibraryScan(error instanceof Error ? error.message : t("settings.scanError"));
    }
  };
  const chooseLibraryFolder = async () => {
    try {
      const result = await libraryClient.addFolder();
      if (result) completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
    } catch (error) { failLibraryScan(error instanceof Error ? error.message : t("settings.addError")); }
  };
  const addGame = async () => {
    try {
      const result = await libraryClient.addExecutable();
      if (result) {
        completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
        const added = result.manualGames.find((game) => !manualGames.some((current) => current.id === game.id));
        if (added) setPendingGame({ id: added.id, title: added.title });
      }
    } catch (error) { failLibraryScan(error instanceof Error ? error.message : t("settings.addError")); }
  };
  const confirmGameTitle = async () => {
    if (!pendingGame?.title.trim()) return;
    try {
      const result = await libraryClient.setTitle(pendingGame.id, pendingGame.title);
      completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
      setPendingGame(null);
    } catch (error) { failLibraryScan(error instanceof Error ? error.message : t("settings.addError")); }
  };
  const addGameFolder = async () => {
    try {
      const result = await libraryClient.addGameFolder();
      if (result) completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
    } catch (error) { failLibraryScan(error instanceof Error ? error.message : t("settings.addError")); }
  };
  const removeEntry = async (id: string) => {
    try {
      const result = await libraryClient.removeEntry(id);
      completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
      if (pendingGame?.id === id) setPendingGame(null);
    } catch (error) { failLibraryScan(error instanceof Error ? error.message : t("settings.removeError")); }
  };

  return (
    <section className="screen settings-screen" aria-labelledby="settings-title">
      <header className="screen-heading"><div><span className="screen-kicker">{t("settings.kicker")}</span><h1 id="settings-title">{t("settings.title")}</h1><p>{t("settings.description")}</p></div><span className="settings-status"><i />{t("settings.sources", { count: configuredProviders })}</span></header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label={t("settings.sections")}>{sections.map((item) => <button aria-current={section === item.id ? "page" : undefined} data-active={section === item.id} key={item.id} onClick={() => chooseSection(item.id)} type="button">{item.icon}{t(`settings.${item.id}`)}</button>)}</nav>
        <div className="settings-content">
          <header className="settings-content__header"><span className="screen-kicker">{t(`settings.${section}`).toLocaleUpperCase(locale)}</span><strong>{t(section === "libraries" ? "settings.libraryHeader" : section === "metadata" ? "settings.metadataHeader" : section === "media" ? "settings.mediaHeader" : "settings.genericHeader")}</strong></header>
          <AnimatePresence mode="popLayout" initial={false}>
          <motion.div className="settings-list" key={section} initial={prefersReducedMotion ? false : { opacity: 0, x: 9 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -7 }} transition={{ duration: prefersReducedMotion ? 0 : .18, ease: [0.22, 1, 0.36, 1] }}>
            {section === "interface" ? <>
              <SettingsRow icon={<Palette size={22} />} title={t("settings.themeTitle")} description={t("settings.themeDesc")}><div className="segmented-control">{(["obsidienne", "solaris"] as ThemeId[]).map((id) => <button data-selected={theme === id} key={id} onClick={() => setTheme(id)} type="button">{t(`system.${id}`)}</button>)}</div></SettingsRow>
              <SettingsRow icon={<Translate size={22} />} title={t("settings.languageTitle")} description={t("settings.languageDesc")}><div className="segmented-control"><button data-selected={locale === "fr"} onClick={() => chooseLocale("fr")} type="button">FR</button><button data-selected={locale === "en"} onClick={() => chooseLocale("en")} type="button">EN</button></div></SettingsRow>
              <button className="settings-replay" onClick={onReplayOnboarding} type="button">{t("settings.replay")}</button>
            </> : null}

            {section === "libraries" ? <>
              <SettingsRow icon={<FolderOpen size={22} />} title={t("settings.personalSources")} description={libraryScanState === "scanning" ? t("settings.analyzing") : libraryScanState === "ready" ? t("library.detected", { count: discoveredGames.length }) : libraryScanMessage.startsWith("settings.") ? t(libraryScanMessage) : libraryScanMessage}><span className="settings-row__actions settings-row__actions--library"><button className="settings-inline-action" onClick={() => void chooseLibraryFolder()} type="button"><FolderSimplePlus size={17} />{t("settings.addCollection")}</button><button className="settings-inline-action" onClick={() => void addGameFolder()} type="button">{t("settings.addGameFolder")}</button><button className="settings-inline-action" onClick={() => void addGame()} type="button">{t("settings.addGame")}</button><button className="provider-action" data-connected={libraryScanState === "ready"} disabled={libraryScanState === "scanning"} onClick={() => void scanLocalLibrary()} type="button"><i />{t(libraryScanState === "scanning" ? "settings.analyzing" : "settings.analyze")}</button></span></SettingsRow>
              {pendingGame ? <div className="settings-manual-confirm"><span className="screen-kicker">{t("settings.correctGameName")}</span><label>{t("detail.gameTitle")}<input aria-label={t("detail.gameTitle")} autoFocus onChange={(event) => setPendingGame({ ...pendingGame, title: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") void confirmGameTitle(); }} value={pendingGame.title} /></label><button className="settings-inline-action" disabled={!pendingGame.title.trim()} onClick={() => void confirmGameTitle()} type="button">{t("settings.findMetadata")}</button></div> : null}
              <SettingsRow icon={<HardDrives size={22} />} title={t("settings.storeDiscovery")} description={t("settings.storeDiscoveryDesc")}><span className="provider-tag">Steam {steamCount} · Epic {epicCount}</span></SettingsRow>
              {libraryRoots.map((root) => <SettingsRow key={root.id} icon={<FolderOpen size={22} />} title={root.title || root.path.split(/[\\/]/).filter(Boolean).at(-1) || root.path} description={`${root.platform ? `${root.platform} · ${t("settings.autoDetected")}` : t(root.kind === "game" ? "settings.gameFolder" : "settings.collection")} · ${root.path}${libraryScanErrors[root.id] ? ` · ${libraryScanErrors[root.id]}` : ""}`}><button className="settings-inline-action" onClick={() => void removeEntry(root.id)} type="button">{t("settings.removeFromNexus")}</button></SettingsRow>)}
              {manualGames.map((game) => <SettingsRow key={game.id} icon={<GameController size={22} />} title={game.title} description={game.executablePath}><button className="settings-inline-action" onClick={() => void removeEntry(game.id)} type="button">{t("settings.removeFromNexus")}</button></SettingsRow>)}
              <SettingsRow icon={<HardDrives size={22} />} title={t("settings.executables")} description={t("settings.executableDesc", { count: executableCount })}><span className="provider-tag">{executableCount}/{discoveredGames.length}</span></SettingsRow>
            </> : null}

            {section === "metadata" ? <>
              <SettingsRow icon={<FolderOpen size={22} />} title={t("settings.localMetadata")} description={t("settings.localGamesFrom", { count: discoveredGames.length, root: libraryRoot })}><button className="settings-inline-action" disabled={libraryScanState === "scanning"} onClick={() => void scanLocalLibrary()} type="button">{t("settings.refresh")}</button></SettingsRow>
              <SettingsRow icon={<Database size={22} />} title={t("settings.steamStore")} description={t("settings.steamStoreDesc")}><span className="provider-tag">{t(systemInfo?.providers.steamStore ? "settings.active" : "settings.unavailable")}</span></SettingsRow>
              <SettingsRow icon={<Images size={22} />} title={t("settings.steamGrid")} description={t("settings.steamGridDesc")}><span className="provider-tag">{t(steamGridStatus?.configured || systemInfo?.providers.steamGridDb ? "settings.configured" : "settings.missingKey")}</span></SettingsRow>
              {window.nexusDesktop ? <SettingsRow icon={<Database size={22} />} title={t("settings.steamGridKey")} description={steamGridMessage ? steamGridMessage.startsWith("settings.") ? t(steamGridMessage) : steamGridMessage : steamGridStatus?.configured ? t("settings.keyConfigured", { status: keyCheckLabel }) : t("settings.encryptedKey")}><span className="settings-row__actions"><input aria-label={t("settings.steamGridKeyInput")} autoComplete="off" disabled={steamGridStatus?.storageAvailable === false} onChange={(event) => setSteamGridKey(event.target.value)} placeholder={t("settings.apiKey")} type="password" value={steamGridKey} /><button className="settings-inline-action" disabled={!steamGridKey || steamGridStatus?.storageAvailable === false} onClick={() => void saveSteamGridKey()} type="button">{t(steamGridStatus?.configured ? "settings.replace" : "settings.save")}</button>{steamGridStatus?.configured ? <button className="settings-inline-action" onClick={() => void clearSteamGridKey()} type="button">{t("settings.remove")}</button> : null}</span></SettingsRow> : null}
            </> : null}

            {section === "media" ? <>
              <SettingsRow icon={<FilmSlate size={22} />} title={t("settings.trailers")} description={t("settings.trailersDesc", { count: trailerCount })}><span className="provider-tag">{trailerCount}/{discoveredGames.length}</span></SettingsRow>
              <SettingsRow icon={<Images size={22} />} title={t("settings.artwork")} description={t("settings.artworkDesc")}><span className="provider-tag">{t("settings.auto")}</span></SettingsRow>
            </> : null}

            {section === "downloads" ? <>
              <SettingsRow icon={<FolderOpen size={22} />} title={t("settings.activeLibrary")} description={libraryRoot || t("settings.loadingConfig")}><span className="provider-tag">{t("settings.local")}</span></SettingsRow>
              <SettingsRow icon={<DownloadSimple size={22} />} title={t("settings.transfers")} description={t("settings.transfersDesc")}><span className="provider-tag">0</span></SettingsRow>
              <SettingsRow icon={<Images size={22} />} title={t("settings.remoteArtwork")} description={t("settings.remoteArtworkDesc")}><span className="provider-tag">{t("settings.online")}</span></SettingsRow>
            </> : null}

            {section === "play" ? <>
              <SettingsRow icon={<ArrowsClockwise size={22} />} title={t("settings.launchable")} description={t("settings.launchableDesc", { count: executableCount, root: libraryRoot || t("settings.localRoot") })}><span className="provider-tag">{executableCount}</span></SettingsRow>
              <SettingsRow icon={<SlidersHorizontal size={22} />} title={t("settings.needConfig")} description={t("settings.needConfigDesc", { count: discoveredGames.length - executableCount })}><span className="provider-tag">{discoveredGames.length - executableCount}</span></SettingsRow>
              <SettingsRow icon={<SlidersHorizontal size={22} />} title={t("settings.volume")} description={t("settings.volumeDesc")}><label className="settings-volume"><input aria-label={t("settings.volume")} type="range" min="0" max="100" value={Math.round(audioPreferences.masterVolume * 100)} onChange={(event) => updateAudio({ masterVolume: Number(event.target.value) / 100 })} /><output>{Math.round(audioPreferences.masterVolume * 100)}%</output></label></SettingsRow>
              <SettingsRow icon={<SlidersHorizontal size={22} />} title={t("settings.uiSounds")} description={t("settings.uiSoundsDesc")}><label className="settings-volume"><input aria-label={t("settings.uiVolume")} type="range" min="0" max="100" value={Math.round(audioPreferences.uiVolume * 100)} onChange={(event) => updateAudio({ uiVolume: Number(event.target.value) / 100 })} /><output>{Math.round(audioPreferences.uiVolume * 100)}%</output></label></SettingsRow>
              <SettingsRow icon={<SlidersHorizontal size={22} />} title={t("settings.mute")} description={t("settings.muteDesc")}><button className="settings-audio-toggle" aria-pressed={audioPreferences.muted} onClick={() => updateAudio({ muted: !audioPreferences.muted })} type="button">{t(audioPreferences.muted ? "settings.muted" : "settings.unmuted")}</button></SettingsRow>
              <SettingsRow icon={<SlidersHorizontal size={22} />} title={t("settings.soundCredits")} description="Universal UI Soundpack · Nathan Gibson · CC BY 4.0"><span className="provider-tag">{t("settings.soundStyle")}</span></SettingsRow>
            </> : null}

            {section === "accessibility" ? <>
              <SettingsRow icon={<MoonStars size={22} />} title={t("settings.motion")} description={t("settings.motionDesc")}><span className="provider-tag">{t(prefersReducedMotion ? "settings.reduced" : "settings.standard")}</span></SettingsRow>
              <SettingsRow icon={<Eye size={22} />} title={t("settings.focus")} description={t("settings.focusDesc")}><span className="provider-tag">{t("settings.active")}</span></SettingsRow>
              <SettingsRow icon={<GameController size={22} />} title={t("settings.controller")} description={t("settings.controllerDesc")}><span className="provider-tag">{t("settings.auto")}</span></SettingsRow>
            </> : null}
          </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
