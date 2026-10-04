import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { EPIC_CLIENT, GOG_CLIENT, GOG_REDIRECT, validateProvider } from './storeLogin.mjs';

// Public desktop OAuth client credentials used by Legendary and GOGDL; account tokens remain encrypted.
// Protocol references: https://github.com/legendary-gl/legendary/blob/master/legendary/api/egs.py
// https://github.com/Heroic-Games-Launcher/heroic-gogdl/blob/main/gogdl/auth.py
// https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/blob/main/src/backend/storeManagers/gog/library.ts
const EPIC_BASIC = Buffer.from(`${EPIC_CLIENT}:daafbccc737745039dffe53d94fc76cf`).toString('base64');
const GOG_SECRET = '9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9';
class StoreRequestError extends Error { constructor(status) { super('Store request failed.'); this.status = status; } }
export class StoreAccounts {
  constructor(userData, safeStorage, { fetch = globalThis.fetch, login, now = () => Date.now() } = {}) {
    this.root = userData; this.storage = safeStorage; this.fetch = fetch; this.login = login; this.now = now;
    this.epochs = { epic: 0, gog: 0 }; this.queues = {}; this.inflight = {}; this.logins = {}; this.errors = {};
  }
  available() { return this.storage.isEncryptionAvailable() && this.storage.getSelectedStorageBackend?.() !== 'basic_text'; }
  path(provider, kind) { validateProvider(provider); return join(this.root, `store-${provider}-${kind}.bin`); }
  queue(provider, task) {
    const next = (this.queues[provider] || Promise.resolve()).catch(() => {}).then(task);
    this.queues[provider] = next; return next;
  }
  async read(provider, kind) {
    if (!this.available()) return null;
    try { return JSON.parse(this.storage.decryptString(await readFile(this.path(provider, kind)))); } catch { return null; }
  }
  async write(provider, kind, value, epoch) {
    return this.queue(provider, async () => {
      if (epoch !== this.epochs[provider]) return false;
      if (!this.available()) throw Object.assign(new Error('Encrypted account storage is unavailable.'), { code: 'storage-unavailable' });
      await mkdir(this.root, { recursive: true });
      const target = this.path(provider, kind), temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, this.storage.encryptString(JSON.stringify(value)), { mode: 0o600 });
        if (epoch !== this.epochs[provider]) return false;
        await rename(temporary, target); return true;
      } finally { await rm(temporary, { force: true }).catch(() => {}); }
    });
  }
  async status(provider) {
    validateProvider(provider);
    const account = await this.read(provider, 'account');
    return { configured: Boolean(account?.access_token && account?.refresh_token && account?.accountId), storageAvailable: this.available(), ...(account?.displayName ? { displayName: account.displayName } : {}), ...(this.errors[provider] ? { error: this.errors[provider] } : {}) };
  }
  async clear(provider) {
    validateProvider(provider); this.epochs[provider]++; this.logins[provider]?.abort(); delete this.errors[provider]; delete this.inflight[provider];
    await this.queue(provider, async () => { await Promise.all(['account', 'library'].map(kind => rm(this.path(provider, kind), { force: true }))); });
    return this.status(provider);
  }
  async json(url, options = {}) {
    const response = await this.fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new StoreRequestError(response.status);
    return response.json();
  }
  async token(provider, grant, value, previous) {
    let data;
    if (provider === 'epic') {
      data = await this.json('https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token', { method: 'POST', headers: { Authorization: `Basic ${EPIC_BASIC}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: grant, [grant === 'refresh_token' ? 'refresh_token' : 'code']: value, token_type: 'eg1' }).toString() });
    } else {
      const params = new URLSearchParams({ client_id: GOG_CLIENT, client_secret: GOG_SECRET, grant_type: grant, ...(grant === 'refresh_token' ? { refresh_token: value } : { code: value, redirect_uri: GOG_REDIRECT }) });
      data = await this.json(`https://auth.gog.com/token?${params}`);
    }
    const accountId = provider === 'epic' ? data.account_id : data.user_id;
    if (typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token || !/^[A-Za-z0-9_-]{1,128}$/.test(String(accountId || previous?.accountId || ''))) throw new StoreRequestError(401);
    return { access_token: data.access_token, refresh_token: data.refresh_token, accountId: String(accountId || previous?.accountId), displayName: String(data.displayName || previous?.displayName || (provider === 'epic' ? 'Epic Games' : 'GOG')).slice(0, 160), expiresAt: this.now() + Math.max(0, Number(data.expires_in) || 3600) * 1000 };
  }
  async connect(provider, parent) {
    validateProvider(provider);
    if (this.logins[provider]) return { ...(await this.status(provider)), error: 'error' };
    if (!this.available()) return { configured: false, storageAvailable: false, error: 'storage-unavailable' };
    let epoch = ++this.epochs[provider];
    const controller = new AbortController(); this.logins[provider] = controller; delete this.errors[provider]; delete this.inflight[provider];
    try {
      const code = await this.login(provider, { parent, signal: controller.signal });
      if (epoch !== this.epochs[provider]) return this.status(provider);
      const account = await this.token(provider, 'authorization_code', code);
      if (provider === 'gog') {
        const user = await this.json('https://embed.gog.com/userData.json', { headers: { Authorization: `Bearer ${account.access_token}` } });
        account.displayName = String(user.username || 'GOG').slice(0, 160);
      }
      if (epoch !== this.epochs[provider]) return this.status(provider);
      // Account replacement starts a new generation, distinct from pending login reads.
      epoch = ++this.epochs[provider]; delete this.inflight[provider];
      // Removing the previous account cache and writing this token share the same generation.
      await this.queue(provider, () => epoch === this.epochs[provider] ? rm(this.path(provider, 'library'), { force: true }) : undefined);
      await this.write(provider, 'account', account, epoch);
      return this.status(provider);
    } catch (error) {
      if (epoch === this.epochs[provider]) this.errors[provider] = /^Connection cancelled\./.test(error.message) ? 'cancelled' : /^Connection timed out\./.test(error.message) || error.name === 'TimeoutError' ? 'timeout' : error.code === 'storage-unavailable' ? 'storage-unavailable' : [400, 401, 403].includes(error.status) ? 'invalid-auth' : 'error';
      return this.status(provider);
    } finally { if (this.logins[provider] === controller) delete this.logins[provider]; }
  }
  async fetchGames(provider, account) {
    const headers = { Authorization: `Bearer ${account.access_token}` }, games = [], seen = new Set();
    let cursor = '';
    for (let page = 0; page < 500; page++) {
      const url = provider === 'epic' ? `https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}` : `https://galaxy-library.gog.com/users/${encodeURIComponent(account.accountId)}/releases${cursor ? `?page_token=${encodeURIComponent(cursor)}` : ''}`;
      const data = await this.json(url, { headers });
      const records = provider === 'epic' ? data.records : data.items;
      if (!Array.isArray(records)) throw new StoreRequestError(502);
      for (let start = 0; start < records.length; start += 6) {
        await Promise.all(records.slice(start, start + 6).map(async record => {
        if (provider === 'epic') {
          if (!record.appName || record.namespace === 'ue' || record.sandboxType === 'PRIVATE' || !record.namespace || !record.catalogItemId) return;
          const id = String(record.appName);
          const meta = await this.json(`https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace/${encodeURIComponent(record.namespace)}/bulk/items?id=${encodeURIComponent(record.catalogItemId)}&includeDLCDetails=true&includeMainGameDetails=true&country=US&locale=en`, { headers });
          const game = meta[record.catalogItemId];
          if (!game?.title || game.mainGameItem || game.categories?.some(category => category.path === 'mods')) return;
          games.push({ id, title: String(game.title) });
        } else {
          if (record.platform_id !== 'gog' || record.owned !== true || !/^\d+$/.test(String(record.external_id))) return;
          const id = String(record.external_id);
          let meta;
          try { meta = await this.json(`https://gamesdb.gog.com/platforms/gog/external_releases/${id}`, { headers: { ...headers, ...(record.certificate ? { 'X-GOG-Library-Cert': record.certificate } : {}) } }); }
          catch (error) { if (error.status !== 404) throw error; }
          let title;
          if (meta) {
            if (!['game', 'mod'].includes(meta.type) || !meta.game?.visible_in_library) return;
            title = meta.title?.['*'] || meta.game.title?.['*'];
          } else {
            // Heroic's primary Product API fallback covers releases absent from GamesDB.
            let product;
            try { product = await this.json(`https://api.gog.com/products/${id}?locale=en`, { headers }); }
            catch (error) { if (error.status === 404) return; throw error; }
            if (product?.game_type !== 'game') return;
            title = product.title;
          }
          if (title) games.push({ id, title: String(title) });
        }
        }));
      }
      cursor = (provider === 'epic' ? data.responseMetadata?.nextCursor : data.next_page_token) || '';
      if (!cursor) return [...new Map(games.map(game => [game.id, game])).values()].sort((a, b) => a.title.localeCompare(b.title));
      if (seen.has(cursor)) throw new StoreRequestError(502); seen.add(cursor);
    }
    throw new StoreRequestError(502);
  }
  async library(provider, force = false) {
    validateProvider(provider);
    if (this.logins[provider]) return { source: provider === 'epic' ? 'Epic' : 'GOG', state: 'unconfigured', lastSynced: null, cached: false, games: [] };
    if (this.inflight[provider]) return this.inflight[provider];
    const epoch = this.epochs[provider];
    const task = this.loadLibrary(provider, force === true, epoch);
    this.inflight[provider] = task;
    try { return await task; } finally { if (this.inflight[provider] === task) delete this.inflight[provider]; }
  }
  async loadLibrary(provider, force, epoch) {
    const empty = { source: provider === 'epic' ? 'Epic' : 'GOG', state: 'unconfigured', lastSynced: null, cached: false, games: [] };
    let account = await this.read(provider, 'account');
    if (!account?.access_token || !account?.refresh_token || !account?.accountId || epoch !== this.epochs[provider]) return empty;
    const stored = await this.read(provider, 'library');
    const cache = stored?.accountId === account.accountId && Array.isArray(stored.games) ? stored : null;
    if (epoch !== this.epochs[provider]) return empty;
    if (!force && cache && this.now() - Date.parse(cache.lastSynced) < 300000) return { ...empty, state: 'ready', lastSynced: cache.lastSynced, cached: true, games: cache.games };
    try {
      if (account.expiresAt <= this.now() + 60000) {
        account = await this.token(provider, 'refresh_token', account.refresh_token, account);
        if (!await this.write(provider, 'account', account, epoch)) return empty;
      }
      let games;
      try { games = await this.fetchGames(provider, account); }
      catch (error) {
        if (error.status !== 401) throw error;
        account = await this.token(provider, 'refresh_token', account.refresh_token, account);
        if (!await this.write(provider, 'account', account, epoch)) return empty;
        games = await this.fetchGames(provider, account);
      }
      const lastSynced = new Date(this.now()).toISOString();
      if (!await this.write(provider, 'library', { accountId: account.accountId, lastSynced, games }, epoch)) return empty;
      if (epoch !== this.epochs[provider]) return empty;
      delete this.errors[provider];
      return { ...empty, state: 'ready', lastSynced, games };
    } catch (error) {
      if (epoch !== this.epochs[provider]) return empty;
      if (error.status === 401) this.errors[provider] = 'invalid-auth';
      return { ...empty, state: error.status === 401 ? 'error' : error.status === 403 ? 'private' : 'offline', ...(cache ? { lastSynced: cache.lastSynced, cached: true, games: cache.games } : {}) };
    }
  }
}
