import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
const games = [
  { id: 'alpha', title: 'Alpha', platform: 'Steam', executablePath: 'C:/QA/Alpha.exe' },
  { id: 'beta', title: 'Beta', platform: 'Local' },
  { id: 'eclipse', title: 'Éclipse', platform: 'Epic', executablePath: 'C:/QA/Eclipse.exe' },
].map(game => ({ ...game, folderPath: 'C:/QA', modifiedAt: new Date().toISOString(), artworkUrl: '/assets/brand/nexus-mark.png' }));
await page.addInitScript(() => {
  localStorage.setItem('nexus.onboarding.complete.v1', 'true');
  window.qaButtons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  Object.defineProperty(navigator, 'getGamepads', { value: () => [{ buttons: window.qaButtons, axes: [0,0], connected: true }] });
});
await page.route('**/api/library/**', route => {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('/scan')) return route.fulfill({ json: { games, roots: [], manualGames: [] } });
  if (path.endsWith('/changes')) return route.fulfill({ json: { changed: false } });
  if (path.endsWith('/pick')) return route.fulfill({ json: { cancelled: true } });
  return route.fulfill({ json: { providers: {}, profileName: 'QA' } });
});
const base = process.env.NEXUS_QA_URL || 'http://127.0.0.1:13293';
try {
  await page.goto(`${base}/library`); await page.locator('.library-entry').first().waitFor();
  assert.equal(await page.locator('.library-focus').count(), 0);
  assert.equal(await page.locator('.library-entry').count(), 3);
  const search = page.getByRole('textbox', { name: 'Rechercher dans mes jeux' });
  await search.fill('eclipse'); assert.equal(await page.locator('.library-entry').count(), 1);
  await search.fill('not-found'); await page.getByRole('heading', { name: 'Aucun jeu ne correspond' }).waitFor();
  await page.getByRole('button', { name: 'Effacer les filtres', exact: true }).first().click();
  await page.getByRole('button', { name: /^À configurer/ }).click();
  assert.equal(await page.locator('.library-entry').count(), 1); assert.match(await page.locator('.library-entry').innerText(), /BETA/);
  await page.getByRole('button', { name: /^Tous les jeux/ }).click();
  await page.getByRole('combobox', { name: 'Plateforme' }).selectOption('Steam');
  assert.equal(await page.locator('.library-entry').count(), 1);
  await page.getByRole('button', { name: 'Ajouter un jeu', exact: true }).click();
  assert.ok(page.url().endsWith('/library'), 'cancelling native picker keeps library open');
  await page.getByRole('button', { name: 'Effacer les filtres', exact: true }).click();
  const source = page.getByRole('combobox', { name: 'Plateforme' }); await source.focus();
  await page.evaluate(() => { window.qaButtons[15].pressed = true; }); await page.waitForTimeout(90);
  await page.evaluate(() => { window.qaButtons[15].pressed = false; });
  assert.equal(await source.inputValue(), 'Steam', 'controller Right changes platform');
  await page.evaluate(() => { window.qaButtons[13].pressed = true; }); await page.waitForTimeout(90);
  await page.evaluate(() => { window.qaButtons[13].pressed = false; });
  assert.equal(await source.evaluate(element => element === document.activeElement), false, 'controller Down leaves dropdown');
  await page.getByRole('button', { name: 'Effacer les filtres', exact: true }).click();
  await page.locator('.library-entry').first().focus(); await page.keyboard.press('Enter');
  await page.locator('.game-detail-screen').waitFor(); await page.keyboard.press('Escape');
  await page.locator('.library-clean').waitFor();
  for (const width of [1920,640]) {
    await page.setViewportSize({ width, height: width === 640 ? 720 : 1080 });
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    const bounds = await page.locator('.library-entry').last().boundingBox();
    assert.ok(bounds.height > 100, 'cards remain readable');
  }
  await mkdir('artifacts/qa/library-clean', { recursive: true });
  await page.screenshot({ path: 'artifacts/qa/library-clean/640.png' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ search: true, clearFilters: true, platformAndStatus: true, cancelImport: true, keyboardOpenBack: true, noOverflow: true, errors }));
} finally { await browser.close(); }
