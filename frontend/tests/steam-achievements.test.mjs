import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SteamAchievements } from '../backend/steamAchievements.mjs';

const steamId = '76561198000000000', apiKey = 'a'.repeat(32);
const crypto = { isEncryptionAvailable: () => true, encryptString: value => Buffer.from(value).map(x => x ^ 42), decryptString: value => Buffer.from(value.map(x => x ^ 42)).toString() };
test('owned library returns actual playtime, caches offline and clears on logout', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nexus-steam-library-'));
  let offline = false;
  const service = new SteamAchievements(dir, crypto, {fetch: async url => {
    if (offline) throw new Error('offline');
    return {ok:true,json:async () => new URL(url).pathname.includes('GetPlayerSummaries') ? {response:{players:[{steamid:steamId}]}} : {response:{game_count:1,games:[{appid:123,name:'Actual game',playtime_forever:91}]}}};
  }});
  await service.saveAccount({steamId,apiKey});
  const result = await service.getLibrary();
  assert.deepEqual(result.games,[{id:'123',title:'Actual game',playtimeMinutes:91}]);
  offline = true;
  assert.equal((await service.getLibrary(true)).state,'offline');
  assert.equal((await service.getLibrary(true)).games.length,1);
  await service.clearAccount();
  assert.equal((await service.getLibrary()).state,'unconfigured');
});
test('Steam library distinguishes hidden details from an empty owned library', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nexus-steam-private-'));
  let response = {};
  const service = new SteamAchievements(dir, crypto, {fetch:async url => ({ok:true,json:async () => new URL(url).pathname.includes('GetPlayerSummaries') ? {response:{players:[{steamid:steamId}]}} : {response}})});
  await service.saveAccount({steamId,apiKey});
  assert.equal((await service.getLibrary()).state,'private');
  response = {game_count:0};
  assert.equal((await service.getLibrary(true)).state,'ready');
});
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'nexus-steam-'));
  let mode = 'ok', calls = 0;
  const fetch = async url => {
    calls++;
    if (mode === 'offline') throw new Error(`network error containing ${apiKey}`);
    if (mode === 'unauthorized') return { ok: false, status: 403 };
    const path = new URL(url).pathname;
    const value = path.includes('GetPlayerSummaries') ? { response: { players: [{ steamid: steamId, personaname: 'Player' }] } } : path.includes('GetSchemaForGame') ? { game: { availableGameStats: { achievements: [{ name: 'FIRST', displayName: 'First', description: 'First win', icon: 'https://cdn.steamstatic.com/a.png', icongray: 'https://cdn.steamstatic.com/b.png' }] } } } : mode === 'private' ? { playerstats: { success: false, error: 'Profile is not public' } } : mode === 'empty' ? { playerstats: { success: true, achievements: [] } } : { playerstats: { success: true, achievements: [{ apiname: 'FIRST', achieved: 1, unlocktime: 1234 }] } };
    return { ok: true, json: async () => value };
  };
  const service = new SteamAchievements(dir, crypto, { fetch });
  return { service, dir, fetch, setMode: value => mode = value, calls: () => calls };
}
test('validates account and persists only encrypted credentials', async () => {
  const f = await fixture();
  const status = await f.service.saveAccount({ steamId, apiKey });
  assert.equal(status.configured, true);
  assert.equal(status.linked, true);
  assert.equal(status.steamId, steamId);
  assert.ok(!JSON.stringify(status).includes(apiKey));
  assert.ok(!(await readFile(join(f.dir, 'steam-account-secret.bin'))).includes(Buffer.from(apiKey)));
});

test('browser verified identity is encrypted and requires a key before reading progress', async () => {
  const f=await fixture();
  const status=await f.service.linkAccount(steamId);
  assert.equal(status.linked,true);assert.equal(status.configured,false);assert.equal(status.steamId,steamId);
  assert.equal((await f.service.getLibrary()).state,'key-required');
  assert.equal((await f.service.getAchievements(10)).state,'key-required');assert.equal(f.calls(),0);
  assert.ok(!(await readFile(join(f.dir,'steam-account-secret.bin'))).includes(Buffer.from(steamId)));
  const restarted=new SteamAchievements(f.dir,crypto,{fetch:f.fetch});assert.equal((await restarted.status()).linked,true);
  await f.service.clearAccount();assert.equal((await f.service.status()).linked,false);
});
test('browser reauthentication preserves validated key only for the same Steam identity', async () => {
  const f=await fixture();await f.service.saveAccount({steamId,apiKey});await f.service.getAchievements(10);
  await f.service.linkAccount(steamId);assert.equal((await f.service.account()).apiKey,apiKey);assert.equal((await f.service.status()).configured,true);
  const other='76561198000000001';await f.service.linkAccount(other);
  assert.equal((await f.service.account()).apiKey,undefined);assert.equal((await f.service.status()).steamId,other);
  assert.equal((await f.service.getAchievements(10)).state,'key-required');
  await assert.rejects(readFile(join(f.dir,'steam-achievements-cache.json')),{code:'ENOENT'});
});
test('logout during browser authentication cannot restore the identity', async () => {
  const f=await fixture();const generation=f.service.generation;await f.service.clearAccount();
  const status=await f.service.linkAccount(steamId,generation);assert.equal(status.linked,false);
  await assert.rejects(readFile(join(f.dir,'steam-account-secret.bin')),{code:'ENOENT'});
});
test('old API key validation finishing after account switch cannot restore the old account', async () => {
  const f=await fixture();let unblock,entered;
  const gate=new Promise(resolve=>{unblock=resolve;}),started=new Promise(resolve=>{entered=resolve;});
  f.service.fetch=async url=>{entered();await gate;return f.fetch(url);};
  const pending=f.service.saveAccount({steamId,apiKey});await started;
  await f.service.linkAccount('76561198000000001');unblock();await pending;
  const status=await f.service.status();assert.equal(status.steamId,'76561198000000001');assert.equal(status.configured,false);
});
test('joins real unlocks to schema, caches across restart, and deduplicates refresh', async () => {
  const f = await fixture(); await f.service.saveAccount({ steamId, apiKey });
  const [a,b] = await Promise.all([f.service.getAchievements(10, 'en'), f.service.getAchievements(10, 'en')]);
  assert.deepEqual(a,b); assert.equal(a.state,'ready'); assert.equal(a.achievements[0].unlocked,true); assert.equal(a.achievements[0].title,'First');
  assert.equal(f.calls(),3);
  const restarted = new SteamAchievements(f.dir, crypto, { fetch: f.fetch });
  assert.equal((await restarted.getAchievements(10,'en')).lastSynced,a.lastSynced);
  assert.equal(f.calls(),3);
});
test('keeps cached progress on offline refresh without exposing network secrets', async () => {
  const f = await fixture(); await f.service.saveAccount({ steamId, apiKey });
  const a = await f.service.getAchievements(10,'en'); f.setMode('offline');
  const b = await f.service.getAchievements(10,'en',true);
  assert.equal(b.state,'offline'); assert.equal(b.cached,true); assert.deepEqual(b.achievements,a.achievements); assert.equal(b.lastSynced,a.lastSynced); assert.ok(!JSON.stringify(b).includes(apiKey));
});
test('private profiles and successful zero unlocks are distinct', async () => {
  const f = await fixture(); await f.service.saveAccount({ steamId, apiKey }); f.setMode('private');
  assert.equal((await f.service.getAchievements(10,'fr')).state,'private');
  f.setMode('empty'); const value = await f.service.getAchievements(10,'fr',true);
  assert.equal(value.state,'ready'); assert.equal(value.achievements[0].unlocked,false);
});
test('invalid credentials do not replace working account and disconnect removes progress', async () => {
  const f = await fixture(); await f.service.saveAccount({ steamId, apiKey }); await f.service.getAchievements(10,'en'); f.setMode('unauthorized');
  assert.equal((await f.service.saveAccount({ steamId, apiKey: 'b'.repeat(32) })).error,'invalid-key');
  assert.equal((await f.service.status()).configured,true);
  await f.service.clearAccount(); assert.equal((await f.service.getAchievements(10,'en')).state,'unconfigured');
});
test('fails closed when secure encryption is unavailable and validates inputs', async () => {
  const f = await fixture(); const service = new SteamAchievements(f.dir, { isEncryptionAvailable: () => false }, {fetch:f.fetch});
  assert.equal((await service.saveAccount({steamId,apiKey})).error,'storage-unavailable');
  assert.equal((await f.service.saveAccount({steamId:'123',apiKey})).error,'invalid-input');
  assert.equal((await f.service.getAchievements(-1,'en')).state,'unsupported');
});
test('parallel game syncs preserve both cached results', async () => {
  const f = await fixture(); await f.service.saveAccount({steamId,apiKey});
  await Promise.all([f.service.getAchievements(10,'en'),f.service.getAchievements(20,'en')]);
  f.setMode('offline');
  const service = new SteamAchievements(f.dir,crypto,{fetch:f.fetch});
  const results = await Promise.all([service.getAchievements(10,'en',true),service.getAchievements(20,'en',true)]);
  assert.ok(results.every(result => result.cached && result.achievements.length === 1));
});
test('disconnect during a request cannot restore the old account cache', async () => {
  const f = await fixture(); await f.service.saveAccount({steamId,apiKey});
  let unblock; const gate = new Promise(resolve => {unblock=resolve;});
  f.service.fetch = async url => {await gate;return f.fetch(url);};
  const pending = f.service.getAchievements(10,'en');
  await new Promise(resolve => setTimeout(resolve,20));
  await f.service.clearAccount(); unblock();
  assert.equal((await pending).state,'unconfigured');
  await assert.rejects(readFile(join(f.dir,'steam-achievements-cache.json')), {code:'ENOENT'});
});
test('malformed API payload never becomes successful zero progress', async () => {
  const f = await fixture(); await f.service.saveAccount({steamId,apiKey});
  f.service.fetch = async () => ({ok:true,json:async()=>({})});
  const result = await f.service.getAchievements(10,'en');
  assert.equal(result.state,'error'); assert.equal(result.lastSynced,null);
});
test('disconnect during credential read never syncs the removed account', async () => {
  const f = await fixture(); await f.service.saveAccount({steamId,apiKey});
  const readAccount = f.service.account.bind(f.service);
  let unblock; const gate = new Promise(resolve => {unblock=resolve;});
  let first = true;
  f.service.account = async () => {const value = await readAccount();if(first){first=false;await gate;}return value;};
  const pending = f.service.getAchievements(10,'en');
  await new Promise(resolve=>setTimeout(resolve,20));
  await f.service.clearAccount(); unblock();
  assert.equal((await pending).state,'unconfigured');
});
test('disconnect during cache read never returns fresh cached account progress', async () => {
  const f = await fixture(); await f.service.saveAccount({steamId,apiKey});await f.service.getAchievements(10,'en');
  const readCache = f.service.cache.bind(f.service);
  let unblock, entered; const gate = new Promise(resolve=>{unblock=resolve;}), started=new Promise(resolve=>{entered=resolve;});
  f.service.cache = async()=>{const value=await readCache();entered();await gate;return value;};
  const pending=f.service.getAchievements(10,'en');await started;
  await f.service.clearAccount();unblock();
  const result=await pending;assert.equal(result.state,'unconfigured');assert.equal(result.achievements.length,0);
});
test('accepts a copied numeric Steam profile URL and stores canonical numeric ID', async () => {
  const f=await fixture(); const status=await f.service.saveAccount({steamId:`https://steamcommunity.com/profiles/${steamId}/`,apiKey});
  assert.equal(status.configured,true);assert.equal(status.steamId,steamId);assert.equal((await f.service.account()).steamId,steamId);
});
test('resolves custom Steam profile link with supplied key before validating account', async () => {
  const f=await fixture();let resolved=false;
  f.service.fetch=async value=>{const url=new URL(value);if(url.pathname.includes('ResolveVanityURL')) {assert.equal(url.searchParams.get('vanityurl'),'my-profile');assert.equal(url.searchParams.get('key'),apiKey);resolved=true;return {ok:true,json:async()=>({response:{success:1,steamid:steamId}})};}assert.ok(resolved);return f.fetch(value);};
  assert.equal((await f.service.saveAccount({steamId:'https://steamcommunity.com/id/my-profile/',apiKey})).steamId,steamId);
  assert.equal((await f.service.account()).steamId,steamId);
});
test('rejects unrelated hosts and malformed profile links without network requests', async () => {
  const f=await fixture();
  for (const input of ['https://steamcommunity.com.evil.test/id/player','https://evil.test/profiles/'+steamId,'https://steamcommunity.com/id/name/extra','https://steamcommunity.com/id/a%2Fb','https://user@steamcommunity.com/id/name']) assert.equal((await f.service.saveAccount({steamId:input,apiKey})).error,'invalid-input');
  assert.equal(f.calls(),0);
});
test('vanity not found or failed resolution preserves the existing account', async () => {
  const f=await fixture();await f.service.saveAccount({steamId,apiKey});
  f.service.fetch=async()=>({ok:true,json:async()=>({response:{success:42}})});
  assert.equal((await f.service.saveAccount({steamId:'https://steamcommunity.com/id/missing',apiKey})).error,'invalid-account');
  f.service.fetch=async()=>{throw new Error('network '+apiKey);};
  const status=await f.service.saveAccount({steamId:'https://steamcommunity.com/id/player',apiKey});assert.equal(status.error,'offline');assert.equal(status.configured,true);assert.ok(!JSON.stringify(status).includes(apiKey));
});

test('notification preferences survive restart and reject invalid payloads', async()=>{
  const dir=await mkdtemp(join(tmpdir(),'nexus-notifications-'));
  const service=new SteamAchievements(dir,crypto);
  assert.deepEqual(await service.notificationSettings(),{enabled:true,locale:'fr'});
  await service.saveNotificationSettings({enabled:false,locale:'en'});
  assert.deepEqual(await new SteamAchievements(dir,crypto).notificationSettings(),{enabled:false,locale:'en'});
  await assert.rejects(service.saveNotificationSettings({enabled:'yes',locale:'en'}),/invalid-input/);
});
