import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { StoreAccounts } from '../backend/storeAccounts.mjs';
import { createStoreLogin, EPIC_CLIENT, readLoginCallback, isEpicCodePage, isLoginNavigationSafe } from '../backend/storeLogin.mjs';

const storage = { isEncryptionAvailable: () => true, encryptString: value => Buffer.from(value).map(byte => byte ^ 42), decryptString: value => Buffer.from(value.map(byte => byte ^ 42)).toString() };
const response = data => ({ ok: true, json: async () => data });
async function setup(t, overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'nexus-store-test-')); t.after(() => rm(root, { recursive: true, force: true }));
  const store = new StoreAccounts(root, storage, { login: async () => 'auth_code123', fetch: async url => {
    if (url.includes('/oauth/token')) return response({ access_token: 'ACCESS', refresh_token: 'REFRESH', account_id: 'user1', displayName: 'Player', expires_in: 3600 });
    if (url.includes('/library/api/public/items?')) return response({ records: [{ appName: 'owned', namespace: 'ns', catalogItemId: 'cat' }, { appName: 'private', namespace: 'ns', catalogItemId: 'private', sandboxType: 'PRIVATE' }], responseMetadata: {} });
    if (url.includes('/bulk/items')) return response({ cat: { title: 'Owned game' } });
    throw new Error('Unexpected request');
  }, ...overrides });
  return { store, root };
}

test('provider validation prevents arbitrary filenames and requests', async t => {
  const { store } = await setup(t);
  for (const operation of ['status', 'clear', 'connect', 'library']) await assert.rejects(store[operation]('../steam'), /Unsupported/);
});
test('callback accepts only official HTTPS origin, exact path and matching returned state', () => {
  const good = 'https://embed.gog.com/on_login_success?origin=client&code=code12345&state=expected';
  assert.equal(readLoginCallback('gog', good, 'expected'), 'code12345');
  for (const url of [good.replace('embed.gog.com', 'embed.gog.com.evil.test'), good.replace('https:', 'http:'), good.replace('/on_login_success', '/other'), good.replace('expected', 'wrong'), good.replace('https://', 'https://user:pass@')]) assert.equal(readLoginCallback('gog', url, 'expected'), null);
  assert.equal(isLoginNavigationSafe('javascript:alert(1)'), false);
  assert.equal(isLoginNavigationSafe('file:///etc/passwd'), false);
  assert.equal(isEpicCodePage(`https://www.epicgames.com/id/api/redirect?clientId=${EPIC_CLIENT}&responseType=code`), true);
  assert.equal(isEpicCodePage(`https://www.epicgames.com/id/api/redirect?clientId=wrong&responseType=code`), false);
});
test('encrypted account, owned library and offline cached results never expose tokens', async t => {
  const { store, root } = await setup(t);
  assert.deepEqual(await store.connect('epic'), { configured: true, storageAvailable: true, displayName: 'Player' });
  const library = await store.library('epic', true);
  assert.equal(library.state, 'ready'); assert.deepEqual(library.games, [{ id: 'owned', title: 'Owned game' }]);
  assert.doesNotMatch((await readFile(join(root, 'store-epic-account.bin'))).toString(), /ACCESS|REFRESH|Player/);
  store.fetch = async () => { throw new Error('Sensitive URL ACCESS'); };
  const offline = await store.library('epic', true);
  assert.equal(offline.state, 'offline'); assert.equal(offline.cached, true); assert.deepEqual(offline.games, library.games);
  assert.doesNotMatch(JSON.stringify([await store.status('epic'), offline]), /ACCESS|REFRESH|Sensitive/);
  await store.clear('epic'); assert.equal((await store.library('epic')).state, 'unconfigured');
});
test('GOG paginated owned library excludes other platforms and unowned releases', async t => {
  const { store } = await setup(t, { fetch: async url => {
    if (url.includes('/token?')) return response({ access_token: 'A', refresh_token: 'R', user_id: '123', expires_in: 3600 });
    if (url.includes('userData.json')) return response({ username: 'GOG Player' });
    if (url.includes('/releases')) return response(url.includes('page_token') ? { items: [{ platform_id: 'gog', external_id: '2', owned: true }] } : { items: [{ platform_id: 'gog', external_id: '1', owned: true }, { platform_id: 'steam', external_id: '7', owned: true }, { platform_id: 'gog', external_id: '8', owned: false }], next_page_token: 'next' });
    if (url.includes('external_releases')) return response({ type: 'game', title: { '*': url.endsWith('/1') ? 'One' : 'Two' }, game: { visible_in_library: true } });
    throw new Error('Unexpected request');
  } });
  assert.equal((await store.connect('gog')).displayName, 'GOG Player');
  assert.deepEqual((await store.library('gog', true)).games, [{ id: '1', title: 'One' }, { id: '2', title: 'Two' }]);
});
test('refresh preserves account and persists rotated token', async t => {
  let now = 1000000;
  const { store } = await setup(t, { now: () => now });
  await store.connect('epic'); now += 3600000;
  const originalFetch = store.fetch; let refreshed = false;
  store.fetch = async (url, options) => { if (url.includes('/oauth/token')) { assert.match(options.body, /grant_type=refresh_token/); refreshed = true; return response({ access_token: 'NEW', refresh_token: 'NEW_REFRESH', account_id: 'user1', expires_in: 3600 }); } return originalFetch(url, options); };
  assert.equal((await store.library('epic', true)).state, 'ready'); assert.equal(refreshed, true);
  assert.equal((await store.read('epic', 'account')).refresh_token, 'NEW_REFRESH');
});
test('GOG missing GamesDB metadata uses Product API and one missing product preserves other games', async t => {
  const { store } = await setup(t, { fetch: async url => {
    if (url.includes('/token?')) return response({ access_token: 'A', refresh_token: 'R', user_id: '123', expires_in: 3600 });
    if (url.includes('userData.json')) return response({ username: 'GOG Player' });
    if (url.includes('/releases')) return response({ items: ['1', '2', '3'].map(external_id => ({ platform_id: 'gog', external_id, owned: true })) });
    if (url.endsWith('external_releases/1')) return response({ type: 'game', title: { '*': 'Present title' }, game: { visible_in_library: true } });
    if (url.includes('external_releases')) return { ok: false, status: 404 };
    if (url.includes('/products/2?')) return response({ game_type: 'game', title: 'Product fallback title' });
    if (url.includes('/products/3?')) return { ok: false, status: 404 };
    throw new Error('Unexpected request');
  } });
  await store.connect('gog');
  const result = await store.library('gog', true);
  assert.equal(result.state, 'ready'); assert.deepEqual(result.games, [{ id: '1', title: 'Present title' }, { id: '2', title: 'Product fallback title' }]);
});
test('library reads during reconnect cannot refresh account A or overwrite new account B', async t => {
  let now = 1000000;
  const { store } = await setup(t, { now: () => now });
  await store.connect('epic'); now += 3600000;
  let releaseLogin;
  store.login = () => new Promise(resolve => { releaseLogin = resolve; });
  let refreshes = 0;
  store.fetch = async (url, options) => {
    if (url.includes('/oauth/token')) { if (options.body.includes('grant_type=refresh_token')) refreshes++; return response({ access_token: 'B_ACCESS', refresh_token: 'B_REFRESH', account_id: 'accountB', displayName: 'Player B', expires_in: 3600 }); }
    if (url.includes('/items?')) return response({ records: [], responseMetadata: {} });
    throw new Error('Unexpected request');
  };
  const connection = store.connect('epic');
  const duringLogin = await store.library('epic', true);
  assert.equal(duringLogin.state, 'unconfigured'); assert.equal(refreshes, 0);
  releaseLogin('new-account-code');
  assert.equal((await connection).displayName, 'Player B');
  assert.equal((await store.read('epic', 'account')).accountId, 'accountB');
  assert.equal((await store.library('epic', true)).state, 'ready');
  assert.equal((await store.read('epic', 'account')).accountId, 'accountB'); assert.equal(refreshes, 0);
});
test('account errors expose stable localized codes without request details', async t => {
  const { store } = await setup(t, { login: async () => { throw new Error('Connection timed out. Please try again.'); } });
  assert.equal((await store.connect('epic')).error, 'timeout');
  store.login = async () => 'bad-code'; store.fetch = async () => ({ ok: false, status: 401 });
  assert.equal((await store.connect('epic')).error, 'invalid-auth');
  store.fetch = async () => { throw new Error('Request ACCESS secret details'); };
  assert.equal((await store.connect('epic')).error, 'error');
  store.storage = { isEncryptionAvailable: () => false };
  assert.equal((await store.connect('epic')).error, 'storage-unavailable');
});
test('clear while sign-in or library request is pending cannot restore account or cache', async t => {
  let releaseLogin;
  const { store, root } = await setup(t, { login: () => new Promise(resolve => { releaseLogin = resolve; }) });
  const connection = store.connect('epic'); await new Promise(resolve => setImmediate(resolve));
  await store.clear('epic'); releaseLogin('late-code'); await connection;
  assert.equal((await store.status('epic')).configured, false);
  store.login = async () => 'auth_code123'; await store.connect('epic');
  let releaseFetch; const originalFetch = store.fetch;
  store.fetch = async (url, options) => url.includes('/items?') ? new Promise(resolve => { releaseFetch = resolve; }) : originalFetch(url, options);
  const library = store.library('epic', true);
  while (!releaseFetch) await new Promise(resolve => setImmediate(resolve));
  await store.clear('epic'); releaseFetch(response({ records: [], responseMetadata: {} }));
  assert.equal((await library).state, 'unconfigured');
  await assert.rejects(readFile(join(root, 'store-epic-library.bin')), { code: 'ENOENT' });
});
test('unavailable encryption prevents starting login; cancellation is honest', async t => {
  const { store } = await setup(t, { login: async () => { throw new Error('Connection cancelled.'); } });
  assert.equal((await store.connect('epic')).error, 'cancelled');
  store.storage = { isEncryptionAvailable: () => false };
  assert.equal((await store.connect('gog')).storageAvailable, false);
});
test('login window is sandboxed, denies popup and unsafe navigation, and handles close', async () => {
  let window;
  class MockWindow extends EventEmitter {
    constructor(options) { super(); this.options = options; window = this; this.webContents = new EventEmitter(); this.webContents.session = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, on() {} }; this.webContents.setWindowOpenHandler = handler => { this.popup = handler; }; }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    isDestroyed() { return Boolean(this.destroyed); }
    destroy() { this.destroyed = true; this.emit('closed'); }
  }
  const pending = createStoreLogin(MockWindow)('gog');
  assert.equal(window.options.webPreferences.sandbox, true); assert.equal(window.options.webPreferences.nodeIntegration, false); assert.equal(window.options.webPreferences.preload, undefined);
  assert.deepEqual(window.popup({ url: 'https://example.com' }), { action: 'deny' });
  let prevented = false; window.webContents.emit('will-navigate', { preventDefault: () => { prevented = true; } }, 'nexus://app'); assert.equal(prevented, true);
  window.destroy(); await assert.rejects(pending, /cancelled/);
});
test('native close wins over loadURL abort rejection before closed event', async () => {
  let window, rejectLoad;
  class MockWindow extends EventEmitter {
    constructor() { super(); window = this; this.webContents = new EventEmitter(); this.webContents.session = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, on() {} }; this.webContents.setWindowOpenHandler = () => {}; }
    loadURL() { return new Promise((_resolve, reject) => { rejectLoad = reject; }); }
    isDestroyed() { return Boolean(this.destroyed); }
    destroy() { this.destroyed = true; rejectLoad(new Error('ERR_ABORTED')); queueMicrotask(() => this.emit('closed')); }
  }
  const pending = createStoreLogin(MockWindow)('epic');
  window.emit('close');
  await assert.rejects(pending, /Connection cancelled\./);
});
