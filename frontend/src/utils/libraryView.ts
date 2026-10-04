import type { Game } from '../types';
export interface LibraryView { query: string; status: 'all' | 'ready' | 'configure'; source: 'all' | Game['source']; sort: 'title' | 'recent' | 'playtime'; }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
export function libraryView(games: Game[], view: LibraryView): Game[] {
  return games.filter(game => normalize(game.title).includes(normalize(view.query.trim())) && (view.source === 'all' || game.source === view.source) && (view.status === 'all' || game.installed === (view.status === 'ready'))).sort((a, b) => {
    if (view.sort === 'recent') return (Date.parse(b.lastPlayedAt || '') || 0) - (Date.parse(a.lastPlayedAt || '') || 0) || a.title.localeCompare(b.title);
    if (view.sort === 'playtime') return b.playtimeHours - a.playtimeHours || a.title.localeCompare(b.title);
    return a.title.localeCompare(b.title);
  });
}
