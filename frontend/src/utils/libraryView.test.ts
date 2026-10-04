import { expect, it } from 'vitest';
import type { Game } from '../types';
import { libraryView } from './libraryView';
const games = [{ id: 'a', title: 'Éclipse', source: 'Local', installed: false, playtimeHours: 2 }, { id: 'b', title: 'Beta', source: 'Steam', installed: true, playtimeHours: 8, lastPlayedAt: '2026-10-03' }] as Game[];
it('combines accent-insensitive search, readiness and platform without changing source order', () => {
  expect(libraryView(games, { query: 'eclipse', status: 'configure', source: 'all', sort: 'title' }).map(g => g.id)).toEqual(['a']);
  expect(libraryView(games, { query: '', status: 'ready', source: 'Local', sort: 'title' })).toEqual([]);
  expect(libraryView(games, { query: '', status: 'all', source: 'all', sort: 'recent' }).map(g => g.id)).toEqual(['b','a']);
  expect(games[0].id).toBe('a');
});
