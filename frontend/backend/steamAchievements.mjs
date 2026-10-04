import { readFile, writeFile, rename, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const TTL = 5 * 60_000;
function parseProfile(value) {
  if (/^\d{17}$/.test(value)) return {steamId:value};
  try {
    const url = new URL(/^steamcommunity\.com\//i.test(value) ? `https://${value}` : value);
    if (!['https:','http:'].includes(url.protocol) || url.hostname !== 'steamcommunity.com' || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/(profiles|id)\/([a-zA-Z0-9_-]+)\/?$/);
    if (!match) return null;
    if (match[1] === 'profiles') return /^\d{17}$/.test(match[2]) ? {steamId:match[2]} : null;
    return match[2].length <= 64 ? {vanity:match[2]} : null;
  } catch { return null; }
}
const safeIcon = value => { try { const url = new URL(value); return url.protocol === 'https:' && ['steamstatic.com','steamusercontent.com','steamcommunity.com'].some(domain => url.hostname === domain || url.hostname.endsWith('.'+domain)) ? url.href : undefined; } catch { return undefined; } };
export class SteamAchievements {
  constructor(userData, safeStorage, { fetch = globalThis.fetch, now = Date.now } = {}) {
    this.dir = userData; this.file = join(userData,'steam-account-secret.bin'); this.cacheFile = join(userData,'steam-achievements-cache.json');
    this.storage = safeStorage; this.fetch = fetch; this.now = now; this.pending = new Map(); this.generation = 0; this.writes = Promise.resolve();
  }
  available() { return this.storage.isEncryptionAvailable() && this.storage.getSelectedStorageBackend?.() !== 'basic_text'; }
  async account() { if (!this.available()) return null; try { const value = JSON.parse(this.storage.decryptString(await readFile(this.file))); return /^\d{17}$/.test(value.steamId) && (value.apiKey === undefined || /^[a-f\d]{32}$/i.test(value.apiKey)) ? value : null; } catch { return null; } }
  async status() { await this.writes; const account = await this.account(); return { linked: Boolean(account), configured: Boolean(account?.apiKey), storageAvailable: this.available(), steamId: account?.steamId }; }
  async linkAccount(steamId, generation = this.generation) {
    if (!this.available()) return {...await this.status(),error:'storage-unavailable'};
    if (!/^\d{17}$/.test(steamId)) return {...await this.status(),error:'invalid-input'};
    try { await this.write(async () => {
      if (generation !== this.generation) return;
      const previous = await this.account();
      if (generation !== this.generation) return;
      this.generation++; this.pending.clear();
      const value = {steamId};
      if (previous?.steamId === steamId && previous.apiKey) value.apiKey = previous.apiKey;
      await this.atomic(this.file,this.storage.encryptString(JSON.stringify(value)));
      if (previous?.steamId !== steamId) await rm(this.cacheFile,{force:true});
    }); } catch { return {...await this.status(),error:'storage-error'}; }
    return this.status();
  }
  async atomic(file,value) { await mkdir(this.dir,{recursive:true}); const temp = `${file}.${process.pid}.tmp`; await writeFile(temp,value,{mode:0o600}); await rename(temp,file); }
  write(action) { const task = this.writes.then(action); this.writes = task.catch(() => {}); return task; }
  async request(method,params) {
    const url = new URL(`https://api.steampowered.com/${method}/`); Object.entries(params).forEach(([key,value]) => url.searchParams.set(key,String(value)));
    let response;
    try { response = await this.fetch(url.href,{signal:AbortSignal.timeout(10_000),redirect:'error'}); } catch { throw new Error('offline'); }
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'invalid-key' : 'api-error');
    try { return await response.json(); } catch { throw new Error('api-error'); }
  }
  async saveAccount(value) {
    const generation = this.generation;
    if (!this.available()) return {...await this.status(),error:'storage-unavailable'};
    const profile = parseProfile(typeof value?.steamId === 'string' ? value.steamId.trim() : ''), apiKey = typeof value?.apiKey === 'string' ? value.apiKey.trim() : '';
    if (!profile || !/^[a-f\d]{32}$/i.test(apiKey)) return {...await this.status(),error:'invalid-input'};
    try {
      let steamId = profile.steamId;
      if (profile.vanity) {
        const resolved = await this.request('ISteamUser/ResolveVanityURL/v1',{key:apiKey,vanityurl:profile.vanity,url_type:1});
        if (resolved.response?.success !== 1 || !/^\d{17}$/.test(resolved.response.steamid || '')) throw new Error('invalid-account');
        steamId = resolved.response.steamid;
      }
      const data = await this.request('ISteamUser/GetPlayerSummaries/v2',{key:apiKey,steamids:steamId});
      if (!data.response?.players?.some(player => player.steamid === steamId)) throw new Error('invalid-account');
      await this.write(async () => {if (generation !== this.generation) return; this.generation++; this.pending.clear(); await this.atomic(this.file,this.storage.encryptString(JSON.stringify({steamId,apiKey}))); await rm(this.cacheFile,{force:true});}); return this.status();
    } catch(error) { return {...await this.status(),error:['invalid-account','invalid-key','offline','api-error'].includes(error.message) ? error.message : 'storage-error'}; }
  }
  async clearAccount() { this.generation++; this.pending.clear(); await this.write(async () => {await rm(this.file,{force:true}); await rm(this.cacheFile,{force:true});}); return this.status(); }
  async cache() { try { return JSON.parse(await readFile(this.cacheFile,'utf8')); } catch { return {}; } }
  async getLibrary(force=false) {
    const base = {source:'Steam',state:'unconfigured',games:[],lastSynced:null,cached:false};
    const generation = this.generation;
    await this.writes;
    const account = await this.account();
    if (!account || generation !== this.generation) return base;
    if (!account.apiKey) return {...base,state:'key-required'};
    const key = `${account.steamId}:library`;
    if (this.pending.has(key)) return this.pending.get(key);
    const task = (async () => {
      const cached = (await this.cache())[key];
      if (generation !== this.generation) return base;
      if (!force && cached && this.now()-Date.parse(cached.lastSynced)<TTL) return {...cached,cached:true};
      try {
        const data = await this.request('IPlayerService/GetOwnedGames/v1',{key:account.apiKey,input_json:JSON.stringify({steamid:account.steamId,include_appinfo:true,include_played_free_games:true})});
        if (generation !== this.generation) return base;
        if (!data.response || !Number.isInteger(data.response.game_count)) return {...base,state:'private'};
        if (data.response.game_count > 0 && !Array.isArray(data.response.games)) throw new Error('api-error');
        const games = (data.response.games || []).filter(item => Number.isInteger(item.appid) && item.appid>0).map(item => ({id:String(item.appid),title:String(item.name || `Steam ${item.appid}`),playtimeMinutes:Math.max(0,Number(item.playtime_forever)||0)}));
        const result = {...base,state:'ready',games,lastSynced:new Date(this.now()).toISOString()};
        await this.write(async () => {if(generation !== this.generation)return; const cache=await this.cache();cache[key]=result;await this.atomic(this.cacheFile,JSON.stringify(cache));});
        return generation === this.generation ? result : base;
      } catch(error) {
        if (generation !== this.generation) return base;
        return {...(cached || base),state:error.message==='offline'?'offline':'error',cached:Boolean(cached)};
      }
    })();
    this.pending.set(key,task);
    try {return await task;} finally {if(this.pending.get(key)===task)this.pending.delete(key);}
  }
  async getAchievements(appId,locale='en',force=false) {
    const base = { source:'Steam', appId, achievements:[], lastSynced:null, cached:false };
    if (!Number.isInteger(appId) || appId < 1 || appId > 4294967295) return {...base,state:'unsupported'};
    const generation = this.generation;
    await this.writes;
    const account = await this.account(); if (!account || generation !== this.generation) return {...base,state:'unconfigured'};
    if (!account.apiKey) return {...base,state:'key-required'};
    const key = `${account.steamId}:${appId}:${locale === 'fr' ? 'fr' : 'en'}`;
    if (this.pending.has(key)) return this.pending.get(key);
    const task = (async () => {
      const cached = (await this.cache())[key];
      if (generation !== this.generation) return {...base,state:'unconfigured'};
      if (!force && cached && this.now() - Date.parse(cached.lastSynced) < TTL) return {...cached,cached:true};
      try {
        const params = {key:account.apiKey,appid:appId,l:locale === 'fr' ? 'french' : 'english'};
        const [player,schema] = await Promise.all([this.request('ISteamUserStats/GetPlayerAchievements/v1',{...params,steamid:account.steamId}),this.request('ISteamUserStats/GetSchemaForGame/v2',params)]);
        if (player.playerstats?.success === false) {
          const error = String(player.playerstats.error || '');
          throw new Error(/private|not public/i.test(error) ? 'private' : /no stats|no achievements/i.test(error) ? 'unavailable' : 'api-error');
        }
        if (player.playerstats?.success !== true || !schema.game || !Array.isArray(player.playerstats.achievements)) throw new Error('api-error');
        const definitions = schema.game.availableGameStats?.achievements;
        if (definitions !== undefined && !Array.isArray(definitions)) throw new Error('api-error');
        const unlocks = new Map(player.playerstats.achievements.map(item => [item.apiname,item]));
        const achievements = (definitions || []).map(item => { const progress = unlocks.get(item.name); const unlocked = progress?.achieved === 1; return { id:String(item.name),title:String(item.displayName || item.name),description:!unlocked && item.hidden ? '' : String(item.description || ''),hidden:Boolean(item.hidden),unlocked,unlockTime:unlocked && progress.unlocktime > 0 ? progress.unlocktime : null,icon:safeIcon(unlocked ? item.icon : item.icongray) }; });
        const result = {...base,state:achievements.length ? 'ready' : 'empty',achievements,lastSynced:new Date(this.now()).toISOString()};
        if (generation !== this.generation) return {...base,state:'unconfigured'};
        await this.write(async () => {if (generation !== this.generation) return; const cache = await this.cache(); cache[key] = result; await this.atomic(this.cacheFile,JSON.stringify(cache));});
        return generation === this.generation ? result : {...base,state:'unconfigured'};
      } catch(error) {
        if (generation !== this.generation) return {...base,state:'unconfigured'};
        const state = ['offline','private','unavailable'].includes(error.message) ? error.message : 'error';
        return {...(cached || base),state,cached:Boolean(cached),error:['invalid-key','api-error'].includes(error.message) ? error.message : undefined};
      }
    })();
    this.pending.set(key,task); try { return await task; } finally { if (this.pending.get(key) === task) this.pending.delete(key); }
  }
}
