import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const base = process.env.NEXUS_QA_URL || 'http://127.0.0.1:13293';
const errors = []; page.on('pageerror', error => errors.push(error.message));
const movie = await readFile(resolve('public/assets/startup/nexus-startup-en-v1.mp4'));
const official = 'https://cdn.steamstatic.com';
const games = [{ id: 'media-game', title: 'Media game', folderPath: 'C:/QA', executablePath: 'C:/QA/game.exe', modifiedAt: new Date().toISOString(), steamMetadata: {
  appId: 1, title: 'Media game', heroArtworkUrl: `${official}/hero.jpg`, artworkUrl: `${official}/cover.jpg`,
  backgroundGallery: [`${official}/hero.jpg`, `${official}/scene.jpg`], screenshots: [`${official}/scene.jpg`, `${official}/hero.jpg`],
  trailerUrl: `${official}/first.mp4`, trailerTitle: 'Gameplay', trailers: [{ id: 'first', title: 'Gameplay', url: `${official}/first.mp4` }, { id: 'second', title: 'Launch trailer', url: `${official}/second.mp4` }],
} }];
await page.addInitScript(() => { localStorage.setItem('nexus.onboarding.complete.v1', 'true'); if (!localStorage.getItem('nexus.media.v1')) localStorage.setItem('nexus.media.v1', JSON.stringify({ interval: 8 })); });
await page.route('**/api/library/**', route => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith('/scan')) return route.fulfill({ json: { games, roots: [], manualGames: [] } });
  if (url.pathname.endsWith('/changes')) return route.fulfill({ json: { changed: false } });
  if (url.pathname.endsWith('/media')) {
    const remote = url.searchParams.get('url');
    return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g"><stop stop-color="#063443"/><stop offset="1" stop-color="${remote.includes('scene') ? '#ce843d' : '#49798b'}"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><circle cx="1300" cy="430" r="200" fill="#a5e8ff" opacity=".6"/></svg>` });
  }
  return route.fulfill({ json: { providers: {}, profileName: 'QA' } });
});
await page.route('https://cdn.steamstatic.com/*.mp4', route => route.fulfill({ body: movie, contentType: 'video/mp4' }));
try {
  await page.goto(base); await page.locator('.game-tile').waitFor();
  await page.waitForFunction(() => document.querySelector('.media-backdrop__image')?.src.includes('hero.jpg'));
  await page.waitForFunction(() => document.querySelector('.media-backdrop__image')?.src.includes('scene.jpg'), { timeout: 14000 });
  await page.goto(`${base}/settings?section=media`);
  const brightness = page.getByRole('slider', { name: 'Luminosité des fonds' }); await brightness.waitFor();
  await brightness.focus(); await page.keyboard.press('End');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  await page.getByRole('button', { name: 'Activé', exact: true }).click();
  await page.reload(); await brightness.waitFor();
  assert.equal(await brightness.inputValue(), '115');
  assert.equal(await page.getByRole('button', { name: 'Désactivé', exact: true }).count(), 2);
  await page.goto(`${base}/game/media-game`); await page.getByRole('button', { name: 'Médias', exact: true }).click();
  await page.getByRole('button', { name: 'Captures 1', exact: true }).click();
  await page.locator('.screenshot-dialog').waitFor();
  await page.keyboard.press('ArrowRight'); assert.match(await page.locator('.screenshot-dialog > img').getAttribute('alt'), /2$/);
  await page.keyboard.press('Escape'); await page.locator('.screenshot-dialog').waitFor({ state: 'hidden' });
  await page.locator('.game-detail__media').click(); await page.locator('.trailer-dialog video').waitFor();
  await page.getByRole('button', { name: 'Launch trailer', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.trailer-dialog video')?.src.endsWith('second.mp4'));
  await page.locator('.trailer-dialog video').evaluate(video => video.dispatchEvent(new Event('error')));
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.trailer-error'));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Succès', exact: true }).click(); await page.locator('.steam-achievements').waitFor();
  await page.goto(`${base}/settings?section=metadata`); await page.locator('.steam-account-settings').waitFor();
  for (const width of [1920, 640]) {
    await page.setViewportSize({ width, height: width === 640 ? 720 : 1080 });
    await page.goto(`${base}/settings?section=media`); await brightness.waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.goto(`${base}/game/media-game`); await page.getByRole('button', { name: 'Médias', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  }
  await mkdir('artifacts/qa/media', { recursive: true });
  await page.screenshot({ path: 'artifacts/qa/media/gallery-640.png' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ slideshow: true, preferencesPersist: true, screenshotNavigation: true, multipleTrailers: true, videoRetry: true, desktopOnlyAchievements: true, noOverflow: true, errors }));
} finally { await browser.close(); }
