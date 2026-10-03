import { ArrowClockwise, ArrowRight, CheckCircle, CircleNotch, FilmSlate, FunnelSimple, Plus } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLibraryGames } from "../hooks/useLibraryGames";
import { TrailerDialog } from "../components/TrailerDialog";
import { refreshLibrary } from "../services/refreshLibrary";
import { useNexusStore } from "../state/useNexusStore";
import type { GameId } from "../types";
import { applyImageFallback } from "../utils/imageFallback";

export function LibraryScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const games = useLibraryGames();
  const locale = useNexusStore((state) => state.locale);
  const [readyOnly, setReadyOnly] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const selectedGameId = useNexusStore((state) => state.selectedGameId);
  const setSelectedGame = useNexusStore((state) => state.setSelectedGame);
  const setPreviewGame = useNexusStore((state) => state.setPreviewGame);
  const hoverTimer = useRef<number | null>(null);
  const scanState = useNexusStore((state) => state.libraryScanState);
  const libraryRoot = useNexusStore((state) => state.libraryRoot);
  const visibleGames = useMemo(() => readyOnly ? games.filter((game) => game.installed) : games, [games, readyOnly]);
  const [activeId, setActiveId] = useState<GameId>(() => selectedGameId || games[0]?.id || "");

  useEffect(() => {
    if (!visibleGames.some((game) => game.id === activeId) && visibleGames[0]) setActiveId(visibleGames[0].id);
  }, [activeId, visibleGames]);

  const activeGame = games.find((game) => game.id === activeId) ?? visibleGames[0] ?? games[0];
  const readyCount = games.filter((game) => game.installed).length;
  useEffect(() => () => { if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current); setPreviewGame(""); }, [setPreviewGame]);
  const focusGame = (id: GameId) => { setActiveId(id); setSelectedGame(id); setPreviewGame(""); };
  const previewGame = (id: GameId) => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    setActiveId(id);
    hoverTimer.current = window.setTimeout(() => setPreviewGame(id), 180);
  };
  const endPreview = () => { if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current); hoverTimer.current = null; setPreviewGame(""); };
  const openGame = (id: GameId) => { focusGame(id); navigate(`/game/${id}`); };
  const refreshMetadata = refreshLibrary;
  return (
    <section className="screen library-screen" aria-labelledby="library-title">
      <header className="screen-heading library-heading">
        <div>
          <span className="screen-kicker">{t("library.kicker")}</span>
          <h1 id="library-title">{t("library.title")}</h1>
          <p>{scanState === "scanning" ? <><CircleNotch className="library-heading__spinner" size={15} />{t("library.enriching")}</> : scanState === "error" ? t("library.unavailableSource") : t("library.detected", { count: games.length })}</p>
        </div>
        <div className="library-heading__tools">
          {scanState !== "error" ? <span><CheckCircle size={17} weight="fill" />{t("library.readyCount", { count: readyCount })}</span> : null}
          <button aria-label={t("library.refreshMetadata")} className="screen-tool" disabled={scanState === "scanning"} onClick={() => void refreshMetadata()} type="button"><ArrowClockwise size={19} /></button>
          <button className="screen-tool" onClick={() => navigate("/settings?section=libraries")} type="button"><Plus size={19} />{t("library.add")}</button>
          {games.length ? <button aria-pressed={readyOnly} className="screen-tool" onClick={() => setReadyOnly((value) => !value)} type="button">
            <FunnelSimple size={19} />{readyOnly ? t("library.readyOnly") : t("library.allGames")}
          </button> : null}
        </div>
      </header>

      {activeGame ? (
        <div className="library-stage">
          <motion.aside className="library-focus" key={activeGame.id} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
            <img className="library-focus__art library-focus__art--base" src={activeGame.artwork} alt="" decoding="async" onError={(event) => applyImageFallback(event, activeGame.artworkFallbacks)} />
            {activeGame.heroArtwork ? <img className="library-focus__art library-focus__art--hero" src={activeGame.heroArtwork} alt="" decoding="async" onError={(event) => applyImageFallback(event, [...(activeGame.heroArtworkFallbacks || []), activeGame.artwork])} /> : null}
            <span className="library-focus__wash" aria-hidden="true" />
            <div className="library-focus__content">
              <span className="library-focus__eyebrow">{activeGame.genre[locale]}</span>
              <h2>{activeGame.title}</h2>
              <span className="library-focus__availability"><i />{activeGame.installed ? t("status.ready") : t("status.configure")}</span>
            </div>
            <div className="library-focus__actions">
              {activeGame.trailer.url ? <button className="library-focus__trailer" onClick={() => setTrailerOpen(true)} type="button"><FilmSlate size={19} />{t("library.trailer")}</button> : null}
              <button className="library-focus__action" onClick={() => openGame(activeGame.id)} type="button">{t("library.openDetails")}<ArrowRight size={18} /></button>
            </div>
          </motion.aside>

          <div className="library-showcase" role="list">
            {visibleGames.map((game, index) => {
              const active = game.id === activeGame.id;
              return (
                <button
                  className="library-entry"
                  data-active={active}
                  data-launch-game={game.installed ? game.id : undefined}
                  title={t("action.holdToPlay")}
                  key={game.id}
                  onClick={() => openGame(game.id)}
                  onFocus={() => focusGame(game.id)}
                  onMouseEnter={() => previewGame(game.id)}
                  onMouseLeave={endPreview}
                  type="button"
                >
                  <img src={game.artwork} alt="" loading="lazy" decoding="async" onError={(event) => applyImageFallback(event, [...(game.artworkFallbacks || []), game.heroArtwork])} />
                  <span className="library-entry__shade" />
                  <span className="library-entry__index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="library-entry__copy"><strong>{game.title}</strong></span>
                  {game.installed ? <CheckCircle className="library-entry__status" size={19} weight="fill" /> : null}
                  {game.trailer.url ? <FilmSlate className="library-entry__trailer" size={17} aria-label={t("library.trailerAvailable")} /> : null}
                </button>
              );
            })}
            {visibleGames.length === 0 ? <p className="library-empty">{t("library.emptyLocal")}</p> : null}
          </div>
        </div>
      ) : scanState === "scanning" ? <div className="library-loading" role="status"><CircleNotch size={25} />{t("library.loading")}</div> : scanState === "error" ? <div className="library-unavailable" role="alert"><h2>{t("library.unavailable")}</h2><p>{t("library.unavailableHint", { root: libraryRoot || t("library.gameFolder") })}</p><div><button className="screen-tool" onClick={() => void refreshMetadata()} type="button"><ArrowClockwise size={18} />{t("library.retry")}</button><button className="screen-tool" onClick={() => navigate("/settings?section=libraries")} type="button"><Plus size={18} />{t("library.addFolder")}</button></div></div> : <p className="library-empty">{t("library.empty")}</p>}
      {activeGame?.trailer.url ? <TrailerDialog game={activeGame} locale={locale} open={trailerOpen} onOpenChange={setTrailerOpen} /> : null}
    </section>
  );
}
