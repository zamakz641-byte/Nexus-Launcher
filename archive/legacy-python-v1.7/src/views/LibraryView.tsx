import React, { useState, useMemo } from 'react';
import { Game } from '../types/game';
import {
  Search,
  Plus,
  Play,
  Heart,
  Clock,
  LayoutGrid,
  List,
  SlidersHorizontal,
  HardDrive,
  Info,
} from '../components/UiIcon';

interface LibraryViewProps {
  games: Game[];
  onSelectGame: (id: string) => void;
  onLaunchGame: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenAddGame: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  games,
  onSelectGame,
  onLaunchGame,
  onOpenDetails,
  onToggleFavorite,
  onOpenAddGame,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Tous');
  const [sortBy, setSortBy] = useState<'playtime' | 'recent' | 'alpha'>('playtime');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => g.genres.forEach((genre) => set.add(genre)));
    return ['Tous', 'Favoris', ...Array.from(set)];
  }, [games]);

  const filteredGames = useMemo(() => {
    return games
      .filter((g) => {
        const matchesSearch =
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.developer.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedGenre === 'Tous') return true;
        if (selectedGenre === 'Favoris') return g.isFavorite;
        return g.genres.includes(selectedGenre);
      })
      .sort((a, b) => {
        if (sortBy === 'playtime') return b.playtimeHours - a.playtimeHours;
        if (sortBy === 'alpha') return a.title.localeCompare(b.title);
        return 0; // default order
      });
  }, [games, search, selectedGenre, sortBy]);

  const totalHours = games.reduce((acc, g) => acc + g.playtimeHours, 0);
  const totalStorage = games.reduce((acc, g) => acc + g.installSizeGb, 0).toFixed(0);

  return (
    <div id="nexus-library-view" className="relative min-h-full px-7 pb-20 pt-[92px] select-none nexus-view-surface">
      {/* View Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[8.5px] font-extrabold tracking-[0.28em] text-sky-400 uppercase">
            BIBLIOTHÈQUE CENTRALISÉE
          </div>
          <h1 className="text-[32px] font-black tracking-[-.035em] text-white">
            Tous vos jeux, unifiés
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            {games.length} jeux installés • {totalHours} h de jeu au total • {totalStorage} Go sur le disque
          </p>
        </div>

        {/* Top Action Button */}
        <button
          onClick={onOpenAddGame}
          className="flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-5 text-[11px] font-bold text-black shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter un jeu</span>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div data-controller-row="true" className="nexus-toolbar mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/[0.065] bg-[#06111b]/88 p-2.5 shadow-[0_16px_44px_rgba(0,0,0,.18)]">
        {/* Search input */}
        <div className="flex h-9 min-w-[260px] items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 text-[11px]">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer la bibliothèque…"
            className="w-full bg-transparent text-white placeholder-slate-500 outline-none"
          />
        </div>

        {/* Genre Tags Scroll */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
          {allGenres.slice(0, 7).map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`h-7 rounded-lg px-3 text-[10px] font-semibold transition-colors ${
                selectedGenre === genre
                  ? 'bg-sky-400/20 border border-sky-400/40 text-sky-200'
                  : 'bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Sort & View Mode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1 text-[10px] text-slate-300">
            <SlidersHorizontal className="ml-1.5 h-3 w-3 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent px-1 py-0.5 outline-none cursor-pointer"
            >
              <option value="playtime" className="bg-[#07111b] text-white">
                Temps de jeu
              </option>
              <option value="alpha" className="bg-[#07111b] text-white">
                Alphabétique
              </option>
            </select>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-500'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Games Render */}
      {filteredGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
          <p className="text-sm">Aucun jeu ne correspond à vos critères de recherche.</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedGenre('Tous');
            }}
            className="mt-3 text-xs text-sky-400 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredGames.map((game, index) => (
            <div
              key={game.id}
              role="button"
              tabIndex={0}
              data-controller-default={index === 0 ? 'true' : undefined}
              onFocus={() => onSelectGame(game.id)}
              onClick={(event) => { if (event.detail === 0) onLaunchGame(game.id); else onOpenDetails(game.id); }}
              className="nexus-library-card group relative flex flex-col overflow-hidden rounded-[18px] border border-white/[0.07] bg-[#07111b] shadow-[0_14px_35px_rgba(0,0,0,.22)] transition-[transform,border-color,box-shadow] duration-180 hover:-translate-y-1 hover:border-sky-200/30 hover:shadow-[0_22px_48px_rgba(0,0,0,.34)] cursor-pointer"
            >
              {/* Cover Aspect */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/50">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  loading={index > 10 ? "lazy" : "eager"}
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#07111b] via-transparent to-black/30" />

                {/* Favorite badge */}
                {game.isFavorite && (
                  <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-rose-400/30 bg-black/75 text-rose-400">
                    <Heart className="h-3 w-3 fill-current" />
                  </span>
                )}

                {/* Hover overlay quick launch */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/52 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    data-controller-skip="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchGame(game.id);
                    }}
                    title="Lancer"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg transition-transform hover:scale-110 active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </button>

                  <button
                    data-controller-skip="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(game.id);
                    }}
                    title="Détails"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-3.5">
                <h3 className="truncate text-[11.5px] font-bold text-white group-hover:text-amber-200">
                  {game.title}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-slate-500" />
                    {game.playtimeHours} h
                  </span>
                  <span className="truncate max-w-[80px] text-slate-500">
                    {game.genres[0]}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="flex flex-col gap-2">
          {filteredGames.map((game, index) => (
            <div
              key={game.id}
              role="button"
              tabIndex={0}
              data-controller-default={index === 0 ? 'true' : undefined}
              onFocus={() => onSelectGame(game.id)}
              onClick={(event) => { if (event.detail === 0) onLaunchGame(game.id); else onOpenDetails(game.id); }}
              className="group flex items-center justify-between rounded-[14px] border border-white/[0.06] bg-[#07111b]/82 p-3 transition-[transform,border-color,background-color] hover:translate-x-1 hover:border-white/20 hover:bg-[#0c1c2e] cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  loading={index > 15 ? "lazy" : "eager"}
                  decoding="async"
                  draggable={false}
                  className="h-12 w-20 rounded-lg border border-white/10 object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[13px] font-bold text-white group-hover:text-amber-200">
                      {game.title}
                    </h3>
                    {game.isFavorite && (
                      <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                    )}
                  </div>
                  <div className="mt-0.5 text-[9.5px] text-slate-400">
                    {game.genres.join(' • ')} — {game.developer}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-[10px] text-slate-300">
                <div className="hidden sm:block text-right">
                  <div className="font-bold text-white">{game.playtimeHours} h</div>
                  <div className="text-[8px] text-slate-500">Temps de jeu</div>
                </div>

                <div className="hidden md:block text-right">
                  <div className="font-bold text-white">{game.lastSession}</div>
                  <div className="text-[8px] text-slate-500">Dernière session</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    data-controller-skip="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(game.id);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                      game.isFavorite
                        ? 'border-rose-400/40 bg-rose-500/15 text-rose-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${game.isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    data-controller-skip="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchGame(game.id);
                    }}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 text-[10px] font-bold text-black hover:bg-amber-300 active:scale-95"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Lancer</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
