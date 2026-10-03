import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MediaCache } from '../backend/mediaCache.mjs';

test('artwork survives restart and offline refresh, concurrent loads share one request', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'nexus-media-'));
  let calls = 0;
  const fetcher = async () => { calls++; return new Response(Buffer.from('image bytes'), { headers: { 'content-type': 'image/png' } }); };
  const url = 'https://cdn.steamstatic.com/test.png';
  const cache = new MediaCache(folder, fetcher);
  const results = await Promise.all([cache.get(url), cache.get(url)]);
  assert.equal(calls, 1);
  assert.deepEqual(results[0].buffer, results[1].buffer);
  const offline = new MediaCache(folder, async () => { throw new Error('offline'); });
  assert.equal((await offline.get(url)).buffer.toString(), 'image bytes');
  assert.equal((await offline.get(url, true)).buffer.toString(), 'image bytes');
});

test('failed responses are retryable and unapproved media hosts are rejected', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'nexus-media-'));
  let calls = 0;
  const cache = new MediaCache(folder, async () => ++calls <= 2 ? new Response('fail', { status: 503 }) : new Response('ok', { headers: { 'content-type': 'image/png' } }));
  await assert.rejects(cache.get('https://evil.example/image.png'));
  await assert.rejects(cache.get('https://cdn.steamstatic.com/test.png'));
  assert.equal((await cache.get('https://cdn.steamstatic.com/test.png')).buffer.toString(), 'ok');
});
