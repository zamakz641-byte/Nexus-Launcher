import React, { useState, useMemo } from 'react';
import { Game } from '../types/game';
import { Search, X, Play, Info, Heart, Clock } from './UiIcon';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onSelectGame: (id: string) => void;
  onLaunchGame: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  games,
  onSelectGame,
  onLaunchGame,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.genres.some((genre) => genre.toLowerCase().includes(q)) ||
        g.collections.some((col) => col.toLowerCase().includes(q)) ||
        g.developer.toLowerCase().includes(q)
    );
  }, [games, query]);

  if (!isOpen) return null;

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-20 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="search-modal-content"
        data-controller-scope="true"
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#07111b] shadow-[0_30px_90px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <Search className="h-5 w-5 text-sky-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par titre, genre (RPG, Action...), collection ou éditeur…"
            className="flex-1 bg-transparent text-[13px] text-white placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-500 hover:text-white"
            >
              Effacer
            </button>
          )}
          <kbd className="rounded border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[9px] text-slate-400">
            ÉCHAP
          </kbd>
          <button
            data-controller-back="true" data-controller-skip="true"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[500px] overflow-y-auto p-3">
          <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            {query ? `${results.length} résultat(s)` : 'Bibliothèque complète'}
          </div>

          {results.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              Aucun jeu trouvé pour « {query} »
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {results.map((game) => (
                <div
                  key={game.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectGame(game.id);
                    onClose();
                  }}
                  className="group flex items-center gap-4 rounded-xl p-2.5 transition-colors hover:bg-white/[0.05] cursor-pointer"
                >
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-12 w-20 rounded-lg border border-white/10 object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-[12px] font-bold text-white group-hover:text-amber-200">
                        {game.title}
                      </h4>
                      {game.isFavorite && (
                        <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[9px] text-slate-400">
                      <span>{game.genres.join(', ')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {game.playtimeHours} h
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunchGame(game.id);
                        onClose();
                      }}
                      className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-400 px-3 text-[10px] font-bold text-black hover:bg-amber-300"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Lancer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
