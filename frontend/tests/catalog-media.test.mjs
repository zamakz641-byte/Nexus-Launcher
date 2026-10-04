import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCatalogMedia } from '../backend/catalogMedia.mjs';

test('keeps all playable trailers and full resolution screenshots, rejects untrusted URLs', () => {
  const media = getCatalogMedia({ movies: [
    { id: 1, name: 'Gameplay', mp4: { max: 'https://video.steamstatic.com/game.mp4' } },
    { id: 2, name: 'Launch', hls_h264: 'https://video.steamusercontent.com/launch.m3u8' },
    { id: 3, mp4: { max: 'https://example.org/bad.mp4' } },
  ], screenshots: [{ path_full: 'https://cdn.steamstatic.com/full.jpg', path_thumbnail: 'https://cdn.steamstatic.com/small.jpg' }] });
  assert.equal(media.trailers.length, 2);
  assert.equal(media.screenshots[0], 'https://cdn.steamstatic.com/full.jpg');
});
test('preserves all catalog trailers and screenshots', () => {
  const data = Array.from({ length: 20 }, (_, id) => ({ id, name: `Trailer ${id}`, mp4: { max: `https://cdn.steamstatic.com/${id}.mp4` } }));
  const media = getCatalogMedia({ movies: data, screenshots: data.map(({ id }) => ({ path_full: `https://cdn.steamstatic.com/${id}.jpg` })) });
  assert.equal(media.trailers.length, 20);
  assert.equal(media.screenshots.length, 20);
});
