import { ArrowLeft, CheckCircle, Clock, FilmSlate, GameController, HardDrives, Play, Star, Trophy } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { NexusButton } from "../components/NexusButton";
import { TrailerDialog } from "../components/TrailerDialog";
import { useLibraryGames } from "../hooks/useLibraryGames";
import { useNexusStore } from "../state/useNexusStore";
import { applyImageFallback } from "../utils/imageFallback";
import { libraryClient } from "../services/libraryClient";

type DetailTab = "overview" | "media" | "achievements";

interface GameDetailScreenProps { onLaunch: () => void; }

export function GameDetailScreen({ onLaunch }: GameDetailScreenProps) {
  const { t } = useTranslation();
  const { gameId } = useParams();
  const games = useLibraryGames();
  const navigate = useNavigate();
  const location = useLocation();
  const locale = useNexusStore((state) => state.locale);
  const setSelectedGame = useNexusStore((state) => state.setSelectedGame);
  const completeLibraryScan = useNexusStore((state) => state.completeLibraryScan);
  const libraryScanState = useNexusStore((state) => state.libraryScanState);
  const game = games.find((item) => item.id === gameId) ?? games.find((item) => item.legacyId === gameId);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const updateGame = async (action: () => ReturnType<typeof libraryClient.scan>) => {
    try {
      const result = await action();
      completeLibraryScan(result.games, result.root, result.roots, result.manualGames, result.scanErrors);
      setEditMessage("detail.updateSuccess");
    } catch (error) { setEditMessage(error instanceof Error ? error.message : "detail.updateError"); }
  };

  useEffect(() => { if (game) setSelectedGame(game.id); }, [game, setSelectedGame]);
  if (!game && (libraryScanState === "idle" || libraryScanState === "scanning")) return <div className="route-loading"><span />{t("detail.loading")}</div>;
  if (!game) return <Navigate to="/library" replace />;

  const achievementPercent = Math.round((game.achievementProgress.unlocked / Math.max(game.achievementProgress.total, 1)) * 100);
  return (
    <section className="game-detail-screen" aria-labelledby="game-detail-title">
      <button className="game-detail__back" onClick={() => location.key === "default" ? navigate("/library", { replace: true }) : navigate(-1)} type="button"><ArrowLeft size={20} />{t("detail.back")}</button>
      <div className="game-detail__hero">
        <span className="screen-kicker">{game.source} · {game.genre[locale]}</span>
        {game.logoArtwork ? <img className="game-detail__logo" src={game.logoArtwork} alt="" onError={(event) => applyImageFallback(event, game.artwork)} /> : null}
        <h1 className={game.logoArtwork ? "game-detail__title game-detail__title--with-logo" : "game-detail__title"} id="game-detail-title">{game.title}</h1>
        <span className="game-detail__availability" data-ready={game.installed}><i />{t(game.installed ? "detail.ready" : "detail.installRequired")}</span>
        <p>{game.description[locale]}</p>
        <div className="game-detail__tags">{game.features.map((feature) => <span key={feature.fr}><CheckCircle size={15} weight="fill" />{feature[locale]}</span>)}</div>
        <div className="game-detail__actions">
          <NexusButton data-sfx={game.installed ? "launch" : undefined} onClick={game.installed ? onLaunch : () => navigate("/settings?section=play")} icon={game.installed ? <Play size={18} weight="fill" /> : <GameController size={18} />}>{t(game.installed ? "action.play" : "action.configure")}</NexusButton>
          {game.trailer.url ? <NexusButton variant="ghost" onClick={() => setTrailerOpen(true)} icon={<FilmSlate size={20} />}>{t("detail.trailer")}</NexusButton> : null}
        </div>
      </div>

      <div className="game-detail__facts" aria-label={t("detail.quickInfo")}>
        {game.discovered || game.playtimeHours > 0 ? <div><Clock size={22} /><span><small>{t(game.discovered ? "detail.nexusPlaytime" : "detail.playtime")}</small><strong>{game.discovered ? t("detail.playtimeValue", { hours: Math.floor(game.playtimeHours), minutes: Math.floor((game.playtimeHours * 60) % 60) }) : `${game.playtimeHours.toLocaleString(locale)} h`}</strong></span></div> : null}
        {game.achievementProgress.total > 0 ? <div><Trophy size={22} /><span><small>{t("detail.achievements")}</small><strong>{game.achievementProgress.unlocked}/{game.achievementProgress.total}</strong></span></div> : null}
        {game.rating > 0 ? <div><Star size={22} /><span><small>{t("detail.community")}</small><strong>{game.rating}/100</strong></span></div> : null}
        <div><HardDrives size={22} /><span><small>{t(game.lastPlayedAt ? "detail.lastPlayed" : "detail.modified")}</small><strong>{game.lastPlayed[locale]}</strong></span></div>
      </div>

      <nav className="game-detail__tabs" aria-label={t("detail.tabs")}>
        <button data-active={tab === "overview"} onClick={() => setTab("overview")} type="button">{t("detail.overview")}</button>
        {game.trailer.url ? <button data-active={tab === "media"} onClick={() => setTab("media")} type="button">{t("detail.media")}</button> : null}
        {game.achievementProgress.total > 0 ? <button data-active={tab === "achievements"} onClick={() => setTab("achievements")} type="button">{t("detail.achievementsTab")}</button> : null}
      </nav>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div className="game-detail__panel" key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: .18 }}>
          {tab === "overview" ? <>
            <div className="game-detail__summary"><span className="screen-kicker">{t("detail.about")}</span><p>{game.description[locale]}</p></div>
            <dl className="game-detail__specs"><div><dt>{t("detail.developer")}</dt><dd>{game.developer}</dd></div><div><dt>{t("detail.publisher")}</dt><dd>{game.publisher}</dd></div><div><dt>{t("detail.release")}</dt><dd>{game.releaseDate}</dd></div>{game.ageRating !== "Non renseigné" ? <div><dt>{t("detail.rating")}</dt><dd>{game.ageRating}</dd></div> : null}<div><dt>{t("detail.metadata")}</dt><dd>{game.metadataProvider}</dd></div>{game.executablePath ? <div><dt>{t("detail.executable")}</dt><dd>{game.executablePath.split(/[\\/]/).pop()}</dd></div> : null}</dl>
          </> : null}
          {tab === "media" ? <button className="game-detail__media" onClick={() => setTrailerOpen(true)} type="button"><img src={game.artwork} alt="" onError={(event) => applyImageFallback(event, game.heroArtwork)} /><span><Play size={26} weight="fill" /><strong>{game.trailer.title[locale]}</strong><small>{game.trailer.duration}</small></span></button> : null}
          {tab === "achievements" ? <div className="game-detail__achievement"><Trophy size={38} /><span><strong>{t("detail.completed", { count: achievementPercent })}</strong><small>{t("detail.unlocked", { unlocked: game.achievementProgress.unlocked, total: game.achievementProgress.total })}</small></span><div><i style={{ width: `${achievementPercent}%` }} /></div></div> : null}
        </motion.div>
      </AnimatePresence>
      <div className="game-detail__source"><GameController size={18} /><span>{t("detail.source", { source: game.source })}</span><HardDrives size={18} /><span>{game.libraryPath}</span></div>
      {game.discovered ? <div className="game-detail__customize"><span className="screen-kicker">{t("detail.customize")}</span><label>{t("detail.gameTitle")} <input aria-label={t("detail.gameTitle")} onChange={(event) => setEditTitle(event.target.value)} placeholder={game.title} value={editTitle} /></label><button className="screen-tool" disabled={!editTitle.trim()} onClick={() => void updateGame(() => libraryClient.setTitle(game.id, editTitle))} type="button">{t("detail.saveTitle")}</button>{window.nexusDesktop ? <><button className="screen-tool" onClick={() => void updateGame(async () => (await libraryClient.chooseExecutable(game.id)) ?? libraryClient.scan())} type="button">{t("detail.chooseExecutable")}</button><button className="screen-tool" onClick={() => void updateGame(async () => (await libraryClient.chooseArtwork(game.id, "gridArtwork")) ?? libraryClient.scan())} type="button">{t("detail.chooseCover")}</button><button className="screen-tool" onClick={() => void updateGame(async () => (await libraryClient.chooseArtwork(game.id, "heroArtwork")) ?? libraryClient.scan())} type="button">{t("detail.chooseBackground")}</button><button className="screen-tool" onClick={() => void updateGame(async () => (await libraryClient.chooseArtwork(game.id, "logoArtwork")) ?? libraryClient.scan())} type="button">{t("detail.chooseLogo")}</button></> : null}{editMessage ? <span role="status">{editMessage.startsWith("detail.") ? t(editMessage) : editMessage}</span> : null}</div> : null}
      <TrailerDialog game={game} locale={locale} open={trailerOpen} onOpenChange={setTrailerOpen} />
    </section>
  );
}
