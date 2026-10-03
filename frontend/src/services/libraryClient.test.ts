// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { toGame } from './libraryClient';
it('keeps Steam artwork available when catalog details are missing', () => {
  const game = toGame({ id: 'combat', title: 'Combat Master', platform: 'Steam', storeId: '2281730', folderPath: 'D:/Steam/CombatMaster', modifiedAt: new Date().toISOString() });
  expect(decodeURIComponent(game.artwork)).toContain('/2281730/header.jpg');
  expect(game.achievementProgress.total).toBe(0);
});
it('keeps the user cover first and offers artwork from another provider', () => {
  const game = toGame({ id: 'custom', title: 'Custom', artworkUrl: '/api/library/artwork?file=custom.png', folderPath: 'D:/Custom', modifiedAt: new Date().toISOString(), steamMetadata: { appId: 1, artworkUrl: 'https://cdn2.steamgriddb.com/cover.png', artworkFallbackUrls: ['https://cdn.steamstatic.com/cover.jpg'] } });
  expect(game.artwork).toContain('custom.png');
  expect(decodeURIComponent(game.artworkFallbacks![0])).toContain('steamstatic.com/cover.jpg');
});
