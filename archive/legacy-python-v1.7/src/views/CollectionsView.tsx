import React, { useMemo, useState } from 'react';
import { Game } from '../types/game';
import { Heart, ShieldAlert, Swords, Star, Globe, Users, Play, Clock } from '../components/UiIcon';
import { ControllerGlyph, useControllerKind } from '../components/ControllerGlyph';

interface CollectionsViewProps {
  games: Game[];
  onSelectGame: (id: string) => void;
  onLaunchGame: (id: string) => void;
}

interface CollectionDef {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  accent: string;
  filter: (game: Game) => boolean;
}

const COLLECTIONS_CONFIG: CollectionDef[] = [
  { name: 'Favoris', icon: Heart, description: 'Tes jeux épinglés, toujours à portée de manette.', accent: '#f43f5e', filter: (g) => g.isFavorite },
  { name: 'RPG', icon: ShieldAlert, description: 'Quêtes, builds et mondes à explorer.', accent: '#38bdf8', filter: (g) => g.genres.some((x) => x.toLowerCase() === 'rpg') },
  { name: 'Action', icon: Swords, description: 'Combat, réflexes et adrénaline.', accent: '#f59e0b', filter: (g) => g.genres.some((x) => x.toLowerCase().includes('action')) },
  { name: 'À terminer', icon: Star, description: 'Le backlog que tu refuses très dignement d’oublier.', accent: '#a855f7', filter: (g) => g.collections.includes('À terminer') },
  { name: 'Monde ouvert', icon: Globe, description: 'Les grands terrains de jeu de ta bibliothèque.', accent: '#10b981', filter: (g) => g.genres.some((x) => x.toLowerCase().includes('monde ouvert')) },
  { name: 'Coopératif & Aventure', icon: Users, description: 'Expériences narratives et multijoueurs.', accent: '#ec4899', filter: (g) => g.genres.some((x) => ['aventure','coopératif','co-op','coop'].some((term) => x.toLowerCase().includes(term))) },
];

export const CollectionsView: React.FC<CollectionsViewProps> = ({ games, onSelectGame, onLaunchGame }) => {
  const [activeCollection, setActiveCollection] = useState(COLLECTIONS_CONFIG[0].name);
  const controllerKind = useControllerKind();
  const active = COLLECTIONS_CONFIG.find((entry) => entry.name === activeCollection) || COLLECTIONS_CONFIG[0];
  const activeGames = useMemo(() => games.filter(active.filter), [games, active]);

  return (
    <div id="nexus-collections-view" data-controller-scope="true" className="relative min-h-full nexus-view-surface px-8 pb-20 pt-24 select-none">
      <div className="mb-7">
        <div className="mb-1 text-[8.5px] font-extrabold uppercase tracking-[0.28em] text-purple-400">Organisation de tes mondes</div>
        <h1 className="text-3xl font-black tracking-tight text-white">Collections</h1>
        <p className="mt-1 text-[11px] text-slate-400">Les groupes sont calculés depuis ta vraie bibliothèque et restent navigables entièrement à la manette.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {COLLECTIONS_CONFIG.map((col, index) => {
          const Icon = col.icon;
          const matchingGames = games.filter(col.filter);
          const totalPlaytime = matchingGames.reduce((acc, g) => acc + g.playtimeHours, 0);
          const selected = col.name === active.name;
          return (
            <button
              key={col.name}
              type="button"
              data-controller-default={selected || (!activeCollection && index === 0) ? 'true' : undefined}
              onClick={() => setActiveCollection(col.name)}
              className={`group relative h-[210px] overflow-hidden rounded-2xl border p-5 text-left shadow-[0_16px_42px_rgba(0,0,0,.3)] transition-colors ${selected ? 'border-sky-300/35 bg-[#081827]' : 'border-white/[0.075] bg-[#06101a] hover:border-white/20'}`}
            >
              <div className="pointer-events-none absolute inset-y-0 right-0 flex w-[48%] justify-end gap-2 overflow-hidden opacity-34">
                {matchingGames.slice(0, 2).map((g, i) => g.coverImage ? <img key={g.id} src={g.coverImage} alt="" loading="lazy" decoding="async" draggable={false} className={`h-full w-[116px] object-cover ${i ? 'translate-y-4' : ''}`}/> : null)}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#06101a] via-[#06101a]/94 to-[#06101a]/28"/>
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border" style={{ backgroundColor: `${col.accent}16`, borderColor: `${col.accent}40`, color: col.accent }}><Icon className="h-5 w-5"/></span>
                  <div className="text-right"><div className="text-2xl font-black text-white">{matchingGames.length}</div><div className="text-[7px] font-black uppercase tracking-[.15em] text-slate-600">jeux</div></div>
                </div>
                <div className="max-w-[72%]"><h3 className="text-lg font-black text-white">{col.name}</h3><p className="mt-1 line-clamp-2 text-[9.5px] leading-4 text-slate-400">{col.description}</p><div className="mt-3 flex items-center gap-1.5 text-[8px] text-slate-500"><Clock className="h-3 w-3"/>{Math.round(totalPlaytime * 10) / 10} h cumulées</div></div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-[14px] font-black text-white">{active.name}</h2><p className="text-[9px] text-slate-500">{activeGames.length ? '✕ lance le jeu sélectionné.' : 'Aucun jeu dans cette collection.'}</p></div><span className="text-[8px] uppercase tracking-[.18em] text-slate-600">Collection active</span></div>
        {activeGames.length ? (
          <div data-controller-row="true" className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
            {activeGames.map((game, index) => (
              <button
                key={game.id}
                type="button"
                data-controller-default={index === 0 ? 'true' : undefined}
                onFocus={() => onSelectGame(game.id)}
                onClick={() => onLaunchGame(game.id)}
                className="group relative h-[184px] w-[148px] shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#07111b] text-left shadow-[0_14px_34px_rgba(0,0,0,.28)] transition-colors hover:border-sky-200/30"
              >
                {game.coverImage ? <img src={game.coverImage} alt={game.title} loading={index > 8 ? 'lazy' : 'eager'} decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover"/> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"/>
                <div className="absolute inset-x-0 bottom-0 p-2.5"><div className="truncate text-[9.5px] font-black text-white">{game.title}</div><div className="mt-1 flex items-center justify-between text-[7.5px] text-slate-300"><span>{game.playtimeHours} h</span><span className="inline-flex items-center gap-1 font-black text-sky-100"><ControllerGlyph face="confirm" kind={controllerKind} size={15}/> <Play className="h-2.5 w-2.5 fill-current"/></span></div></div>
              </button>
            ))}
          </div>
        ) : <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] py-10 text-center text-[10px] text-slate-600">Cette collection se remplira automatiquement selon tes jeux.</div>}
      </section>
    </div>
  );
};
