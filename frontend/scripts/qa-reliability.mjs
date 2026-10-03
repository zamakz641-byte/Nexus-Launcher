import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.NEXUS_QA_URL || 'http://127.0.0.1:13293';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
let scans = 0, recovered = false; const launches = [];
const image = await readFile(resolve(import.meta.dirname, '../public/assets/brand/nexus-mark.png'));
const games = ['Alpha', 'Beta', 'Gamma'].map((title, index) => ({
  id: `game-${index}`, title, folderPath: `C:/QA/${title}`, executablePath: `C:/QA/${title}/game.exe`, modifiedAt: new Date().toISOString(),
  artworkUrl: index === 0 ? '/api/library/media?url=https%3A%2F%2Fcdn.steamstatic.com%2Fmissing.png' : '/assets/brand/nexus-mark.png',
  steamMetadata: { appId: index + 1, title, heroArtworkUrl: 'https://cdn.steamstatic.com/missing-hero.png' },
}));
await page.addInitScript(() => {
  localStorage.setItem('nexus.onboarding.complete.v1', 'true');
  window.qaButtons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  Object.defineProperty(navigator, 'getGamepads', { value: () => [{ buttons: window.qaButtons, axes: [0, 0], connected: true }] });
});
await page.route('**/api/library/**', async route => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith('/scan')) { scans++; return route.fulfill({ json: { games, roots: [], root: 'C:/QA', manualGames: [], scanErrors: {} } }); }
  if (url.pathname.endsWith('/media')) return recovered ? route.fulfill({ body: image, contentType: 'image/png' }) : route.fulfill({ status: 503, body: 'temporary failure' });
  if (url.pathname.endsWith('/launch')) { launches.push(route.request().postDataJSON().gameId); return route.fulfill({ json: { ok: true, requestId: 'qa' } }); }
  if (url.pathname.endsWith('/changes')) return route.fulfill({ json: { changed: false } });
  if (url.pathname.endsWith('/system')) return route.fulfill({ json: { providers: { local: true, steamStore: false, steamGridDb: false }, profileName: 'QA' } });
  return route.fulfill({ json: {} });
});
try {
  await page.goto(base); await page.locator('.game-tile').first().waitFor();
  await page.waitForTimeout(500);
  const first = page.locator('.game-tile').first();
  assert.match(await first.locator('img').getAttribute('src'), /nexus-mark/);
  recovered = true; await page.keyboard.press('F5');
  await page.waitForFunction(() => document.querySelector('.game-tile img')?.naturalWidth > 0 && document.querySelector('.game-tile img')?.src.includes('retry='));
  assert.equal(scans, 2);
  await first.focus(); await page.keyboard.down('Enter'); await page.waitForTimeout(720); await page.keyboard.up('Enter');
  await page.locator('.launch-sequence').waitFor({ state: 'hidden' }); assert.deepEqual(launches, ['game-0']);
  await page.locator('.game-tile').nth(1).focus();
  await page.evaluate(() => { window.qaButtons[0].pressed = true; }); await page.waitForTimeout(720);
  await page.evaluate(() => { window.qaButtons[0].pressed = false; }); await page.locator('.launch-sequence').waitFor({ state: 'hidden' });
  assert.deepEqual(launches, ['game-0', 'game-1']);
  await page.locator('.game-tile').nth(2).hover(); await page.mouse.down(); await page.waitForTimeout(720); await page.mouse.up(); await page.locator('.launch-sequence').waitFor({ state: 'hidden' });
  assert.deepEqual(launches, ['game-0', 'game-1', 'game-2']);
  await page.locator('.top-navigation__route[href="/library"]').click(); await page.locator('.library-entry').first().waitFor();
  await page.locator('.library-entry').first().focus(); await page.keyboard.press('Enter');
  await page.locator('.game-detail-screen').waitFor();
  await page.keyboard.press('Escape'); await page.locator('.library-screen').waitFor();
  await page.locator('.system-trigger').click();
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="menu"]'))), true);
  await page.keyboard.press('Escape');
  await page.locator('.top-navigation__route[href="/settings"]').click(); await page.locator('.settings-screen').waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Jeu', exact: true }).click();
  const slider = page.locator('input[type="range"]').first(); await slider.focus();
  await page.keyboard.press('Home');
  const previous = Number(await slider.inputValue());
  await page.evaluate(() => { window.qaButtons[15].pressed = true; }); await page.waitForTimeout(80);
  await page.evaluate(() => { window.qaButtons[15].pressed = false; });
  assert.ok(Number(await slider.inputValue()) > previous, 'controller Right adjusts volume');
  await page.evaluate(() => { window.qaButtons[13].pressed = true; }); await page.waitForTimeout(80);
  await page.evaluate(() => { window.qaButtons[13].pressed = false; });
  assert.equal(await slider.evaluate(el => el === document.activeElement), false, 'controller Down leaves slider');
  await page.keyboard.press('Tab'); assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), 'BODY');
  const routes = [['/search', '.search-screen'], ['/downloads', '.downloads-screen'], ['/library', '.library-screen'], ['/settings', '.settings-screen'], ['/', '.home-screen']];
  for (const width of [1920, 640]) {
    await page.setViewportSize({ width, height: width === 640 ? 720 : 1080 });
    for (const [path, screen] of routes) {
      await page.locator(`.top-navigation__route[href="${path}"]`).click();
      await page.locator(screen).waitFor();
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, `${path} overflow at ${width}px`);
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ scans, launches, artworkRecovered: true, menuFocusContained: true, controllerSliders: true, detailsAndBack: true, routesAt1920And640: true, runtimeErrors: errors }, null, 2));
} catch (error) { console.error(JSON.stringify({ url: page.url(), errors })); throw error; }
finally { await browser.close(); }
