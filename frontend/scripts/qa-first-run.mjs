import { _electron as electron } from 'playwright-core';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const artifacts = resolve(root, 'artifacts/qa/first-run'); await mkdir(artifacts, { recursive: true });
const profile = await mkdtemp(join(artifacts, 'profile-'));
const folder = join(profile, 'My Games'); await mkdir(join(folder, 'Nexus QA Game'), { recursive: true });
await writeFile(join(folder, 'Nexus QA Game', 'game.exe'), 'Discovery fixture only, never execute.');
const { ELECTRON_RUN_AS_NODE: _, ...env } = process.env;
const executable = process.env.NEXUS_QA_EXECUTABLE || resolve(root, 'node_modules/electron/dist/electron.exe');
const app = await electron.launch({ executablePath: executable, args: process.env.NEXUS_QA_EXECUTABLE ? ['--user-data-dir=' + profile] : [root, '--user-data-dir=' + profile], cwd: root, env: { ...env, NEXUS_CACHE_DIR: profile } });
try {
  const actualProfile = await app.evaluate(({ app }) => app.getPath('userData'));
  assert.equal(resolve(actualProfile), resolve(profile), 'QA must use an isolated profile');
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.locator('.startup-sequence').waitFor(); await page.keyboard.press('Escape');
  await page.locator('.onboarding').waitFor();
  const continueButton = page.getByRole('button', { name: 'Continuer', exact: true });
  assert.equal(await continueButton.isDisabled(), true);
  const choose = page.getByRole('button', { name: 'Choisir mon dossier de jeux', exact: true });
  await app.evaluate(({ dialog }, folder) => {
    let calls = 0;
    dialog.showOpenDialog = async () => ++calls === 1 ? { canceled: true, filePaths: [] } : { canceled: false, filePaths: [folder] };
  }, folder);
  await choose.click(); await choose.waitFor();
  assert.equal(await continueButton.isDisabled(), true, 'Canceling the picker must not validate setup');
  await choose.click(); await page.getByText(folder, { exact: true }).waitFor({ timeout: 60000 });
  assert.equal(await continueButton.isDisabled(), false);
  await page.screenshot({ path: join(artifacts, 'folder-saved.png') });
  await continueButton.click(); await page.getByRole('button', { name: 'Français', exact: true }).waitFor();
  await page.waitForTimeout(100);
  assert.equal(await page.getByRole('button', { name: 'Français', exact: true }).evaluate(button => button === document.activeElement), true, 'Incoming setup step must own focus');
  await continueButton.click(); await page.getByText('PRENEZ LE CONTRÔLE', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Entrer dans Nexus', exact: true }).click();
  await page.locator('.onboarding').waitFor({ state: 'hidden' });
  const snapshot = await page.evaluate(() => window.nexusDesktop.listLibrary());
  assert.ok(snapshot.roots.some(source => source.path === folder));
  assert.ok(snapshot.games.some(game => game.title === 'Nexus QA Game'));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ profile: 'isolated', version: await app.evaluate(({ app }) => app.getVersion()), folderAskedFirst: true, cancelHandled: true, folderPersisted: true, discoveredFixture: true, errors }));
} finally { await app.close(); }
