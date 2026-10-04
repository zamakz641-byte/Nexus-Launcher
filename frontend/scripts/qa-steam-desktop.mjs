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
  await page.locator('.top-navigation__route[href="/settings"]').click();
  await page.getByRole('button', { name: 'Métadonnées', exact: true }).click();
  await page.locator('.steam-account-settings input[type="password"]').waitFor();
  await page.screenshot({ path: join(root, 'artifacts/qa/steam/account-settings.png') });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ encryptedStorageAvailable: true, realPreloadIPC: true, invalidInputRejected: true, unconfiguredNotZeroProgress: true, settingsVisible: true, errors }));
} finally { await app.close(); }
