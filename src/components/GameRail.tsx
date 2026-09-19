import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Game } from '../types/game';
import { Clock, Heart } from './UiIcon';
import { ControllerGlyph, useControllerKind, type ControllerKind } from './ControllerGlyph';

interface GameRailProps {
  games: Game[];
  selectedGameId: string;
  onSelectGame: (id: string) => void;
  onLaunchGame: (id: string) => void;
}

const GameRailCard = memo(function GameRailCard({ game, index, isSelected, onSelectGame, onLaunchGame, controllerKind, register }: {
  game: Game;
  index: number;
  isSelected: boolean;
  onSelectGame: (id: string) => void;
  onLaunchGame: (id: string) => void;
  controllerKind: ControllerKind;
  register: (node: HTMLButtonElement | null) => void;
}) {
  const progressPercent = game.totalAchievements > 0 ? Math.round((game.achievementsUnlocked / game.totalAchievements) * 100) : 0;
  return (
    <button
      ref={register}
      id={`rail-card-${game.id}`}
      type="button"
      data-controller-game-card="true"
      data-controller-default={isSelected ? 'true' : undefined}
      data-controller-focus-sfx="managed"
      data-selected={isSelected ? 'true' : undefined}
      onFocus={() => { if (!isSelected) onSelectGame(game.id); }}
      onClick={(event) => {
        if (event.detail === 0 && isSelected) { onLaunchGame(game.id); return; }
        onSelectGame(game.id);
      }}
      onDoubleClick={() => onLaunchGame(game.id)}
      className={`nexus-game-card group relative h-[132px] w-[236px] shrink-0 snap-center overflow-hidden rounded-[12px] border text-left transition-[transform,border-color,box-shadow] duration-180 active:scale-[.985] ${isSelected ? '-translate-y-1 scale-[1.012] border-sky-200/75 shadow-[0_0_0_1px_rgba(125,211,252,.16),0_22px_46px_rgba(0,0,0,.48)]' : 'border-white/[.075] bg-[#07111b]/95 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_16px_38px_rgba(0,0,0,.34)]'}`}
      aria-label={`${game.title}, ${game.playtimeHours} heures`}
    >
      {game.heroImage || game.coverImage ? (
        <img src={game.heroImage || game.coverImage} alt={game.title} loading={index > 8 ? 'lazy' : 'eager'} decoding="async" fetchPriority={isSelected ? 'high' : 'auto'} draggable={false} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,.12),transparent_35%),linear-gradient(145deg,#08131f,#03080e)] px-4 text-center text-[9px] font-black uppercase tracking-[.12em] text-slate-500">{game.title}</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#010509]/98 via-[#010509]/34 55% to-black/10"/>
      {game.isFavorite && <Heart className="absolute right-2.5 top-2.5 h-3.5 w-3.5 fill-rose-300 text-rose-300 drop-shadow"/>}
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <div className="truncate text-[10.5px] font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.8)]">{game.title}</div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[8.5px] font-semibold text-slate-300"><Clock className="h-2.5 w-2.5"/>{game.playtimeHours} h</div>
          {isSelected && <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.08em] text-sky-100"><ControllerGlyph face="confirm" kind={controllerKind} size={16} className="text-sky-200"/><span>Jouer</span></div>}
        </div>
        {game.totalAchievements > 0 && <div className="mt-2 h-[2px] w-full overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-sky-300" style={{ width: `${progressPercent}%` }}/></div>}
      </div>
      {isSelected && <div className="nexus-selected-underline pointer-events-none absolute inset-x-3 bottom-0 h-[2px] rounded-full"/>}
    </button>
  );
});

export const GameRail: React.FC<GameRailProps> = ({ games, selectedGameId, onSelectGame, onLaunchGame }) => {
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const controllerKind = useControllerKind();
  const selectedIndex = games.findIndex((g) => g.id === selectedGameId);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(games.length / pageSize));
  const selectedPage = selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) : 0;

  useEffect(() => {
    const card = cardRefs.current[selectedGameId];
    const rail = railRef.current;
    if (!card || !rail) return;
    const raf = requestAnimationFrame(() => {
      const cardLeft = card.offsetLeft;
      const cardRight = cardLeft + card.offsetWidth;
      const visibleLeft = rail.scrollLeft + 8;
      const visibleRight = rail.scrollLeft + rail.clientWidth - 8;
      if (cardLeft >= visibleLeft && cardRight <= visibleRight) return;
      const left = Math.max(0, cardLeft + card.offsetWidth / 2 - rail.clientWidth / 2);
      rail.scrollTo({ left, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedGameId, games.length]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    const candidates = [games[selectedIndex - 1], games[selectedIndex + 1], games[selectedIndex + 2]].filter(Boolean) as Game[];
    const task = () => candidates.forEach((game) => {
      const src = game.heroImage || game.coverImage;
      if (!src) return;
      const image = new Image(); image.decoding = 'async'; image.src = src; void image.decode?.().catch(() => {});
    });
    const ric = (window as any).requestIdleCallback as ((cb: () => void, options?: { timeout: number }) => number) | undefined;
    const id = ric ? ric(task, { timeout: 700 }) : window.setTimeout(task, 120);
    return () => { if (ric) (window as any).cancelIdleCallback?.(id); else window.clearTimeout(id); };
  }, [games, selectedIndex]);

  const pips = useMemo(() => Array.from({ length: Math.min(pageCount, 6) }), [pageCount]);

  return (
    <section id="nexus-game-rail" className="relative z-20 mb-4 select-none">
      <div className="nexus-rail-pips mb-2.5 flex items-center justify-end">
        <div className="flex items-center gap-1.5" aria-hidden="true">{pips.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-[width,background-color] duration-150 ${i === Math.min(selectedPage, pips.length - 1) ? 'w-6 bg-sky-300' : 'w-1.5 bg-white/20'}`}/>)}</div>
      </div>
      <div ref={railRef} data-controller-row="true" className="no-scrollbar flex snap-x snap-mandatory items-center gap-3.5 overflow-x-auto pb-3 pt-1.5" style={{ scrollbarWidth: 'none', scrollBehavior: 'auto' }}>
        {games.map((game, index) => <GameRailCard key={game.id} game={game} index={index} isSelected={game.id === selectedGameId} onSelectGame={onSelectGame} onLaunchGame={onLaunchGame} controllerKind={controllerKind} register={(node) => { cardRefs.current[game.id] = node; }}/>) }
      </div>
    </section>
  );
};
