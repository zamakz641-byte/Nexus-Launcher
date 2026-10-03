import { useEffect, useRef } from "react";
import { CaretLeft, CaretRight, HardDrive, Storefront, SteamLogo } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import type { CSSProperties, WheelEvent } from "react";
import { getGameAccent } from "../theme/gameAccents";
import { applyImageFallback } from "../utils/imageFallback";
import type { Game, GameId } from "../types";

interface GameRailProps { games: Game[]; selectedId: GameId; onSelect: (id: GameId) => void; }

export function GameRail({ games, selectedId, onSelect }: GameRailProps) {
  const { t } = useTranslation();
  const refs = useRef(new Map<GameId, HTMLButtonElement>());
  const selectedIndex = games.findIndex((game) => game.id === selectedId);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const hasScrolled = useRef(false);
  const wheelAmount = useRef(0);
  const lastWheelAt = useRef(0);

  useEffect(() => {
    refs.current.get(selectedId)?.scrollIntoView({ behavior: hasScrolled.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant", block: "nearest", inline: "center" });
    hasScrolled.current = true;
  }, [selectedId]);

  const move = (offset: number, focus = true) => {
    if (!games.length) return;
    const currentIndex = Math.max(0, games.findIndex((game) => game.id === selectedIdRef.current));
    const nextIndex = (currentIndex + offset + games.length) % games.length;
    const game = games[nextIndex];
    if (!game) return;
    if (Math.abs(nextIndex - currentIndex) > 1) hasScrolled.current = false;
    selectedIdRef.current = game.id;
    onSelect(game.id);
    if (focus) refs.current.get(game.id)?.focus({ preventScroll: true });
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 820 || event.ctrlKey || !games.length) return;
    const now = performance.now();
    if (now - lastWheelAt.current > 240) wheelAmount.current = 0;
    lastWheelAt.current = now;
    wheelAmount.current += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(wheelAmount.current) < 44) return;
    move(wheelAmount.current > 0 ? 1 : -1, false);
    wheelAmount.current = 0;
  };

  const sourceIcon = (game: Game) => {
    if (game.source === "Steam") return <SteamLogo aria-hidden="true" size={20} weight="fill" />;
    if (game.source === "Local") return <HardDrive aria-hidden="true" size={20} weight="bold" />;
    return <Storefront aria-hidden="true" size={20} weight="bold" />;
  };

  return (
    <section className="game-rail" aria-label={t("nav.library")}>
      <div className="game-rail__viewport" onWheel={onWheel}>
        <div className="game-rail__track" role="listbox" aria-label={t("nav.library")}>
          {games.map((game, index) => {
            const selected = game.id === selectedId;
            const progress = game.achievementProgress.total > 0
              ? Math.round((game.achievementProgress.unlocked / game.achievementProgress.total) * 100)
              : 0;
            return (
              <button
                aria-label={`${game.title}, ${t(game.installed ? "status.installed" : "status.notInstalled")}`}
                aria-selected={selected}
                className="game-tile"
                data-enriched={game.discovered && game.metadata.includes("STEAM")}
                data-placeholder={game.artwork.includes("/assets/brand/nexus-mark")}
                data-selected={selected}
                data-index={index}
                data-launch-game={game.installed ? game.id : undefined}
                title={t("action.holdToPlay")}
                key={game.id}
                onClick={() => { selectedIdRef.current = game.id; onSelect(game.id); }}
                onFocus={() => { selectedIdRef.current = game.id; onSelect(game.id); }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
                  if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
                  if (event.key === "ArrowUp") { event.preventDefault(); document.querySelector<HTMLButtonElement>(".hero-game .nexus-button")?.focus(); }
                }}
                ref={(node) => { if (node) refs.current.set(game.id, node); else refs.current.delete(game.id); }}
                role="option"
                tabIndex={selected ? 0 : -1}
                style={{ "--tile-accent": getGameAccent(game.id) } as CSSProperties}
                type="button"
              >
                <img src={game.artwork} alt="" draggable="false" decoding="async" loading={Math.abs(index - selectedIndex) > 3 ? "lazy" : "eager"} onError={(event) => applyImageFallback(event, [...(game.artworkFallbacks || []), game.heroArtwork])} />
                <span className="game-tile__glass" aria-hidden="true" />
                <span className="game-tile__scrim" aria-hidden="true" />
                <span className="game-tile__info">
                  <span className="game-tile__source" aria-label={game.source}>{sourceIcon(game)}</span>
                  <span className="game-tile__title">{game.title}</span>
                  <span className="game-tile__meta" aria-hidden={!selected}>
                    <span>{game.installed ? t("search.ready").toLocaleUpperCase() : t("status.configure").toLocaleUpperCase()}</span>
                  </span>
                  {game.achievementProgress.total > 0 ? <span className="game-tile__progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="game-rail__position">
        <button className="game-rail__step" onClick={() => move(-1, false)} type="button" aria-label={t("home.previous")}><CaretLeft aria-hidden="true" size={17} weight="bold" /></button>
        <div className="game-rail__markers" aria-hidden="true">{games.map((game) => <span data-active={game.id === selectedId} key={game.id} />)}</div>
        <span className="game-rail__count">{Math.max(0, selectedIndex + 1)} / {games.length}</span>
        <button className="game-rail__step" onClick={() => move(1, false)} type="button" aria-label={t("home.next")}><CaretRight aria-hidden="true" size={17} weight="bold" /></button>
      </div>
    </section>
  );
}
