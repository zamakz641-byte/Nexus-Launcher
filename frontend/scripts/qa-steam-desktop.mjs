import { _electron as electron } from 'playwright-core';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
await mkdir(resolve(root, 'artifacts/qa/steam'), { recursive: true });
const profile = await mkdtemp(resolve(root, 'artifacts/qa/steam/profile-'));
const { ELECTRON_RUN_AS_NODE: _, ...env } = process.env;
const app = await electron.launch({ executablePath: resolve(root, 'node_modules/electron/dist/electron.exe'), args: [root, `--user-data-dir=${profile}`], cwd: root, env });
try {
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.locator('.startup-sequence').waitFor(); await page.keyboard.press('Escape');
  await page.locator('.onboarding').waitFor(); await page.getByRole('button', { name: 'Configurer plus tard', exact: true }).click();
  const status = await page.evaluate(() => window.nexusDesktop.getSteamAccountStatus());
  assert.equal(status.configured, false);
  assert.equal(status.storageAvailable, true);
  const invalid = await page.evaluate(() => window.nexusDesktop.saveSteamAccount({ steamId: 'invalid', apiKey: 'invalid' }));
  assert.equal(invalid.error, 'invalid-input'); assert.equal(invalid.configured, false);
  const achievements = await page.evaluate(() => window.nexusDesktop.getSteamAchievements(2281730, 'fr', true));
  assert.equal(achievements.state, 'unconfigured'); assert.deepEqual(achievements.achievements, []);
  assert.equal((await page.evaluate(()=>window.nexusDesktop.getSteamLibrary())).state,'unconfigured');
  for(const provider of ['epic','gog']) {
    const status=await page.evaluate(provider=>window.nexusDesktop.getStoreAccountStatus(provider),provider);
    assert.equal(status.configured,false);assert.equal(status.storageAvailable,true);
    assert.equal((await page.evaluate(provider=>window.nexusDesktop.getStoreLibrary(provider),provider)).state,'unconfigured');
  }
  await page.locator('.top-navigation__route[href="/settings"]').click();
  await page.getByRole('button', { name: 'Comptes', exact: true }).click();
  await page.getByRole('button', { name: 'Connecter Steam', exact: true }).click();
  await page.locator('.steam-account-settings input[type="password"]').waitFor();
  const layers = await page.locator('.account-dialog').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { dialog: Number(getComputedStyle(element).zIndex), overlay: Number(getComputedStyle(document.querySelector('.trailer-overlay')).zIndex), hit: element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + 50)), background: getComputedStyle(element).backgroundColor };
  });
  assert.ok(layers.dialog > layers.overlay); assert.equal(layers.hit, true); assert.equal(layers.background, 'rgb(8, 19, 29)');
  assert.equal(await page.getByRole('button', { name: 'Continuer avec Steam dans mon navigateur' }).isEnabled(), true);
  await page.screenshot({ path: join(root, 'artifacts/qa/steam/account-settings.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Connecter Steam',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Connecter Steam',exact:true}).evaluate(element=>element===document.activeElement),true);
  const created=app.waitForEvent('window');
  const connection=page.evaluate(()=>window.nexusDesktop.connectStoreAccount('epic'));
  const login=await created;
  const nativeWindow=await app.browserWindow(login);
  const preferences=await nativeWindow.evaluate(window=>window.webContents.getLastWebPreferences());
  assert.equal(preferences.nodeIntegration,false);assert.equal(preferences.sandbox,true);assert.equal(preferences.contextIsolation,true);
  await nativeWindow.evaluate(window=>window.close());
  const cancelled=await connection;
  assert.equal(cancelled.configured,false);assert.equal(cancelled.error,'cancelled');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ encryptedStorageAvailable: true, realPreloadIPC: true, invalidInputRejected: true, unconfiguredNotZeroProgress: true, settingsVisible: true, errors }));
} finally { await app.close(); }
