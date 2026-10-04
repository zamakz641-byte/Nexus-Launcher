import { ArrowSquareOut, CheckCircle, GameController, HardDrive, MagnifyingGlass, Monitor, SteamLogo, Tag, X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLibraryGames } from "../hooks/useLibraryGames";
import { libraryClient, type CatalogGame } from "../services/libraryClient";
import { useNexusStore } from "../state/useNexusStore";
import { applyImageFallback } from "../utils/imageFallback";

type SearchScope = "library" | "catalog";

export function SearchScreen() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("library");
  const [catalogGames, setCatalogGames] = useState<CatalogGame[]>([]);
  const [catalogState, setCatalogState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const deferredQuery = useDeferredValue(query.trim());
  const games = useLibraryGames();
  const locale = useNexusStore((state) => state.locale);
  const navigate = useNavigate();
  const setSelectedGame = useNexusStore((state) => state.setSelectedGame);
  const localResults = useMemo(() => {
    const needle = deferredQuery.toLocaleLowerCase(locale);
    if (!needle) return games;
    return games.filter((game) => [game.title, game.genre.fr, game.genre.en, game.source, game.developer, game.publisher].some((value) => value.toLocaleLowerCase(locale).includes(needle)));
  }, [deferredQuery, games, locale]);

  useEffect(() => {
    if (scope !== "catalog" || deferredQuery.length < 2) {
      setCatalogGames([]);
      setCatalogState("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCatalogState("loading");
      void libraryClient.searchCatalog(deferredQuery, controller.signal).then((items) => {
        setCatalogGames(items);
        setCatalogState("ready");
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCatalogState("error");
      });
    }, 240);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [catalogAttempt, deferredQuery, scope]);

  const openLocalGame = (id: string) => {
    setSelectedGame(id);
    navigate(`/game/${id}`);
  };

  return (
    <section className="screen search-screen" aria-labelledby="search-title">
      <header className="search-header">
        <div><span className="screen-kicker">{t("search.kicker")}</span><h1 id="search-title">{t("search.title")}</h1><p>{t("search.description")}</p></div>
        <div className="search-scope" aria-label={t("search.scope")} role="tablist">
          <button aria-selected={scope === "library"} onClick={() => setScope("library")} role="tab" type="button"><HardDrive aria-hidden="true" size={19} />{t("search.library")} <span>{games.length}</span></button>
          <button aria-selected={scope === "catalog"} onClick={() => setScope("catalog")} role="tab" type="button"><SteamLogo aria-hidden="true" size={20} weight="fill" />{t("search.steamCatalog")}</button>
        </div>
      </header>

      <label className="search-field">
        <MagnifyingGlass aria-hidden="true" size={25} />
        <span className="sr-only">{t("search.input")}</span>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t(scope === "library" ? "search.localPlaceholder" : "search.steamPlaceholder")} />
        {query ? <button aria-label={t("search.clear")} onClick={() => setQuery("")} type="button"><X aria-hidden="true" size={18} /></button> : null}
      </label>

      <div className="search-summary" aria-live="polite">
        <span>{scope === "library" ? t("search.localCount", { count: localResults.length }) : catalogState === "ready" ? t("search.steamCount", { count: catalogGames.length }) : t("search.official")}</span>
        {deferredQuery ? <small>{t("search.forQuery", { query: deferredQuery })}</small> : <small>{t("search.wholeCollection")}</small>}
      </div>

      {scope === "library" ? (
        <div className="search-grid" aria-live="polite">
          {localResults.map((game, index) => (
            <motion.button className="search-card" key={game.id} initial={reducedMotion || index > 7 ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .18, delay: reducedMotion ? 0 : Math.min(index, 7) * .018 }} onClick={() => openLocalGame(game.id)} onFocus={() => setSelectedGame(game.id)} onMouseEnter={() => setSelectedGame(game.id)} type="button">
              <span className="search-card__visual"><img src={game.artwork} alt="" onError={(event) => applyImageFallback(event, [...(game.artworkFallbacks || []), game.heroArtwork])} /><span className="search-card__shade" />{game.logoArtwork ? <img className="search-card__logo" src={game.logoArtwork} alt="" onError={(event) => applyImageFallback(event)} /> : null}</span>
              <span className="search-card__body">
                <span className="search-card__eyebrow"><span><HardDrive aria-hidden="true" size={17} />{game.source}</span>{game.installed ? <span className="search-card__ready"><CheckCircle aria-hidden="true" size={17} weight="fill" />{t("search.ready")}</span> : <span>{t("search.configure")}</span>}</span>
                <strong>{game.title}</strong>
                <span className="search-card__facts"><span><Tag aria-hidden="true" size={15} />{game.genre[locale]}</span><span><Monitor aria-hidden="true" size={15} />PC</span></span>
                <small>{game.developer}</small>
              </span>
            </motion.button>
          ))}
          {localResults.length === 0 ? <div className="search-empty"><MagnifyingGlass aria-hidden="true" size={30} /><strong>{t("search.noLocal")}</strong><span>{t("search.noLocalHint")}</span></div> : null}
        </div>
      ) : (
        <div className="search-grid search-grid--catalog" aria-busy={catalogState === "loading"} aria-live="polite">
          {catalogState === "idle" ? <div className="search-empty"><SteamLogo aria-hidden="true" size={34} weight="fill" /><strong>{t("search.explore")}</strong><span>{t("search.exploreHint")}</span></div> : null}
          {catalogState === "loading" ? Array.from({ length: 6 }, (_, index) => <div className="search-card search-card--loading" key={index}><span /><i /><i /></div>) : null}
          {catalogState === "error" ? <div className="search-empty"><SteamLogo aria-hidden="true" size={34} /><strong>{t("search.steamError")}</strong><span>{t("search.steamErrorHint")}</span><button className="search-retry" onClick={() => setCatalogAttempt((attempt) => attempt + 1)} type="button">{t("search.retry")}</button></div> : null}
          {catalogState === "ready" && catalogGames.length === 0 ? <div className="search-empty"><MagnifyingGlass aria-hidden="true" size={30} /><strong>{t("search.noSteam")}</strong><span>{t("search.noSteamHint")}</span></div> : null}
          {catalogGames.map((game, index) => (
            <motion.a className="search-card" href={game.storeUrl} key={game.id} rel="noreferrer" target="_blank" initial={reducedMotion || index > 7 ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .18, delay: reducedMotion ? 0 : Math.min(index, 7) * .018 }}>
              <span className="search-card__visual"><img src={game.artwork} alt="" onError={(event) => { if (game.fallbackArtwork && event.currentTarget.src !== game.fallbackArtwork) event.currentTarget.src = game.fallbackArtwork; }} /><span className="search-card__shade" /><span className="search-card__external"><ArrowSquareOut aria-hidden="true" size={18} />Steam</span></span>
              <span className="search-card__body">
                <span className="search-card__eyebrow"><span><SteamLogo aria-hidden="true" size={17} weight="fill" />Steam</span>{game.metascore ? <span>{t("search.score", { score: game.metascore })}</span> : null}</span>
                <strong>{game.title}</strong>
                <span className="search-card__facts"><span><Monitor aria-hidden="true" size={15} />{game.platforms.join(" · ") || "PC"}</span>{game.controller ? <span><GameController aria-hidden="true" size={16} />{t("search.controller")}</span> : null}</span>
                <small>{game.price}</small>
              </span>
            </motion.a>
          ))}
        </div>
      )}
    </section>
  );
}
